import { useMemo } from "react";
import { motion } from "motion/react";
import { Zap, Flame, BookOpenCheck, Trophy } from "lucide-react";
import type { AssignmentData, ProgressData } from "../../core/supabase";

interface StudentStatsRowProps {
  xp: number;
  streak: number;
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
}

/**
 * Two big hero cards giving the student their at-a-glance stats.
 *
 * Replaces the previous 4-tile grid (XP / Words / Streak / Completed)
 * which read as cramped tabs that didn't fit the "big cards over lists"
 * design language used elsewhere in the dashboard.
 *
 * Grouping rationale:
 *   - **TODAY** card combines the two TIME-based metrics (XP today,
 *     streak in days) — both speak to "what you're doing right now".
 *   - **PROGRESS** card combines the two ACHIEVEMENT metrics (words
 *     mastered, assignments completed) — both speak to "what you've
 *     accomplished overall".
 *
 * Same data sources as before; only the visual hierarchy changed.
 * Calculations are intentionally identical (no data drift between the
 * two layouts).
 */
export default function StudentStatsRow({
  xp, streak, studentAssignments, studentProgress,
}: StudentStatsRowProps) {
  void xp; // reserved for future per-session XP delta; currently uses derived `xpToday`
  const { xpToday, wordsMastered, assignmentsCompleted } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attemptsToday = studentProgress.filter(p => {
      try {
        return new Date(p.completedAt).getTime() >= today.getTime();
      } catch { return false; }
    });
    const xpTodayApprox = attemptsToday.reduce((sum, p) => sum + Math.round((p.score || 0) / 10), 0);

    const allAssignmentWordIds = new Set<number>();
    studentAssignments.forEach(a => (a.wordIds || []).forEach(id => allAssignmentWordIds.add(id)));

    const missedSet = new Set<number>();
    studentProgress.forEach(p => (p.mistakes || []).forEach(id => missedSet.add(id)));

    const mastered = Array.from(allAssignmentWordIds).filter(id => !missedSet.has(id)).length;

    const DEFAULT_MODES = 8;
    const completedCount = studentAssignments.filter(a => {
      const allowed = (a.allowedModes || []).filter(m => m !== 'flashcards');
      const total = allowed.length || DEFAULT_MODES - 1;
      const done = new Set(
        studentProgress.filter(p => p.assignmentId === a.id && p.mode !== 'flashcards').map(p => p.mode),
      ).size;
      return done >= total;
    }).length;

    return { xpToday: xpTodayApprox, wordsMastered: mastered, assignmentsCompleted: completedCount };
  }, [studentProgress, studentAssignments]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
      {/* ── TODAY card — XP earned today + current streak ───────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-lg shadow-orange-500/20"
      >
        {/* Decorative emoji medallion */}
        <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-white/15 flex items-center justify-center text-7xl select-none pointer-events-none">
          ☀️
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={16} className="text-amber-100" />
            <span className="text-[11px] font-black uppercase tracking-widest opacity-90">Today</span>
          </div>

          {/* Headline: XP earned today */}
          <div className="text-4xl sm:text-5xl font-black tabular-nums leading-none">
            +{xpToday}
          </div>
          <div className="mt-1 text-xs sm:text-sm font-bold opacity-90">
            XP earned today
          </div>

          {/* Sub-stat: current streak */}
          <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs sm:text-sm font-bold">
            <Flame size={14} className="text-amber-100 fill-amber-100" />
            {streak > 0 ? `${streak}-day streak` : 'Start your streak'}
          </div>
        </div>
      </motion.div>

      {/* ── PROGRESS card — Words mastered + assignments completed ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-500/20"
      >
        {/* Decorative emoji medallion */}
        <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-white/15 flex items-center justify-center text-7xl select-none pointer-events-none">
          🎯
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpenCheck size={16} className="text-emerald-50" />
            <span className="text-[11px] font-black uppercase tracking-widest opacity-90">Progress</span>
          </div>

          {/* Headline: words mastered */}
          <div className="text-4xl sm:text-5xl font-black tabular-nums leading-none">
            {wordsMastered}
          </div>
          <div className="mt-1 text-xs sm:text-sm font-bold opacity-90">
            {wordsMastered === 1 ? 'word mastered' : 'words mastered'}
          </div>

          {/* Sub-stat: assignments completed */}
          <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs sm:text-sm font-bold">
            <Trophy size={14} className="text-amber-200" />
            {assignmentsCompleted === 1
              ? '1 assignment done'
              : `${assignmentsCompleted} assignments done`}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
