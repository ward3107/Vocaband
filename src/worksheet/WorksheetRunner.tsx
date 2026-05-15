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
import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { SkipForward } from "lucide-react";
import { ALL_WORDS, type Word } from "../data/vocabulary";
import type { Exercise, ExerciseResult, ExerciseType, Language } from "./types";
import { EXERCISE_REGISTRY } from "./exercises/registry";
import { SentencesProvider } from "./SentencesContext";

interface Props {
  exercises: Exercise[];
  targetLang: Language;
  onFinish: (results: ExerciseResult[]) => void;
  // Resume support: start mid-plan with previously collected results.
  // Both optional and treated as one-shot at mount — parent should
  // remount the runner (key prop) if it needs to reset.
  initialIdx?: number;
  initialResults?: ExerciseResult[];
  // Fires after every exercise completes so the parent can persist
  // progress to localStorage between exercises.
  onProgress?: (results: ExerciseResult[]) => void;
  // Per-worksheet AI sentences (settings.sentences from the
  // interactive_worksheets row). Merged with the static
  // FILLBLANK_SENTENCES bank by the sentence-dependent exercises.
  aiSentences?: Record<string, string>;
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

// How long the "Skipping {type}: no questions for these words" card
// stays on screen before we advance to the next exercise. Long enough
// for a kid to read it; short enough that a worksheet with several
// empty sections doesn't feel stalled.
const SKIP_NOTICE_MS = 1400;

const EMPTY_SENTENCES: Record<string, string> = {};

export const WorksheetRunner: React.FC<Props> = ({
  exercises,
  targetLang,
  onFinish,
  initialIdx = 0,
  initialResults = [],
  onProgress,
  aiSentences,
}) => {
  // Stable identity for the empty case so the SentencesContext value
  // doesn't tear consumers' useMemo when the prop is omitted.
  const sentences = aiSentences ?? EMPTY_SENTENCES;
  const [idx, setIdx] = useState(initialIdx);
  const [results, setResults] = useState<ExerciseResult[]>(initialResults);
  // When set, the runner is showing a "skipping" placeholder for the
  // current exercise (which auto-completed with no available items)
  // and the registered timeout will advance to the next exercise.
  const [skipping, setSkipping] = useState<ExerciseType | null>(null);
  // Guards against the same exercise's useEffect firing onComplete
  // twice (it can if the component re-renders before unmount because
  // the parent passes a fresh handleComplete each render).
  const handledIdxRef = useRef<number>(-1);

  const current = exercises[idx];
  const words = useMemo(() => (current ? resolveWords(current.word_ids) : []), [current]);

  const handleComplete = (result: ExerciseResult) => {
    if (handledIdxRef.current === idx) return;
    handledIdxRef.current = idx;

    const next = [...results, result];
    onProgress?.(next);

    const advance = () => {
      if (idx + 1 < exercises.length) {
        setResults(next);
        setIdx(idx + 1);
      } else {
        onFinish(next);
      }
    };

    // total === 0 is the "no available items" auto-skip path used by
    // exercises that depend on a content bank (Cloze, FillBlank,
    // Definition Match, Synonyms, Sentence Builder, Word in Context)
    // when none of the picked words have entries in the bank. Show a
    // short notice so the kid sees what their teacher had picked,
    // rather than silently jumping to the next exercise (or, in the
    // worst case, the submit screen with a blank result).
    if (result.total === 0 && current) {
      setSkipping(current.type);
      window.setTimeout(() => {
        setSkipping(null);
        advance();
      }, SKIP_NOTICE_MS);
      return;
    }

    advance();
  };

  if (!current) {
    // No exercises (shouldn't happen — RPC validates non-empty) or
    // we've walked off the end before onFinish committed.
    return null;
  }

  const Component = EXERCISE_REGISTRY[current.type];

  return (
    <SentencesProvider value={sentences}>
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
            shuffle(...))` from the previous exercise would leak in.
            Reset the once-per-idx onComplete guard on every fresh mount
            via the key change below. */}
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {skipping ? (
            <SkipNotice type={skipping} />
          ) : (
            <Component
              config={current}
              words={words}
              targetLang={targetLang}
              onComplete={handleComplete}
            />
          )}
        </motion.div>
      </div>
    </SentencesProvider>
  );
};

const EXERCISE_LABEL: Record<ExerciseType, string> = {
  matching: "Matching",
  quiz: "Quiz",
  letter_scramble: "Letter Scramble",
  listening_dictation: "Listening Dictation",
  fill_blank: "Fill in the Blank",
  definition_match: "Definition Match",
  synonym_antonym: "Synonyms & Antonyms",
  cloze: "Cloze Paragraph",
  sentence_building: "Sentence Building",
  translation_typing: "Translation Typing",
  word_in_context: "Word in Context",
  true_false: "True or False",
};

const SkipNotice: React.FC<{ type: ExerciseType }> = ({ type }) => (
  <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-center max-w-md mx-auto">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600 mb-4">
      <SkipForward size={26} />
    </div>
    <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
      Skipping
    </p>
    <h3 className="text-xl font-black text-stone-900 mb-2">
      {EXERCISE_LABEL[type] ?? type}
    </h3>
    <p className="text-sm text-stone-500">
      No questions available for these words.
    </p>
  </div>
);

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
