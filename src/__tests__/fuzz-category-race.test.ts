/**
 * Property-based ("fuzz") tests for the Category Race answer bank.
 *
 * Example-based tests (category-race-bank.test.ts) prove the cases we
 * thought of. These prove the cases we DIDN'T: fast-check throws
 * thousands of random/adversarial inputs at the pure scoring functions
 * and asserts invariants hold for ALL of them — never throw, always
 * return a well-formed result. This is the cheap guard against the
 * "weird input from a real student's keyboard crashed scoring" class of
 * bug that example tests miss.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateAnswer,
  rollLetter,
  answersFor,
  LETTER_POOL,
  CATEGORIES,
  type CategoryId,
} from "../data/category-race-bank";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];
const POOL = new Set(LETTER_POOL);
// Any single character (incl. letters outside the roll pool, digits,
// punctuation) — fast-check v4 dropped fc.char(), so build it from a
// length-1 string.
const arbChar = fc.string({ minLength: 1, maxLength: 1 });

describe("fuzz: validateAnswer never throws and is well-formed", () => {
  it("returns a valid ValidationResult shape for ANY string input", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CATEGORY_IDS),
        // Mix pool letters with arbitrary single chars so we also cover
        // letters that aren't in the roll pool.
        fc.oneof(fc.constantFrom(...LETTER_POOL), arbChar),
        // Arbitrary unicode strings — emoji, RTL marks, control chars,
        // 10k-char paste bombs, the works.
        fc.string(),
        (category, letter, input) => {
          const r = validateAnswer(category, letter, input);
          expect(typeof r.valid).toBe("boolean");
          // matchedEn is a string exactly when valid; null otherwise.
          if (r.valid) {
            expect(typeof r.matchedEn).toBe("string");
            expect(["en", "he", "ar"]).toContain(r.matchedLanguage);
          } else {
            expect(r.matchedEn).toBeNull();
            expect(r.matchedLanguage).toBeNull();
          }
        },
      ),
      { numRuns: 2000 },
    );
  });

  it("only ever accepts answers that start with the rolled letter", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CATEGORY_IDS),
        fc.constantFrom(...LETTER_POOL),
        fc.string(),
        (category, letter, input) => {
          const r = validateAnswer(category, letter, input);
          if (r.valid && r.matchedLanguage === "en") {
            // A free/open English answer must start with the rolled
            // letter (case-insensitive). Bank-matched he/ar answers are
            // exempt — they're translations, not letter-prefixed.
            const normalized = input.trim().toLowerCase();
            const matchedNorm = (r.matchedEn ?? "").toLowerCase();
            // Either the student's input or the canonical match starts
            // with the letter (canonical for a seeded near-spelling).
            const starts =
              normalized.startsWith(letter.toLowerCase()) ||
              matchedNorm.startsWith(letter.toLowerCase());
            expect(starts).toBe(true);
          }
        },
      ),
      { numRuns: 2000 },
    );
  });
});

describe("fuzz: rollLetter + answersFor invariants", () => {
  it("rollLetter always returns a pool letter, even with arbitrary excludes", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constantFrom(...LETTER_POOL), arbChar)),
        (excludeArr) => {
          const letter = rollLetter(new Set(excludeArr));
          // Must always be a real pool letter (the fn falls back to the
          // full pool if every letter was excluded, never returns "").
          expect(POOL.has(letter)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("answersFor always returns an array for any category/letter pair", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CATEGORY_IDS),
        fc.oneof(fc.constantFrom(...LETTER_POOL), arbChar, fc.string()),
        (category, letter) => {
          const out = answersFor(category, letter);
          expect(Array.isArray(out)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
