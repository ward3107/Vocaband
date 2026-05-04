import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "./GameShell";
import { cleanWordForDisplay } from "../../utils/answerMatch";
import { ShowAnswerFeedback } from "../ShowAnswerFeedback";

interface ScrambleGameProps {
  currentWord: Word | undefined;
  targetLanguage: "hebrew" | "arabic";
  scrambledWord: string;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  feedback: "correct" | "wrong" | "show-answer" | null;
  onSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Phase-3g theme — indigo. */
  themeColor?: GameThemeColor;
}

/**
 * Phase-3g redesign (2026-04-30):
 *
 * Scramble used to flow through SpellingGame: WordPromptCard showed
 * the scrambled letters as static text, then the kid typed the real
 * word into a text input.  On a phone that meant typing on the
 * on-screen keyboard, which is slow, error-prone, and breaks the
 * "puzzle" feel of unscrambling.
 *
 * The new Scramble is tap-to-assemble:
 *   - Top: indigo-tinted hero card with the target-language
 *     translation (the prompt — "what English word is this?").
 *   - Middle: BUILT-WORD slots that fill left-to-right as the kid
 *     taps tiles.  Tap an already-placed letter to send it back to
 *     the tray.
 *   - Below: LETTER TILE TRAY — one tappable tile per scrambled
 *     letter.  Tapping a tile moves it into the next empty slot;
 *     used tiles dim so the kid sees what's left.
 *   - Bottom: Clear (small ghost) + Check (big indigo gradient).
 *     Check is disabled until every slot is filled.
 *
 * Why tap-to-place over true drag:
 *   - Drag gestures need precise touch targeting that's painful on
 *     small phones (Galaxy A series in particular).
 *   - Tap-to-place is one-handed and accessible (no fine motor
 *     control needed).
 *   - Falls back gracefully on desktop too — click works the same.
 *
 * The scrambledWord may contain a space if the answer is "ice
 * cream" / "post office".  Spaces are filtered out of the tile
 * tray (kids don't tap spaces — the submit normalizer ignores
 * whitespace in the matcher) so the tray reads as pure letters.
 *
 * spellingInput is still the source of truth for the parent's
 * onSpellingSubmit handler.  Each tap appends to it; clear /
 * remove pops from it.  We track tile-index usage in local
 * `usedTileIndexes` state so the same letter appearing twice in
 * the scramble (e.g. APPLE → "PPALE", two Ps) can be
 * differentiated visually — the kid sees exactly which P got
 * placed and which is still available.
 */
