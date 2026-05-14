import { motion, AnimatePresence } from "framer-motion";
import { Volume2, X } from "lucide-react";
import type { AssignmentData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { gameAriasT } from "../../locales/student/game-arias";
import { getThemeColors, type GameThemeColor } from "./GameShell";

interface SentenceBuilderGameProps {
  activeAssignment: AssignmentData | null;
  sentenceIndex: number;
  sentenceFeedback: "correct" | "wrong" | null;
  builtSentence: string[];
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  availableWords: string[];
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  onSentenceWordTap: (word: string, isFromAvailable: boolean) => void;
  onSentenceCheck: () => void;
  speak: (text: string) => void;
  shuffle: <T>(arr: T[]) => T[];
  /** Phase-3h theme — teal. */
  themeColor?: GameThemeColor;
}

/**
 * Phase-3h redesign (2026-04-30):
 *
 * Sentence Builder gets a real visual identity instead of the
 * generic stone/blue chip layout.  The mode is auditory-prompt:
 * the kid taps 🔊, hears a sentence, then assembles it from a
 * pool of word tiles.
 *
 * Layout (top → bottom on mobile):
 *   - LISTEN HERO — big teal-tinted card with a giant Volume2
 *     button.  This is THE prompt — without listening, the kid
 *     has nothing.  Old layout buried this in a 16px speaker icon
 *     next to the sentence-counter text; kids missed it.
 *   - BUILT-SENTENCE CANVAS — centred, min 96px tall (room for two
 *     lines of tiles), teal-tinted border that pulses to emerald
 *     on correct or rose on wrong.  Empty state shows a faint
 *     "tap words below" hint.  Each placed word is a tappable
 *     teal pill — tap to remove.
 *   - WORD BANK — flex-wrap row of bigger tappable tiles.
 *     min-h-[44px] tap targets, hover lifts a pixel for tactile
 *     feedback on desktop.
 *   - ACTION ROW — Clear (small ghost) + Check (big teal→emerald
 *     gradient, primary).
 *
 * The shuffle prop is no longer used — the Clear handler now just
 * pushes built words back to the bank without re-shuffling, which
 * was the existing fix for "Clear scrambled the unrelated words"
 * complaints.  Prop kept on the interface for compat.
 */
export default function SentenceBuilderGame({
  activeAssignment, sentenceIndex, sentenceFeedback,
  builtSentence, setBuiltSentence, availableWords, setAvailableWords,
  onSentenceWordTap, onSentenceCheck, speak,
  themeColor,
}: SentenceBuilderGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const tAria = gameAriasT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  const sentences = (activeAssignment as AssignmentData & { sentences?: string[] })?.sentences?.filter(s => s.trim()) || [];

  if (sentences.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-stone-400 text-lg">No sentences were added to this assignment.</p>
        <p className="text-stone-400 text-sm mt-2">Ask your teacher to add sentences.</p>
      </div>
    );
  }

  const isLocked = sentenceFeedback !== null;
  const canvasBorderClass =
    sentenceFeedback === "correct"
      ? "border-emerald-500 bg-emerald-50"
      : sentenceFeedback === "wrong"
        ? "border-rose-500 bg-rose-50"
        : themed
          ? `${themed.border} ${themed.cardBg}`
          : "border-stone-200 bg-stone-50";

  return (
    <div className="max-w-xl mx-auto px-2 space-y-4 sm:space-y-5">
      {/* Listen hero — the prompt is AUDIO ONLY, so the speaker
          button has to be unmissable.  Big teal card, huge tap
          target, sentence counter sits below as supporting text. */}
      <div
        className={`rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-3 shadow-sm ${
          themed ? `${themed.cardBg} border-2 ${themed.border}` : "bg-stone-50 border-2 border-stone-200"
        }`}
      >
        <button
          type="button"
          onClick={() => speak(sentences[sentenceIndex])}
          aria-label={tAria.listenToSentence}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-md active:scale-90 transition-transform flex items-center justify-center ${
            themed ? `${themed.pillBg}` : "bg-white"
          }`}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <Volume2 size={40} className={themed ? themed.pillText : "text-stone-700"} />
        </button>
        <p className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] ${themed ? themed.pillText : "text-stone-500"}`}>
          Sentence {sentenceIndex + 1} / {sentences.length}
        </p>
      </div>

      {/* Built-sentence canvas — where the kid assembles.  Min
          height = ~2 lines of tiles so the layout doesn't reflow
          every time a word is added.  Tap a built tile to remove
          it (sends it back to the word bank).
          dir="ltr" — the sentence is English, builds left-to-right.
          Without this, Hebrew UI flipped the word order, and a kid
          who tapped "She / is / happy" saw "happy / is / She". */}
      <div
        dir="ltr"
        className={`min-h-[96px] sm:min-h-[112px] border-2 rounded-3xl p-3 sm:p-4 flex flex-wrap gap-2 items-center justify-center transition-colors ${canvasBorderClass}`}
      >
        {builtSentence.length === 0 && (
          <span className="text-stone-400 text-sm sm:text-base italic w-full text-center">
            Tap words below to build the sentence
          </span>
        )}
        <AnimatePresence>
          {builtSentence.map((word, i) => (
            <motion.button
              key={`built-${i}-${word}`}
              type="button"
              initial={{ opacity: 0, scale: 0.8, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              whileTap={!isLocked ? { scale: 0.95 } : undefined}
              onClick={() => !isLocked && onSentenceWordTap(word, false)}
              disabled={isLocked}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-black text-base sm:text-lg shadow-md flex items-center gap-1.5 ${
                themed
                  ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"
                  : "bg-blue-600 text-white"
              } ${isLocked ? "opacity-80 cursor-default" : "active:shadow-sm"}`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <span>{word}</span>
              {!isLocked && <X size={14} className="opacity-70" />}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Word bank — the kid's pool of available words.  Bigger
          tiles than before (px-4 py-2 vs px-3 py-1.5), 44px min
          tap target, theme-tinted hover state.
          dir="ltr" matches the builder canvas above — keeps the
          shuffled tiles in their array order in any locale. */}
      <div dir="ltr" className="flex flex-wrap gap-2 sm:gap-2.5 justify-center min-h-[60px]">
        <AnimatePresence>
          {availableWords.map((word, i) => (
            <motion.button
              key={`bank-${i}-${word}`}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              whileTap={!isLocked ? { scale: 0.95 } : undefined}
              onClick={() => !isLocked && onSentenceWordTap(word, true)}
              disabled={isLocked}
              className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl font-black text-base sm:text-lg bg-white border-2 shadow-sm transition-all ${
                themed
                  ? "border-teal-200 text-stone-800 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700"
                  : "border-stone-200 text-stone-800 hover:border-blue-400 hover:text-blue-700"
              } ${isLocked ? "opacity-50 cursor-not-allowed" : "active:shadow-none"}`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", minHeight: "44px" }}
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Action row — Clear (ghost) + Check (primary teal gradient). */}
      <div className="flex items-center gap-2 sm:gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            // Push built words back to the bank — preserve the
            // bank's existing order and append, which keeps the
            // kid's mental map of "where the words live" intact
            // instead of re-shuffling the whole thing.
            setAvailableWords((prev) => [...prev, ...builtSentence]);
            setBuiltSentence([]);
          }}
          disabled={isLocked || builtSentence.length === 0}
          className="flex-shrink-0 px-4 sm:px-5 h-12 sm:h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-black text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.clear}
        </button>
        <button
          type="button"
          onClick={onSentenceCheck}
          disabled={builtSentence.length === 0 || isLocked}
          className={`flex-1 h-12 sm:h-14 rounded-2xl font-black text-lg sm:text-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            themed
              ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white hover:shadow-xl"
              : "bg-stone-900 text-white hover:bg-black"
          }`}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.checkSentence}
        </button>
      </div>
    </div>
  );
}
