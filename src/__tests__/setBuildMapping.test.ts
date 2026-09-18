/**
 * Unit tests for mapPickerWordsToSetRows — the boundary adapter that
 * turns the shared word picker's in-memory Word[] into vocabulary_set_words
 * rows for the Vocabulary set-builder's save path. This is the one place
 * the picker's data model meets the DB, so its edge cases (blank rows,
 * curriculum vs custom ids, empty translations) are locked here.
 */
import { describe, it, expect } from "vitest";
import type { Word } from "../data/vocabulary";
import { mapPickerWordsToSetRows } from "../views/library/setBuildMapping";

const word = (over: Partial<Word> & { id: number; english: string }): Word =>
  ({ hebrew: "", arabic: "", level: "Custom", ...over } as unknown as Word);

describe("mapPickerWordsToSetRows", () => {
  it("maps english/hebrew/arabic and trims surrounding whitespace", () => {
    const rows = mapPickerWordsToSetRows([
      word({ id: 5, english: "  apple ", hebrew: " תפוח ", arabic: " تفاحة " }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ position: 0, english: "apple", hebrew: "תפוח", arabic: "تفاحة" });
  });

  it("links curriculum words (positive id) via curriculumWordId", () => {
    const [row] = mapPickerWordsToSetRows([word({ id: 42, english: "book" })]);
    expect(row.curriculumWordId).toBe(42);
  });

  it("stores null curriculumWordId for custom (negative) and 0-id words", () => {
    const rows = mapPickerWordsToSetRows([
      word({ id: -101, english: "photosynthesis" }),
      word({ id: 0, english: "zero" }),
    ]);
    expect(rows[0].curriculumWordId).toBeNull();
    expect(rows[1].curriculumWordId).toBeNull();
  });

  it("persists empty / whitespace-only translations as null, never an empty string", () => {
    const [row] = mapPickerWordsToSetRows([word({ id: 1, english: "x", hebrew: "   ", arabic: "" })]);
    expect(row.hebrew).toBeNull();
    expect(row.arabic).toBeNull();
  });

  it("drops blank-english rows and re-indexes positions gap-free", () => {
    const rows = mapPickerWordsToSetRows([
      word({ id: 1, english: "one" }),
      word({ id: 2, english: "   " }), // blank -> dropped
      word({ id: 3, english: "three" }),
    ]);
    expect(rows.map((r) => r.english)).toEqual(["one", "three"]);
    expect(rows.map((r) => r.position)).toEqual([0, 1]);
  });

  it("emits the fixed scaffolding fields (null columns + empty metadata)", () => {
    const [row] = mapPickerWordsToSetRows([word({ id: 1, english: "x" })]);
    expect(row.partOfSpeech).toBeNull();
    expect(row.difficulty).toBeNull();
    expect(row.audioUrl).toBeNull();
    expect(row.metadata).toEqual({});
  });

  it("returns an empty array when every word is blank", () => {
    expect(mapPickerWordsToSetRows([word({ id: 1, english: "  " })])).toEqual([]);
  });
});
