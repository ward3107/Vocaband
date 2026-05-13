/**
 * TodayStrip — the single horizontal strip that replaces the old pile
 * of daily-goal + retention + stats widgets.
 *
 * Shows:
 *   * Greeting + streak flame.
 *   * The student's "one job today" CTA — first unfinished assignment,
 *     otherwise a practice call-to-action.
 *   * XP total as a quieter secondary number.
 *
 * This is the ONLY actionable control above StructureHero on the
 * redesigned dashboard.  Keep it tight — one primary CTA, no widget
 * soup.
 */
import React from 'react';
import { Flame, Play, Sparkles } from 'lucide-react';
import type { AppUser, AssignmentData, ProgressData } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';
import { structureT } from '../../locales/student/structure';

export interface TodayStripProps {
  user: AppUser;
  xp: number;
  streak: number;
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  /** Called when the student taps the primary CTA.  Caller should
   *  pick the right assignment and navigate to the game view. */
  onPlayNextAssignment: (assignment: AssignmentData) => void;
  /** Fallback CTA when there are no assignments — e.g. open practice. */
  onPractice: () => void;
}

export const TodayStrip: React.FC<TodayStripProps> = ({
  user,
  xp,
  streak,
  studentAssignments,
  studentProgress,
  onPlayNextAssignment,
  onPractice,
}) => {
  const { language } = useLanguage();
  const t = structureT[language];
  // Pick the "next" assignment: the first one without 100% progress
  // across its allowed modes.  If none, assignments are all done and we
  // show the practice CTA instead.
  const nextAssignment = studentAssignments.find(a => {
    const progressRows = studentProgress.filter(p => p.assignmentId === a.id);
    const modes = a.allowedModes?.length ? a.allowedModes : ['classic'];
    const completedModes = new Set(progressRows.map(p => p.mode));
    return modes.some(m => !completedModes.has(m));
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.greetingMorning : hour < 18 ? t.greetingAfternoon : t.greetingEvening;

  return (
    <section
      aria-label={t.todayAria}
      className="mb-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-3xl p-4 sm:p-5 shadow-lg text-white"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Left: greeting + streak */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
            {greeting}, {user.displayName?.split(' ')[0] ?? t.greetingFriendFallback}
          </p>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs font-bold">
              <Flame size={14} className={streak > 0 ? 'text-amber-300' : 'text-white/60'} />
              {streak > 0 ? t.todayStreakLabel(streak) : t.todayStartStreak}
            </span>
            <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs font-bold">
              <Sparkles size={14} className="text-amber-200" />
              {xp.toLocaleString()} XP
            </span>
          </div>
        </div>

        {/* Right: primary CTA */}
        {nextAssignment ? (
          <button
            onClick={() => onPlayNextAssignment(nextAssignment)}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-white text-indigo-700 font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <Play size={16} fill="currentColor" />
            {t.todayPlay}
          </button>
        ) : (
          <button
            onClick={onPractice}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-white text-indigo-700 font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <Sparkles size={16} />
            {t.todayPractice}
          </button>
        )}
      </div>

      {/* Below: one-liner of what the CTA does */}
      <p className="mt-3 text-xs sm:text-sm opacity-90 leading-snug">
        {nextAssignment ? (
          <>{t.todayJobLead} <span className="font-bold">{nextAssignment.title}</span>{t.todayJobTail}</>
        ) : (
          <>{t.todayAllDone}</>
        )}
      </p>
    </section>
  );
};
