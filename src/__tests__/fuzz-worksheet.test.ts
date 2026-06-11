/**
 * Property-based ("fuzz") tests for the worksheet scoring/aggregation
 * helpers — the pure functions that run on the student's results screen.
 *
 * The interactive-worksheet white-screen bug was a "malformed/mismatched
 * data reached a renderer that assumed a clean shape" failure. These
 * tests throw thousands of random and deliberately-desynced inputs at the
 * pure helpers and assert they NEVER throw and always return a
 * well-formed score. If a future change reintroduces an unguarded index
 * or a NaN, this catches it in CI instead of in a classroom.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  computeWorksheetScore,
  extractMisses,
  type Answer,
  type Exercise,
  type ExerciseResult,
  type ExerciseType,
} from "../worksheet/types";

const EXERCISE_TYPES: ExerciseType[] = [
  "matching", "quiz", "letter_scramble", "listening_dictation",
  "fill_blank", "definition_match", "cloze", "sentence_building",
  "translation_typing", "word_in_context", "true_false",
];

const arbExercise = (): fc.Arbitrary<Exercise> =>
  fc.record({
    type: fc.constantFrom(...EXERCISE_TYPES),
    word_ids: fc.array(fc.integer()),
  }) as fc.Arbitrary<Exercise>;

// Real ExerciseResults always have 0 <= score <= total, so model that
// (an exercise can't score more correct than it asked). Fuzzing outside
// that contract would test a state the app can't produce.
const arbResult = (): fc.Arbitrary<ExerciseResult> =>
  fc.integer({ min: 0, max: 100 }).chain((total) =>
    fc.record({
      score: fc.integer({ min: 0, max: total }),
      total: fc.constant(total),
      answers: fc.constant([] as Answer[]),
    }),
  );

describe("fuzz: computeWorksheetScore never throws, even on desynced arrays", () => {
  it("handles any exercises/results lengths (incl. more results than exercises)", () => {
    fc.assert(
      fc.property(
        fc.array(arbExercise()),
        fc.array(arbResult()),
        (exercises, results) => {
          // The key invariant: a resumed run whose results array drifted
          // longer than exercises must NOT crash (the old code indexed
          // exercises[i].type blindly).
          const score = computeWorksheetScore(exercises, results);
          expect(Number.isFinite(score.outOf100)).toBe(true);
          expect(score.outOf100).toBeGreaterThanOrEqual(0);
          // perExercise only covers indices that line up with an exercise.
          expect(score.perExercise.length).toBeLessThanOrEqual(
            Math.min(exercises.length, results.length),
          );
          expect(Number.isFinite(score.totalQuestions)).toBe(true);
        },
      ),
      { numRuns: 2000 },
    );
  });
});

describe("fuzz: extractMisses never throws on arbitrary answer mixes", () => {
  // A small generator for each Answer variant — enough shape that the
  // switch in extractMisses exercises every branch with random data.
  const arbAnswer = (): fc.Arbitrary<Answer> =>
    fc.oneof(
      fc.record({ kind: fc.constant("quiz" as const), word_id: fc.integer(), prompt: fc.string(), given: fc.string(), correct: fc.string(), is_correct: fc.boolean() }),
      fc.record({ kind: fc.constant("matching" as const), word_id: fc.integer(), english: fc.string(), translation: fc.string(), mistakes_count: fc.integer({ min: 0, max: 9 }) }),
      fc.record({ kind: fc.constant("letter_scramble" as const), word_id: fc.integer(), word: fc.string(), attempts: fc.integer({ min: 0, max: 9 }), solved: fc.boolean() }),
      fc.record({ kind: fc.constant("listening_dictation" as const), word_id: fc.integer(), word: fc.string(), typed: fc.string(), is_correct: fc.boolean() }),
      fc.record({ kind: fc.constant("fill_blank" as const), word_id: fc.integer(), sentence: fc.string(), typed: fc.string(), is_correct: fc.boolean() }),
      fc.record({ kind: fc.constant("true_false" as const), word_id: fc.integer(), statement: fc.string(), given: fc.boolean(), correct: fc.boolean(), is_correct: fc.boolean() }),
    ) as fc.Arbitrary<Answer>;

  it("returns a deduped MissedWord[] for any answer array", () => {
    fc.assert(
      fc.property(fc.array(arbAnswer()), (answers) => {
        const misses = extractMisses(answers);
        expect(Array.isArray(misses)).toBe(true);
        // Deduped by word_id.
        const ids = misses.map((m) => m.word_id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 2000 },
    );
  });
});
