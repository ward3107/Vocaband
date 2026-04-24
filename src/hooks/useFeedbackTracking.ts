/**
 * useFeedbackTracking — feedback state instrumentation + failsafe.
 *
 * During a game round the `feedback` state drives visual feedback
 * (correct / wrong flashes) and gates whether tap handlers should
 * process clicks.  Four small effects managed this in App.tsx:
 *
 *   1. Mirror `!!feedback` into `isProcessingRef` so tap handlers
 *      can read the latest value without re-registering on every
 *      feedback change.  Also logs the transition to gameDebug.
 *   2. 5-second failsafe: if feedback somehow gets stuck non-null,
 *      clear it so buttons aren't permanently disabled.  (The happy
 *      path is setFeedback(null) via useGameModeActions after a
 *      short delay — this is the backstop.)
 *   3. Log every feedback state change to gameDebug for post-hoc
 *      debugging of tap-doesn't-work reports.
 *   4. Log word-index transitions in `view==='game'` to gameDebug
 *      so we can correlate "why did the round advance?" with the
 *      state at that moment.
 *
 * The hook owns its two internal refs (prevFeedbackRef,
 * prevIndexRef).  `isProcessingRef` stays in App.tsx because
 * useGameModeActions + the JSX read it too — we take it as an
 * input and just update its .current.
 */
import { useEffect, useRef } from 'react';
import { getGameDebugger } from '../utils/gameDebug';
import type { GameMode } from '../constants/game';
import type { View } from '../core/views';
import type { Word } from '../data/vocabulary';

export type FeedbackState = 'correct' | 'wrong' | 'show-answer' | null;

export interface UseFeedbackTrackingParams {
  feedback: FeedbackState;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  currentIndex: number;
  view: View;
  gameMode: GameMode;
  showModeSelection: boolean;
  showModeIntro: boolean;
  isFinished: boolean;
  gameWords: Word[];
  /** Shared with useGameModeActions + the game UI — the hook updates
   *  .current to `!!feedback` on every change but doesn't own it. */
  isProcessingRef: React.MutableRefObject<boolean>;
}

export function useFeedbackTracking(params: UseFeedbackTrackingParams): void {
  const {
    feedback, setFeedback,
    currentIndex, view, gameMode,
    showModeSelection, showModeIntro, isFinished,
    gameWords,
    isProcessingRef,
  } = params;

  const gameDebug = getGameDebugger();

  // ─── 1. Processing-ref mirror + log ────────────────────────────────
  useEffect(() => {
    isProcessingRef.current = !!feedback;
    gameDebug.logProcessing({
      isProcessing: !!feedback,
      reason: `feedback changed to ${feedback}`,
    });
  }, [feedback, isProcessingRef]);

  // ─── 2. 5-second failsafe to clear stuck feedback ─────────────────
  useEffect(() => {
    if (!feedback) return;
    const failsafeTimer = setTimeout(() => {
      setFeedback(null);
    }, 5000);
    return () => clearTimeout(failsafeTimer);
  }, [feedback, setFeedback]);

  // ─── 3. Feedback state-transition log ─────────────────────────────
  const prevFeedbackRef = useRef<string | null>(feedback);
  useEffect(() => {
    if (prevFeedbackRef.current !== feedback) {
      gameDebug.logFeedback({
        from: prevFeedbackRef.current,
        to: feedback,
        reason: 'state_change',
      });
      prevFeedbackRef.current = feedback;
    }
  }, [feedback]);

  // ─── 4. Word-change log ───────────────────────────────────────────
  const prevIndexRef = useRef<number>(currentIndex);
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex && view === 'game') {
      const fromIndex = prevIndexRef.current;
      const toIndex = currentIndex;
      const word = gameWords[toIndex];
      gameDebug.logWordChange({
        fromIndex,
        toIndex,
        word: word ? { id: word.id, english: word.english } : undefined,
      });
      gameDebug.logState({
        view,
        gameMode,
        showModeSelection,
        showModeIntro,
        currentIndex: toIndex,
        isFinished,
        feedback,
        isProcessing: isProcessingRef.current,
        currentWord: word ? { id: word.id, english: word.english } : undefined,
      }, 'after_word_change');
      prevIndexRef.current = toIndex;
    }
  }, [currentIndex, view, gameMode, showModeSelection, showModeIntro, isFinished, feedback, gameWords, isProcessingRef]);
}
