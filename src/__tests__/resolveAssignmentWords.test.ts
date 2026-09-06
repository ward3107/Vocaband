/**
 * Regression tests for the "student sees the demo list" bug.
 *
 * Symptom reported by teachers: a teacher builds an assignment, sends it
 * to the class, and the student who opens it is served a short list of
 * generic words they were never assigned — indistinguishable, to the
 * teacher, from the public demo's sample words.
 *
 * Root cause chain:
 *   1. The teacher save path resolved its `words` JSONB against
 *      `getCachedVocabulary()?.ALL_WORDS ?? []`. On a cold vocabulary
 *      cache that default is an EMPTY corpus, so the row persisted with
 *      `words: []` (or only the custom words).
 *   2. `resolveAssignmentWords` short-circuited on `if (assignment.words)`
 *      — and `[]` is truthy in JS — so it returned the broken empty list
 *      instead of hydrating from the still-correct `wordIds`.
 *   3. With zero words resolved, the game view fell through to
 *      `GAME_FALLBACK_WORDS` (`SET_2_WORDS.slice(0, 12)`) and the student
 *      played 12 generic Set-2 words against the teacher's assignment.
 *
 * This file locks step 2 — the read-side heal that also repairs rows
 * already written badly to the database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Word } from "../data/vocabulary";
import type { AssignmentData } from "../core/supabase";

const CURRICULUM: Word[] = [
  { id: 1, english: "apple", hebrew: "תפוח", arabic: "تفاحة", level: "Set 1" },
  { id: 2, english: "book", hebrew: "ספר", arabic: "كتاب", level: "Set 1" },
  { id: 3, english: "chair", hebrew: "כיסא", arabic: "كرسي", level: "Set 2" },
] as unknown as Word[];

const CUSTOM_WORD = {
  id: -101,
  english: "photosynthesis",
  hebrew: "פוטוסינתזה",
  arabic: "التمثيل الضوئي",
  level: "Custom",
} as unknown as Word;

// The vocabulary chunk is lazy; stub both the cache accessor and the
// dynamic import so these tests never pull the real 6482-word module.
const getCachedVocabulary = vi.fn();
vi.mock("../hooks/useVocabularyLazy", () => ({
  getCachedVocabulary: () => getCachedVocabulary(),
}));
vi.mock("../data/vocabulary", () => ({
  ALL_WORDS: CURRICULUM,
  SET_1_WORDS: CURRICULUM.filter((w) => w.level === "Set 1"),
  SET_2_WORDS: CURRICULUM.filter((w) => w.level === "Set 2"),
  SET_3_WORDS: [],
  TOPIC_PACKS: [],
}));

import { resolveAssignmentWords } from "../utils/resolveAssignmentWords";

function assignment(over: Partial<AssignmentData>): AssignmentData {
  return {
    id: "a1",
    classId: "c1",
    wordIds: [],
    title: "Unit 3",
    ...over,
  } as AssignmentData;
}

beforeEach(() => {
  getCachedVocabulary.mockReset();
  getCachedVocabulary.mockReturnValue({
    ALL_WORDS: CURRICULUM,
    SET_1_WORDS: CURRICULUM,
    SET_2_WORDS: CURRICULUM,
    SET_3_WORDS: [],
    TOPIC_PACKS: [],
  });
});

describe("resolveAssignmentWords", () => {
  it("hydrates a curriculum assignment from wordIds", async () => {
    const words = await resolveAssignmentWords(assignment({ wordIds: [1, 3] }));
    expect(words.map((w) => w.english)).toEqual(["apple", "chair"]);
  });

  it("returns an embedded custom word list as-is", async () => {
    const words = await resolveAssignmentWords(
      assignment({ wordIds: [], words: [CUSTOM_WORD] }),
    );
    expect(words).toEqual([CUSTOM_WORD]);
  });

  // THE REGRESSION. `[]` is truthy, so the old bare `if (assignment.words)`
  // returned it and the student got zero words -> generic fallback list.
  it("does NOT short-circuit on an empty words array — hydrates from wordIds", async () => {
    const words = await resolveAssignmentWords(
      assignment({ wordIds: [1, 2], words: [] }),
    );
    expect(words.map((w) => w.english)).toEqual(["apple", "book"]);
    expect(words).not.toHaveLength(0);
  });

  // A row written while the cache was cold keeps its custom words but
  // loses the curriculum ones; wordIds still names them, so both halves
  // must come back.
  it("backfills curriculum words missing from a partially-written words array", async () => {
    const words = await resolveAssignmentWords(
      assignment({ wordIds: [1, 2], words: [CUSTOM_WORD] }),
    );
    expect(words.map((w) => w.english).sort()).toEqual([
      "apple",
      "book",
      "photosynthesis",
    ]);
  });

  it("keeps custom words alongside curriculum words (no silent drop)", async () => {
    const words = await resolveAssignmentWords(
      assignment({ wordIds: [3], words: [CUSTOM_WORD] }),
    );
    expect(words.map((w) => w.id)).toContain(-101);
    expect(words.map((w) => w.id)).toContain(3);
  });

  it("returns empty (never a sample list) when the assignment truly has no words", async () => {
    const words = await resolveAssignmentWords(assignment({ wordIds: [], words: [] }));
    expect(words).toEqual([]);
  });

  it("falls back to the dynamic import when the vocabulary cache is cold", async () => {
    getCachedVocabulary.mockReturnValue(null);
    const words = await resolveAssignmentWords(assignment({ wordIds: [2] }));
    expect(words.map((w) => w.english)).toEqual(["book"]);
  });

  it("tolerates an assignment with no wordIds field at all", async () => {
    const words = await resolveAssignmentWords({
      id: "a1",
      classId: "c1",
      title: "legacy",
    } as unknown as AssignmentData);
    expect(words).toEqual([]);
  });
});
