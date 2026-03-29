import React from "react";

interface ShowAnswerFeedbackProps {
  answer: string;
  dir?: "ltr" | "auto";
  className?: string;
}

/**
 * Displays the correct answer when student fails after max attempts.
 * Extracted to eliminate duplication across letter-sounds and spelling modes.
 */
export const ShowAnswerFeedback: React.FC<ShowAnswerFeedbackProps> = ({ answer, dir = "ltr", className = "" }) => {
  return (
    <div className={`bg-amber-100 border-4 border-amber-500 px-4 py-3 rounded-2xl animate-pulse ${className}`}>
      <p className="text-amber-900 font-black text-sm sm:text-base">The correct answer is:</p>
      <p className="text-amber-950 font-black text-xl sm:text-2xl md:text-3xl mt-1" dir={dir}>{answer}</p>
    </div>
  );
};
