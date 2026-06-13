import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { getGameDebugger } from "../../utils/gameDebug";
import { useLanguage } from "../../hooks/useLanguage";
import { gameAriasT } from "../../locales/student/game-arias";
import { gameActiveT } from "../../locales/student/game-active";
import { cleanWordForDisplay } from "../../utils/answerMatch";
import type { Word } from "../../data/vocabulary";
import { getThemeColors, type GameThemeColor } from "./GameShell";

interface WordPromptCardProps {
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
 * QuestionStage hero (2026-06 redesign):
 *   - Classic/Reverse: the prompt word + a "tap to hear it" affordance so
 *     kids know the word/speaker is tappable.
 *   - Listening: there is no visible word — instead a big pulsing speaker
 *     ORB is the hero (the old treatment just blurred the word at 20%
 *     opacity, which read like a rendering bug).  The orb IS the play
 *     button, with a "listen carefully" nudge.
 *   - Image + responsive sizing carried over from the Phase-2 bump.
 */
export default function WordPromptCard({
  currentWord, gameMode, targetLanguage,
  feedback, isFlipped, scrambledWord, speakWord, themeColor,
}: WordPromptCardProps) {
  const { language } = useLanguage();
  const tAria = gameAriasT[language];
  const t = gameActiveT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  const isListening = gameMode === "listening";

  // Single play handler shared by the speaker button and the listening
  // orb so the debug logging + guard stay in one place.
  const playWord = () => {
    const gameDebug = getGameDebugger();
    gameDebug.logButtonClick({
      button: 'pronunciation',
      gameMode,
      wordId: currentWord?.id ?? -1,
      disabled: false,
      feedback,
    });
    if (currentWord) speakWord(currentWord.id, currentWord.english);
  };

  return (
    <div
      className={`mb-3 sm:mb-4 ${
        themed
          ? `${themed.cardBg} rounded-2xl p-4 sm:p-6 shadow-inner`
          : ""
      }`}
    >
      {isListening ? (
        // ── Listening hero: pulsing speaker orb (no visible word) ──
        <div className="flex flex-col items-center justify-center gap-3 py-2 sm:py-4">
          <button
            onClick={playWord}
            aria-label={tAria.replayAudio}
            title={tAria.replayAudio}
            className="relative flex items-center justify-center"
          >
            {/* ping ring — motion-safe so reduced-motion users get a
                static orb instead of a looping pulse. */}
            <span
              aria-hidden="true"
              className={`absolute inline-flex h-24 w-24 sm:h-28 sm:w-28 rounded-full opacity-40 motion-safe:animate-ping ${themed?.fill ?? "bg-stone-400"}`}
            />
            <span
              className={`relative inline-flex items-center justify-center h-28 w-28 sm:h-36 sm:w-36 rounded-full shadow-lg ${themed?.fill ?? "bg-stone-500"}`}
            >
              <Volume2 className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
            </span>
          </button>
          <p className={`text-sm font-bold ${themed?.pillText ?? "text-stone-500"}`}>
            {t.listenCarefully}
          </p>
        </div>
      ) : (
        // ── Word hero: prompt word + tap-to-hear affordance ──
        <>
          <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            {currentWord?.imageUrl && (
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentWord.imageUrl}
                alt={currentWord.english}
                referrerPolicy="no-referrer"
                className="w-28 h-28 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-cover rounded-2xl shadow-lg border-4 border-white"
              />
            )}
            <h2
              // lg:text-7xl — the prompt word fills the wider card the
              // tablet/landscape layout gives it (open-issues §F); phone +
              // sm/md sizes are unchanged.
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-stone-900 relative z-10 break-words w-full text-center"
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
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={playWord}
              className={`p-3 rounded-full transition-colors ${
                themed
                  ? `${themed.pillBg} hover:opacity-80`
                  : "bg-stone-100 hover:bg-stone-200"
              }`}
              aria-label={tAria.playPronunciation}
              title={tAria.playPronunciation}
            >
              <Volume2 size={24} className={themed ? themed.pillText : "text-stone-600"} />
            </button>
            <p className={`text-xs font-semibold ${themed?.pillText ?? "text-stone-400"}`}>
              {t.tapToHear}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
