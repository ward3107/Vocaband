import { ShowAnswerFeedback } from "../ShowAnswerFeedback";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "./GameShell";
import { cleanWordForDisplay } from "../../utils/answerMatch";

interface SpellingGameProps {
  currentWord: Word | undefined;
  gameMode: string;
  targetLanguage: "hebrew" | "arabic";
  feedback: "correct" | "wrong" | "show-answer" | null;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  onSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Phase-3c theme — drives the "Translation:" label colour, the
   *  Check button gradient, and the letter-slot ring on submit.
   *  spelling=violet, scramble inherits via Phase 3g (own commit). */
  themeColor?: GameThemeColor;
}

/**
 * Phase-3c redesign (2026-04-30):
 *
 * Spelling now feels like a real spelling game — kids see the SHAPE
 * of the word they're aiming for, not just an empty input.
 *
 * Layout (top → bottom on mobile):
 *   - "TRANSLATION:" label with the target-language word displayed
 *     prominently in a violet-tinted hero card.
 *   - LETTER SLOTS — one box per letter of the target English word.
 *     As the kid types, letters fill the slots in real time (no
 *     positional correctness shown until submit, so we don't give
 *     away the answer letter-by-letter).  Spaces in multi-word
 *     answers ("ice cream", "post office") render as a small gap
 *     instead of a slot, so the kid sees the word boundaries.
 *   - On submit:
 *       correct  → all slots green, check mark
 *       wrong    → letters that match the answer at the same
 *                  position glow green; mismatches glow rose.
 *                  Pedagogical: kid sees exactly where they went
 *                  wrong instead of "wrong, try again".
 *       show-answer → amber slots showing the correct word.
 *   - Big Check button styled with the theme gradient.
 *
 * Scramble mode (same component, gameMode === "scramble") skips
 * the letter slots since the prompt IS the scrambled letters and
 * adding slots would double-render.  Phase 3g will give scramble
 * its own indigo redesign on a separate branch.
 */
export default function SpellingGame({
  currentWord, gameMode, targetLanguage, feedback,
  spellingInput, setSpellingInput, onSpellingSubmit, themeColor,
}: SpellingGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  const isSpelling = gameMode === "spelling";
  const cleanAnswer = cleanWordForDisplay(currentWord?.english || "");
  const isInputDisabled = feedback === "show-answer" || feedback === "correct";

  /** Build the per-letter slot rendering.  Shape: a 2D array where
   *  each inner array is a "word group" (split on spaces in the
   *  target answer).  Each slot represents one letter position. */
  const renderSlots = () => {
    if (!isSpelling || !cleanAnswer) return null;
    const wordGroups = cleanAnswer.split(" ");
    let globalIdx = 0;
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 mb-4 sm:mb-6">
        {wordGroups.map((group, gi) => (
          <div key={gi} className="flex gap-1 sm:gap-1.5">
            {group.split("").map((expectedChar) => {
              const idx = globalIdx++;
              const typedChar = spellingInput[idx] || "";
              const upper = typedChar.toUpperCase();
              const expectedUpper = expectedChar.toUpperCase();
              // Color decisions:
              //   show-answer → amber, fill with correct letter
              //   correct → all green
              //   wrong → letters at correct positions green, others rose
              //   typing → neutral theme tint, fill with typed letter
              let slotClass = "border-stone-200 bg-white text-stone-900";
              let displayChar = typedChar ? upper : "";
              if (feedback === "show-answer") {
                slotClass = "border-amber-500 bg-amber-50 text-amber-700";
                displayChar = expectedUpper;
              } else if (feedback === "correct") {
                slotClass = "border-emerald-500 bg-emerald-50 text-emerald-700";
              } else if (feedback === "wrong") {
                slotClass = upper === expectedUpper
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-rose-500 bg-rose-50 text-rose-700";
              } else if (typedChar) {
                slotClass = themed
                  ? `${themed.border} ${themed.cardBg} text-stone-900`
                  : "border-stone-300 bg-stone-50 text-stone-900";
              }
              return (
                <div
                  key={idx}
                  className={`w-8 h-10 sm:w-10 sm:h-12 rounded-lg sm:rounded-xl border-2 flex items-center justify-center font-black text-base sm:text-xl tabular-nums uppercase transition-colors ${slotClass}`}
                >
                  {displayChar || "·"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <form onSubmit={onSpellingSubmit} className="max-w-md mx-auto px-2">
      {/* Translation prompt — bigger, theme-tinted hero card. */}
      {isSpelling && (
        <div
          className={`p-4 sm:p-5 rounded-2xl mb-4 sm:mb-6 text-center ${
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
            className="text-2xl sm:text-4xl font-black text-stone-900 break-words"
            dir="auto"
          >
            {currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew}
          </p>
        </div>
      )}

      {/* Letter slots — show the SHAPE of the word.  Spelling mode
          only; scramble keeps the existing layout until 3g. */}
      {renderSlots()}

      {/* The actual input.  Visually de-emphasised vs the slots
          (kids look at the slots, type into the input).  Still the
          source of truth for the form submit. */}
      <input
        autoFocus
        type="text"
        id="spelling-answer"
        name="answer"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={spellingInput}
        onChange={(e) => setSpellingInput(e.target.value)}
        disabled={isInputDisabled}
        placeholder={t.typeInEnglish}
        className={`w-full p-3 sm:p-4 text-lg sm:text-2xl font-black text-center border-2 rounded-2xl mb-3 sm:mb-4 transition-all ${
          feedback === "correct" ? "border-emerald-600 bg-emerald-50 text-emerald-700" :
          feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
          feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
          themed ? `${themed.border} focus:border-violet-500 outline-none` : "border-stone-200 focus:border-stone-900 outline-none"
        }`}
      />

      {feedback === "show-answer" && (
        <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-4" />
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
  );
}
