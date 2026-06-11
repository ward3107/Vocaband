/**
 * useGameRouteDeps — assembles the GameRouteProvider value bag for App.tsx.
 *
 * Absorbs the game-tail wiring whose outputs fed ONLY this bag:
 *
 *   - useGameRoundOptions   (options / tfOption / scrambledWord)
 *   - useFeedbackTracking   (effect-only instrumentation)
 *   - useSpeechVoiceManager (speak)
 *   - useGameModeSetup      (effect-only per-mode init)
 *   - useGameFinish         (saveScore / handleExitGame)
 *   - useGameModeActions    (the seven per-mode answer handlers)
 *
 * plus the plain (non-hook) constructions those hooks consume:
 * buildEmitScoreUpdate, buildCleanupQuickPlayGuest, getGameDebugger, the
 * QP cumulative-score wrapper, and the pet-milestone claim closure.
 *
 * WHY the hook order is safe: these six hooks were already called as a
 * contiguous block in App.tsx (nothing that stays in App was interleaved
 * between them), and App calls this builder at the exact position the
 * first of them (useGameRoundOptions) used to occupy — so the global
 * hook call sequence is byte-for-byte unchanged.
 *
 * WHY the returned bag is NOT memoized: it's the same fresh object literal
 * App always passed to GameRouteProvider, so the context value's identity
 * per render is unchanged — consumer re-render behavior stays identical to
 * the inline version.  Memoizing would change re-render timing.
 */
import type React from 'react';
import type { GameRoutesDeps } from '../views/GameRouteContext';
import { useGameRoundOptions } from './useGameRoundOptions';
import { useFeedbackTracking } from './useFeedbackTracking';
import { useSpeechVoiceManager } from './useSpeechVoiceManager';
import { useGameModeSetup } from './useGameModeSetup';
import { useGameFinish } from './useGameFinish';
import { useGameModeActions } from './useGameModeActions';
import { buildEmitScoreUpdate } from '../handlers/emitScoreUpdate';
import { buildCleanupQuickPlayGuest } from '../handlers/sessionCleanups';
import {
  grantRetentionXp,
  grantNonXpReward,
  claimPetMilestoneReward,
} from '../handlers/retentionGrants';
import { getGameDebugger } from '../utils/gameDebug';
import { shuffle } from '../utils';
import type { PetMilestone } from '../constants/game';

// Param shapes of the absorbed hooks — referencing them keeps the args
// interface exactly as wide as what the hooks accept, without restating.
type FinishParams = Parameters<typeof useGameFinish>[0];
type ActionParams = Parameters<typeof useGameModeActions>[0];
type SetupParams = Parameters<typeof useGameModeSetup>[0];
type EmitParams = Parameters<typeof buildEmitScoreUpdate>[0];

/** Everything App.tsx still owns (shared state, refs, cross-hook
 *  collaborators).  Bag fields produced inside this hook are Omit-ed;
 *  the extra fields are inputs to the absorbed hooks that never appear
 *  in the bag itself. */
export type UseGameRouteDepsArgs = Omit<
  GameRoutesDeps,
  | 'options' | 'tfOption' | 'scrambledWord'
  | 'speak' | 'shuffle' | 'gameDebug'
  | 'saveScore' | 'handleExitGame'
  | 'handleAnswer' | 'handleMatchClick' | 'handleTFAnswer'
  | 'handleFlashcardAnswer' | 'handleSpellingSubmit'
  | 'handleSentenceWordTap' | 'handleSentenceCheck'
  | 'cleanupQuickPlayGuest'
  | 'petDisplayName' | 'petXp' | 'petCurrentStage' | 'petNextStage'
  | 'petClaimableMilestone' | 'onClaimPetMilestone'
> & {
  // saveScore progression writes
  setXp: FinishParams['setXp'];
  coins: number;
  setCoins: FinishParams['setCoins'];
  setStreak: FinishParams['setStreak'];
  setStudentProgress: FinishParams['setStudentProgress'];
  setIsSaving: FinishParams['setIsSaving'];
  setQuickPlayCompletedModes: FinishParams['setQuickPlayCompletedModes'];
  wordAttempts: ActionParams['wordAttempts'];
  wordAttemptBatch: FinishParams['wordAttemptBatch'];
  setWordAttemptBatch: FinishParams['setWordAttemptBatch'];
  // Cross-hook collaborators (owned by App's earlier hooks)
  retention: FinishParams['retention'] & {
    currentPetStage: PetMilestone;
    nextPetStage: PetMilestone | null;
    claimablePetMilestone: PetMilestone | null;
    claimPetMilestone: (m: PetMilestone) => void;
  };
  boosters: FinishParams['boosters'];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  awardBadge: FinishParams['awardBadge'];
  queueSaveOperation: FinishParams['queueSaveOperation'];
  // Score-emit plumbing
  socket: EmitParams['socket'];
  qpCumulativeScoreRef: EmitParams['qpCumulativeScoreRef'];
  lastScoreEmitRef: EmitParams['lastScoreEmitRef'];
  quickPlaySocketUpdateScore: FinishParams['quickPlaySocketUpdateScore'];
  feedbackTimeoutRef: ActionParams['feedbackTimeoutRef'];
  // Per-mode mechanics setters consumed only by setup/actions/finish
  setMatchingPairs: SetupParams['setMatchingPairs'];
  setSelectedMatch: SetupParams['setSelectedMatch'];
  setMatchedIds: SetupParams['setMatchedIds'];
  setIsMatchingProcessing: ActionParams['setIsMatchingProcessing'];
  setRevealedLetters: SetupParams['setRevealedLetters'];
  setSentenceIndex: SetupParams['setSentenceIndex'];
  setSentenceFeedback: SetupParams['setSentenceFeedback'];
  playWrong: ActionParams['playWrong'];
};