export default function ScrambleGame({
  currentWord, targetLanguage, scrambledWord, spellingInput, setSpellingInput,
  feedback, onSpellingSubmit, themeColor,
}: ScrambleGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  const cleanAnswer = cleanWordForDisplay(currentWord?.english || "");
  const expectedLength = cleanAnswer.replace(/\s/g, "").length;

  // The tray ignores spaces (see the design note above).
  const trayLetters = scrambledWord.replace(/\s/g, "").split("");

  // Which tile indexes the kid has placed.  Order matters — the
  // built word's i-th character came from trayLetters[usedTileIndexes[i]].
  const [usedTileIndexes, setUsedTileIndexes] = useState<number[]>([]);

  // Reset tile state whenever the round advances (new word, new
  // scramble).  Use a ref to detect identity change instead of
  // tracking currentWord.id directly so we also handle
  // hot-reload / re-shuffle cases.
  const lastScrambleRef = useRef<string>("");
  useEffect(() => {
    if (scrambledWord !== lastScrambleRef.current) {
      lastScrambleRef.current = scrambledWord;
      setUsedTileIndexes([]);
      setSpellingInput("");
    }
  }, [scrambledWord, setSpellingInput]);

  // Reconcile usedTileIndexes if spellingInput changed externally
  // (e.g. a power-up auto-filled letters or a "reveal next" hint).
  // Greedy: walk spellingInput, claim the first unused tile that
  // matches each character.  Same letter appearing twice in the
  // scramble (APPLE → "PPALE") gets matched left-to-right, which
  // is good enough — the visual difference between two identical
  // letters doesn't matter.
  useEffect(() => {
    if (spellingInput.length === usedTileIndexes.length) return;
    const used: number[] = [];
    for (const ch of spellingInput) {
      const upper = ch.toUpperCase();
      const idx = trayLetters.findIndex(
        (l, i) => !used.includes(i) && l.toUpperCase() === upper,
      );
      if (idx !== -1) used.push(idx);
    }
    setUsedTileIndexes(used);
    // trayLetters is derived from scrambledWord (already a dep
    // above) — listing it here would cause a re-run on every
    // render due to .replace(...).split(...) returning a new
    // array reference each pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellingInput]);

  const isLocked = feedback === "show-answer" || feedback === "correct";
  const isFull = spellingInput.length >= expectedLength;

  const handleTileTap = (tileIdx: number) => {
    if (isLocked) return;
    if (usedTileIndexes.includes(tileIdx)) return;
    if (spellingInput.length >= expectedLength) return;
    setUsedTileIndexes((prev) => [...prev, tileIdx]);
    setSpellingInput((prev) => prev + trayLetters[tileIdx]);
  };

  /** Pop the i-th built letter back to the tray. */
  const handleSlotTap = (slotIdx: number) => {
    if (isLocked) return;
    if (slotIdx >= usedTileIndexes.length) return;
    setUsedTileIndexes((prev) => prev.filter((_, i) => i !== slotIdx));
    setSpellingInput((prev) => prev.slice(0, slotIdx) + prev.slice(slotIdx + 1));
  };

  /** Pop the last built letter (Backspace-style). */
  const handleClearLast = () => {
    if (isLocked) return;
    if (usedTileIndexes.length === 0) return;
    setUsedTileIndexes((prev) => prev.slice(0, -1));
    setSpellingInput((prev) => prev.slice(0, -1));
  };

  /** Send everything back to the tray. */
  const handleClearAll = () => {
    if (isLocked) return;
    setUsedTileIndexes([]);
    setSpellingInput("");
  };

  /** Render the BUILT-WORD slots — one box per expected letter.
   *  Empty slots show a faint dot; filled slots show the tapped
   *  letter and are themselves tappable to remove. */
  const renderSlots = () => {
    const slots: JSX.Element[] = [];
    for (let i = 0; i < expectedLength; i++) {
      const ch = spellingInput[i] || "";
      const filled = !!ch;
      let slotClass = "border-stone-200 bg-white text-stone-300";
      if (feedback === "show-answer") {
        slotClass = "border-amber-500 bg-amber-50 text-amber-700";
      } else if (feedback === "correct") {
        slotClass = "border-emerald-500 bg-emerald-50 text-emerald-700";
      } else if (feedback === "wrong") {
        slotClass = "border-rose-500 bg-rose-50 text-rose-700";
      } else if (filled && themed) {
        slotClass = `${themed.border} ${themed.cardBg} text-stone-900`;
      } else if (filled) {
        slotClass = "border-stone-300 bg-stone-50 text-stone-900";
      }
      const display =
        feedback === "show-answer"
          ? cleanAnswer.replace(/\s/g, "")[i]?.toUpperCase() ?? ""
          : ch.toUpperCase();
      slots.push(
        <button
          key={i}
          type="button"
          onClick={() => handleSlotTap(i)}
          disabled={isLocked || !filled}
          aria-label={filled ? `Remove letter ${ch}` : "Empty slot"}
          className={`w-9 h-12 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center font-black text-lg sm:text-2xl uppercase transition-colors ${slotClass} ${filled && !isLocked ? "cursor-pointer active:scale-95" : "cursor-default"}`}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {display || (filled ? "" : "·")}
        </button>,
      );
    }
    return slots;
  };

  return (
    <form
      onSubmit={onSpellingSubmit}
      className="max-w-md mx-auto px-2"
    >
      {/* Translation prompt — indigo-tinted hero card. */}
      <div
        className={`p-4 sm:p-5 rounded-2xl mb-4 sm:mb-5 text-center ${
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

      {/* Built-word slots — one per expected letter, tappable to
          send a letter back to the tray.
          dir="ltr" is REQUIRED — English letters spell out left-to-
          right.  Without it, a Hebrew-UI student sees the slots
          mirrored and ends up tapping letters in the wrong order. */}
      <div dir="ltr" className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-5">
        {renderSlots()}
      </div>

      {/* Hidden input keeps form-submit handler compatible — the
          parent reads spellingInput for answer matching. */}
      <input type="hidden" name="answer" value={spellingInput} readOnly />

      {/* Letter tile tray — tap a tile to place it in the next slot.
          Used tiles dim and become non-interactive.
          dir="ltr" so the scrambled letters render in their array
          order regardless of UI language — RTL inheritance was
          flipping the row in Hebrew, so a teacher / kid saw e.g.
          "REHTONA" instead of the same shuffle as everyone else. */}
      <div dir="ltr" className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-5 sm:mb-6">
        <AnimatePresence>
          {trayLetters.map((letter, idx) => {
            const used = usedTileIndexes.includes(idx);
            return (
              <motion.button
                key={`${idx}-${letter}`}
                type="button"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: used ? 0.25 : 1, y: 0, scale: used ? 0.92 : 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                whileTap={!used && !isLocked ? { scale: 0.9 } : undefined}
                onClick={() => handleTileTap(idx)}
                disabled={used || isLocked || isFull}
                aria-label={`Place letter ${letter}`}
                className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 font-black text-2xl sm:text-3xl uppercase shadow-md transition-shadow ${
                  used
                    ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed"
                    : themed
                      ? "bg-white border-indigo-300 text-indigo-700 hover:shadow-lg active:shadow-sm"
                      : "bg-white border-stone-300 text-stone-700 hover:shadow-lg"
                }`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {letter.toUpperCase()}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {feedback === "show-answer" && (
        <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-4" />
      )}

      {/* Action row — Backspace + Clear + Check.  Backspace is the
          fastest "I tapped wrong" recovery; Clear nukes the whole
          built word; Check submits.  All three sit on a single row
          so the kid never has to scroll between tapping tiles and
          submitting. */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleClearLast}
          disabled={isLocked || usedTileIndexes.length === 0}
          aria-label="Remove last letter"
          className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <Delete size={22} />
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={isLocked || usedTileIndexes.length === 0}
          className="flex-shrink-0 px-3 sm:px-4 h-12 sm:h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-black text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.clear}
        </button>
        <button
          type="submit"
          disabled={!!feedback || !isFull}
          className={`flex-1 h-12 sm:h-14 rounded-2xl font-black text-lg sm:text-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            themed
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:shadow-xl"
              : "bg-stone-900 text-white hover:bg-black"
          }`}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.checkAnswer}
        </button>
      </div>
    </form>
  );
}
