import { useState } from "react";

export type TargetLanguage = "hebrew" | "arabic";

const TARGET_LANG_KEY = "vocaband_target_lang";

/**
 * Which non-English language the student is currently learning toward.
 * Persisted to localStorage so the choice survives reloads.
 * `hasChosenLanguage` is true if a value was written before — drives
 * the first-time language picker gate.
 */
export function useTargetLanguageState() {
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(() => {
    try {
      return (localStorage.getItem(TARGET_LANG_KEY) as TargetLanguage) || "hebrew";
    } catch { return "hebrew"; }
  });
  const [hasChosenLanguage, setHasChosenLanguage] = useState(() => {
    try { return !!localStorage.getItem(TARGET_LANG_KEY); } catch { return false; }
  });
  return {
    targetLanguage, setTargetLanguage,
    hasChosenLanguage, setHasChosenLanguage,
  };
}
