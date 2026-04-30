import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, ChevronRight } from "lucide-react";
import { supabase } from "../../core/supabase";
import type { View } from "../../core/views";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface LeaderboardTeaserProps {
  classCode: string | undefined;
  currentStudentUid: string;
  currentXp: number;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

interface ClassmateRow {
  uid: string;
  displayName: string;
  avatar: string | null;
  xp: number;
}

/**
 * A compact "how am I doing" card that shows:
 *  - The student's rank in their class by XP
 *  - Who's just above them (to beat) OR a podium if they're #1
 * Tap → opens the full global leaderboard.
 *
 * Fetches once on mount; if the fetch fails (RLS, no classmates), we
 * render nothing so the dashboard still looks clean.
 */
export default function LeaderboardTeaser({
  classCode, currentStudentUid, currentXp, setView,
}: LeaderboardTeaserProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  const [rows, setRows] = useState<ClassmateRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!classCode) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('uid, display_name, avatar, xp')
          .eq('class_code', classCode)
          .eq('role', 'student');
        if (cancelled) return;
        if (error || !data) { setLoaded(true); return; }
        const mapped: ClassmateRow[] = data
          .map(r => ({
            uid: r.uid,
            displayName: r.display_name || 'Student',
            avatar: r.avatar,
            xp: r.xp ?? 0,
          }))
          .sort((a, b) => b.xp - a.xp);
        setRows(mapped);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [classCode]);

  if (!loaded || rows.length < 2) return null;

  const myIndex = rows.findIndex(r => r.uid === currentStudentUid);
  const myRank = myIndex >= 0 ? myIndex + 1 : rows.length;
  const ahead = myIndex > 0 ? rows[myIndex - 1] : null;
  const gap = ahead ? Math.max(0, ahead.xp - currentXp) : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setView('global-leaderboard')}
      type="button"
      style={{ touchAction: 'manipulation' }}
      className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 active:scale-[0.99] transition-all p-4 sm:p-5 mb-6 text-left flex items-center gap-3 sm:gap-4"
    >
      {/* Rank badge */}
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
        myRank === 1
          ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
          : myRank === 2
          ? 'bg-gradient-to-br from-stone-300 to-stone-400'
          : myRank === 3
          ? 'bg-gradient-to-br from-orange-400 to-amber-600'
          : 'bg-gradient-to-br from-indigo-500 to-violet-600'
      }`}>
        <span className="text-xl sm:text-2xl font-black text-white tabular-nums">#{myRank}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TrendingUp size={12} className="text-indigo-500" />
          <span className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest">{t.classRank}</span>
        </div>
        <p className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
          {myRank === 1
            ? t.topOfClass
            : ahead
              ? (gap > 0 ? t.xpBehind(gap, ahead.displayName) : t.tiedWith(ahead.displayName))
              : t.keepClimbing}
        </p>
      </div>

      <ChevronRight size={20} className="text-stone-300 shrink-0" />
    </motion.button>
  );
}
