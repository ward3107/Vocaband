/**
 * Subject-aware word lookup.  English assignments reference rows in
 * ALL_WORDS (Word shape), Hebrew assignments reference rows in
 * HEBREW_LEMMAS (HebrewLemma shape) — and the two id spaces are
 * disjoint by convention but the consumer can't tell them apart from
 * the id alone.  Every callsite that resolves "word id -> display
 * text" must know which corpus to read from.
 *
 * Before this helper, the gradebook + analytics views hardcoded
 * `ALL_WORDS.find(w => w.id === wordId)`, which silently returned
 * undefined for every Hebrew lemma id and rendered "Unknown" or empty
 * cells across the board.  Use lookupDisplayWord whenever rendering
 * a word reference whose subject is known from the surrounding
 * assignment / class.
 */

import { ALL_WORDS, type Word } from "./vocabulary";
import { HEBREW_LEMMAS_BY_ID } from "./vocabulary-hebrew";
import type { HebrewLemma } from "./types-hebrew";
import type { VocaId } from "../core/subject";

/** Normalised display surface used by gradebook / analytics rows. */
export interface DisplayWord {
  id: number;
  /** What to show as the primary label (the word itself).
   *  English: word.english.  Hebrew: lemma.lemmaNiqqud (with vowels). */
  primary: string;
  /** What to show as the supporting line (translation or alt form).
   *  English: word.hebrew.  Hebrew: lemma.translationEn. */
  secondary: string;
  /** The underlying source row, in case a caller needs more fields. */
  source: { kind: "english"; word: Word } | { kind: "hebrew"; lemma: HebrewLemma };
}

/**
 * Look up a word by id within the given subject's corpus.  Returns
 * null when the id is unknown — callers should render a "#${id}" or
 * "Unknown word" placeholder rather than crashing.
 *
 * The English lookup uses the lazily-decompressed ALL_WORDS array; on
 * first call this triggers the tuple decode (~6.5k entries) but the
 * result is cached for the lifetime of the page.
 */
export function lookupDisplayWord(
  id: number,
  subject: VocaId,
): DisplayWord | null {
  if (subject === "hebrew") {
    const lemma = HEBREW_LEMMAS_BY_ID.get(id);
    if (!lemma) return null;
    return {
      id: lemma.id,
      primary: lemma.lemmaNiqqud,
      secondary: lemma.translationEn,
      source: { kind: "hebrew", lemma },
    };
  }
  const word = ALL_WORDS.find((w) => w.id === id);
  if (!word) return null;
  return {
    id: word.id,
    primary: word.english,
    secondary: word.hebrew,
    source: { kind: "english", word },
  };
}

/**
 * Lighter-weight variant for components that only need a label string
 * (e.g. MasteryHeatmap dots).  Returns "#${id}" when the lookup misses
 * so the heatmap still renders rather than showing a blank tooltip.
 */
export function getDisplayLabel(id: number, subject: VocaId): string {
  const found = lookupDisplayWord(id, subject);
  return found?.primary ?? `#${id}`;
}
