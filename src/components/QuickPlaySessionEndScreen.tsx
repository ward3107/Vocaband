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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-white rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="text-5xl sm:text-6xl mb-3"
        >
          {isTop3 ? '🏆' : '🎉'}
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-black text-gray-900 mb-1"
        >
          {isTop3 ? `You finished ${rankLabel(myRank!)}!` : 'Session Complete!'}
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-gray-500 mb-5"
        >
          Great job, <strong>{studentName}</strong>!
        </motion.p>

        {/* My rank + score card */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          className={`rounded-2xl p-5 mb-5 border-2 ${
            isTop3
              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-200'
              : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {myRank && medalIcon(myRank)}
            <div className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
              {myRank !== null && totalPlayers > 0
                ? `Rank ${myRank} of ${totalPlayers}`
                : 'Your Final Score'}
            </div>
          </div>
          <div className="text-5xl sm:text-6xl font-black text-indigo-600">
            {myTotalScore}
          </div>
          <div className="text-sm text-indigo-400 font-bold mt-1">points</div>
        </motion.div>

        {/* Top-3 mini podium.  Only shown when we have leaderboard data. */}
        {!loading && top3.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-5"
          >
            <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                      isMe
                        ? 'bg-indigo-100 ring-2 ring-indigo-400'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-sm">
                      {idx + 1}
                    </div>
                    <div className="text-xl">{entry.avatar}</div>
                    <div className="flex-1 text-left truncate font-bold text-gray-800">
                      {entry.name}
                      {isMe && <span className="ml-1 text-xs text-indigo-500">(you)</span>}
                    </div>
                    <div className="font-black text-indigo-600">{entry.score}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Sign up prompt — only for guest players, kept for growth */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="bg-amber-50 rounded-2xl p-3 mb-5 border-2 border-amber-200"
        >
          <p className="text-amber-700 text-xs sm:text-sm font-medium">
            {"⭐"} Sign up to save your progress, earn XP, and climb the leaderboard!
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
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
        >
          Back to Home Page
        </motion.button>
      </motion.div>
    </div>
  );
}
