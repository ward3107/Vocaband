/**
 * AnswerStreakBadge — 🔥 in-a-row counter that appears at 3 consecutive
 * correct answers and visibly heats up at 3 / 5 / 10 (open-issues §C).
 * Driven by useAnswerStreak; resets to hidden on any wrong answer.
 *
 * Tier styling mirrors GameHeader's daily-streak chip grammar (same
 * gradients + glow steps) so the two flames read as one visual family,
 * but this one tracks answers-in-a-row within the current round.
 *
 * RTL-safe: the 🔥+number pair is pinned LTR as one atom so the flame
 * always leads the count; the "in a row" text follows the UI language
 * direction naturally inside the flex row.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";

type Tier = "warm" | "hot" | "blazing";

const tierOf = (count: number): Tier | null => {
  if (count >= 10) return "blazing";
  if (count >= 5) return "hot";
  if (count >= 3) return "warm";
  return null;
};

// Scale steps grow the whole chip at each milestone so the run feels
// hotter without any explanatory text.
const TIER_STYLES: Record<Tier, { chip: string; glow: string; scale: number; emoji: string }> = {
  warm:    { chip: "bg-gradient-to-r from-amber-100 to-orange-200 text-orange-700",            glow: "shadow-md shadow-orange-400/40", scale: 1,    emoji: "🔥" },
  hot:     { chip: "bg-gradient-to-r from-orange-200 via-orange-300 to-red-200 text-red-700",  glow: "shadow-lg shadow-orange-500/60", scale: 1.08, emoji: "🔥🔥" },
  blazing: { chip: "bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 text-white",     glow: "shadow-xl shadow-red-500/70",    scale: 1.16, emoji: "🔥⚡" },
};

export default function AnswerStreakBadge({ count }: { count: number }) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const reduceMotion = useReducedMotion();
  const tier = tierOf(count);

  return (
    <AnimatePresence>
      {tier && (
        <motion.div
          // Remount on tier change so the spring pop re-fires exactly
          // at the 3 / 5 / 10 milestones, not on every count tick.
          key={tier}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: reduceMotion ? 1 : TIER_STYLES[tier].scale }}
          exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          style={{ transformOrigin: "center" }}
          className={`shrink-0 px-3 py-1.5 rounded-full flex items-center gap-1.5 ${TIER_STYLES[tier].chip} ${TIER_STYLES[tier].glow}`}
          role="status"
        >
          <span className="font-black text-xs sm:text-sm whitespace-nowrap" dir="ltr" aria-hidden>
            {TIER_STYLES[tier].emoji} {count}
          </span>
          <span className="font-bold text-[10px] sm:text-xs whitespace-nowrap">
            {t.streakInARow(count)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
