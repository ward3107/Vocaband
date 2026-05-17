/**
 * IdiomsBonusCard — student-dashboard entry point for the Idiom game.
 *
 * Idioms live OUTSIDE the assignment word pool — the game pulls from
 * a curated dataset in src/data/idioms.ts.  That means it doesn't
 * belong in the per-assignment mode picker (where every other mode
 * runs on the teacher's chosen words).  Surfaced here as a
 * "Bonus Practice" tile so students can discover figurative English
 * on their own without polluting assignment progress.
 *
 * Routes straight into the Idiom game (bypasses mode selection +
 * intro screen), mirroring the ReviewQueueCard / ClassMinuteCard
 * pattern.
 */
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import type { Language } from '../../hooks/useLanguage';

interface IdiomsBonusCardProps {
  onStart: () => void;
}

const STRINGS: Record<Language, {
  title: string;
  subtitle: string;
  badge: string;
  startCta: string;
}> = {
  en: {
    title: 'Idioms',
    subtitle: 'Discover what English phrases really mean — beyond their words.',
    badge: 'Bonus practice',
    startCta: 'Try an idiom',
  },
  he: {
    title: 'ביטויים',
    subtitle: 'גלה מה ביטויים באנגלית באמת אומרים — מעבר למילים.',
    badge: 'תרגול בונוס',
    startCta: 'נסה ביטוי',
  },
  ar: {
    title: 'التعابير',
    subtitle: 'اكتشف ما تعنيه التعابير الإنجليزية حقًا — وراء كلماتها.',
    badge: 'تدريب إضافي',
    startCta: 'جرّب تعبيرًا',
  },
  ru: {
    title: 'Idioms',
    subtitle: 'Discover what English phrases really mean — beyond their words.',
    badge: 'Bonus practice',
    startCta: 'Try an idiom',
  },
};

export default function IdiomsBonusCard({ onStart }: IdiomsBonusCardProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-white/80 shadow-sm bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 sm:p-5"
      dir={dir}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-sm shrink-0">
          <span className="text-xl" aria-hidden>💭</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black text-stone-800 mb-0.5 flex items-center gap-2 flex-wrap">
            {t.title}
            <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-sky-500 text-white inline-flex items-center gap-1">
              <Sparkles size={11} />
              {t.badge}
            </span>
          </h3>
          <p className="text-xs text-stone-600">{t.subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-sm sm:text-base shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        {t.startCta}
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}
