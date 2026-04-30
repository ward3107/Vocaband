import { motion } from "motion/react";
import { LETTER_COLORS } from "../../constants/game";
import { ShowAnswerFeedback } from "../ShowAnswerFeedback";
import { cleanWordForDisplay } from "../../utils/answerMatch";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "./GameShell";

interface LetterSoundsGameProps {
  currentWord: Word | undefined;
  targetLanguage: "hebrew" | "arabic";
  revealedLetters: number;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  feedback: "correct" | "wrong" | "show-answer" | null;
  onSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Phase-3d theme — drives the translation hero card, the Check
   *  button gradient, and the input border.  letter-sounds = violet. */
  themeColor?: GameThemeColor;
}

/**
 * Phase-3d redesign (2026-04-30):
 *
 * Letter Sounds is the most visually expressive mode (each letter
 * gets its own LETTER_COLORS hue) — the redesign leans into that.
 *
 * Layout:
 *   - Mode-label pill at the top (handled by GameActiveView).
 *   - Translation hero card — same theme-tinted treatment as
 *     Spelling, so the kid sees what they're spelling toward in
 *     bold violet.
 *   - Letter blocks: 14×14 → 16×20 mobile, 12×14 → 16×20 desktop
 *     baseline; on reveal each letter pops in via a Framer Motion
 *     spring (scale 0 → 1 with a slight rotation kick) so the
 *     "ta-da" moment lands.  Bigger fonts so kids can see the
 *     letter shape clearly.
 *   - The "?" placeholder for un-revealed letters is bigger and
 *     bouncing subtly to signal "wait, more letters coming".
 *   - When all letters revealed: the input + Check button appear
 *     beneath, themed violet→fuchsia gradient.
 *
 * The transition kid → adult: the SHAPE of the word is teaching them
 * sounds; the ANIMATION is rewarding them for waiting.  Letter
 * Sounds is for the youngest students in the app.
 */
export default function LetterSoundsGame({
  currentWord, targetLanguage, revealedLetters,
  spellingInput, setSpellingInput, feedback, onSpellingSubmit, themeColor,
}: LetterSoundsGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  const cleanAnswer = cleanWordForDisplay(currentWord?.english || "");
  const allRevealed = revealedLetters >= (cleanAnswer.length || 99);

  return (
    <div className="max-w-lg mx-auto px-2">
      {/* Translation hero card */}
      <div
        className={`p-4 sm:p-5 rounded-2xl mb-5 sm:mb-7 text-center ${
          themed ? `${themed.cardBg} border-2 ${themed.border}` : "bg-stone-50 border border-stone-200"
        }`}
      >
        <p
          className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] mb-2 ${
            themed ? themed.pillText : "text-stone-500"
          }`}
        >
          {t.translationLabel.replace(":", "")}
        </p>
        <p
          className="text-2xl sm:text-3xl font-black text-stone-900 break-words"
          dir="auto"
        >
          {currentWord?.[targetLanguage]}
        </p>
      </div>

      {/* Animated letter blocks */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 mb-7">
        {cleanAnswer.split(" ").map((word, wordIdx, allWords) => {
          let charOffset = 0;
          for (let j = 0; j < wordIdx; j++) charOffset += allWords[j].length + 1;
          return (
            <div key={wordIdx} className="flex justify-center gap-1.5 sm:gap-2">
              {word.split("").map((letter, i) => {
                const globalIdx = charOffset + i;
                const revealed = globalIdx < revealedLetters;
                const color = LETTER_COLORS[globalIdx % LETTER_COLORS.length];
                return (
                  <motion.div
                    key={globalIdx}
                    initial={{ scale: 0.5, opacity: 0.15, rotate: -10 }}
                    animate={{
                      scale: revealed ? 1 : 0.65,
                      opacity: revealed ? 1 : 0.25,
                      rotate: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 18,
                    }}
                    className="w-12 h-14 sm:w-16 sm:h-20 rounded-2xl font-black text-2xl sm:text-4xl flex items-center justify-center border-4 flex-shrink-0 shadow-md"
                    style={{
                      color: revealed ? color : color + "40",
                      borderColor: revealed ? color : color + "40",
                      background: color + "18",
                    }}
                  >
                    {revealed ? (letter ?? "").toUpperCase() : (
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        ?
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      {allRevealed && (
        <form onSubmit={onSpellingSubmit} className="max-w-sm mx-auto">
          <input
            autoFocus
            type="text"
            value={spellingInput}
            onChange={(e) => setSpellingInput(e.target.value)}
            disabled={feedback === "show-answer" || feedback === "correct"}
            placeholder={t.typeTheWord}
            className={`w-full p-3 sm:p-4 text-xl sm:text-2xl font-black text-center border-2 rounded-2xl mb-3 transition-all ${
              feedback === "correct" ? "border-emerald-600 bg-emerald-50 text-emerald-700" :
              feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
              feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
              themed ? `${themed.border} focus:border-violet-500 outline-none` : "border-stone-200 focus:border-stone-900 outline-none"
            }`}
          />
          {feedback === "show-answer" && (
            <ShowAnswerFeedback answer={cleanAnswer} dir="ltr" className="mb-3" />
          )}
          <button
            type="submit"
            disabled={!!feedback}
            className={`w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              themed
                ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white hover:shadow-xl"
                : "bg-stone-900 text-white hover:bg-black"
            }`}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {t.checkAnswer}
          </button>
        </form>
      )}
    </div>
  );
}
