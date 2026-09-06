/**
 * Sentence Builder must never show a student a sentence about a different
 * word than the one their teacher assigned.
 *
 * SENTENCE_BANK is keyed by word id, but its keys were written against a
 * different numbering than ALL_WORDS uses (they look like 1-based
 * positions in an alphabetically sorted list). Not one of its 115 entries
 * lands on the word it describes: id 1 is "in a hurry" but carries "I know
 * a little bit about cooking" — a sentence for "a little bit", id 13 — and
 * 16 keys name ids that do not exist at all.
 *
 * getSentencesForWord now validates that a hand-written sentence actually
 * contains the word it is meant to teach, and falls through to the
 * template generator (which substitutes the real word) when it does not.
 * These tests pin that invariant for the whole corpus, so re-keying the
 * bank later is verifiable rather than hopeful.
 */
import { describe, it, expect } from "vitest";
import { getSentencesForWord } from "../data/sentence-bank";
import { ALL_WORDS, SET_1_WORDS } from "../data/vocabulary";
import type { Word } from "../data/vocabulary";

/** Mirrors the guard's tolerance: exact phrase, or a light stem match. */
function demonstrates(sentence: string, english: string): boolean {
  const s = sentence.toLowerCase();
  const w = english.toLowerCase().trim();
  if (s.includes(w)) return true;
  if (!w.includes(" ") && w.length >= 5) {
    const stem = w.replace(/(y|e)$/, "");
    if (stem.length >= 4 && new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(s)) {
      return true;
    }
  }
  return false;
}

describe("sentence bank integrity", () => {
  // The regression itself, pinned to the exact pair that exposed it.
  it("does not serve a sentence about a different word (id 1 = 'in a hurry')", () => {
    const inAHurry = ALL_WORDS.find(w => w.id === 1);
    expect(inAHurry?.english).toBe("in a hurry");

    const sentences = getSentencesForWord(inAHurry as Word, 2);
    expect(sentences.length).toBeGreaterThan(0);
    for (const s of sentences) {
      expect(s.toLowerCase()).not.toContain("a little bit about cooking");
      expect(demonstrates(s, "in a hurry")).toBe(true);
    }
  });

  // The invariant, across the whole Set 1 corpus and all four levels.
  it("every sentence it returns demonstrates the requested word", () => {
    const sample = SET_1_WORDS.slice(0, 400);
    const offenders: string[] = [];

    for (const word of sample) {
      for (const difficulty of [1, 2, 3, 4] as const) {
        for (const s of getSentencesForWord(word, difficulty)) {
          if (!demonstrates(s, word.english)) {
            offenders.push(`[L${difficulty}] "${word.english}" (id ${word.id}) -> "${s}"`);
          }
        }
      }
    }

    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it("always returns at least one sentence for every word", () => {
    const empty = SET_1_WORDS.slice(0, 400).filter(
      w => getSentencesForWord(w, 2).length === 0,
    );
    expect(empty.map(w => w.english)).toEqual([]);
  });
});
