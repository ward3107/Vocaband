import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";

interface FlashcardsGameProps {
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessingRef: React.MutableRefObject<boolean>;
  onAnswer: (gotIt: boolean) => void;
}

export default function FlashcardsGame({
  isFlipped, setIsFlipped, isProcessingRef, onAnswer,
}: FlashcardsGameProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  return (
    <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
      <button
        onClick={() => !isProcessingRef.current && setIsFlipped(!isFlipped)}
        disabled={isProcessingRef.current}
        className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isFlipped ? t.showEnglish : t.showTranslation}
      </button>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onAnswer(false)}
          onTouchStart={(e) => { if (!isProcessingRef.current) e.currentTarget.click(); }}
          disabled={isProcessingRef.current}
          style={{ touchAction: 'manipulation', minHeight: '56px' }}
          className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >{t.stillLearning}</button>
        <button
          onClick={() => onAnswer(true)}
          onTouchStart={(e) => { if (!isProcessingRef.current) e.currentTarget.click(); }}
          disabled={isProcessingRef.current}
          style={{ touchAction: 'manipulation', minHeight: '56px' }}
          className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >{t.gotIt}</button>
      </div>
    </div>
  );
}
