/**
 * PetEvolutionCard — student-dashboard companion that grows with daily
 * activity and decays with inactivity.
 *
 * Distinct from PetCompanion (the existing XP-milestone pet).  This
 * card visualises the activity-driven pet:
 *   - Big stage emoji (egg / baby / child / teen / adult)
 *   - Mood indicator overlay (happy / neutral / sad / very-sad)
 *     based on days since last play
 *   - Progress bar to the next stage with "X / Y days" label
 *   - "Days since last play" pill (only when > 0, so a daily player
 *     never sees a nag — only kids who skipped a day get the nudge)
 *
 * Localized in EN / HE / AR; RTL via `dir` on the root.
 */
import { motion } from 'motion/react';
import {
  PET_STAGES,
  petStageFor,
  petMoodFor,
  type PetEvolutionState,
} from '../../hooks/usePetEvolution';
import { useLanguage } from '../../hooks/useLanguage';

interface PetEvolutionCardProps {
  state: PetEvolutionState | null;
  isLoading: boolean;
}

const MOOD_OVERLAY: Record<ReturnType<typeof petMoodFor>, { emoji: string; ring: string; bg: string }> = {
  happy:      { emoji: '😊', ring: 'ring-emerald-200', bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50' },
  neutral:    { emoji: '😐', ring: 'ring-amber-200',   bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50' },
  sad:        { emoji: '😟', ring: 'ring-rose-200',    bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50' },
  'very-sad': { emoji: '😢', ring: 'ring-rose-300',    bg: 'bg-gradient-to-br from-rose-100 via-rose-50 to-stone-50' },
};

const STRINGS: Record<'en' | 'he' | 'ar', {
  title: string;
  stages: Record<string, string>;
  daysActive: (n: number) => string;
  nextStageIn: (n: number, stage: string) => string;
  fullyGrown: string;
  daysSince: (n: number) => string;
  comeBack: string;
}> = {
  en: {
    title: 'Your companion',
    stages: { egg: 'Egg', baby: 'Baby', child: 'Child', teen: 'Teen', adult: 'Adult' },
    daysActive: n => `${n} active day${n === 1 ? '' : 's'}`,
    nextStageIn: (n, stage) => `${n} more day${n === 1 ? '' : 's'} → ${stage}`,
    fullyGrown: 'Fully grown! 🎉',
    daysSince: n => n === 1 ? 'Played yesterday' : `${n} days since last play`,
    comeBack: 'Come back soon — your companion is waiting!',
  },
  he: {
    title: 'החבר שלך',
    stages: { egg: 'ביצה', baby: 'תינוק', child: 'ילד', teen: 'נער', adult: 'בוגר' },
    daysActive: n => `${n} ${n === 1 ? 'יום' : 'ימים'} פעיל${n === 1 ? '' : 'ים'}`,
    nextStageIn: (n, stage) => `עוד ${n} ${n === 1 ? 'יום' : 'ימים'} → ${stage}`,
    fullyGrown: 'מבוגר במלואו! 🎉',
    daysSince: n => n === 1 ? 'שיחקת אתמול' : `${n} ימים מאז הפעם האחרונה`,
    comeBack: 'חזור בקרוב — החבר שלך מחכה!',
  },
  ar: {
    title: 'رفيقك',
    stages: { egg: 'بيضة', baby: 'صغير', child: 'طفل', teen: 'مراهق', adult: 'بالغ' },
    daysActive: n => `${n} ${n === 1 ? 'يوم' : 'أيام'} نشاط`,
    nextStageIn: (n, stage) => `${n} ${n === 1 ? 'يوم آخر' : 'أيام أخرى'} → ${stage}`,
    fullyGrown: 'بالغ تمامًا! 🎉',
    daysSince: n => n === 1 ? 'لعبت بالأمس' : `${n} أيام منذ آخر لعب`,
    comeBack: 'عد قريبًا — رفيقك ينتظرك!',
  },
};

export default function PetEvolutionCard({ state, isLoading }: PetEvolutionCardProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  if (isLoading || !state) {
    return (
      <div
        className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 sm:p-5 animate-pulse"
        style={{ minHeight: 160 }}
        dir={dir}
      >
        <div className="h-4 w-32 bg-white/60 rounded mb-3" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/40 rounded-full" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-white/40 rounded mb-2" />
            <div className="h-2 w-full bg-white/40 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const { activeDays, daysSinceLastActive } = state;
  const stage = petStageFor(activeDays);
  const mood = petMoodFor(daysSinceLastActive);
  const moodMeta = MOOD_OVERLAY[mood];

  // Days remaining in this stage's window (until next-stage threshold)
  const isAdult = stage.nextThreshold === Infinity;
  const daysToNext = isAdult ? 0 : Math.max(0, stage.nextThreshold - activeDays);
  const stageStart = stage.minDays;
  const stageSpan = isAdult ? 1 : stage.nextThreshold - stageStart;
  const stageProgress = isAdult
    ? 1
    : Math.min(1, Math.max(0, (activeDays - stageStart) / stageSpan));

  // Find the NEXT stage's label for the "X more days → Baby" copy.
  const stageIdx = PET_STAGES.findIndex(s => s.stage === stage.stage);
  const nextStage = PET_STAGES[stageIdx + 1];
  const nextStageLabel = nextStage ? t.stages[nextStage.stage] : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-3xl border border-white/80 shadow-sm ${moodMeta.bg} p-4 sm:p-5`}
      dir={dir}
    >
      <header className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-black text-stone-800 flex items-center gap-2">
          <span className="text-xl">🐾</span>
          {t.title}
        </h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 text-stone-700">
          {t.daysActive(activeDays)}
        </span>
      </header>

      <div className="flex items-center gap-4">
        {/* Big stage emoji with mood overlay in the bottom-right */}
        <div className="relative shrink-0">
          <motion.div
            key={stage.stage}
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/80 ring-4 ${moodMeta.ring} flex items-center justify-center text-5xl sm:text-6xl shadow-md`}
            aria-label={`${t.stages[stage.stage]} pet`}
          >
            {stage.emoji}
          </motion.div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow flex items-center justify-center text-base sm:text-lg" aria-hidden>
            {moodMeta.emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-black text-stone-900 mb-1">
            {t.stages[stage.stage]}
          </p>

          {/* Progress bar — fills as the student approaches the next
              stage's threshold.  Adults get a full bar with the
              "fully grown" label. */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 rounded-full bg-white/70 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stageProgress * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
              />
            </div>
          </div>
          <p className="text-xs font-bold text-stone-600 truncate">
            {isAdult ? t.fullyGrown : t.nextStageIn(daysToNext, nextStageLabel)}
          </p>
        </div>
      </div>

      {/* "Days since last play" nudge — only when the student has skipped
          a day or more.  Active players (last_active === today) never
          see this row, keeping the card celebratory for them. */}
      {daysSinceLastActive > 0 && (
        <div className="mt-3 pt-3 border-t border-white/70">
          <p className={`text-xs font-bold ${daysSinceLastActive >= 3 ? 'text-rose-700' : 'text-amber-700'}`}>
            {t.daysSince(daysSinceLastActive)}
            {daysSinceLastActive >= 3 && (
              <span className="block mt-0.5 text-stone-600 font-medium">{t.comeBack}</span>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}
