import { useState } from "react";
import { readQpResumeScore } from "../utils/qpResumeHint";

/**
 * Per-game runtime state for a single play session — the values that
 * change as a student works through a game (current word, running score,
 * mistakes, the per-word attempt batch flushed on finish, and transient
 * input/feedback). Grouped out of the App orchestrator to cut its state
 * density; behavior and initial values are unchanged.
 *
 * Note: `score` seeds from the QP-resume localStorage hint so a rescanning
 * Quick Play student doesn't see their score snap back to 0 (the server
 * still owns the cumulative — see qpCumulativeScoreRef in App).
 */
export function useGameSession() {
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(() => readQpResumeScore());
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [wordAttemptBatch, setWordAttemptBatch] = useState<
    Array<{ word_id: number; is_correct: boolean }>
  >([]);
  const [feedback, setFeedback] = useState<
    "correct" | "wrong" | "show-answer" | null
  >(null);

  return {
    spellingInput, setSpellingInput,
    currentIndex, setCurrentIndex,
    score, setScore,
    mistakes, setMistakes,
    wordAttemptBatch, setWordAttemptBatch,
    feedback, setFeedback,
  };
}
