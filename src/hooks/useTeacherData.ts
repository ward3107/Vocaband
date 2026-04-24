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
 *   - `loadStudentsInClass(classCode)` — populate the student-login
 *     "Is that you?" picker with the approved students for a class.
 *     Tries the SECURITY DEFINER RPC first, falls back to a direct
 *     query if the RPC is missing.
 *   - `loadAssignmentsForClass(classData, code, studentUid)` — student
 *     dashboard's first-load: their class's assignments + their own
 *     progress rows.
 *   - `loadPendingStudents()` — teacher approvals queue (pending
 *     student_profiles rows scoped to the teacher's own classes).
 *
 * All four were inline closures in App.tsx; behaviour unchanged.
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
  type AssignmentData,
  type ClassData,
  type ProgressData,
} from "../core/supabase";
import { trackAutoError } from "../errorTracking";

interface ExistingStudent {
  id: string;
  displayName: string;
  xp: number;
  status: string;
  avatar?: string;
}

interface PendingStudent {
  id: string;
  displayName: string;
  classCode: string;
  className: string;
  joinedAt: string;
}

export interface UseTeacherDataParams {
  classes: ClassData[];
  setClasses: React.Dispatch<React.SetStateAction<ClassData[]>>;
  setExistingStudents: React.Dispatch<React.SetStateAction<ExistingStudent[]>>;
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
    classes, setClasses, setExistingStudents,
    setStudentAssignments, setStudentProgress, setPendingStudents,
    setError, showToast, setRejectStudentModal,
  } = params;

  const fetchTeacherData = useCallback(async (uid: string): Promise<ClassData[]> => {
    const { data, error } = await supabase
      .from('classes').select(CLASS_COLUMNS).eq('teacher_uid', uid);
    if (!error && data) {
      const mappedClasses = data.map(mapClass);
      setClasses(mappedClasses);
      return mappedClasses;
    }
    return [];
  }, [setClasses]);

  const loadStudentsInClass = useCallback(async (classCode: string) => {
    const trimmedCode = classCode.trim().toUpperCase();
    if (!trimmedCode) return;

    try {
      // Use the new RPC function that bypasses RLS
      const { data, error } = await supabase
        .rpc('list_students_in_class', { p_class_code: trimmedCode });

      if (error) {
        console.error('RPC error:', error);
        // Fallback to direct query if RPC doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('student_profiles')
          .select('id, display_name, xp, status, avatar')
          .eq('class_code', trimmedCode)
          .eq('status', 'approved')
          .order('display_name', { ascending: true });

        if (fallbackError) {
          if (fallbackError.code === '42P01') {
            setExistingStudents([]);
            return;
          }
          throw fallbackError;
        }

        const mappedStudents = (fallbackData || []).map(s => ({
          id: s.id,
          displayName: s.display_name,
          xp: s.xp || 0,
          status: s.status,
          avatar: s.avatar || '🦊',
        }));

        setExistingStudents(mappedStudents);
        return;
      }

      // Map RPC results
      const mappedStudents = (data || []).map((s: { id: string; display_name: string; xp: number; status: string; avatar: string | null }) => ({
        id: s.id,
        displayName: s.display_name,
        xp: s.xp || 0,
        status: s.status,
        avatar: s.avatar || '🦊',
      }));

      setExistingStudents(mappedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      setError("Could not load students. Please check the class code.");
      setExistingStudents([]);
    }
  }, [setExistingStudents, setError]);

  const loadAssignmentsForClass = useCallback(async (
    classData: { id: string },
    code: string,
    studentUid: string,
  ) => {
    // Use RPC to bypass RLS for assignments
    const { data: assignResult, error: assignError } = await supabase
      .rpc('get_assignments_for_class', { p_class_id: classData.id });

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
    }

    // Progress still uses direct query (should work for student's own progress)
    const { data: progressResult } = await supabase
      .from('progress').select(PROGRESS_COLUMNS).eq('class_code', code).eq('student_uid', studentUid);

    if (assignError) {
      console.error('Assignments RPC error:', assignError);
      // Fallback to direct query
      const { data: fallbackData } = await supabase
        .from('assignments').select(ASSIGNMENT_COLUMNS).eq('class_id', classData.id);
      setStudentAssignments((fallbackData ?? []).map(mapAssignment));
    } else {
      setStudentAssignments((assignResult ?? []).map(mapAssignment));
    }

    setStudentProgress((progressResult ?? []).map(mapProgress));
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
  }, [loadPendingStudents, showToast]);

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
    loadStudentsInClass,
    loadAssignmentsForClass,
    loadPendingStudents,
    handleApproveStudent,
    handleRejectStudent,
    confirmRejectStudent,
  };
}
