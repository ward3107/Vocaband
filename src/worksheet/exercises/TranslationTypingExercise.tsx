/**
 * TranslationTypingExercise — show a word in the source language and
 * ask the student to type the translation in the target language.
 *
 * Supports the four pairs the IL audience needs: EN↔HE and EN↔AR.
 * Direction is part of the exercise config, set by the teacher in the
 * share dialog.
 *
 * Score model: one point per correct first submission.  Matching is
 * accent- and case-insensitive (see normaliseAnswer); Hebrew and
 * Arabic comparison also folds optional vowel marks (NFD pass).
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import type { Word } from "../../data/vocabulary";
import type { Answer, ExerciseComponent, ExerciseOf, TranslationDirection } from "../types";
import { normaliseAnswer, shuffle } from "../shared";

interface SidePair {
  prompt: string;
  promptLang: "en" | "he" | "ar";
  correct: string;
  answerLang: "en" | "he" | "ar";
}

const pairFor = (w: Word, dir: TranslationDirection): SidePair | null => {
  switch (dir) {
    case "en_to_he":
      return w.hebrew ? { prompt: w.english, promptLang: "en", correct: w.hebrew, answerLang: "he" } : null;
    case "he_to_en":
      return w.hebrew ? { prompt: w.hebrew, promptLang: "he", correct: w.english, answerLang: "en" } : null;
    case "en_to_ar":
      return w.arabic ? { prompt: w.english, promptLang: "en", correct: w.arabic, answerLang: "ar" } : null;
    case "ar_to_en":
      return w.arabic ? { prompt: w.arabic, promptLang: "ar", correct: w.english, answerLang: "en" } : null;
  }
};

const PROMPT_LABEL: Record<TranslationDirection, string> = {
  en_to_he: "Type the Hebrew translation",
  he_to_en: "Type the English translation",
  en_to_ar: "Type the Arabic translation",
  ar_to_en: "Type the English translation",
};

export const TranslationTypingExercise: ExerciseComponent<ExerciseOf<"translation_typing">> = ({
  config,
  words,
  onComplete,
}) => {
  const { speak } = useAudio();
  const direction = config.direction;
  const items = useMemo(() => {
    const pairs: Array<{ word_id: number; word: Word; pair: SidePair }> = [];
    for (const w of words) {
      const p = pairFor(w, direction);
      if (p) pairs.push({ word_id: w.id, word: w, pair: p });
    }
    return pairs;
  }, [words, direction]);

  const [order] = useState(() => shuffle(items));
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    if (order.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [order.length, onComplete]);

  if (order.length === 0) return null;
  const current = order[idx];
  if (!current) return null;
  const { pair } = current;

  const isRight =
    !!typed && normaliseAnswer(typed) === normaliseAnswer(pair.correct);

  const handleSubmit = () => {
    if (submitted || !typed.trim()) return;
    setSubmitted(true);
    if (isRight) setCorrect((c) => c + 1);

    const answer: Answer = {
      kind: "translation_typing",
      word_id: current.word_id,
      prompt: pair.prompt,
      typed,
      correct: pair.correct,
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (idx + 1 < order.length) {
        setIdx(idx + 1);
        setTyped("");
        setSubmitted(false);
      } else {
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: order.length, answers: nextAnswers });
      }
    }, 1100);
  };

  const playPromptAudio = () => {
    // Only play TTS when the prompt is the English word — audio bundle
    // doesn't carry HE/AR pronunciations.
    if (pair.promptLang !== "en") return;
    speak(current.word_id, current.word.english);
  };

  const inputDir = pair.answerLang === "en" ? "ltr" : "rtl";
  const promptDir = pair.promptLang === "en" ? "ltr" : "rtl";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {order.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3 text-center">
        {PROMPT_LABEL[direction]}
      </p>

      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2">
          <h2 className="text-3xl sm:text-5xl font-black text-stone-900" dir={promptDir}>
            {pair.prompt}
          </h2>
          {pair.promptLang === "en" && (
            <button
              type="button"
              onClick={playPromptAudio}
              aria-label="Play pronunciation"
              className="p-2 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <Volume2 size={20} />
            </button>
          )}
        </div>
      </motion.div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={submitted}
          placeholder="Your answer…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          dir={inputDir}
          className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-lg text-center transition-all ${
            !submitted
              ? "border-stone-200 focus:border-violet-500 focus:outline-none text-stone-900"
              : isRight
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-rose-500 bg-rose-50 text-rose-900"
          }`}
        />
        {submitted && !isRight && (
          <p className="text-center text-sm font-bold text-rose-700 mt-3" dir={inputDir}>
            Answer: <span className="text-rose-900">{pair.correct}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={submitted || !typed.trim()}
          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-all"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default TranslationTypingExercise;
