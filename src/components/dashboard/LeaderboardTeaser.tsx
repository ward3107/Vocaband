import { useEffect, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { motion } from "motion/react";
import { TrendingUp, ChevronRight } from "lucide-react";
import { supabase } from "../../core/supabase";
import type { View } from "../../core/views";
import { useLanguage } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { ARCADE_CARD } from "../arcade/theme";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface LeaderboardTeaserProps {
  classCode: string | undefined;
  currentStudentUid: string;
  currentXp: number;
  setView: Dispatch<SetStateAction<View>>;
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
  // Arcade theme: a frosted top-3 podium preview with a "You" row and
  // a pill CTA, instead of the compact single-row teaser. Falls back
  // to the existing teaser when off.
  const arcade = useFeatureFlag('arcade_hub', false);
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

  if (arcade) {
    const top3 = rows.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    const rankRow = [
      "bg-amber-400/30 ring-2 ring-amber-300/60",
      "bg-slate-300/20 ring-2 ring-slate-300/40",
      "bg-orange-700/30 ring-2 ring-orange-400/40",
    ];
    // Show a dedicated "You" row only when the student isn't already
    // on the podium above.
    const youOutsideTop3 = myIndex < 0 || myIndex >= 3;
    return (
      <div className={`w-full mb-6 ${ARCADE_CARD} p-4 sm:p-5`}>
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-200">
          <TrendingUp size={12} />
          {t.classRank}
        </div>

        <div className="space-y-2">
          {top3.map((r, i) => {
            const isYou = r.uid === currentStudentUid;
            // On the light amber #1 row, white/amber-200 text washes
            // out — use dark, bold text so the name + XP stay legible.
            const gold = i === 0 && !isYou;
            return (
              <div
                key={r.uid}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${isYou ? "bg-cyan-500/15 ring-2 ring-cyan-300/60" : rankRow[i]}`}
              >
                <span className="text-xl shrink-0" aria-hidden>{medals[i]}</span>
                <span className={`flex-1 min-w-0 truncate ${gold ? "text-amber-950 font-extrabold" : "text-white font-bold"}`}>
                  {r.displayName}{isYou ? " (You)" : ""}
                </span>
                <span className={`tabular-nums font-black ${gold ? "text-amber-950" : "text-amber-200"}`}>
                  {r.xp}
                </span>
              </div>
            );
          })}

          {youOutsideTop3 && myIndex >= 0 && (
            <div className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-cyan-500/15 ring-2 ring-cyan-300/60">
              <span className="w-7 text-center shrink-0 font-black tabular-nums text-white/80">#{myRank}</span>
              <span className="flex-1 min-w-0 truncate text-white font-bold">{rows[myIndex].displayName} (You)</span>
              <span className="tabular-nums font-black text-amber-200">{currentXp}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setView("global-leaderboard")}
          type="button"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/20 px-4 py-2 text-cyan-100 font-bold active:scale-95 transition-transform"
        >
          {t.seeFullLeaderboard}
          <ChevronRight size={16} className="rtl:-scale-x-100" />
        </button>
      </div>
    );
  }

  // Rank-coloured badge gradient — gold for 1st, silver for 2nd,
  // bronze for 3rd, brand violet otherwise.  Same family as the
  // podium colours used by QuickPlaySessionEndScreen.
  const rankStyle: CSSProperties =
    myRank === 1
      ? { background: "linear-gradient(135deg, #F0CC78, #D89B3F)" }
      : myRank === 2
        ? { background: "linear-gradient(135deg, #DCDCE8, #A8A8C0)" }
        : myRank === 3
          ? { background: "linear-gradient(135deg, #E6B58A, #C58054)" }
          : { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" };

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setView('global-leaderboard')}
      type="button"
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent' as never,
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
      className="w-full mb-6 rounded-2xl border border-indigo-500/[0.10] bg-white p-4 sm:p-5 text-start flex items-center gap-3 sm:gap-4 hover:-translate-y-0.5 active:scale-[0.99] transition-transform"
    >
      {/* Rank badge */}
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] flex items-center justify-center shrink-0"
        style={{
          ...rankStyle,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 18px -10px rgba(60,40,120,0.45)",
        }}
      >
        <span
          className="text-xl sm:text-2xl font-black text-white tabular-nums"
          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
        >
          #{myRank}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6]">
          <TrendingUp size={12} />
          {t.classRank}
        </div>
        <p className="text-sm sm:text-base font-bold leading-snug" style={{ color: "#1F1147" }}>
          {myRank === 1
            ? t.topOfClass
            : ahead
              ? (gap > 0 ? t.xpBehind(gap, ahead.displayName) : t.tiedWith(ahead.displayName))
              : t.keepClimbing}
        </p>
      </div>

      <ChevronRight size={20} className="text-[#8B5CF6] opacity-55 shrink-0 rtl:-scale-x-100" />
    </motion.button>
  );
}
