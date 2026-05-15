/**
 * ClozeExercise — chain together several fill-in-the-blank sentences
 * into a single "passage" the student works through in one screen.
 *
 * Phase-2 implementation reuses the existing single-sentence bank
 * (sentence-bank-fillblank.ts) rather than waiting on a Gemini batch
 * for true multi-blank paragraphs — better than a "Coming soon"
 * placeholder, and the UX (read passage, fill 3-5 blanks) is
 * pedagogically the same.
 *
 * Score model: one point per correct blank.  Each blank reveals
 * inline immediately on submit so the student can move on to the
 * next without leaving the passage.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Volume2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import { useSentenceResolver } from "../SentencesContext";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { normaliseAnswer, shuffle } from "../shared";

// How many sentences make a "passage."  5 is enough to feel like
// connected reading without overwhelming a phone screen.
const PASSAGE_SIZE = 5;

interface Blank {
  word_id: number;
  english: string;
  sentence: string;
  before: string;
  after: string;
}

// Carve a sentence into prefix + suffix around the target word so the
// blank renders inline ("The bird flew high ___ the trees").
const splitAround = (sentence: string, word: string): { before: string; after: string } | null => {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const m = re.exec(sentence);
  if (!m) return null;
  return {
    before: sentence.slice(0, m.index),
    after: sentence.slice(m.index + m[0].length),
  };
};

export const ClozeExercise: ExerciseComponent<ExerciseOf<"cloze">> = ({
  words,
  onComplete,
}) => {
  const { speak } = useAudio();
  const sentences = useSentenceResolver();
  const blanks: Blank[] = useMemo(() => {
    const candidates: Blank[] = [];
    for (const w of words) {
      const sentence = sentences.get(w.id);
      if (!sentence) continue;
      const parts = splitAround(sentence, w.english);
      if (!parts) continue;
      candidates.push({
        word_id: w.id,
        english: w.english,
        sentence,
        before: parts.before,
        after: parts.after,
      });
    }
    return shuffle(candidates).slice(0, PASSAGE_SIZE);
  }, [words, sentences]);

  const [typed, setTyped] = useState<string[]>(() => blanks.map(() => ""));
  const [submitted, setSubmitted] = useState<boolean[]>(() => blanks.map(() => false));
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Push focus into the active input each time it changes so the
  // student doesn't have to tap to start typing the next blank.
  useEffect(() => {
    inputRefs.current[activeIdx]?.focus();
  }, [activeIdx]);

  useEffect(() => {
    if (blanks.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [blanks.length, onComplete]);

  if (blanks.length === 0) return null;

  const score = submitted.reduce(
    (sum, done, i) =>
      done && normaliseAnswer(typed[i]) === normaliseAnswer(blanks[i].english) ? sum + 1 : sum,
    0,
  );
  const allDone = submitted.every(Boolean);

  const handleSubmitBlank = (i: number) => {
    if (submitted[i] || !typed[i].trim()) return;
    const isRight = normaliseAnswer(typed[i]) === normaliseAnswer(blanks[i].english);
    const nextSubmitted = [...submitted];
    nextSubmitted[i] = true;
    setSubmitted(nextSubmitted);

    const answer: Answer = {
      kind: "cloze",
      word_id: blanks[i].word_id,
      sentence: blanks[i].sentence,
      typed: typed[i],
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    // Hop to the next un-submitted blank; if all done, finish.
    const nextUnsubmitted = nextSubmitted.findIndex((b) => !b);
    if (nextUnsubmitted === -1) {
      const finalScore = nextAnswers.filter(
        (a) => a.kind === "cloze" && a.is_correct,
      ).length;
      setTimeout(() => {
        onComplete({ score: finalScore, total: blanks.length, answers: nextAnswers });
      }, 600);
    } else {
      setActiveIdx(nextUnsubmitted);
    }
  };

  const playAudio = (blank: Blank) => {
    speak(blank.word_id, blank.english);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {submitted.filter(Boolean).length} / {blanks.length} filled
        </span>
        <span className="text-xs font-bold text-emerald-600">{score} correct</span>
      </div>

      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3 text-center">
        Fill in the blanks
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 px-5 py-5 mb-2"
      >
        <div className="space-y-3 text-base sm:text-lg leading-relaxed text-stone-800" dir="ltr">
          {blanks.map((b, i) => {
            const isDone = submitted[i];
            const isActive = activeIdx === i && !isDone;
            const isRight = isDone && normaliseAnswer(typed[i]) === normaliseAnswer(b.english);
            return (
              <p key={i} className="font-medium">
                {b.before}
                <span className="inline-flex items-center mx-1">
                  <input
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    value={typed[i]}
                    onChange={(e) => {
                      const next = [...typed];
                      next[i] = e.target.value;
                      setTyped(next);
                    }}
                    onFocus={() => setActiveIdx(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSubmitBlank(i);
                      }
                    }}
                    disabled={isDone}
                    placeholder="___"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={`w-24 sm:w-28 px-2 py-1 text-center font-bold rounded-md border-b-2 outline-none transition-colors ${
                      isDone
                        ? isRight
                          ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                          : "bg-rose-100 border-rose-500 text-rose-900"
                        : isActive
                          ? "bg-white border-violet-500 text-stone-900"
                          : "bg-white/50 border-stone-300 text-stone-900"
                    }`}
                  />
                  {isDone && !isRight && (
                    <span className="ml-2 text-xs font-bold text-rose-700" dir="ltr">
                      → {b.english}
                    </span>
                  )}
                  {isDone && (
                    <button
                      type="button"
                      onClick={() => playAudio(b)}
                      aria-label="Play word"
                      className="ms-1 p-1 rounded-full text-stone-400 hover:text-stone-700"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </span>
                {b.after}
              </p>
            );
          })}
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => handleSubmitBlank(activeIdx)}
        disabled={
          allDone || submitted[activeIdx] || !typed[activeIdx]?.trim()
        }
        className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-all inline-flex items-center justify-center gap-2"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <Check size={16} />
        {allDone ? "Finished" : "Submit blank"}
      </button>
    </div>
  );
};

export default ClozeExercise;
