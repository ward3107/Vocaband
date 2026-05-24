import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Award } from 'lucide-react';
import { supabase } from '../core/supabase';

interface QuickPlaySessionEndScreenProps {
  studentName: string;
  finalScore: number;
  sessionId?: string;
  studentUid?: string;
  onGoHome: () => void;
}

interface LeaderboardEntry {
  name: string;
  avatar: string;
  score: number;
  studentUid: string;
}

// Aggregates per-mode progress rows into one cumulative entry per student.
// Mirrors the teacher-monitor aggregation so the rank the student sees here
// matches the rank they saw on the teacher's podium.  Deduplication is keyed
// by student_uid first (canonical), falling back to display_name for
// same-device rotations that share a name but not a uid.
function aggregate(rows: Array<{
  student_name: string;
  student_uid: string;
  mode: string;
  score: string | number;
  avatar: string | null;
}>): LeaderboardEntry[] {
  const byUid = new Map<string, LeaderboardEntry & { modes: Map<string, number> }>();
  for (const r of rows) {
    if (r.mode === 'joined') continue;
    const key = r.student_uid || r.student_name;
    const scoreNum = typeof r.score === 'string' ? Number(r.score) : r.score;
    if (!byUid.has(key)) {
      byUid.set(key, {
        name: r.student_name,
        avatar: r.avatar || '🦊',
        score: 0,
        studentUid: r.student_uid,
        modes: new Map(),
      });
    }
    const entry = byUid.get(key)!;
    const prevModeBest = entry.modes.get(r.mode) ?? 0;
    if (scoreNum > prevModeBest) entry.modes.set(r.mode, scoreNum);
    if (r.avatar) entry.avatar = r.avatar;
  }
  // Sum per-mode bests into cumulative; collapse the Map<mode> out of the
  // public-facing shape.
  const out: LeaderboardEntry[] = [];
  byUid.forEach((e) => {
    let total = 0;
    e.modes.forEach((v) => { total += v; });
    out.push({ name: e.name, avatar: e.avatar, score: total, studentUid: e.studentUid });
  });
  out.sort((a, b) => b.score - a.score);
  return out;
}

