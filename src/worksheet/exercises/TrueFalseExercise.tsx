/**
 * TrueFalseExercise — show a "<english> means <translation>" claim and
 * ask the student to confirm or reject it.  Half the prompts are
 * genuine (correct translation), half use a distractor pulled from
 * another word's translation, so guessing one way always loses.
 *
 * Works for any word that has the requested translation, so no extra
 * content bank is needed (unlike cloze or definition match).
 *
 * Score model: one point per correct tap.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { Word } from "../../data/vocabulary";
import type { Answer, ExerciseComponent, ExerciseOf, Language } from "../types";
import { shuffle, translationFor } from "../shared";

interface Item {
  word_id: number;
  english: string;
  shown_translation: string;
  is_true_statement: boolean;
  correct_translation: string;
}

const buildItems = (words: Word[], lang: Language): Item[] => {
  const pool = words.filter((w) => translationFor(w, lang) !== w.english);
  return pool.map((w, i) => {
    const correct = translationFor(w, lang);
    // Alternate true/false deterministically so the count is balanced
    // even for short word lists.  Then shuffle the whole list after.
    const isTrue = i % 2 === 0;
    if (isTrue) {
      return {
        word_id: w.id,
        english: w.english,
        shown_translation: correct,
        is_true_statement: true,
        correct_translation: correct,
      };
    }
    // Pick a distractor — a translation from any OTHER word.  Loop
    // until we find one that isn't the same string (rare collisions).
    let attempts = 0;
    let distractor = correct;
    while (attempts < 10 && distractor === correct) {
      const other = pool[Math.floor(Math.random() * pool.length)];
      const cand = translationFor(other, lang);
      if (cand !== correct) distractor = cand;
      attempts++;
    }
    return {
      word_id: w.id,
      english: w.english,
      shown_translation: distractor,
      is_true_statement: false,
      correct_translation: correct,
    };
  });
};

export const TrueFalseExercise: ExerciseComponent<ExerciseOf<"true_false">> = ({
  words,
  targetLang,
  onComplete,
}) => {
  const items = useMemo(() => shuffle(buildItems(words, targetLang)), [words, targetLang]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    if (items.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [items.length, onComplete]);

  if (items.length === 0) return null;
  const current = items[idx];
  if (!current) return null;

  const handlePick = (choice: boolean) => {
    if (picked !== null) return;
    setPicked(choice);
    const isRight = choice === current.is_true_statement;
    if (isRight) setCorrect((c) => c + 1);

    const statement = `"${current.english}" means "${current.shown_translation}"`;
    const answer: Answer = {
      kind: "true_false",
      word_id: current.word_id,
      statement,
      given: choice,
      correct: current.is_true_statement,
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (idx + 1 < items.length) {
        setIdx(idx + 1);
        setPicked(null);
      } else {
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: items.length, answers: nextAnswers });
      }
    }, 900);
  };

  const reveal = picked !== null;
  const wasRight = reveal && picked === current.is_true_statement;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {items.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3 text-center">
        True or false?
      </p>

      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 px-5 py-8 mb-6 text-center"
      >
        <p className="text-lg sm:text-xl font-bold text-stone-800 leading-relaxed">
          <span dir="ltr">"{current.english}"</span> means{" "}
          <span dir="auto">"{current.shown_translation}"</span>
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => {
          const isPicked = picked === value;
          const isAnswer = current.is_true_statement === value;
          const style = !reveal
            ? value
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
              : "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100"
            : isAnswer
              ? "bg-emerald-500 text-white border-emerald-500"
              : isPicked
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-stone-100 text-stone-400 border-stone-200";
          return (
            <motion.button
              key={String(value)}
              type="button"
              whileTap={{ scale: picked === null ? 0.96 : 1 }}
              disabled={picked !== null}
              onClick={() => handlePick(value)}
              className={`py-5 rounded-2xl border-2 font-black text-xl transition-colors flex items-center justify-center gap-2 ${style}`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {value ? <Check size={22} /> : <X size={22} />}
              {value ? "True" : "False"}
            </motion.button>
          );
        })}
      </div>

      {reveal && !wasRight && (
        <p className="text-center text-sm font-bold text-rose-700 mt-4" dir="auto">
          Actual translation:{" "}
          <span className="text-rose-900">{current.correct_translation}</span>
        </p>
      )}
    </div>
  );
};

export default TrueFalseExercise;
