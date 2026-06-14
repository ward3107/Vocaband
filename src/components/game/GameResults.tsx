/**
 * GameResults — the celebratory end-of-game screen for the live games.
 * Shown as an overlay when the teacher ends a game that has scores: a
 * winner spotlight, a top-3 podium, and "learning award" chips computed
 * from data the leaderboard already carries (top scorer + best streak).
 *
 * Frontend-only and game-agnostic: callers pass the final sorted roster
 * and an onBack handler. It owns its own en/he/ar copy (like the other
 * live-game surfaces) so games don't each need new strings. Awards that
 * need per-answer accuracy (most improved / most accurate) are NOT shown
 * — the server keeps correctness private, so that's a later backend step.
 */
import { useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Flame, Star } from "lucide-react";
import QPAvatar from "../QPAvatar";
import { useLanguage } from "../../hooks/useLanguage";
import { celebrate } from "../../utils/celebrate";

export interface ResultEntry {
  clientId: string;
  nickname: string;
  avatar?: string;
  score: number;
  streak?: number;
  team?: "red" | "blue";
}

interface GameResultsProps {
  /** Final roster, sorted by score descending. */
  entries: ResultEntry[];
  /** Leaves to the dashboard (callers run the real endSession here). */
  onBack: () => void;
  /** Per-game hue, as a Tailwind gradient pair. */
  accent?: string;
}

const STRINGS = {
  en: { title: "Final results", wins: (n: string) => `${n} wins!`, topScorer: "Top scorer", bestStreak: "Best streak", noOne: "No scores yet", back: "Back to dashboard", points: "pts", streakUnit: "in a row", red: "Red", blue: "Blue", teamWins: (n: string) => `${n} team wins!`, teamTie: "It's a tie!" },
  he: { title: "תוצאות סופיות", wins: (n: string) => `${n} ניצח/ה!`, topScorer: "המוביל/ה", bestStreak: "הרצף הטוב ביותר", noOne: "אין עדיין ניקוד", back: "חזרה ללוח", points: "נק'", streakUnit: "ברצף", red: "אדום", blue: "כחול", teamWins: (n: string) => `קבוצת ${n} ניצחה!`, teamTie: "תיקו!" },
  ar: { title: "النتائج النهائية", wins: (n: string) => `فاز ${n}!`, topScorer: "المتصدّر", bestStreak: "أفضل سلسلة", noOne: "لا نقاط بعد", back: "العودة إلى اللوحة", points: "نقطة", streakUnit: "متتالية", red: "أحمر", blue: "أزرق", teamWins: (n: string) => `فاز فريق ${n}!`, teamTie: "تعادل!" },
} as const;

const MEDALS = ["🥇", "🥈", "🥉"];

export default function GameResults({ entries, onBack, accent = "from-fuchsia-500 to-pink-600" }: GameResultsProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const winner = entries[0];
  // Best streak across the room — only meaningful if someone has one.
  const streakLeader = entries.reduce<ResultEntry | null>(
    (best, e) => ((e.streak ?? 0) > (best?.streak ?? 0) ? e : best),
    null,
  );
  const top3 = entries.slice(0, 3);

  // Team mode: total each side and pick a winner (only when anyone's on a team).
  let redTotal = 0, blueTotal = 0, hasTeams = false;
  for (const e of entries) {
    if (e.team === "red") { redTotal += e.score; hasTeams = true; }
    else if (e.team === "blue") { blueTotal += e.score; hasTeams = true; }
  }
  const teamWinner: "red" | "blue" | "tie" | null = !hasTeams
    ? null
    : redTotal === blueTotal ? "tie" : redTotal > blueTotal ? "red" : "blue";

  // One celebratory burst on mount — this screen only appears at the end.
  useEffect(() => { if (winner) celebrate("big"); }, [winner]);

  return (
    <motion.div
      dir={dir}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-900/85 backdrop-blur-md px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl p-6 sm:p-8 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-amber-500 mb-4">
          <Trophy size={22} />
          <span className="text-sm font-black uppercase tracking-[0.2em]">{t.title}</span>
        </div>

        {/* Team banner — winning side first, with both totals. */}
        {teamWinner && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="text-lg sm:text-xl font-black text-stone-900">
              {teamWinner === "tie" ? `🤝 ${t.teamTie}` : teamWinner === "red" ? `🟥 ${t.teamWins(t.red)}` : `🟦 ${t.teamWins(t.blue)}`}
            </div>
            <div className="mt-1 flex items-center justify-center gap-3 font-black">
              <span className="text-rose-600">{t.red} {redTotal}</span>
              <span className="text-stone-300">·</span>
              <span className="text-sky-600">{blueTotal} {t.blue}</span>
            </div>
          </motion.div>
        )}

        {winner ? (
          <>
            {/* Winner spotlight */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
              className="flex flex-col items-center"
            >
              <div className={`flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${accent} text-white shadow-xl`}>
                <span className="flex items-center justify-center w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-full bg-white/90">
                  <QPAvatar value={winner.avatar || "🦊"} iconSize={48} className="text-fuchsia-600 text-5xl" />
                </span>
              </div>
              <div className="mt-3 text-2xl sm:text-3xl font-black text-stone-900">{t.wins(winner.nickname)}</div>
              <div className="text-lg font-black text-amber-600">{winner.score} {t.points}</div>
            </motion.div>

            {/* Top-3 podium chips */}
            <div className={`mt-6 flex items-stretch justify-center gap-2 sm:gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              {top3.map((e, i) => (
                <motion.div
                  key={e.clientId}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex-1 max-w-[150px] rounded-2xl border border-stone-200 bg-stone-50 p-3 flex flex-col items-center gap-1"
                >
                  <span className="text-2xl">{MEDALS[i]}</span>
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200">
                    <QPAvatar value={e.avatar || "🦊"} iconSize={22} className="text-fuchsia-600 text-xl" />
                  </span>
                  <span className="max-w-full truncate text-xs font-black text-stone-700">{e.nickname}</span>
                  <span className="text-sm font-black text-stone-500">{e.score}</span>
                </motion.div>
              ))}
            </div>

            {/* Award chips — only what the data supports */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-3 py-1.5 text-xs font-black">
                <Star size={14} /> {t.topScorer}: {winner.nickname}
              </span>
              {streakLeader && (streakLeader.streak ?? 0) > 1 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-black">
                  <Flame size={14} /> {t.bestStreak}: {streakLeader.nickname} ({streakLeader.streak} {t.streakUnit})
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="py-10 text-lg font-bold text-stone-400">{t.noOne}</p>
        )}

        <button
          type="button"
          onClick={onBack}
          style={{ touchAction: "manipulation" }}
          className={`mt-7 w-full sm:w-auto sm:px-10 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r ${accent} shadow-lg active:scale-[0.98] transition`}
        >
          {t.back}
        </button>
      </motion.div>
    </motion.div>
  );
}
