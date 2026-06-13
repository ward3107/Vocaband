/**
 * SkipQuestionButton — shared "I don't know this one" action for every
 * per-question exercise in the worksheet runner.
 *
 * Pattern: each exercise that walks a student through questions one at
 * a time (Quiz, FillBlank, LetterScramble, …) renders this button next
 * to or below the answer area.  Tapping it records a blank / wrong
 * answer for the current word and advances to the next question — same
 * effect as picking the wrong choice, minus the negative-reveal pause.
 *
 * Score model (per the feature spec):
 *   • Skipped question counts as 0 in the final score (no credit).
 *   • Total stays at `order.length` so the kid + teacher see "5 / 10"
 *     when 5 were right and the rest were skipped or wrong.
 *   • Skip is one-way — the question isn't re-queued at the end.
 *
 * The button is muted by default so it doesn't compete with the
 * primary answer affordance; it brightens on hover.  Disabled while
 * a reveal is in flight (the parent passes `disabled` then) so
 * double-taps during the 800ms post-answer pause are ignored.
 */
import type { FC } from 'react';
import { SkipForward } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

const SKIP_LABEL: Record<string, string> = {
  en: "Skip question",
  he: "דלג על השאלה",
  ar: "تخطّ السؤال",
};

interface Props {
  onSkip: () => void;
  /** Set during the reveal pause (answer picked, waiting to advance)
   *  so the kid can't fire Skip on top of an in-flight answer. */
  disabled?: boolean;
  /** Optional className for fine-tuning placement at the call site. */
  className?: string;
}

export const SkipQuestionButton: FC<Props> = ({
  onSkip,
  disabled,
  className,
}) => {
  const { language } = useLanguage();
  const label = SKIP_LABEL[language] ?? SKIP_LABEL.en;
  return (
    <button
      type="button"
      onClick={onSkip}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors text-stone-500 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed ${className ?? ""}`}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <SkipForward size={14} />
      {label}
    </button>
  );
};

export default SkipQuestionButton;
