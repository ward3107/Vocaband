import React from "react";
import type { Word } from "../data/vocabulary";

const AnswerOptionButton = React.memo(({ option, currentWordId, feedback, gameMode, targetLanguage, onAnswer }: {
  option: Word; currentWordId: number; feedback: string | null; gameMode: string; targetLanguage: "hebrew" | "arabic"; onAnswer: (w: Word) => void;
}) => {
  const isCorrect = option.id === currentWordId;
  const showCorrect = feedback === "correct" && isCorrect;
  const showAnswer = feedback === "show-answer" && isCorrect;
  return (
    <button
      onClick={() => onAnswer(option)}
      disabled={feedback === "show-answer" || feedback === "correct"}
      dir={gameMode === "reverse" ? "ltr" : "auto"}
      className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${
        showCorrect
          ? "bg-blue-600 text-white motion-safe:scale-105 shadow-xl"
          : feedback === "wrong" && !isCorrect
          ? "bg-rose-100 text-rose-500 opacity-50"
          : showAnswer
          ? "bg-amber-500 text-white motion-safe:scale-105 shadow-xl ring-4 ring-amber-300"
          : feedback === "show-answer"
          ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
          : "bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300"
      }`}
    >
      {showCorrect && <span aria-hidden="true">✓</span>}
      {showAnswer && <span aria-hidden="true">→</span>}
      <span>{gameMode === "reverse" ? option.english : (option[targetLanguage] || option.arabic || option.hebrew || option.english)}</span>
    </button>
  );
});

AnswerOptionButton.displayName = "AnswerOptionButton";

export default AnswerOptionButton;
