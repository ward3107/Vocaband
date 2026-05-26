import { useMemo } from "react";
import { motion } from "motion/react";
import { Zap, Flame, BookOpenCheck, Trophy } from "lucide-react";
import type { AssignmentData, ProgressData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

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
  const { language } = useLanguage();
  const t = studentDashboardT[language];
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
      {/* ── TODAY card — XP earned today + current streak ─────────────
          Compacted: smaller medallion (28→20), tighter padding, smaller
          headline (text-5xl→text-3xl), sub-stat inlined with headline
          instead of stacked.  Same metrics, roughly ⅔ the height. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-md shadow-orange-500/20"
      >
        <div className="absolute -top-6 -end-6 w-20 h-20 rounded-full bg-white/15 flex items-center justify-center text-5xl select-none pointer-events-none">
          ☀️
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={14} className="text-amber-100" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{t.today}</span>
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none">+{xpToday}</span>
            <span className="text-xs font-bold opacity-90">{t.xpEarnedToday}</span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-bold">
            <Flame size={12} className="text-amber-100 fill-amber-100" />
            {streak > 0 ? t.dayStreak(streak) : t.startYourStreak}
          </div>
        </div>
      </motion.div>

      {/* ── PROGRESS card — same compaction recipe as TODAY ─────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-white shadow-md shadow-teal-500/20"
      >
        <div className="absolute -top-6 -end-6 w-20 h-20 rounded-full bg-white/15 flex items-center justify-center text-5xl select-none pointer-events-none">
          🎯
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpenCheck size={14} className="text-emerald-50" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{t.progress}</span>
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none">{wordsMastered}</span>
            <span className="text-xs font-bold opacity-90">{t.wordsMastered(wordsMastered)}</span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-bold">
            <Trophy size={12} className="text-amber-200" />
            {t.assignmentsDone(assignmentsCompleted)}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
