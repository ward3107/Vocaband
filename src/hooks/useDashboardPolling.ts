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
 *   1. Student assignments (30 s) — new assignments from the
 *      teacher appear on the student dashboard without relogin.
 *      Caches the class-id lookup so we don't query the classes
 *      table every 30 s.
 *
 *   2. Teacher pending-student approvals (10 s) — approval tray
 *      always reflects reality within ~10 s regardless of
 *      realtime health.  Also refires whenever the async classes
 *      list finally resolves, because `loadPendingStudents`
 *      early-returns on `classes.length === 0`.
 *
 *   3. Teacher class scores (20 s, Classroom/Analytics/Gradebook
 *      only) — students complete assignments at any moment; the
 *      teacher should see the new score land without a full
 *      refresh.  Initial fetch is guarded by
 *      `allScores.length === 0` so every view-switch inside the
 *      Classroom cluster doesn't re-hit the DB.
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
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  /** Fetcher from useTeacherData that hydrates `pendingStudents`. */
  loadPendingStudents: () => void | Promise<void>;
  /** Fetcher from useTeacherActions that hydrates `allScores`. */
  fetchScores: () => void | Promise<void>;
}

export function useDashboardPolling(params: UseDashboardPollingParams): void {
  const {
    user, view, classes, allScores,
    setStudentAssignments,
    loadPendingStudents,
    fetchScores,
  } = params;

  // ─── 1. Student assignments: 30 s poll on the student dashboard ───
  useEffect(() => {
    if (user?.role !== 'student' || view !== 'student-dashboard' || !user.classCode) return;
    const code = user.classCode;
    // Cache the class id so we don't re-query `classes` every 30 s.
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
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [user, view, setStudentAssignments]);

  // ─── 2. Teacher pending-student approvals: 10 s poll + visibility ─
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

    const pollId = setInterval(() => {
      if (!document.hidden) loadPendingStudents();
    }, 10_000);

    const handleVisibility = () => {
      if (!document.hidden) loadPendingStudents();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.role, view, classes.length, loadPendingStudents]);

  // ─── 3. Teacher class scores: 20 s poll + visibility ──────────────
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
    }, 20_000);
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
