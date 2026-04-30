import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, CheckCircle2, Target } from "lucide-react";
import type { ProgressData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface DailyGoalBannerProps {
  studentProgress: ProgressData[];
  /** How many games must be played today to hit the goal. */
  goal?: number;
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
export default function DailyGoalBanner({ studentProgress, goal = 1 }: DailyGoalBannerProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
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
          className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 p-4 sm:p-5 shadow-md shadow-emerald-500/20"
        >
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-yellow-300/30 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{t.dailyGoal}</p>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
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
          className="relative overflow-hidden rounded-2xl mb-6 bg-white border border-stone-200 shadow-sm p-4 sm:p-5"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Flame glows as they approach the goal */}
            <motion.div
              animate={{ scale: pct > 0 ? [1, 1.08, 1] : 1 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                pct >= 50 ? "bg-gradient-to-br from-orange-400 to-rose-500" : "bg-stone-100"
              }`}
            >
              {pct >= 50 ? (
                <Flame size={22} className="text-white fill-white" />
              ) : (
                <Target size={22} className="text-stone-400" />
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{t.dailyGoal}</p>
                <span className="text-xs font-bold text-stone-500 tabular-nums">
                  {playedToday} / {goal}
                </span>
              </div>
              {/* Bar */}
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full"
                />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-stone-700 mt-1.5">
                {playedToday === 0 ? t.playGameForBonus(10) : t.almostThere(goal - playedToday)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
