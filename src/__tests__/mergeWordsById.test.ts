/**
 * Unit tests for mergeWordsById — the dedup-merge behind Hot Seat's
 * "seed from a saved assignment" convenience. Seeding must be additive
 * and idempotent: pulling in an assignment that overlaps the current
 * picker selection (or pulling the same one twice) must never duplicate
 * a word, or the pass-around game would show the same word twice.
 */
import { describe, it, expect } from "vitest";
import type { Word } from "../data/vocabulary";
import { mergeWordsById } from "../utils/mergeWordsById";

const w = (id: number, english = `w${id}`): Word =>
  ({ id, english, hebrew: "", arabic: "", level: "Custom" } as unknown as Word);

describe("mergeWordsById", () => {
  it("appends new ids after the existing selection, in order", () => {
    expect(mergeWordsById([w(1), w(2)], [w(3), w(4)]).map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });

  it("drops incoming ids already in the current selection", () => {
    expect(mergeWordsById([w(1), w(2)], [w(2), w(3)]).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("de-dupes ids repeated within the incoming list", () => {
    expect(mergeWordsById([w(1)], [w(2), w(2), w(3)]).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("keeps the current object on a collision (current wins)", () => {
    const cur = w(1, "keep");
    const out = mergeWordsById([cur], [w(1, "discard")]);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(cur);
    expect(out[0].english).toBe("keep");
  });

  it("returns the SAME current reference when nothing is added", () => {
    const cur = [w(1), w(2)];
    expect(mergeWordsById(cur, [w(1)])).toBe(cur);
    expect(mergeWordsById(cur, [])).toBe(cur);
  });

  it("returns a de-duped incoming list when current is empty", () => {
    expect(mergeWordsById([], [w(5), w(5), w(6)]).map((x) => x.id)).toEqual([5, 6]);
  });

  it("supports negative (custom) ids alongside positive ones", () => {
    expect(mergeWordsById([w(1)], [w(-101), w(-101), w(2)]).map((x) => x.id)).toEqual([1, -101, 2]);
  });
});
