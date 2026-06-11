/**
 * ArenaStudentView — the student side of Word Hunt Arena, from join to
 * play. A sibling of SpeedRoundStudentView; reuses its join / rejoin /
 * back-trap / error plumbing verbatim. Play is different: the student
 * steers an avatar around the shared map (ArenaCanvas + ArenaJoystick) —
 * or just taps a word and the avatar runs to it; reaching a word
 * auto-grabs it, and a granted grab pops the SHARED
 * Speed Round buzzer as a modal overlay (the grant payload is shaped like
 * a speed round on purpose — answers go back via submitSpeedAnswer).
 *
 *   join → lobby → playing ⇄ (buzzer: answering → locked → result) →
 *   playing … until the teacher ends the arena (podium) or the session.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, ArrowRight, Loader2, Zap } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import QPAvatarPicker from "../components/QPAvatarPicker";
import QPAvatar from "../components/QPAvatar";
import QuickPlayHelpButton from "../components/QuickPlayHelpButton";
import QuickPlayErrorScreen from "../components/QuickPlayErrorScreen";
import SpeedBuzzer, { CountUp, type SpeedBuzzerPhase } from "../components/game/SpeedBuzzer";
import ArenaCanvas from "../components/game/ArenaCanvas";
import ArenaJoystick, { type ArenaInputVector } from "../components/game/ArenaJoystick";
import { celebrate } from "../utils/celebrate";
import { primeAudio } from "../utils/primeAudio";
import { playGood, playGentle, playFanfare } from "../utils/raceSfx";
import { containsProfanity } from "../utils/nicknameProfanity";
import {
  QP_ARENA_WIDTH, QP_ARENA_HEIGHT, QP_ARENA_CLIENT_TICK_MS,
  type QpArenaGrabGrantedPayload, type QpSpeedResultPayload,
} from "../core/quickPlayProtocol";
import type { View } from "../core/views";
import { ARENA_STUDENT_STRINGS } from "./arenaStrings";

interface ArenaStudentViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

type Phase = "join" | "lobby" | "playing" | "ended" | "kicked";

const DEFAULT_AVATAR = "🦊";
const ARENA_GUEST_KEY = "vocaband_arena_guest";

export default function ArenaStudentView({ sessionCode, setView }: ArenaStudentViewProps) {
  const { language, dir } = useLanguage();
  const t = ARENA_STUDENT_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const {
    currentArena, arenaPositionsRef, leaderboard, clientId, joinedSessionCode, lastError,
    joinAsStudent, sendArenaMove, requestGrab, submitSpeedAnswer, sendReaction,
    onArenaGrabGranted, onArenaGrabDenied, onArenaEnded, onSpeedResult, onSessionEnded, onKicked,
  } = qp;

  const forgetGame = useCallback(() => {
    try { sessionStorage.removeItem(ARENA_GUEST_KEY); } catch { /* storage unavailable */ }
    try { window.history.replaceState({}, "", window.location.pathname); } catch { /* history unavailable */ }
  }, []);

  const [phase, setPhase] = useState<Phase>("join");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Set by ARENA_ENDED (teacher closed THIS arena, session still alive) —
  // shows the mini-podium until a new arena starts.
  const [arenaOver, setArenaOver] = useState(false);

  // Buzzer overlay — present while a granted grab is being answered.
  const [grant, setGrant] = useState<QpArenaGrabGrantedPayload | null>(null);
  const [buzzerPhase, setBuzzerPhase] = useState<SpeedBuzzerPhase>("answering");
  const [buzzerResult, setBuzzerResult] = useState<QpSpeedResultPayload | null>(null);
  const [deniedToast, setDeniedToast] = useState<string | null>(null);

  // Movement plumbing — refs, never state (read at 60fps / sent at 10/sec).
  const inputRef = useRef<ArenaInputVector>({ dx: 0, dy: 0 });
  const selfPosRef = useRef({ x: QP_ARENA_WIDTH / 2, y: QP_ARENA_HEIGHT / 2 });

  // ─── Phone back-button trap (verbatim from Speed Round) ─────────────
  useEffect(() => {
    window.history.pushState({ view: "word-hunt-arena-student" }, "");
    const handler = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      window.history.pushState({ view: "word-hunt-arena-student" }, "");
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- socket join confirmation; matches Speed Round convention
      setJoining(false);
      setPhase("lobby");
      try {
        sessionStorage.setItem(ARENA_GUEST_KEY, JSON.stringify({ sessionCode, name: name.trim(), avatar }));
      } catch { /* storage unavailable */ }
    }
  }, [joining, joinedSessionCode, sessionCode, name, avatar]);

  // Auto-rejoin after a refresh.
  const autoRejoinedRef = useRef(false);
  useEffect(() => {
    if (autoRejoinedRef.current) return;
    autoRejoinedRef.current = true;
    try {
      const saved = sessionStorage.getItem(ARENA_GUEST_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { sessionCode?: string; name?: string; avatar?: string };
      if (parsed.sessionCode !== sessionCode || !parsed.name) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot replay of a saved join on refresh; matches Speed Round convention
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to a socket error payload; matches Speed Round convention
    setJoining(false);
    setPhase("join");
    setJoinError(
      lastError.code === "nickname_taken" ? t.nameTaken
      : lastError.code === "kicked" ? t.kicked
      : t.joinFailed,
    );
  }, [lastError, phase, t]);

  // ─── Arena lifecycle ────────────────────────────────────────────────
  const arenaActive = !!currentArena;
  useEffect(() => {
    // Only the lobby⇄playing pair may auto-transition — a kicked / ended
    // student must never be pulled back onto the map by a live arena.
    if (phase !== "lobby" && phase !== "playing") return;
    if (arenaActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- server-pushed arena start flips local play state
      setArenaOver(false);
      setPhase("playing");
    }
  }, [arenaActive, phase]);

  useEffect(() => onArenaEnded(() => {
    setGrant(null);
    setArenaOver(true);
    setPhase(prev => (prev === "playing" ? "lobby" : prev));
    celebrate("normal");
  }), [onArenaEnded]);

  // ─── Position send loop — 10/sec, only when changed, paused by buzzer ─
  useEffect(() => {
    if (phase !== "playing" || !arenaActive || grant) return;
    let lastX = -1, lastY = -1;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const x = Math.round(selfPosRef.current.x);
      const y = Math.round(selfPosRef.current.y);
      if (x === lastX && y === lastY) return; // idle — skip the tick
      lastX = x; lastY = y;
      sendArenaMove(x, y);
    }, QP_ARENA_CLIENT_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, arenaActive, grant, sendArenaMove]);

  // ─── Grab → buzzer → result ─────────────────────────────────────────
  useEffect(() => onArenaGrabGranted((p) => {
    setGrant(p);
    setBuzzerResult(null);
    setBuzzerPhase("answering");
    playGood();
  }), [onArenaGrabGranted]);

  useEffect(() => onArenaGrabDenied((p) => {
    setDeniedToast(
      p.reason === "out_of_range" ? t.deniedRange
      : p.reason === "cooldown" ? t.deniedCooldown
      : p.reason === "already_locked" ? t.deniedLocked
      : t.deniedGone,
    );
  }), [onArenaGrabDenied, t]);

  useEffect(() => {
    if (!deniedToast) return;
    const id = window.setTimeout(() => setDeniedToast(null), 1600);
    return () => window.clearTimeout(id);
  }, [deniedToast]);

  useEffect(() => onSpeedResult((p) => {
    setBuzzerResult(p);
    setBuzzerPhase("result");
    if (p.correct) { celebrate("small"); playGood(); } else { playGentle(); }
  }), [onSpeedResult]);

  // Result shows briefly, then back to the hunt (the word flips to
  // "answered" on the map via ARENA_WORD).
  useEffect(() => {
    if (buzzerPhase !== "result" || !buzzerResult) return;
    const id = window.setTimeout(() => { setGrant(null); }, 2500);
    return () => window.clearTimeout(id);
  }, [buzzerPhase, buzzerResult]);

  // Safety net: locked but no SPEED_RESULT within 6s — back to the map.
  useEffect(() => {
    if (buzzerPhase !== "locked" || !grant) return;
    const id = window.setTimeout(() => { setGrant(null); }, 6000);
    return () => window.clearTimeout(id);
  }, [buzzerPhase, grant]);

  useEffect(() => onSessionEnded(() => {
    setGrant(null);
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
          className="w-full max-w-sm rounded-[32px] bg-white shadow-2xl shadow-indigo-500/20 border border-indigo-100 p-7"
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🏟️</div>
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
            className="w-full bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-indigo-400 outline-none px-5 py-4 text-xl font-bold text-stone-900 placeholder-stone-300 text-center transition"
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
            className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-lg text-white shadow-lg transition ${canContinue && !joining ? "bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-500/30 active:scale-[0.98]" : "bg-stone-300 cursor-not-allowed"}`}
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

  // ─── Kicked / ended ───────────────────────────────────────────────────
  if (phase === "kicked") {
    return (
      <Shell dir={dir}>
        <QuickPlayErrorScreen kind="kicked" onPrimary={() => setView("public-landing")} />
      </Shell>
    );
  }
  if (phase === "ended") {
    return (
      <Shell dir={dir}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-7xl mb-3">{myIndex === 0 ? "🥇" : myIndex === 1 ? "🥈" : myIndex === 2 ? "🥉" : "🎉"}</div>
          <h1 className="text-3xl font-black text-stone-900">{t.endedTitle}</h1>
          {myEntry && (
            <p className="mt-2 text-lg font-black text-indigo-600">
              {t.yourScore}: <CountUp value={myEntry.score} /> {language === "he" ? "נק'" : language === "ar" ? "نقطة" : "pts"}
              {myIndex >= 0 ? ` · ${t.rank(myIndex + 1)}` : ""}
            </p>
          )}
          <p className="mt-1 text-stone-500 font-semibold">{t.endedSub}</p>
          <button
            type="button"
            onClick={() => setView("public-landing")}
            style={{ touchAction: "manipulation" }}
            className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg active:scale-95"
          >
            {t.backHome}
          </button>
        </motion.div>
        {helpButton}
      </Shell>
    );
  }

  // ─── Playing: the map + joystick + HUD + buzzer overlay ──────────────
  if (phase === "playing" && currentArena) {
    return (
      <div className="h-[100dvh] flex flex-col px-3 py-3 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 overflow-hidden" dir={dir}>
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-sm font-black text-xs text-indigo-600">
            🏟️ {t.joinTitle}
          </span>
          {myEntry && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-sm font-black text-xs text-stone-700">
              {myIndex === 0 && <Crown size={13} className="text-amber-500" />}
              {t.rank(myIndex + 1)} · {t.hudScore} <CountUp value={myEntry.score} />
            </span>
          )}
        </div>

        {/* fill — the 10:7 letterbox used only ~39% of a portrait phone
            (see ArenaCanvas.fill); the map now takes every pixel between
            the HUD and the bottom edge, with the joystick overlaying it. */}
        <div className="relative flex-1 min-h-0">
          <ArenaCanvas
            arena={currentArena}
            positionsRef={arenaPositionsRef}
            leaderboard={leaderboard}
            selfClientId={clientId}
            inputRef={inputRef}
            selfPosRef={selfPosRef}
            onGrab={(wordId, x, y) => requestGrab(wordId, x, y)}
            isPaused={!!grant}
            fill
          />
          <ArenaJoystick inputRef={inputRef} disabled={!!grant} />

          <AnimatePresence>
            {deniedToast && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-stone-900/80 text-white font-black text-sm shadow-lg whitespace-nowrap"
              >
                <Zap size={14} className="inline -mt-0.5 me-1 text-amber-400" />{deniedToast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Granted grab → the shared Speed Round buzzer as a modal. */}
        <AnimatePresence>
          {grant && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3"
              role="dialog"
            >
              <motion.div
                initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="w-full max-w-md max-h-[85dvh] rounded-3xl overflow-hidden shadow-2xl"
              >
                <SpeedBuzzer
                  phase={buzzerPhase}
                  mode={grant.mode}
                  prompt={grant.prompt}
                  promptKind={grant.promptKind}
                  options={grant.options}
                  roundId={grant.roundId}
                  deadlineTs={grant.deadlineTs}
                  roundSeconds={grant.roundSeconds}
                  onSubmit={(i) => { setBuzzerPhase("locked"); submitSpeedAnswer(grant.roundId, i); }}
                  onExpired={() => setGrant(null)}
                  result={buzzerResult}
                  title={t.joinTitle}
                  className="min-h-[60dvh]"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {helpButton}
      </div>
    );
  }

  // ─── Lobby / arena-over (waiting for the teacher) ─────────────────────
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
        <h1 className="text-3xl font-black text-stone-900">{arenaOver ? t.arenaOverTitle : t.lobbyTitle}</h1>
        <p className="mt-2 text-stone-500 font-semibold max-w-xs mx-auto">{arenaOver ? t.arenaOverSub : t.lobbySub}</p>
        {myEntry && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md font-black text-stone-700">
            {myIndex === 0 && <Crown size={16} className="text-amber-500" />}
            {t.rank(myIndex + 1)} · {t.points(myEntry.score)}
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-400"
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
    <div className="min-h-[100dvh] flex items-center justify-center px-5 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50" dir={dir}>
      {children}
    </div>
  );
}
