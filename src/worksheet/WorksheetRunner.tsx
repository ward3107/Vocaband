/**
 * WorksheetRunner — walks a student through a list of exercises and
 * reports the aggregate result back to the parent.
 *
 * The runner is pure orchestration: it resolves Word[] from each
 * exercise's word_ids, mounts the matching component from the
 * registry, collects its ExerciseResult on completion, and either
 * advances to the next exercise or signals worksheet-finished to the
 * caller.  Nothing about score persistence, name entry, or the
 * student/teacher UX lives here — that's the caller's job.
 */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ALL_WORDS, type Word } from "../data/vocabulary";
import type { Exercise, ExerciseResult, Language } from "./types";
import { EXERCISE_REGISTRY } from "./exercises/registry";

interface Props {
  exercises: Exercise[];
  targetLang: Language;
  onFinish: (results: ExerciseResult[]) => void;
}

// Local lookup so each exercise doesn't pay the O(n) cost of filtering
// ALL_WORDS itself.  The word bundle (~6.5k entries) is already loaded
// statically, so building this once per render is cheap.
const wordById = (() => {
  const map = new Map<number, Word>();
  for (const w of ALL_WORDS) map.set(w.id, w);
  return map;
})();

const resolveWords = (ids: number[]): Word[] => {
  const out: Word[] = [];
  for (const id of ids) {
    const w = wordById.get(id);
    if (w) out.push(w);
  }
  return out;
};

export const WorksheetRunner: React.FC<Props> = ({ exercises, targetLang, onFinish }) => {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);

  const current = exercises[idx];
  const words = useMemo(() => (current ? resolveWords(current.word_ids) : []), [current]);

  const handleComplete = (result: ExerciseResult) => {
    const next = [...results, result];
    if (idx + 1 < exercises.length) {
      setResults(next);
      setIdx(idx + 1);
    } else {
      onFinish(next);
    }
  };

  if (!current) {
    // No exercises (shouldn't happen — RPC validates non-empty) or
    // we've walked off the end before onFinish committed.
    return null;
  }

  const Component = EXERCISE_REGISTRY[current.type];

  return (
    <div>
      {exercises.length > 1 && (
        <ExerciseProgressBar
          currentIndex={idx}
          total={exercises.length}
          exercises={exercises}
        />
      )}
      {/* Keying on idx forces a fresh mount per exercise so each one
          gets its own clean state — otherwise stale `useState(() =>
          shuffle(...))` from the previous exercise would leak in. */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Component
          config={current}
          words={words}
          targetLang={targetLang}
          onComplete={handleComplete}
        />
      </motion.div>
    </div>
  );
};

// Slim per-exercise progress strip shown above the active exercise
// when the worksheet contains more than one.  Single-exercise
// worksheets skip this entirely so the UI matches the old solver.
const ExerciseProgressBar: React.FC<{
  currentIndex: number;
  total: number;
  exercises: Exercise[];
}> = ({ currentIndex, total, exercises }) => (
  <div className="mb-4 flex items-center justify-center gap-1.5">
    {exercises.map((ex, i) => {
      const done = i < currentIndex;
      const active = i === currentIndex;
      return (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            active ? "w-8 bg-white" : done ? "w-4 bg-emerald-400" : "w-4 bg-white/20"
          }`}
          title={`${ex.type} (${i + 1} / ${total})`}
        />
      );
    })}
  </div>
);

export default WorksheetRunner;
