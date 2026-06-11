/**
 * GameRouteContext — carries App.tsx's game-flow prop bag (the ~70
 * fields that used to be drilled through renderGameRoute) down to the
 * four game-flow views without manual prop forwarding.
 *
 * WHY a context: the game flow is a deep, single-owner subtree.  App.tsx
 * owns all the state + handlers; GameActiveView / GameModeIntroView /
 * GameFinishedView are the only real consumers.  Drilling ~70 props
 * through GameRoutes was pure plumbing — context removes the middle hop.
 *
 * The interface lives here (single source of truth) and is re-exported
 * from GameRoutes.tsx so existing importers don't break.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type React from 'react';
import type { AppUser, AssignmentData, ProgressData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';
import type { GameMode } from '../constants/game';
import type { LeaderboardEntry } from '../core/types';
import type { QpStudentEntry } from '../core/quickPlayProtocol';
import type { Language } from '../hooks/useLanguage';

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

  // Mode-selection branch — explorer pet (island picker)
  petDisplayName: string;
  petXp: number;
  petCurrentStage: import('../constants/game').PetMilestone;
  petNextStage: import('../constants/game').PetMilestone | null;
  petClaimableMilestone: import('../constants/game').PetMilestone | null;
  onClaimPetMilestone: (milestone: import('../constants/game').PetMilestone) => void;

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
  /** Live Quick Play session leaderboard (merged across VMs) — lets the
   *  finish screen show "3rd of 24 students" without a network call. */
  qpLeaderboard: QpStudentEntry[];
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

const GameRouteContext = createContext<GameRoutesDeps | null>(null);

/**
 * Provider for the game-flow prop bag.  App.tsx wraps the game tail with
 * this and passes its existing object literal as `value`.
 *
 * WHY the value is NOT memoized at the call site: App passes the same
 * inline object literal it used to pass to renderGameRoute(), so the
 * context value's per-render identity is byte-for-byte identical to the
 * old prop object.  Memoizing here (or in App) would change consumer
 * re-render timing — every render currently produces a fresh bag, and
 * the consuming views depend on that to pick up new state each frame.
 * Preserving the un-memoized identity keeps behavior identical.
 */
export function GameRouteProvider({
  value,
  children,
}: {
  value: GameRoutesDeps;
  children: ReactNode;
}) {
  return <GameRouteContext.Provider value={value}>{children}</GameRouteContext.Provider>;
}

/** Read the game-flow prop bag.  Throws if used outside the provider. */
export function useGameRoute(): GameRoutesDeps {
  const ctx = useContext(GameRouteContext);
  if (ctx === null) {
    throw new Error('useGameRoute must be used within a GameRouteProvider');
  }
  return ctx;
}
