/**
 * Endgame summary parts — the score/rank banner and "words to practice"
 * list shared by the Quick Play endgame card and the Live Challenge
 * finish screen, so both live flows show the identical celebration.
 *
 * Purely presentational: the caller computes the standing (which differs
 * per flow — QP keys off a session clientId, Live off the Supabase uid)
 * and passes the words. Keeping the markup here means a tweak to either
 * piece lands in both places at once.
 */
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameFinishedT } from "../../locales/student/game-finished";

export interface EndgameStandingData {
  /** The student's score to celebrate. */
  xp: number;
  /** 1-based competition rank (ties share a place). */
  rank: number;
  /** How many students are on the board. */
  total: number;
}

/** Gradient "🎉 You scored X — Nth of M" banner. Renders nothing when the
 *  caller couldn't resolve a standing (e.g. leaderboard broadcast lost). */
export function EndgameStanding({ standing }: { standing: EndgameStandingData | null }) {
  const { language } = useLanguage();
  const tt = gameFinishedT[language];
  if (!standing) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
      className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white px-5 py-4 shadow-lg shadow-violet-500/20 text-center"
    >
      <p className="text-xl sm:text-2xl font-black">{tt.qpScoredXp(standing.xp)}</p>
      {standing.total > 1 && (
        <p className="text-sm font-bold text-white/85 mt-1">
          {tt.qpRankOf(standing.rank, standing.total)}
        </p>
      )}
    </motion.div>
  );
}

/** Up to N missed words with replay audio + the translation just played. */
export function EndgamePracticeWords({
  words,
  targetLanguage,
  isDark,
  speakWord,
}: {
  words: Word[];
  targetLanguage: "hebrew" | "arabic";
  isDark: boolean;
  speakWord: (wordId: number, fallbackText?: string) => void;
}) {
  const { language, isRTL } = useLanguage();
  const tt = gameFinishedT[language];
  if (words.length === 0) return null;

  // Russian-UI kids get the Russian column when a custom word carries one;
  // everyone else sees the translation they just played with.
  const translationFor = (w: Word) =>
    (language === "ru" && w.russian) ? w.russian
      : targetLanguage === "arabic" ? w.arabic : w.hebrew;

  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'border-gray-700 bg-gray-800/60' : 'border-rose-100 bg-rose-50/60'}`}>
      <p className={`text-xs font-black uppercase tracking-widest mb-3 ${isDark ? 'text-rose-300' : 'text-rose-500'}`}>
        {tt.wordsToPractice}
      </p>
      <ul className="flex flex-col gap-2">
        {words.map(w => (
          <li
            key={w.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isRTL ? 'flex-row-reverse' : ''} ${isDark ? 'bg-gray-900/60' : 'bg-white shadow-sm'}`}
          >
            <button
              onClick={() => speakWord(w.id, w.english)}
              type="button"
              aria-label={w.english}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className={`shrink-0 p-1.5 rounded-lg transition-colors ${isDark ? 'text-violet-300 hover:bg-gray-800' : 'text-violet-500 hover:bg-violet-50'}`}
            >
              <Volume2 size={16} />
            </button>
            {/* dir=ltr pins the English word's glyph order even in RTL UIs;
                row order still flips via flex-row-reverse. */}
            <span dir="ltr" className={`font-bold ${isDark ? 'text-white' : 'text-stone-800'}`}>{w.english}</span>
            <span className={`ms-auto font-semibold ${isDark ? 'text-gray-300' : 'text-stone-500'}`}>{translationFor(w)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shared cap on how many missed words we surface — small enough to act on. */
export const MAX_PRACTICE_WORDS = 5;
