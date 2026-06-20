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
import { Home, RotateCcw } from "lucide-react";
import type { QpStudentEntry } from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import { readStoredClientId } from "../hooks/useQuickPlaySocket";
import { useLanguage } from "../hooks/useLanguage";
import { gameFinishedT } from "../locales/student/game-finished";
import { celebrate } from "../utils/celebrate";
import { EndgameStanding, EndgamePracticeWords, MAX_PRACTICE_WORDS } from "./endgame/EndgameParts";

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
  const { language, dir } = useLanguage();
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

  // One celebratory burst on mount — QP guests skip the assignment
  // save path where celebrate() normally fires, so without this the
  // QP finish felt flatter than the regular one.
  useEffect(() => { celebrate("big"); }, []);

  return (
    <div dir={dir} className="flex flex-col gap-3">
      <EndgameStanding standing={standing} />

      <EndgamePracticeWords
        words={practiceWords}
        targetLanguage={targetLanguage}
        isDark={isDark}
        speakWord={speakWord}
      />

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
