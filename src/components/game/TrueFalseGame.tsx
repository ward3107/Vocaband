import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "./GameShell";

interface TrueFalseGameProps {
  tfOption: Word | null;
  targetLanguage: "hebrew" | "arabic";
  feedback: "correct" | "wrong" | "show-answer" | null;
  onAnswer: (isTrue: boolean) => void;
  /** Phase-3 theme — drives the candidate-card hero tint.  The
   *  True/False BUTTONS keep their own emerald (true) ↔ rose (false)
   *  binary palette regardless, since paired colours read fastest
   *  for binary judgement.  Theme only affects the prompt card. */
  themeColor?: GameThemeColor;
}

/**
 * Phase-3b redesign (2026-04-30):
 *   - Big "TRUE OR FALSE?" question label above the candidate card.
 *   - Hero candidate-translation card: bigger text (text-4xl → text-6xl),
 *     soft theme-tinted background, dramatic shadow.
 *   - Two even-bigger gradient buttons with bouncing emoji glyphs.
 *   - Touch-swipe gesture: swipe right anywhere on the card → True,
 *     swipe left → False.  Threshold = 80px horizontal delta with
 *     less than 60px vertical movement, so vertical scrolls aren't
 *     misread.  Tap-the-button still works exactly as before.
 *   - Subtle hint copy below the buttons telling kids they can swipe.
 */
export default function TrueFalseGame({
  tfOption, targetLanguage, feedback, onAnswer, themeColor,
}: TrueFalseGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const themed = themeColor ? getThemeColors(themeColor) : null;
  const [swiping, setSwiping] = useState<null | "left" | "right">(null);

  const handleTap = (isTrue: boolean) => () => {
    if (feedback) return;
    onAnswer(isTrue);
  };

  // Touch-swipe gesture support — kids swipe instead of aiming.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (feedback) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, [feedback]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (feedback || !touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 30 || Math.abs(dy) > 60) {
      setSwiping(null);
      return;
    }
    setSwiping(dx > 0 ? "right" : "left");
  }, [feedback]);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (feedback || !touchStartRef.current) {
      setSwiping(null);
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    setSwiping(null);
    if (Math.abs(dx) >= 80 && Math.abs(dy) < 60) {
      onAnswer(dx > 0); // right=true, left=false
    }
  }, [feedback, onAnswer]);

  return (
    <div
      className="max-w-lg mx-auto px-4 select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* "Is this the right translation?" question label */}
      <p className="text-center text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-stone-500 mb-3 sm:mb-4">
        {t.isThisTrue}
      </p>

      {/* Hero candidate card — bigger, theme-tinted, with swipe-tilt */}
      <motion.div
        animate={{
          rotate: swiping === "right" ? 4 : swiping === "left" ? -4 : 0,
          x: swiping === "right" ? 12 : swiping === "left" ? -12 : 0,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={`p-6 sm:p-10 rounded-3xl mb-5 sm:mb-7 shadow-xl border-2 ${
          themed
            ? `${themed.cardBg} ${themed.border}`
            : "bg-gradient-to-br from-stone-50 to-stone-100 border-stone-200"
        }`}
      >
        <p
          className="text-4xl sm:text-6xl font-black text-stone-900 text-center break-words"
          dir="auto"
        >
          {tfOption?.[targetLanguage] || tfOption?.arabic || tfOption?.hebrew}
        </p>
      </motion.div>

      {/* Two giant binary buttons.  Order on the page: False (left,
          rose) ← → True (right, emerald) — matches the swipe-direction
          mapping (swipe right = True, swipe left = False) so the
          kid's hand muscle-memory aligns with the visual position. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={handleTap(false)}
          disabled={!!feedback}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '96px' }}
          className="py-7 sm:py-10 rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-xl hover:shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
        >
          <span className="text-3xl sm:text-4xl">✗</span>
          <span>{t.falseLabel}</span>
        </button>
        <button
          type="button"
          onClick={handleTap(true)}
          disabled={!!feedback}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '96px' }}
          className="py-7 sm:py-10 rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl hover:shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
        >
          <span className="text-3xl sm:text-4xl">✓</span>
          <span>{t.trueLabel}</span>
        </button>
      </div>

      {/* Swipe hint — only shown when we haven't received feedback,
          and only on touch devices (the @media (hover: none) class
          hides it on mouse-driven desktops where swipe is awkward). */}
      {!feedback && (
        <p className="text-center text-[11px] sm:text-xs font-semibold text-stone-400 mt-4 hidden [@media(hover:none)]:block">
          {t.swipeHint}
        </p>
      )}
    </div>
  );
}
