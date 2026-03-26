import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  X,
  Volume2,
  Trophy,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  LogIn,
  Gift,
  Target,
  Sparkles
} from "lucide-react";
import { BAND_1_WORDS, Word } from "../vocabulary";
import { useAudio } from "../hooks/useAudio";

interface DemoModeProps {
  onClose: () => void;
  onSignUp: () => void;
}

type DemoView = "welcome" | "avatar" | "game-select" | "game" | "results";

const DEMO_AVATARS = ["🦊", "🦁", "🐯", "🐻", "🐰", "🦄", "🐲", "🦋"];

const GAME_MODES = [
  { id: "classic", name: "Classic", emoji: "📝", desc: "Pick the right meaning" },
  { id: "listening", name: "Listening", emoji: "🎧", desc: "Hear and identify" },
  { id: "matching", name: "Matching", emoji: "🔗", desc: "Match words to meanings" },
];

const DEMO_WORDS = BAND_1_WORDS.slice(0, 10); // Only 10 words for demo

const DemoMode: React.FC<DemoModeProps> = ({ onClose, onSignUp }) => {
  const [view, setView] = useState<DemoView>("welcome");
  const [avatar, setAvatar] = useState("🦊");
  const [displayName, setDisplayName] = useState("");
  const [xp, setXp] = useState(0);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [matchingPairs, setMatchingPairs] = useState<{ word: Word; matched: boolean }[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const { speak, playMotivational } = useAudio();

  // Initialize matching game
  useEffect(() => {
    if (view === "game" && selectedMode === "matching") {
      const shuffled = [...DEMO_WORDS.slice(0, 6)].sort(() => Math.random() - 0.5);
      setMatchingPairs(shuffled.map(w => ({ word: w, matched: false })));
      setMatchedCount(0);
    }
  }, [view, selectedMode]);

  // Generate options for classic/listening mode
  useEffect(() => {
    if (view === "game" && (selectedMode === "classic" || selectedMode === "listening")) {
      generateOptions();
    }
  }, [currentWordIndex, view, selectedMode]);

  const generateOptions = () => {
    const currentWord = DEMO_WORDS[currentWordIndex];
    if (!currentWord) return;

    const wrongOptions = DEMO_WORDS
      .filter(w => w.id !== currentWord.id)
      .map(w => w.hebrew) // Use Hebrew as the meaning to match
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [...wrongOptions, currentWord.hebrew].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;

    const currentWord = DEMO_WORDS[currentWordIndex];
    const correct = answer === currentWord.hebrew;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      const xpEarned = 10 + streak * 2;
      setXp(prev => prev + xpEarned);
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      playMotivational();

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } else {
      setStreak(0);
    }

    // Move to next word after delay
    setTimeout(() => {
      if (currentWordIndex < DEMO_WORDS.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setView("results");
      }
    }, 1500);
  };

  const handleMatchingSelect = (word: Word) => {
    if (matchingPairs.find(p => p.word.id === word.id)?.matched) return;

    if (!selectedWord) {
      setSelectedWord(word);
      speak(word.id);
    } else {
      // Check if same word selected (matching word to itself for demo simplicity)
      if (selectedWord.id === word.id) {
        // For demo: show they need to match word to meaning
        setSelectedWord(null);
        return;
      }

      // Simple matching: just pair consecutive selections
      const xpEarned = 15;
      setXp(prev => prev + xpEarned);
      setScore(prev => prev + 1);
      setMatchedCount(prev => prev + 1);

      setMatchingPairs(prev =>
        prev.map(p =>
          p.word.id === selectedWord!.id || p.word.id === word.id
            ? { ...p, matched: true }
            : p
        )
      );

      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.6 }
      });

      setSelectedWord(null);

      // Check if game complete
      if (matchedCount + 1 >= matchingPairs.length / 2) {
        setTimeout(() => setView("results"), 1000);
      }
    }
  };

  const startGame = (mode: string) => {
    setSelectedMode(mode);
    setCurrentWordIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setView("game");
  };

  const resetDemo = () => {
    setView("welcome");
    setXp(0);
    setSelectedMode(null);
    setCurrentWordIndex(0);
    setScore(0);
    setStreak(0);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-surface overflow-auto">
      {/* Demo Banner */}
      <div className="bg-primary text-on-primary py-2 px-4 text-center font-bold text-sm flex items-center justify-center gap-2">
        <Sparkles size={16} />
        <span>Demo Mode — Sign up for full access!</span>
        <button
          onClick={onSignUp}
          className="bg-on-primary text-primary px-3 py-1 rounded-full text-xs font-black hover:scale-105 transition-transform"
        >
          Sign Up Free
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-14 right-4 z-10 w-10 h-10 bg-surface-container-low rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        <X size={20} />
      </button>

      <div className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {view === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎮</div>
              <h1 className="text-3xl font-black font-headline text-on-surface mb-2">
                Welcome to Vocaband!
              </h1>
              <p className="text-on-surface-variant mb-8">
                Try our vocabulary games with sample words from Band 1
              </p>

              <div className="bg-surface-container-low rounded-3xl p-6 mb-6">
                <h3 className="font-bold text-on-surface mb-4">What you'll experience:</h3>
                <div className="space-y-3">
                  {[
                    { icon: "🎯", text: "10 sample vocabulary words" },
                    { icon: "🎮", text: "3 game modes" },
                    { icon: "⭐", text: "XP & streak system" },
                    { icon: "🏆", text: "Achievements & rewards" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-left">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-on-surface-variant">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setView("avatar")}
                className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                Let's Go!
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {/* Avatar Selection */}
          {view === "avatar" && (
            <motion.div
              key="avatar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setView("welcome")}
                className="flex items-center gap-2 text-on-surface-variant mb-6 hover:text-primary transition-colors"
              >
                <ArrowLeft size={18} />
                Back
              </button>

              <h1 className="text-2xl font-black font-headline text-on-surface mb-2 text-center">
                Choose Your Avatar
              </h1>
              <p className="text-on-surface-variant text-center mb-6">
                Pick an emoji to represent you
              </p>

              <div className="grid grid-cols-4 gap-3 mb-6">
                {DEMO_AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-4xl p-4 rounded-2xl transition-all ${
                      avatar === a
                        ? "bg-primary-container ring-2 ring-primary scale-110"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-on-surface-variant mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter a nickname..."
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 border-surface-container text-on-surface focus:border-primary focus:outline-none"
                  maxLength={15}
                />
              </div>

              <button
                onClick={() => setView("game-select")}
                disabled={!displayName.trim()}
                className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {/* Game Mode Selection */}
          {view === "game-select" && (
            <motion.div
              key="game-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setView("avatar")}
                  className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full">
                  <span className="text-xl">{avatar}</span>
                  <span className="font-bold text-on-surface">{displayName}</span>
                  <span className="text-xs bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full font-bold">
                    {xp} XP
                  </span>
                </div>
              </div>

              <h1 className="text-2xl font-black font-headline text-on-surface mb-2 text-center">
                Choose a Game Mode
              </h1>
              <p className="text-on-surface-variant text-center mb-6">
                Try one of our popular modes!
              </p>

              <div className="space-y-3">
                {GAME_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => startGame(mode.id)}
                    className="w-full bg-surface-container-low p-4 rounded-2xl flex items-center gap-4 hover:bg-surface-container transition-colors text-left group"
                  >
                    <span className="text-3xl">{mode.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-on-surface">{mode.name}</h3>
                      <p className="text-sm text-on-surface-variant">{mode.desc}</p>
                    </div>
                    <ArrowRight className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
                  </button>
                ))}
              </div>

              <div className="mt-6 bg-tertiary-container/30 rounded-2xl p-4 text-center">
                <p className="text-sm text-on-tertiary-container">
                  🎉 <strong>7 more game modes</strong> available when you sign up!
                </p>
              </div>
            </motion.div>
          )}

          {/* Game Screen */}
          {view === "game" && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setView("game-select")}
                  className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <ArrowLeft size={18} />
                  Exit
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-full">
                    <Zap size={14} className="text-tertiary" />
                    <span className="font-bold text-on-surface">{xp}</span>
                  </div>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 bg-primary-container px-3 py-1.5 rounded-full">
                      <span className="text-sm">🔥</span>
                      <span className="font-bold text-on-primary-container">{streak}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              {(selectedMode === "classic" || selectedMode === "listening") && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-on-surface-variant mb-2">
                    <span>Word {currentWordIndex + 1} of {DEMO_WORDS.length}</span>
                    <span>{Math.round((currentWordIndex / DEMO_WORDS.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Classic / Listening Mode */}
              {(selectedMode === "classic" || selectedMode === "listening") && DEMO_WORDS[currentWordIndex] && (
                <div className="text-center">
                  {/* Word Display */}
                  <div className="bg-surface-container-low rounded-3xl p-8 mb-6">
                    <div className="text-4xl font-black text-on-surface mb-4 font-headline">
                      {DEMO_WORDS[currentWordIndex].english}
                    </div>
                    <button
                      onClick={() => speak(DEMO_WORDS[currentWordIndex].id)}
                      className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center mx-auto hover:scale-110 transition-transform"
                    >
                      <Volume2 size={24} />
                    </button>
                    <p className="text-sm text-on-surface-variant mt-2">Tap to hear</p>
                  </div>

                  <p className="text-on-surface-variant mb-4">What does this word mean?</p>

                  {/* Options */}
                  <div className="space-y-3">
                    {options.map((option, i) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrectAnswer = option === DEMO_WORDS[currentWordIndex].hebrew;
                      const showResult = selectedAnswer !== null;

                      let bgClass = "bg-surface-container-low";
                      if (showResult && isCorrectAnswer) bgClass = "bg-green-100 border-2 border-green-500";
                      if (showResult && isSelected && !isCorrect) bgClass = "bg-red-100 border-2 border-red-500";

                      return (
                        <button
                          key={i}
                          onClick={() => handleAnswer(option)}
                          disabled={selectedAnswer !== null}
                          className={`w-full p-4 rounded-2xl ${bgClass} transition-all text-left ${
                            !showResult ? "hover:bg-surface-container" : ""
                          }`}
                        >
                          <span className="font-bold text-on-surface">{option}</span>
                          {showResult && isCorrectAnswer && (
                            <span className="float-right text-green-600">✓</span>
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <span className="float-right text-red-600">✗</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  {selectedAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-4 rounded-2xl ${
                        isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isCorrect ? (
                        <div className="flex items-center justify-center gap-2">
                          <Star size={20} />
                          <span className="font-bold">Correct! +{10 + streak * 2} XP</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold">Not quite!</span>
                          <p className="text-sm mt-1">
                            The answer is: {DEMO_WORDS[currentWordIndex].hebrew}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Matching Mode */}
              {selectedMode === "matching" && (
                <div>
                  <p className="text-center text-on-surface-variant mb-4">
                    Tap two cards to match words
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {matchingPairs.map((pair, i) => (
                      <button
                        key={i}
                        onClick={() => handleMatchingSelect(pair.word)}
                        disabled={pair.matched}
                        className={`p-4 rounded-2xl text-center transition-all ${
                          pair.matched
                            ? "bg-green-100 opacity-50"
                            : selectedWord?.id === pair.word.id
                            ? "bg-primary-container ring-2 ring-primary"
                            : "bg-surface-container-low hover:bg-surface-container"
                        }`}
                      >
                        <div className="text-lg font-bold text-on-surface">
                          {pair.word.english}
                        </div>
                        {pair.matched && <span className="text-green-600">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-center text-on-surface-variant">
                    Matched: {matchedCount} / {matchingPairs.length / 2}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Results Screen */}
          {view === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-black font-headline text-on-surface mb-2">
                Great Job!
              </h1>
              <p className="text-on-surface-variant mb-6">
                You've completed the demo!
              </p>

              {/* Stats */}
              <div className="bg-surface-container-low rounded-3xl p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-black text-primary">{score}</div>
                    <div className="text-sm text-on-surface-variant">Correct</div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-tertiary">{xp}</div>
                    <div className="text-sm text-on-surface-variant">XP Earned</div>
                  </div>
                  <div>
                    <div className="text-3xl">{avatar}</div>
                    <div className="text-sm text-on-surface-variant">Your Avatar</div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-primary to-secondary text-on-primary rounded-3xl p-6 mb-6">
                <h3 className="text-xl font-black mb-2">Want more?</h3>
                <p className="text-sm opacity-90 mb-4">
                  Sign up to unlock 1000+ words, 10 game modes, avatars, and more!
                </p>
                <button
                  onClick={onSignUp}
                  className="w-full bg-on-primary text-primary py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <Gift size={20} />
                  Sign Up for Free
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetDemo}
                  className="flex-1 bg-surface-container-low text-on-surface py-3 rounded-xl font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Play Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-surface-container-low text-on-surface py-3 rounded-xl font-bold hover:bg-surface-container transition-colors"
                >
                  Close Demo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DemoMode;
