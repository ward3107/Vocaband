import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, AlertTriangle, Languages, Trophy, X } from "lucide-react";
import { supabase, type AppUser, type AssignmentData } from "../core/supabase";
import { shuffle } from "../utils";
import { ShowAnswerFeedback } from "../components/ShowAnswerFeedback";
import FloatingButtons from "../components/FloatingButtons";
import AnswerOptionButton from "../components/AnswerOptionButton";
import { LETTER_COLORS } from "../constants/game";
import type { GameMode } from "../constants/game";
import type { Word } from "../data/vocabulary";
import type { LeaderboardEntry } from "../core/types";

interface GameViewProps {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  saveError: string | null;
  setSaveError: (e: string | null) => void;
  score: number;
  xp: number;
  streak: number;
  targetLanguage: "hebrew" | "arabic";
  setTargetLanguage: (lang: "hebrew" | "arabic") => void;
  handleExitGame: () => void;
  gameMode: GameMode;
  activeThemeBg: string;
  matchingPairs: { id: number; type: "english" | "arabic"; text: string }[];
  matchedIds: number[];
  selectedMatch: { id: number; type: "english" | "arabic" } | null;
  handleMatchClick: (item: { id: number; type: "english" | "arabic" }) => void;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  gameWords: Word[];
  currentWord: Word;
  options: Word[];
  feedback: "correct" | "wrong" | "show-answer" | null;
  toProgressValue: (v: number) => number;
  speakWord: (id?: number, english?: string) => void;
  hiddenOptions: number[];
  setHiddenOptions: (opts: number[]) => void;
  handleAnswer: (w: Word) => void;
  tfOption: Word | null;
  handleTFAnswer: (isTrue: boolean) => void;
  isFlipped: boolean;
  setIsFlipped: (v: boolean) => void;
  handleFlashcardAnswer: (knewIt: boolean) => void;
  revealedLetters: number;
  spellingInput: string;
  setSpellingInput: (v: string) => void;
  handleSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  scrambledWord: string;
  activeAssignment: AssignmentData | null;
  sentenceIndex: number;
  builtSentence: string[];
  setBuiltSentence: (s: string[]) => void;
  availableWords: string[];
  setAvailableWords: (w: string[]) => void;
  sentenceFeedback: "correct" | "wrong" | null;
  handleSentenceWordTap: (word: string, fromAvailable: boolean) => void;
  handleSentenceCheck: () => void;
  speak: (text: string) => void;
  leaderboard: Record<string, LeaderboardEntry>;
  isFinished: boolean;
}

