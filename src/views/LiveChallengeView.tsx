import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LeaderboardEntry } from "../core/types";
import type { ClassData } from "../core/supabase";
import type { View } from "../core/views";

interface LiveChallengeViewProps {
  selectedClass: ClassData;
  leaderboard: Record<string, LeaderboardEntry>;
  socketConnected: boolean;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setIsLiveChallenge: (v: boolean) => void;
}

export default function LiveChallengeView({
  selectedClass,
  leaderboard,
  socketConnected,
  setView,
  setIsLiveChallenge,
}: LiveChallengeViewProps) {
  // Calculate total scores (baseScore + currentGameScore) for each student
  const sortedLeaderboard = (Object.entries(leaderboard) as [string, LeaderboardEntry][])
    .map(([uid, entry]) => ({
      uid,
      name: entry.name,
      totalScore: entry.baseScore + entry.currentGameScore,
      isGuest: entry.isGuest || false,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const top3 = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);

  // ─── Celebration chime on leader change (parity with Quick Play monitor)
  // C-major triad arpeggio via WebAudio whenever the uid at position #1
  // changes.  Suppressed on the initial non-empty render so teachers don't
  // hear a chime the moment the first score lands.
  const prevLeaderUidRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const currentLeaderUid = sortedLeaderboard[0]?.uid ?? null;
    const prev = prevLeaderUidRef.current;
    if (currentLeaderUid && prev && currentLeaderUid !== prev) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        [659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const start = ctx.currentTime + i * 0.12;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
      } catch { /* silent fail — sound is a nice-to-have */ }
    }
    prevLeaderUidRef.current = currentLeaderUid;
  }, [sortedLeaderboard]);

  // ─── Final-results modal when teacher ends the challenge
  // Instead of navigating away the instant "End Challenge" is clicked,
  // show a proper wrap-up modal: top 3 with medals, total players, dismiss
  // button that then does the exit.  Gives the class a sense of closure.
  const [showResultsModal, setShowResultsModal] = useState(false);
  const exitChallenge = () => {
    setView("live-challenge-class-select");
    setIsLiveChallenge(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 sm:p-6 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
          <button onClick={exitChallenge} className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-base sm:text-sm bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all">← Back to Class Selection</button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              <span className={`w-3 h-3 rounded-full ${socketConnected ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400 animate-pulse"}`} />
              <span className="font-bold">{socketConnected ? "🔴 LIVE" : "Reconnecting..."}</span>
            </div>
            <button
              onClick={() => {
                // Only show the results modal if anyone actually played.
                // Otherwise just exit — a ceremonial "everybody scored 0"
                // screen feels silly.
                if (sortedLeaderboard.length > 0) setShowResultsModal(true);
                else exitChallenge();
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-5 py-2 rounded-full font-bold transition-all text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105"
            >
              End Challenge
            </button>
          </div>
        </div>

        <div className="text-center mb-6 sm:mb-10">
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl sm:text-5xl font-black mb-2 drop-shadow-2xl"
          >
            🏆 Live Challenge: {selectedClass.name}
          </motion.h1>
          <p className="text-white/90 font-bold text-sm sm:text-base">Class Code: <span className="bg-white text-purple-600 px-4 py-2 rounded-xl font-mono font-black ml-2 shadow-lg">{selectedClass.code}</span></p>
        </div>

        {/* Socket-offline warning — if the live socket never connects,
            students can't appear on the podium.  Make the root cause
            visible instead of letting the teacher guess.  Previously
            this failure was silent (just a tiny red "Reconnecting…"
            dot in the header). */}
        {!socketConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-lg flex items-start gap-3"
          >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl">⚠️</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base">Live podium not connected</p>
              <p className="text-sm mt-1 leading-relaxed">
                Students who join right now won't show up here until the
                socket reconnects.  This is usually the real-time server
                waking up from idle — try refreshing this page in 10–20
                seconds.  If it keeps showing, the live backend (Render)
                may be down or unreachable from your network.
              </p>
            </div>
          </motion.div>
        )}

        {/* Winner's Podium for Top 3 */}
        {top3.length > 0 && (
          <div className="mb-8">
            <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6">
              {/* 2nd Place */}
              {top3[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-slate-400/30 border-4 border-white">
                      🥈
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-full font-black">2ND</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 mt-4 text-center border border-white/30 w-28 sm:w-36">
                    <p className="font-bold text-sm sm:text-base truncate">{top3[1].name}{top3[1].isGuest && <span className="ml-1">🎭</span>}</p>
                    <p className="text-2xl sm:text-3xl font-black">{top3[1].totalScore}</p>
                    <p className="text-[10px] text-white/70 font-bold">POINTS</p>
                  </div>
                  <div className="h-16 sm:h-24 w-full bg-gradient-to-t from-slate-400/30 to-transparent rounded-t-lg mt-2"></div>
                </motion.div>
              )}

              {/* 1st Place - Center and tallest */}
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center relative"
                >
                  {/* Crown animation */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-4xl sm:text-5xl mb-2 drop-shadow-lg"
                  >
                    👑
                  </motion.div>
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shadow-yellow-400/50 border-4 border-white animate-pulse">
                      🥇
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs px-3 py-0.5 rounded-full font-black shadow-lg">1ST</div>
                    {/* Sparkle effects */}
                    <div className="absolute -top-1 -right-1 text-yellow-300 animate-bounce">✨</div>
                    <div className="absolute -top-1 -left-1 text-yellow-300 animate-bounce [animation-delay:0.5s]">✨</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 mt-4 text-center border-2 border-yellow-300/50 w-32 sm:w-40 shadow-2xl shadow-yellow-400/20">
                    <p className="font-bold text-base sm:text-lg truncate">{top3[0].name}{top3[0].isGuest && <span className="ml-1">🎭</span>}</p>
                    <p className="text-3xl sm:text-4xl font-black">{top3[0].totalScore}</p>
                    <p className="text-[10px] text-white/80 font-bold">POINTS</p>
                  </div>
                  <div className="h-24 sm:h-32 w-full bg-gradient-to-t from-yellow-400/40 to-transparent rounded-t-lg mt-2"></div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-orange-400/30 border-4 border-white">
                      🥉
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full font-black">3RD</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 mt-4 text-center border border-white/30 w-28 sm:w-36">
                    <p className="font-bold text-sm sm:text-base truncate">{top3[2].name}{top3[2].isGuest && <span className="ml-1">🎭</span>}</p>
                    <p className="text-2xl sm:text-3xl font-black">{top3[2].totalScore}</p>
                    <p className="text-[10px] text-white/70 font-bold">POINTS</p>
                  </div>
                  <div className="h-12 sm:h-20 w-full bg-gradient-to-t from-orange-400/30 to-transparent rounded-t-lg mt-2"></div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Rest of Leaderboard */}
        <div className="bg-white/10 backdrop-blur-md rounded-[40px] p-6 sm:p-8 border border-white/20 shadow-2xl">
          <h2 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6 flex items-center gap-2">
            <span className="text-2xl">📊</span> Full Leaderboard
            {sortedLeaderboard.length > 0 && (
              <span className="ml-auto text-sm font-normal bg-white/20 px-3 py-1 rounded-full">
                {sortedLeaderboard.length} {sortedLeaderboard.length === 1 ? 'Player' : 'Players'}
              </span>
            )}
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {rest.map((entry, idx) => (
              <motion.div
                key={`${entry.uid}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (idx + 3) * 0.05 }}
                className="flex justify-between items-center p-3 sm:p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm sm:text-base">{idx + 4}</span>
                  <span className="font-bold text-base sm:text-lg">{entry.name}{entry.isGuest && <span className="ml-1">🎭</span>}</span>
                </div>
                <span className="text-xl sm:text-2xl font-black">{entry.totalScore}</span>
              </motion.div>
            ))}
            {sortedLeaderboard.length === 0 && (
              <div className="text-center py-12">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  ⏳
                </motion.div>
                <p className="text-white/80 font-bold text-lg">Waiting for students to join...</p>
                <p className="text-white/60 text-sm mt-2">Share the class code to start the competition!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final-results modal — shown when the teacher clicks "End Challenge"
          with at least one player on the board.  Dismissing the modal
          navigates back to the class-select view. */}
      <AnimatePresence>
        {showResultsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowResultsModal(false); exitChallenge(); }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-stone-900 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="text-5xl sm:text-6xl mb-3">🏁</div>
                <h2 className="text-2xl sm:text-3xl font-black mb-1">Challenge Complete!</h2>
                <p className="text-stone-500 font-bold text-sm">{selectedClass.name}</p>
              </div>

              {/* Top 3 medal rows */}
              <div className="space-y-2 mb-6">
                {sortedLeaderboard.slice(0, 3).map((entry, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                  const bg = idx === 0
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-50 border-amber-300'
                    : idx === 1
                    ? 'bg-gradient-to-r from-slate-100 to-slate-50 border-slate-300'
                    : 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-300';
                  return (
                    <motion.div
                      key={entry.uid}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${bg}`}
                    >
                      <div className="text-3xl">{medal}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-base truncate">
                          {entry.name}{entry.isGuest && <span className="ml-1">🎭</span>}
                        </p>
                        <p className="text-xs font-bold text-stone-500">#{idx + 1} place</p>
                      </div>
                      <div className="text-2xl font-black text-indigo-600">{entry.totalScore}</div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center text-sm font-bold text-stone-500 mb-6">
                {sortedLeaderboard.length} {sortedLeaderboard.length === 1 ? 'student' : 'students'} played
              </div>

              <button
                onClick={() => { setShowResultsModal(false); exitChallenge(); }}
                type="button"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
