/**
 * useGameModeActions — every "user did something in a game mode" handler,
 * extracted from App.tsx so the orchestrator file isn't carrying the full
 * weight of the game logic.
 *
 * Mechanical extraction: the handlers do exactly what they did inline in
 * App.tsx, just with state values + setters + a few callbacks plumbed in
 * via params. No behavior changes. No deduplication of the "correct →
 * advance" / "wrong → retry" patterns yet — that's a follow-up; this
 * commit is purely about getting the code out of App.tsx.
 *
 * One concession: useGameModeActionsParams has ~30 fields. That's the
 * cost of pulling deep game state into a hook. The alternative (a
 * useGameState hook that owns the state itself) is a bigger refactor;
 * we save that for when these handlers grow further.
 */
import React from "react";
import { addUnique, removeKey, shuffle } from "../utils";
import { celebrate } from "../utils/celebrate";
import { isAnswerCorrect } from "../utils/answerMatch";
import { getGameDebugger } from "../utils/gameDebug";
import {
  AUTO_SKIP_DELAY_MS,
  MAX_ATTEMPTS_PER_WORD,
  SHOW_ANSWER_DELAY_MS,
  WRONG_FEEDBACK_DELAY_MS,
} from "../constants/game";
import type { Word } from "../data/vocabulary";
import type { AssignmentData } from "../core/supabase";

type Feedback = "correct" | "wrong" | "show-answer" | null;
type SentenceFeedback = "correct" | "wrong" | null;
type SelectedMatch = { id: number; type: "english" | "arabic" } | null;
type WordAttempt = { word_id: number; is_correct: boolean };

export interface UseGameModeActionsParams {
  // ─── Game progression ─────────────────────────────────────────────
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  gameWords: Word[];
  currentWord: Word | null | undefined;
  gameMode: string;

  // ─── Per-question feedback / mistakes ─────────────────────────────
  feedback: Feedback;
  setFeedback: React.Dispatch<React.SetStateAction<Feedback>>;
  mistakes: number[];
  setMistakes: React.Dispatch<React.SetStateAction<number[]>>;
  setHiddenOptions: React.Dispatch<React.SetStateAction<number[]>>;

  // ─── Mastery tracking ─────────────────────────────────────────────
  wordAttempts: Record<number, number>;
  setWordAttempts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  setWordAttemptBatch: React.Dispatch<React.SetStateAction<WordAttempt[]>>;

  // ─── True/False mode ──────────────────────────────────────────────
  tfOption: Word | null | undefined;

  // ─── Spelling mode ────────────────────────────────────────────────
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;

  // ─── Flashcard mode ───────────────────────────────────────────────
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;

  // ─── Matching mode ────────────────────────────────────────────────
  selectedMatch: SelectedMatch;
  setSelectedMatch: React.Dispatch<React.SetStateAction<SelectedMatch>>;
  matchedIds: number[];
  setMatchedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isMatchingProcessing: boolean;
  setIsMatchingProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  matchingPairs: Array<unknown>;

  // ─── Sentence-builder mode ────────────────────────────────────────
  activeAssignment: AssignmentData | null;
  sentenceIndex: number;
  setSentenceIndex: React.Dispatch<React.SetStateAction<number>>;
  availableWords: string[];
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  builtSentence: string[];
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  setSentenceFeedback: React.Dispatch<React.SetStateAction<SentenceFeedback>>;

  // ─── Refs ─────────────────────────────────────────────────────────
  feedbackTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  isProcessingRef: React.MutableRefObject<boolean>;

  // ─── External callbacks (owned by App.tsx) ────────────────────────
  /** Throttled socket emit — passes the new score to the live monitor. */
  emitScoreUpdate: (newScore: number) => void;
  /** Persist the score / final progress row. */
  saveScore: (scoreOverride?: number, maxScoreOverride?: number) => void | Promise<void>;
  /** TTS for full-text speech (window.speechSynthesis path). */
  speak: (text: string) => void;
  /** TTS for individual words (Neural2 path via useAudio). */
  speakWord: (wordId: number, fallbackText?: string) => void;
  /** Sad-trombone sound for wrong answers. */
  playWrong: () => void;
}

