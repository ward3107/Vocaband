/**
 * WordInContextExercise — read a real example sentence using the
 * target word, then pick the correct translation from 4 options.
 * Like Quiz, but the prompt is "the word in a sentence" rather than
 * the word in isolation, so the student practises reading for
 * meaning instead of pattern-matching translation pairs.
 *
 * Sentences come from sentence-bank-fillblank.ts (each entry is a
 * real 5-10 word sentence containing the target word).  Words
 * without a banked sentence are skipped.
 *
 * Score model: one point per correct first-pick.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import { FILLBLANK_SENTENCES } from "../../data/sentence-bank-fillblank";
import type { Word } from "../../data/vocabulary";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { shuffle, translationFor } from "../shared";

interface Item {
  word_id: number;
  word: Word;
  sentence: string;
  // The sentence with the target word emphasised — used by the
  // renderer to wrap the word in a highlight span.  We pre-compute
  // it so the regex work doesn't run on every paint.
  parts: { before: string; emphasised: string; after: string };
}

const splitAround = (
  sentence: string,
  word: string,
): { before: string; emphasised: string; after: string } | null => {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const m = re.exec(sentence);
  if (!m) return null;
  return {
    before: sentence.slice(0, m.index),
    emphasised: m[0],
    after: sentence.slice(m.index + m[0].length),
  };
};

export const WordInContextExercise: ExerciseComponent<ExerciseOf<"word_in_context">> = ({
  words,
  targetLang,
  onComplete,
}) => {
  const { speak } = useAudio();
  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const w of words) {
      const sentence = FILLBLANK_SENTENCES.get(w.id);
      if (!sentence) continue;
      const parts = splitAround(sentence, w.english);
      if (!parts) continue;
      out.push({ word_id: w.id, word: w, sentence, parts });
    }
    return shuffle(out);
  }, [words]);

  const [idx, setIdx] = useState(0);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = items[idx];

  // Distractor pool draws from the same word list — same self-
  // calibrating difficulty as QuizExercise.
  const options: Word[] = useMemo(() => {
    if (!current) return [];
    const pool = items.map((it) => it.word);
    const distractors = shuffle(pool.filter((w) => w.id !== current.word.id)).slice(0, 3);
    return shuffle([current.word, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (items.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [items.length, onComplete]);

  if (!current || items.length === 0) return null;

  const handlePick = (w: Word) => {
    if (pickedId !== null) return;
    setPickedId(w.id);
    const isRight = w.id === current.word.id;
    if (isRight) setCorrect((c) => c + 1);

    const answer: Answer = {
      kind: "word_in_context",
      word_id: current.word_id,
      given_sentence: current.sentence,
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (idx + 1 < items.length) {
        setIdx(idx + 1);
        setPickedId(null);
      } else {
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: items.length, answers: nextAnswers });
      }
    }, 900);
  };

  const playAudio = () => {
    speak(current.word_id, current.word.english);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {items.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3 text-center">
        Read the sentence — what does the highlighted word mean?
      </p>

      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 px-5 py-6 mb-6 text-center"
      >
        <p className="text-lg sm:text-xl font-bold text-stone-800 leading-relaxed" dir="ltr">
          {current.parts.before}
          <span className="px-2 py-0.5 mx-0.5 rounded-md bg-violet-600 text-white">
            {current.parts.emphasised}
          </span>
          {current.parts.after}
        </p>
        <button
          type="button"
          onClick={playAudio}
          aria-label="Play pronunciation"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900"
        >
          <Volume2 size={14} /> Hear the word
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isPicked = pickedId === opt.id;
          const isAnswer = opt.id === current.word.id;
          const reveal = pickedId !== null;
          const style = !reveal
            ? "bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100"
            : isAnswer
              ? "bg-emerald-500 text-white border-emerald-500"
              : isPicked
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-stone-100 text-stone-400 border-stone-200";
          return (
            <motion.button
              key={opt.id}
              type="button"
              whileTap={{ scale: pickedId !== null ? 1 : 0.96 }}
              disabled={pickedId !== null}
              onClick={() => handlePick(opt)}
              className={`p-4 rounded-2xl border-2 font-bold text-lg sm:text-xl transition-colors ${style}`}
              dir="auto"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {translationFor(opt, targetLang)}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default WordInContextExercise;
