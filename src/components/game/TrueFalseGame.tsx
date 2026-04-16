import type { Word } from "../../data/vocabulary";

interface TrueFalseGameProps {
  tfOption: Word | null;
  targetLanguage: "hebrew" | "arabic";
  feedback: "correct" | "wrong" | "show-answer" | null;
  onAnswer: (isTrue: boolean) => void;
}

export default function TrueFalseGame({ tfOption, targetLanguage, feedback, onAnswer }: TrueFalseGameProps) {
  const handleTap = (isTrue: boolean) => () => {
    if (feedback) return;
    onAnswer(isTrue);
  };

  return (
    <div className="max-w-lg mx-auto px-4">
      <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-6 sm:p-10 rounded-3xl mb-4 sm:mb-6 shadow-sm border border-stone-200">
        <p className="text-3xl sm:text-5xl font-black text-stone-800 text-center" dir="auto">
          {tfOption?.[targetLanguage] || tfOption?.arabic || tfOption?.hebrew}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={handleTap(true)}
          disabled={!!feedback}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '64px' }}
          className="py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          True ✓
        </button>
        <button
          type="button"
          onClick={handleTap(false)}
          disabled={!!feedback}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '64px' }}
          className="py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          False ✗
        </button>
      </div>
    </div>
  );
}
