import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "./GameShell";
import { cleanWordForDisplay } from "../../utils/answerMatch";

interface FlashcardsGameProps {
  currentWord: Word | undefined;
  targetLanguage: "hebrew" | "arabic";
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessingRef: React.MutableRefObject<boolean>;
  onAnswer: (gotIt: boolean) => void;
  speakWord: (wordId: number, fallbackText?: string) => void;
  /** Phase-3e theme — drives the front face tint, the speaker pill,
   *  and the "Got It" button gradient.  flashcards = cyan. */
  themeColor?: GameThemeColor;
}

/**
 * Phase-3e redesign (2026-04-30):
 *
 * Flashcards now uses a TRUE 3D flip card instead of the previous flat
 * "Show Translation" toggle button + separate WordPromptCard above.
 *
 * Layout:
 *   - Mode-label pill at the top (handled by GameActiveView).
 *   - WordPromptCard is SKIPPED for this mode (the flip card replaces
 *     it — see the gameMode !== "flashcards" guard in GameActiveView).
 *   - Big 3D flip card.  Front face: English word + 🔊 button + tap-to-
 *     flip hint, cyan-tinted.  Back face: target-language word, teal-
 *     tinted.  Tap anywhere on the card to flip; CSS perspective +
 *     transform-style: preserve-3d gives a proper out-and-around
 *     animation, not a fake fade-swap.
 *   - Below the card: TWO BIG response buttons (px-7 / 96px min-height).
 *     "Still Learning" rose, "Got It!" emerald — keeps the existing
 *     binary palette (paired colours read fastest).  The cyan theme
 *     drives the card itself, the buttons stay paired.
 *
 * The pronunciation button on the front face stops propagation so
 * tapping 🔊 doesn't accidentally flip the card.
 */
export default function FlashcardsGame({
  currentWord, targetLanguage, isFlipped, setIsFlipped, isProcessingRef,
  onAnswer, speakWord, themeColor,
}: FlashcardsGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;

  const englishText = cleanWordForDisplay(currentWord?.english || "");
  const translationText =
    currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew || "";

  const handleFlip = () => {
    if (isProcessingRef.current) return;
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="max-w-md mx-auto px-2 space-y-4 sm:space-y-5">
      {/* 3D flip card.
          - Outer wrapper: perspective gives the rotation depth.
          - Inner: preserve-3d + animated rotateY drives the flip.
          - Front + Back faces use absolute positioning + backface-
            visibility hidden so only the front-facing one is visible.
          The card is intentionally tall (min-h-72 mobile / min-h-80
          desktop) so the word has room to breathe AND so kids see
          something substantial on screen.  Bigger word text on
          mobile (text-5xl → text-6xl on desktop) since this IS the
          prompt now. */}
      <div className="[perspective:1200px]">
        <motion.div
          onClick={handleFlip}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="relative w-full min-h-72 sm:min-h-80 cursor-pointer"
          style={{ transformStyle: "preserve-3d", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {/* FRONT — English */}
          <div
            className={`absolute inset-0 rounded-3xl shadow-2xl border-2 flex flex-col items-center justify-center p-6 sm:p-8 ${
              themed
                ? `${themed.cardBg} ${themed.border}`
                : "bg-stone-50 border-stone-200"
            }`}
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <h2 className="text-5xl sm:text-6xl font-black text-stone-900 text-center break-words mb-6">
              {englishText}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                // Don't bubble — would otherwise flip the card.
                e.stopPropagation();
                if (currentWord) speakWord(currentWord.id, currentWord.english);
              }}
              aria-label="Play pronunciation"
              className={`p-4 sm:p-5 rounded-full shadow-md active:scale-90 transition-transform ${
                themed ? `${themed.pillBg}` : "bg-stone-100 hover:bg-stone-200"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <Volume2 size={28} className={themed ? themed.pillText : "text-stone-600"} />
            </button>
            <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">
              {t.showTranslation} ↻
            </p>
          </div>

          {/* BACK — target-language translation */}
          <div
            className="absolute inset-0 rounded-3xl shadow-2xl border-2 bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-200 flex flex-col items-center justify-center p-6 sm:p-8"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <h2
              dir="auto"
              className="text-5xl sm:text-6xl font-black text-stone-900 text-center break-words"
            >
              {translationText}
            </h2>
            <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">
              {t.showEnglish} ↻
            </p>
          </div>
        </motion.div>
      </div>

      {/* Response buttons — bigger than before.  Kept on the binary
          rose↔emerald palette since "I'm still learning vs I got it" is
          a direct judgement, same as True/False.  Each button is
          min-h-[88px], stacked emoji + label inside. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onAnswer(false)}
          onTouchStart={(e) => { if (!isProcessingRef.current) e.currentTarget.click(); }}
          disabled={isProcessingRef.current}
          type="button"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", minHeight: "88px" }}
          className="rounded-3xl bg-gradient-to-br from-rose-400 to-rose-600 text-white font-black py-5 sm:py-6 shadow-lg hover:shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
        >
          <span className="text-2xl sm:text-3xl">🤔</span>
          <span className="text-base sm:text-lg">{t.stillLearning}</span>
        </button>
        <button
          onClick={() => onAnswer(true)}
          onTouchStart={(e) => { if (!isProcessingRef.current) e.currentTarget.click(); }}
          disabled={isProcessingRef.current}
          type="button"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", minHeight: "88px" }}
          className="rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black py-5 sm:py-6 shadow-lg hover:shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
        >
          <span className="text-2xl sm:text-3xl">✓</span>
          <span className="text-base sm:text-lg">{t.gotIt}</span>
        </button>
      </div>
    </div>
  );
}
