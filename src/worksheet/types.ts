/**
 * Shared types for the interactive worksheet runner.
 *
 * Each worksheet is a list of exercises played in order.  Adding a new
 * exercise type is mechanical:
 *   1. Add a variant to the `Exercise` and `Answer` unions below.
 *   2. Drop a component file into ./exercises/.
 *   3. Register it in ./exercises/registry.ts.
 *
 * The dashboard's per-answer renderer mirrors the `Answer` union, so
 * any new `kind` here must get a matching render branch over there.
 */
import type { Word } from "../data/vocabulary";

export type Language = "en" | "he" | "ar";

export type ExerciseType =
  | "matching"
  | "quiz"
  | "letter_scramble"
  | "listening_dictation"
  | "fill_blank"
  | "definition_match"
  | "synonym_antonym"
  | "cloze"
  | "sentence_building"
  | "translation_typing"
  | "word_in_context"
  | "true_false";

// Translation typing supports the four pairs the IL audience actually
// needs: English ↔ Hebrew and English ↔ Arabic.  Other pairings (e.g.
// Hebrew ↔ Arabic) aren't pedagogically meaningful for an EFL app.
export type TranslationDirection = "en_to_he" | "he_to_en" | "en_to_ar" | "ar_to_en";

// Per-exercise word_ids let a teacher run heavy exercises on a subset
// of the worksheet's pool.  Each variant carries its own type-specific
// config (direction, mode, etc.).
export type Exercise =
  | { type: "matching"; word_ids: number[] }
  | { type: "quiz"; word_ids: number[] }
  | { type: "letter_scramble"; word_ids: number[] }
  | { type: "listening_dictation"; word_ids: number[] }
  | { type: "fill_blank"; word_ids: number[] }
  | { type: "definition_match"; word_ids: number[] }
  | { type: "synonym_antonym"; word_ids: number[]; mode: "synonym" | "antonym" }
  | { type: "cloze"; word_ids: number[] }
  | { type: "sentence_building"; word_ids: number[] }
  | { type: "translation_typing"; word_ids: number[]; direction: TranslationDirection }
  | { type: "word_in_context"; word_ids: number[] }
  | { type: "true_false"; word_ids: number[] };

// Helper for picking a specific Exercise variant by its type tag.  Used
// by individual exercise components so their props can narrow `config`
// to the correct shape without an `as` cast at every call site.
export type ExerciseOf<T extends ExerciseType> = Extract<Exercise, { type: T }>;

// Per-question detail for the teacher dashboard.  `kind` matches the
// Exercise.type that produced it so the dashboard can render with the
// right column headers (e.g. "given" vs "mistakes").  Matching is the
// odd one out: students always eventually solve every pair, so the
// signal is mistake count per pair, not a correct/incorrect flag.
export type Answer =
  | { kind: "quiz"; word_id: number; prompt: string; given: string; correct: string; is_correct: boolean }
  | { kind: "matching"; word_id: number; english: string; translation: string; mistakes_count: number }
  | { kind: "letter_scramble"; word_id: number; word: string; attempts: number; solved: boolean }
  | { kind: "listening_dictation"; word_id: number; word: string; typed: string; is_correct: boolean }
  | { kind: "fill_blank"; word_id: number; sentence: string; typed: string; is_correct: boolean }
  | { kind: "definition_match"; word_id: number; word: string; given: string; correct: string; is_correct: boolean }
  | { kind: "synonym_antonym"; word_id: number; word: string; mode: "synonym" | "antonym"; given: string; correct: string; is_correct: boolean }
  | { kind: "cloze"; word_id: number; sentence: string; typed: string; is_correct: boolean }
  | { kind: "sentence_building"; word_id: number; target: string; given: string; is_correct: boolean }
  | { kind: "translation_typing"; word_id: number; prompt: string; typed: string; correct: string; is_correct: boolean }
  | { kind: "word_in_context"; word_id: number; given_sentence: string; is_correct: boolean }
  | { kind: "true_false"; word_id: number; statement: string; given: boolean; correct: boolean; is_correct: boolean };

export interface ExerciseResult {
  // "Score" is the number of correct responses.  For matching, where
  // every pair must eventually be solved to progress, score == total ==
  // attempts and the per-pair mistake count carries the signal.
  score: number;
  total: number;
  answers: Answer[];
}

