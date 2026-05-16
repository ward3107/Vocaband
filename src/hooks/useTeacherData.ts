/**
 * useTeacherData — read-only data fetchers extracted from App.tsx so
 * the orchestrator file isn't carrying the Supabase plumbing for the
 * teacher dashboard's first-load.
 *
 * Functions:
 *   - `fetchTeacherData(uid)` — load the classes a teacher owns and
 *     mirror them into App's `classes` state. Returns the mapped list
 *     so callers can chain (e.g. App.tsx awaits the result and then
 *     immediately refreshes assignments using the fresh class IDs,
 *     avoiding the stale-state race).
 *   - `loadAssignmentsForClass(classData, code, studentUid)` — student
 *     dashboard's first-load: their class's assignments + their own
 *     progress rows.
 *   - `loadPendingStudents()` — teacher approvals queue (pending
 *     student_profiles rows scoped to the teacher's own classes).
 *
 * All three were inline closures in App.tsx; behaviour unchanged.
 *
 * The old `loadStudentsInClass` was removed when student login moved
 * to OAuth-only — the "Is that you?" name picker it fed is gone.
 */
import { useCallback } from "react";
import {
  supabase,
  mapClass,
  mapAssignment,
  mapProgress,
  CLASS_COLUMNS,
  ASSIGNMENT_COLUMNS,
  PROGRESS_COLUMNS,
  type AppUser,
  type AssignmentData,
  type ClassData,
  type ProgressData,
} from "../core/supabase";
import { isPro, FREE_TIER_LIMITS } from "../core/plan";
import { cachedRead } from "../core/readCache";
import { trackAutoError } from "../errorTracking";

interface PendingStudent {
  id: string;
  displayName: string;
  classCode: string;
  className: string;
  joinedAt: string;
}

