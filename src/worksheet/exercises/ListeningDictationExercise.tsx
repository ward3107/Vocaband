/**
 * ListeningDictationExercise — play the audio for an English word and
 * ask the student to type what they hear.  No English text is shown
 * up-front; the optional translation is offered as a hint so a
 * struggling student isn't fully blocked.
 *
 * Score model: one point per correct first submission.  Subsequent
 * attempts are allowed (so a kid can self-correct a typo) but only
 * the first counts toward score.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Headphones, Volume2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { normaliseAnswer, shuffle, translationFor } from "../shared";

export const ListeningDictationExercise: ExerciseComponent<ExerciseOf<"listening_dictation">> = ({
  words,
  targetLang,
  onComplete,
}) => {
  const { speak } = useAudio();
  const [order] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const current = order[idx];

  // Auto-play on each new word so students get the prompt without
  // tapping.  Browsers block autoplay until user interaction — that's
  // fine: the very first word requires the student to tap "play", and
  // every subsequent word inherits the gesture allowance. speak() falls
  // back to browser TTS when the MP3 404s so silent words never happen.
  useEffect(() => {
    if (!current) return;
    speak(current.id, current.english);
    setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (order.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [order.length, onComplete]);

  if (!current || order.length === 0) return null;

  const target = current.english;
  const isRight = !!typed && normaliseAnswer(typed) === normaliseAnswer(target);

  const handleSubmit = () => {
    if (submitted || !typed.trim()) return;
    setSubmitted(true);
    if (isRight) setCorrect((c) => c + 1);

    const answer: Answer = {
      kind: "listening_dictation",
      word_id: current.id,
      word: current.english,
      typed,
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (idx + 1 < order.length) {
        setIdx(idx + 1);
        setTyped("");
        setSubmitted(false);
        setShowHint(false);
      } else {
        const finalScore = correct + (isRight ? 1 : 0);
        onComplete({ score: finalScore, total: order.length, answers: nextAnswers });
      }
    }, 1200);
  };

  const playAudio = () => {
    speak(current.id, current.english);
  };

  const translation = translationFor(current, targetLang);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {order.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
          Listen and type what you hear
        </p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={playAudio}
          className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-xl hover:shadow-violet-500/40"
          aria-label="Play audio"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <Headphones size={36} />
        </motion.button>
        <button
          type="button"
          onClick={playAudio}
          className="block mx-auto mt-2 text-xs font-bold text-violet-600 hover:text-violet-800"
        >
          <Volume2 size={12} className="inline -mt-0.5 me-1" /> Play again
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={submitted}
          placeholder="Type the English word…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-lg text-center transition-all ${
            !submitted
              ? "border-stone-200 focus:border-violet-500 focus:outline-none text-stone-900"
              : isRight
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-rose-500 bg-rose-50 text-rose-900"
          }`}
          dir="ltr"
        />
        {submitted && !isRight && (
          <p className="text-center text-sm font-bold text-rose-700 mt-3">
            Answer: <span className="text-rose-900">{target}</span>
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowHint((s) => !s)}
            className="text-xs font-bold text-stone-500 hover:text-stone-700 inline-flex items-center gap-1"
          >
            {showHint ? <EyeOff size={12} /> : <Eye size={12} />}
            {showHint ? "Hide translation" : "Show translation hint"}
          </button>
          <button
            type="submit"
            disabled={submitted || !typed.trim()}
            className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-all"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            Submit
          </button>
        </div>
        {showHint && (
          <p className="text-center text-sm text-stone-500 mt-3" dir="auto">
            Hint: <span className="font-bold text-stone-700">{translation}</span>
          </p>
        )}
      </form>
    </div>
  );
};

export default ListeningDictationExercise;