export default function QuickPlaySessionEndScreen({
  studentName,
  finalScore,
  sessionId,
  studentUid,
  onGoHome,
}: QuickPlaySessionEndScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('student_name, student_uid, mode, score, avatar')
        .eq('assignment_id', sessionId);
      if (cancelled) return;
      if (error || !data) {
        setLeaderboard([]);
      } else {
        setLeaderboard(aggregate(data as Parameters<typeof aggregate>[0]));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Rank is 1-based.  Fallback: if we couldn't fetch the board, at least
  // show their score.
  const myRankIndex = studentUid
    ? leaderboard.findIndex((e) => e.studentUid === studentUid)
    : leaderboard.findIndex((e) => e.name === studentName);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const totalPlayers = leaderboard.length;
  const top3 = leaderboard.slice(0, 3);
  const myTotalScore = myRankIndex >= 0 ? leaderboard[myRankIndex].score : finalScore;
  const isTop3 = myRank !== null && myRank <= 3;

  const rankLabel = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  const medalIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={32} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={28} className="text-gray-400" />;
    if (rank === 3) return <Award size={28} className="text-orange-500" />;
    return null;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        // Live v1 dark stack — same as the joining screen so the
        // student app feels like one continuous dark surface from
        // login through the end-of-session recap.
        background:
          "radial-gradient(120% 100% at 50% 0%, #2A1B5C 0%, #1A0E3D 50%, #0E0828 100%)",
      }}
    >
      {/* Decorative glow blobs — match scene 1 chrome */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.22) 0%, transparent 70%)" }}
        aria-hidden
      />

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="text-6xl sm:text-7xl mb-3 inline-block"
          style={{ filter: "drop-shadow(0 12px 24px rgba(240,185,108,0.5))" }}
        >
          {isTop3 ? "🥇" : "🎉"}
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl sm:text-4xl font-black tracking-[-0.02em] mb-1"
          style={{
            background: "linear-gradient(110deg, #FFFFFF, #DAB6FF 50%, #FFB3E0)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {isTop3 ? `You finished ${rankLabel(myRank!)}!` : "Session Complete!"}
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-[14px] mb-6"
          style={{ color: "rgba(241,236,255,0.70)" }}
        >
          Great job, <strong style={{ color: "#F1ECFF" }}>{studentName}</strong>!
        </motion.p>

        {/* My rank + score card — frosted dark surface with a gold accent
            for top-3 finishers, brand-violet otherwise. */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="rounded-2xl p-5 mb-5"
          style={{
            background: isTop3 ? "rgba(240,185,108,0.16)" : "rgba(255,255,255,0.06)",
            border: isTop3
              ? "1px solid rgba(240,185,108,0.30)"
              : "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {myRank && medalIcon(myRank)}
            <div
              className="text-[11px] font-extrabold uppercase tracking-[0.12em]"
              style={{ color: isTop3 ? "#F0B96C" : "rgba(241,236,255,0.45)" }}
            >
              {myRank !== null && totalPlayers > 0
                ? `Rank ${myRank} of ${totalPlayers}`
                : "Your Final Score"}
            </div>
          </div>
          <div
            className="text-5xl sm:text-6xl font-black"
            style={{ color: isTop3 ? "#F0B96C" : "#F1ECFF" }}
          >
            {myTotalScore}
          </div>
          <div
            className="text-[12px] font-bold mt-1"
            style={{ color: "rgba(241,236,255,0.45)" }}
          >
            points
          </div>
        </motion.div>

        {/* Top-3 mini podium.  Only shown when we have leaderboard data. */}
        {!loading && top3.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-5"
          >
            <div
              className="text-[11px] font-extrabold uppercase tracking-[0.12em] mb-2"
              style={{ color: "rgba(241,236,255,0.45)" }}
            >
              Top of the class
            </div>
            <div className="space-y-2">
              {top3.map((entry, idx) => {
                const isMe = studentUid
                  ? entry.studentUid === studentUid
                  : entry.name === studentName;
                return (
                  <div
                    key={entry.studentUid || entry.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={
                      isMe
                        ? {
                            background:
                              "linear-gradient(110deg, rgba(139,92,246,0.20), rgba(217,70,239,0.20))",
                            border: "1px solid rgba(139,92,246,0.35)",
                          }
                        : {
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.10)",
                          }
                    }
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
                      style={
                        idx === 0
                          ? { background: "#F0B96C", color: "#0E0828" }
                          : idx === 1
                          ? { background: "#B8B8C8", color: "#0E0828" }
                          : { background: "#D4956B", color: "#0E0828" }
                      }
                    >
                      {idx + 1}
                    </div>
                    <div className="text-xl">{entry.avatar}</div>
                    <div
                      className="flex-1 text-left truncate font-bold"
                      style={{ color: "#F1ECFF" }}
                    >
                      {entry.name}
                      {isMe && (
                        <span
                          className="ml-1 text-xs"
                          style={{ color: "rgba(241,236,255,0.70)" }}
                        >
                          (you)
                        </span>
                      )}
                    </div>
                    <div
                      className="font-black"
                      style={{ color: "#F0B96C", fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                    >
                      {entry.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Sign-up prompt — repainted with the new fuchsia-violet
            gradient + frosted border so it matches the daily-chest
            hook from the Live v1 mockup. */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl p-4 mb-5 flex items-center gap-3 text-left"
          style={{
            background:
              "linear-gradient(135deg, rgba(217,70,239,0.18), rgba(139,92,246,0.18))",
            border: "1px solid rgba(217,70,239,0.30)",
          }}
        >
          <div className="text-2xl shrink-0">⭐</div>
          <p
            className="text-[12px] sm:text-[13px] font-semibold"
            style={{ color: "#F1ECFF" }}
          >
            Sign up to save your progress, earn XP, and climb the leaderboard!
          </p>
        </motion.div>

        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoHome}
          type="button"
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            background: "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
            boxShadow: "0 14px 30px -14px rgba(139,92,246,0.6)",
          }}
          className="w-full py-4 text-white rounded-full font-bold text-base sm:text-lg"
        >
          Back to Home Page
        </motion.button>
      </motion.div>
    </div>
  );
}
