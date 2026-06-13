/**
 * ActivityTypeTabs — Horizontal tab strip shown at the top of every
 * teacher creation surface (the Assignment wizard AND the Class Show /
 * Hot Seat / Vocab Wheel / Vocabagrut setup screens).  Lets the teacher
 * jump between the creation tools in one tap instead of backing out to
 * the dashboard each time.
 *
 *   [📚 Assignment] [📺 Class Show] [👥 Hot Seat] [🎡 Vocab Wheel] [✨ Vocabagrut]
 *
 * Tapping the ACTIVE tab is a no-op.  Tapping any other non-Assignment
 * tab calls `onSwitch` with the activity id; the parent opens the
 * matching view with the current class preselected.  The Assignment tab
 * routes through the separate `onSwitchToAssignment` callback (the
 * wizard needs a selected class, so the parent decides where it lands) —
 * when the wizard itself is the active surface no callback is wired, so
 * the already-active Assignment tab stays purely visual.
 *
 * Hidden when the surface is in Quick Play mode (those tabs make no
 * sense without a class), and Hot Seat / Wheel / Vocabagrut hide on
 * Hebrew classes (those tools are English-only — same gate the old
 * dashboard tiles used).
 */
import React from 'react';
import { BookOpen, Tv2, Users, Sparkles, Disc3 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherWizardsT } from '../../locales/teacher/wizards';
import { teacherDashboardT } from '../../locales/teacher/dashboard';

export type ActivityType = 'assignment' | 'class-show' | 'hot-seat' | 'wheel' | 'vocabagrut';

export interface ActivityTypeTabsProps {
  /** Currently-rendered activity. The wizard always passes
   *  'assignment' today; the other values exist so the parent can
   *  visually highlight which tab is open if it ever inlines the
   *  other flows. */
  active: ActivityType;
  /** Fired when the teacher picks a non-active, non-Assignment tab.
   *  Parent opens the chosen tool with the class preselected.  Narrowed
   *  to exclude 'assignment' so callers that only host the tool tabs
   *  (the wizard) don't have to handle it. */
  onSwitch: (type: Exclude<ActivityType, 'assignment'>) => void;
  /** Fired when the teacher taps the Assignment tab while it is NOT the
   *  active surface (i.e. the strip is mounted on a tool page).  Routed
   *  separately because opening the Assignment wizard needs a selected
   *  class, so the parent decides where it lands.  Omit it on the
   *  wizard itself — there the Assignment tab is already active and
   *  stays a visual no-op. */
  onSwitchToAssignment?: () => void;
  /** Hide Hot Seat + Wheel + Vocabagrut tabs.  Set when the parent class
   *  is Hebrew, matching the dashboard tile gating that lived in the
   *  previous TeacherQuickActions. */
  hideEnglishOnlyTabs?: boolean;
}

interface TabDef {
  id: ActivityType;
  label: string;
  icon: React.ReactNode;
  /** Tailwind classes for the active-state pill. */
  activeBg: string;
  iconColor: string;
}

// Vocabagrut is OFF by default — only schools/teachers who explicitly
// ask for it should see it.  Flip to `true` (or gate per-account) to
// surface the tab again.  The /vocabagrut route itself still resolves,
// so a requesting school can be linked straight to it without this flag.
const VOCABAGRUT_VISIBLE = false;

const ActivityTypeTabs: React.FC<ActivityTypeTabsProps> = ({
  active,
  onSwitch,
  onSwitchToAssignment,
  hideEnglishOnlyTabs = false,
}) => {
  const { language, isRTL } = useLanguage();
  const tw = teacherWizardsT[language];
  const td = teacherDashboardT[language];

  const tabs: TabDef[] = [
    { id: 'assignment', label: tw.activityTabAssignment, icon: <BookOpen size={16} />, activeBg: 'bg-indigo-600', iconColor: 'text-indigo-600' },
    { id: 'class-show', label: td.classShowTitle, icon: <Tv2 size={16} />, activeBg: 'bg-fuchsia-600', iconColor: 'text-fuchsia-600' },
    ...(hideEnglishOnlyTabs ? [] : [
      { id: 'hot-seat' as const, label: td.hotSeatTitle, icon: <Users size={16} />, activeBg: 'bg-orange-600', iconColor: 'text-orange-600' },
      { id: 'wheel' as const, label: td.wheelTitle, icon: <Disc3 size={16} />, activeBg: 'bg-violet-600', iconColor: 'text-violet-600' },
      ...(VOCABAGRUT_VISIBLE ? [
        { id: 'vocabagrut' as const, label: td.vocabagrutTitle, icon: <Sparkles size={16} />, activeBg: 'bg-violet-600', iconColor: 'text-violet-600' },
      ] : []),
    ]),
  ];

  // Brand-aligned constants — mirror dashboardAccents.ts.  Inlined
  // because this is the only place outside src/components/dashboard/
  // that paints them today.
  const BRAND_GRADIENT = 'linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)';
  const BRAND_GLOW = '0 8px 18px -10px rgba(139,92,246,0.6)';

  return (
    <div className="mb-5 sm:mb-6" dir={isRTL ? 'rtl' : undefined}>
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6]">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'linear-gradient(135deg,#8B5CF6,#D946EF)' }}
        />
        {tw.activityTabsEyebrow}
      </div>

      {/* Horizontal scroller for narrow viewports — the 5 pills don't
          fit on a 360px phone otherwise. Centered when there's room. */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-center gap-2 min-w-max mx-auto">
          {tabs.map(tab => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  if (tab.id === 'assignment') {
                    onSwitchToAssignment?.();
                    return;
                  }
                  onSwitch(tab.id);
                }}
                aria-pressed={isActive}
                style={isActive
                  ? {
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      background: BRAND_GRADIENT,
                      borderColor: 'transparent',
                      color: '#fff',
                      boxShadow: BRAND_GLOW,
                    }
                  : {
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      backgroundColor: 'var(--vb-surface)',
                      borderColor: 'var(--vb-border)',
                      color: 'var(--vb-text-primary)',
                    }
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-transform active:scale-[0.97]"
              >
                <span className={isActive ? 'text-white' : tab.iconColor}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivityTypeTabs;
