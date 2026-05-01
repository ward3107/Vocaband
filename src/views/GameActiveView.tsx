import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import type { AppUser, AssignmentData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { LeaderboardEntry } from "../core/types";
import { THEMES } from "../constants/game";
import { useLanguage } from "../hooks/useLanguage";
import { gameActiveT } from "../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "../components/game/GameShell";

/** Phase-3 redesign: each mode picks a theme colour from the palette
 *  defined in `src/components/game/GameShell.tsx` (and indirectly the
 *  modeThemes table in GameModeIntroView).  The colour drives the
 *  prompt-card hero gradient, the mode-label pill, and the answer
 *  cards' resting-state border.  Modes not yet in the redesign queue
 *  fall through to undefined and keep their legacy stone styling. */
const MODE_THEME: Partial<Record<string, GameThemeColor>> = {
  classic: "emerald",
  listening: "emerald",
  reverse: "emerald",
  // True/False uses rose as the primary pill colour; the buttons
  // themselves keep their rose↔emerald split (False=rose, True=emerald)
  // since binary judgement reads strongest with paired colours.
  "true-false": "rose",
};

/** Short uppercase label shown in the top pill of every game.  Falls
 *  back to the gameMode string raw if a label isn't yet defined. */
const MODE_LABEL: Record<string, string> = {
  classic: "Classic",
  listening: "Listening",
  reverse: "Reverse",
  spelling: "Spelling",
  matching: "Matching",
  "true-false": "True / False",
  flashcards: "Flashcards",
  scramble: "Scramble",
  "letter-sounds": "Letter Sounds",
  "sentence-builder": "Sentence Builder",
  "fill-blank": "Fill in the Blank",
};
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
import FillBlankGame from "../components/game/FillBlankGame";
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
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const modeTheme: GameThemeColor | undefined = MODE_THEME[gameMode];
  const modeLabel = MODE_LABEL[gameMode] ?? gameMode;

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
          themeColor={modeTheme}
        />
      );
    }
    if (gameMode === "true-false") {
      return <TrueFalseGame tfOption={tfOption} targetLanguage={targetLanguage} feedback={feedback} onAnswer={handleTFAnswer} themeColor={modeTheme} />;
    }
    if (gameMode === "flashcards") {
      return (
        <FlashcardsGame
          currentWord={currentWord}
          targetLanguage={targetLanguage}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          isProcessingRef={isProcessingRef}
          onAnswer={handleFlashcardAnswer}
          speakWord={speakWord}
          themeColor={modeTheme}
        />
      );
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
          themeColor={modeTheme}
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
    if (gameMode === "fill-blank") {
      return (
        <FillBlankGame
          activeAssignment={activeAssignment}
          currentWord={currentWord}
          currentIndex={currentIndex}
          options={options}
          hiddenOptions={hiddenOptions}
          feedback={feedback}
          gameWordsCount={gameWords.length}
          onAnswer={handleAnswer}
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
        themeColor={modeTheme}
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
            aria-label={t.dismissError}
            title={t.dismissError}
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

      {/* After the Live Rank sidebar was removed, the old 4-column grid
          left the cards hugging the left edge with a blank 4th column
          where the widget used to be. Collapse to a single centered
          column so matching cards + quiz cards sit centered on the
          screen. Matching mode also gets vertical breathing room via
          a min-height so the grid sits mid-viewport instead of pinned
          under the header. */}
      {/* Phase-1 redesign (2026-04-30): every mode now sits in the
          vertical centre of the viewport on phones, not glued to the
          top with empty dead space below.  Previously only matching
          mode had this; other modes had `text-3xl` prompts hanging at
          the very top of the screen with the answer cards immediately
          below and a huge gap underneath.  Generalising the
          `flex items-center justify-center` wrapper centres every
          mode's content vertically — matching keeps its
          slightly-larger min-h-[60vh] for the larger pair grid, the
          rest land at min-h-[55vh]. */}
      <div className={`w-full max-w-4xl mx-auto ${gameMode === 'matching' ? 'min-h-[60vh]' : 'min-h-[55vh]'} flex items-center justify-center`}>
        <div className="w-full">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
              <MatchingModeGame
                matchingPairs={matchingPairs}
                matchedIds={matchedIds}
                selectedMatch={selectedMatch}
                isMatchingProcessing={isMatchingProcessing}
                onMatchClick={handleMatchClick}
                themeColor={modeTheme}
                modeLabel={modeLabel}
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

                {/* Fill-in-the-Blank renders its own gapped sentence as
                    the prompt — the standard WordPromptCard would show
                    `currentWord.english` (or its translation) and
                    instantly expose the answer.  Hide it for that mode. */}
                {/* Phase-3 redesign (2026-04-30): mode-label pill at
                    the very top of the answer card, theme-coloured
                    when the mode has a theme assigned in MODE_THEME.
                    Modes without a theme (yet) don't render the pill
                    so the legacy layout for them stays unchanged. */}
                {modeTheme && (
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <span
                      className={`inline-block ${getThemeColors(modeTheme).pillBg} ${getThemeColors(modeTheme).pillText} font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}
                    >
                      {modeLabel}
                    </span>
                  </div>
                )}

                {/* Skip WordPromptCard for fill-blank (renders its own
                    gapped sentence as the prompt) AND flashcards (the
                    new 3D flip card BECOMES the prompt — rendering
                    WordPromptCard above it would double-show the word). */}
                {gameMode !== "fill-blank" && gameMode !== "flashcards" && (
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
                    themeColor={modeTheme}
                  />
                )}

                {user?.role === "student" && gameMode !== "flashcards" && gameMode !== "sentence-builder" && gameMode !== "fill-blank" && !isFinished && (
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
              {t.wordOfTotal(currentIndex + 1, gameWords.length)}
            </p>
          </div>
        </div>
      )}
      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
