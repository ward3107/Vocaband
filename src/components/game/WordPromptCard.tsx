import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { getGameDebugger } from "../../utils/gameDebug";
import { useLanguage } from "../../hooks/useLanguage";
import { gameAriasT } from "../../locales/student/game-arias";
import { cleanWordForDisplay } from "../../utils/answerMatch";
import type { Word } from "../../data/vocabulary";
import { getThemeColors, type GameThemeColor } from "./GameShell";

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
  /** Phase-2 redesign: optional theme colour.  When provided, the
   *  prompt sits inside a soft theme-coloured hero card and the
   *  pronunciation button picks up the theme's pill background.
   *  Omitting it preserves the legacy stone-only styling so
   *  non-migrated callers stay visually unchanged. */
  themeColor?: GameThemeColor;
}

/**
 * Phase-2 mobile-first bumps (2026-04-30):
 *   - Word text: text-3xl → text-4xl on mobile (sm:text-5xl unchanged)
 *   - Image: w-20 h-20 → w-28 h-28 on mobile (192px on desktop unchanged)
 *   - Pronunciation button: p-1.5 → p-3 on mobile, icon size 20 → 24
 *   - Optional themed hero card via the new themeColor prop.
 */
export default function WordPromptCard({
  currentIndex, gameWordsLength, currentWord, gameMode, targetLanguage,
  feedback, isFlipped, scrambledWord, speakWord, themeColor,
}: WordPromptCardProps) {
  const { language } = useLanguage();
  const tAria = gameAriasT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  return (
    <div
      className={`mb-3 sm:mb-4 ${
        themed
          ? `${themed.cardBg} rounded-3xl p-4 sm:p-6 shadow-inner`
          : ""
      }`}
    >
      <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-2 sm:mb-1">
        {currentIndex + 1} / {gameWordsLength}
      </span>
      <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        {currentWord?.imageUrl && (
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={currentWord.imageUrl}
            alt={currentWord.english}
            referrerPolicy="no-referrer"
            className="w-28 h-28 sm:w-48 sm:h-48 object-cover rounded-3xl sm:rounded-[32px] shadow-lg border-4 border-white"
          />
        )}
        <h2
          className={`text-4xl sm:text-5xl md:text-6xl font-black text-stone-900 relative z-10 break-words w-full text-center ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}
          dir={(gameMode === "spelling" || gameMode === "reverse" || (gameMode === "flashcards" && isFlipped)) ? "auto" : "ltr"}
        >
          {gameMode === "spelling" || gameMode === "reverse"
            ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew)
            : gameMode === "scramble"
            ? scrambledWord
            : gameMode === "flashcards"
            ? (isFlipped ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew) : cleanWordForDisplay(currentWord?.english || ""))
            : cleanWordForDisplay(currentWord?.english || "")}
        </h2>
      </div>
      <div className="flex justify-center gap-2">
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
          className={`p-3 sm:p-3 rounded-full transition-colors ${
            themed
              ? `${themed.pillBg} hover:opacity-80`
              : "bg-stone-100 hover:bg-stone-200"
          }`}
          aria-label={tAria.playPronunciation}
          title={tAria.playPronunciation}
        >
          <Volume2 size={24} className={themed ? themed.pillText : "text-stone-600"} />
        </button>
      </div>
    </div>
  );
}
