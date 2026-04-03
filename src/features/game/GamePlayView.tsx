import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  Languages,
  Trophy,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import type { Word } from "../../shared/types";
import type { AssignmentData, AppUser } from "../../core/supabase";
import { LeaderboardEntry } from "../../core/types";
import { LETTER_COLORS, type GameMode } from "../../shared/constants/game";
import { shuffle } from "../../shared/utils/helpers";
import { ShowAnswerFeedback } from "../../shared/components/ShowAnswerFeedback";
import FloatingButtons from "../../shared/components/FloatingButtons";
import * as userService from "../../services/userService";

// ---------------------------------------------------------------------------
// Memoised answer option button (moved from App.tsx)
// ---------------------------------------------------------------------------
const AnswerOptionButton = React.memo(({ option, currentWordId, feedback, gameMode, targetLanguage, onAnswer }: {
  option: Word; currentWordId: number; feedback: string | null; gameMode: string; targetLanguage: "hebrew" | "arabic"; onAnswer: (w: Word) => void;
}) => (
  <button
    onClick={() => onAnswer(option)}
    disabled={feedback === "show-answer" || feedback === "correct"}
    className={`py-2.5 px-2 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold transition-all duration-300 ${
      feedback === "correct" && option.id === currentWordId
        ? "bg-blue-600 text-white scale-105 shadow-xl"
        : feedback === "wrong" && option.id !== currentWordId
        ? "bg-rose-100 text-rose-500 opacity-50"
        : feedback === "show-answer" && option.id === currentWordId
        ? "bg-amber-500 text-white scale-105 shadow-xl ring-4 ring-amber-300"
        : feedback === "show-answer"
        ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
        : "bg-stone-100 text-stone-800 hover:bg-stone-200"
    }`}
  >
    {gameMode === "reverse" ? option.english : option[targetLanguage]}
  </button>
));

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface GamePlayViewProps {
  // Theme
  activeThemeBg: string;

  // Scores / streaks
  score: number;
  xp: number;
  streak: number;

  // Error banner
  saveError: string | null;
  onDismissSaveError: () => void;

  // Language
  targetLanguage: "hebrew" | "arabic";
  onToggleLanguage: () => void;

  // Game mode & progress
  gameMode: GameMode;
  currentIndex: number;
  gameWords: Word[];
  currentWord: Word;
  isFinished: boolean;
  feedback: "correct" | "wrong" | "show-answer" | null;
  options: Word[];
  scrambledWord: string;
  motivationalMessage: string | null;

  // Matching mode
  matchingPairs: { id: number; text: string; type: "english" | "arabic" }[];
  matchedIds: number[];
  selectedMatch: { id: number; type: "english" | "arabic" } | null;
  onMatchClick: (item: { id: number; type: "english" | "arabic" }) => void;

  // Flashcard mode
  isFlipped: boolean;
  onToggleFlip: () => void;
  onFlashcardAnswer: (knewIt: boolean) => void;

  // True-false mode
  tfOption: Word | null;
  onTFAnswer: (isTrue: boolean) => void;

  // Letter-sounds mode
  revealedLetters: number;

  // Spelling / scramble input
  spellingInput: string;
  onSpellingInputChange: (value: string) => void;
  onSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;

  // Sentence-builder mode
  activeAssignment: AssignmentData | null;
  sentenceIndex: number;
  builtSentence: string[];
  availableWords: string[];
  sentenceFeedback: "correct" | "wrong" | null;
  onSentenceWordTap: (word: string, fromAvailable: boolean) => void;
  onSentenceCheck: () => void;
  onClearSentence: (words: string[]) => void;
  speak: (text: string) => void;

  // Power-ups
  hiddenOptions: number[];
  onUseFiftyFifty: () => void;
  onUseSkip: () => void;
  onUseRevealLetter: () => void;

  // Answer handler (classic / listening / reverse)
  onAnswer: (word: Word) => void;

  // Navigation
  onExitGame: () => void;
  speakWord: (id: number | undefined) => void;

  // Leaderboard
  leaderboard: Record<string, LeaderboardEntry>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toProgressValue = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GamePlayView(props: GamePlayViewProps) {
  const { user } = useAuth();

  const {
    activeThemeBg,
    score,
    xp,
    streak,
    saveError,
    onDismissSaveError,
    targetLanguage,
    onToggleLanguage,
    gameMode,
    currentIndex,
    gameWords,
    currentWord,
    isFinished,
    feedback,
    options,
    scrambledWord,
    motivationalMessage,
    matchingPairs,
    matchedIds,
    selectedMatch,
    onMatchClick,
    isFlipped,
    onToggleFlip,
    onFlashcardAnswer,
    tfOption,
    onTFAnswer,
    revealedLetters,
    spellingInput,
    onSpellingInputChange,
    onSpellingSubmit,
    activeAssignment,
    sentenceIndex,
    builtSentence,
    availableWords,
    sentenceFeedback,
    onSentenceWordTap,
    onSentenceCheck,
    onClearSentence,
    speak,
    hiddenOptions,
    onUseFiftyFifty,
    onUseSkip,
    onUseRevealLetter,
    onAnswer,
    onExitGame,
    speakWord,
    leaderboard,
  } = props;

  return (
    <div className={`min-h-screen ${user?.role === 'student' ? activeThemeBg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-8 font-sans max-w-7xl mx-auto`}>
      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span className="text-sm">{saveError}</span>
          <button
            onClick={onDismissSaveError}
            className="ml-1 hover:opacity-75"
            aria-label="Dismiss error message"
            title="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="bg-white px-3 sm:px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <Trophy className="text-amber-500" size={18} />
            <span className="font-black text-stone-800">{score}</span>
          </div>
          <div className="bg-blue-50 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-blue-700 font-bold text-xs uppercase tracking-widest">XP: {xp}</span>
          </div>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-orange-100 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2"
            >
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest">{"\uD83D\uDD25"} {streak}</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleLanguage} className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition-colors">
            <Languages size={18} /><span className="text-sm font-bold uppercase hidden sm:inline">{targetLanguage}</span>
          </button>
          <button onClick={onExitGame} className="text-stone-400 hover:text-stone-900 font-bold text-sm">Exit</button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
            <motion.div 
              key="matching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4"
            >
              <AnimatePresence>
              {matchingPairs.filter(item => !matchedIds.includes(item.id)).map((item, idx) => {
                const key = `${item.id}-${item.type}-${idx}`;
                return (
                <motion.button
                  key={key}
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onMatchClick(item)}
                  className={`p-3 sm:p-6 rounded-2xl shadow-sm font-bold text-sm sm:text-lg h-20 sm:h-32 flex items-center justify-center transition-all duration-200 ${
                    selectedMatch?.id === item.id && selectedMatch?.type === item.type
                      ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                      : "bg-white text-stone-800 hover:shadow-md"
                  }`}
                >
                  {item.text}
                </motion.button>
                );
              })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={`bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl p-3 sm:p-12 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-blue-50 border-4 border-blue-600" : feedback === "wrong" ? "bg-red-50 border-4 border-red-500" : feedback === "show-answer" ? "bg-amber-50 border-4 border-amber-500" : "border-4 border-transparent"}`}
            >
              {/* Progress Bar */}
              <progress
                className="absolute top-0 left-0 h-2 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
                max={100}
                value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
              />

              {/* Motivational message - positioned at top to not block answers */}
              {motivationalMessage && (
                <div className="absolute top-2 sm:top-4 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <span className="text-lg sm:text-3xl font-black text-blue-700 drop-shadow animate-bounce bg-white/80 px-3 py-1 sm:px-4 sm:py-2 rounded-2xl">
                    {motivationalMessage}
                  </span>
                </div>
              )}

              {/* Show correct answer after 3 failed attempts */}
              {feedback === "show-answer" && (
                <div className="absolute top-12 sm:top-16 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <ShowAnswerFeedback
                    answer={gameMode === "reverse" ? currentWord?.english : currentWord?.[targetLanguage]}
                    dir="auto"
                  />
                </div>
              )}

              <div className="mb-3 sm:mb-12">
                <span className="inline-block bg-stone-100 text-stone-500 font-black text-xs sm:text-base px-3 py-1 rounded-full mb-1 sm:mb-2">{currentIndex + 1} / {gameWords.length}</span>
                <div className="flex flex-col items-center justify-center gap-2 sm:gap-6 mb-3 sm:mb-12">
                  {currentWord?.imageUrl && (
                    <motion.img
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={currentWord.imageUrl}
                      alt={currentWord.english}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-48 sm:h-48 object-cover rounded-[16px] sm:rounded-[32px] shadow-lg border-4 border-white"
                    />
                  )}
                  <h2 className={`text-2xl sm:text-5xl md:text-6xl font-black text-stone-900 relative z-10 break-words w-full text-center ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}
                    dir={(gameMode === "spelling" || gameMode === "reverse" || (gameMode === "flashcards" && isFlipped)) ? "auto" : "ltr"}>
                    {gameMode === "spelling" || gameMode === "reverse" ? currentWord?.[targetLanguage] :
                     gameMode === "scramble" ? scrambledWord :
                     gameMode === "flashcards" ? (isFlipped ? currentWord?.[targetLanguage] : currentWord?.english) :
                     currentWord?.english}
                  </h2>
                </div>
                <div className="flex justify-center gap-2 mt-1 sm:mt-0">
                  <button
                    onClick={() => speakWord(currentWord?.id)}
                    className="p-2 sm:p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                    aria-label="Play pronunciation"
                    title="Play pronunciation"
                  >
                    <Volume2 size={20} className="text-stone-600 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              {/* Power-up toolbar */}
              {user?.role === "student" && gameMode !== "flashcards" && gameMode !== "sentence-builder" && !isFinished && (
                <div className="flex justify-center gap-2 mb-3">
                  {(gameMode === "classic" || gameMode === "listening" || gameMode === "reverse") && ((user.powerUps ?? {})['fifty_fifty'] ?? 0) > 0 && hiddenOptions.length === 0 && !feedback && (
                    <button onClick={onUseFiftyFifty} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 border border-amber-200">
                      {"\u2702\uFE0F"} 50/50 <span className="bg-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">{"\u00D7"}{(user.powerUps ?? {})['fifty_fifty']}</span>
                    </button>
                  )}
                  {((user.powerUps ?? {})['skip'] ?? 0) > 0 && !feedback && (
                    <button onClick={onUseSkip} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 border border-blue-200">
                      {"\u23ED\uFE0F"} Skip <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">{"\u00D7"}{(user.powerUps ?? {})['skip']}</span>
                    </button>
                  )}
                  {(gameMode === "spelling" || gameMode === "letter-sounds") && ((user.powerUps ?? {})['reveal_letter'] ?? 0) > 0 && !feedback && spellingInput.length === 0 && (
                    <button onClick={onUseRevealLetter} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200 transition-all flex items-center gap-1 border border-green-200">
                      {"\uD83D\uDCA1"} Hint <span className="bg-green-200 px-1.5 py-0.5 rounded-md text-[10px]">{"\u00D7"}{(user.powerUps ?? {})['reveal_letter']}</span>
                    </button>
                  )}
                </div>
              )}

              {gameMode === "classic" || gameMode === "listening" || gameMode === "reverse" ? (
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                  {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
                    <AnswerOptionButton key={option.id} option={option} currentWordId={currentWord.id} feedback={feedback} gameMode={gameMode} targetLanguage={targetLanguage} onAnswer={onAnswer} />
                  ))}
                </div>
              ) : gameMode === "true-false" ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-stone-100 p-3 sm:p-8 rounded-2xl sm:rounded-3xl mb-3 sm:mb-8">
                    <p className="text-xl sm:text-3xl font-bold text-stone-800" dir="auto">{tfOption?.[targetLanguage]}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => onTFAnswer(true)} className="py-3 sm:py-6 rounded-2xl sm:rounded-3xl text-base sm:text-2xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">True</button>
                    <button onClick={() => onTFAnswer(false)} className="py-3 sm:py-6 rounded-2xl sm:rounded-3xl text-base sm:text-2xl font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">False</button>
                  </div>
                </div>
              ) : gameMode === "flashcards" ? (
                <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
                  <button onClick={onToggleFlip} className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
                    {isFlipped ? "Show English" : "Show Translation"}
                  </button>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => onFlashcardAnswer(false)} className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">Still Learning</button>
                    <button onClick={() => onFlashcardAnswer(true)} className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-50 transition-colors">Got It!</button>
                  </div>
                </div>
              ) : (
              gameMode === "letter-sounds" ? (
                <div className="max-w-lg mx-auto">
                  <p className="text-stone-600 text-lg sm:text-xl font-bold mb-4 text-center" dir="auto">{currentWord?.[targetLanguage]}</p>
                  <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6">
                    {currentWord?.english.split(" ").map((word, wordIdx, allWords) => {
                      let charOffset = 0;
                      for (let j = 0; j < wordIdx; j++) charOffset += allWords[j].length + 1;
                      return (
                        <div key={wordIdx} className="flex justify-center gap-1 sm:gap-2">
                          {word.split("").map((letter, i) => {
                            const globalIdx = charOffset + i;
                            const revealed = globalIdx < revealedLetters;
                            const color = LETTER_COLORS[globalIdx % LETTER_COLORS.length];
                            return (
                              <div
                                key={globalIdx}
                                className="w-8 h-10 sm:w-12 sm:h-14 rounded-xl font-black text-lg sm:text-2xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0 transition-all duration-300"
                                style={{ color: revealed ? color : color + "40", borderColor: revealed ? color : color + "40", background: color + "18", opacity: revealed ? 1 : 0.15, transform: revealed ? "scale(1)" : "scale(0.5)" }}
                              >
                                {revealed ? (letter ?? "").toUpperCase() : "?"}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {revealedLetters >= (currentWord?.english.length || 99) && (
                    <form onSubmit={onSpellingSubmit} className="max-w-sm mx-auto">
                      <input
                        autoFocus
                        type="text"
                        value={spellingInput}
                        onChange={(e) => onSpellingInputChange(e.target.value)}
                        disabled={feedback === "show-answer" || feedback === "correct"}
                        placeholder="Type the word..."
                        className={`w-full p-3 text-xl font-black text-center border-4 rounded-2xl mb-3 transition-all ${
                          feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                          feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                          feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
                          "border-stone-100 focus:border-stone-900 outline-none"
                        }`}
                      />
                      {feedback === "show-answer" && (
                        <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-3" />
                      )}
                      <button type="submit" className="w-full py-3 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors">Check Answer</button>
                    </form>
                  )}
                </div>
              ) : gameMode === "sentence-builder" ? (
                (() => {
                  const sentences = (activeAssignment as AssignmentData & { sentences?: string[] })?.sentences?.filter(s => s.trim()) || [];
                  if (sentences.length === 0) return (
                    <div className="text-center p-8">
                      <p className="text-stone-400 text-lg">No sentences were added to this assignment.</p>
                      <p className="text-stone-400 text-sm mt-2">Ask your teacher to add sentences.</p>
                    </div>
                  );
                  return (
                    <div className="max-w-xl mx-auto">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <p className="text-stone-400 text-xs font-bold uppercase">Sentence {sentenceIndex + 1} / {sentences.length}</p>
                        <button onClick={() => speak(sentences[sentenceIndex])} className="text-blue-500 hover:text-blue-700 active:scale-90 transition-all" title="Listen to sentence">{"\uD83D\uDD0A"}</button>
                      </div>
                      {/* Built sentence area */}
                      <div className={`min-h-[60px] border-4 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center transition-colors ${
                        sentenceFeedback === "correct" ? "border-blue-500 bg-blue-50" :
                        sentenceFeedback === "wrong" ? "border-rose-500 bg-rose-50" :
                        "border-stone-200 bg-stone-50"
                      }`}>
                        {builtSentence.length === 0 && <span className="text-stone-300 text-sm italic w-full text-center">Tap words below to build the sentence</span>}
                        {builtSentence.map((word, i) => (
                          <button
                            key={i}
                            onClick={() => sentenceFeedback === null && onSentenceWordTap(word, false)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
                          >{word}</button>
                        ))}
                      </div>
                      {/* Available words */}
                      <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        {availableWords.map((word, i) => (
                          <button
                            key={i}
                            onClick={() => sentenceFeedback === null && onSentenceWordTap(word, true)}
                            className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-blue-400 hover:text-blue-700 active:scale-95 transition-all"
                          >{word}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onClearSentence(shuffle(sentences[sentenceIndex].split(" ").filter(Boolean)))} className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors">Clear</button>
                        <button onClick={onSentenceCheck} disabled={builtSentence.length === 0 || sentenceFeedback !== null} className="flex-2 py-2 px-6 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50">Check {"\u2713"}</button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <form onSubmit={onSpellingSubmit} className="max-w-md mx-auto">
                  <input
                    autoFocus
                    type="text"
                    value={spellingInput}
                    onChange={(e) => onSpellingInputChange(e.target.value)}
                    disabled={feedback === "show-answer" || feedback === "correct"}
                    placeholder="Type in English..."
                    className={`w-full p-3 sm:p-6 text-lg sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
                      feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                      feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                      feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
                      "border-stone-100 focus:border-stone-900 outline-none"
                    }`}
                  />
                  {gameMode === "spelling" && (
                    <p className="text-stone-400 font-bold mb-4 sm:mb-8 text-sm sm:text-base">Translation: <span className="text-stone-900">{currentWord?.[targetLanguage]}</span></p>
                  )}
                  {feedback === "show-answer" && (
                    <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-4" />
                  )}
                  <button type="submit" className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors">Check Answer</button>
                </form>
              )
              )}
            </motion.div>
          )
        }
        </AnimatePresence>
      </div>

      {/* Live Leaderboard Widget */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl p-6 sticky top-6 border border-white/20">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-white">{"\uD83C\uDFC6"} Live Rank</h3>
          <div className="space-y-2">
            {(Object.entries(leaderboard) as [string, LeaderboardEntry][])
              .map(([uid, entry]) => ({ uid, name: entry.name, totalScore: entry.baseScore + entry.currentGameScore, isGuest: entry.isGuest || false }))
              .sort((a, b) => b.totalScore - a.totalScore)
              .slice(0, 5)
              .map((entry, idx) => {
                const isUser = entry.name === user?.displayName;
                const rankIcon = idx === 0 ? "\uD83E\uDD47" : idx === 1 ? "\uD83E\uDD48" : idx === 2 ? "\uD83E\uDD49" : `${idx + 1}`;
                const rankClass = idx === 0 ? "bg-gradient-to-r from-yellow-300 to-yellow-500 text-stone-900 shadow-lg shadow-yellow-400/30" :
                                   idx === 1 ? "bg-gradient-to-r from-slate-200 to-slate-400 text-stone-900" :
                                   idx === 2 ? "bg-gradient-to-r from-orange-300 to-orange-500 text-white" :
                                   "bg-white/20 text-white";

                return (
                  <div
                    key={`${entry.uid}-${idx}`}
                    className={`flex justify-between items-center p-2 sm:p-3 rounded-xl transition-all ${isUser ? "bg-white/30 border-2 border-white/50 scale-105 shadow-lg" : "bg-white/10"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankClass}`}>
                        {rankIcon}
                      </span>
                      <span className={`text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-[100px] ${isUser ? "text-white" : "text-white/90"}`}>
                        {entry.name}{entry.isGuest && <span className="ml-0.5">{"\uD83C\uDFAD"}</span>}
                      </span>
                      {idx === 0 && (
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-xs"
                        >
                          {"\uD83D\uDC51"}
                        </motion.span>
                      )}
                    </div>
                    <span className={`text-sm sm:text-base font-black ${isUser ? "text-white" : "text-white/80"}`}>{entry.totalScore}</span>
                  </div>
                );
              })}
            {Object.values(leaderboard).length === 0 && (
              <div className="text-center py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl mb-2"
                >
                  {"\u23F3"}
                </motion.div>
                <p className="text-xs text-white/70 italic">Waiting for players...</p>
              </div>
            )}
          </div>
        </div>
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
          <p className="text-center text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Word {currentIndex + 1} of {gameWords.length}</p>
        </div>
      </div>
    )}
    <FloatingButtons showBackToTop={true} />
    </div>
  );
}
