/**
 * Single source of randomness for every worksheet sheet that shuffles
 * its content (multiple-choice options, true/false ordering, match-up
 * pairings, matching column, sentence-builder scrambles, scramble
 * letters).
 *
 * The orchestrator (WorksheetView) calls `buildQuestionShapes` ONCE per
 * (words, translationLang, aiSentences) change and passes the result
 * to both the on-screen preview and the print stack.  That way the
 * teacher's preview matches exactly what gets printed — without this,
 * the preview and the print render as two separate React component
 * instances and each rolls its own dice.
 *
 * Sheets accept their slice of this object via the `shape` prop with a
 * fallback to internal computation, so they still work standalone.
 *
 * Also: the consolidated answer key in `Worksheet.tsx` consumes these
 * shapes to render the *actual* correct answer per row (vs. the old
 * hard-coded "A / True / translation" guesses).
 */
import type { Word } from '../../data/vocabulary';
import { scrambleWord } from '../../utils/scrambleWord';

export interface MultipleChoiceShape {
  questions: Array<{
    wordId: number;
    options: string[];
    correctIndex: number;
  }>;
}

export interface TrueFalseShape {
  questions: Array<{
    wordId: number;
    shownTranslation: string;
    isTrue: boolean;
  }>;
}

export interface MatchUpShape {
  /** For each LEFT-column row idx, which right-column row idx is the
   *  correct match.  Right-column rendering uses `rightOrder[idx]` as
   *  the source word, so the answer for left idx is the position of
   *  `idx` within `rightOrder`. */
  rightOrder: number[];
}

export interface MatchingShape {
  /** Permutation of word indices used to render the translation column. */
  translationOrder: number[];
}

export interface ScrambleShape {
  /** Pre-scrambled string per word, parallel to words[]. */
  scrambled: string[];
}

export interface SentenceBuilderShape {
  items: Array<{
    wordId: number;
    /** Source sentence (AI / stored / fallback).  When null, the sheet
     *  renders the "Use [word] in a sentence" fallback prompt instead. */
    sentence: string | null;
    /** Pre-shuffled token order.  Empty when sentence is null. */
    scrambled: string;
  }>;
}

export interface QuestionShapes {
  'multiple-choice': MultipleChoiceShape;
  'true-false': TrueFalseShape;
  'match-up': MatchUpShape;
  matching: MatchingShape;
  scramble: ScrambleShape;
  'sentence-builder': SentenceBuilderShape;
}

function pickTranslationRaw(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildMultipleChoice(words: Word[]): MultipleChoiceShape {
  return {
    questions: words.map((target) => {
      // Dedupe distractors by english text (custom paste can carry
      // duplicate entries with different ids; we want unique options).
      const seen = new Set<string>([target.english.toLowerCase()]);
      const pool: string[] = [];
      for (const w of shuffle(words)) {
        const key = w.english.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          pool.push(w.english);
        }
        if (pool.length >= 3) break;
      }
      const options = shuffle([target.english, ...pool]);
      return {
        wordId: target.id,
        options,
        correctIndex: options.indexOf(target.english),
      };
    }),
  };
}

function buildTrueFalse(words: Word[], lang: 'he' | 'ar' | 'en'): TrueFalseShape {
  // Use a balanced shuffle: half true, half false (rounded), then
  // shuffle the pattern so students can't shortcut by index parity.
  const n = words.length;
  const flags: boolean[] = [];
  for (let i = 0; i < n; i++) flags.push(i < Math.ceil(n / 2));
  const pattern = shuffle(flags);

  return {
    questions: words.map((w, idx) => {
      const isTrue = pattern[idx];
      const correct = pickTranslationRaw(w, lang);
      let shownTranslation = correct;
      if (!isTrue) {
        // Pick a distractor whose translation differs from the correct
        // one — otherwise the "false" statement is actually true.
        const candidates = words.filter((other, i) => {
          if (i === idx) return false;
          return pickTranslationRaw(other, lang) !== correct;
        });
        if (candidates.length > 0) {
          shownTranslation = pickTranslationRaw(
            candidates[Math.floor(Math.random() * candidates.length)],
            lang,
          );
        }
      }
      return { wordId: w.id, shownTranslation, isTrue };
    }),
  };
}

function buildMatchUp(words: Word[]): MatchUpShape {
  return { rightOrder: shuffle(words.map((_, i) => i)) };
}

function buildMatching(words: Word[]): MatchingShape {
  return { translationOrder: shuffle(words.map((_, i) => i)) };
}

function buildScramble(words: Word[]): ScrambleShape {
  return { scrambled: words.map((w) => scrambleWord(w.english.toUpperCase())) };
}

function buildSentenceBuilder(
  words: Word[],
  aiSentences: Record<number, string> | undefined,
): SentenceBuilderShape {
  return {
    items: words.map((w) => {
      const raw = aiSentences?.[w.id] ?? w.sentence ?? w.example ?? null;
      if (!raw) {
        return { wordId: w.id, sentence: null, scrambled: '' };
      }
      const tokens = raw.split(/\s+/).filter(Boolean);
      const scrambled = shuffle(tokens).join(' ');
      return { wordId: w.id, sentence: raw, scrambled };
    }),
  };
}

export function buildQuestionShapes(
  words: Word[],
  translationLang: 'he' | 'ar' | 'en',
  aiSentences: Record<number, string> | undefined,
): QuestionShapes {
  return {
    'multiple-choice': buildMultipleChoice(words),
    'true-false': buildTrueFalse(words, translationLang),
    'match-up': buildMatchUp(words),
    matching: buildMatching(words),
    scramble: buildScramble(words),
    'sentence-builder': buildSentenceBuilder(words, aiSentences),
  };
}
