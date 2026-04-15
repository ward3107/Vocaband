import React from "react";
import { getGameDebugger } from "../utils/gameDebug";
import type { Word } from "../data/vocabulary";

const AnswerOptionButton = React.memo(({ option, currentWordId, feedback, gameMode, targetLanguage, onAnswer }: {
  option: Word; currentWordId: number; feedback: string | null; gameMode: string; targetLanguage: "hebrew" | "arabic"; onAnswer: (w: Word) => void;
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

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      dir={gameMode === "reverse" ? "ltr" : "auto"}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${
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
