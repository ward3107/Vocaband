/**
 * MatchingExercise — pair English tiles with their translation tiles.
 *
 * Wraps the existing presentational MatchingModeGame component with a
 * tiny state machine.  Pairs are batched into rounds of 6 so a 25-word
 * worksheet doesn't try to render 50 tiles on a phone screen.
 *
 * Score model: matching always eventually solves every pair (you can't
 * progress otherwise), so the per-word signal is the mistake count.
 * `score` is the count of correct first-tries, `total` is the total
 * number of attempts — the dashboard reads both to compute accuracy.
 */
import { useEffect, useMemo, useState } from "react";
import MatchingModeGame from "../../components/game/MatchingModeGame";
import type { Answer, ExerciseComponent, ExerciseOf, ExerciseResult } from "../types";
import { shuffle, translationFor } from "../shared";

const ROUND_SIZE = 6;

type MatchItem = { id: number; text: string; type: "english" | "arabic" };
type MatchSelection = { id: number; type: "english" | "arabic" };

export const MatchingExercise: ExerciseComponent<ExerciseOf<"matching">> = ({
  words,
  targetLang,
  onComplete,
}) => {
  // Pre-shuffle word order once at mount so the sequence is stable for
  // the session but randomised vs. other students.
  const [rounds] = useState(() => {
    const shuffled = shuffle(words);
    const out: typeof words[] = [];
    for (let i = 0; i < shuffled.length; i += ROUND_SIZE) {
      out.push(shuffled.slice(i, i + ROUND_SIZE));
    }
    return out;
  });
  const [roundIdx, setRoundIdx] = useState(0);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<MatchSelection | null>(null);
  const [processing, setProcessing] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  // Lazily populated when the student first attempts a pair.  Both
  // sides of a wrong attempt get their counter bumped.
  const [mistakesByWord, setMistakesByWord] = useState<Record<number, number>>({});

  const roundWords = rounds[roundIdx] ?? [];
  const pairs: MatchItem[] = useMemo(() => {
    const englishTiles: MatchItem[] = roundWords.map((w) => ({
      id: w.id,
      text: w.english,
      type: "english",
    }));
    const translationTiles: MatchItem[] = roundWords.map((w) => ({
      id: w.id,
      text: translationFor(w, targetLang),
      // The "arabic" slot is reused for any non-English target — the
      // presentational component only cares about left vs. right
      // columns, not the actual language.
      type: "arabic",
    }));
    return [...shuffle(englishTiles), ...shuffle(translationTiles)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, targetLang]);

  const handleClick = (item: MatchSelection) => {
    if (processing) return;
    if (!selected) {
      setSelected(item);
      return;
    }
    if (selected.id === item.id && selected.type === item.type) {
      setSelected(null);
      return;
    }
    if (selected.type === item.type) {
      setSelected(item);
      return;
    }
    setProcessing(true);
    setAttempts((a) => a + 1);
    if (selected.id === item.id) {
      setMatchedIds((m) => [...m, item.id]);
      setCorrect((c) => c + 1);
      setTimeout(() => {
        setSelected(null);
        setProcessing(false);
      }, 420);
    } else {
      setMistakesByWord((prev) => ({
        ...prev,
        [selected.id]: (prev[selected.id] ?? 0) + 1,
        [item.id]: (prev[item.id] ?? 0) + 1,
      }));
      setTimeout(() => {
        setSelected(null);
        setProcessing(false);
      }, 350);
    }
  };

  useEffect(() => {
    if (roundWords.length === 0) {
      // Empty word list — finish immediately so the runner doesn't stall.
      onComplete({ score: 0, total: 0, answers: [] });
      return;
    }
    const allMatched = roundWords.every((w) => matchedIds.includes(w.id));
    if (!allMatched) return;
    if (roundIdx + 1 < rounds.length) {
      const next = roundIdx + 1;
      const t = setTimeout(() => {
        setRoundIdx(next);
        setMatchedIds([]);
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const answers: Answer[] = words.map((w) => ({
        kind: "matching" as const,
        word_id: w.id,
        english: w.english,
        translation: translationFor(w, targetLang),
        mistakes_count: mistakesByWord[w.id] ?? 0,
      }));
      const result: ExerciseResult = {
        score: correct,
        total: attempts,
        answers,
      };
      onComplete(result);
    }, 700);
    return () => clearTimeout(t);
  }, [matchedIds, roundWords, roundIdx, rounds.length, correct, attempts, mistakesByWord, words, targetLang, onComplete]);

  if (rounds.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold text-stone-500">
          Round {roundIdx + 1} / {rounds.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>
      <MatchingModeGame
        matchingPairs={pairs}
        matchedIds={matchedIds}
        selectedMatch={selected}
        isMatchingProcessing={processing}
        onMatchClick={handleClick}
        themeColor="amber"
        modeLabel="Matching"
      />
    </div>
  );
};

export default MatchingExercise;
