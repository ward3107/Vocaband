/**
 * The four game-flow view branches — mode selection (English or
 * Hebrew picker), mode intro (instructions + language picker),
 * game-finished (results + XP), and the default GameActiveView.
 *
 * Lifts ~165 lines of JSX out of App.tsx's tail.  The default branch
 * (GameActiveView) is rendered when none of the other game-flow gates
 * match — same as the bare return in App.tsx used to be.
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import type { AppUser, AssignmentData, ProgressData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';
import type { GameMode } from '../constants/game';
import type { LeaderboardEntry } from '../core/types';
import type { Language } from '../hooks/useLanguage';
import { gameActiveT } from '../locales/student/game-active';
import { primeAudio } from '../utils/primeAudio';

const HebrewModeSelectionView = lazyWithRetry(() => import('./HebrewModeSelectionView'));
const GameModeSelectionView = lazyWithRetry(() => import('./GameModeSelectionView'));
const GameModeIntroView = lazyWithRetry(() => import('./GameModeIntroView'));
const GameFinishedView = lazyWithRetry(() => import('./GameFinishedView'));
const GameActiveView = lazyWithRetry(() => import('./GameActiveView'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Anyish = any;

export interface GameRoutesDeps {
  view: View;
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  /** Selected UI language — used to localize Suspense loading
   *  messages for every code-split branch.  Caller passes
   *  `useLanguage().language`. */
  language: Language;

  // Mode-selection branch
  showModeSelection: boolean;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  activeAssignment: AssignmentData | null;
  studentProgress: ProgressData[];
  setGameMode: React.Dispatch<React.SetStateAction<GameMode>>;
  setShowModeIntro: React.Dispatch<React.SetStateAction<boolean>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  handleExitGame: () => void;
  quickPlayCompletedModes: Set<string>;

  // Mode-intro branch
  showModeIntro: boolean;
  hasChosenLanguage: boolean;
  setHasChosenLanguage: React.Dispatch<React.SetStateAction<boolean>>;
  setTargetLanguage: React.Dispatch<React.SetStateAction<'hebrew' | 'arabic'>>;
  gameDebug: Anyish;
  gameMode: GameMode;
  currentIndex: number;
  isFinished: boolean;
  feedback: 'correct' | 'wrong' | 'show-answer' | null;
  isProcessingRef: React.MutableRefObject<boolean>;
  currentWord: Word | undefined;

  // Game-finished branch
  score: number;
  xp: number;
  streak: number;
  badges: string[];
  mistakes: number[];
  gameWords: Word[];
  quickPlayActiveSession: { id: string; sessionCode: string } | null;
  isSaving: boolean;
  saveError: string | null;
  toasts: Anyish[];
  confirmDialog: Anyish;
  setConfirmDialog: React.Dispatch<React.SetStateAction<Anyish>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setMistakes: React.Dispatch<React.SetStateAction<number[]>>;
  setFeedback: React.Dispatch<React.SetStateAction<'correct' | 'wrong' | 'show-answer' | null>>;
  setWordAttempts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  setHiddenOptions: React.Dispatch<React.SetStateAction<number[]>>;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentWords: React.Dispatch<React.SetStateAction<Word[]>>;
  cleanupSessionData: () => void;
  cleanupQuickPlayGuest: () => Promise<void>;
  setQuickPlayActiveSession: React.Dispatch<
    React.SetStateAction<{
      id: string;
      sessionCode: string;
      wordIds: number[];
      words: Word[];
      allowedModes?: string[];
      aiSentences?: string[];
    } | null>
  >;
  setQuickPlayStudentName: React.Dispatch<React.SetStateAction<string>>;

  // Game-active branch
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  targetLanguage: 'hebrew' | 'arabic';
  options: Word[];
  hiddenOptions: number[];
  isMatchingProcessing: boolean;
  matchingPairs: Anyish[];
  matchedIds: number[];
  selectedMatch: { id: number; type: 'english' | 'arabic' } | null;
  tfOption: Anyish;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  scrambledWord: string;
  revealedLetters: number;
  spellingInput: string;
  sentenceIndex: number;
  sentenceFeedback: 'correct' | 'wrong' | null;
  builtSentence: string[];
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  availableWords: string[];
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  leaderboard: Record<string, LeaderboardEntry>;
  saveScore: Anyish;
  handleAnswer: Anyish;
  handleMatchClick: Anyish;
  handleTFAnswer: Anyish;
  handleFlashcardAnswer: Anyish;
  handleSpellingSubmit: Anyish;
  handleSentenceWordTap: Anyish;
  handleSentenceCheck: Anyish;
  speakWord: Anyish;
  speak: Anyish;
  shuffle: Anyish;
}

