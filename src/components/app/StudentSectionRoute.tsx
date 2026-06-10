/**
 * StudentSectionRoute — the student-dashboard early-return branch.
 * Picks the hub sub-page vs the main dashboard from `view`, then mounts
 * the shared celebration modals (level-up + achievements) alongside it.
 *
 * App.tsx guards this with its original render condition
 * (`user?.role === "student" && (view === "student-dashboard" || isStudentHubView(view))`)
 * — this component owns only the JSX that branch used to inline, so the
 * relocation is behaviour-preserving.  Presentational: no hooks here, so
 * App's hook call order is untouched.
 */
import type { ReactNode } from 'react';
import {
  StudentDashboardSection,
  StudentHubSection,
  isStudentHubView,
  type StudentDashboardSectionDeps,
} from '../../views/StudentDashboardSection';
import type { View } from '../../core/views';
import { AppCelebrations, type AppCelebrationsProps } from './AppCelebrations';

export interface StudentSectionRouteProps {
  /** Shared dashboard/hub prop bag (state + handlers + overlay nodes). */
  deps: StudentDashboardSectionDeps;
  /** Drives the hub-vs-dashboard choice — same value App branches on. */
  view: View;
  /** Celebration modals that must mount on this return path too. */
  celebrations: AppCelebrationsProps;
}

export function StudentSectionRoute({
  deps,
  view,
  celebrations,
}: StudentSectionRouteProps): ReactNode {
  // Shared prop bag — the dashboard and its hub sub-pages (Practice /
  // Missions / Boosters / Badges) need the same handlers + state.
  const section = isStudentHubView(view)
    ? StudentHubSection({ ...deps, view })
    : StudentDashboardSection(deps);
  // Celebrations must mount on these return paths too: XP grants,
  // badge claims and achievement unlocks all happen here, and the pet
  // transformation keys off levelUp.pending. Without these the student
  // never sees the level-up modal / achievement toasts that their
  // actions trigger (they only mounted in the final render branch,
  // which these early-return past).
  return (
    <>
      {section}
      <AppCelebrations {...celebrations} />
    </>
  );
}
