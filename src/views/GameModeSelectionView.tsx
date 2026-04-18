import type React from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Volume2,
  PenTool,
  Zap,
  CheckCircle2,
  Layers,
  Shuffle,
  Repeat,
  X,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { GameMode } from "../constants/game";
import type { AssignmentData, ProgressData } from "../core/supabase";

interface GameModeSelectionViewProps {
  activeAssignment: AssignmentData | null;
  studentProgress: ProgressData[];
  isQuickPlayGuest: boolean;
  quickPlayCompletedModes: Set<string>;
  setGameMode: (mode: GameMode) => void;
  setShowModeSelection: (v: boolean) => void;
  setShowModeIntro: (v: boolean) => void;
  handleExitGame: () => void;
}

export default function GameModeSelectionView({
  activeAssignment,
  studentProgress,
  isQuickPlayGuest,
  quickPlayCompletedModes,
  setGameMode,
  setShowModeSelection,
  setShowModeIntro,
  handleExitGame,
}: GameModeSelectionViewProps) {
  // Flashcards is flagged as the "learning" mode — it's where students
  // are meant to START before practising.  It's rendered as a big hero
  // card above the rest so a first-time player sees it before the
  // practice grid.  The other nine modes are laid out normally.
  const modes: Array<{ id: GameMode; name: string; desc: string; color: string; icon: React.ReactNode; tooltip: string[]; isLearnMode?: boolean }> = [
    { id: "flashcards", name: "Flashcards", desc: "Learn the words first — flip, listen, and earn XP at your own pace.", color: "cyan", icon: <Layers size={28} />, tooltip: ["Learn before you practice", "Flip cards to see answers", "No pressure — still earns XP"], isLearnMode: true },
    { id: "classic", name: "Classic Mode", desc: "See the word, hear the word, pick translation.", color: "emerald", icon: <BookOpen size={24} />, tooltip: ["See the word in Hebrew/Arabic", "Hear the pronunciation", "Choose the correct English translation"] },
    { id: "listening", name: "Listening Mode", desc: "Only hear the word. No English text!", color: "blue", icon: <Volume2 size={24} />, tooltip: ["Listen to the word pronunciation", "No text shown - audio only!", "Great for training your ear"] },
    { id: "spelling", name: "Spelling Mode", desc: "Type the English word. Hardest mode!", color: "purple", icon: <PenTool size={24} />, tooltip: ["Hear the word", "Type it correctly in English", "Best for mastering spelling"] },
    { id: "matching", name: "Matching Mode", desc: "Match Hebrew to English. Fun & fast!", color: "amber", icon: <Zap size={24} />, tooltip: ["Match pairs together", "Connect Hebrew to English", "Fast-paced and fun!"] },
    { id: "true-false", name: "True/False", desc: "Is the translation correct? Quick thinking!", color: "rose", icon: <CheckCircle2 size={24} />, tooltip: ["See a word and translation", "Decide if it's correct", "Quick reflexes game"] },
    { id: "scramble", name: "Word Scramble", desc: "Unscramble the letters to find the word.", color: "indigo", icon: <Shuffle size={24} />, tooltip: ["Letters are mixed up", "Rearrange to form the word", "Tests your spelling skills"] },
    { id: "reverse", name: "Reverse Mode", desc: "See Hebrew/Arabic, pick the English word.", color: "fuchsia", icon: <Repeat size={24} />, tooltip: ["See Hebrew/Arabic word", "Choose matching English word", "Reverse of classic mode"] },
    { id: "letter-sounds", name: "Letter Sounds", desc: "Watch each letter light up and hear its sound.", color: "violet", icon: <span className="text-2xl">🔡</span>, tooltip: ["Each letter lights up in color", "Listen to each letter sound", "Type the full word you heard"] },
    { id: "sentence-builder", name: "Sentence Builder", desc: "Tap words in the right order to build the sentence.", color: "teal", icon: <span className="text-2xl">🧩</span>, tooltip: ["Words are shuffled", "Tap them in the correct order", "Build the sentence correctly!"] },
  ];

  const allowedModes = activeAssignment?.allowedModes || modes.map(m => m.id);
  const filteredModes = modes.filter(m => allowedModes.includes(m.id));
  const learnMode = filteredModes.find(m => m.isLearnMode);
  const practiceModes = filteredModes.filter(m => !m.isLearnMode);

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
          onClick={handleExitGame}
          className="absolute top-4 right-4 sm:top-10 sm:right-10 text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 p-3 rounded-full hover:rotate-90 transition-all duration-300"
          aria-label="Close mode selection"
          title="Close mode selection"
        >
          <X size={28} />
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-10 mt-4 sm:mt-0"
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-3 text-stone-900 tracking-tight">Choose Your Mode</h2>
          <p className="text-stone-500 text-base sm:text-xl font-medium">Start with Flashcards to learn — then practise with the other modes.</p>
        </motion.div>

        {/* Learning hero — Flashcards is promoted above the practice grid
            with its own big card so new students know to start here.
            Still earns XP and counts as a completed mode. */}
        {learnMode && (() => {
          const isCompleted = studentProgress.some(p => p.assignmentId === activeAssignment?.id && p.mode === learnMode.id);
          const isQpLocked = isQuickPlayGuest && quickPlayCompletedModes.has(learnMode.id);
          return (
            <motion.button
              key={learnMode.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={!isQpLocked ? { scale: 1.02, translateY: -4 } : undefined}
              whileTap={!isQpLocked ? { scale: 0.98 } : undefined}
              disabled={isQpLocked}
              onClick={() => {
                if (isQpLocked) return;
                console.log('[Mode Selection] Tapped learn mode:', learnMode.id);
                setGameMode(learnMode.id);
                setShowModeSelection(false);
                setShowModeIntro(true);
              }}
              className={`w-full mb-6 sm:mb-8 p-5 sm:p-8 rounded-[32px] text-left relative overflow-hidden shadow-xl transition-all ${isQpLocked ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:shadow-2xl'} bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute top-0 left-0 right-0 flex justify-between items-start px-5 pt-4">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <Sparkles size={12} />
                  Start here · Learn first
                </span>
                {(isCompleted || isQpLocked) && (
                  <span className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                    <CheckCircle2 size={16} className="text-white" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 sm:gap-6 mt-10 sm:mt-6">
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                  <GraduationCap size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xl sm:text-3xl mb-1">{learnMode.name}</p>
                  <p className="text-white/90 text-sm sm:text-base font-semibold leading-snug">{learnMode.desc}</p>
                </div>
                <div className="hidden sm:flex shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Layers size={28} />
                </div>
              </div>
            </motion.button>
          );
        })()}

        {practiceModes.length > 0 && (
          <div className="mb-3 text-left">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-stone-400">Then practise with</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {practiceModes.map((mode, idx) => {
            const isCompleted = studentProgress.some(p => p.assignmentId === activeAssignment?.id && p.mode === mode.id);
            // In Quick Play: lock modes that were already completed this session
            const isQpLocked = isQuickPlayGuest && quickPlayCompletedModes.has(mode.id);

            return (
              <motion.button
                key={mode.id}
                onClick={() => {
                  if (isQpLocked) {
                    console.warn('[Mode Selection] Click blocked — mode locked by Quick Play:', mode.id);
                    return;
                  }
                  // Defensive log — helps diagnose the "clicked card but
                  // nothing happens" bug by making the click trail
                  // visible in the console.  If a student reports a
                  // non-clickable mode, this reveals whether the handler
                  // ran at all.
                  console.log('[Mode Selection] Tapped mode:', mode.id);
                  setGameMode(mode.id);
                  setShowModeSelection(false);
                  setShowModeIntro(true);
                }}
                disabled={isQpLocked}
                className={`p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${isQpLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.05, translateY: -8 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[24px] bg-white flex items-center justify-center mb-3 sm:mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[mode.color]} relative`}>
                  {mode.icon}
                  {(isCompleted || isQpLocked) && (
                    <div className={`absolute -top-2 -right-2 ${isQpLocked ? 'bg-gray-500' : 'bg-blue-600'} text-white rounded-full p-1 shadow-md`}>
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
