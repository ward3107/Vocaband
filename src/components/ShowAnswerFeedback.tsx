import React from "react";
import { useLanguage } from "../hooks/useLanguage";
import { gameActiveT } from "../locales/student/game-active";

interface ShowAnswerFeedbackProps {
  answer: string | undefined;
  /** Direction for the answer text only.  Pass "ltr" whenever the
   *  rendered answer is an English vocab word (reverse, spelling,
   *  scramble, letter-sounds, fill-blank); pass "auto" only when it
   *  may be a Hebrew/Arabic translation. */
  dir?: "ltr" | "auto";
  className?: string;
}

/**
 * Displays the correct answer when student fails after max attempts.
 *
 * The outer container forces `dir="ltr"` so the (translated) "correct
 * answer is:" label and its trailing colon always read left-to-right
 * relative to the answer below.  The answer itself takes its `dir`
 * from the caller so HE/AR translations still render naturally when
 * the mode's answer is Hebrew/Arabic.
 */
export const ShowAnswerFeedback: React.FC<ShowAnswerFeedbackProps> = ({ answer, dir = "ltr", className = "" }) => {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  return (
    <div className={`bg-amber-100 border-4 border-amber-500 px-4 py-3 rounded-xl animate-pulse ${className}`}>
      <p className="text-amber-900 font-black text-sm sm:text-base">{t.correctAnswerIs}</p>
      <p className="text-amber-950 font-black text-xl sm:text-2xl md:text-3xl mt-1" dir={dir}>{answer}</p>
    </div>
  );
};
