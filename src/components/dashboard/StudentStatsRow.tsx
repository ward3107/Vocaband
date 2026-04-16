import { useMemo } from "react";
import { motion } from "motion/react";
import { Zap, Flame, BookOpenCheck, TrendingUp } from "lucide-react";
import type { AssignmentData, ProgressData } from "../../core/supabase";

interface StudentStatsRowProps {
  xp: number;
  streak: number;
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
}

/**
 * Four mini cards giving the student their at-a-glance gamified stats.
 * These sit right under the greeting hero and replace the old
 * Amber-XP/Purple-Title/Orange-Streak pill cluster.
 *
 * XP Today is approximated from today's attempts × score (each attempt
 * score maps roughly to XP earned). Not perfect — we don't log an
 * xp_history table yet — but directionally correct and fast.
 */
export default function StudentStatsRow({
  xp, streak, studentAssignments, studentProgress,
}: StudentStatsRowProps) {
  void xp; // reserved for future per-session XP delta; currently uses derived `xpToday`
  const { xpToday, wordsMastered, assignmentsCompleted } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Approximate "XP today" — sum of scores from attempts completed today.
    // Scores are in 0-100-ish range, XP is typically a fraction. Keep it
    // simple: count attempts today × 10 as an "XP earned today" proxy.
    const attemptsToday = studentProgress.filter(p => {
      try {
        return new Date(p.completedAt).getTime() >= today.getTime();
      } catch { return false; }
    });
    const xpTodayApprox = attemptsToday.reduce((sum, p) => sum + Math.round((p.score || 0) / 10), 0);

    // Words mastered — derived proxy until the word_attempts migration is
    // wired into a mastery hook. For now we count unique words that appear
    // in completed assignments and are NOT in any mistakes list.
    const allAssignmentWordIds = new Set<number>();
    studentAssignments.forEach(a => (a.wordIds || []).forEach(id => allAssignmentWordIds.add(id)));

    const missedSet = new Set<number>();
    studentProgress.forEach(p => (p.mistakes || []).forEach(id => missedSet.add(id)));

    const mastered = Array.from(allAssignmentWordIds).filter(id => !missedSet.has(id)).length;

    // Assignments 100% complete — all allowed modes played.
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

  const stats = [
    {
      label: "XP Today",
      value: `+${xpToday}`,
      icon: <Zap size={18} className="text-amber-600" />,
      bg: "bg-gradient-to-br from-amber-50 to-orange-50",
      border: "border-amber-200",
      accent: "text-amber-700",
    },
    {
      label: "Words Mastered",
      value: wordsMastered,
      icon: <BookOpenCheck size={18} className="text-emerald-600" />,
      bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
      border: "border-emerald-200",
      accent: "text-emerald-700",
    },
    {
      label: "Streak",
      value: streak > 0 ? `${streak}d` : "0",
      icon: <Flame size={18} className="text-rose-500 fill-rose-500" />,
      bg: "bg-gradient-to-br from-rose-50 to-pink-50",
      border: "border-rose-200",
      accent: "text-rose-700",
    },
    {
      label: "Completed",
      value: assignmentsCompleted,
      icon: <TrendingUp size={18} className="text-indigo-600" />,
      bg: "bg-gradient-to-br from-indigo-50 to-violet-50",
      border: "border-indigo-200",
      accent: "text-indigo-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
          className={`${stat.bg} ${stat.border} border rounded-2xl p-3 sm:p-4`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {stat.icon}
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${stat.accent}`}>
              {stat.label}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black ${stat.accent} tabular-nums`}>
            {stat.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
