import type { Word } from "../../data/vocabulary";

interface TrueFalseGameProps {
  tfOption: Word | null;
  targetLanguage: "hebrew" | "arabic";
  feedback: "correct" | "wrong" | "show-answer" | null;
  onAnswer: (isTrue: boolean) => void;
}

export default function TrueFalseGame({ tfOption, targetLanguage, feedback, onAnswer }: TrueFalseGameProps) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-stone-100 p-3 sm:p-8 rounded-2xl sm:rounded-3xl mb-2 sm:mb-6">
        <p className="text-2xl sm:text-4xl font-black text-stone-800" dir="auto">
          {tfOption?.[targetLanguage] || tfOption?.arabic || tfOption?.hebrew}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <button
          onClick={() => onAnswer(true)}
          onTouchStart={(e) => { if (!feedback) e.currentTarget.click(); }}
          disabled={!!feedback}
          style={{ touchAction: 'manipulation', minHeight: '60px' }}
          className="py-5 sm:py-8 rounded-2xl sm:rounded-3xl text-xl sm:text-3xl font-black bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >True ✓</button>
        <button
          onClick={() => onAnswer(false)}
          onTouchStart={(e) => { if (!feedback) e.currentTarget.click(); }}
          disabled={!!feedback}
          style={{ touchAction: 'manipulation', minHeight: '60px' }}
          className="py-5 sm:py-8 rounded-2xl sm:rounded-3xl text-xl sm:text-3xl font-black bg-rose-100 text-rose-700 hover:bg-rose-200 active:bg-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >False ✗</button>
      </div>
    </div>
  );
}
