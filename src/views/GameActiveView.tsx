import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import type { AppUser, AssignmentData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { LeaderboardEntry } from "../core/types";
import { THEMES } from "../constants/game";
import { ShowAnswerFeedback } from "../components/ShowAnswerFeedback";
import FloatingButtons from "../components/FloatingButtons";
import ClassicModeGame from "../components/ClassicModeGame";
import GameHeader from "../components/game/GameHeader";
import WordPromptCard from "../components/game/WordPromptCard";
import PowerUpToolbar from "../components/game/PowerUpToolbar";
import MatchingModeGame from "../components/game/MatchingModeGame";
import TrueFalseGame from "../components/game/TrueFalseGame";
import FlashcardsGame from "../components/game/FlashcardsGame";
import LetterSoundsGame from "../components/game/LetterSoundsGame";
import SentenceBuilderGame from "../components/game/SentenceBuilderGame";
import SpellingGame from "../components/game/SpellingGame";

const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

type MatchItem = { id: number; text: string; type: 'english' | 'arabic' };
type MatchSelection = { id: number; type: 'english' | 'arabic' };

interface GameActiveViewProps {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  saveError: string | null;
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  score: number;
  xp: number;
  streak: number;
  targetLanguage: "hebrew" | "arabic";
  setTargetLanguage: React.Dispatch<React.SetStateAction<"hebrew" | "arabic">>;
  gameMode: string;
  gameWords: Word[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  currentWord: Word | undefined;
  feedback: "correct" | "wrong" | "show-answer" | null;
  options: Word[];
  hiddenOptions: number[];
  setHiddenOptions: React.Dispatch<React.SetStateAction<number[]>>;
  isMatchingProcessing: boolean;
  matchingPairs: MatchItem[];
  matchedIds: number[];
  selectedMatch: MatchSelection | null;
  tfOption: Word | null;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessingRef: React.MutableRefObject<boolean>;
  scrambledWord: string;
  revealedLetters: number;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  activeAssignment: AssignmentData | null;
  sentenceIndex: number;
  sentenceFeedback: "correct" | "wrong" | null;
  builtSentence: string[];
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  availableWords: string[];
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  /** Kept in the prop shape so App.tsx's existing wiring doesn't need
   *  to change, but no longer rendered — the per-game "Live Rank"
   *  sidebar was removed at teacher request (noisy during solo play). */
  leaderboard: Record<string, LeaderboardEntry>;
  isFinished: boolean;
  handleExitGame: () => void;
  handleAnswer: (word: Word) => void;
  handleMatchClick: (item: MatchSelection) => void;
  handleTFAnswer: (isTrue: boolean) => void;
  handleFlashcardAnswer: (gotIt: boolean) => void;
  handleSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleSentenceWordTap: (word: string, isFromAvailable: boolean) => void;
  handleSentenceCheck: () => void;
  speakWord: (wordId: number, fallbackText?: string) => void;
  speak: (text: string) => void;
  shuffle: <T>(arr: T[]) => T[];
}

export default function GameActiveView({
  user, setUser, saveError, setSaveError,
  score, xp, streak,
  targetLanguage, setTargetLanguage,
  gameMode, gameWords, currentIndex, setCurrentIndex, currentWord,
  feedback,
  options, hiddenOptions, setHiddenOptions,
  isMatchingProcessing, matchingPairs, matchedIds, selectedMatch,
  tfOption, isFlipped, setIsFlipped, isProcessingRef,
  scrambledWord, revealedLetters,
  spellingInput, setSpellingInput,
  activeAssignment, sentenceIndex, sentenceFeedback,
  builtSentence, setBuiltSentence, availableWords, setAvailableWords,
  leaderboard: _leaderboard, isFinished,
  handleExitGame, handleAnswer, handleMatchClick, handleTFAnswer,
  handleFlashcardAnswer, handleSpellingSubmit, handleSentenceWordTap,
  handleSentenceCheck, speakWord, speak, shuffle,
}: GameActiveViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  const renderModeContent = () => {
    if (gameMode === "classic" || gameMode === "listening" || gameMode === "reverse") {
      return (
        <ClassicModeGame
          gameMode={gameMode}
          currentWord={currentWord}
          options={options}
          hiddenOptions={hiddenOptions}
          feedback={feedback}
          targetLanguage={targetLanguage}
          gameWordsCount={gameWords.length}
          currentIndex={currentIndex}
          onAnswer={handleAnswer}
        />
      );
    }
    if (gameMode === "true-false") {
      return <TrueFalseGame tfOption={tfOption} targetLanguage={targetLanguage} feedback={feedback} onAnswer={handleTFAnswer} />;
    }
    if (gameMode === "flashcards") {
      return <FlashcardsGame isFlipped={isFlipped} setIsFlipped={setIsFlipped} isProcessingRef={isProcessingRef} onAnswer={handleFlashcardAnswer} />;
    }
    if (gameMode === "letter-sounds") {
      return (
        <LetterSoundsGame
          currentWord={currentWord}
          targetLanguage={targetLanguage}
          revealedLetters={revealedLetters}
          spellingInput={spellingInput}
          setSpellingInput={setSpellingInput}
          feedback={feedback}
          onSpellingSubmit={handleSpellingSubmit}
        />
      );
    }
    if (gameMode === "sentence-builder") {
      return (
        <SentenceBuilderGame
          activeAssignment={activeAssignment}
          sentenceIndex={sentenceIndex}
          sentenceFeedback={sentenceFeedback}
          builtSentence={builtSentence}
          setBuiltSentence={setBuiltSentence}
          availableWords={availableWords}
          setAvailableWords={setAvailableWords}
          onSentenceWordTap={handleSentenceWordTap}
          onSentenceCheck={handleSentenceCheck}
          speak={speak}
          shuffle={shuffle}
        />
      );
    }
    // Default: spelling / scramble
    return (
      <SpellingGame
        currentWord={currentWord}
        gameMode={gameMode}
        targetLanguage={targetLanguage}
        feedback={feedback}
        spellingInput={spellingInput}
        setSpellingInput={setSpellingInput}
        onSpellingSubmit={handleSpellingSubmit}
      />
    );
  };

  return (
    <div className={`min-h-screen ${user?.role === 'student' ? activeThemeConfig.colors.bg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-4 font-sans max-w-7xl mx-auto`}>
      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span className="text-sm">{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="ml-1 hover:opacity-75"
            aria-label="Dismiss error message"
            title="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <GameHeader
        score={score}
        xp={xp}
        streak={streak}
        targetLanguage={targetLanguage}
        setTargetLanguage={setTargetLanguage}
        onExit={handleExitGame}
      />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-6">
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
              <MatchingModeGame
                matchingPairs={matchingPairs}
                matchedIds={matchedIds}
                selectedMatch={selectedMatch}
                isMatchingProcessing={isMatchingProcessing}
                onMatchClick={handleMatchClick}
              />
            ) : (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-2 sm:p-6 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-blue-50 border-3 border-blue-600" : feedback === "wrong" ? "bg-red-50 border-3 border-red-500" : feedback === "show-answer" ? "bg-amber-50 border-3 border-amber-500" : "border-3 border-transparent"}`}
              >
                {/* Progress Bar */}
                <progress
                  className="absolute top-0 left-0 h-2 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
                  max={100}
                  value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
                />

                {/* Show correct answer after 3 failed attempts */}
                {feedback === "show-answer" && (
                  <div className="absolute top-12 sm:top-16 left-0 right-0 flex justify-center pointer-events-none z-20">
                    <ShowAnswerFeedback
                      answer={gameMode === "reverse" ? currentWord?.english : currentWord?.[targetLanguage]}
                      dir="auto"
                    />
                  </div>
                )}

                <WordPromptCard
                  currentIndex={currentIndex}
                  gameWordsLength={gameWords.length}
                  currentWord={currentWord}
                  gameMode={gameMode}
                  targetLanguage={targetLanguage}
                  feedback={feedback}
                  isFlipped={isFlipped}
                  scrambledWord={scrambledWord}
                  speakWord={speakWord}
                />

                {user?.role === "student" && gameMode !== "flashcards" && gameMode !== "sentence-builder" && !isFinished && (
                  <PowerUpToolbar
                    user={user}
                    gameMode={gameMode}
                    feedback={feedback}
                    options={options}
                    hiddenOptions={hiddenOptions}
                    setHiddenOptions={setHiddenOptions}
                    currentWord={currentWord}
                    gameWordsLength={gameWords.length}
                    spellingInput={spellingInput}
                    setSpellingInput={setSpellingInput}
                    setCurrentIndex={setCurrentIndex}
                    setUser={setUser}
                    shuffle={shuffle}
                  />
                )}

                {renderModeContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {gameMode !== "matching" && (
        <div className="w-full max-w-5xl mt-12 flex justify-center">
          <div className="w-full max-w-md">
            <progress
              className="h-2 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-stone-200 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
              max={100}
              value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
            />
            <p className="text-center text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">
              Word {currentIndex + 1} of {gameWords.length}
            </p>
          </div>
        </div>
      )}
      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
