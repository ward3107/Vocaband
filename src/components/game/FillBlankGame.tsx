import React from "react";
import type { Word } from "../../data/vocabulary";
import type { AssignmentData } from "../../core/supabase";
import AnswerOptionButton from "../AnswerOptionButton";
import { getThemeColors, type GameThemeColor } from "./GameShell";
import { useLanguage } from "../../hooks/useLanguage";

interface FillBlankGameProps {
  activeAssignment: AssignmentData | null;
  currentWord: Word | undefined;
  currentIndex: number;
  options: Word[];
  hiddenOptions: number[];
  feedback: "correct" | "wrong" | "show-answer" | null;
  gameWordsCount: number;
  onAnswer: (w: Word) => void;
  /** Phase-3i theme -- lime.  Drives the sentence-card hero tint
   *  and the AnswerOptionButton accents.  The blank slot is always
   *  lime-bordered regardless (it's the mode signature). */
  themeColor?: GameThemeColor;
}

// Replace the target word in the sentence with a sentinel so the
// student has to recognise it from context.  Three-step fallback
// because teacher-edited sentences (or unusual AI outputs) can
// drift from the canonical form:
//   1. Whole-word, case-insensitive regex -- handles the common case.
//   2. Substring replace -- handles inflected forms ("ran"/"run").
//   3. Append the sentinel to the verbatim sentence so the round
//      stays playable instead of giving the answer away.
//
// Phase 3i uses a token sentinel instead of inline underscores so
// we can split around it without false-positives (sentences
// occasionally contain underscores or em-dashes from AI output).
const BLANK_SENTINEL = "@@BLANK@@";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactSentence(sentence: string, target: string): string {
  if (!sentence || !target) return sentence || BLANK_SENTINEL;
  const wordBoundary = new RegExp(`\\b${escapeRegExp(target)}\\b`, "i");
  if (wordBoundary.test(sentence)) {
    return sentence.replace(wordBoundary, BLANK_SENTINEL);
  }
  const idx = sentence.toLowerCase().indexOf(target.toLowerCase());
  if (idx >= 0) {
    return sentence.slice(0, idx) + BLANK_SENTINEL + sentence.slice(idx + target.length);
  }
  return `${sentence} ${BLANK_SENTINEL}`;
}

/**
 * Phase-3i redesign (2026-04-30):
 *
 * The blank used to render as inline "_____" underscores ("the cat
 * _____ on the mat") which kids' eyes skipped right over.  Now the
 * redacted sentence is split around the sentinel and the blank
 * itself is rendered as a visible LIME-BORDERED SLOT BOX inline
 * with the text -- same line-height as the surrounding text but
 * visually distinct (white bg, dashed lime border, big "?" glyph).
 * The kid's eye lands on the slot instantly.
 *
 * Layout:
 *   - Small sentence counter pill at the top.
 *   - HERO sentence card -- lime-tinted background + border,
 *     generous padding, large readable text.  The blank inside is
 *     a real slot.
 *   - 2x2 OPTION GRID -- AnswerOptionButton with the lime themeColor
 *     so the resting border + hover state pick up the mode palette.
 *
 * No audio control: speaking the sentence aloud would expose the
 * answer for any student who can match a sound to a word in the
 * option grid.
 */
const FillBlankGame = React.memo(({
  activeAssignment, currentWord, currentIndex,
  options, hiddenOptions, feedback,
  gameWordsCount, onAnswer, themeColor,
}: FillBlankGameProps) => {
  const { language } = useLanguage();
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

  if (!currentWord) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl">
        <p className="text-red-600 font-black">[!] Error: No word loaded</p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-center p-8 bg-amber-50 rounded-2xl">
        <p className="text-amber-600 font-black">[!] Error: No answer options available</p>
        <p className="text-sm text-amber-500 mt-2">You need at least 4 words in the assignment for this mode to work</p>
      </div>
    );
  }

  // Match each round's word to its sentence by index -- same word
  // index drives the gameplay, so word i <-> sentence i.  Wrap if
  // there are fewer sentences than words (teacher deleted some).
  const sentence = sentences[currentIndex % sentences.length] || "";
  const redacted = redactSentence(sentence, currentWord.english);

  // Split around the sentinel so we can render the blank as a
  // visible slot box.  Take the first occurrence only -- multiple
  // blanks are vanishingly rare and would just collapse to one
  // visual slot at position 0 (any leftover sentinels in the
  // before/after fragments are stripped out for safety).
  const sentinelIdx = redacted.indexOf(BLANK_SENTINEL);
  const before = (sentinelIdx >= 0 ? redacted.slice(0, sentinelIdx) : redacted).split(BLANK_SENTINEL).join(" ");
  const after = (sentinelIdx >= 0 ? redacted.slice(sentinelIdx + BLANK_SENTINEL.length) : "").split(BLANK_SENTINEL).join(" ");

  return (
    <div className="max-w-xl mx-auto px-2 space-y-4 sm:space-y-5">
      <p className="text-stone-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-center">
        Sentence {currentIndex + 1} / {gameWordsCount}
      </p>

      {/* Hero sentence card -- generous padding, theme-tinted, big
          readable text.  The blank is rendered inline as a slot
          box that sits on the same line as the surrounding text. */}
      <div
        className={`min-h-[100px] sm:min-h-[120px] rounded-3xl p-5 sm:p-7 text-lg sm:text-2xl font-bold text-stone-800 leading-relaxed text-center break-words ${
          themed
            ? `border-2 ${themed.border} ${themed.cardBg}`
            : "border-2 border-lime-200 bg-lime-50/60"
        }`}
      >
        <span>{before}</span>
        {sentinelIdx >= 0 && (
          <span
            className="inline-flex items-center justify-center align-middle min-w-[64px] sm:min-w-[88px] h-9 sm:h-12 px-3 sm:px-4 mx-1 sm:mx-1.5 rounded-xl border-2 border-dashed border-lime-500 bg-white text-lime-600 font-black text-xl sm:text-3xl"
            aria-label={language === 'he' ? 'מלא את החסר' : language === 'ar' ? 'املأ الفراغ' : 'Fill in the blank'}
          >
            ?
          </span>
        )}
        <span>{after}</span>
      </div>

      {/* 2x2 option grid.  AnswerOptionButton owns its own theme-
          tinted resting border, hover state, and feedback colours. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {options.filter(o => !hiddenOptions.includes(o.id)).map(option => (
          <AnswerOptionButton
            key={option.id}
            option={option}
            currentWordId={currentWord.id}
            feedback={feedback}
            gameMode="fill-blank"
            targetLanguage="hebrew"
            onAnswer={onAnswer}
            themeColor={themeColor}
          />
        ))}
      </div>
    </div>
  );
});

FillBlankGame.displayName = "FillBlankGame";

export default FillBlankGame;
