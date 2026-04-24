/**
 * useClassSwitch — the confirm/cancel pair for the class-switch modal.
 *
 * Shown when an already-approved student logs in with a class code
 * that differs from their current class_code. Extracted from App.tsx.
 * Same behaviour as the inline versions.
 *
 * Two handlers:
 *   - `handleConfirmClassSwitch()` — teacher's students get to hop
 *     classes without teacher re-approval (Approach 1 in the design
 *     discussion). The SECURITY DEFINER RPC `switch_student_class`
 *     atomically validates the target code + updates both users and
 *     student_profiles tables (needed because the users_update RLS
 *     policy freezes class_code for non-admins, so a direct UPDATE
 *     403s).
 *   - `handleCancelClassSwitch()` — teacher's students stay in the
 *     current class; just reload its data and dismiss the modal.
 *
 * Both hydrate the student dashboard after the choice so the user
 * lands cleanly regardless of path.
 */
import { useCallback } from "react";
import {
  supabase,
  mapClass,
  mapAssignment,
  mapProgress,
  CLASS_COLUMNS,
  PROGRESS_COLUMNS,
  type AppUser,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import type { View } from "../core/views";

interface PendingClassSwitch {
  fromCode: string;
  fromClassName: string | null;
  toCode: string;
  toClassName: string | null;
  supabaseUser: { id: string; email?: string | null };
}

export interface UseClassSwitchParams {
  pendingClassSwitch: PendingClassSwitch | null;
  setPendingClassSwitch: (v: PendingClassSwitch | null) => void;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setView: (v: View) => void;
  setLoading: (v: boolean) => void;
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function useClassSwitch(params: UseClassSwitchParams) {
  const {
    pendingClassSwitch, setPendingClassSwitch,
    setUser, setView, setLoading,
    setStudentAssignments, setStudentProgress,
    showToast,
  } = params;

  const handleConfirmClassSwitch = useCallback(async () => {
    if (!pendingClassSwitch) return;
    const { toCode, supabaseUser } = pendingClassSwitch;
    try {
      // Use the SECURITY DEFINER RPC instead of direct UPDATEs. The
      // users_update RLS policy (migration 20260340) freezes class_code for
      // non-admins to prevent casual class hopping via .update(). A direct
      // .update({class_code: newCode}) therefore 403s here. The RPC
      // validates target class exists + updates both users + student_profiles
      // atomically for the caller only. Added in migration 20260506.
      const { error: rpcErr } = await supabase.rpc('switch_student_class', {
        p_new_code: toCode,
      });
      if (rpcErr) throw rpcErr;

      // Load the new class's data and navigate to its dashboard.
      const { data: classRows } = await supabase
        .from('classes').select(CLASS_COLUMNS).eq('code', toCode);
      if (classRows && classRows.length > 0) {
        const classData = mapClass(classRows[0]);
        const [assignResult, progressResult] = await Promise.all([
          supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
          supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', toCode).eq('student_uid', supabaseUser.id),
        ]);
        setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
        setStudentProgress((progressResult.data ?? []).map(mapProgress));
      }

      // Update in-memory user.classCode so the dashboard header shows the new code.
      setUser(prev => prev ? { ...prev, classCode: toCode } : prev);
      setPendingClassSwitch(null);
      setView("student-dashboard");
      setLoading(false);
    } catch (err) {
      console.error('Class switch failed:', err);
      showToast('Could not switch class. Please try again.', 'error');
      setPendingClassSwitch(null);
    }
  }, [pendingClassSwitch, setPendingClassSwitch, setUser, setView, setLoading, setStudentAssignments, setStudentProgress, showToast]);

  const handleCancelClassSwitch = useCallback(async () => {
    if (!pendingClassSwitch) return;
    const { fromCode, supabaseUser } = pendingClassSwitch;
    // User chose to stay in their current class — load that class's data
    // as if the intended-code was never there.
    try {
      const { data: classRows } = await supabase
        .from('classes').select(CLASS_COLUMNS).eq('code', fromCode);
      if (classRows && classRows.length > 0) {
        const classData = mapClass(classRows[0]);
        const [assignResult, progressResult] = await Promise.all([
          supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
          supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', fromCode).eq('student_uid', supabaseUser.id),
        ]);
        setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
        setStudentProgress((progressResult.data ?? []).map(mapProgress));
      }
    } catch { /* non-fatal — dashboard still renders */ }
    setPendingClassSwitch(null);
    setView("student-dashboard");
    setLoading(false);
  }, [pendingClassSwitch, setPendingClassSwitch, setView, setLoading, setStudentAssignments, setStudentProgress]);

  return { handleConfirmClassSwitch, handleCancelClassSwitch };
}
