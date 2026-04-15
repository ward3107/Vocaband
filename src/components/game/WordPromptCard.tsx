import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { getGameDebugger } from "../../utils/gameDebug";
import type { Word } from "../../data/vocabulary";

interface WordPromptCardProps {
  currentIndex: number;
  gameWordsLength: number;
  currentWord: Word | undefined;
  gameMode: string;
  targetLanguage: "hebrew" | "arabic";
  feedback: "correct" | "wrong" | "show-answer" | null;
  isFlipped: boolean;
  scrambledWord: string;
  speakWord: (wordId: number, fallbackText?: string) => void;
}

export default function WordPromptCard({
  currentIndex, gameWordsLength, currentWord, gameMode, targetLanguage,
  feedback, isFlipped, scrambledWord, speakWord,
}: WordPromptCardProps) {
  return (
    <div className="mb-1 sm:mb-4">
      <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1">
        {currentIndex + 1} / {gameWordsLength}
      </span>
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
        <h2
          className={`text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 relative z-10 break-words w-full text-center ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}
          dir={(gameMode === "spelling" || gameMode === "reverse" || (gameMode === "flashcards" && isFlipped)) ? "auto" : "ltr"}
        >
          {gameMode === "spelling" || gameMode === "reverse"
            ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew)
            : gameMode === "scramble"
            ? scrambledWord
            : gameMode === "flashcards"
            ? (isFlipped ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew) : currentWord?.english)
            : currentWord?.english}
        </h2>
      </div>
      <div className="flex justify-center gap-2 mt-0.5 sm:mt-0">
        <button
          onClick={() => {
            const gameDebug = getGameDebugger();
            gameDebug.logButtonClick({
              button: 'pronunciation',
              gameMode,
              wordId: currentWord?.id ?? -1,
              disabled: false,
              feedback,
            });
            if (currentWord) speakWord(currentWord.id, currentWord.english);
          }}
          className="p-1.5 sm:p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
          aria-label="Play pronunciation"
          title="Play pronunciation"
        >
          <Volume2 size={20} className="text-stone-600 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
}
