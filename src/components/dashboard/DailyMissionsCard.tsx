/**
 * DailyMissionsCard — student-dashboard card showing today's three
 * daily missions with progress bars + XP rewards.
 *
 * Visual structure:
 *   - Header: emoji + "Daily missions" title + tiny "X/3 done" chip
 *   - Three mission rows:
 *       icon + title + progress bar + reward badge
 *       row dims + checkmark when completed
 *   - All-three-done celebration banner (still shown even though the
 *     all-missions bonus itself isn't paid in v1 — gives the student
 *     a visible "you nailed it" moment to chase)
 *
 * Localized in EN / HE / AR; RTL handled via dir on the root.
 *
 * Hidden gracefully when:
 *   - The hook hasn't fetched yet (loading skeleton)
 *   - The user isn't a real student (the parent decides — pass
 *     enabled:false to the hook and the card mounts empty)
 */
import { motion } from 'motion/react';
import { Target, Gamepad2, Trophy, CheckCircle2 } from 'lucide-react';
import type { DailyMission, DailyMissionType } from '../../hooks/useDailyMissions';
import { useLanguage } from '../../hooks/useLanguage';

interface DailyMissionsCardProps {
  missions: DailyMission[];
  isLoading: boolean;
}

interface MissionMeta {
  icon: React.ReactNode;
  /** Tailwind gradient for the leading icon tile. */
  iconBg: string;
  /** Tailwind gradient for the progress bar fill. */
  barGradient: string;
}

const META: Record<DailyMissionType, MissionMeta> = {
  master_words: {
    icon: <Target size={20} className="text-white" />,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    barGradient: 'from-emerald-400 to-teal-500',
  },
  play_modes: {
    icon: <Gamepad2 size={20} className="text-white" />,
    iconBg: 'bg-gradient-to-br from-indigo-400 to-purple-500',
    barGradient: 'from-indigo-400 to-purple-500',
  },
  beat_record: {
    icon: <Trophy size={20} className="text-white" />,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    barGradient: 'from-amber-400 to-orange-500',
  },
};

const STRINGS: Record<'en' | 'he' | 'ar', {
  title: string;
  doneChip: (n: number, total: number) => string;
  loading: string;
  allDone: string;
  missions: Record<DailyMissionType, { name: string; subtitle: string }>;
}> = {
  en: {
    title: "Today's missions",
    doneChip: (n, total) => `${n}/${total} done`,
    loading: 'Loading…',
    allDone: 'Awesome! All missions complete today 🎉',
    missions: {
      master_words: { name: 'Master 5 new words', subtitle: 'Answer 5 different words correctly' },
      play_modes:   { name: 'Play 3 game modes',  subtitle: 'Try 3 different modes today' },
      beat_record:  { name: 'Beat your record',   subtitle: 'Top your all-time best on any mode' },
    },
  },
  he: {
    title: 'משימות היום',
    doneChip: (n, total) => `${n}/${total} בוצעו`,
    loading: 'טוען…',
    allDone: 'מעולה! כל המשימות הושלמו היום 🎉',
    missions: {
      master_words: { name: 'שלוט ב-5 מילים חדשות', subtitle: 'ענה נכון על 5 מילים שונות' },
      play_modes:   { name: 'שחק ב-3 מצבי משחק',     subtitle: 'נסה 3 מצבים שונים היום' },
      beat_record:  { name: 'שבור את השיא שלך',      subtitle: 'עבור את הציון הגבוה ביותר במצב כלשהו' },
    },
  },
  ar: {
    title: 'مهام اليوم',
    doneChip: (n, total) => `${n}/${total} مكتملة`,
    loading: 'جارٍ التحميل…',
    allDone: 'رائع! اكتملت جميع المهام اليوم 🎉',
    missions: {
      master_words: { name: 'تعلّم 5 كلمات جديدة', subtitle: 'أجب بشكل صحيح على 5 كلمات مختلفة' },
      play_modes:   { name: 'العب 3 أوضاع',          subtitle: 'جرّب 3 أوضاع مختلفة اليوم' },
      beat_record:  { name: 'حطّم رقمك القياسي',    subtitle: 'تخطى أفضل علامة لك في أي وضع' },
    },
  },
};

export default function DailyMissionsCard({ missions, isLoading }: DailyMissionsCardProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  // Always render the card frame (consistent dashboard layout) — empty
  // state is the loading skeleton.
  if (isLoading && missions.length === 0) {
    return (
      <div
        className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-5 animate-pulse"
        style={{ minHeight: 180 }}
        dir={dir}
      >
        <div className="h-4 w-32 bg-white/60 rounded mb-3" />
        <div className="space-y-3">
          <div className="h-12 bg-white/40 rounded-xl" />
          <div className="h-12 bg-white/40 rounded-xl" />
          <div className="h-12 bg-white/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (missions.length === 0) return null;

  // Order the rows deterministically so the card layout doesn't jump
  // around when missions complete in different orders.
  const ORDER: DailyMissionType[] = ['master_words', 'play_modes', 'beat_record'];
  const ordered = ORDER
    .map(type => missions.find(m => m.mission_type === type))
    .filter((m): m is DailyMission => Boolean(m));

  const completedCount = ordered.filter(m => m.completed).length;
  const allDone = completedCount === ordered.length && ordered.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-5"
      dir={dir}
    >
      <header className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-black text-stone-800 flex items-center gap-2">
          <span className="text-xl">🎯</span>
          {t.title}
        </h3>
        <span
          className={`text-xs font-black px-2.5 py-1 rounded-full ${
            allDone ? 'bg-emerald-500 text-white' : 'bg-white/70 text-stone-700'
          }`}
        >
          {t.doneChip(completedCount, ordered.length)}
        </span>
      </header>

      <div className="space-y-2.5">
        {ordered.map(m => {
          const meta = META[m.mission_type];
          const copy = t.missions[m.mission_type];
          const pct = m.target > 0 ? Math.min(100, (m.progress / m.target) * 100) : 0;
          return (
            <div
              key={m.mission_type}
              className={`bg-white rounded-2xl p-3 flex items-center gap-3 transition-all ${
                m.completed ? 'opacity-90' : ''
              }`}
            >
              {/* Icon tile — checkmark replaces the icon when complete. */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0 shadow-sm`}
              >
                {m.completed ? <CheckCircle2 size={20} className="text-white" /> : meta.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`text-sm font-bold leading-snug truncate ${m.completed ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                    {copy.name}
                  </p>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                      m.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    +{m.xp_reward} XP
                  </span>
                </div>
                {/* Progress bar — also functions as a label proxy for the
                    subtitle; we show the X/Y count alongside it instead
                    of the verbose "Answer 5 different words correctly"
                    so the row reads compact on mobile. */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full bg-gradient-to-r ${meta.barGradient}`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-stone-500 tabular-nums whitespace-nowrap">
                    {Math.min(m.progress, m.target)}/{m.target}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-xs sm:text-sm font-black text-emerald-700"
        >
          {t.allDone}
        </motion.p>
      )}
    </motion.div>
  );
}