// Contract every exercise component implements.  The runner resolves
// words from config.word_ids before mount so components never have to
// touch ALL_WORDS — they just render with what they're handed.
export interface ExerciseComponentProps<C extends Exercise = Exercise> {
  config: C;
  words: Word[];
  targetLang: Language;
  onComplete: (result: ExerciseResult) => void;
}

export type ExerciseComponent<C extends Exercise = Exercise> = React.FC<ExerciseComponentProps<C>>;

// Stored in interactive_worksheets.settings — only `language` is read
// today, but the field is a JSONB blob so future per-worksheet options
// (timer, retries, etc.) can slot in without a schema migration.
export interface WorksheetSettings {
  language?: Language;
  // AI-generated context sentences keyed by word ID (stringified for
  // JSONB safety). Populated at mint time by ShareWorksheetDialog when
  // the teacher picks a sentence-dependent exercise type (fill_blank,
  // sentence_building, cloze, word_in_context) and the word pool has
  // entries missing from the static FILLBLANK_SENTENCES bank. The
  // solver merges these with the static bank so the exercise has
  // material to run instead of auto-skipping.
  sentences?: Record<string, string>;
}

// Aggregate score across all exercises.  The total-out-of-100 is what
// the student sees on the celebration card and what the teacher sees
// in the dashboard, computed as (sum_correct / sum_total) * 100.
export interface WorksheetScore {
  perExercise: Array<{ type: ExerciseType; score: number; total: number; percent: number }>;
  totalCorrect: number;
  totalQuestions: number;
  outOf100: number;
}

export const computeWorksheetScore = (
  exercises: Exercise[],
  results: ExerciseResult[],
): WorksheetScore => {
  const perExercise = results.map((r, i) => ({
    type: exercises[i].type,
    score: r.score,
    total: r.total,
    percent: r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
  }));
  const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);
  return {
    perExercise,
    totalCorrect,
    totalQuestions,
    outOf100: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
  };
};

// One row in the "words to study" review section.  Deduplicated by
// word_id so a word missed in two different exercises shows up once
// with the worst note collapsed in.
export interface MissedWord {
  word_id: number;
  english: string;
  translation: string;
  note?: string;
}

// Walk the flat answer list, pull out the ones that represent a
// failed attempt, and dedupe by word_id.  Each exercise variant
// surfaces a different label — handled in one place so the renderer
// stays a simple list.
export const extractMisses = (answers: Answer[]): MissedWord[] => {
  const byId = new Map<number, MissedWord>();

  const upsert = (m: MissedWord) => {
    if (!byId.has(m.word_id)) byId.set(m.word_id, m);
  };

  for (const a of answers) {
    switch (a.kind) {
      case "quiz":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.prompt, translation: a.correct });
        }
        break;
      case "matching":
        if (a.mistakes_count > 0) {
          upsert({
            word_id: a.word_id,
            english: a.english,
            translation: a.translation,
            note:
              a.mistakes_count === 1
                ? "1 miss"
                : `${a.mistakes_count} misses`,
          });
        }
        break;
      case "letter_scramble":
        if (a.attempts > 1) {
          upsert({
            word_id: a.word_id,
            english: a.word,
            translation: "",
            note: `${a.attempts} tries`,
          });
        }
        break;
      case "listening_dictation":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.word, translation: a.typed || "—" });
        }
        break;
      case "fill_blank":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.sentence, translation: a.typed || "—" });
        }
        break;
      case "definition_match":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.word, translation: a.correct });
        }
        break;
      case "synonym_antonym":
        if (!a.is_correct) {
          upsert({
            word_id: a.word_id,
            english: a.word,
            translation: a.correct,
            note: a.mode,
          });
        }
        break;
      case "cloze":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.sentence, translation: a.typed || "—" });
        }
        break;
      case "sentence_building":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.target, translation: a.given || "—" });
        }
        break;
      case "translation_typing":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.prompt, translation: a.correct });
        }
        break;
      case "word_in_context":
        if (!a.is_correct) {
          upsert({ word_id: a.word_id, english: a.given_sentence, translation: "" });
        }
        break;
      case "true_false":
        if (!a.is_correct) {
          upsert({
            word_id: a.word_id,
            english: a.statement,
            translation: "",
            note: a.correct ? "actually true" : "actually false",
          });
        }
        break;
    }
  }

  return Array.from(byId.values());
};
