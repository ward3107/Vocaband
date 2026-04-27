import React from "react";
import type { Word } from "../../data/vocabulary";
import type { AssignmentData } from "../../core/supabase";
import AnswerOptionButton from "../AnswerOptionButton";

interface FillBlankGameProps {
  activeAssignment: AssignmentData | null;
  currentWord: Word | undefined;
  currentIndex: number;
  options: Word[];
  hiddenOptions: number[];
  feedback: "correct" | "wrong" | "show-answer" | null;
  gameWordsCount: number;
  onAnswer: (w: Word) => void;
}

// Replace the target word in the sentence with `_____` so the student
// has to recognise it from context.  Three-step fallback because
// teacher-edited sentences (or unusual AI outputs) can drift from the
// canonical form:
//   1. Whole-word, case-insensitive regex — handles the common case.
//   2. Substring replace — handles inflected forms ("ran"/"run").
//   3. Append `_____` to the verbatim sentence so the round is still
//      playable instead of giving the answer away.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactSentence(sentence: string, target: string): string {
  if (!sentence || !target) return sentence || "_____";
  const blank = "_____";
  const wordBoundary = new RegExp(`\\b${escapeRegExp(target)}\\b`, "i");
  if (wordBoundary.test(sentence)) {
    return sentence.replace(wordBoundary, blank);
  }
  const idx = sentence.toLowerCase().indexOf(target.toLowerCase());
  if (idx >= 0) {
    return sentence.slice(0, idx) + blank + sentence.slice(idx + target.length);
  }
  return `${sentence} ${blank}`;
}

const FillBlankGame = React.memo(({
  activeAssignment, currentWord, currentIndex,
  options, hiddenOptions, feedback,
  gameWordsCount, onAnswer,
}: FillBlankGameProps) => {
  const sentences = (activeAssignment as AssignmentData & { sentences?: string[] })?.sentences?.filter(s => s.trim()) || [];

  if (sentences.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-stone-400 text-lg">No sentences were added to this assignment.</p>
        <p className="text-stone-400 text-sm mt-2">Ask your teacher to add sentences.</p>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl">
        <p className="text-red-600 font-black">⚠️ Error: No word loaded</p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-center p-8 bg-amber-50 rounded-2xl">
        <p className="text-amber-600 font-black">⚠️ Error: No answer options available</p>
        <p className="text-sm text-amber-500 mt-2">You need at least 4 words in the assignment for this mode to work</p>
      </div>
    );
  }

  // Match each round's word to its sentence by index — the same word
  // index drives the gameplay, so word i ↔ sentence i.  If the
  // assignment has fewer sentences than words (e.g. teacher deleted
  // some), wrap around so the round still has a sentence to show.
  const sentence = sentences[currentIndex % sentences.length] || "";
  const display = redactSentence(sentence, currentWord.english);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <p className="text-stone-400 text-xs font-bold uppercase">
          Sentence {currentIndex + 1} / {gameWordsCount}
        </p>
      </div>

      {/* Sentence with blank — large + readable.  No audio control:
          speaking the sentence aloud would expose the answer for any
          student who can match a sound to a word in the option grid. */}
      <div className="min-h-[80px] rounded-2xl p-4 sm:p-5 mb-5 border-2 border-lime-200 bg-lime-50/60 text-lg sm:text-2xl font-bold text-stone-800 leading-relaxed text-center break-words">
        {display}
      </div>

      {/* 4-option grid — same component the classic / reverse modes use,
          but `gameMode="fill-blank"` tells it to render English (the
          assignment's word pool), since the prompt is in English here. */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
        {options.filter(o => !hiddenOptions.includes(o.id)).map(option => (
          <AnswerOptionButton
            key={option.id}
            option={option}
            currentWordId={currentWord.id}
            feedback={feedback}
            gameMode="fill-blank"
            targetLanguage="hebrew"
            onAnswer={onAnswer}
          />
        ))}
      </div>
    </div>
  );
});

FillBlankGame.displayName = "FillBlankGame";

export default FillBlankGame;
