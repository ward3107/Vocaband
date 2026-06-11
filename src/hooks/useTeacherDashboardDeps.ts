/**
 * useTeacherDashboardDeps — assembles the TeacherDashboardProvider value
 * bag for App.tsx.
 *
 * Unlike useGameRouteDeps, nothing could be absorbed here: every hook
 * that feeds this bag (useTeacherActions, useTeacherData,
 * useTeacherUiModalsState, useSavedTasks, ...) also feeds hooks that
 * stay in App (useAuthRestore, useDashboardPolling, renderMiscViews),
 * so their call sites can't move without reordering the global hook
 * sequence.  What this builder DOES own is the bag assembly itself,
 * the `showVocaSwitcher` derivation, and the teacher gate — App passes
 * its possibly-null user and gets `null` back for non-teachers, which
 * keeps the render branch condition equivalent to the old
 * `hasTeacherAccess(user) && view === "teacher-dashboard"`.
 *
 * Contains no hook calls, so its position in App.tsx has no effect on
 * the hook order.
 *
 * WHY the returned bag is NOT memoized: it's the same fresh object
 * literal App always passed to TeacherDashboardProvider, so the context
 * value's identity per render is unchanged — the dashboard's re-render
 * behavior stays byte-for-byte identical to the inline version.
 */
import { hasTeacherAccess, type AppUser } from '../core/supabase';
import { getEntitledVocas } from '../core/subject';
import type { TeacherDashboardSectionDeps } from '../views/TeacherDashboardContext';

export type UseTeacherDashboardDepsArgs = Omit<
  TeacherDashboardSectionDeps,
  'user' | 'showVocaSwitcher'
> & {
  user: AppUser | null;
};

export function useTeacherDashboardDeps(
  args: UseTeacherDashboardDepsArgs,
): TeacherDashboardSectionDeps | null {
  const { user, ...rest } = args;
  if (!hasTeacherAccess(user)) return null;
  return {
    ...rest,
    user,
    showVocaSwitcher: getEntitledVocas(user).length >= 2,
  };
}
