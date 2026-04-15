import type { AssignmentData } from "../../core/supabase";

interface SentenceBuilderGameProps {
  activeAssignment: AssignmentData | null;
  sentenceIndex: number;
  sentenceFeedback: "correct" | "wrong" | null;
  builtSentence: string[];
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  availableWords: string[];
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  onSentenceWordTap: (word: string, isFromAvailable: boolean) => void;
  onSentenceCheck: () => void;
  speak: (text: string) => void;
  shuffle: <T>(arr: T[]) => T[];
}

export default function SentenceBuilderGame({
  activeAssignment, sentenceIndex, sentenceFeedback,
  builtSentence, setBuiltSentence, availableWords, setAvailableWords,
  onSentenceWordTap, onSentenceCheck, speak, shuffle,
}: SentenceBuilderGameProps) {
  const sentences = (activeAssignment as AssignmentData & { sentences?: string[] })?.sentences?.filter(s => s.trim()) || [];
  if (sentences.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-stone-400 text-lg">No sentences were added to this assignment.</p>
        <p className="text-stone-400 text-sm mt-2">Ask your teacher to add sentences.</p>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <p className="text-stone-400 text-xs font-bold uppercase">
          Sentence {sentenceIndex + 1} / {sentences.length}
        </p>
        <button
          onClick={() => speak(sentences[sentenceIndex])}
          className="text-blue-500 hover:text-blue-700 active:scale-90 transition-all"
          title="Listen to sentence"
        >🔊</button>
      </div>
      {/* Built sentence area */}
      <div className={`min-h-[60px] border-4 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center transition-colors ${
        sentenceFeedback === "correct" ? "border-blue-500 bg-blue-50" :
        sentenceFeedback === "wrong" ? "border-rose-500 bg-rose-50" :
        "border-stone-200 bg-stone-50"
      }`}>
        {builtSentence.length === 0 && (
          <span className="text-stone-300 text-sm italic w-full text-center">Tap words below to build the sentence</span>
        )}
        {builtSentence.map((word, i) => (
          <button
            key={i}
            onClick={() => sentenceFeedback === null && onSentenceWordTap(word, false)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
          >{word}</button>
        ))}
      </div>
      {/* Available words */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        {availableWords.map((word, i) => (
          <button
            key={i}
            onClick={() => sentenceFeedback === null && onSentenceWordTap(word, true)}
            className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-blue-400 hover:text-blue-700 active:scale-95 transition-all"
          >{word}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setBuiltSentence([]);
            setAvailableWords(shuffle(sentences[sentenceIndex].split(" ").filter(Boolean)));
          }}
          disabled={sentenceFeedback !== null}
          className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >Clear</button>
        <button
          onClick={onSentenceCheck}
          disabled={builtSentence.length === 0 || sentenceFeedback !== null}
          className="flex-2 py-2 px-6 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
        >Check ✓</button>
      </div>
    </div>
  );
}
