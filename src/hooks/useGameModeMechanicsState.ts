import { useState } from "react";

export type MatchingPair = { id: number; text: string; type: "english" | "arabic" };
export type SelectedMatch = { id: number; type: "english" | "arabic" };

/**
 * Per-mode mechanics state for the three modes that maintain a richer
 * board than a single answer/index pair.
 *
 * - Matching mode: pairs grid, currently-tapped cell, already-matched
 *   ids, and an in-flight gate for the auto-clear animation.
 * - Letter Sounds: how many letters of the current word have been
 *   revealed (drives the reveal animation).
 * - Sentence Builder: which sentence in the bank we're on, the
 *   shuffled word bank, the player's currently-built sentence, and
 *   the correct/wrong feedback after a check.
 */
export function useGameModeMechanicsState() {
  // Matching mode
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<SelectedMatch | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [isMatchingProcessing, setIsMatchingProcessing] = useState(false);

  // Letter Sounds mode
  const [revealedLetters, setRevealedLetters] = useState(0);

  // Sentence Builder mode
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "wrong" | null>(null);

  return {
    matchingPairs, setMatchingPairs,
    selectedMatch, setSelectedMatch,
    matchedIds, setMatchedIds,
    isMatchingProcessing, setIsMatchingProcessing,
    revealedLetters, setRevealedLetters,
    sentenceIndex, setSentenceIndex,
    availableWords, setAvailableWords,
    builtSentence, setBuiltSentence,
    sentenceFeedback, setSentenceFeedback,
  };
}
