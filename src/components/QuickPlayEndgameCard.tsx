/**
 * QuickPlayEndgameCard — the Quick Play guest "what now?" panel on the
 * game-finished screen (docs/open-issues.md → QP UX findings → D).
 *
 * Replaces the bare two-button stack with:
 *   1. "🎉 You scored 240 XP — 3rd of 24 students" — score + rank read
 *      from the live session leaderboard already in the client, so no
 *      network round-trip.  The banner is skipped (not faked) when the
 *      student's entry can't be found, e.g. leaderboard broadcast lost.
 *   2. "Words to practice 📚" — up to 5 words missed this round, with
 *      the translation the student was actually playing with.
 *   3. Play again (primary) + Back to home (quiet link).
 *
 * Rank uses competition ranking (ties share a place) so two kids with
 * the same score never argue about who's "really" 3rd.
 */
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Home, RotateCcw, Volume2 } from "lucide-react";
import type { QpStudentEntry } from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import { readStoredClientId } from "../hooks/useQuickPlaySocket";
import { useLanguage } from "../hooks/useLanguage";
import { gameFinishedT } from "../locales/student/game-finished";
import { celebrate } from "../utils/celebrate";

const MAX_PRACTICE_WORDS = 5;

interface QuickPlayEndgameCardProps {
  /** Merged session leaderboard from the /quick-play socket. */
  leaderboard: QpStudentEntry[];
  /** Word ids the student got wrong this round. */
  mistakes: number[];
  gameWords: Word[];
  /** Translation column the student played with this round. */
  targetLanguage: "hebrew" | "arabic";
  isDark: boolean;
  /** Disable actions while the final score emit is in flight. */
  disabled: boolean;
  /** Replay a word's audio — same speaker used in-game. */
  speakWord: (wordId: number, fallbackText?: string) => void;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

export default function QuickPlayEndgameCard({
  leaderboard, mistakes, gameWords, targetLanguage,
  isDark, disabled, speakWord, onPlayAgain, onBackToHome,
}: QuickPlayEndgameCardProps) {
  const { language, isRTL } = useLanguage();
  const tt = gameFinishedT[language];

  // Score + rank from the leaderboard snapshot.  Matching by the
  // sessionStorage clientId (not a hook instance's state) — the two
  // useQuickPlaySocket instances can hold different ids after a join,
  // but sessionStorage is the value the server actually keyed us under.
  const standing = useMemo(() => {
    const myId = readStoredClientId();
    const me = myId ? leaderboard.find(e => e.clientId === myId) : undefined;
    if (!me) return null;
    const rank = 1 + leaderboard.filter(e => e.score > me.score).length;
    return { xp: me.score, rank, total: leaderboard.length };
  }, [leaderboard]);

  const practiceWords = useMemo(
    () => gameWords.filter(w => mistakes.includes(w.id)).slice(0, MAX_PRACTICE_WORDS),
    [gameWords, mistakes],
  );

  // Russian-UI kids get the Russian column when a custom word carries
  // one; everyone else sees the translation they just played with.
  const translationFor = (w: Word) =>
    (language === "ru" && w.russian) ? w.russian
      : targetLanguage === "arabic" ? w.arabic : w.hebrew;

  // One celebratory burst on mount — QP guests skip the assignment
  // save path where celebrate() normally fires, so without this the
  // QP finish felt flatter than the regular one.
  useEffect(() => { celebrate("big"); }, []);

  return (
    <div className="flex flex-col gap-3">
      {standing && (
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
      )}

      {practiceWords.length > 0 && (
        <div className={`rounded-2xl border p-4 ${isDark ? 'border-gray-700 bg-gray-800/60' : 'border-rose-100 bg-rose-50/60'}`}>
          <p className={`text-xs font-black uppercase tracking-widest mb-3 ${isDark ? 'text-rose-300' : 'text-rose-500'}`}>
            {tt.wordsToPractice}
          </p>
          <ul className="flex flex-col gap-2">
            {practiceWords.map(w => (
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
                {/* dir=ltr pins the English word's glyph order even in
                    RTL UIs; row order still flips via flex-row-reverse. */}
                <span dir="ltr" className={`font-bold ${isDark ? 'text-white' : 'text-stone-800'}`}>{w.english}</span>
                <span className={`ms-auto font-semibold ${isDark ? 'text-gray-300' : 'text-stone-500'}`}>{translationFor(w)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onPlayAgain}
        disabled={disabled}
        type="button"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white px-6 py-5 rounded-xl font-black text-xl shadow-lg shadow-violet-500/20 hover:shadow-xl transition-all disabled:opacity-50"
      >
        <RotateCcw size={22} />
        {tt.playAgain}
      </motion.button>

      <button
        onClick={onBackToHome}
        disabled={disabled}
        type="button"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'}`}
      >
        <Home size={12} />
        {tt.backToHome}
      </button>
    </div>
  );
}
