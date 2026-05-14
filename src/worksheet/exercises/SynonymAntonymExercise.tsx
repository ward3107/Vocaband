/**
 * SynonymAntonymExercise — pick the word from 4 options that matches
 * (or opposes) the prompt.  Mode (synonym vs antonym) is chosen by
 * the teacher in the share dialog.
 *
 * Backed by the hand-curated RELATIONS dataset in
 * src/data/word-relations.ts — only base words present there can be
 * played.  Words that don't have a relation entry are silently
 * skipped so a 20-word worksheet still produces a clean N/N tally.
 *
 * Score model: one point per correct pick.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ALL_RELATION_WORDS, RELATIONS, type WordRelation } from "../../data/word-relations";
import type { Word } from "../../data/vocabulary";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { shuffle } from "../shared";

interface Item {
  word_id: number;
  word: string;
  correct: string;
  options: string[];
}

const findRelation = (englishWord: string): WordRelation | null => {
  const lower = englishWord.toLowerCase();
  return RELATIONS.find((r) => r.english.toLowerCase() === lower) ?? null;
};

const buildItem = (
  word: Word,
  mode: "synonym" | "antonym",
): Item | null => {
  const rel = findRelation(word.english);
  if (!rel) return null;
  const pool = mode === "synonym" ? rel.synonyms : rel.antonyms;
  if (pool.length === 0) return null;
  const correct = pool[Math.floor(Math.random() * pool.length)];

  // Distractors: prefer words from RELATIONS' opposite-mode pool for
  // the same entry (so "hot" → synonym → distractors include its own
  // antonyms — pedagogically interesting because those are clearly
  // wrong yet plausibly themed).  Backfill with global random words.
  const ownOpposite = mode === "synonym" ? rel.antonyms : rel.synonyms;
  const distractorPool = [
    ...ownOpposite,
    ...ALL_RELATION_WORDS.filter(
      (w) => w !== correct && !pool.includes(w) && w.toLowerCase() !== word.english.toLowerCase(),
    ),
  ];
  const distractors = shuffle(distractorPool).slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  return { word_id: word.id, word: word.english, correct, options };
};

export const SynonymAntonymExercise: ExerciseComponent<ExerciseOf<"synonym_antonym">> = ({
  config,
  words,
  onComplete,
}) => {
  const mode = config.mode;
  const items = useMemo(() => {
    const out: Item[] = [];
    for (const w of words) {
      const item = buildItem(w, mode);
      if (item) out.push(item);
    }
    return shuffle(out);
  }, [words, mode]);

  const [idx, setIdx] = useState(0);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
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

  const handlePick = (option: string) => {
    if (pickedOption !== null) return;
    setPickedOption(option);
    const isRight = option === current.correct;
    if (isRight) setCorrect((c) => c + 1);

    const answer: Answer = {
      kind: "synonym_antonym",
      word_id: current.word_id,
      word: current.word,
      mode,
      given: option,
      correct: current.correct,
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (idx + 1 < items.length) {
        setIdx(idx + 1);
        setPickedOption(null);
      } else {
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: items.length, answers: nextAnswers });
      }
    }, 900);
  };

  const prompt = mode === "synonym" ? "Pick the synonym" : "Pick the antonym";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {items.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
          {prompt}
        </p>
        <motion.h2
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-5xl font-black text-stone-900"
          dir="ltr"
        >
          {current.word}
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.options.map((opt) => {
          const reveal = pickedOption !== null;
          const isAnswer = opt === current.correct;
          const isPicked = pickedOption === opt;
          const style = !reveal
            ? "bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100"
            : isAnswer
              ? "bg-emerald-500 text-white border-emerald-500"
              : isPicked
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-stone-100 text-stone-400 border-stone-200";
          return (
            <motion.button
              key={opt}
              type="button"
              whileTap={{ scale: pickedOption !== null ? 1 : 0.96 }}
              disabled={pickedOption !== null}
              onClick={() => handlePick(opt)}
              className={`p-4 rounded-2xl border-2 font-bold text-lg sm:text-xl transition-colors ${style}`}
              dir="ltr"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default SynonymAntonymExercise;