export function useGameRouteDeps(args: UseGameRouteDepsArgs): GameRoutesDeps {
  const {
    view, user, setUser, language,
    showModeSelection, setShowModeSelection, activeAssignment, studentProgress,
    setGameMode, setShowModeIntro, setView, quickPlayCompletedModes,
    showModeIntro, hasChosenLanguage, setHasChosenLanguage, setTargetLanguage,
    gameMode, currentIndex, isFinished, feedback, isProcessingRef, currentWord,
    score, xp, streak, badges, mistakes, gameWords, quickPlayActiveSession,
    isSaving, saveError, toasts, confirmDialog, setConfirmDialog,
    setIsFinished, setScore, setCurrentIndex, setMistakes, setFeedback,
    setWordAttempts, setHiddenOptions, setSpellingInput, setAssignmentWords,
    cleanupSessionData, setQuickPlayActiveSession, setQuickPlayStudentName,
    setSaveError, targetLanguage, hiddenOptions,
    isMatchingProcessing, matchingPairs, matchedIds, selectedMatch,
    isFlipped, setIsFlipped, revealedLetters, spellingInput,
    sentenceIndex, sentenceFeedback, builtSentence, setBuiltSentence,
    availableWords, setAvailableWords, leaderboard,
    speakWord,
    setXp, coins, setCoins, setStreak, setStudentProgress,
    setIsSaving, setQuickPlayCompletedModes,
    wordAttempts, wordAttemptBatch, setWordAttemptBatch,
    retention, boosters, showToast, awardBadge, queueSaveOperation,
    socket, qpCumulativeScoreRef, lastScoreEmitRef, quickPlaySocketUpdateScore,
    feedbackTimeoutRef,
    setMatchingPairs, setSelectedMatch, setMatchedIds, setIsMatchingProcessing,
    setRevealedLetters, setSentenceIndex, setSentenceFeedback,
    playWrong,
  } = args;

  const gameDebug = getGameDebugger();

  // Per-round derived data: 4-way options, T/F option, scrambled letters.
  const { options, tfOption, scrambledWord } = useGameRoundOptions({
    currentWord, gameWords, currentIndex,
  });

  // Feedback instrumentation: 5 s failsafe, processing-ref mirror,
  // and gameDebug logs for feedback + word-change transitions.
  useFeedbackTracking({
    feedback, setFeedback,
    currentIndex, view, gameMode,
    showModeSelection, showModeIntro, isFinished,
    gameWords, isProcessingRef,
  });

  // Voice selection + caching + voiceschanged listener are bundled in
  // a hook so App doesn't hold browser-API plumbing.  speak() is the
  // same cancel-then-speak wrapper with parenthetical cleanup.
  const { speak } = useSpeechVoiceManager();

  // Per-game-mode setup effects: auto-speak on word advance,
  // matching-mode pairs build, letter-sounds reveal animation,
  // sentence-builder first-sentence load.  All share the same
  // `view === "game" && !showModeSelection` guard pattern.
  useGameModeSetup({
    view, gameMode, currentWord, currentIndex, gameWords,
    showModeSelection, showModeIntro, isFinished,
    targetLanguage, activeAssignment,
    speakWord, speak,
    setMatchingPairs, setMatchedIds, setSelectedMatch,
    setRevealedLetters,
    setSentenceIndex, setAvailableWords, setBuiltSentence, setSentenceFeedback,
  });

  // Guest exit cleanup — sign out anon auth, drop the resume hint,
  // reset completedModes.  See handlers/sessionCleanups.
  const cleanupQuickPlayGuest = buildCleanupQuickPlayGuest(
    () => user,
    () => quickPlayActiveSession,
    setQuickPlayCompletedModes,
  );

  // Throttled Socket.IO score emit — routes to the live-challenge `/`
  // namespace or the Quick Play `/quick-play` namespace depending on
  // context. See handlers/emitScoreUpdate.
  const emitScoreUpdate = buildEmitScoreUpdate({
    user, socket, isFinished,
    quickPlayActiveSession,
    qpCumulativeScoreRef, lastScoreEmitRef,
    quickPlaySocketUpdateScore,
  });

  // Game-finish handlers (saveScore + handleExitGame).  saveScore is
  // large — anti-farm cap, booster math, streak handling, badge checks,
  // optimistic save with retry queue.
  const { saveScore, handleExitGame } = useGameFinish({
    user,
    score, gameMode, gameWords, mistakes, wordAttemptBatch, activeAssignment,
    quickPlayActiveSession,
    // On mode-finish: accumulate this mode's finalScore into the
    // session-wide cumulative BEFORE emitting, so the QP socket sees a
    // monotonically-increasing total across modes (server rejects
    // regresses).
    quickPlaySocketUpdateScore: (finalScore: number, extras?: {
      streak?: number;
      roundProgress?: { done: number; total: number };
      perfectRound?: boolean;
    }) => {
      qpCumulativeScoreRef.current += Math.max(0, finalScore);
      quickPlaySocketUpdateScore(qpCumulativeScoreRef.current, extras);
    },
    xp, setXp, coins, setCoins, streak, setStreak, badges, studentProgress, setStudentProgress,
    setIsSaving, setSaveError, setQuickPlayCompletedModes,
    retention, boosters,
    showToast, awardBadge, queueSaveOperation,
    setView, setUser, setIsFinished, setCurrentIndex, setScore, setMistakes,
    setWordAttemptBatch, setFeedback, setSpellingInput, setMatchedIds,
    setSelectedMatch, setIsFlipped, setRevealedLetters, setSentenceIndex,
    setAvailableWords, setBuiltSentence, setSentenceFeedback, setHiddenOptions,
    showModeSelection, setShowModeSelection,
    // App's quickPlayActiveSession setter is wider than the hook needs;
    // the hook only sets it to null on exit, so the cast is sound.
    setQuickPlayActiveSession: setQuickPlayActiveSession as React.Dispatch<React.SetStateAction<{ id: string; sessionCode: string; [k: string]: unknown } | null>>,
    setQuickPlayStudentName,
    cleanupSessionData, cleanupQuickPlayGuest,
  });

  // Per-mode answer handlers.  Must be called AFTER `saveScore` and
  // `emitScoreUpdate` are defined (the hook closes over them as
  // callbacks).
  const {
    handleSentenceWordTap,
    handleSentenceCheck,
    handleMatchClick,
    handleAnswer,
    handleTFAnswer,
    handleFlashcardAnswer,
    handleSpellingSubmit,
  } = useGameModeActions({
    score, setScore, currentIndex, setCurrentIndex, setIsFinished,
    gameWords, currentWord, gameMode,
    feedback, setFeedback, mistakes, setMistakes, setHiddenOptions,
    wordAttempts, setWordAttempts, setWordAttemptBatch,
    tfOption,
    spellingInput, setSpellingInput,
    setIsFlipped,
    selectedMatch, setSelectedMatch,
    matchedIds, setMatchedIds,
    isMatchingProcessing, setIsMatchingProcessing,
    matchingPairs,
    activeAssignment, sentenceIndex, setSentenceIndex,
    availableWords, setAvailableWords, builtSentence, setBuiltSentence,
    setSentenceFeedback,
    feedbackTimeoutRef, isProcessingRef,
    emitScoreUpdate, saveScore,
    speak, speakWord, playWrong,
  });

  // Fresh object literal each render — same identity semantics as the
  // inline bag App used to pass (see header comment).
  return {
    view, user, setUser, language,
    showModeSelection, setShowModeSelection, activeAssignment, studentProgress,
    setGameMode, setShowModeIntro, setView, handleExitGame, quickPlayCompletedModes,
    petDisplayName: user?.displayName ?? '',
    petXp: xp,
    petCurrentStage: retention.currentPetStage,
    petNextStage: retention.nextPetStage,
    petClaimableMilestone: retention.claimablePetMilestone,
    onClaimPetMilestone: (milestone: PetMilestone) => claimPetMilestoneReward(
      milestone,
      (v, r) => grantRetentionXp(v, r, { user, setXp, showToast }),
      (k, v) => grantNonXpReward(k, v, { user, setUser }),
      retention.claimPetMilestone,
    ),
    showModeIntro, hasChosenLanguage, setHasChosenLanguage, setTargetLanguage,
    gameDebug, gameMode, currentIndex, isFinished, feedback, isProcessingRef, currentWord,
    score, xp, streak, badges, mistakes, gameWords, quickPlayActiveSession,
    isSaving, saveError, toasts, confirmDialog, setConfirmDialog,
    setIsFinished, setScore, setCurrentIndex, setMistakes, setFeedback,
    setWordAttempts, setHiddenOptions, setSpellingInput, setAssignmentWords,
    cleanupSessionData, cleanupQuickPlayGuest,
    setQuickPlayActiveSession, setQuickPlayStudentName,
    setSaveError, targetLanguage, options, hiddenOptions,
    isMatchingProcessing, matchingPairs, matchedIds, selectedMatch, tfOption,
    isFlipped, setIsFlipped, scrambledWord, revealedLetters, spellingInput,
    sentenceIndex, sentenceFeedback, builtSentence, setBuiltSentence,
    availableWords, setAvailableWords, leaderboard,
    saveScore, handleAnswer, handleMatchClick, handleTFAnswer,
    handleFlashcardAnswer, handleSpellingSubmit, handleSentenceWordTap, handleSentenceCheck,
    speakWord, speak, shuffle,
  };
}
