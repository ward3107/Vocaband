import { useState, useEffect } from "react";
import { ACTIVE_VOCA_KEY, type VocaId } from "../core/subject";

/**
 * Which Voca the teacher is currently working in.  null until they pick
 * (or are auto-picked into) one.  Persisted across same-tab refreshes
 * via sessionStorage so we don't pop the picker again.
 */
export function useActiveVocaState() {
  const [activeVoca, setActiveVoca] = useState<VocaId | null>(() => {
    try {
      const raw = sessionStorage.getItem(ACTIVE_VOCA_KEY);
      return raw === "english" || raw === "hebrew" ? raw : null;
    } catch { return null; }
  });

  useEffect(() => {
    try {
      if (activeVoca) sessionStorage.setItem(ACTIVE_VOCA_KEY, activeVoca);
      else sessionStorage.removeItem(ACTIVE_VOCA_KEY);
    } catch { /* sessionStorage may be blocked; non-fatal */ }
  }, [activeVoca]);

  return [activeVoca, setActiveVoca] as const;
}
