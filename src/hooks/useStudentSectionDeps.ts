/**
 * useStudentSectionDeps — assembles the StudentSectionRoute prop bag
 * (dashboard + hub sub-pages) for App.tsx.
 *
 * Nothing could be absorbed here: every field comes from shared App
 * state or from protected hooks (useStudentLogin) whose call sites must
 * stay in App.  This builder owns the bag assembly, the two small
 * derivations, and the student gate — App passes its possibly-null user
 * and gets `null` back for non-students, keeping the render branch
 * equivalent to the old `user?.role === "student" && ...`.
 *
 * Contains no hook calls, so its position in App.tsx has no effect on
 * the hook order.  Returns a fresh (un-memoized) bag every render —
 * same identity semantics as the old inline literal.
 */
import type React from 'react';
import type { AppUser } from '../core/supabase';
import type { StudentDashboardSectionDeps } from '../views/StudentDashboardSection';

export type UseStudentSectionDepsArgs = Omit<
  StudentDashboardSectionDeps,
  'user' | 'evolutionPending' | 'onRequestLogout'
> & {
  user: AppUser | null;
  /** Same signal as LevelUpModal — `useLevelUp().pending`. */
  levelUpPending: { title: string; emoji: string; min: number } | null;
  setShowExitConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useStudentSectionDeps(
  args: UseStudentSectionDepsArgs,
): StudentDashboardSectionDeps | null {
  const { user, levelUpPending, setShowExitConfirmModal, ...rest } = args;
  if (user?.role !== 'student') return null;
  return {
    ...rest,
    user,
    // Same crossing that fires LevelUpModal triggers the pet's
    // transformation animation (XP_TITLES tiers coincide with
    // PET_MILESTONES, so the pet has just evolved too).
    evolutionPending: Boolean(levelUpPending),
    // Top-bar logout routes through the same soft-landing modal the
    // hardware back button uses, so a stray tap doesn't drop the kid
    // straight out of their session.
    onRequestLogout: () => setShowExitConfirmModal(true),
  };
}
