/**
 * useGameRoundOptions — derives the three per-round data structures
 * the game UI needs from the current word: multiple-choice options,
 * True/False option, and scrambled letters.
 *
 * All three used to be inline useMemo blocks in App.tsx.  They're
 * pure derivations of `currentWord` + `gameWords` + `currentIndex`
 * with no React state of their own, so moving them out is a simple
 * win for App.tsx readability.
 *
 *   options        — 4 choices (correct + 3 distractors).  Falls
 *                    back to ALL_WORDS if the teacher assigned only
 *                    one word, and cycles the assigned set when
 *                    there are 2–3 assigned words (prevents an
 *                    empty-distractor freeze that used to render
 *                    a blank round).
 *   tfOption       — one-of-two pick for True/False mode: 50 %
 *                    chance of the correct translation, 50 % of a
 *                    distractor.  Synchronous so the first render
 *                    of a T/F round never flashes an empty card.
 *   scrambledWord  — Fisher-Yates shuffle of the English letters;
 *                    re-shuffles if the result accidentally equals
 *                    the original (possible on short words).
 */
import { useMemo } from 'react';
import { ALL_WORDS, type Word } from '../data/vocabulary';
import { secureRandomInt, shuffle } from '../utils';

export interface UseGameRoundOptionsParams {
  currentWord: Word | undefined;
  gameWords: Word[];
  /** Bump this to force `tfOption` to resample — normally the
   *  memo only re-runs when `currentWord` changes, but T/F mode
   *  shows the same word twice in a row sometimes and we want a
   *  fresh coin-flip each time. */
  currentIndex: number;
}

export interface UseGameRoundOptionsApi {
  options: Word[];
  tfOption: Word | null;
  scrambledWord: string;
}

export function useGameRoundOptions(
  params: UseGameRoundOptionsParams,
): UseGameRoundOptionsApi {
  const { currentWord, gameWords, currentIndex } = params;

  const options = useMemo<Word[]>(() => {
    if (!currentWord) return [];
    const correct = currentWord;

    // Distractors must (a) be unique by word id, (b) have different
    // English text from the correct word, and (c) have different
    // hebrew/arabic translations from the correct word.  Without (c)
    // a teacher who assigns synonyms (e.g. two words that share a
    // hebrew translation) would see "3 of the answers are the same
    // word in hebrew" — students reported this as cheating.
    //
    // Strategy:
    //   1. start from gameWords (only what the teacher assigned),
    //      filtered for the rules above
    //   2. if that's fewer than 3, top up from ALL_WORDS with the
    //      same filter
    //   3. dedupe by id + by translation so we never repeat a glyph
    //      in the option grid
    const sameTranslation = (a: Word, b: Word) =>
      (a.hebrew && b.hebrew && a.hebrew.trim() === b.hebrew.trim()) ||
      (a.arabic && b.arabic && a.arabic.trim() === b.arabic.trim());

    const isUsable = (w: Word) =>
      w.id !== correct.id &&
      w.english.trim().toLowerCase() !== correct.english.trim().toLowerCase() &&
      !sameTranslation(w, correct);

    // Tier 1: assigned words that pass the filter.
    const fromAssigned = shuffle(gameWords.filter(isUsable));
    // Tier 2: top up from ALL_WORDS if we don't have 3 yet.
    const needFromAll = Math.max(0, 3 - fromAssigned.length);
    const fromAll = needFromAll > 0
      ? shuffle(ALL_WORDS.filter(isUsable)).slice(0, needFromAll * 4)
      : [];

    // Combine + dedupe by id AND by translation glyph so the option
    // grid never shows the same hebrew/arabic word twice.
    const seenIds = new Set<number>([correct.id]);
    const seenTranslations = new Set<string>([
      correct.hebrew?.trim() ?? '',
      correct.arabic?.trim() ?? '',
    ].filter(Boolean));
    const distractors: Word[] = [];
    for (const w of [...fromAssigned, ...fromAll]) {
      if (distractors.length >= 3) break;
      if (seenIds.has(w.id)) continue;
      const heb = w.hebrew?.trim() ?? '';
      const ara = w.arabic?.trim() ?? '';
      if ((heb && seenTranslations.has(heb)) || (ara && seenTranslations.has(ara))) continue;
      distractors.push(w);
      seenIds.add(w.id);
      if (heb) seenTranslations.add(heb);
      if (ara) seenTranslations.add(ara);
    }

    // Final safety net: if the vocabulary is so tiny that we still
    // can't find 3 unique distractors, pad with whatever ALL_WORDS
    // can offer (allowing translation-collisions only as last resort).
    while (distractors.length < 3) {
      const fallback = ALL_WORDS.find(w => !seenIds.has(w.id) && w.id !== correct.id);
      if (!fallback) break;
      distractors.push(fallback);
      seenIds.add(fallback.id);
    }

    return shuffle([...distractors.slice(0, 3), correct]);
  }, [currentWord, gameWords]);

  // Synchronously derive tfOption so it is never null on the first
  // render of a True/False round.
  const tfOption = useMemo<Word | null>(() => {
    if (!currentWord) return null;
    // 50 % correct translation, 50 % distractor
    if (secureRandomInt(2) === 0) return currentWord;
    let possibleDistractors = gameWords.filter(w => w.id !== currentWord.id);
    if (possibleDistractors.length === 0) {
      const allPossibleWords = [...ALL_WORDS, ...gameWords];
      possibleDistractors = Array
        .from(new Map(allPossibleWords.map(w => [w.id, w])).values())
        .filter(w => w.id !== currentWord.id);
    }
    return possibleDistractors[secureRandomInt(possibleDistractors.length)] ?? currentWord;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentWord, gameWords]);

  const scrambledWord = useMemo<string>(() => {
    if (!currentWord) return '';
    let scrambled = shuffle(currentWord.english.split('')).join('');
    // Ensure it's actually scrambled if length > 1
    while (scrambled === currentWord.english && currentWord.english.length > 1) {
      scrambled = shuffle(currentWord.english.split('')).join('');
    }
    return scrambled;
  }, [currentWord]);

  return { options, tfOption, scrambledWord };
}
