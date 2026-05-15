/**
 * SentenceBuildingExercise — show a scrambled bag of word tiles; the
 * student taps them in order to reconstruct the target sentence.
 *
 * Sentences come from sentence-bank-fillblank.ts (each entry is a real
 * 5-10 word sentence containing the target word).  Words not in the
 * bank are skipped at mount time.
 *
 * Score model: one point per sentence assembled correctly on the
 * first try.  Subsequent attempts on the same sentence still count
 * toward solving, but only first-try wins add to score.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useSentenceResolver } from "../SentencesContext";
import type { Answer, ExerciseComponent, ExerciseOf } from "../types";
import { shuffle } from "../shared";

interface Item {
  word_id: number;
  target: string;       // full sentence, original case + punctuation
  tokens: string[];     // tokenised sentence, one element per word
}

// Sentence → tokens.  Splits on whitespace and strips trailing
// punctuation per token so "trees." becomes "trees" — punctuation
// shouldn't affect token matching since the student isn't typing.
const tokenise = (s: string): string[] => {
  return s
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[.,!?;:]+$/, ""))
    .filter(Boolean);
};

export const SentenceBuildingExercise: ExerciseComponent<ExerciseOf<"sentence_building">> = ({
  words,
  onComplete,
}) => {
  const sentences = useSentenceResolver();
  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const w of words) {
      const sentence = sentences.get(w.id);
      if (!sentence) continue;
      const tokens = tokenise(sentence);
      // Skip degenerate one-word "sentences" — nothing to scramble.
      if (tokens.length < 3) continue;
      out.push({ word_id: w.id, target: sentence, tokens });
    }
    return shuffle(out);
  }, [words, sentences]);

  const [idx, setIdx] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [shake, setShake] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = items[idx];

  // Re-shuffle the bag whenever the current item changes.  Numbered
  // IDs let the same token appear twice (e.g. "the") without React key
  // collisions.
  const bag = useMemo(() => {
    if (!current) return [] as Array<{ id: number; token: string }>;
    const numbered = current.tokens.map((token, i) => ({ id: i, token }));
    return shuffle(numbered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, current?.word_id]);

  useEffect(() => {
    if (items.length === 0) {
      onComplete({ score: 0, total: 0, answers: [] });
    }
  }, [items.length, onComplete]);

  if (!current || items.length === 0) return null;

  const targetTokens = current.tokens;
  const builtTokens = picked.map((i) => bag[i].token);

  const handleTileClick = (bagIndex: number) => {
    if (picked.includes(bagIndex)) return;
    if (picked.length >= targetTokens.length) return;
    const next = [...picked, bagIndex];
    setPicked(next);

    if (next.length === targetTokens.length) {
      const guess = next.map((i) => bag[i].token).join(" ");
      const target = targetTokens.join(" ");
      const isRight = guess.toLowerCase() === target.toLowerCase();
      const nextAttempts = attempts + 1;

      if (isRight) {
        const firstTry = attempts === 0;
        if (firstTry) setFirstTryCorrect((c) => c + 1);
        const answer: Answer = {
          kind: "sentence_building",
          word_id: current.word_id,
          target: current.target,
          given: guess,
          is_correct: firstTry,
        };
        const allAnswers = [...answers, answer];
        setAnswers(allAnswers);

        setTimeout(() => {
          if (idx + 1 < items.length) {
            setIdx(idx + 1);
            setAttempts(0);
            setPicked([]);
          } else {
            onComplete({
              score: firstTryCorrect + (firstTry ? 1 : 0),
              total: items.length,
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
  const handleUndo = () => setPicked((prev) => prev.slice(0, -1));

  const complete = picked.length === targetTokens.length;
  const isRight = complete && builtTokens.join(" ").toLowerCase() === targetTokens.join(" ").toLowerCase();

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {items.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{firstTryCorrect} first-try</span>
      </div>

      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3 text-center">
        Build the sentence
      </p>

      <motion.div
        animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={`min-h-[80px] flex flex-wrap items-center justify-center gap-2 px-3 py-4 mb-3 rounded-2xl border-2 transition-colors ${
          complete
            ? isRight
              ? "border-emerald-500 bg-emerald-50"
              : "border-rose-500 bg-rose-50"
            : "border-stone-200 bg-stone-50"
        }`}
        dir="ltr"
      >
        {picked.length === 0 ? (
          <p className="text-sm text-stone-400 italic">Tap words below to build the sentence…</p>
        ) : (
          picked.map((bagIdx, position) => (
            <button
              key={`${bagIdx}-${position}`}
              type="button"
              onClick={() => {
                // Tap a placed tile to pull it back.
                if (complete) return;
                setPicked((prev) => prev.filter((_, i) => i !== position));
              }}
              disabled={complete}
              className={`px-3 py-1.5 rounded-lg text-base font-bold transition-colors ${
                complete
                  ? isRight
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              {bag[bagIdx].token}
            </button>
          ))
        )}
      </motion.div>

      <div className="flex items-center justify-end gap-3 mb-3">
        <button
          type="button"
          onClick={handleUndo}
          disabled={picked.length === 0 || complete}
          className="text-xs font-bold text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={picked.length === 0 || complete}
          className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <X size={12} /> Clear
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
        {bag.map((tile, i) => {
          const isUsed = picked.includes(i);
          return (
            <motion.button
              key={tile.id}
              type="button"
              whileTap={{ scale: isUsed ? 1 : 0.94 }}
              disabled={isUsed}
              onClick={() => handleTileClick(i)}
              className={`px-3 py-2 rounded-lg text-base font-bold transition-all ${
                isUsed
                  ? "bg-stone-100 text-stone-300"
                  : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {tile.token}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default SentenceBuildingExercise;
