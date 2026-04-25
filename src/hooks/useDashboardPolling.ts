/**
 * useDashboardPolling — the three background refresh loops that
 * keep a user's dashboard current without manual re-login or
 * navigation.
 *
 * All three share the same shape: "poll every N seconds + refetch
 * on tab refocus, but only while the relevant role + view + data
 * are present".  Supabase Realtime has been unreliable in practice
 * for these lists (teacher laptops suspend / Wi-Fi hiccups drop
 * subscriptions without surfacing), so cheap indexed polling is
 * the safety net.
 *
 *   1. Student assignments (60 s) — new assignments from the
 *      teacher appear on the student dashboard without relogin.
 *      Caches the class-id lookup so we don't query the classes
 *      table every cycle.  60 s is plenty given that assignments
 *      ship a couple times per week, not per minute.
 *
 *   2. Teacher pending-student approvals — adaptive interval:
 *        * 10 s while at least one student is sitting in
 *          'pending_approval' (so the teacher sees the approval
 *          land and reacts in under a card-flip)
 *        * 60 s otherwise (the steady-state when no one is queued).
 *      Plus a refetch on every tab refocus, so a teacher coming
 *      back from another tab sees fresh state immediately.
 *      Previously a flat 10 s poll meant 8 640 requests / teacher
 *      / day even when nothing was happening.  The adaptive form
 *      drops that by ~80 % at scale.
 *
 *   3. Teacher class scores (45 s, Classroom/Analytics/Gradebook
 *      only) — students complete assignments at any moment; the
 *      teacher should see new scores land without a full refresh.
 *      Initial fetch is guarded by `allScores.length === 0` so
 *      every view-switch inside the Classroom cluster doesn't
 *      re-hit the DB.  45 s replaces the old 20 s — gradebook
 *      isn't a stopwatch.
 *
 * Intervals were tightened on 2026-04-25 after a Supabase bill
 * audit showed dashboard polling alone was eating tens of millions
 * of requests per month.  All three loops still refetch on tab
 * focus via the visibilitychange listeners, so users coming back
 * to the tab still see fresh data without waiting for a tick.
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

const STUDENT_ASSIGNMENTS_POLL_MS = 60_000;
const TEACHER_APPROVALS_FAST_POLL_MS = 10_000;  // when 1+ pending
const TEACHER_APPROVALS_SLOW_POLL_MS = 60_000;  // when none pending
const TEACHER_SCORES_POLL_MS = 45_000;

export function useDashboardPolling(params: UseDashboardPollingParams): void {
  const {
    user, view, classes, allScores,
    pendingStudentsCount,
    setStudentAssignments,
    loadPendingStudents,
    fetchScores,
  } = params;

  // ─── 1. Student assignments: 60 s poll on the student dashboard ───
  useEffect(() => {
    if (user?.role !== 'student' || view !== 'student-dashboard' || !user.classCode) return;
    const code = user.classCode;
    // Cache the class id so we don't re-query `classes` every cycle.
    let cachedClassId: string | null = null;
    const refresh = async () => {
      // Double-check the user is still logged in (prevents DB calls after logout).
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
    refresh();
    const id = setInterval(refresh, STUDENT_ASSIGNMENTS_POLL_MS);
    return () => clearInterval(id);
  }, [user, view, setStudentAssignments]);

  // ─── 2. Teacher pending-student approvals: adaptive 10 s / 60 s ───
  useEffect(() => {
    // Trigger on: fresh teacher dashboard mount, dashboard re-entry,
    // OR the async classes list finally arriving (common race —
    // loadPendingStudents early-returns when classes.length === 0,
    // so without this dep the teacher sees a permanent empty state
    // if they land on the dashboard before the classes fetch resolves).
    if (!(user?.role === 'teacher' && view === 'teacher-dashboard' && classes.length > 0)) {
      return;
    }
    loadPendingStudents();

    // Adaptive cadence — fast when there are pending approvals (the
    // teacher is actively waiting for them to clear), slow otherwise.
    // The interval re-binds when pendingStudentsCount crosses zero so
    // we never sit at 10 s polling against an empty queue.
    const intervalMs = pendingStudentsCount > 0
      ? TEACHER_APPROVALS_FAST_POLL_MS
      : TEACHER_APPROVALS_SLOW_POLL_MS;
    const pollId = setInterval(() => {
      if (!document.hidden) loadPendingStudents();
    }, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden) loadPendingStudents();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.role, view, classes.length, loadPendingStudents, pendingStudentsCount]);

  // ─── 3. Teacher class scores: 45 s poll + visibility ──────────────
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    if (classes.length === 0) return;
    if (view !== 'classroom' && view !== 'analytics' && view !== 'gradebook') return;
    // Initial fetch — only if we haven't already loaded this session.
    // Without this guard, every view-switch inside Classroom would
    // re-hit the DB.
    if (allScores.length === 0) fetchScores();
    const pollId = setInterval(() => {
      if (!document.hidden) fetchScores();
    }, TEACHER_SCORES_POLL_MS);
    const handleVisibility = () => {
      if (!document.hidden) fetchScores();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length, view, user?.role]);
}
