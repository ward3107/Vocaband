/**
 * DreidelStudentView.tsx — the student's phone view during Dreidel.
 *
 * Auto-joins on mount (emits DREIDEL_JOIN), then renders the phase-
 * appropriate UI from the broadcast DreidelState.  Submits answers
 * via DREIDEL_ANSWER, spends power-ups via DREIDEL_POWERUP.  Server
 * decides who actually won; we just show the latest broadcast.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type DreidelState,
  type DreidelRoundResult,
  type DreidelPowerUpId,
} from "../core/types";
import { isRareLetter } from "../core/dreidel";
import type { AppUser } from "../core/supabase";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import { studentDreidelT } from "../locales/student/dreidel";
import { teacherDreidelT } from "../locales/teacher/dreidel";

interface DreidelStudentViewProps {
  user: AppUser;
  classCode: string;
  socket: Socket | null;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setIsLiveChallenge: (v: boolean) => void;
}

export default function DreidelStudentView({
  user,
  classCode,
  socket,
  setView,
  setIsLiveChallenge,
}: DreidelStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = studentDreidelT[language];
  const topics = teacherDreidelT[language].topics;

  const [state, setState] = useState<DreidelState | null>(null);
  const [lastResult, setLastResult] = useState<DreidelRoundResult | null>(null);
  const [input, setInput] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [powerUsed, setPowerUsed] = useState<Set<DreidelPowerUpId>>(new Set());
  const [lastError, setLastError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-join + state subscription.
  useEffect(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.DREIDEL_JOIN, {
      classCode,
      uid: user.uid,
      name: user.displayName ?? "Player",
    });
    const onState = (s: DreidelState) => {
      if (s.classCode !== classCode) return;
      setState(s);
      // Auto-focus the input when answering starts.
      if (s.phase === "answering" && inputRef.current) {
        inputRef.current.focus();
      }
      if (s.phase !== "answering") {
        setLastError(null);
      }
    };
    const onResult = (r: DreidelRoundResult) => {
      setLastResult(r);
      setInput("");
      setHint(null);
    };
    const onPowerResult = (payload: { powerUp: DreidelPowerUpId; ok: boolean; sample?: string }) => {
      if (payload.ok) {
        setPowerUsed((s) => new Set(s).add(payload.powerUp));
        if (payload.powerUp === "peek" && payload.sample) {
          setHint(payload.sample);
        }
      }
    };
    socket.on(SOCKET_EVENTS.DREIDEL_STATE, onState);
    socket.on(SOCKET_EVENTS.DREIDEL_RESULT, onResult);
    socket.on(SOCKET_EVENTS.DREIDEL_END, onState);
    socket.on("dreidel-powerup-result", onPowerResult);
    return () => {
      socket.off(SOCKET_EVENTS.DREIDEL_STATE, onState);
      socket.off(SOCKET_EVENTS.DREIDEL_RESULT, onResult);
      socket.off(SOCKET_EVENTS.DREIDEL_END, onState);
      socket.off("dreidel-powerup-result", onPowerResult);
    };
  }, [socket, classCode, user.uid, user.displayName]);

  const me = state?.players[user.uid];
  const myLives = me?.lives ?? 0;
  const amEliminated = me?.eliminated ?? false;

  const leave = () => {
    setIsLiveChallenge(false);
    setView("student-dashboard");
  };

  // Countdown ticker
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

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const word = input.trim();
    if (!word || state?.phase !== "answering" || amEliminated || !socket) return;
    // Client-side basic validation feedback (server is the source of truth).
    const letter = state.currentLetter ?? "";
    if (letter && word[0]?.toUpperCase() !== letter.toUpperCase()) {
      setLastError(t.wrongLetter(letter));
      return;
    }
    socket.emit(SOCKET_EVENTS.DREIDEL_ANSWER, { classCode, word });
    setInput("");
  };

  const usePower = (id: DreidelPowerUpId) => {
    if (powerUsed.has(id) || !socket) return;
    if (state?.phase !== "answering" || amEliminated) return;
    socket.emit(SOCKET_EVENTS.DREIDEL_POWERUP, { classCode, powerUp: id });
  };

  // ── Render branches ────────────────────────────────────────────────

  // Show a "no session yet" fallback after 4s of waiting so a student
  // who taps Join before the teacher has started doesn't see a perpetual
  // spinner with no exit.
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  useEffect(() => {
    if (state) return;
    const t = setTimeout(() => setWaitedTooLong(true), 4000);
    return () => clearTimeout(t);
  }, [state]);

  if (!state) {
    return (
      <div dir={dir} className="min-h-screen bg-gradient-to-br from-indigo-600 to-fuchsia-700 flex items-center justify-center p-6 text-white">
        <div className="text-center max-w-xs">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="text-6xl mb-3">🎲</motion.div>
          <p className="font-bold mb-3">{t.joining}</p>
          {waitedTooLong && (
            <>
              <p className="text-sm text-white/80 mb-4">{t.waitingForSpin}</p>
              <button
                type="button"
                onClick={leave}
                className="px-5 py-2 bg-white/15 rounded-full font-bold text-sm border border-white/30 hover:bg-white/25"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {t.leaveButton}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === "finished") {
    const winners = Object.values(state.players)
      .filter((p) => !p.eliminated)
      .sort((a, b) => b.score - a.score);
    const winner = winners[0];
    const iWon = winner?.uid === user.uid;
    return (
      <div dir={dir} className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 flex items-center justify-center p-6 text-white">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full text-center border border-white/20 shadow-2xl">
          <div className="text-6xl mb-3">{iWon ? "🏆" : "🏁"}</div>
          <h2 className="text-3xl font-black mb-2">{iWon ? t.youWon2 : t.finishedTitle}</h2>
          {!iWon && winner && (
            <p className="text-white/85 mb-4">
              🥇 {winner.name}
            </p>
          )}
          {me && (
            <div className="bg-white/10 rounded-xl p-4 mb-5 text-start">
              <p className="text-sm">{t.finalScore(me.score)}</p>
              <p className="text-sm">{t.finalCorrect(me.totalCorrect)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={leave}
            className="w-full py-3 bg-white text-violet-700 rounded-xl font-black shadow-lg hover:shadow-xl transition-all"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {t.leaveButton}
          </button>
        </motion.div>
      </div>
    );
  }

  if (amEliminated) {
    return (
      <div dir={dir} className="min-h-screen bg-gradient-to-br from-stone-700 to-stone-900 p-6 text-white flex flex-col items-center justify-center">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2 opacity-50">💀</div>
          <h2 className="text-2xl font-black mb-1">{t.eliminatedTitle}</h2>
          <p className="text-white/70 text-sm">{t.eliminatedSubtitle}</p>
        </div>
        <SpectatorPanel state={state} />
        <button
          type="button"
          onClick={leave}
          className="mt-6 px-6 py-2 bg-white/15 text-white rounded-full font-bold border border-white/30 hover:bg-white/25"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.leaveButton}
        </button>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-4 text-white">
      <div className="max-w-md mx-auto pt-6">
        {/* Header — lives + score */}
        <div className="flex justify-between items-center mb-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(myLives, 5) }).map((_, i) => (
                <span key={i} className="text-rose-400">❤️</span>
              ))}
              {myLives > 5 && <span className="font-black text-sm ms-1">+{myLives - 5}</span>}
            </div>
          </div>
          <div className="text-end">
            <p className="text-xs text-white/70 font-bold">{user.displayName}</p>
            <p className="text-xl font-black tabular-nums">{me?.score ?? 0} {t.powerUpsHeading.length > 12 ? "" : "pts"}</p>
          </div>
        </div>

        {/* Sudden death banner */}
        {state.inSuddenDeath && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-xl px-3 py-2 text-center font-black text-sm shadow-lg border border-white/30"
          >
            {t.suddenDeathBanner}
          </motion.div>
        )}

        {/* Main stage */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl min-h-[320px] flex flex-col items-center justify-center">
          {state.phase === "lobby" && (
            <div className="text-center">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-7xl mb-3">🎲</motion.div>
              <p className="font-bold text-lg">{t.waitingForSpin}</p>
            </div>
          )}

          {state.phase === "spinning" && (
            <div className="text-center">
              <motion.div animate={{ rotate: 1440 }} transition={{ duration: 2.2, ease: "easeOut" }} className="text-8xl mb-3">🎲</motion.div>
              <p className="font-black text-xl">{t.spinning}</p>
            </div>
          )}

          {state.phase === "answering" && state.currentLetter && (
            <div className="text-center w-full">
              {state.currentTopic && (
                <p className="text-base font-black text-white/85 mb-2">
                  {t.topicIs(topics[state.currentTopic] ?? state.currentTopic)}
                </p>
              )}
              <p className="text-sm font-bold text-white/80 mb-2">
                {t.letterIs(state.currentLetter)}
              </p>
              <div className="text-7xl sm:text-8xl font-black bg-gradient-to-br from-amber-200 to-orange-400 bg-clip-text text-transparent drop-shadow-2xl mb-2">
                {state.currentLetter}
              </div>
              {isRareLetter(state.currentLetter) && (
                <p className="text-xs font-black uppercase text-amber-300 mb-2">{t.rareDoubleHint}</p>
              )}
              <form onSubmit={submit} className="w-full max-w-xs mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setLastError(null); }}
                  placeholder={t.inputPlaceholder}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  // English input always — students may have HE/AR keyboards.
                  inputMode="text"
                  className="w-full text-center text-2xl font-black bg-white/15 border-2 border-white/30 rounded-xl py-3 px-4 placeholder-white/40 text-white focus:outline-none focus:border-amber-300 mb-2"
                />
                {lastError && <p className="text-xs text-rose-200 mb-2">{lastError}</p>}
                {hint && <p className="text-xs text-amber-200 mb-2">{t.peekHint(hint)}</p>}
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-black text-base shadow-lg hover:shadow-xl active:scale-95 transition-all"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {t.submitButton}
                </button>
              </form>
              {/* Countdown bar */}
              <div className="mt-3 h-2 bg-white/15 rounded-full overflow-hidden max-w-xs mx-auto">
                <motion.div
                  className={`h-full rounded-full ${
                    remainingMs < 2000
                      ? "bg-gradient-to-r from-red-500 to-rose-500"
                      : "bg-gradient-to-r from-emerald-400 to-teal-500"
                  }`}
                  animate={{
                    width: `${Math.min(100, (remainingMs / ((state.inSuddenDeath ? 4000 : state.config.timerSeconds * 1000))) * 100)}%`,
                  }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
              <p className="mt-1 text-sm font-black tabular-nums">{(remainingMs / 1000).toFixed(1)}s</p>
            </div>
          )}

          {state.phase === "roundEnd" && lastResult && (
            <RoundEndOverlay result={lastResult} myUid={user.uid} state={state} t={t} />
          )}
        </div>

        {/* Power-ups */}
        {state.config.powerUpsEnabled && state.phase === "answering" && (
          <div className="mt-4">
            <p className="text-xs font-black uppercase text-white/60 mb-2">{t.powerUpsHeading}</p>
            <div className="grid grid-cols-3 gap-2">
              <PowerButton id="skip"      icon="⏭️" label={t.powerSkip} used={powerUsed.has("skip")}      usedLabel={t.powerUsed} onUse={() => usePower("skip")} />
              <PowerButton id="peek"      icon="💡" label={t.powerPeek} used={powerUsed.has("peek")}      usedLabel={t.powerUsed} onUse={() => usePower("peek")} />
              <PowerButton id="extraTime" icon="⏱️" label={t.powerTime} used={powerUsed.has("extraTime")} usedLabel={t.powerUsed} onUse={() => usePower("extraTime")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type StudentDreidelStringsForLang = (typeof studentDreidelT)[keyof typeof studentDreidelT];

function RoundEndOverlay({
  result, myUid, state, t,
}: {
  result: DreidelRoundResult;
  myUid: string;
  state: DreidelState;
  t: StudentDreidelStringsForLang;
}) {
  const myOutcome = result.outcomes[myUid];
  const iWon = result.winnerUid === myUid;
  const wasStolenFromMe = Object.entries(result.outcomes).some(
    ([uid, o]) => o.stoleFromUid === myUid && uid !== myUid,
  );
  const winner = result.winnerUid ? state.players[result.winnerUid] : null;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={result.letter}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="text-center"
      >
        <div className="text-5xl mb-2">{iWon ? "🎉" : result.winnerUid ? "👀" : "⏰"}</div>
        <p className="text-lg font-black mb-1">
          {iWon && result.winningWord ? t.youWon(myOutcome?.pointsEarned ?? 0)
            : result.winnerUid && winner && result.winningWord ? t.someoneElseWon(winner.name, result.winningWord)
            : t.timesUp}
        </p>
        {iWon && (myOutcome?.livesGained ?? 0) > 0 && (
          <p className="text-amber-300 font-black text-sm mt-1">{t.bonusLife}</p>
        )}
        {!iWon && (myOutcome?.livesLost ?? 0) > 0 && (
          <p className="text-rose-300 font-bold text-sm mt-1">{t.lostLife}</p>
        )}
        {iWon && myOutcome?.stoleFromUid && (
          <p className="text-fuchsia-200 font-bold text-sm mt-1">
            {t.stoleFrom(state.players[myOutcome.stoleFromUid]?.name ?? "?")}
          </p>
        )}
        {wasStolenFromMe && result.winnerUid && (
          <p className="text-rose-200 font-bold text-sm mt-1">
            {t.victimOfSteal(state.players[result.winnerUid]?.name ?? "?")}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function PowerButton({
  icon, label, used, usedLabel, onUse,
}: {
  id: DreidelPowerUpId; icon: string; label: string; used: boolean;
  usedLabel: string; onUse: () => void;
}) {
  return (
    <button
      type="button"
      onClick={used ? undefined : onUse}
      disabled={used}
      className={`rounded-xl p-2 border-2 text-center transition-all ${
        used
          ? "bg-stone-900/30 border-stone-700/50 opacity-50 cursor-not-allowed"
          : "bg-white/15 border-white/30 hover:bg-white/25 active:scale-95"
      }`}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <div className="text-2xl mb-0.5">{icon}</div>
      <p className="text-[10px] font-black uppercase">{used ? usedLabel : label}</p>
    </button>
  );
}

function SpectatorPanel({ state }: { state: DreidelState }) {
  const players = Object.values(state.players).sort((a, b) => b.score - a.score);
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-full max-w-xs border border-white/20">
      <p className="text-xs font-black uppercase text-white/60 mb-2">Players</p>
      <div className="space-y-1">
        {players.map((p, i) => (
          <div key={p.uid} className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs">{i + 1}</span>
            <span className={`flex-1 truncate ${p.eliminated ? "line-through text-white/50" : ""}`}>{p.name}</span>
            <span className="font-black tabular-nums">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