export function useGameModeActions(params: UseGameModeActionsParams) {
  const {
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
    setAvailableWords, builtSentence, setBuiltSentence,
    setSentenceFeedback,
    feedbackTimeoutRef, isProcessingRef,
    emitScoreUpdate, saveScore,
    speak, speakWord, playWrong,
  } = params;

  const gameDebug = getGameDebugger();

  // ─── Sentence builder ─────────────────────────────────────────────
  const handleSentenceWordTap = (word: string, fromAvailable: boolean) => {
    if (fromAvailable) {
      setAvailableWords(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
      setBuiltSentence(prev => [...prev, word]);
    } else {
      setBuiltSentence(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
      setAvailableWords(prev => [...prev, word]);
    }
  };

  const handleSentenceCheck = () => {
    const sentences = (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter(s => s.trim().length > 0);
    const target = validSentences[sentenceIndex]?.trim().toLowerCase();
    const built = builtSentence.join(" ").toLowerCase();
    if (built === target) {
      setSentenceFeedback("correct");
      celebrate('small');
      speak(validSentences[sentenceIndex]);
      const newScore = score + 20;
      setScore(newScore);
      emitScoreUpdate(newScore);

      // Use feedbackTimeoutRef for consistent auto-advance
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        const next = sentenceIndex + 1;
        if (next >= validSentences.length) {
          setIsFinished(true);
          saveScore(newScore);
        } else {
          setSentenceIndex(next);
          setAvailableWords(shuffle(validSentences[next].split(" ").filter(Boolean)));
          setBuiltSentence([]);
          setSentenceFeedback(null);
          // Speak the next sentence so students know what to build
          setTimeout(() => speak(validSentences[next]), 400);
        }
      }, 1800);
    } else {
      setSentenceFeedback("wrong");

      // Use feedbackTimeoutRef for consistent feedback clearing
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setBuiltSentence([]);
        setAvailableWords(shuffle(validSentences[sentenceIndex].split(" ").filter(Boolean)));
        setSentenceFeedback(null);
      }, 1200);
    }
  };

  // ─── Matching mode ────────────────────────────────────────────────
  const handleMatchClick = (item: { id: number; type: 'english' | 'arabic' }) => {
    gameDebug.logButtonClick({
      button: 'matching_card',
      gameMode: 'matching',
      wordId: item.id,
      disabled: matchedIds.includes(item.id) || isMatchingProcessing,
      feedback: null,
    });

    if (matchedIds.includes(item.id) || isMatchingProcessing) {
      return;
    }

    // Only pronounce when clicking English cards — Hebrew/Arabic cards
    // should not trigger English audio (confusing for students)
    if (item.type === 'english') {
      const matchWord = gameWords.find(w => w.id === item.id);
      setTimeout(() => {
        speakWord(item.id, matchWord?.english);
        gameDebug.logPronunciation({ wordId: item.id, word: matchWord?.english || '', method: 'manual', success: true });
      }, 0);
    }

    if (!selectedMatch) {
      setSelectedMatch(item);
    } else {
      if (selectedMatch.type !== item.type && selectedMatch.id === item.id) {
        // Correct match - set processing flag to prevent rapid clicks
        isProcessingRef.current = true;
        setIsMatchingProcessing(true);
        setMatchedIds([...matchedIds, item.id]);
        // Record the correct match as a word attempt for mastery tracking.
        setWordAttemptBatch(prev => [...prev, { word_id: item.id, is_correct: true }]);
        const newScore = score + 15;
        setScore(newScore);

        emitScoreUpdate(newScore);

        setSelectedMatch(null);

        if (matchedIds.length + 1 === matchingPairs.length / 2) {
          // All matched - finish game
          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(() => {
            setIsFinished(true);
            saveScore(newScore);
            isProcessingRef.current = false;
            setIsMatchingProcessing(false);
          }, 500);
        } else {
          // Allow next match after brief delay
          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            setIsMatchingProcessing(false);
          }, 300);
        }
      } else {
        // Wrong match - just change selection
        setSelectedMatch(item);
      }
    }
  };

  // ─── Multiple choice (classic / listening / reverse / etc.) ───────
  const handleAnswer = (selectedWord: Word) => {
    if (feedback) {
      return;
    }

    if (!currentWord) {
      console.error('[handleAnswer] ERROR - No currentWord!', { selectedWordId: selectedWord.id, gameMode, currentIndex, gameWordsCount: gameWords.length });
      return;
    }

    if (selectedWord.id === currentWord.id) {
      setFeedback("correct");
      celebrate('small');
      const newScore = score + 10;
      setScore(newScore);

      // Clear attempts for this word since they got it right
      setWordAttempts(prev => {
        const newState = { ...prev };
        delete newState[currentWord.id];
        return newState;
      });

      // Record the correct attempt for per-word mastery tracking.
      setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: true }]);

      emitScoreUpdate(newScore);

      // Auto-skip quickly after correct answer (clear any pending timeout first)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
          setHiddenOptions([]);
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, AUTO_SKIP_DELAY_MS);
    } else {
      // Track attempts for this word
      const currentAttempts = (wordAttempts[currentWord.id] || 0) + 1;
      setWordAttempts(prev => ({ ...prev, [currentWord.id]: currentAttempts }));

      if (currentAttempts >= MAX_ATTEMPTS_PER_WORD) {
        // Show the right answer after max attempts
        setFeedback("show-answer");
        setMistakes(prev => addUnique(prev, currentWord.id));
        // Final incorrect attempt on this word — record for mastery tracking.
        setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: false }]);

        // Clear any pending timeout first
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          if (currentIndex < gameWords.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setFeedback(null);
            setHiddenOptions([]);
            // Clear attempts for next word
            setWordAttempts(prev => removeKey(prev, currentWord.id));
          } else {
            setIsFinished(true);
            saveScore();
          }
        }, SHOW_ANSWER_DELAY_MS);
      } else {
        // Show try again with attempt count
        setFeedback("wrong");
        playWrong();

        // Clear any pending timeout first
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedback(null);
        }, WRONG_FEEDBACK_DELAY_MS);
      }
    }
  };

  // ─── True / False ─────────────────────────────────────────────────
  const handleTFAnswer = (isTrue: boolean) => {
    gameDebug.logButtonClick({
      button: isTrue ? 'true_button' : 'false_button',
      gameMode,
      wordId: currentWord?.id ?? -1,
      disabled: !!feedback,
      feedback,
    });

    if (feedback) {
      gameDebug.logButtonClick({
        button: isTrue ? 'true_button' : 'false_button',
        gameMode,
        wordId: currentWord?.id ?? -1,
        disabled: true,
        feedback,
      });
      return;
    }

    // Guard against null/undefined tfOption
    if (!tfOption || !currentWord) {
      gameDebug.logError({
        error: 'tfOption or currentWord is null',
        context: 'handleTFAnswer',
        details: { tfOption, currentWord },
      });
      return;
    }

    const isActuallyTrue = tfOption?.id === currentWord.id;
    const isCorrect = isTrue === isActuallyTrue;

    gameDebug.logAnswer({
      gameMode,
      wordId: currentWord.id,
      userAnswer: isTrue,
      correctAnswer: isActuallyTrue,
      isCorrect,
      willAutoSkip: isCorrect,
    });

    // Record the attempt for per-word mastery tracking.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: isCorrect }]);

    if (isCorrect) {
      setFeedback("correct");
      celebrate('small');
      const newScore = score + 15;
      setScore(newScore);

      emitScoreUpdate(newScore);

      // Auto-skip after correct answer (clear any pending timeout first)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      gameDebug.logAutoSkip({
        triggered: true,
        delay: AUTO_SKIP_DELAY_MS,
        reason: 'correct_answer',
      });
      feedbackTimeoutRef.current = setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, AUTO_SKIP_DELAY_MS);
    } else {
      setFeedback("wrong");
      playWrong();
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }

      gameDebug.logAutoSkip({
        triggered: false,
        delay: WRONG_FEEDBACK_DELAY_MS,
        reason: 'wrong_answer_will_clear_after_delay',
      });

      // Clear feedback after delay (clear any pending timeout first)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, WRONG_FEEDBACK_DELAY_MS);
    }
  };

  // ─── Flashcards ───────────────────────────────────────────────────
  const handleFlashcardAnswer = (knewIt: boolean) => {
    if (!currentWord) return;
    gameDebug.logButtonClick({
      button: knewIt ? 'flashcard_got_it' : 'flashcard_still_learning',
      gameMode: 'flashcards',
      wordId: currentWord?.id ?? -1,
      disabled: false,
      feedback,
    });

    // Set processing flag to prevent double-clicks
    isProcessingRef.current = true;

    // Record the flashcard answer for per-word mastery tracking.
    // Flashcard "Got it" = correct, "Still learning" = incorrect.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: knewIt }]);

    let currentScore = score;
    if (knewIt) {
      currentScore = score + 5;
      setScore(currentScore);
      emitScoreUpdate(currentScore);
    } else {
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
    }

    // Auto-advance to next word with brief delay for visual feedback
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (currentIndex < gameWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        isProcessingRef.current = false;
      } else {
        setIsFinished(true);
        saveScore(currentScore);
      }
    }, 400); // Brief delay for user to see their choice registered
  };

  // ─── Spelling ─────────────────────────────────────────────────────
  const handleSpellingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWord) return;

    gameDebug.logButtonClick({
      button: 'spelling_submit',
      gameMode: 'spelling',
      wordId: currentWord?.id ?? -1,
      disabled: !!feedback,
      feedback,
    });

    if (feedback) {
      return;
    }

    const isCorrect = isAnswerCorrect(spellingInput, currentWord.english);

    gameDebug.logAnswer({
      gameMode: 'spelling',
      wordId: currentWord.id,
      userAnswer: spellingInput,
      correctAnswer: currentWord.english,
      isCorrect,
      willAutoSkip: isCorrect,
    });

    // Record the spelling attempt for per-word mastery tracking.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: isCorrect }]);

    if (isCorrect) {
      setFeedback("correct");
      celebrate('small');
      const newScore = score + 20;
      setScore(newScore);

      emitScoreUpdate(newScore);

      gameDebug.logAutoSkip({
        triggered: true,
        delay: AUTO_SKIP_DELAY_MS,
        reason: 'correct_spelling',
      });

      // Use feedbackTimeoutRef for consistent auto-advance
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
          setSpellingInput("");
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, AUTO_SKIP_DELAY_MS);
    } else {
      setFeedback("wrong");
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
      // Use feedbackTimeoutRef for consistent feedback clearing
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), WRONG_FEEDBACK_DELAY_MS);
    }
  };

  return {
    handleSentenceWordTap,
    handleSentenceCheck,
    handleMatchClick,
    handleAnswer,
    handleTFAnswer,
    handleFlashcardAnswer,
    handleSpellingSubmit,
  };
}
