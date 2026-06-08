/**
 * ActivityTabsSlot — the ActivityTypeTabs strip wired for use on a
 * teacher creation *page* (Class Show / Hot Seat / Vocab Wheel /
 * Vocabagrut), as opposed to inside the Assignment wizard.
 *
 * The wizard wires ActivityTypeTabs itself (it owns the switch handler
 * that closes the wizard).  Every other creation view is a full-screen
 * page rendered by a section renderer, so this slot centralises the
 * "switch to another tool" navigation in one place: each view just
 * renders the node the section hands it, right under its PageHero.
 *
 * Switching is plain view navigation — the non-Assignment activity ids
 * map 1:1 onto View values ('hot-seat' | 'wheel' | 'class-show' |
 * 'vocabagrut'), and the Assignment tab needs a selected class (the
 * wizard is class-scoped), so it falls back to the dashboard when none
 * is set rather than dead-ending on a view that won't render.
 */
import ActivityTypeTabs, { type ActivityType } from './ActivityTypeTabs';
import type { View } from '../../core/views';

interface ActivityTabsSlotProps {
  /** Which tool this page is — highlights the matching tab. */
  active: Exclude<ActivityType, 'assignment'>;
  setView: (v: View) => void;
  /** Whether a class is currently selected.  The Assignment wizard
   *  needs one, so without it the Assignment tab returns to the
   *  dashboard (where the teacher picks a class) instead of opening a
   *  view that silently won't render. */
  hasSelectedClass: boolean;
  /** Hide the English-only tools (Hot Seat / Wheel / Vocabagrut) when
   *  the active class / voca is Hebrew. */
  isHebrew?: boolean;
}

export default function ActivityTabsSlot({
  active,
  setView,
  hasSelectedClass,
  isHebrew = false,
}: ActivityTabsSlotProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
      <ActivityTypeTabs
        active={active}
        // Non-Assignment activity ids ARE View values, so navigation is
        // a direct setView.
        onSwitch={(type) => setView(type)}
        onSwitchToAssignment={() =>
          setView(hasSelectedClass ? 'create-assignment' : 'teacher-dashboard')
        }
        hideEnglishOnlyTabs={isHebrew}
      />
    </div>
  );
}
