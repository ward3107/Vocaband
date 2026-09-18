import type { Word } from "../../data/vocabulary";
import type { VocabularySetWord } from "../../core/supabase";

/** A `vocabulary_set_words` row ready for `addWordsToSet` — the server
 *  assigns id / setId / timestamps. */
export type NewSetWord = Omit<VocabularySetWord, "id" | "setId" | "createdAt" | "updatedAt">;

/**
 * Map the word picker's in-memory `Word[]` to `vocabulary_set_words` rows.
 *
 * - Blank-english words are dropped, so a half-typed custom row never
 *   persists an empty entry.
 * - Positions are recomputed 0..n-1 AFTER filtering, so the stored order
 *   is gap-free even when blanks were removed from the middle.
 * - Curriculum words (positive id) keep their `curriculumWordId` link;
 *   custom words (negative synthesized id, or the 0 sentinel) store null
 *   there but still carry their english/hebrew/arabic into the set.
 * - Empty / whitespace-only translations persist as null, never "".
 */
export function mapPickerWordsToSetRows(words: Word[]): NewSetWord[] {
  return words
    .filter((w) => w.english.trim().length > 0)
    .map((w, idx) => ({
      position: idx,
      english: w.english.trim(),
      hebrew: (w.hebrew ?? "").trim() || null,
      arabic: (w.arabic ?? "").trim() || null,
      partOfSpeech: null,
      difficulty: null,
      curriculumWordId: w.id > 0 ? w.id : null,
      audioUrl: null,
      metadata: {},
    }));
}
