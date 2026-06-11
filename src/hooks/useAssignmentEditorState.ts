import { useState } from "react";
import type { Word } from "../data/vocabulary";

/**
 * The word-selection core of the create-assignment editor: which catalogue
 * words are picked, which Set/Custom tier is active, and any teacher-supplied
 * custom words. They are chosen together while building a task and reset
 * together when the editor closes, so they share one hook.
 *
 * Kept separate from useAssignmentBuilderState because the two clusters sit
 * on opposite sides of the unrelated OCR/scores teacher-data state in the
 * orchestrator — merging them would reorder hook calls (Rules of Hooks).
 */
export function useAssignmentEditorState() {
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"Set 1" | "Set 2" | "Custom">("Set 1");
  const [customWords, setCustomWords] = useState<Word[]>([]);
  return {
    selectedWords, setSelectedWords,
    selectedLevel, setSelectedLevel,
    customWords, setCustomWords,
  };
}
