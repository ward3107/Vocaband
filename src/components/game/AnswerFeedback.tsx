import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * AnswerFeedback — shared celebration / commiseration layer for quiz
 * cards (open-issues §C: 9–13yo kids need a bigger payoff than a border
 * colour change).
 *
 * Correct: a "+N XP" badge springs in over the prompt and floats up
 * while emoji sparkles burst outward. Screen-level confetti is already
 * fired by `celebrate('small')` in useGameModeActions, so this layer
 * only adds the local, on-card payoff that ties the reward to the tap.
 *
 * Wrong: the HOST card shakes via `cardShake` below (the shake must
 * move the whole card, so it can't live inside this overlay). The
 * correct answer is deliberately NOT revealed on a wrong tap — the
 * multiple-choice flow gives 3 attempts per word, and the existing
 * show-answer state (amber ring) takes over once they're exhausted.
 *
 * Everything is pointer-events-none and aria-hidden: purely visual,
 * never intercepts the next tap, never read by screen readers (the
 * ✓/✗ button states carry the accessible signal).
 */

export type AnswerFeedbackKind = "correct" | "wrong" | "show-answer" | null;

interface AnswerFeedbackProps {
  feedback: AnswerFeedbackKind;
  /** Points the correct tap just earned — the multiple-choice scoring
   *  path awards a flat 10 per word (useGameModeActions.handleAnswer). */
  xpGain?: number;
}

/** Sparkle burst targets, relative to the XP badge centre. Hand-placed
 *  rather than computed so the spread reads organic, not mechanical. */
const SPARKLES = [
  { x: -72, y: -48, emoji: "✨" },
  { x: 74, y: -54, emoji: "⭐" },
  { x: -98, y: 4, emoji: "🌟" },
  { x: 96, y: -2, emoji: "✨" },
  { x: -44, y: -88, emoji: "⭐" },
  { x: 48, y: -84, emoji: "🌟" },
];

/** Keyframe payload for the host card's `animate` prop — shakes the
 *  whole card on a wrong tap. Lives here (not in the host) so every
 *  quiz surface that adopts AnswerFeedback shares one motion grammar.
 *  Pass the host's `useReducedMotion()` result; reduced-motion users
 *  keep the colour change without the jolt. */
export const cardShake = (
  feedback: AnswerFeedbackKind,
  reduceMotion: boolean | null,
): { opacity: number; x: number | number[] } =>
  feedback === "wrong" && !reduceMotion
    ? { opacity: 1, x: [0, -10, 10, -7, 7, -3, 3, 0] }
    : { opacity: 1, x: 0 };

/** Transition matching `cardShake`'s keyframes — fits comfortably inside
 *  the 1.5s wrong-feedback window before the form re-enables. */
export const cardShakeTransition = (
  feedback: AnswerFeedbackKind,
  reduceMotion: boolean | null,
): { duration: number } | undefined =>
  feedback === "wrong" && !reduceMotion ? { duration: 0.45 } : undefined;

export default function AnswerFeedback({ feedback, xpGain = 10 }: AnswerFeedbackProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {feedback === "correct" && (
          <motion.div
            key="xp-burst"
            className="absolute inset-x-0 top-[28%] flex items-center justify-center"
            initial={{ opacity: 0, y: 14, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: reduceMotion ? 0 : -52,
              scale: 1.05,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {/* dir="ltr" pins "+10 XP" so it never bidi-flips to "XP 10+"
                when the UI is Hebrew/Arabic. */}
            <span
              dir="ltr"
              className="relative px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xl sm:text-2xl shadow-lg shadow-amber-500/30"
            >
              +{xpGain} XP
              {!reduceMotion &&
                SPARKLES.map((s, i) => (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 text-lg sm:text-xl"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                    animate={{ x: s.x, y: s.y, opacity: 0, scale: 1.2 }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 * i }}
                  >
                    {s.emoji}
                  </motion.span>
                ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
