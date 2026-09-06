/**
 * The game's word-recovery chain, extracted as a pure function so the
 * ordering and the identity guarantees can be tested without mounting the
 * whole orchestrator.
 *
 * Two things matter here, and only one of them is about contents:
 *
 * 1. ORDER — a Quick Play session's words beat an assignment's, an
 *    assignment's embedded `words` are unioned with its hydrated
 *    `wordIds` (a partially-written `words` JSONB is the exact damage the
 *    cold-vocabulary-cache save bug produced), and the generic Set-2
 *    sample is only ever the last resort.
 *
 * 2. IDENTITY — `gameWords` sits in the dependency array of
 *    useGameModeSetup's Matching / Memory Flip setup effect, which calls
 *    setMatchingPairs, and of useGameRoundOptions' option-shuffling memos.
 *    A fresh array identity on every render re-runs a state-setting effect
 *    every render (an unbounded loop) and reshuffles the multiple-choice
 *    options and the True/False statement under the student's finger.
 *
 * These tests mirror the memoized implementation in useAppController.
 */
import { describe, it, expect } from "vitest";
import type { Word } from "../data/vocabulary";

const w = (id: number, english: string): Word =>
  ({ id, english, hebrew: "", arabic: "", level: "Set 1" }) as unknown as Word;

const CURRICULUM = [w(1, "apple"), w(2, "book"), w(3, "chair"), w(4, "desk")];
const CUSTOM = w(-77, "photosynthesis");
const FALLBACK = [w(900, "generic-1"), w(901, "generic-2")];

/** Mirrors useAppController's assignmentIdWords memo. */
function hydrateIds(wordIds: number[] | undefined, allWords: Word[]): Word[] {
  if (!wordIds || wordIds.length === 0 || allWords.length === 0) return [];
  const wanted = new Set(wordIds);
  return allWords.filter(x => wanted.has(x.id));
}

/** Mirrors useAppController's recoveredSessionWords memo. */
function recover(
  qpWords: Word[] | undefined,
  embedded: Word[] | undefined,
  idWords: Word[],
): Word[] | null {
  if (qpWords && qpWords.length > 0) return qpWords;
  const emb = embedded ?? [];
  if (emb.length > 0) {
    if (idWords.length === 0) return emb;
    const have = new Set(emb.map(x => x.id));
    const missing = idWords.filter(x => !have.has(x.id));
    return missing.length > 0 ? [...emb, ...missing] : emb;
  }
  if (idWords.length > 0) return idWords;
  return null;
}

describe("game word recovery chain", () => {
  it("prefers the Quick Play session's words over everything else", () => {
    const qp = [w(50, "qp")];
    expect(recover(qp, CURRICULUM, CURRICULUM)).toBe(qp);
  });

  it("hydrates wordIds when the embedded words array is empty", () => {
    const idWords = hydrateIds([1, 3], CURRICULUM);
    expect(recover(undefined, [], idWords)?.map(x => x.english)).toEqual([
      "apple",
      "chair",
    ]);
  });

  // The partially-written row: 1 of the teacher's 3 words persisted.
  it("unions a PARTIAL embedded list with the hydrated wordIds", () => {
    const idWords = hydrateIds([1, 2, 3], CURRICULUM);
    const got = recover(undefined, [CURRICULUM[0]], idWords);
    expect(got?.map(x => x.english).sort()).toEqual(["apple", "book", "chair"]);
  });

  it("keeps custom words (negative ids) that wordIds can never carry", () => {
    const idWords = hydrateIds([1], CURRICULUM);
    const got = recover(undefined, [CUSTOM], idWords);
    expect(got?.map(x => x.id).sort((a, b) => a - b)).toEqual([-77, 1]);
  });

  it("returns null — never the sample list — when there is nothing to recover", () => {
    expect(recover(undefined, [], hydrateIds([], CURRICULUM))).toBeNull();
    expect(recover(undefined, undefined, hydrateIds(undefined, CURRICULUM))).toBeNull();
  });

  it("does not duplicate words already present in the embedded list", () => {
    const idWords = hydrateIds([1, 2], CURRICULUM);
    const got = recover(undefined, [CURRICULUM[0], CURRICULUM[1]], idWords);
    expect(got).toHaveLength(2);
  });

  describe("referential stability", () => {
    it("hydrateIds returns an equal-content array for equal inputs", () => {
      const a = hydrateIds([1, 3], CURRICULUM);
      const b = hydrateIds([1, 3], CURRICULUM);
      // Contents equal — useMemo is what makes the IDENTITY stable across
      // renders; this asserts the function itself is deterministic so the
      // memo's dependency comparison is meaningful.
      expect(a).toEqual(b);
    });

    it("passes through an existing array identity rather than copying it", () => {
      // The branches that can return an input array unchanged must do so:
      // copying here is what destabilised gameWords and re-ran the
      // Matching setup effect (which calls setMatchingPairs) every render.
      const qp = [w(50, "qp")];
      expect(recover(qp, undefined, [])).toBe(qp);

      const emb = [CUSTOM];
      expect(recover(undefined, emb, [])).toBe(emb);

      const idWords = hydrateIds([1], CURRICULUM);
      expect(recover(undefined, [], idWords)).toBe(idWords);
    });

    it("only allocates when it genuinely has to union two sources", () => {
      const emb = [CURRICULUM[0]];

      // Something is missing from `emb` -> a new array is unavoidable.
      const partial = hydrateIds([1, 2], CURRICULUM);
      const unioned = recover(undefined, emb, partial);
      expect(unioned).not.toBe(emb);
      expect(unioned).toHaveLength(2);

      // `emb` already covers every hydrated id -> return it untouched.
      const covered = hydrateIds([1], CURRICULUM);
      expect(recover(undefined, emb, covered)).toBe(emb);
    });
  });

  it("the sample list is only reachable when recovery yields nothing", () => {
    const resolved = recover(undefined, [], []) ?? FALLBACK;
    expect(resolved).toBe(FALLBACK);

    const recovered = recover(undefined, [CURRICULUM[0]], []) ?? FALLBACK;
    expect(recovered).not.toBe(FALLBACK);
  });
});
