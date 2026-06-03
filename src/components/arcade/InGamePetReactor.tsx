/**
 * InGamePetReactor — a miniature companion pet that reacts to answers
 * during a game, so play feels "companion-led".  Mounted in the corner
 * of GameActiveView only when the arcade_hub flag is on.
 *
 *   correct (combo < 5) → jump + one rising ✨
 *   correct (combo ≥ 5) → full 360° spin
 *   wrong / show-answer  → head dip
 *
 * The stage emoji is sourced upstream (from useRetention's
 * currentPetStage) and handed in as a prop — we never fetch it here.
 * Reactions run via useAnimationControls so each keyframe fires once on
 * a feedback transition, not on every render.  Under reduced motion the
 * pet renders static with no reactions or sparkle.
 */
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface InGamePetReactorProps {
  stageEmoji: string;
  feedback: "correct" | "wrong" | "show-answer" | null;
  comboChain: number;
  isFinished: boolean;
}

export default function InGamePetReactor({
  stageEmoji,
  feedback,
  comboChain,
  isFinished,
}: InGamePetReactorProps) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const [sparkles, setSparkles] = useState<number[]>([]);
  const sparkleId = useRef(0);
  // Latest combo value, read at the instant a "correct" transition
  // fires (the effect depends only on `feedback`, so it can't list
  // comboChain without re-firing on every combo change).
  const comboRef = useRef(comboChain);
  comboRef.current = comboChain;

  // Fire the matching keyframe on each feedback transition. Skipped
  // entirely under reduced motion.
  useEffect(() => {
    if (reduced || isFinished || !feedback) return;
    if (feedback === "correct") {
      if (comboRef.current >= 5) {
        void controls.start({
          rotate: [0, 360],
          scale: [1, 1.3, 1],
          transition: { duration: 0.6, ease: "easeInOut" },
        });
      } else {
        void controls.start({
          y: [0, -16, 0],
          transition: { duration: 0.5, ease: "easeInOut" },
        });
        const id = sparkleId.current++;
        setSparkles((prev) => [...prev, id]);
      }
    } else {
      // wrong | show-answer → head dip
      void controls.start({
        y: [0, 4, 0],
        rotate: [0, -10, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      });
    }
    // Only re-run on a feedback transition — comboChain is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  if (isFinished) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-30 h-12 w-12">
      <motion.div
        animate={controls}
        className="flex h-12 w-12 items-center justify-center text-4xl drop-shadow-lg"
      >
        {stageEmoji}
      </motion.div>

      {/* Rising sparkle(s) — emitted on a non-combo correct, removed once
          the float-up finishes. Never rendered under reduced motion. */}
      {!reduced &&
        sparkles.map((id) => (
          <motion.span
            key={id}
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl"
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -30, opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() =>
              setSparkles((prev) => prev.filter((x) => x !== id))
            }
          >
            ✨
          </motion.span>
        ))}
    </div>
  );
}
