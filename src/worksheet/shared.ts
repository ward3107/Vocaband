/**
 * Small helpers reused across exercise components.  Kept here so each
 * exercise file stays focused on its own UI/state and we don't duplicate
 * Fisher-Yates + translation lookups thirteen times.
 */
import type { Word } from "../data/vocabulary";
import type { Language } from "./types";

// Mount-time randomisation, not per-render — callers should put the
// result behind useState(() => shuffle(...)) so React doesn't re-shuffle
// on every paint and break in-flight selections.
export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Falls back to the English text when the requested translation is
// missing.  Avoids showing an empty tile / option which would silently
// reveal which row had no translation in the bundle.
export const translationFor = (w: Word, lang: Language): string => {
  if (lang === "he") return w.hebrew || w.english;
  if (lang === "ar") return w.arabic || w.english;
  return w.english;
};

// Combining diacritical marks (U+0300–U+036F).  NFD decomposition
// splits e.g. "é" into "e" + this mark, so stripping the range gives a
// plain-ASCII comparison form.
const DIACRITICS = /[̀-ͯ]/g;

// "Normalise for comparison" — accents removed, casing/whitespace folded.
// Used by typed-answer exercises so a student who types "apple " with a
// trailing space or "Apple" with a capital still gets credit.
export const normaliseAnswer = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .trim()
    .replace(/\s+/g, " ");
