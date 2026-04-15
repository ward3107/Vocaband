import { motion } from "framer-motion";
import type { LeaderboardEntry } from "../../core/types";
import type { AppUser } from "../../core/supabase";

interface LiveLeaderboardWidgetProps {
  user: AppUser | null;
  leaderboard: Record<string, LeaderboardEntry>;
}

export default function LiveLeaderboardWidget({ user, leaderboard }: LiveLeaderboardWidgetProps) {
  // Only shown during live challenges (has leaderboard data).
  // Hidden for solo assignments and Quick Play guests.
  if (user?.isGuest || Object.keys(leaderboard).length === 0) return null;

  return (
    <div className="lg:col-span-1">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl p-6 sticky top-6 border border-white/20">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-white">🏆 Live Rank</h3>
        <div className="space-y-2">
          {(Object.entries(leaderboard) as [string, LeaderboardEntry][])
            .map(([uid, entry]) => ({ uid, name: entry.name, totalScore: entry.baseScore + entry.currentGameScore, isGuest: entry.isGuest || false }))
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 5)
            .map((entry, idx) => {
              const isUser = entry.name === user?.displayName;
              const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
              const rankClass = idx === 0 ? "bg-gradient-to-r from-yellow-300 to-yellow-500 text-stone-900 shadow-lg shadow-yellow-400/30" :
                idx === 1 ? "bg-gradient-to-r from-slate-200 to-slate-400 text-stone-900" :
                idx === 2 ? "bg-gradient-to-r from-orange-300 to-orange-500 text-white" :
                "bg-white/20 text-white";
              return (
                <div
                  key={`${entry.uid}-${idx}`}
                  className={`flex justify-between items-center p-2 sm:p-3 rounded-xl transition-all ${isUser ? "bg-white/30 border-2 border-white/50 scale-105 shadow-lg" : "bg-white/10"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankClass}`}>
                      {rankIcon}
                    </span>
                    <span className={`text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-[100px] ${isUser ? "text-white" : "text-white/90"}`}>
                      {entry.name}{entry.isGuest && <span className="ml-0.5">🎭</span>}
                    </span>
                    {idx === 0 && (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-xs"
                      >👑</motion.span>
                    )}
                  </div>
                  <span className={`text-sm sm:text-base font-black ${isUser ? "text-white" : "text-white/80"}`}>
                    {entry.totalScore}
                  </span>
                </div>
              );
            })}
          {Object.values(leaderboard).length === 0 && (
            <div className="text-center py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-3xl mb-2"
              >⏳</motion.div>
              <p className="text-xs text-white/70 italic">Waiting for players...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
