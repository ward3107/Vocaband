import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, CheckCircle2, Target } from "lucide-react";
import type { ProgressData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { ARCADE_CARD, ARCADE_REWARD_GRADIENT } from "../arcade/theme";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface DailyGoalBannerProps {
  studentProgress: ProgressData[];
  /** How many games must be played today to hit the goal. */
  goal?: number;
  /** When provided, the pending banner becomes tappable.  The handler
   *  should launch the same target as NextUpCard so the banner's copy
   *  ("1 more to go!") stops feeling like dead information.  The hit
   *  state never wires this — they already did it. */
  onPlay?: () => void;
}

/**
 * A Duolingo-style daily-goal nudge that shows under the stats row.
 * - Counts how many games the student has completed since midnight.
 * - Shows a progress bar + flame that glows brighter as they get closer.
 * - Morphs into a green "Goal hit!" card once they reach the target.
 *
 * The goal uses *today's* completed attempts (using completedAt) and
 * doesn't double-count replays of the same mode — a single attempt row
 * per (mode, assignment) is what `progress` already gives us, so we can
 * trust raw count.
 */
export default function DailyGoalBanner({ studentProgress, goal = 1, onPlay }: DailyGoalBannerProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  // Arcade theme: gold reward banner when the goal is hit, frosted
  // encouragement card while it's pending. Falls back to the existing
  // styling when off.
  const arcade = useFeatureFlag('arcade_hub', false);
  const { playedToday, pct, hit } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = today.getTime();
    const count = studentProgress.filter(p => {
      try { return new Date(p.completedAt).getTime() >= cutoff; } catch { return false; }
    }).length;
    const percent = Math.min(100, Math.round((count / Math.max(1, goal)) * 100));
    return { playedToday: count, pct: percent, hit: count >= goal };
  }, [studentProgress, goal]);

  return (
    <AnimatePresence mode="wait">
      {hit ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className={
            arcade
              ? `relative overflow-hidden rounded-xl mb-6 p-4 sm:p-5 ${ARCADE_REWARD_GRADIENT} ring-2 ring-amber-300/40 shadow-lg shadow-amber-900/40`
              : "relative overflow-hidden rounded-xl mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 p-4 sm:p-5 shadow-md shadow-emerald-500/20"
          }
        >
          <div className="pointer-events-none absolute -top-10 -end-10 w-40 h-40 bg-yellow-300/30 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 ${arcade ? "bg-white/30 backdrop-blur" : "bg-white/20 backdrop-blur-sm border border-white/30"}`}>
              <CheckCircle2 size={22} className={arcade ? "text-amber-950" : "text-white"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs uppercase tracking-widest ${arcade ? "text-amber-950 font-extrabold" : "font-bold text-white/80"}`}>{t.dailyGoal}</p>
              <h3 className={`text-base sm:text-lg leading-tight ${arcade ? "text-amber-950 font-extrabold" : "font-black text-white"}`}>
                {t.youDidIt(10)}
              </h3>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="pending"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          whileHover={onPlay ? { scale: 1.005 } : undefined}
          whileTap={onPlay ? { scale: 0.99 } : undefined}
          onClick={onPlay}
          role={onPlay ? "button" : undefined}
          tabIndex={onPlay ? 0 : undefined}
          onKeyDown={onPlay ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(); } } : undefined}
          style={{
            ...(arcade
              ? {}
              : {
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
                }),
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            cursor: onPlay ? 'pointer' : undefined,
          }}
          className={
            arcade
              ? `relative overflow-hidden mb-6 p-4 sm:p-5 ${ARCADE_CARD} transition-shadow hover:shadow-md`
              : "relative overflow-hidden rounded-2xl mb-6 p-4 sm:p-5 bg-white border border-indigo-500/[0.10] transition-shadow hover:shadow-md"
          }
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Flame glows as they approach the goal — v1 amber/coral
                gradient when active, frosted indigo tile when idle */}
            <motion.div
              animate={{ scale: pct > 0 ? [1, 1.08, 1] : 1 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center shrink-0"
              style={
                pct >= 50
                  ? {
                      background: "linear-gradient(135deg, #F0B96C, #F08D87)",
                      boxShadow: "0 8px 18px -10px rgba(240,141,135,0.55)",
                    }
                  : arcade
                    ? { background: "rgba(255,255,255,0.15)" }
                    : { background: "linear-gradient(135deg, #EEF0FF, #F8E8FF)" }
              }
            >
              {pct >= 50 ? (
                <Flame size={22} className="text-white fill-white" />
              ) : (
                <Target size={22} className={arcade ? "text-white" : "text-[#8B5CF6]"} />
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <p className={`text-[11px] font-extrabold uppercase tracking-[0.12em] ${arcade ? "text-white/70" : "text-[#6B6388]"}`}>
                  {t.dailyGoal}
                </p>
                <span
                  className="text-[11px] font-extrabold tabular-nums"
                  style={{ color: arcade ? "#fff" : "#4A3B7A", fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                >
                  {playedToday} / {goal}
                </span>
              </div>
              {/* Bar — repainted with the brand-violet glow recipe used
                  by every other v1 progress fill in the redesign. */}
              <div
                className="w-full h-2.5 rounded-full overflow-hidden"
                style={{ background: arcade ? "rgba(255,255,255,0.15)" : "rgba(99,102,241,0.10)" }}
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: pct / 100 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{
                    transformOrigin: "left",
                    background:
                      "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
                    boxShadow: "0 0 12px rgba(139,92,246,0.45)",
                  }}
                  className="h-full w-full rounded-full"
                />
              </div>
              <p className="text-xs sm:text-sm font-semibold mt-1.5" style={{ color: arcade ? "#fff" : "#4A3B7A" }}>
                {playedToday === 0 ? t.playGameForBonus(10) : t.almostThere(goal - playedToday)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
