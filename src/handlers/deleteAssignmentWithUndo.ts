/**
 * Optimistic-delete-with-undo for teacher assignments.  Two stages:
 *
 *   1. Remove the row from local state instantly, stash a snapshot on
 *      window.__undoAssignment, and show an info toast with an Undo
 *      action.
 *   2. After 8 s with no undo, run the real Supabase DELETE.  An
 *      error on DELETE surfaces a toast but doesn't roll back the
 *      local removal — the row is gone visually either way, and the
 *      next refresh restores it if the server still has it.
 *
 * The undo state (the removed snapshot + the pending timeout) is captured
 * in per-call closure variables that both the auto-fire setTimeout and the
 * toast's onClick close over — they're defined in the same function scope,
 * so no shared/global slot is needed. An earlier version stashed this on a
 * single window.__undo* slot, which two overlapping deletes clobbered:
 * Undo then restored the wrong assignment and permanently lost the other.
 * Pulled out of App.tsx so the staged-delete dance has a single home.
 */
import type React from 'react';
import { supabase, type AssignmentData } from '../core/supabase';
import { logAudit } from '../utils/audit';

interface ToastEntry {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

export interface DeleteAssignmentDeps {
  setTeacherAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setDeleteConfirmModal: React.Dispatch<
    React.SetStateAction<{ id: string; title: string } | null>
  >;
  setToasts: React.Dispatch<React.SetStateAction<ToastEntry[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  failedDeleteMsg: (err: string) => string;
  restoredMsg: string;
}

export function deleteAssignmentWithUndo(
  deletedId: string,
  deletedTitle: string,
  deps: DeleteAssignmentDeps,
): void {
  const { setTeacherAssignments, setDeleteConfirmModal, setToasts, showToast } = deps;

  // Per-call state, shared only between THIS delete's timeout and its toast.
  let removedSnapshot: AssignmentData | undefined;
  let undone = false;

  setTeacherAssignments((prev) => {
    removedSnapshot = prev.find((x) => x.id === deletedId);
    return prev.filter((x) => x.id !== deletedId);
  });
  setDeleteConfirmModal(null);

  const undoTimeout = setTimeout(async () => {
    if (undone) return;
    const { error } = await supabase.from('assignments').delete().eq('id', deletedId);
    if (error) {
      showToast(deps.failedDeleteMsg(error.message), 'error');
    } else {
      // Logged only when the delete actually commits — an undone delete
      // never reaches here, so the audit row reflects reality.
      void logAudit('delete_assignment', 'assignments', { metadata: { assignment_id: deletedId } });
    }
  }, 8000);

  const undoToastId = Date.now().toString();
  setToasts((prev) => [
    ...prev,
    {
      id: undoToastId,
      message: `"${deletedTitle}" deleted`,
      type: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true;
          clearTimeout(undoTimeout);
          if (removedSnapshot) {
            const restored = removedSnapshot;
            setTeacherAssignments((prev) => [...prev, restored]);
          }
          setToasts((p) => p.filter((t) => t.id !== undoToastId));
          showToast(deps.restoredMsg, 'success');
        },
      },
    },
  ]);
  setTimeout(
    () => setToasts((prev) => prev.filter((t) => t.id !== undoToastId)),
    8000,
  );
}

export interface DeleteImmediateDeps {
  setTeacherAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  failedDeleteMsg: (err: string) => string;
  deletedMsg: string;
}

/**
 * No-undo delete used by the per-class action menu (vs. the bulk
 * "delete assignment" flow that goes through deleteAssignmentWithUndo).
 * Simple round-trip: DELETE → optimistic local removal → toast.
 */
export async function deleteAssignmentImmediate(
  assignmentId: string,
  deps: DeleteImmediateDeps,
): Promise<void> {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) {
    deps.showToast(deps.failedDeleteMsg(error.message), 'error');
    return;
  }
  void logAudit('delete_assignment', 'assignments', { metadata: { assignment_id: assignmentId } });
  deps.setTeacherAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  deps.showToast(deps.deletedMsg, 'success');
}
