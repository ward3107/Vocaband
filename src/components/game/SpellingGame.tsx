import { ShowAnswerFeedback } from "../ShowAnswerFeedback";
import type { Word } from "../../data/vocabulary";

interface SpellingGameProps {
  currentWord: Word | undefined;
  gameMode: string;
  targetLanguage: "hebrew" | "arabic";
  feedback: "correct" | "wrong" | "show-answer" | null;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  onSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function SpellingGame({
  currentWord, gameMode, targetLanguage, feedback,
  spellingInput, setSpellingInput, onSpellingSubmit,
}: SpellingGameProps) {
  return (
    <form onSubmit={onSpellingSubmit} className="max-w-md mx-auto">
      <input
        autoFocus
        type="text"
        id="spelling-answer"
        name="answer"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={spellingInput}
        onChange={(e) => setSpellingInput(e.target.value)}
        disabled={feedback === "show-answer" || feedback === "correct"}
        placeholder="Type in English..."
        className={`w-full p-3 sm:p-6 text-base sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
          feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
          feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
          feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
          "border-stone-100 focus:border-stone-900 outline-none"
        }`}
      />
      {gameMode === "spelling" && (
        <p className="text-stone-400 font-bold mb-3 sm:mb-6 text-base sm:text-lg">
          Translation: <span className="text-stone-900 text-xl sm:text-2xl" dir="auto">
            {currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew}
          </span>
        </p>
      )}
      {feedback === "show-answer" && (
        <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-4" />
      )}
      <button
        type="submit"
        disabled={!!feedback}
        className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >Check Answer</button>
    </form>
  );
}