export default function GameView(props: GameViewProps) {
  const {
    user, setUser, saveError, setSaveError, score, xp, streak,
    targetLanguage, setTargetLanguage, handleExitGame, gameMode, activeThemeBg,
    matchingPairs, matchedIds, selectedMatch, handleMatchClick,
    currentIndex, setCurrentIndex, gameWords, currentWord, options, feedback,
    toProgressValue, speakWord,
    hiddenOptions, setHiddenOptions, handleAnswer,
    tfOption, handleTFAnswer, isFlipped, setIsFlipped, handleFlashcardAnswer,
    revealedLetters, spellingInput, setSpellingInput, handleSpellingSubmit, scrambledWord,
    activeAssignment, sentenceIndex, builtSentence, setBuiltSentence,
    availableWords, setAvailableWords, sentenceFeedback, handleSentenceWordTap,
    handleSentenceCheck, speak, leaderboard, isFinished,
  } = props;

  return (
    <div className={`min-h-screen ${user?.role === 'student' ? activeThemeBg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-4 font-sans max-w-7xl mx-auto`}>
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
      <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-1 mb-1.5 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap">
          <div className="bg-white px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm flex items-center gap-1.5">
            <Trophy className="text-amber-500" size={16} />
            <span className="font-black text-stone-800 text-sm sm:text-base">{score}</span>
          </div>
          <div className="bg-blue-50 px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5">
            <span className="text-blue-700 font-bold text-[10px] sm:text-xs uppercase tracking-widest">XP: {xp}</span>
          </div>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-orange-100 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2"
            >
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest">🔥 {streak}</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTargetLanguage(targetLanguage === "hebrew" ? "arabic" : "hebrew")} className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition-colors">
            <Languages size={18} /><span className="text-sm font-bold">{targetLanguage === "hebrew" ? "עברית" : "عربي"}</span>
          </button>
          <button onClick={handleExitGame} className="text-stone-400 hover:text-stone-900 font-bold text-sm">Exit</button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-6">
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
            <motion.div 
              key="matching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-3"
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
                  onClick={() => handleMatchClick(item)}
                  dir="auto"
                  className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm font-black text-lg sm:text-2xl h-20 sm:h-32 flex items-center justify-center transition-all duration-200 ${
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

              <div className="mb-1 sm:mb-4">
                <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1">{currentIndex + 1} / {gameWords.length}</span>
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-1 sm:mb-4">
                  {currentWord?.imageUrl && (
                    <motion.img
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={currentWord.imageUrl}
                      alt={currentWord.english}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 sm:w-48 sm:h-48 object-cover rounded-2xl sm:rounded-[32px] shadow-lg border-4 border-white"
                    />
                  )}
                  <h2 className={`text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 relative z-10 break-words w-full text-center ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}
                    dir={(gameMode === "spelling" || gameMode === "reverse" || (gameMode === "flashcards" && isFlipped)) ? "auto" : "ltr"}>
                    {gameMode === "spelling" || gameMode === "reverse" ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew) :
                     gameMode === "scramble" ? scrambledWord :
                     gameMode === "flashcards" ? (isFlipped ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew) : currentWord?.english) :
                     currentWord?.english}
                  </h2>
                </div>
                <div className="flex justify-center gap-2 mt-0.5 sm:mt-0">
                  <button
                    onClick={() => speakWord(currentWord?.id, currentWord?.english)}
                    className="p-1.5 sm:p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
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
                    <button onClick={() => {
                      // Optimistic UI: hide options + decrement count immediately,
                      // then fire-and-forget the consume_power_up RPC.  RPC is
                      // atomic + row-locked server-side, refuses if count is 0
                      // (defence against the same kid double-tapping faster
                      // than React state updates).  Routes via RPC so the F2
                      // trigger (20260604) can lock direct power_ups writes.
                      const wrong = options.filter(o => o.id !== currentWord.id);
                      const toHide = shuffle(wrong).slice(0, 2).map(o => o.id);
                      const newPowerUps = { ...(user.powerUps ?? {}), fifty_fifty: ((user.powerUps ?? {})['fifty_fifty'] ?? 1) - 1 };
                      setHiddenOptions(toHide);
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      setTimeout(() => { supabase.rpc('consume_power_up', { p_kind: 'fifty_fifty' }); }, 0);
                    }} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 border border-amber-200">
                      ✂️ 50/50 <span className="bg-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['fifty_fifty']}</span>
                    </button>
                  )}
                  {((user.powerUps ?? {})['skip'] ?? 0) > 0 && !feedback && (
                    <button onClick={() => {
                      const newPowerUps = { ...(user.powerUps ?? {}), skip: ((user.powerUps ?? {})['skip'] ?? 1) - 1 };
                      setCurrentIndex(prev => Math.min(prev + 1, gameWords.length - 1));
                      setHiddenOptions([]);
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      setTimeout(() => { supabase.rpc('consume_power_up', { p_kind: 'skip' }); }, 0);
                    }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 border border-blue-200">
                      ⏭️ Skip <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['skip']}</span>
                    </button>
                  )}
                  {(gameMode === "spelling" || gameMode === "letter-sounds") && ((user.powerUps ?? {})['reveal_letter'] ?? 0) > 0 && !feedback && spellingInput.length === 0 && (
                    <button onClick={() => {
                      const newPowerUps = { ...(user.powerUps ?? {}), reveal_letter: ((user.powerUps ?? {})['reveal_letter'] ?? 1) - 1 };
                      if (currentWord) setSpellingInput(currentWord.english[0]);
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      setTimeout(() => { supabase.rpc('consume_power_up', { p_kind: 'reveal_letter' }); }, 0);
                    }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200 transition-all flex items-center gap-1 border border-green-200">
                      💡 Hint <span className="bg-green-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['reveal_letter']}</span>
                    </button>
                  )}
                </div>
              )}

              {gameMode === "classic" || gameMode === "listening" || gameMode === "reverse" ? (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                  {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
                    <AnswerOptionButton key={option.id} option={option} currentWordId={currentWord.id} feedback={feedback} gameMode={gameMode} targetLanguage={targetLanguage} onAnswer={handleAnswer} />
                  ))}
                </div>
              ) : gameMode === "true-false" ? (
                <div className="max-w-lg mx-auto">
                  <div className="bg-stone-100 p-3 sm:p-8 rounded-2xl sm:rounded-3xl mb-2 sm:mb-6">
                    <p className="text-2xl sm:text-4xl font-black text-stone-800" dir="auto">{tfOption?.[targetLanguage] || tfOption?.arabic || tfOption?.hebrew}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <button onClick={() => handleTFAnswer(true)} className="py-5 sm:py-8 rounded-2xl sm:rounded-3xl text-xl sm:text-3xl font-black bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors">True ✓</button>
                    <button onClick={() => handleTFAnswer(false)} className="py-5 sm:py-8 rounded-2xl sm:rounded-3xl text-xl sm:text-3xl font-black bg-rose-100 text-rose-700 hover:bg-rose-200 active:bg-rose-300 transition-colors">False ✗</button>
                  </div>
                </div>
              ) : gameMode === "flashcards" ? (
                <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
                  <button onClick={() => setIsFlipped(!isFlipped)} className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
                    {isFlipped ? "Show English" : "Show Translation"}
                  </button>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => handleFlashcardAnswer(false)} className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">Still Learning</button>
                    <button onClick={() => handleFlashcardAnswer(true)} className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-50 transition-colors">Got It!</button>
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
                                className="w-9 h-11 sm:w-12 sm:h-14 rounded-xl font-black text-base sm:text-2xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0 transition-all duration-300"
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
                    <form onSubmit={handleSpellingSubmit} className="max-w-sm mx-auto">
                      <input
                        autoFocus
                        type="text"
                        value={spellingInput}
                        onChange={(e) => setSpellingInput(e.target.value)}
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
                        <button onClick={() => speak(sentences[sentenceIndex])} className="text-blue-500 hover:text-blue-700 active:scale-90 transition-all" title="Listen to sentence">🔊</button>
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
                            onClick={() => sentenceFeedback === null && handleSentenceWordTap(word, false)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
                          >{word}</button>
                        ))}
                      </div>
                      {/* Available words */}
                      <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        {availableWords.map((word, i) => (
                          <button
                            key={i}
                            onClick={() => sentenceFeedback === null && handleSentenceWordTap(word, true)}
                            className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-blue-400 hover:text-blue-700 active:scale-95 transition-all"
                          >{word}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setBuiltSentence([]); setAvailableWords(shuffle(sentences[sentenceIndex].split(" ").filter(Boolean))); }} className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors">Clear</button>
                        <button onClick={handleSentenceCheck} disabled={builtSentence.length === 0 || sentenceFeedback !== null} className="flex-2 py-2 px-6 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50">Check ✓</button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <form onSubmit={handleSpellingSubmit} className="max-w-md mx-auto">
                  <input
                    autoFocus
                    type="text"
                    value={spellingInput}
                    onChange={(e) => setSpellingInput(e.target.value)}
                    disabled={feedback === "show-answer" || feedback === "correct"}
                    placeholder="Type in English..."
                    className={`w-full p-3 sm:p-6 text-base sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
                      feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                      feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                      feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
                      "border-stone-100 focus:border-stone-900 outline-none"
                    }`}
                  />
                  {gameMode === "spelling" && (
                    <p className="text-stone-400 font-bold mb-3 sm:mb-6 text-base sm:text-lg">Translation: <span className="text-stone-900 text-xl sm:text-2xl" dir="auto">{currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew}</span></p>
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

      {/* Live Leaderboard Widget — only shown during live challenges (has leaderboard data).
          Hidden for solo assignments and Quick Play guests. */}
      {!user?.isGuest && Object.keys(leaderboard).length > 0 && (
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl p-6 sticky top-6 border border-white/20">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-white">🏆 Live Rank</h3>
          <div className="space-y-2">
            {(Object.entries(leaderboard) as [string, LeaderboardEntry][])
              .map(([uid, entry]) => ({ uid, name: entry.name, totalScore: entry.baseScore + entry.currentGameScore, isGuest: entry.isGuest || false }))
              .sort((a, b) => b.totalScore - a.totalScore)
              .slice(0, 5)
              .map((entry, idx) => {
                const isUser = entry.name === user?.displayName;
                const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
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
                        {entry.name}{entry.isGuest && <span className="ml-0.5">🎭</span>}
                      </span>
                      {idx === 0 && (
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-xs"
                        >
                          👑
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
                  ⏳
                </motion.div>
                <p className="text-xs text-white/70 italic">Waiting for players...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
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
