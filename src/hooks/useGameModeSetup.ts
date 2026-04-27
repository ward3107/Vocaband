/**
 * useGameModeSetup — per-game-mode initialization effects.
 *
 * When the student enters a specific game mode (or advances to a new
 * word within one), a few modes need side-effect setup.  These used
 * to be five separate useEffect blocks in App.tsx, all sharing the
 * same `view === 'game' && !showModeSelection && gameMode === X`
 * guard pattern:
 *
 *   1. Auto-speak the current word on advance (skipped in
 *      sentence-builder and matching modes, which own their own
 *      speech paths).  Dedupes against lastSpokenWordRef so the
 *      same word doesn't re-speak when unrelated state churns.
 *   2. Reset lastSpokenWordRef whenever the game mode changes so
 *      re-entering a mode pronounces the current word fresh.
 *   3. Matching mode: on entry, shuffle 6 words into English +
 *      target-language tiles and reset any prior match state.
 *   4. Letter Sounds mode: reveal letters one at a time, speaking
 *      each letter AFTER its spring animation shows.  Uses
 *      sequential timeouts + onend with a fallback so speech can't
 *      stall on browsers where onend is flaky.
 *   5. Sentence Builder mode: load the assignment's sentences,
 *      shuffle the first one's words, and speak the target so
 *      students know what to build.
 *
 * The hook owns its internal lastSpokenWordRef.  All other state
 * is owned by App.tsx and passed in as setters.
 */
import { useEffect, useRef } from 'react';
import type { GameMode } from '../constants/game';
import type { View } from '../core/views';
import type { AssignmentData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import { getGameDebugger } from '../utils/gameDebug';
import { shuffle } from '../utils';

type MatchingPair = {
  id: number;
  text: string;
  type: 'english' | 'arabic';
};

type SelectedMatch = {
  id: number;
  type: 'english' | 'arabic';
} | null;

type SentenceFeedback = 'correct' | 'wrong' | null;

export interface UseGameModeSetupParams {
  // Game-round read state
  view: View;
  gameMode: GameMode;
  currentWord: Word | undefined;
  currentIndex: number;
  gameWords: Word[];
  showModeSelection: boolean;
  showModeIntro: boolean;
  isFinished: boolean;
  targetLanguage: 'hebrew' | 'arabic';
  activeAssignment: AssignmentData | null;

  // Speech
  speakWord: (id: number, english: string) => void;
  speak: (text: string) => void;

  // Matching-mode setters
  setMatchingPairs: React.Dispatch<React.SetStateAction<MatchingPair[]>>;
  setMatchedIds: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedMatch: React.Dispatch<React.SetStateAction<SelectedMatch>>;

  // Letter-sounds setter
  setRevealedLetters: React.Dispatch<React.SetStateAction<number>>;

  // Sentence-builder setters
  setSentenceIndex: React.Dispatch<React.SetStateAction<number>>;
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  setSentenceFeedback: React.Dispatch<React.SetStateAction<SentenceFeedback>>;
}

export function useGameModeSetup(params: UseGameModeSetupParams): void {
  const {
    view, gameMode, currentWord, currentIndex, gameWords,
    showModeSelection, showModeIntro, isFinished,
    targetLanguage, activeAssignment,
    speakWord, speak,
    setMatchingPairs, setMatchedIds, setSelectedMatch,
    setRevealedLetters,
    setSentenceIndex, setAvailableWords, setBuiltSentence, setSentenceFeedback,
  } = params;

  const gameDebug = getGameDebugger();
  const lastSpokenWordRef = useRef<number | null>(null);

  // ─── 1. Auto-speak word on advance ────────────────────────────────
  useEffect(() => {
    if (
      view === 'game' && !isFinished && currentWord &&
      !showModeSelection && !showModeIntro &&
      gameMode !== 'sentence-builder' && gameMode !== 'matching' &&
      gameMode !== 'fill-blank'
    ) {
      // Only speak if this is a different word than the last one we spoke
      if (lastSpokenWordRef.current !== currentWord.id) {
        gameDebug.logPronunciation({
          wordId: currentWord.id,
          word: currentWord.english,
          method: 'auto',
          success: true,
        });
        lastSpokenWordRef.current = currentWord.id;
        // Small delay so the UI updates before speech starts.
        setTimeout(() => {
          speakWord(currentWord.id, currentWord.english);
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isFinished, view, currentWord, showModeSelection, showModeIntro, gameMode]);

  // ─── 2. Reset last-spoken tracker on gameMode change ──────────────
  useEffect(() => {
    lastSpokenWordRef.current = null;
  }, [gameMode]);

  // ─── 3. Matching mode: build pairs on entry ───────────────────────
  useEffect(() => {
    if (view === 'game' && !showModeSelection && gameMode === 'matching') {
      const shuffled = shuffle(gameWords).slice(0, 6);
      const pairs = shuffle([
        ...shuffled.map(w => ({ id: w.id, text: w.english, type: 'english' as const })),
        ...shuffled.map(w => ({
          id: w.id,
          text: w[targetLanguage] || w.arabic || w.hebrew || w.english,
          type: 'arabic' as const,
        })),
      ]);
      setMatchingPairs(pairs);
      setMatchedIds([]);
      setSelectedMatch(null);
    }
  }, [view, showModeSelection, gameMode, gameWords, targetLanguage, setMatchingPairs, setMatchedIds, setSelectedMatch]);

  // ─── 4. Letter Sounds: sequential reveal + speech ────────────────
  useEffect(() => {
    if (
      view !== 'game' || showModeSelection || showModeIntro ||
      gameMode !== 'letter-sounds' || !currentWord || isFinished
    ) return;
    setRevealedLetters(0);
    const word = currentWord.english;
    let cancelled = false;
    const revealNext = (idx: number) => {
      if (cancelled || idx >= word.length) return;
      setRevealedLetters(idx + 1);
      // Delay speech 250 ms so the spring animation shows the letter first.
      setTimeout(() => {
        if (cancelled) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word[idx]);
        utter.rate = 0.8;
        utter.onend = () => {
          if (!cancelled) setTimeout(() => revealNext(idx + 1), 200);
        };
        // Fallback if onend doesn't fire (Safari / some mobile browsers).
        const fallbackTimer = setTimeout(() => {
          if (!cancelled) revealNext(idx + 1);
        }, 1500);
        utter.onend = () => {
          clearTimeout(fallbackTimer);
          if (!cancelled) setTimeout(() => revealNext(idx + 1), 200);
        };
        window.speechSynthesis.speak(utter);
      }, 250);
    };
    const startTimer = setTimeout(() => revealNext(0), 400);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, view, showModeSelection, showModeIntro, gameMode, currentWord, isFinished]);

  // ─── 5. Sentence Builder: load sentences from the assignment ──────
  useEffect(() => {
    if (
      view !== 'game' || showModeSelection || showModeIntro ||
      gameMode !== 'sentence-builder' || !activeAssignment
    ) return;
    const sentences = (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter(s => s.trim().length > 0);
    if (validSentences.length > 0) {
      setSentenceIndex(0);
      const words = shuffle(validSentences[0].split(' ').filter(Boolean));
      setAvailableWords(words);
      setBuiltSentence([]);
      setSentenceFeedback(null);
      // Speak the target sentence so students know what to build.
      setTimeout(() => speak(validSentences[0]), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, showModeSelection, showModeIntro, gameMode, activeAssignment]);
}
