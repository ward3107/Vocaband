/**
 * ClassMinuteCard — student-dashboard surface for the 60-second daily
 * drill ("Class Minute").
 *
 * Pulls from the SRS due queue first, falls back to assignment words.
 * Each student plays once per day; the card flips to a "done — see
 * you tomorrow" state once today's row is in `studentProgress`.
 *
 * Three states:
 *   - Loading (skeleton)
 *   - Done today: emerald checkmark + streak label
 *   - Ready: amber gradient + "Start your minute" CTA
 *
 * Localized in EN / HE / AR; RTL via `dir` on the root.
 */
import { motion } from 'motion/react';
import { Timer, ArrowRight, CheckCircle2, Flame } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface ClassMinuteCardProps {
  /** True once today's class-minute progress row has been detected. */
  doneToday: boolean;
  /** Consecutive-day streak across class-minute completions.  0 hides
   *  the streak chip; 1+ shows it on both states. */
  streak: number;
  isLoading: boolean;
  onStart: () => void;
}

const STRINGS: Record<'en' | 'he' | 'ar', {
  title: string;
  subtitle: string;
  loading: string;
  doneHeadline: string;
  doneSubtitle: string;
  startCta: string;
  streakChip: (n: number) => string;
}> = {
  en: {
    title: 'Class Minute',
    subtitle: '60 seconds. Today\'s words. Beat your streak.',
    loading: 'Loading…',
    doneHeadline: 'Done for today!',
    doneSubtitle: 'Come back tomorrow to keep the streak alive.',
    startCta: 'Start your minute',
    streakChip: n => `${n}-day streak`,
  },
  he: {
    title: 'דקת כיתה',
    subtitle: '60 שניות. המילים של היום. שבור את הרצף שלך.',
    loading: 'טוען…',
    doneHeadline: 'סיימת להיום!',
    doneSubtitle: 'חזור מחר כדי להמשיך את הרצף.',
    startCta: 'התחל את הדקה שלך',
    streakChip: n => `רצף של ${n} ימים`,
  },
  ar: {
    title: 'دقيقة الصف',
    subtitle: '60 ثانية. كلمات اليوم. تخطَّ سلسلتك.',
    loading: 'جارٍ التحميل…',
    doneHeadline: 'انتهيت لليوم!',
    doneSubtitle: 'عُد غدًا للحفاظ على السلسلة.',
    startCta: 'ابدأ دقيقتك',
    streakChip: n => `سلسلة ${n} أيام`,
  },
};

export default function ClassMinuteCard({
  doneToday,
  streak,
  isLoading,
  onStart,
}: ClassMinuteCardProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  if (isLoading) {
    return (
      <div
        className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-5 animate-pulse"
        style={{ minHeight: 120 }}
        dir={dir}
      >
        <div className="h-4 w-32 bg-white/60 rounded mb-3" />
        <div className="h-3 w-48 bg-white/40 rounded mb-2" />
        <div className="h-10 w-32 bg-white/40 rounded-xl" />
      </div>
    );
  }

  if (doneToday) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 sm:p-5"
        dir={dir}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
            <CheckCircle2 size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-black text-stone-800 mb-0.5 flex items-center gap-2 flex-wrap">
              {t.title}
              {streak > 0 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-white inline-flex items-center gap-1">
                  <Flame size={12} />
                  {t.streakChip(streak)}
                </span>
              )}
            </h3>
            <p className="text-sm font-bold text-emerald-700">{t.doneHeadline}</p>
            <p className="text-xs text-stone-600 mt-0.5">{t.doneSubtitle}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-5"
      dir={dir}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm shrink-0">
          <Timer size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black text-stone-800 mb-0.5 flex items-center gap-2 flex-wrap">
            {t.title}
            {streak > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-white inline-flex items-center gap-1">
                <Flame size={12} />
                {t.streakChip(streak)}
              </span>
            )}
          </h3>
          <p className="text-xs text-stone-600">{t.subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm sm:text-base shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        {t.startCta}
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}
