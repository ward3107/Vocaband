/**
 * DreidelChallengeView.tsx — teacher's projected game screen.
 *
 * Renders all phases of the Dreidel state machine:
 *   lobby      → waiting for students, "Spin" button visible
 *   spinning   → animated dreidel, letter hidden
 *   answering  → big letter + countdown + leaderboard
 *   roundEnd   → winner / time's-up banner
 *   finished   → results modal
 *
 * Server owns all state; this view just renders DREIDEL_STATE snapshots.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Socket } from "socket.io-client";
import type { ClassData } from "../core/supabase";
import type { View } from "../core/views";
import {
  SOCKET_EVENTS,
  type DreidelState,
  type DreidelRoundResult,
} from "../core/types";
import { isRareLetter, DREIDEL_SPIN_DURATION_MS } from "../core/dreidel";
import { useLanguage } from "../hooks/useLanguage";
import { teacherDreidelT } from "../locales/teacher/dreidel";

interface DreidelChallengeViewProps {
  selectedClass: ClassData;
  socket: Socket | null;
  socketConnected: boolean;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setIsLiveChallenge: (v: boolean) => void;
}

export default function DreidelChallengeView({
  selectedClass,
  socket,
  socketConnected,
  setView,
  setIsLiveChallenge,
}: DreidelChallengeViewProps) {
  const { language, dir } = useLanguage();
  const t = teacherDreidelT[language];

  const [state, setState] = useState<DreidelState | null>(null);
  const [lastResult, setLastResult] = useState<DreidelRoundResult | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Subscribe to state + result events for this session.
  useEffect(() => {
    if (!socket) return;
    const onState = (s: DreidelState) => {
      if (s.classCode !== selectedClass.code) return;
      setState(s);
      if (s.phase === "finished") setShowResultsModal(true);
    };
    const onResult = (r: DreidelRoundResult) => setLastResult(r);
    socket.on(SOCKET_EVENTS.DREIDEL_STATE, onState);
    socket.on(SOCKET_EVENTS.DREIDEL_RESULT, onResult);
    socket.on(SOCKET_EVENTS.DREIDEL_END, onState);
    // Also join the room as an observer in case we reload mid-game.
    return () => {
      socket.off(SOCKET_EVENTS.DREIDEL_STATE, onState);
      socket.off(SOCKET_EVENTS.DREIDEL_RESULT, onResult);
      socket.off(SOCKET_EVENTS.DREIDEL_END, onState);
    };
  }, [socket, selectedClass.code]);

  // ── Countdown ticker ────────────────────────────────────────────────
  // The server sends a deadline (epoch ms); we render the remaining
  // seconds on each animation frame so it stays smooth even when the
  // throttled state updates lag.
  const [remainingMs, setRemainingMs] = useState(0);
  useEffect(() => {
    if (state?.phase !== "answering" || !state.deadlineMs) {
      setRemainingMs(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      const left = Math.max(0, (state.deadlineMs ?? 0) - Date.now());
      setRemainingMs(left);
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state?.phase, state?.deadlineMs]);

  // Spin animation — kick off a rotation each time we enter spinning.
  // Bump in an effect (not during render) so React's strict-mode double-
  // render doesn't double-count us into a perpetual spin.
  const spinKey = useRef(0);
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (state?.phase === "spinning" && prevPhaseRef.current !== "spinning") {
      spinKey.current += 1;
    }
    prevPhaseRef.current = state?.phase ?? null;
  }, [state?.phase]);

  const exit = () => {
    setIsLiveChallenge(false);
    setView("teacher-dashboard");
  };

  const requestEnd = () => {
    if (!state || Object.keys(state.players).length === 0) {
      socket?.emit(SOCKET_EVENTS.DREIDEL_END, { classCode: selectedClass.code });
      exit();
      return;
    }
    setShowEndConfirm(true);
  };

  const confirmEnd = () => {
    setShowEndConfirm(false);
    socket?.emit(SOCKET_EVENTS.DREIDEL_END, { classCode: selectedClass.code });
  };

  const handleSpin = () => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.DREIDEL_SPIN, { classCode: selectedClass.code });
  };

  const sortedPlayers = state
    ? Object.values(state.players).sort((a, b) => b.score - a.score)
    : [];
  const playerCount = sortedPlayers.length;
  const alivePlayers = sortedPlayers.filter((p) => !p.eliminated);

  const phaseLabel =
    state?.phase === "spinning" ? t.phaseSpinning
    : state?.phase === "answering" ? t.phaseAnswering
    : state?.phase === "roundEnd" ? t.phaseRoundEnd
    : state?.phase === "finished" ? t.phaseFinished
    : t.phaseLobby;

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-4 sm:p-6 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <button
            type="button"
            onClick={exit}
            className="text-white/90 font-bold bg-white/15 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/25 transition-all text-sm"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            ← Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm bg-white/15 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  socketConnected ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400 animate-pulse"
                }`}
              />
              <span className="font-bold">{socketConnected ? t.liveIndicator : t.reconnecting}</span>
            </div>
            <button
              type="button"
              onClick={requestEnd}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition-all"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {t.endChallenge}
            </button>
          </div>
        </div>

        {/* Title block */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-4xl font-black drop-shadow-2xl">
            {t.liveTitle(selectedClass.name)}
          </h1>
          <p className="text-white/85 font-bold text-sm mt-2">
            {t.classCodeLabel}{" "}
            <span className="bg-white text-violet-600 px-3 py-1 rounded-lg font-mono font-black ms-2 shadow-lg">
              {selectedClass.code}
            </span>
          </p>
        </div>

        {/* Sudden death banner */}
        <AnimatePresence>
          {state?.inSuddenDeath && state.phase !== "finished" && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="mb-4 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-xl px-4 py-3 text-center font-black text-sm sm:text-base shadow-lg shadow-red-500/40 border border-white/30"
            >
              {t.suddenDeathBanner}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage (left, 2/3) */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl min-h-[420px] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Phase label */}
            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-widest text-white/60">
              {state ? t.roundNumber(state.roundNumber || 0) : ""} · {phaseLabel}
            </p>

            {/* Lobby: spin button */}
            {state?.phase === "lobby" && (
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 12, -12, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-8xl sm:text-9xl mb-4 drop-shadow-2xl"
                >
                  🎲
                </motion.div>
                <p className="text-white/85 font-bold mb-2">{t.phaseLobbyHelp}</p>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSpin}
                  disabled={playerCount === 0}
                  className={`mt-4 px-8 py-4 rounded-2xl font-black text-lg shadow-xl transition-all ${
                    playerCount > 0
                      ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-orange-300/50"
                      : "bg-white/20 text-white/50 cursor-not-allowed"
                  }`}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {t.spinButton}
                </motion.button>
                {playerCount === 0 && (
                  <p className="text-white/70 text-sm mt-4">{t.waitingForPlayers}</p>
                )}
              </div>
            )}

            {/* Spinning */}
            {state?.phase === "spinning" && (
              <motion.div
                key={`spin-${spinKey.current}`}
                initial={{ rotate: 0, scale: 1 }}
                animate={{ rotate: 1440, scale: [1, 1.15, 1] }}
                transition={{
                  duration: DREIDEL_SPIN_DURATION_MS / 1000,
                  ease: "easeOut",
                }}
                className="text-9xl drop-shadow-2xl"
              >
                🎲
              </motion.div>
            )}

            {/* Answering: big letter + topic + countdown */}
            {state?.phase === "answering" && state.currentLetter && (
              <div className="text-center w-full">
                {state.currentTopic && (
                  <motion.p
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-base sm:text-xl font-black text-white/85 mb-3"
                  >
                    {t.topicLabelForRound(t.topics[state.currentTopic] ?? state.currentTopic)}
                  </motion.p>
                )}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="inline-block relative"
                >
                  <div className="text-[10rem] sm:text-[14rem] font-black leading-none bg-gradient-to-br from-amber-200 via-orange-300 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl">
                    {state.currentLetter}
                  </div>
                  {isRareLetter(state.currentLetter) && (
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-2 -end-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-full font-black text-xs shadow-xl border-2 border-white"
                    >
                      {t.rareLetterBadge}
                    </motion.div>
                  )}
                </motion.div>

                {/* Countdown bar */}
                <div className="mt-6 max-w-md mx-auto">
                  <div className="h-3 bg-white/15 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        remainingMs < 2000
                          ? "bg-gradient-to-r from-red-500 to-rose-500"
                          : "bg-gradient-to-r from-emerald-400 to-teal-500"
                      }`}
                      animate={{
                        width: `${Math.min(
                          100,
                          (remainingMs / ((state.deadlineMs ?? 0) - (state.deadlineMs! - (state.inSuddenDeath ? 4000 : state.config.timerSeconds * 1000)))) * 100,
                        )}%`,
                      }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  </div>
                  <p className="mt-2 text-3xl font-black tabular-nums">
                    {(remainingMs / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            )}

            {/* Round end: winner / time's up overlay */}
            {state?.phase === "roundEnd" && lastResult && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="text-6xl sm:text-7xl mb-3">
                  {lastResult.winnerUid ? "🎉" : "⏰"}
                </div>
                <p className="text-xl sm:text-3xl font-black mb-2">
                  {lastResult.winnerUid && lastResult.winnerName && lastResult.winningWord
                    ? t.winnerOverlay(lastResult.winnerName, lastResult.winningWord)
                    : t.timeUpOverlay}
                </p>
                {/* Steal-a-life flair */}
                {lastResult.winnerUid &&
                  lastResult.outcomes[lastResult.winnerUid]?.stoleFromUid &&
                  (() => {
                    const victimUid = lastResult.outcomes[lastResult.winnerUid!].stoleFromUid!;
                    const victimName = state?.players[victimUid]?.name ?? "?";
                    return (
                      <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-block mt-2 bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white px-4 py-1.5 rounded-full font-black text-sm shadow-lg"
                      >
                        {t.stealBadge(victimName)}
                      </motion.p>
                    );
                  })()}
              </motion.div>
            )}
          </div>

          {/* Leaderboard (right, 1/3) */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl">
            <h2 className="text-lg font-black mb-3 flex items-center gap-2">
              <span>👥</span> {t.leaderboardTitle}
              <span className="ms-auto text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                {alivePlayers.length}/{playerCount}
              </span>
            </h2>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pe-1">
              {sortedPlayers.map((p, idx) => (
                <motion.div
                  key={p.uid}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl p-3 border flex items-center gap-3 ${
                    p.eliminated
                      ? "bg-stone-900/30 border-stone-700/50 opacity-50"
                      : idx === 0
                      ? "bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border-yellow-300/60 shadow-lg shadow-yellow-400/20"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                    {idx === 0 && !p.eliminated ? "👑" : idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate text-sm">
                      {p.name}{p.isGuest && <span className="ms-1">🎭</span>}
                    </p>
                    <p className="text-xs text-white/70">
                      {p.score} {t.pointsLabel}
                    </p>
                  </div>
                  {p.eliminated ? (
                    <span className="font-black text-xs uppercase text-rose-300">{t.eliminatedLabel}</span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(p.lives, 5) }).map((_, i) => (
                        <span key={i} className="text-rose-400 text-sm">❤️</span>
                      ))}
                      {p.lives > 5 && (
                        <span className="text-xs font-black text-rose-200 ms-1">+{p.lives - 5}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {sortedPlayers.length === 0 && (
                <div className="text-center py-10 text-white/70">
                  <div className="text-4xl mb-2">⏳</div>
                  <p className="font-bold text-sm">{t.waitingForPlayers}</p>
                  <p className="text-xs mt-1">{t.shareCode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* End confirm */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-stone-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              dir={dir}
            >
              <h3 className="text-xl font-black mb-2">{t.endConfirmTitle}</h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                {t.endConfirmBody(playerCount)}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-50 border-2 border-stone-200 transition-colors"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {t.endConfirmCancel}
                </button>
                <button
                  type="button"
                  onClick={confirmEnd}
                  className="flex-1 py-3 rounded-xl font-black text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {t.endConfirmEnd}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final results */}
      <AnimatePresence>
        {showResultsModal && state?.phase === "finished" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResultsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-stone-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              dir={dir}
            >
              <div className="text-center mb-5">
                <div className="text-5xl sm:text-6xl mb-3">🏆</div>
                <h2 className="text-2xl sm:text-3xl font-black">{t.resultsTitle}</h2>
                <p className="text-stone-600 font-bold text-sm">{selectedClass.name}</p>
              </div>
              {(() => {
                const winners = sortedPlayers.filter((p) => !p.eliminated);
                const winner = winners[0] ?? sortedPlayers[0];
                return winner ? (
                  <div className="text-center mb-5 bg-gradient-to-r from-yellow-100 to-amber-50 rounded-xl border-2 border-amber-300 p-4">
                    <p className="text-xs font-bold uppercase text-amber-700">{t.winnerLabel}</p>
                    <p className="text-2xl font-black mt-1">{winner.name}</p>
                    <p className="text-xs text-stone-600 mt-1">
                      {winner.score} {t.pointsLabel} · {winner.totalCorrect} ✓
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-stone-600 mb-5">{t.noWinnerLabel}</p>
                );
              })()}
              <div className="space-y-2 mb-6 max-h-[260px] overflow-y-auto">
                {sortedPlayers.slice(0, 10).map((p, idx) => (
                  <div
                    key={p.uid}
                    className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </span>
                      <span className="font-bold">{p.name}</span>
                    </div>
                    <span className="font-black tabular-nums">{p.score}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setShowResultsModal(false); exit(); }}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-xl font-black text-base shadow-lg hover:shadow-xl transition-all"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {t.close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
