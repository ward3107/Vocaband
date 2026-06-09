/**
 * SpeedRoundStudentView — the student side of a live Speed Round, from join
 * to play. A sibling of CategoryRaceStudentView; reuses its phase machine,
 * join/rejoin/back-trap, and error plumbing verbatim. The answering UI is a
 * Kahoot-style buzzer: the prompt appears (or is spoken, for listening mode)
 * and the student taps one of 2–4 big option buttons. On tap we submit the
 * INDEX (never text) and lock to a waiting state until SPEED_RESULT lands.
 *
 *   join → lobby → answering (tap an option) → locked → result → lobby …
 *   until the teacher ends the game.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Crown, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import QPAvatarPicker from "../components/QPAvatarPicker";
import QPAvatar from "../components/QPAvatar";
import QuickPlayHelpButton from "../components/QuickPlayHelpButton";
import QuickPlayErrorScreen from "../components/QuickPlayErrorScreen";
import SpeedBuzzer, { CountUp } from "../components/game/SpeedBuzzer";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playGood, playGentle, playFanfare } from "../utils/raceSfx";
import { containsProfanity } from "../utils/nicknameProfanity";
import type { QpSpeedResultPayload, QpSpeedRoundPayload } from "../core/quickPlayProtocol";
import type { View } from "../core/views";
import { SPEED_STUDENT_STRINGS } from "./speedRoundStrings";

interface SpeedRoundStudentViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

type Phase = "join" | "lobby" | "answering" | "locked" | "result" | "ended" | "kicked";

const DEFAULT_AVATAR = "🦊";
const SPEED_GUEST_KEY = "vocaband_speed_guest";

export default function SpeedRoundStudentView({ sessionCode, setView }: SpeedRoundStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = SPEED_STUDENT_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const {
    currentSpeed, leaderboard, clientId, joinedSessionCode, lastError,
    joinAsStudent, submitSpeedAnswer, sendReaction,
    onSpeedResult, onSpeedEnded, onSessionEnded, onKicked,
  } = qp;

  const forgetGame = useCallback(() => {
    try { sessionStorage.removeItem(SPEED_GUEST_KEY); } catch { /* storage unavailable */ }
    try { window.history.replaceState({}, "", window.location.pathname); } catch { /* history unavailable */ }
  }, []);

  const [phase, setPhase] = useState<Phase>("join");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [lastResult, setLastResult] = useState<QpSpeedResultPayload | null>(null);
  // Snapshot of the active word, so the locked/result screens keep rendering
  // (and the result can reveal the correct option) WITHOUT reading the live
  // broadcast state — that may already be cleared by the time they show.
  const [roundSnapshot, setRoundSnapshot] = useState<QpSpeedRoundPayload | null>(null);

  // ─── Phone back-button trap (verbatim from Category Race) ───────────
  useEffect(() => {
    window.history.pushState({ view: "speed-round-student" }, "");
    const handler = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      window.history.pushState({ view: "speed-round-student" }, "");
    };
    window.addEventListener("popstate", handler, { capture: true });
    return () => window.removeEventListener("popstate", handler, { capture: true });
  }, []);

  // ─── Join ─────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (joining) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (containsProfanity(trimmed)) { setJoinError(t.badName); return; }
    setJoinError(null);
    primeAudio();
    setJoining(true);
    joinAsStudent(trimmed, avatar);
  };

  useEffect(() => {
    if (joining && joinedSessionCode === sessionCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- socket join confirmation; matches Category Race convention
      setJoining(false);
      setPhase("lobby");
      try {
        sessionStorage.setItem(
          SPEED_GUEST_KEY,
          JSON.stringify({ sessionCode, name: name.trim(), avatar }),
        );
      } catch { /* storage unavailable */ }
    }
  }, [joining, joinedSessionCode, sessionCode, name, avatar]);

  // Auto-rejoin after a refresh.
  const autoRejoinedRef = useRef(false);
  useEffect(() => {
    if (autoRejoinedRef.current) return;
    autoRejoinedRef.current = true;
    try {
      const saved = sessionStorage.getItem(SPEED_GUEST_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { sessionCode?: string; name?: string; avatar?: string };
      if (parsed.sessionCode !== sessionCode || !parsed.name) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot replay of a saved join on refresh; matches Category Race convention
      setName(parsed.name);
      setAvatar(parsed.avatar || DEFAULT_AVATAR);
      setJoining(true);
      joinAsStudent(parsed.name, parsed.avatar || DEFAULT_AVATAR);
    } catch { /* storage unavailable / bad JSON */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount; joinAsStudent is stable for this session
  }, [sessionCode]);

  // Surface a join rejection.
  useEffect(() => {
    if (!lastError || phase !== "join") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to a socket error payload; matches Category Race convention
    setJoining(false);
    setPhase("join");
    setJoinError(
      lastError.code === "nickname_taken" ? t.nameTaken
      : lastError.code === "kicked" ? t.kicked
      : t.joinFailed,
    );
  }, [lastError, phase, t]);

  // ─── A new word started ────────────────────────────────────────────
  // The countdown, lock-after-tap, and TTS now live inside SpeedBuzzer
  // (shared with Word Hunt Arena); this effect just snapshots the word and
  // flips the phase.
  useEffect(() => {
    if (phase === "join") return;
    if (currentSpeed && currentSpeed.roundId !== roundSnapshot?.roundId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a server-pushed new word resets local play state; matches Category Race convention
      setRoundSnapshot(currentSpeed);
      setLastResult(null);
      setPhase("answering");
    }
  }, [currentSpeed, roundSnapshot, phase]);

  useEffect(() => onSpeedResult((p) => {
    setLastResult(p);
    setPhase("result");
    if (p.correct) {
      celebrate(p.firstCorrect ? "big" : "small");
      playGood();
    } else {
      playGentle();
    }
  }), [onSpeedResult]);

  // Server says the word closed — if we never got a SPEED_RESULT (we didn't
  // answer, or it dropped), fall back to the lobby so we're not stranded.
  useEffect(() => onSpeedEnded(() => {
    setPhase(prev => (prev === "answering" || prev === "locked" ? "lobby" : prev));
  }), [onSpeedEnded]);

  // Safety net: locked but no SPEED_RESULT within 6s — don't trap the student.
  useEffect(() => {
    if (phase !== "locked") return;
    const id = window.setTimeout(() => {
      setPhase(prev => (prev === "locked" ? "lobby" : prev));
    }, 6000);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => onSessionEnded(() => {
    setPhase("ended");
    forgetGame();
    playFanfare();
  }), [onSessionEnded, forgetGame]);
  useEffect(() => onKicked(() => { setPhase("kicked"); forgetGame(); }), [onKicked, forgetGame]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const myIndex = sorted.findIndex(e => e.clientId === clientId);
  const myEntry = myIndex >= 0 ? sorted[myIndex] : null;

  const finishCelebrated = useRef(false);
  useEffect(() => {
    if (phase === "ended" && !finishCelebrated.current && myIndex >= 0 && myIndex < 3) {
      finishCelebrated.current = true;
      celebrate("big");
    }
  }, [phase, myIndex]);

  const helpButton = (
    <QuickPlayHelpButton
      onAlertTeacher={() => sendReaction("🙋")}
      onLeave={() => { forgetGame(); setView("public-landing"); }}
    />
  );

  // ─── Join screen ────────────────────────────────────────────────────
  if (phase === "join") {
    const canContinue = name.trim().length > 0;
    return (
      <Shell dir={dir}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-[32px] bg-white shadow-2xl shadow-fuchsia-500/20 border border-fuchsia-100 p-7"
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">⚡</div>
            <h1 className="text-3xl font-black text-stone-900">{t.joinTitle}</h1>
            <p className="mt-1 text-stone-500 font-semibold">{t.joinSub}</p>
          </div>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setJoinError(null); }}
            onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
            placeholder={t.namePlaceholder}
            maxLength={30}
            autoComplete="off"
            dir="auto"
            className="w-full bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-fuchsia-400 outline-none px-5 py-4 text-xl font-bold text-stone-900 placeholder-stone-300 text-center transition"
          />
          <div className="mt-5">
            <QPAvatarPicker selected={avatar} onSelect={setAvatar} />
          </div>
          {joinError && <p className="mt-4 text-sm font-bold text-rose-600 text-center">{joinError}</p>}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || joining}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-lg text-white shadow-lg transition ${canContinue && !joining ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]" : "bg-stone-300 cursor-not-allowed"}`}
          >
            {joining ? (
              <><Loader2 size={20} className="animate-spin" /> {t.joining}</>
            ) : (
              <>{t.joinBtn} <ArrowRight size={20} className={dir === "rtl" ? "rotate-180" : ""} /></>
            )}
          </button>
        </motion.div>
      </Shell>
    );
  }

  // ─── Answering / locked / result — the shared buzzer ─────────────────
  if ((phase === "answering" || phase === "locked" || (phase === "result" && lastResult)) && roundSnapshot) {
    return (
      <>
        <SpeedBuzzer
          phase={phase === "result" ? "result" : phase}
          mode={roundSnapshot.mode}
          prompt={roundSnapshot.prompt}
          promptKind={roundSnapshot.promptKind}
          options={roundSnapshot.options}
          roundId={roundSnapshot.roundId}
          deadlineTs={roundSnapshot.deadlineTs}
          roundSeconds={roundSnapshot.roundSeconds}
          onSubmit={(i) => { setPhase("locked"); submitSpeedAnswer(roundSnapshot.roundId, i); }}
          onExpired={() => setPhase("locked")}
          result={lastResult}
          className="min-h-[100dvh]"
        />
        {helpButton}
      </>
    );
  }

  // ─── Kicked ──────────────────────────────────────────────────────────
  if (phase === "kicked") {
    return (
      <Shell dir={dir}>
        <QuickPlayErrorScreen kind="kicked" onPrimary={() => setView("public-landing")} />
      </Shell>
    );
  }

  // ─── Ended ────────────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <Shell dir={dir}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-7xl mb-3">{myIndex === 0 ? "🥇" : myIndex === 1 ? "🥈" : myIndex === 2 ? "🥉" : "🎉"}</div>
          <h1 className="text-3xl font-black text-stone-900">{t.endedTitle}</h1>
          {myEntry && (
            <p className="mt-2 text-lg font-black text-fuchsia-600">
              {t.yourScore}: <CountUp value={myEntry.score} /> {language === "he" ? "נק'" : language === "ar" ? "نقطة" : "pts"}
              {myIndex >= 0 ? ` · ${t.rank(myIndex + 1)}` : ""}
            </p>
          )}
          <p className="mt-1 text-stone-500 font-semibold">{t.endedSub}</p>
          <button
            type="button"
            onClick={() => setView("public-landing")}
            style={{ touchAction: "manipulation" }}
            className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-2xl font-black text-white bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-lg active:scale-95"
          >
            {t.backHome}
          </button>
        </motion.div>
        {helpButton}
      </Shell>
    );
  }

  // ─── Lobby (default / between words) ─────────────────────────────────
  return (
    <Shell dir={dir}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <motion.div
          initial={{ scale: 0.6 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="text-7xl mb-3 flex items-center justify-center"
        >
          <QPAvatar value={avatar} iconSize={72} />
        </motion.div>
        <h1 className="text-3xl font-black text-stone-900">{t.lobbyTitle}</h1>
        <p className="mt-2 text-stone-500 font-semibold max-w-xs mx-auto">{t.lobbySub}</p>
        {myEntry && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md font-black text-stone-700">
            {myIndex === 0 && <Crown size={16} className="text-amber-500" />}
            {t.rank(myIndex + 1)} · {t.points(myEntry.score)}
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span key={i} className="w-2.5 h-2.5 rounded-full bg-fuchsia-400"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      </motion.div>
      {helpButton}
    </Shell>
  );
}

function Shell({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      {children}
    </div>
  );
}
