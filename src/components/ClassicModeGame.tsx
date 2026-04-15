import React from "react";
import type { Word } from "../data/vocabulary";
import AnswerOptionButton from "./AnswerOptionButton";

// Memoized Classic Mode Game component with debugging and error handling
const ClassicModeGame = React.memo(({ gameMode, currentWord, options, hiddenOptions, feedback, targetLanguage, gameWordsCount, currentIndex, onAnswer }: {
  gameMode: string;
  currentWord: Word | undefined;
  options: Word[];
  hiddenOptions: number[];
  feedback: string | null;
  targetLanguage: "hebrew" | "arabic";
  gameWordsCount: number;
  currentIndex: number;
  onAnswer: (w: Word) => void;
}) => {
  // Handle error cases
  if (!currentWord) {
    console.error('[Classic Mode ERROR] No currentWord!', { gameMode, currentIndex, gameWordsCount });
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl">
        <p className="text-red-600 font-black">⚠️ Error: No word loaded</p>
        <p className="text-sm text-red-500 mt-2">Please try selecting another mode or refreshing the page</p>
      </div>
    );
  }

  if (options.length === 0) {
    console.error('[Classic Mode ERROR] No options!', { currentWordId: currentWord.id, gameWordsCount });
    return (
      <div className="text-center p-8 bg-amber-50 rounded-2xl">
        <p className="text-amber-600 font-black">⚠️ Error: No answer options available</p>
        <p className="text-sm text-amber-500 mt-2">You need at least 4 words in the assignment for this mode to work</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
      {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
        <AnswerOptionButton key={option.id} option={option} currentWordId={currentWord.id} feedback={feedback} gameMode={gameMode} targetLanguage={targetLanguage} onAnswer={onAnswer} />
      ))}
    </div>
  );
});

ClassicModeGame.displayName = 'ClassicModeGame';

export default ClassicModeGame;
