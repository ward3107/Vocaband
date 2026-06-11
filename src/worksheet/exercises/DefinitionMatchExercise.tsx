/**
 * DefinitionMatchExercise — show an English word; the student picks
 * the matching definition from 4 options.  Distractors are sampled
 * from other words' definitions in the same worksheet so the
 * difficulty self-calibrates to the pack.
 *
 * Backed by src/data/word-definitions.ts which is generated offline
 * by scripts/generate-word-definitions.ts.  Words without a banked
 * definition are skipped at mount time; if zero words have data the
 * exercise auto-completes with a 0/0 result so the runner doesn't
 * stall — same graceful-degradation pattern as Cloze and Sentence
 * Building.
 *
 * Score model: one point per correct first-pick.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import type { Word } from "../../data/vocabulary";
import { WORD_DEFINITIONS } from "../../data/word-definitions";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { shuffle } from "../shared";
import { SkipQuestionButton } from "./SkipQuestionButton";

interface Item {
  word_id: number;
  word: Word;
  definition: string;
}

export const DefinitionMatchExercise: ExerciseComponent<ExerciseOf<"definition_match">> = ({
  words,
  onComplete,
}) => {
  const { speak } = useAudio();
  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const w of words) {
      const definition = WORD_DEFINITIONS.get(w.id);
      if (!definition) continue;
      out.push({ word_id: w.id, word: w, definition });
    }
    return shuffle(out);
  }, [words]);

  const [idx, setIdx] = useState(0);
  const [pickedDefinition, setPickedDefinition] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = items[idx];

  // Distractors come from other items in this same exercise pool, so
  // they're always relevant to the topic and the student is being
  // asked to disambiguate words they're already learning.
  const options: string[] = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(
      items.filter((it) => it.word_id !== current.word_id).map((it) => it.definition),
    ).slice(0, 3);
    return shuffle([current.definition, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (items.length === 0) {
      // No banked definitions at all — auto-skip with an empty result.
      onComplete({ score: 0, total: 0, answers: [] });
    } else if (options.length < 2 && current) {
      // Only one banked definition: can't build a multiple-choice round
      // (1 correct + ≥1 distractor), so auto-mark the lone word correct
      // and advance, rather than stranding the student on a dead-end
      // screen that never calls onComplete and freezes the worksheet.
      onComplete({
        score: 1,
        total: 1,
        answers: [
          {
            kind: "definition_match",
            word_id: current.word_id,
            word: current.word.english,
            given: current.definition,
            correct: current.definition,
            is_correct: true,
          },
        ],
      });
    }
  }, [items.length, options.length, current, onComplete]);

  if (!current || items.length === 0) return null;

  const handlePick = (definition: string) => {
    if (pickedDefinition !== null) return;
    setPickedDefinition(definition);
    const isRight = definition === current.definition;
    if (isRight) setCorrect((c) => c + 1);

    const answer: Answer = {
      kind: "definition_match",
      word_id: current.word_id,
      word: current.word.english,
      given: definition,
      correct: current.definition,
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (idx + 1 < items.length) {
        setIdx(idx + 1);
        setPickedDefinition(null);
      } else {
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: items.length, answers: nextAnswers });
      }
    }, 900);
  };

  const playAudio = () => {
    speak(current.word_id, current.word.english);
  };

  const handleSkip = () => {
    if (pickedDefinition !== null || !current) return;
    const answer: Answer = {
      kind: "definition_match",
      word_id: current.word_id,
      word: current.word.english,
      given: "",
      correct: current.definition,
      is_correct: false,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setPickedDefinition(null);
    } else {
      onComplete({ score: correct, total: items.length, answers: nextAnswers });
    }
  };

  // Need at least 2 items to render a quiz with 1 correct + ≥1
  // distractor.  The single-definition case is auto-completed by the
  // effect above (marks the lone word correct and advances), so render
  // nothing here rather than a dead-end screen with no way forward.
  if (options.length < 2) return null;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {items.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
          Pick the matching definition
        </p>
        <div className="inline-flex items-center gap-3">
          <motion.h2
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl font-black text-stone-900"
            dir="ltr"
          >
            {current.word.english}
          </motion.h2>
          <button
            type="button"
            onClick={playAudio}
            aria-label="Play pronunciation"
            className="p-2 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 transition-all"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Volume2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, i) => {
          const reveal = pickedDefinition !== null;
          const isAnswer = opt === current.definition;
          const isPicked = pickedDefinition === opt;
          const style = !reveal
            ? "bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100"
            : isAnswer
              ? "bg-emerald-500 text-white border-emerald-500"
              : isPicked
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-stone-100 text-stone-400 border-stone-200";
          return (
            <motion.button
              key={`${idx}-${i}`}
              type="button"
              whileTap={{ scale: pickedDefinition !== null ? 1 : 0.97 }}
              disabled={pickedDefinition !== null}
              onClick={() => handlePick(opt)}
              className={`p-4 rounded-xl border-2 font-bold text-start text-base sm:text-lg transition-colors ${style}`}
              dir="ltr"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center">
        <SkipQuestionButton onSkip={handleSkip} disabled={pickedDefinition !== null} />
      </div>
    </div>
  );
};

export default DefinitionMatchExercise;
