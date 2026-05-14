/**
 * QuizExercise — show one English word at a time with 4 translation
 * options.  Distractors are sampled from the same word list so the
 * difficulty self-calibrates to the pack the teacher chose.
 *
 * Score model: one point per correct first-pick.  `total` equals the
 * number of words in the exercise.
 */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { getWordAudioUrl } from "../../utils/audioUrl";
import type { Word } from "../../data/vocabulary";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { shuffle, translationFor } from "../shared";

export const QuizExercise: ExerciseComponent<ExerciseOf<"quiz">> = ({
  words,
  targetLang,
  onComplete,
}) => {
  const [order] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = order[idx];

  const options: Word[] = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(order.filter((w) => w.id !== current.id)).slice(0, 3);
    return shuffle([current, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handlePick = (w: Word) => {
    if (pickedId !== null || !current) return;
    setPickedId(w.id);
    const isRight = w.id === current.id;
    if (isRight) setCorrect((c) => c + 1);
    const answer: Answer = {
      kind: "quiz",
      word_id: current.id,
      prompt: current.english,
      given: translationFor(w, targetLang),
      correct: translationFor(current, targetLang),
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setTimeout(() => {
      if (idx + 1 < order.length) {
        setIdx(idx + 1);
        setPickedId(null);
      } else {
        // setCorrect is queued — use the post-pick value directly.
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: order.length, answers: nextAnswers });
      }
    }, 800);
  };

  const playAudio = () => {
    if (!current) return;
    try {
      const url = getWordAudioUrl(current.id);
      if (!url) return;
      const audio = new Audio(url);
      audio.play().catch(() => undefined);
    } catch {
      /* best-effort audio */
    }
  };

  if (!current) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {order.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
          Choose the translation
        </p>
        <div className="inline-flex items-center gap-3">
          <h2 className="text-3xl sm:text-5xl font-black text-stone-900" dir="ltr">
            {current.english}
          </h2>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isPicked = pickedId === opt.id;
          const isAnswer = opt.id === current.id;
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

export default QuizExercise;
