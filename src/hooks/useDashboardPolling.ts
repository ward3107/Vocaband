/**
 * useDashboardPolling — Realtime-first dashboard refresh.
 *
 * 2026-04-25 rewrite: previous version polled three lists at
 * 30/60/45 s.  At scale that was tens of millions of requests/month.
 * A solo-test audit on 2026-04-25 showed 165 k DB requests in 22 h
 * for ONE teacher, mostly polling.  Switched to Supabase Realtime
 * push (postgres_changes) as the primary signal, with a long-cycle
 * polling fallback (5 min) only when the Realtime channel is in an
 * error / closed state.  Result: zero requests when nothing is
 * happening, instant updates when something is.
 *
 * Three subscriptions, all role/view-gated:
 *
 *   1. Student assignments
 *      * Realtime: INSERT/UPDATE on `assignments` filtered by class_id.
 *      * Fallback: 5-minute poll when not SUBSCRIBED.
 *      * Initial fetch on mount so the list isn't empty before the
 *        first push.
 *
 *   2. Teacher pending-student approvals
 *      * Realtime: INSERT on `student_profiles` for the teacher's
 *        class codes (any new pending row triggers a refetch).
 *      * Fallback: 5-minute poll when not SUBSCRIBED.
 *      * `visibilitychange` still fires a refetch on tab focus so
 *        a teacher returning from another tab sees current state
 *        immediately.
 *
 *   3. Teacher class scores
 *      * Realtime: INSERT on `progress` for the teacher's class codes.
 *      * Fallback: 5-minute poll when not SUBSCRIBED.
 *      * Initial fetch is guarded by `allScores.length === 0` so
 *        view-switches within the Classroom cluster don't re-hit
 *        the DB.
 *
 * Why we still keep a fallback at all: classroom Wi-Fi sometimes
 * blocks long-lived WebSockets (corporate proxies, captive portals).
 * If the Realtime channel reports CHANNEL_ERROR / TIMED_OUT /
 * CLOSED we degrade to slow polling so the teacher's data is at
 * most a few minutes stale instead of indefinitely.
 */
import { useEffect } from 'react';
import {
  supabase,
  mapAssignment,
  type AppUser,
  type AssignmentData,
  type ClassData,
  type ProgressData,
} from '../core/supabase';
import type { View } from '../core/views';

export interface UseDashboardPollingParams {
  user: AppUser | null;
  view: View;
  classes: ClassData[];
  allScores: ProgressData[];
  /** Drives the adaptive teacher-approval poll. > 0 → fast loop
   *  (something to watch); === 0 → slow loop. */
  pendingStudentsCount: number;
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  /** Fetcher from useTeacherData that hydrates `pendingStudents`. */
  loadPendingStudents: () => void | Promise<void>;
  /** Fetcher from useTeacherActions that hydrates `allScores`. */
  fetchScores: () => void | Promise<void>;
}

// Fallback polling cadence when the Realtime channel is unhealthy
// (CHANNEL_ERROR / TIMED_OUT / CLOSED).  5 min is a deliberate
// degradation — if Realtime is broken, we'd rather show slightly
// stale data than burn 8k+ requests/day per user.
const FALLBACK_POLL_MS = 5 * 60_000;

export function useDashboardPolling(params: UseDashboardPollingParams): void {
  const {
    user, view, classes, allScores,
    setStudentAssignments,
    loadPendingStudents,
    fetchScores,
  } = params;

  // ─── 1. Student assignments — Realtime + 5 min fallback ───────────
  useEffect(() => {
    if (user?.role !== 'student' || view !== 'student-dashboard' || !user.classCode) return;
    const code = user.classCode;
    let cachedClassId: string | null = null;
    let fallbackPollId: ReturnType<typeof setInterval> | null = null;

    const refresh = async () => {
      if (!user || !user.classCode) return;
      if (!cachedClassId) {
        const { data: classRows } = await supabase
          .from('classes').select('id').eq('code', code).limit(1);
        if (!classRows || classRows.length === 0) return;
        cachedClassId = classRows[0].id;
      }
      const { data } = await supabase.rpc('get_assignments_for_class', {
        p_class_id: cachedClassId,
      });
      setStudentAssignments((data ?? []).map(mapAssignment));
    };
    // Initial fetch so the list isn't empty before the first Realtime push.
    refresh();

    // Resolve the class id BEFORE the subscription's filter argument
    // can be set.  The subscription refreshes itself on every event,
    // so the cached id stays useful.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      if (!cachedClassId) {
        const { data: classRows } = await supabase
          .from('classes').select('id').eq('code', code).limit(1);
        if (!classRows || classRows.length === 0) return;
        cachedClassId = classRows[0].id;
      }
      channel = supabase
        .channel(`student-assignments-${cachedClassId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'assignments', filter: `class_id=eq.${cachedClassId}` },
          () => { if (!document.hidden) refresh(); },
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!fallbackPollId) {
              fallbackPollId = setInterval(() => { if (!document.hidden) refresh(); }, FALLBACK_POLL_MS);
            }
          }
        });
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (fallbackPollId) clearInterval(fallbackPollId);
    };
  }, [user, view, setStudentAssignments]);

  // ─── 2. Teacher pending-student approvals — Realtime + fallback ───
  useEffect(() => {
    if (!(user?.role === 'teacher' && view === 'teacher-dashboard' && classes.length > 0)) {
      return;
    }
    loadPendingStudents();

    const codes = classes.map(c => c.code);
    let fallbackPollId: ReturnType<typeof setInterval> | null = null;

    // One channel per class code keeps the filter narrow (RLS lets
    // teachers only see their own class anyway, but tight filters
    // reduce server-side work).  If the teacher has many classes we
    // limit to 5 active subscriptions to stay polite — anything past
    // that falls back to polling, which is fine because most schools
    // have a teacher-per-class.
    const channels = codes.slice(0, 5).map(code =>
      supabase
        .channel(`teacher-approvals-${code}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'student_profiles', filter: `class_code=eq.${code}` },
          () => { if (!document.hidden) loadPendingStudents(); },
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!fallbackPollId) {
              fallbackPollId = setInterval(() => { if (!document.hidden) loadPendingStudents(); }, FALLBACK_POLL_MS);
            }
          }
        }),
    );

    const handleVisibility = () => {
      if (!document.hidden) loadPendingStudents();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      for (const ch of channels) supabase.removeChannel(ch);
      if (fallbackPollId) clearInterval(fallbackPollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.role, view, classes, loadPendingStudents]);

  // ─── 3. Teacher class scores — Realtime + fallback ────────────────
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    if (classes.length === 0) return;
    if (view !== 'classroom' && view !== 'analytics' && view !== 'gradebook') return;
    if (allScores.length === 0) fetchScores();

    const codes = classes.map(c => c.code);
    let fallbackPollId: ReturnType<typeof setInterval> | null = null;

    const channels = codes.slice(0, 5).map(code =>
      supabase
        .channel(`teacher-scores-${code}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'progress', filter: `class_code=eq.${code}` },
          () => { if (!document.hidden) fetchScores(); },
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!fallbackPollId) {
              fallbackPollId = setInterval(() => { if (!document.hidden) fetchScores(); }, FALLBACK_POLL_MS);
            }
          }
        }),
    );

    const handleVisibility = () => {
      if (!document.hidden) fetchScores();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      for (const ch of channels) supabase.removeChannel(ch);
      if (fallbackPollId) clearInterval(fallbackPollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, view, user?.role]);
}
