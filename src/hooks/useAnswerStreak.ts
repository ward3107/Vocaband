/**
 * useAnswerStreak — consecutive-correct counter for the current round
 * (open-issues §C: "No streak indicator").
 *
 * Distinct from the two existing streak-ish signals:
 *   - `streak` (GameHeader chip) is the student's persisted daily
 *     streak from users.streak — it doesn't move per answer.
 *   - useCombo is gated behind the arcade_hub flag and drives an XP
 *     multiplier; this hook is always-on and purely visual.
 *
 * Counts by watching the shared `feedback` transitions every
 * orchestrated mode emits (correct / wrong / show-answer / null), so
 * it works for any mode that flows through useGameModeActions without
 * per-mode wiring. Matching / memory-flip don't emit feedback, so the
 * caller simply doesn't render the badge for them.
 *
 * Uses the adjust-state-during-render pattern (not an effect) so the
 * count updates in the same render pass the feedback lands — and to
 * satisfy react-hooks/set-state-in-effect.
 */
import { useState } from "react";

type Feedback = "correct" | "wrong" | "show-answer" | null;

export function useAnswerStreak(
  feedback: Feedback,
  gameMode: string,
  isFinished: boolean,
): number {
  const [count, setCount] = useState(0);
  // Fresh round = fresh streak: a mode switch or the results screen
  // must not carry a hot streak into the next game.
  const roundKey = `${gameMode}|${isFinished}`;
  const [prev, setPrev] = useState({ feedback, roundKey });

  if (prev.roundKey !== roundKey || prev.feedback !== feedback) {
    setPrev({ feedback, roundKey });
    if (prev.roundKey !== roundKey) {
      setCount(0);
    } else if (feedback === "correct") {
      // feedback returns to null between words, so each answer produces
      // exactly one non-null transition — safe to count without dedupe.
      setCount(count + 1);
    } else if (feedback === "wrong" || feedback === "show-answer") {
      setCount(0);
    }
  }

  return count;
}
