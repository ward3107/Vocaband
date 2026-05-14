/**
 * LetterScrambleExercise — show the letters of an English word in
 * random order; the student taps them in sequence to spell the word.
 *
 * Tap-to-build rather than drag/drop or typed input — keeps the UI
 * thumb-friendly on phones and sidesteps virtual-keyboard layout
 * issues for Hebrew/Arabic speakers whose default keyboard isn't
 * English.
 *
 * Score model: one point per word solved on the first try.  Per-word
 * `attempts` counts every "submit + reject" cycle (so 3 means the
 * student got it on the 3rd attempt).  `solved` is always true at the
 * end since the round won't advance otherwise.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Volume2, X } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { shuffle, translationFor } from "../shared";

type LetterTile = { id: number; char: string };

// Multi-word phrases (e.g. "good morning") are rare in the bundle but
// would scramble into nonsense.  Filter them out at config time so the
// student never sees an impossible round.
const isSingleWord = (s: string) => /^[a-zA-Z'-]+$/.test(s);

export const LetterScrambleExercise: ExerciseComponent<ExerciseOf<"letter_scramble">> = ({
  words,
  targetLang,
  onComplete,
}) => {
  const { speak } = useAudio();
  const playable = useMemo(() => words.filter((w) => isSingleWord(w.english)), [words]);
  const [order] = useState(() => shuffle(playable));
  const [idx, setIdx] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [shake, setShake] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = order[idx];
  // Numbered IDs let the same letter appear multiple times (e.g.
  // "letter" has two t's, two e's) without React key collisions.
  const tiles: LetterTile[] = useMemo(() => {
    if (!current) return [];
    const chars = current.english.toLowerCase().split("");
    return shuffle(chars.map((char, i) => ({ id: i, char })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, current?.id]);

  // No words to play (every entry was a phrase) — finish immediately.
  useEffect(() => {
    if (order.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [order.length, onComplete]);

  if (!current || order.length === 0) return null;

  const target = current.english.toLowerCase();
  const built = picked.map((i) => tiles[i].char).join("");

  const handleTileClick = (tileIndex: number) => {
    if (picked.includes(tileIndex)) return;
    if (picked.length >= target.length) return;
    const next = [...picked, tileIndex];
    setPicked(next);

    if (next.length === target.length) {
      const guess = next.map((i) => tiles[i].char).join("");
      const isRight = guess === target;
      const nextAttempts = attempts + 1;
      if (isRight) {
        const firstTry = attempts === 0;
        if (firstTry) setFirstTryCorrect((c) => c + 1);
        const answer: Answer = {
          kind: "letter_scramble",
          word_id: current.id,
          word: current.english,
          attempts: nextAttempts,
          solved: true,
        };
        const allAnswers = [...answers, answer];
        setAnswers(allAnswers);
        setTimeout(() => {
          if (idx + 1 < order.length) {
            setIdx(idx + 1);
            setAttempts(0);
            setPicked([]);
          } else {
            onComplete({
              score: firstTryCorrect + (firstTry ? 1 : 0),
              total: order.length,
              answers: allAnswers,
            });
          }
        }, 700);
      } else {
        setAttempts(nextAttempts);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPicked([]);
        }, 500);
      }
    }
  };

  const handleClear = () => setPicked([]);

  const playAudio = () => {
    speak(current.id, current.english);
  };

  const translation = translationFor(current, targetLang);
  const complete = picked.length === target.length;
  const isRight = complete && built === target;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {order.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{firstTryCorrect} first-try</span>
      </div>

      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
          Unscramble this word
        </p>
        <div className="inline-flex items-center gap-3 mb-1">
          <p className="text-xl sm:text-2xl font-bold text-stone-700" dir="auto">
            {translation}
          </p>
          <button
            type="button"
            onClick={playAudio}
            aria-label="Play pronunciation"
            className="p-1.5 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 transition-all"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      <motion.div
        animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 mb-2 px-2 py-4 rounded-2xl border-2 transition-colors ${
          complete
            ? isRight
              ? "border-emerald-500 bg-emerald-50"
              : "border-rose-500 bg-rose-50"
            : "border-stone-200 bg-stone-50"
        }`}
      >
        {Array.from({ length: target.length }).map((_, i) => (
          <div
            key={i}
            className={`w-9 h-12 sm:w-11 sm:h-14 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-black uppercase ${
              picked[i] !== undefined
                ? complete
                  ? isRight
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-violet-600 text-white"
                : "bg-white text-stone-300 border border-stone-200"
            }`}
            dir="ltr"
          >
            {picked[i] !== undefined ? tiles[picked[i]].char : ""}
          </div>
        ))}
      </motion.div>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleClear}
          disabled={picked.length === 0}
          className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <X size={12} /> Clear
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {tiles.map((tile, i) => {
          const isUsed = picked.includes(i);
          return (
            <motion.button
              key={tile.id}
              type="button"
              whileTap={{ scale: isUsed ? 1 : 0.92 }}
              disabled={isUsed}
              onClick={() => handleTileClick(i)}
              className={`w-9 h-12 sm:w-11 sm:h-14 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-black uppercase transition-all ${
                isUsed
                  ? "bg-stone-100 text-stone-300"
                  : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg"
              }`}
              dir="ltr"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {tile.char}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default LetterScrambleExercise;
