/**
 * ActivityTypeTabs — Horizontal tab strip at the top of the New
 * Activity wizard.  Lets the teacher pick what kind of thing they
 * want to create for the current class without leaving the wizard.
 *
 *   [📚 Assignment] [📺 Class Show] [🖨️ Worksheet] [👥 Hot Seat] [✨ Vocabagrut]
 *
 * Tapping a non-Assignment tab calls onSwitch with the activity id;
 * the parent closes the wizard and opens the matching view with the
 * current class preselected.  The Assignment tab is purely visual —
 * it's already the active flow, so no callback fires.
 *
 * Hidden when the wizard is in Quick Play mode (those tabs make no
 * sense without a class), and Hot Seat / Vocabagrut hide on Hebrew
 * classes (those tools are English-only — same gate the old dashboard
 * tiles used).
 */
import React from 'react';
import { BookOpen, Tv2, Printer, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherWizardsT } from '../../locales/teacher/wizards';
import { teacherDashboardT } from '../../locales/teacher/dashboard';

export type ActivityType = 'assignment' | 'class-show' | 'worksheet' | 'hot-seat' | 'vocabagrut';

export interface ActivityTypeTabsProps {
  /** Currently-rendered activity. The wizard always passes
   *  'assignment' today; the other values exist so the parent can
   *  visually highlight which tab is open if it ever inlines the
   *  other flows. */
  active: ActivityType;
  /** Fired when the teacher picks a non-active tab.  Parent closes
   *  the wizard and opens the chosen tool with the class preselected.
   *  Narrowed to exclude 'assignment' because the Assignment tab is
   *  always the active wizard view — re-clicking it is a no-op. */
  onSwitch: (type: Exclude<ActivityType, 'assignment'>) => void;
  /** Hide Hot Seat + Vocabagrut tabs.  Set when the parent class is
   *  Hebrew, matching the dashboard tile gating that lived in the
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

const ActivityTypeTabs: React.FC<ActivityTypeTabsProps> = ({
  active,
  onSwitch,
  hideEnglishOnlyTabs = false,
}) => {
  const { language, isRTL } = useLanguage();
  const tw = teacherWizardsT[language];
  const td = teacherDashboardT[language];

  const tabs: TabDef[] = [
    { id: 'assignment', label: tw.activityTabAssignment, icon: <BookOpen size={16} />, activeBg: 'bg-indigo-600', iconColor: 'text-indigo-600' },
    { id: 'class-show', label: td.classShowTitle, icon: <Tv2 size={16} />, activeBg: 'bg-fuchsia-600', iconColor: 'text-fuchsia-600' },
    { id: 'worksheet', label: td.worksheetTitle, icon: <Printer size={16} />, activeBg: 'bg-emerald-600', iconColor: 'text-emerald-600' },
    ...(hideEnglishOnlyTabs ? [] : [
      { id: 'hot-seat' as const, label: td.hotSeatTitle, icon: <Users size={16} />, activeBg: 'bg-orange-600', iconColor: 'text-orange-600' },
      { id: 'vocabagrut' as const, label: td.vocabagrutTitle, icon: <Sparkles size={16} />, activeBg: 'bg-violet-600', iconColor: 'text-violet-600' },
    ]),
  ];

  return (
    <div className="mb-5 sm:mb-6" dir={isRTL ? 'rtl' : undefined}>
      <p
        className="text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2 px-1"
        style={{ color: 'var(--vb-text-muted)' }}
      >
        {tw.activityTabsEyebrow}
      </p>

      {/* Horizontal scroller for narrow viewports — the 5 pills don't
          fit on a 360px phone otherwise. */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2 min-w-max">
          {tabs.map(tab => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isActive || tab.id === 'assignment') return;
                  onSwitch(tab.id);
                }}
                aria-pressed={isActive}
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  backgroundColor: isActive ? undefined : 'var(--vb-surface)',
                  borderColor: 'var(--vb-border)',
                  color: isActive ? '#fff' : 'var(--vb-text-primary)',
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border shadow-sm whitespace-nowrap transition-all ${
                  isActive
                    ? `${tab.activeBg} border-transparent shadow-md`
                    : 'hover:opacity-90 active:scale-[0.97]'
                }`}
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
