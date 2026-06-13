import React from "react";
import { getGameDebugger } from "../utils/gameDebug";
import type { Word } from "../data/vocabulary";
import { getThemeColors, type GameThemeColor } from "./game/GameShell";

/**
 * Phase-2 mobile-first bump (2026-04-30):
 *   - Mobile tap target: 56px → 88px (well above the 44px iOS Apple
 *     guideline; matches the bigger fingers of grade-4 kids tapping
 *     in landscape mode).
 *   - Mobile text scale: text-sm → text-xl, then sm:text-2xl on
 *     desktop.  Smooths the previous 8x jump that left mobile
 *     labels nearly unreadable next to large desktop ones.
 *   - Padding: py-3 px-3 → py-5 px-5 on mobile.
 *   - Optional `themeColor` prop — when provided (e.g. by Classic's
 *     redesign), the resting state gains a subtle theme-coloured
 *     border/hover instead of the generic stone palette.  Idle
 *     state without a theme still uses the original stone styling
 *     so any caller that hasn't been migrated yet stays unchanged.
 */
const AnswerOptionButton = React.memo(({ option, currentWordId, feedback, gameMode, targetLanguage, onAnswer, themeColor, shortcutKey, showKeyHint }: {
  option: Word;
  currentWordId: number;
  feedback: string | null;
  gameMode: string;
  targetLanguage: "hebrew" | "arabic";
  onAnswer: (w: Word) => void;
  themeColor?: GameThemeColor;
  /** 1-based number key (1–4) that selects this option on a physical
   *  keyboard (Chromebooks — open-issues §F). Drives aria-keyshortcuts
   *  unconditionally; the visible badge below is opt-in. */
  shortcutKey?: number;
  /** Reveal the on-button number badge — only flipped on after the
   *  first hardware keypress so touch-only phones never see it. */
  showKeyHint?: boolean;
}) => {
  const isCorrect = option.id === currentWordId;
  const showCorrect = feedback === "correct" && isCorrect;
  const showAnswer = feedback === "show-answer" && isCorrect;
  const isDisabled = !!feedback; // Disable on ANY feedback (correct, wrong, or show-answer)

  const handleClick = () => {
    const gameDebug = getGameDebugger();
    gameDebug.logButtonClick({
      button: 'answer_option',
      gameMode,
      wordId: currentWordId,
      disabled: isDisabled,
      feedback,
    });
    if (!isDisabled) {
      onAnswer(option);
    } else {
      console.warn('[AnswerButton] Click blocked - button is disabled', { feedback, isDisabled });
    }
  };

  // Idle (no feedback) styling — themed if a theme is supplied, else
  // the original stone palette so non-migrated callers see no change.
  // Compose from pre-resolved literal class strings in THEME_TABLE so
  // Tailwind JIT can detect them.
  const idleClass = themeColor
    ? (() => {
        const c = getThemeColors(themeColor);
        return `bg-white text-stone-900 border-2 ${c.border} ${c.hoverBg} shadow-sm`;
      })()
    : "bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300";

  // Resolve which string we'll actually render and what direction
  // it should flow in.  Two modes always show the English vocab
  // word (`reverse` and `fill-blank`); for everything else we show
  // the Hebrew/Arabic translation, but FALL BACK to English when a
  // custom word lacks a translation — and English text in an HE/AR
  // RTL container must still flow LTR.  Detect the fallback case
  // and force `dir="ltr"` whenever we end up rendering English.
  const showsEnglish = gameMode === "reverse" || gameMode === "fill-blank";
  const translation = option[targetLanguage] || option.arabic || option.hebrew;
  const renderedText = showsEnglish ? option.english : (translation || option.english);
  const fallsBackToEnglish = !showsEnglish && !translation;
  const optionDir = showsEnglish || fallsBackToEnglish ? "ltr" : "auto";

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      dir={optionDir}
      aria-keyshortcuts={shortcutKey ? String(shortcutKey) : undefined}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`relative py-5 px-5 sm:py-6 sm:px-8 lg:py-7 lg:px-10 rounded-xl sm:rounded-2xl text-xl sm:text-2xl lg:text-3xl font-bold motion-safe:transition-all duration-300 min-h-[88px] sm:min-h-[80px] lg:min-h-[96px] flex items-center justify-center gap-2 ${
        showCorrect
          ? "bg-blue-600 text-white motion-safe:scale-105 shadow-xl"
          : feedback === "wrong" && !isCorrect
          ? "bg-rose-100 text-rose-500 opacity-50"
          : showAnswer
          ? "bg-amber-500 text-white motion-safe:scale-105 shadow-xl ring-4 ring-amber-300"
          : feedback === "show-answer"
          ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
          : feedback === "wrong"
          ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
          : idleClass
      }`}
    >
      {/* Number-key badge — corner placement uses a logical inset so it
          stays in the grid's top-left (the options grid is pinned LTR by
          ClassicModeGame, so top-1.5 start-1.5 reads consistently). */}
      {showKeyHint && shortcutKey != null && (
        <kbd
          aria-hidden="true"
          className="absolute top-1.5 start-1.5 min-w-[1.25rem] px-1 py-0.5 rounded-md bg-stone-200/80 text-stone-500 text-[10px] font-black leading-none"
        >
          {shortcutKey}
        </kbd>
      )}
      {showCorrect && <span aria-hidden="true">✓</span>}
      {showAnswer && <span aria-hidden="true">→</span>}
      <span>{renderedText}</span>
    </button>
  );
});

AnswerOptionButton.displayName = "AnswerOptionButton";

export default AnswerOptionButton;
