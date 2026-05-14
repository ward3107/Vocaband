import React from "react";
import type { Word } from "../data/vocabulary";
import AnswerOptionButton from "./AnswerOptionButton";
import type { GameThemeColor } from "./game/GameShell";
import { useLanguage } from "../hooks/useLanguage";

// Memoized Classic Mode Game component with debugging and error handling
const ClassicModeGame = React.memo(({ gameMode, currentWord, options, hiddenOptions, feedback, targetLanguage, gameWordsCount, currentIndex, onAnswer, themeColor }: {
  gameMode: string;
  currentWord: Word | undefined;
  options: Word[];
  hiddenOptions: number[];
  feedback: string | null;
  targetLanguage: "hebrew" | "arabic";
  gameWordsCount: number;
  currentIndex: number;
  onAnswer: (w: Word) => void;
  /** Phase-3 theme: when supplied, AnswerOptionButton's resting state
   *  picks up a theme-coloured border + hover.  Default undefined
   *  preserves the legacy stone palette for any caller that hasn't
   *  migrated yet. */
  themeColor?: GameThemeColor;
}) => {
  const { language } = useLanguage();
  const errLabels = language === 'he'
    ? { noWordTitle: '⚠️ שגיאה: לא נטענה מילה', noWordHelp: 'נסו לבחור מצב אחר או לרענן את הדף', noOptionsTitle: '⚠️ שגיאה: אין אפשרויות תשובה', noOptionsHelp: 'צריך לפחות 4 מילים במטלה כדי שהמצב הזה יעבוד' }
    : language === 'ar'
    ? { noWordTitle: '⚠️ خطأ: لم يتم تحميل أي كلمة', noWordHelp: 'حاول اختيار وضع آخر أو تحديث الصفحة', noOptionsTitle: '⚠️ خطأ: لا تتوفر خيارات إجابة', noOptionsHelp: 'تحتاج 4 كلمات على الأقل في المهمة ليعمل هذا الوضع' }
    : { noWordTitle: '⚠️ Error: No word loaded', noWordHelp: 'Please try selecting another mode or refreshing the page', noOptionsTitle: '⚠️ Error: No answer options available', noOptionsHelp: 'You need at least 4 words in the assignment for this mode to work' };
  // Handle error cases
  if (!currentWord) {
    console.error('[Classic Mode ERROR] No currentWord!', { gameMode, currentIndex, gameWordsCount });
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl">
        <p className="text-red-600 font-black">{errLabels.noWordTitle}</p>
        <p className="text-sm text-red-500 mt-2">{errLabels.noWordHelp}</p>
      </div>
    );
  }

  if (options.length === 0) {
    console.error('[Classic Mode ERROR] No options!', { currentWordId: currentWord.id, gameWordsCount });
    return (
      <div className="text-center p-8 bg-amber-50 rounded-2xl">
        <p className="text-amber-600 font-black">{errLabels.noOptionsTitle}</p>
        <p className="text-sm text-amber-500 mt-2">{errLabels.noOptionsHelp}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
        <AnswerOptionButton
          key={option.id}
          option={option}
          currentWordId={currentWord.id}
          feedback={feedback}
          gameMode={gameMode}
          targetLanguage={targetLanguage}
          onAnswer={onAnswer}
          themeColor={themeColor}
        />
      ))}
    </div>
  );
});

ClassicModeGame.displayName = 'ClassicModeGame';

export default ClassicModeGame;
