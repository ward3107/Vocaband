import React from "react";
import {
  Volume2,
  CheckCircle2,
  BookOpen,
  PenTool,
  Zap,
  Layers,
  Shuffle,
  Repeat,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import type { GameMode } from "../../shared/constants/game";
import type { AssignmentData, ProgressData } from "../../shared/types";

interface GameModeSelectionViewProps {
  activeAssignment: AssignmentData | null;
  studentProgress: ProgressData[];
  setGameMode: (mode: GameMode) => void;
  setShowModeSelection: (show: boolean) => void;
  setShowModeIntro: (show: boolean) => void;
  onExitGame: () => void;
}

export function GameModeSelectionView({
  activeAssignment,
  studentProgress,
  setGameMode,
  setShowModeSelection,
  setShowModeIntro,
  onExitGame,
}: GameModeSelectionViewProps) {
  console.log('[Mode Selection] Rendering mode selection screen');
  console.log('[Mode Selection] activeAssignment:', activeAssignment);

  const modes: Array<{ id: GameMode; name: string; desc: string; color: string; icon: React.ReactNode; tooltip: string[] }> = [
    { id: "classic", name: "Classic Mode", desc: "See the word, hear the word, pick translation.", color: "emerald", icon: <BookOpen size={24} />, tooltip: ["See the word in Hebrew/Arabic", "Hear the pronunciation", "Choose the correct English translation"] },
    { id: "listening", name: "Listening Mode", desc: "Only hear the word. No English text!", color: "blue", icon: <Volume2 size={24} />, tooltip: ["Listen to the word pronunciation", "No text shown - audio only!", "Great for training your ear"] },
    { id: "spelling", name: "Spelling Mode", desc: "Type the English word. Hardest mode!", color: "purple", icon: <PenTool size={24} />, tooltip: ["Hear the word", "Type it correctly in English", "Best for mastering spelling"] },
    { id: "matching", name: "Matching Mode", desc: "Match Hebrew to English. Fun & fast!", color: "amber", icon: <Zap size={24} />, tooltip: ["Match pairs together", "Connect Hebrew to English", "Fast-paced and fun!"] },
    { id: "true-false", name: "True/False", desc: "Is the translation correct? Quick thinking!", color: "rose", icon: <CheckCircle2 size={24} />, tooltip: ["See a word and translation", "Decide if it's correct", "Quick reflexes game"] },
    { id: "flashcards", name: "Flashcards", desc: "Review words at your own pace. No pressure.", color: "cyan", icon: <Layers size={24} />, tooltip: ["Review at your own pace", "Flip cards to see answers", "No scoring - just practice"] },
    { id: "scramble", name: "Word Scramble", desc: "Unscramble the letters to find the word.", color: "indigo", icon: <Shuffle size={24} />, tooltip: ["Letters are mixed up", "Rearrange to form the word", "Tests your spelling skills"] },
    { id: "reverse", name: "Reverse Mode", desc: "See Hebrew/Arabic, pick the English word.", color: "fuchsia", icon: <Repeat size={24} />, tooltip: ["See Hebrew/Arabic word", "Choose matching English word", "Reverse of classic mode"] },
    { id: "letter-sounds", name: "Letter Sounds", desc: "Watch each letter light up and hear its sound.", color: "violet", icon: <span className="text-2xl">🔡</span>, tooltip: ["Each letter lights up in color", "Listen to each letter sound", "Type the full word you heard"] },
    { id: "sentence-builder", name: "Sentence Builder", desc: "Tap words in the right order to build the sentence.", color: "teal", icon: <span className="text-2xl">🧩</span>, tooltip: ["Words are shuffled", "Tap them in the correct order", "Build the sentence correctly!"] },
  ];

  const allowedModes = activeAssignment?.allowedModes || modes.map(m => m.id);
  const filteredModes = modes.filter(m => m.id === "flashcards" || allowedModes.includes(m.id));

  console.log('[Mode Selection] Modes count:', filteredModes.length);
  if (filteredModes.length === 0) {
    console.error('[Mode Selection] No modes available!');
  }

  const colorClasses: Record<string, string> = {
    emerald: "bg-blue-50 border-blue-100 hover:bg-blue-50 text-blue-700",
    blue: "bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-700",
    purple: "bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-700",
    amber: "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700",
    rose: "bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700",
    cyan: "bg-cyan-50 border-cyan-100 hover:bg-cyan-100 text-cyan-700",
    indigo: "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700",
    fuchsia: "bg-fuchsia-50 border-fuchsia-100 hover:bg-fuchsia-100 text-fuchsia-700",
    violet: "bg-violet-50 border-violet-100 hover:bg-violet-100 text-violet-700",
    teal: "bg-teal-50 border-teal-100 hover:bg-teal-100 text-teal-700",
  };

  const iconColorClasses: Record<string, string> = {
    emerald: "text-blue-700",
    blue: "text-blue-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    cyan: "text-cyan-600",
    indigo: "text-indigo-600",
    fuchsia: "text-fuchsia-600",
    violet: "text-violet-600",
    teal: "text-teal-600",
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-[48px] shadow-2xl p-6 sm:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-blue-600" />
        <button
          onClick={onExitGame}
          className="absolute top-4 right-4 sm:top-10 sm:right-10 text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 p-3 rounded-full hover:rotate-90 transition-all duration-300"
          aria-label="Close mode selection"
          title="Close mode selection"
        >
          <X size={28} />
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-12 mt-4 sm:mt-0"
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-3 text-stone-900 tracking-tight">Choose Your Mode</h2>
          <p className="text-stone-500 text-base sm:text-xl font-medium">How do you want to learn today?</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredModes.map((mode, idx) => {
            const isCompleted = studentProgress.some(p => p.assignmentId === activeAssignment?.id && p.mode === mode.id);

            return (
              <motion.button
                key={mode.id}
                onClick={() => { setGameMode(mode.id); setShowModeSelection(false); setShowModeIntro(true); }}
                className={`p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.05, translateY: -8 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[24px] bg-white flex items-center justify-center mb-3 sm:mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[mode.color]} relative`}>
                  {mode.icon}
                  {isCompleted && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
                <p className="font-black text-base sm:text-xl mb-1 sm:mb-2 leading-tight">{mode.name}</p>
                <p className="opacity-70 text-xs sm:text-sm font-bold leading-snug">{mode.desc}</p>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Zap size={20} className="animate-pulse" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
