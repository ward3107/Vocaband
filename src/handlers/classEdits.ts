/**
 * Class-edit handlers used by the teacher dashboard's class-card menu:
 *
 *   - saveClassEdit     — full edit-modal save (name + avatar + school)
 *   - renameClass       — inline rename action
 *   - changeClassAvatar — inline avatar picker
 *
 * Each does the Supabase UPDATE, patches local React state
 * optimistically (RLS already lets teachers edit their own classes —
 * see migration 20260402_add_teacher_class_rls), and surfaces a toast
 * on the result.  class_id and class_code never change, so all
 * foreign keys (assignments, progress, student_profiles) are
 * preserved by name/avatar/school edits.
 */
import type React from 'react';
import { supabase, type ClassData } from '../core/supabase';
import { logAudit } from '../utils/audit';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;
type SetClasses = React.Dispatch<React.SetStateAction<ClassData[]>>;

interface BaseDeps {
  setClasses: SetClasses;
  showToast: ToastFn;
}

export interface ClassEditFields {
  name: string;
  avatar: string | null;
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
}

export async function saveClassEdit(
  classId: string,
  next: ClassEditFields,
  deps: BaseDeps & { onSuccess?: () => void },
): Promise<void> {
  // School branding fields (added 20260512) are nullable — send a
  // trimmed string or NULL, never an empty string.
  const schoolName = next.schoolName?.trim() || null;
  const schoolLogoUrl = next.schoolLogoUrl?.trim() || null;

  const { error } = await supabase
    .from('classes')
    .update({
      name: next.name,
      avatar: next.avatar,
      school_name: schoolName,
      school_logo_url: schoolLogoUrl,
    })
    .eq('id', classId);
  if (error) {
    deps.showToast('Could not save class changes. Please try again.', 'error');
    return;
  }
  // Field names go in metadata but never values — names of school
  // branding fields aren't PII, but the field VALUES could be (e.g.
  // a school name).  The audit row is "edit happened", not "here's
  // what changed to what".
  void logAudit('edit_class', 'classes', {
    metadata: { class_id: classId, fields: ['name', 'avatar', 'school_name', 'school_logo_url'] },
  });
  deps.setClasses((prev) =>
    prev.map((c) =>
      c.id === classId
        ? { ...c, name: next.name, avatar: next.avatar, schoolName, schoolLogoUrl }
        : c,
    ),
  );
  deps.onSuccess?.();
  deps.showToast('Class updated.', 'success');
}

export async function renameClass(
  classId: string,
  newName: string,
  deps: BaseDeps,
): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .update({ name: newName })
    .eq('id', classId);
  if (error) {
    deps.showToast('Could not update name. Please try again.', 'error');
    return;
  }
  void logAudit('edit_class', 'classes', {
    metadata: { class_id: classId, fields: ['name'] },
  });
  deps.setClasses((prev) =>
    prev.map((c) => (c.id === classId ? { ...c, name: newName } : c)),
  );
  deps.showToast('Name updated.', 'success');
}

export async function changeClassAvatar(
  classId: string,
  newAvatar: string | null,
  deps: BaseDeps,
): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .update({ avatar: newAvatar })
    .eq('id', classId);
  if (error) {
    deps.showToast('Could not update avatar. Please try again.', 'error');
    return;
  }
  void logAudit('edit_class', 'classes', {
    metadata: { class_id: classId, fields: ['avatar'] },
  });
  deps.setClasses((prev) =>
    prev.map((c) => (c.id === classId ? { ...c, avatar: newAvatar } : c)),
  );
  deps.showToast('Avatar updated.', 'success');
}