export function renderGameRoute(deps: GameRoutesDeps): ReactNode {
  const {
    view, user, setUser, language,
    showModeSelection, setShowModeSelection, activeAssignment, studentProgress,
    setGameMode, setShowModeIntro, setView, handleExitGame, quickPlayCompletedModes,
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
  } = deps;

  const tLoading = gameActiveT[language];

  // Mode picker — Hebrew assignments get the 4-mode native picker;
  // English ones get the full GameModeSelectionView.  Branch on the
  // assignment's subject column.
  if (view === 'game' && showModeSelection) {
    if (activeAssignment?.subject === 'hebrew') {
      return (
        <LazyWrapper loadingMessage={tLoading.loadingHebrewModes}>
          <HebrewModeSelectionView
            activeAssignment={activeAssignment}
            onPickMode={(mode) => {
              setShowModeSelection(false);
              if (mode === 'niqqud') setView('vocahebrew-niqqud');
              else if (mode === 'shoresh') setView('vocahebrew-shoresh');
              else if (mode === 'synonym') setView('vocahebrew-synonyms');
              else if (mode === 'listening') setView('vocahebrew-listening');
            }}
            onExit={handleExitGame}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage={tLoading.loadingGameModes}>
        <GameModeSelectionView
          activeAssignment={activeAssignment}
          studentProgress={studentProgress}
          isQuickPlayGuest={!!user?.isGuest}
          quickPlayCompletedModes={quickPlayCompletedModes}
          setGameMode={setGameMode}
          setShowModeSelection={setShowModeSelection}
          setShowModeIntro={setShowModeIntro}
          handleExitGame={handleExitGame}
        />
      </LazyWrapper>
    );
  }

  if (isFinished) {
    return (
      <LazyWrapper loadingMessage={tLoading.loadingResults}>
        <GameFinishedView
          user={user}
          score={score}
          xp={xp}
          streak={streak}
          badges={badges}
          mistakes={mistakes}
          gameWords={gameWords}
          quickPlaySessionCode={quickPlayActiveSession?.sessionCode}
          isSaving={isSaving}
          saveError={saveError}
          toasts={toasts}
          confirmDialog={confirmDialog}
          setConfirmDialog={setConfirmDialog}
          setIsFinished={setIsFinished}
          setScore={setScore}
          setCurrentIndex={setCurrentIndex}
          setMistakes={setMistakes}
          setFeedback={setFeedback}
          setWordAttempts={setWordAttempts}
          setHiddenOptions={setHiddenOptions}
          setSpellingInput={setSpellingInput}
          setAssignmentWords={setAssignmentWords}
          setShowModeSelection={setShowModeSelection}
          setView={setView}
          onQuickPlayExit={() => {
            cleanupSessionData();
            cleanupQuickPlayGuest().catch(() => { /* fire-and-forget */ });
            setQuickPlayActiveSession(null);
            setQuickPlayStudentName('');
            setUser(null);
            setView('public-landing');
          }}
        />
      </LazyWrapper>
    );
  }

  // Mode intro instructions with translations
  if (showModeIntro) {
    return (
      <LazyWrapper loadingMessage={tLoading.loadingGeneric}>
        <GameModeIntroView
          gameMode={gameMode}
          hasChosenLanguage={hasChosenLanguage}
          setHasChosenLanguage={setHasChosenLanguage}
          setTargetLanguage={setTargetLanguage}
          setShowModeIntro={setShowModeIntro}
          setShowModeSelection={setShowModeSelection}
          onLetsGo={() => {
            // iOS Safari audio unlock — the "Let's Go!" tap is the last
            // user-gesture before the first word auto-speaks from a
            // setTimeout in useGameModeSetup. Without priming here, iOS
            // silently swallows that first (and every) speak() call and
            // the student thinks the mode is broken. Idempotent + cheap.
            primeAudio();
            gameDebug.logModeIntroComplete({ mode: gameMode });
            gameDebug.logState({
              view, gameMode, showModeSelection, showModeIntro: false,
              currentIndex, isFinished, feedback,
              isProcessing: isProcessingRef.current,
              currentWord: currentWord ? { id: currentWord.id, english: currentWord.english } : undefined,
            }, 'lets_go_clicked');
            setShowModeIntro(false);
          }}
        />
      </LazyWrapper>
    );
  }

  // Default: game-active view.
  return (
    <LazyWrapper loadingMessage={tLoading.loadingGame}>
      <GameActiveView
        user={user}
        setUser={setUser}
        saveError={saveError}
        setSaveError={setSaveError}
        score={score}
        xp={xp}
        streak={streak}
        targetLanguage={targetLanguage}
        setTargetLanguage={setTargetLanguage}
        gameMode={gameMode}
        gameWords={gameWords}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        currentWord={currentWord}
        feedback={feedback}
        options={options}
        hiddenOptions={hiddenOptions}
        setHiddenOptions={setHiddenOptions}
        isMatchingProcessing={isMatchingProcessing}
        matchingPairs={matchingPairs}
        matchedIds={matchedIds}
        selectedMatch={selectedMatch}
        tfOption={tfOption}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        isProcessingRef={isProcessingRef}
        scrambledWord={scrambledWord}
        revealedLetters={revealedLetters}
        spellingInput={spellingInput}
        setSpellingInput={setSpellingInput}
        activeAssignment={activeAssignment}
        sentenceIndex={sentenceIndex}
        sentenceFeedback={sentenceFeedback}
        builtSentence={builtSentence}
        setBuiltSentence={setBuiltSentence}
        availableWords={availableWords}
        setAvailableWords={setAvailableWords}
        leaderboard={leaderboard}
        isFinished={isFinished}
        handleExitGame={handleExitGame}
        saveScore={saveScore}
        handleAnswer={handleAnswer}
        handleMatchClick={handleMatchClick}
        handleTFAnswer={handleTFAnswer}
        handleFlashcardAnswer={handleFlashcardAnswer}
        handleSpellingSubmit={handleSpellingSubmit}
        handleSentenceWordTap={handleSentenceWordTap}
        handleSentenceCheck={handleSentenceCheck}
        speakWord={speakWord}
        speak={speak}
        shuffle={shuffle}
      />
    </LazyWrapper>
  );
}
