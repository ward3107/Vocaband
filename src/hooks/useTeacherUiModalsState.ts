import { useState } from "react";
import type { ClassData } from "../core/supabase";

export type DeleteConfirmModal = { id: string; title: string };
export type RejectStudentModal = { id: string; displayName: string };

/**
 * Per-modal open/close state for the teacher dashboard. Each entry is
 * either a boolean (modal shown / not shown) or a payload object that
 * doubles as the open flag (null = closed).
 *
 * - `showCreateClassModal` + `newClassName` + `createdClassCode` +
 *   `createdClassName`: drive the multi-stage "Create class" flow
 *   from the "+" tile through the "Class created" success modal.
 * - `editingClass`: payload modal for the per-class edit form.
 * - `rosterModalClass`: payload modal for `Manage roster` (Path C
 *   PIN-login pre-create).
 * - `deleteConfirmModal` / `rejectStudentModal`: payload modals for
 *   the two confirm-then-execute destructive flows.
 * - `showExitConfirmModal`: in-app exit confirm at the dashboard floor.
 * - `copiedCode`: stores the class code that was just copied so the
 *   class card shows a transient "Copied!" indicator.
 * - `openDropdownClassId`: which class card's action dropdown is open.
 */
export function useTeacherUiModalsState() {
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [createdClassName, setCreatedClassName] = useState<string>("");
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [rosterModalClass, setRosterModalClass] = useState<ClassData | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModal | null>(null);
  const [rejectStudentModal, setRejectStudentModal] = useState<RejectStudentModal | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [openDropdownClassId, setOpenDropdownClassId] = useState<string | null>(null);

  return {
    showCreateClassModal, setShowCreateClassModal,
    newClassName, setNewClassName,
    createdClassCode, setCreatedClassCode,
    createdClassName, setCreatedClassName,
    editingClass, setEditingClass,
    rosterModalClass, setRosterModalClass,
    deleteConfirmModal, setDeleteConfirmModal,
    rejectStudentModal, setRejectStudentModal,
    showExitConfirmModal, setShowExitConfirmModal,
    copiedCode, setCopiedCode,
    openDropdownClassId, setOpenDropdownClassId,
  };
}