export interface UseTeacherDataParams {
  /** Current teacher.  Null during initial load.  Used by the approval
   *  handler to enforce the Free-tier 30-students-per-class cap. */
  user: AppUser | null;
  classes: ClassData[];
  setClasses: React.Dispatch<React.SetStateAction<ClassData[]>>;
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;
  setPendingStudents: React.Dispatch<React.SetStateAction<PendingStudent[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  /** Opens the reject-confirmation modal in App.tsx. handleRejectStudent
   *  flows through here so the destructive action requires explicit
   *  confirmation before confirmRejectStudent flips the status. */
  setRejectStudentModal: (v: { id: string; displayName: string } | null) => void;
}

export function useTeacherData(params: UseTeacherDataParams) {
  const {
    user, classes, setClasses,
    setStudentAssignments, setStudentProgress, setPendingStudents,
    setError, showToast, setRejectStudentModal,
  } = params;

  const fetchTeacherData = useCallback(async (uid: string): Promise<ClassData[]> => {
    // Cache the teacher's class list — it changes rarely (only when the
    // teacher adds/edits/removes a class) so a stale-while-revalidate
    // read is almost always correct, and on school Wi-Fi the cached hit
    // shaves the entire Supabase round-trip off the dashboard's first
    // paint.  See docs/SCHOOL-PERFORMANCE-PLAN.md (task R1) for context.
    //
    // The fetcher MUST throw on Supabase errors so cachedRead falls back
    // to the cached entry rather than overwriting it with [].  Silently
    // returning [] on error would defeat SWR — a flaky-network teacher
    // would see their dashboard clear after every refresh as the empty
    // response replaced their cached classes.  An empty `data` array
    // (new teacher with no classes yet) is still a valid result and
    // gets cached normally.
    try {
      const fresh = await cachedRead<ClassData[]>(
        'classes',
        async () => {
          const { data, error } = await supabase
            .from('classes').select(CLASS_COLUMNS).eq('teacher_uid', uid);
          if (error) throw error;
          if (!data) throw new Error('classes fetch returned no data');
          return data.map(mapClass);
        },
        {
          userScope: uid,
          ttlMs: 5 * 60 * 1000,
          onCacheHit: (cached) => setClasses(cached),
        },
      );
      setClasses(fresh);
      return fresh;
    } catch {
      // Total miss — fetcher threw AND no cache to fall back to.
      // Preserve the pre-cache behavior of returning [] so chained
      // callers (App.tsx awaits this then refreshes assignments) don't
      // crash on an unexpected rejection.  If a cache existed,
      // onCacheHit already populated `classes` state via setClasses.
      return [];
    }
  }, [setClasses]);

  const loadAssignmentsForClass = useCallback(async (
    classData: { id: string },
    code: string,
    studentUid: string,
  ) => {
    // Assignments (RPC, bypasses RLS) and progress (student's own rows)
    // are independent queries — fire them in parallel so the student's
    // first-load saves a full round-trip.  Previously these awaited
    // sequentially, costing ~150–300 ms on every login.
    //
    // Assignment list goes through cachedRead so a returning student
    // sees their tasks instantly on weak Wi-Fi while the freshness
    // fetch revalidates in the background.  Progress is NOT cached
    // because it changes after every game finish — too dynamic for
    // SWR to be worth it.  See docs/SCHOOL-PERFORMANCE-PLAN.md (R1).
    //
    // The cached-read fetcher throws on Supabase failure so cachedRead
    // returns the previously-cached list instead of clobbering it with
    // []; we wrap the outer call so a total miss (failure with no
    // cache) doesn't reject the Promise.all and stop progress from
    // applying.  Sentinel pattern: 'ok' overwrites state with the
    // fresh-or-cached payload; 'kept-cache' leaves state alone (the
    // onCacheHit microtask already rendered the cached value, or the
    // UI keeps whatever it had).
    const [assignOutcome, progressResp] = await Promise.all([
      cachedRead<AssignmentData[]>(
        `assignments:${classData.id}`,
        async () => {
          const { data: assignResult, error: assignError } =
            await supabase.rpc('get_assignments_for_class', { p_class_id: classData.id });
          if (assignError) {
            // Surface the real PostgREST error body — the plain 400 line in
            // the network tab says nothing; the body has the actual cause
            // (function overload missing, column renamed, auth gate, etc.).
            console.error('[get_assignments_for_class] RPC failed:', {
              code: assignError.code,
              message: assignError.message,
              details: assignError.details,
              hint: assignError.hint,
              classId: classData.id,
            });
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('assignments').select(ASSIGNMENT_COLUMNS).eq('class_id', classData.id);
            if (fallbackError) throw fallbackError;
            if (!fallbackData) throw new Error('get_assignments_for_class fallback returned no data');
            return fallbackData.map(mapAssignment);
          }
          if (!assignResult) throw new Error('get_assignments_for_class returned no data');
          return assignResult.map(mapAssignment);
        },
        {
          userScope: studentUid,
          ttlMs: 2 * 60 * 1000,
          onCacheHit: (cached) => setStudentAssignments(cached),
        },
      ).then<{ kind: 'ok'; data: AssignmentData[] } | { kind: 'kept-cache' }>(
        fresh => ({ kind: 'ok', data: fresh }),
        () => ({ kind: 'kept-cache' }),
      ),
      supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', code).eq('student_uid', studentUid),
    ]);

    if (assignOutcome.kind === 'ok') {
      setStudentAssignments(assignOutcome.data);
    }
    setStudentProgress((progressResp.data ?? []).map(mapProgress));
  }, [setStudentAssignments, setStudentProgress]);

  const loadPendingStudents = useCallback(async () => {
    // Guard: the query below must be scoped by the teacher's class codes,
    // both as a belt-and-suspenders against RLS misconfig and so we can
    // render the class name next to each pending student. If classes
    // haven't loaded yet (common race on fresh teacher dashboard mount),
    // clear the list and bail — the effect below will re-invoke us once
    // classes populates.
    if (classes.length === 0) {
      setPendingStudents([]);
      return;
    }
    try {
      const classCodes = classes.map(c => c.code);
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          id,
          display_name,
          class_code,
          joined_at
        `)
        .eq('status', 'pending_approval')
        .in('class_code', classCodes)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setPendingStudents((data || []).map(s => {
        // Find class name from local classes state
        const classObj = classes.find(c => c.code === s.class_code);
        return {
          id: s.id,
          displayName: s.display_name,
          classCode: s.class_code,
          className: classObj?.name || s.class_code,
          joinedAt: s.joined_at,
        };
      }));
    } catch (error) {
      // Surface instead of swallow — teachers reported seeing "All caught
      // up!" even when students were waiting. If RLS blocks the query or
      // the network dies, the teacher needs to know there's a problem
      // rather than silently seeing an empty list.
      trackAutoError(error, 'Failed to load pending students list');
      const message = error instanceof Error ? error.message : 'unknown error';
      showToast(`Couldn't load pending students: ${message}`, 'error');
    }
  }, [classes, setPendingStudents, showToast]);

  // ─── Approval queue actions ─────────────────────────────────────────
  // Approve: SECURITY DEFINER RPC creates the auth.users row + flips
  // status to 'approved' atomically.
  const handleApproveStudent = useCallback(async (studentId: string, displayName: string) => {
    try {
      // Free-tier gate: max 30 approved students per class.  We only
      // run this query for Free teachers — Pro/School/trialing skip
      // the round-trip entirely.  Look up the pending student's class
      // first, then count approved siblings.
      if (!isPro(user)) {
        const { data: pending } = await supabase
          .from('student_profiles')
          .select('class_code')
          .eq('id', studentId)
          .maybeSingle();
        if (pending?.class_code) {
          const { count } = await supabase
            .from('student_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('class_code', pending.class_code)
            .in('status', ['active', 'approved']);
          if ((count ?? 0) >= FREE_TIER_LIMITS.MAX_STUDENTS_PER_CLASS) {
            showToast(
              `Free plan is limited to ${FREE_TIER_LIMITS.MAX_STUDENTS_PER_CLASS} students per class. Upgrade to Pro for unlimited students.`,
              "error",
            );
            return;
          }
        }
      }

      const { error } = await supabase.rpc('approve_student', {
        p_profile_id: studentId,
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Refresh the list
      await loadPendingStudents();

      showToast(`Approved ${displayName}! They can now log in and start learning.`, "success");
    } catch (error) {
      console.error('Error approving student:', error);
      showToast("Could not approve student. Please try again.", "error");
    }
  }, [user, loadPendingStudents, showToast]);

  // Reject: opens a confirmation modal first; the actual flip happens
  // in confirmRejectStudent below.
  const handleRejectStudent = useCallback(async (studentId: string, displayName: string) => {
    setRejectStudentModal({ id: studentId, displayName });
  }, [setRejectStudentModal]);

  const confirmRejectStudent = useCallback(async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ status: 'rejected' })
        .eq('id', studentId);

      if (error) throw error;

      // Refresh the list
      await loadPendingStudents();
    } catch (error) {
      console.error('Error rejecting student:', error);
      showToast("Could not reject student. Please try again.", "error");
    }
  }, [loadPendingStudents, showToast]);

  return {
    fetchTeacherData,
    loadAssignmentsForClass,
    loadPendingStudents,
    handleApproveStudent,
    handleRejectStudent,
    confirmRejectStudent,
  };
}
