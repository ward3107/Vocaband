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
 * The undo state lives on window because the auto-fire setTimeout and
 * the toast's onClick close over different render scopes; this matches
 * the original inline pattern.  Pulled out of App.tsx so the
 * staged-delete dance has a single home.
 */
import type React from 'react';
import { supabase, type AssignmentData } from '../core/supabase';

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

// Untyped helper to keep the window.__undo* access in one place.
type UndoWindow = typeof window & {
  __undoAssignment?: AssignmentData;
  __undoDeleteTimeout?: ReturnType<typeof setTimeout>;
};
const undoWindow = (): UndoWindow => window as UndoWindow;

export function deleteAssignmentWithUndo(
  deletedId: string,
  deletedTitle: string,
  deps: DeleteAssignmentDeps,
): void {
  const { setTeacherAssignments, setDeleteConfirmModal, setToasts, showToast } = deps;

  setTeacherAssignments((prev) => {
    const removed = prev.find((x) => x.id === deletedId);
    if (removed) undoWindow().__undoAssignment = removed;
    return prev.filter((x) => x.id !== deletedId);
  });
  setDeleteConfirmModal(null);

  const undoTimeout = setTimeout(async () => {
    const { error } = await supabase.from('assignments').delete().eq('id', deletedId);
    if (error) showToast(deps.failedDeleteMsg(error.message), 'error');
    delete undoWindow().__undoAssignment;
    delete undoWindow().__undoDeleteTimeout;
  }, 8000);
  undoWindow().__undoDeleteTimeout = undoTimeout;

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
          const w = undoWindow();
          if (w.__undoDeleteTimeout) clearTimeout(w.__undoDeleteTimeout);
          const restored = w.__undoAssignment;
          if (restored) {
            setTeacherAssignments((prev) => [...prev, restored]);
            delete w.__undoAssignment;
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
