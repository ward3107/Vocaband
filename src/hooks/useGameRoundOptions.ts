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

    // Use ONLY the assigned gameWords for distractors — students should
    // only see what the teacher assigned.
    let possibleDistractors = gameWords.filter(w => w.id !== correct.id);

    // If fewer than 3 distractors are available (teacher assigned < 4
    // words), cycle through the assigned words instead of borrowing
    // from ALL_WORDS.  Edge case: if the teacher assigned exactly one
    // word, possibleDistractors is empty and the cycle loop would
    // never terminate — fall back to ALL_WORDS so we have real
    // distractors to show.
    if (possibleDistractors.length === 0) {
      possibleDistractors = ALL_WORDS.filter(w => w.id !== correct.id);
    }
    if (possibleDistractors.length < 3) {
      const shuffledDistractors = shuffle(possibleDistractors);
      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push(...shuffle(possibleDistractors));
      }
      possibleDistractors = shuffledDistractors;
    }

    const shuffledOthers = possibleDistractors.slice(0, 3);
    return shuffle([...shuffledOthers, correct]);
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
