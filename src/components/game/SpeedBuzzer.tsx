/**
 * SpeedBuzzer — the Kahoot-style answering / locked / result UI extracted
 * from SpeedRoundStudentView, so Word Hunt Arena can pop the EXACT same
 * buzzer when a grab is granted (the grant payload is deliberately shaped
 * like a speed round — see QpArenaGrabGrantedPayload).
 *
 * The PARENT owns the phase machine: this component renders the given
 * phase and reports taps (onSubmit) and clock expiry (onExpired) upward.
 * Internally it guards lock-after-tap per roundId so a double tap / a tap
 * racing the deadline can never submit twice.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Hourglass, Check, X, Loader2, Volume2 } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { SPEED_STUDENT_STRINGS, SPEED_MODE_META } from "../../views/speedRoundStrings";
import type { QpSpeedMode, QpSpeedPromptKind, QpSpeedResultPayload } from "../../core/quickPlayProtocol";

export type SpeedBuzzerPhase = "answering" | "locked" | "result";

/** Big-button colour set per option slot (Kahoot-style). */
export const OPTION_STYLES = [
  "from-rose-500 to-red-600 shadow-rose-500/30",
  "from-indigo-500 to-violet-600 shadow-indigo-500/30",
  "from-amber-500 to-orange-600 shadow-amber-500/30",
  "from-emerald-500 to-teal-600 shadow-emerald-500/30",
];

/** Speak text via the browser's speech synthesis — used for listening mode,
 *  where the student must hear (not see) the word. Kept inline rather than
 *  going through useAudio.speak(wordId) because the student has no wordId,
 *  only the prompt string the host sent. */
export function speakText(text: string) {
  try {
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis?.speak(u);
  } catch { /* TTS unavailable — student just sees nothing to tap-hear */ }
}

export function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display}</span>;
}

export interface SpeedBuzzerProps {
  phase: SpeedBuzzerPhase;
  mode: QpSpeedMode;
  prompt: string;
  promptKind: QpSpeedPromptKind;
  options: string[];
  roundId: string;
  deadlineTs: number;
  roundSeconds: number;
  /** Student tapped an option — parent flips its phase to "locked" and
   *  submits the INDEX over the socket. */
  onSubmit: (choiceIndex: number) => void;
  /** Clock hit zero without a tap — parent flips its phase to "locked". */
  onExpired: () => void;
  /** The SPEED_RESULT for this round; rendered in the "result" phase. */
  result: QpSpeedResultPayload | null;
  /** Chip label next to the mode emoji. Defaults to the Speed Round title
   *  so the original view is pixel-identical; the arena passes its own. */
  title?: string;
  /** Sizing for the outer container — the Speed Round view passes a
   *  full-screen min-height; the arena passes modal-panel sizing. */
  className?: string;
}

export default function SpeedBuzzer({
  phase, mode, prompt, promptKind, options,
  roundId, deadlineTs, roundSeconds,
  onSubmit, onExpired, result,
  title, className = "",
}: SpeedBuzzerProps) {
  const { language, dir } = useLanguage();
  const t = SPEED_STUDENT_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const [secondsLeft, setSecondsLeft] = useState(roundSeconds);
  const answeredRef = useRef(false);
  // New round → unlock the tap guard (the component may be reused across
  // rounds without remounting in the Speed Round flow).
  useEffect(() => { answeredRef.current = false; }, [roundId]);

  // Keep the expiry callback in a ref so the countdown interval doesn't
  // restart every render when the parent passes a fresh closure.
  const onExpiredRef = useRef(onExpired);
  useEffect(() => { onExpiredRef.current = onExpired; }, [onExpired]);

  // Listening mode: speak the prompt once per round, the moment it opens —
  // the student must hear, not see, the word.
  const spokenRoundRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "answering" || promptKind !== "audio") return;
    if (spokenRoundRef.current === roundId) return;
    spokenRoundRef.current = roundId;
    speakText(prompt);
  }, [phase, promptKind, prompt, roundId]);

  // Countdown to the shared deadline; lock at zero (no answer = no submit).
  useEffect(() => {
    if (phase !== "answering") return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadlineTs - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !answeredRef.current) {
        answeredRef.current = true;
        onExpiredRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, deadlineTs, roundId]);

  const handleTap = (index: number) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    onSubmit(index);
  };

  const shell = `flex flex-col bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 ${className}`;

  if (phase === "answering") {
    const isAudio = promptKind === "audio";
    return (
      <div className={`${shell} px-4 py-5`} dir={dir}>
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-sm font-black text-xs text-fuchsia-600">
            {SPEED_MODE_META[mode].emoji} {title ?? t.joinTitle}
          </span>
          <span className={`tabular-nums font-black text-2xl ${secondsLeft <= 3 ? "text-red-600 animate-pulse" : "text-fuchsia-600"}`}>
            {secondsLeft}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center mb-5">
          {isAudio ? (
            <button
              type="button"
              onClick={() => speakText(prompt)}
              style={{ touchAction: "manipulation" }}
              className="inline-flex flex-col items-center gap-2 px-8 py-6 rounded-3xl bg-white shadow-lg active:scale-95 transition"
            >
              <Volume2 size={48} className="text-fuchsia-500" />
              <span className="font-black text-stone-500 text-sm">{t.tapToHear}</span>
            </button>
          ) : (
            // Big enough to read across a desk — long prompts (true/false
            // pairs, phrases) step down so they still fit a phone screen.
            <h2
              className={`font-black text-stone-900 break-words leading-tight ${
                prompt.length > 24 ? "text-3xl sm:text-5xl" : "text-5xl sm:text-7xl"
              }`}
              dir="auto"
            >
              {prompt}
            </h2>
          )}
        </div>

        <div className={`grid gap-3 ${options.length === 2 ? "grid-cols-1" : "grid-cols-2"}`}>
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleTap(i)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`inline-flex items-center justify-center px-4 py-6 rounded-2xl font-black text-white shadow-lg active:scale-[0.97] transition bg-gradient-to-br break-words ${
                opt.length > 18 ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"
              } ${OPTION_STYLES[i % OPTION_STYLES.length]}`}
              dir="auto"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className={`${shell} items-center justify-center px-5`} dir={dir}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <Loader2 size={56} className="text-fuchsia-500 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-black text-stone-900">{t.locked}</h1>
        </motion.div>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────
  if (!result) return null;
  const correct = result.correct;
  const correctOpt = options[result.correctIndex];
  return (
    <div className={`${shell} items-center justify-center px-5`} dir={dir}>
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white shadow-lg mb-3 ${correct ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-rose-500 to-red-600"}`}
        >
          {correct ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}
        </motion.div>
        <h2 className="text-3xl font-black text-stone-900">{correct ? t.correct : t.incorrect}</h2>

        {result.firstCorrect && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.1 }}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm shadow-md"
          >
            {t.first}
          </motion.div>
        )}

        {correct && (
          <p className="mt-3 font-black text-fuchsia-600 text-2xl">
            +<CountUp value={result.roundPoints + result.speedBonus} /> · {t.yourScore} <CountUp value={result.totalScore} />
          </p>
        )}
        {correct && result.speedBonus > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black text-xs">
            ⚡ +{result.speedBonus} {t.speedLabel}
          </div>
        )}
        {!correct && correctOpt && (
          <p className="mt-3 text-sm font-bold text-stone-500">
            {t.correctAnswer}: <span className="text-emerald-600" dir="auto">{correctOpt}</span>
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-stone-400 font-bold text-sm">
          <Hourglass size={16} className="animate-pulse" /> {t.waitingNext}
        </div>
      </motion.div>
    </div>
  );
}
