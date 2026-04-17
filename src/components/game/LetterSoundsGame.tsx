import { LETTER_COLORS } from "../../constants/game";
import { ShowAnswerFeedback } from "../ShowAnswerFeedback";
import { cleanWordForDisplay } from "../../utils/answerMatch";
import type { Word } from "../../data/vocabulary";

interface LetterSoundsGameProps {
  currentWord: Word | undefined;
  targetLanguage: "hebrew" | "arabic";
  revealedLetters: number;
  spellingInput: string;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  feedback: "correct" | "wrong" | "show-answer" | null;
  onSpellingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function LetterSoundsGame({
  currentWord, targetLanguage, revealedLetters,
  spellingInput, setSpellingInput, feedback, onSpellingSubmit,
}: LetterSoundsGameProps) {
  return (
    <div className="max-w-lg mx-auto">
      <p className="text-stone-600 text-lg sm:text-xl font-bold mb-4 text-center" dir="auto">
        {currentWord?.[targetLanguage]}
      </p>
      <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6">
        {cleanWordForDisplay(currentWord?.english || "").split(" ").map((word, wordIdx, allWords) => {
          let charOffset = 0;
          for (let j = 0; j < wordIdx; j++) charOffset += allWords[j].length + 1;
          return (
            <div key={wordIdx} className="flex justify-center gap-1 sm:gap-2">
              {word.split("").map((letter, i) => {
                const globalIdx = charOffset + i;
                const revealed = globalIdx < revealedLetters;
                const color = LETTER_COLORS[globalIdx % LETTER_COLORS.length];
                return (
                  <div
                    key={globalIdx}
                    className="w-9 h-11 sm:w-12 sm:h-14 rounded-xl font-black text-base sm:text-2xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0 transition-all duration-300"
                    style={{
                      color: revealed ? color : color + "40",
                      borderColor: revealed ? color : color + "40",
                      background: color + "18",
                      opacity: revealed ? 1 : 0.15,
                      transform: revealed ? "scale(1)" : "scale(0.5)",
                    }}
                  >
                    {revealed ? (letter ?? "").toUpperCase() : "?"}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {revealedLetters >= (cleanWordForDisplay(currentWord?.english || "").length || 99) && (
        <form onSubmit={onSpellingSubmit} className="max-w-sm mx-auto">
          <input
            autoFocus
            type="text"
            value={spellingInput}
            onChange={(e) => setSpellingInput(e.target.value)}
            disabled={feedback === "show-answer" || feedback === "correct"}
            placeholder="Type the word..."
            className={`w-full p-3 text-xl font-black text-center border-4 rounded-2xl mb-3 transition-all ${
              feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
              feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
              feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
              "border-stone-100 focus:border-stone-900 outline-none"
            }`}
          />
          {feedback === "show-answer" && (
            <ShowAnswerFeedback answer={cleanWordForDisplay(currentWord?.english || "")} dir="ltr" className="mb-3" />
          )}
          <button
            type="submit"
            disabled={!!feedback}
            className="w-full py-3 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >Check Answer</button>
        </form>
      )}
    </div>
  );
}
