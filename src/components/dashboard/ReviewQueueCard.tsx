/**
 * ReviewQueueCard — student-dashboard surface for spaced repetition.
 *
 * Renders one of three states:
 *   - Loading (skeleton)
 *   - Empty queue: "No words due for review — keep playing!" (soft
 *     emerald palette, no CTA — just an OK status nudge)
 *   - Queue ready: count of due words + "Start review" CTA
 *
 * Tapping Start fires the parent-supplied onStart callback, which
 * loads the queue and routes the student into the Review game mode.
 *
 * Localized in EN / HE / AR; RTL via `dir` on the root.
 */
import { motion } from 'motion/react';
import { Brain, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface ReviewQueueCardProps {
  dueCount: number;
  isLoading: boolean;
  onStart: () => void;
}

const STRINGS: Record<'en' | 'he' | 'ar', {
  title: string;
  loading: string;
  empty: string;
  emptySubtitle: string;
  count: (n: number) => string;
  countSubtitle: string;
  startCta: string;
}> = {
  en: {
    title: 'Spaced review',
    loading: 'Checking your queue…',
    empty: 'All caught up!',
    emptySubtitle: 'No words to review right now. Keep playing to build the queue.',
    count: n => `${n} ${n === 1 ? 'word' : 'words'} due`,
    countSubtitle: 'Practice these now to lock them into memory.',
    startCta: 'Start review',
  },
  he: {
    title: 'חזרה מרווחת',
    loading: 'בודק את התור שלך…',
    empty: 'הכל מעודכן!',
    emptySubtitle: 'אין מילים לחזרה כרגע. המשך לשחק כדי לבנות את התור.',
    count: n => `${n} ${n === 1 ? 'מילה' : 'מילים'} לחזרה`,
    countSubtitle: 'תרגל אותן עכשיו כדי לקבע אותן בזיכרון.',
    startCta: 'התחל חזרה',
  },
  ar: {
    title: 'مراجعة متباعدة',
    loading: 'جارٍ التحقق من قائمتك…',
    empty: 'كل شيء محدث!',
    emptySubtitle: 'لا توجد كلمات للمراجعة الآن. واصل اللعب لبناء القائمة.',
    count: n => `${n} ${n === 1 ? 'كلمة' : 'كلمات'} مستحقة`,
    countSubtitle: 'تدرب عليها الآن لتثبتها في الذاكرة.',
    startCta: 'ابدأ المراجعة',
  },
};

export default function ReviewQueueCard({ dueCount, isLoading, onStart }: ReviewQueueCardProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  if (isLoading) {
    return (
      <div
        className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 sm:p-5 animate-pulse"
        style={{ minHeight: 120 }}
        dir={dir}
      >
        <div className="h-4 w-32 bg-white/60 rounded mb-3" />
        <div className="h-3 w-48 bg-white/40 rounded mb-2" />
        <div className="h-10 w-32 bg-white/40 rounded-xl" />
      </div>
    );
  }

  // Empty queue — soft "you're caught up" status, no CTA.  We still
  // render the card (rather than hiding entirely) so the dashboard
  // layout doesn't jump as the queue fills + drains.
  if (dueCount === 0) {
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
            <h3 className="text-sm sm:text-base font-black text-stone-800 mb-0.5">{t.title}</h3>
            <p className="text-sm font-bold text-emerald-700">{t.empty}</p>
            <p className="text-xs text-stone-600 mt-0.5">{t.emptySubtitle}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Queue ready — purple "review" palette, big CTA.
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 sm:p-5"
      dir={dir}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
          <Brain size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black text-stone-800 mb-0.5 flex items-center gap-2">
            {t.title}
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-violet-500 text-white">
              {t.count(dueCount)}
            </span>
          </h3>
          <p className="text-xs text-stone-600">{t.countSubtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-black text-sm sm:text-base shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        {t.startCta}
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}
