/**
 * Question generation utilities for multi-choice game modes — used by
 * both the live student game flow (GameActiveView) and the teacher
 * Class Show projector view.
 *
 * Modes covered:
 * - classic     : English prompt → pick the correct translation
 * - reverse     : Translation prompt → pick the correct English
 * - listening   : Audio plays → pick the correct translation
 * - fill-blank  : Sentence with blank → pick the missing word
 * - true-false  : Word + translation pair → judge truth
 *
 * Each builder returns an `options` array of 4 (or 2 for true-false)
 * with the correct answer mixed in at a random index.
 */
import type { Word } from '../data/vocabulary';

export type TranslationLang = 'en' | 'he' | 'ar' | 'ru';

export interface MultiChoiceQuestion {
  word: Word;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface TrueFalseQuestion {
  word: Word;
  prompt: string;
  shownTranslation: string;
  isTrue: boolean;
}

function pick<T>(arr: readonly T[], n: number, exclude: Set<T>): T[] {
  const pool = arr.filter(x => !exclude.has(x));
  const picked: T[] = [];
  const local = [...pool];
  while (picked.length < n && local.length > 0) {
    const idx = Math.floor(Math.random() * local.length);
    picked.push(local.splice(idx, 1)[0]);
  }
  return picked;
}

function shuffleWithCorrect(options: string[], correct: string): { options: string[]; correctIndex: number } {
  const pool = [correct, ...options.filter(o => o !== correct)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { options: pool, correctIndex: pool.indexOf(correct) };
}

function getTranslation(word: Word, lang: TranslationLang): string {
  if (lang === 'he') return word.hebrew;
  if (lang === 'ar') return word.arabic;
  if (lang === 'ru') return word.russian ?? word.english;
  return word.english;
}

/**
 * Classic / Listening — English (or audio) prompt, 4 translation options.
 * Distractors are 3 other words' translations from the same pool.
 */
export function buildClassicQuestion(
  word: Word,
  pool: Word[],
  translationLang: TranslationLang = 'he',
): MultiChoiceQuestion {
  const correctTranslation = getTranslation(word, translationLang);
  const otherTranslations = pool
    .filter(w => w.id !== word.id)
    .map(w => getTranslation(w, translationLang))
    .filter(t => t !== correctTranslation);
  const distractors = pick([...new Set(otherTranslations)], 3, new Set([correctTranslation]));
  const { options, correctIndex } = shuffleWithCorrect([...distractors, correctTranslation], correctTranslation);
  return {
    word,
    prompt: word.english,
    options,
    correctIndex,
  };
}

/**
 * Reverse — translation prompt, 4 English options.
 */
export function buildReverseQuestion(
  word: Word,
  pool: Word[],
  translationLang: TranslationLang = 'he',
): MultiChoiceQuestion {
  const otherEnglishes = pool
    .filter(w => w.id !== word.id)
    .map(w => w.english)
    .filter(e => e !== word.english);
  const distractors = pick([...new Set(otherEnglishes)], 3, new Set([word.english]));
  const { options, correctIndex } = shuffleWithCorrect([...distractors, word.english], word.english);
  return {
    word,
    prompt: getTranslation(word, translationLang),
    options,
    correctIndex,
  };
}

/**
 * Fill-in-the-blank — sentence with the target word replaced by ____,
 * 4 word options.  Requires the word to have a `sentence` populated.
 */
export function buildFillBlankQuestion(
  word: Word,
  pool: Word[],
): MultiChoiceQuestion | null {
  const sentence = word.sentence ?? word.example;
  if (!sentence) return null;

  // Replace the target word (case-insensitive, whole-word match) with the blank.
  const re = new RegExp(`\\b${escapeRegex(word.english)}\\b`, 'i');
  if (!re.test(sentence)) return null;
  const blanked = sentence.replace(re, '_____');

  const otherEnglishes = pool
    .filter(w => w.id !== word.id)
    .map(w => w.english)
    .filter(e => e !== word.english);
  const distractors = pick([...new Set(otherEnglishes)], 3, new Set([word.english]));
  const { options, correctIndex } = shuffleWithCorrect([...distractors, word.english], word.english);

  return {
    word,
    prompt: blanked,
    options,
    correctIndex,
  };
}

/**
 * True/False — show the word + a translation, judge if it's correct.
 * 50/50 chance the shown translation is the real one or a distractor.
 */
export function buildTrueFalseQuestion(
  word: Word,
  pool: Word[],
  translationLang: TranslationLang = 'he',
): TrueFalseQuestion {
  const correctTranslation = getTranslation(word, translationLang);
  const isTrue = Math.random() < 0.5;
  if (isTrue) {
    return {
      word,
      prompt: word.english,
      shownTranslation: correctTranslation,
      isTrue: true,
    };
  }
  const otherTranslations = pool
    .filter(w => w.id !== word.id)
    .map(w => getTranslation(w, translationLang))
    .filter(t => t !== correctTranslation);
  const distractor = pick([...new Set(otherTranslations)], 1, new Set([correctTranslation]))[0] ?? correctTranslation;
  return {
    word,
    prompt: word.english,
    shownTranslation: distractor,
    isTrue: false,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
