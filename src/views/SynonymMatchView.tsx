/**
 * SynonymMatchView — VocaHebrew native-track game.
 *
 * Each round shows a lemma and asks the student to pick its closest
 * synonym OR opposite (antonym), depending on which kind of relation
 * the lemma exposes in the corpus.  A coloured chip in the prompt
 * tells the student which one is being asked — נרדפת (synonym) vs
 * הפך (antonym) — so the same data drives both relations without
 * confusing the learner.
 *
 * Pool: lemmas with non-empty synonymsHe or antonymsHe.
 * Distractors: drawn from the broader vocabulary so they read as
 * real Hebrew, but filtered to exclude the actual right answer set.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { HEBREW_LEMMAS } from "../data/vocabulary-hebrew";
import { stripNiqqud, type HebrewLemma } from "../data/types-hebrew";
import { useLanguage } from "../hooks/useLanguage";
import { hebrewModesT } from "../locales/student/hebrew-modes";

const ROUNDS_PER_SESSION = 10;
type Relation = "synonym" | "antonym";

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface Round {
  lemma: HebrewLemma;
  relation: Relation;
  correct: string;
  options: string[];
  correctIndex: number;
}

/** Build the global pool of "real Hebrew words" we can use as
 *  distractors — every lemma's niqqud form plus every synonym/
 *  antonym string.  Set so duplicates collapse. */
function buildDistractorUniverse(): string[] {
  const all = new Set<string>();
  for (const l of HEBREW_LEMMAS) {
    all.add(l.lemmaNiqqud);
    for (const s of l.synonymsHe ?? []) all.add(s);
    for (const a of l.antonymsHe ?? []) all.add(a);
  }
  return [...all];
}

function buildRound(
  lemma: HebrewLemma,
  universe: readonly string[],
): Round | null {
  const synonyms = lemma.synonymsHe ?? [];
  const antonyms = lemma.antonymsHe ?? [];
  // Prefer synonyms when available; otherwise fall back to antonyms.
  // Tossing a coin between them when both exist keeps the session
  // varied so the student doesn't memorize the "this lemma → ask
  // about synonym" pattern.
  let relation: Relation;
  let pool: readonly string[];
  if (synonyms.length && antonyms.length) {
    relation = Math.random() < 0.5 ? "synonym" : "antonym";
    pool = relation === "synonym" ? synonyms : antonyms;
  } else if (synonyms.length) {
    relation = "synonym";
    pool = synonyms;
  } else if (antonyms.length) {
    relation = "antonym";
    pool = antonyms;
  } else {
    return null;
  }

  const correct = pool[Math.floor(Math.random() * pool.length)];
  const exclude = new Set<string>([
    lemma.lemmaNiqqud,
    ...(lemma.synonymsHe ?? []),
    ...(lemma.antonymsHe ?? []),
  ]);
  const candidates = universe.filter((w) => !exclude.has(w));
  const distractors = shuffle([...candidates]).slice(0, 3);
  // Guard against the rare case where the corpus is too small for 3
  // unique distractors — pad with a surface-modified clone of the
  // correct so we never crash.
  while (distractors.length < 3) distractors.push(correct + "ַ");
  const options = shuffle([correct, ...distractors]);
  return {
    lemma,
    relation,
    correct,
    options,
    correctIndex: options.indexOf(correct),
  };
}

interface SynonymMatchViewProps {
  onExit: () => void;
  gradeBand?: HebrewLemma["gradeBand"] | null;
  /** Assignment-scoped lemma whitelist (see NiqqudModeView). */
  lemmaIds?: readonly number[] | null;
  onComplete?: (score: number, total: number) => void;
}

export default function SynonymMatchView({ onExit, gradeBand, lemmaIds, onComplete }: SynonymMatchViewProps) {
  const { language } = useLanguage();
  const t = hebrewModesT[language];
  const universe = useMemo(buildDistractorUniverse, []);

  const lemmaPool = useMemo(() => {
    let all: readonly HebrewLemma[] = gradeBand
      ? HEBREW_LEMMAS.filter((l) => l.gradeBand === gradeBand)
      : HEBREW_LEMMAS;
    if (lemmaIds && lemmaIds.length > 0) {
      const allow = new Set(lemmaIds);
      all = all.filter((l) => allow.has(l.id));
    }
    const eligible = all.filter(
      (l) => (l.synonymsHe?.length ?? 0) > 0 || (l.antonymsHe?.length ?? 0) > 0,
    );
    return shuffle([...eligible]).slice(0, ROUNDS_PER_SESSION);
  }, [gradeBand, lemmaIds]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  const round = useMemo<Round | null>(() => {
    if (roundIdx >= lemmaPool.length) return null;
    return buildRound(lemmaPool[roundIdx], universe);
  }, [lemmaPool, roundIdx, universe]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  function handlePick(i: number) {
    if (picked !== null || !round) return;
    setPicked(i);
    const correct = i === round.correctIndex;
    if (correct) setScore((s) => s + 1);
    advanceTimer.current = window.setTimeout(() => {
      setPicked(null);
      if (roundIdx + 1 >= lemmaPool.length) {
        setDone(true);
        onComplete?.(score + (correct ? 1 : 0), lemmaPool.length);
      } else {
        setRoundIdx((idx) => idx + 1);
      }
    }, correct ? 900 : 1800);
  }

  function restart() {
    setRoundIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  if (lemmaPool.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <p className="font-bold">No lemmas with synonyms or antonyms in this grade band.</p>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / lemmaPool.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-600 p-8 text-white text-center shadow-lg shadow-fuchsia-500/20"
        >
          <div className="text-7xl mb-4 drop-shadow-lg">
            {pct >= 80 ? "🏆" : pct >= 50 ? "🎯" : "💪"}
          </div>
          <h2 className="text-3xl font-black mb-2">
            {pct}% — {score} / {lemmaPool.length}
          </h2>
          <p className="font-bold mb-6 text-white/85">
            {pct >= 80 ? t.synonymPraiseHigh : pct >= 50 ? t.synonymPraiseMid : t.synonymPraiseLow}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={restart}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-white text-fuchsia-700 font-black text-sm tracking-wide shadow-sm hover:bg-amber-100"
            >
              {t.playAgain}
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 font-black text-sm tracking-wide hover:bg-white/15"
            >
              {t.done}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!round) return null;

  const relationLabel =
    round.relation === "synonym" ? t.synonymChipLabel : t.antonymChipLabel;
  const relationChipBg =
    round.relation === "synonym"
      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
      : "bg-rose-500/20 text-rose-200 border-rose-400/40";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onExit}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black tracking-widest uppercase hover:bg-white/15"
          >
            <ArrowLeft size={14} />
            {t.back}
          </button>
          <div className="text-white font-black text-sm">
            {roundIdx + 1} / {lemmaPool.length}
          </div>
          <div className="text-amber-300 font-black text-sm">{score} ✓</div>
        </header>

        <motion.div
          key={round.lemma.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8 sm:mb-10"
        >
          <span
            className={`inline-block px-3 py-1 rounded-full border text-[10px] font-black tracking-[0.2em] uppercase mb-4 ${relationChipBg}`}
          >
            {relationLabel}
          </span>
          <div className="text-5xl sm:text-7xl font-black text-white drop-shadow-xl mb-3 leading-none" lang="he" dir="rtl">
            {round.lemma.lemmaNiqqud}
          </div>
          <p className="text-white/70 font-bold text-sm sm:text-base" lang="he" dir="rtl">
            {round.lemma.definitionHe}
          </p>
          <p className="text-white/50 font-bold text-xs sm:text-sm mt-1">
            {round.lemma.translationEn} · {round.lemma.translationAr}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {round.options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = round.correctIndex === i;
            const showResult = picked !== null;
            const baseClass =
              "relative rounded-2xl p-5 sm:p-6 text-2xl sm:text-3xl font-black text-white shadow-lg overflow-hidden transition-all";
            let bgClass =
              "bg-gradient-to-br from-fuchsia-600 to-pink-700 hover:from-fuchsia-500 hover:to-pink-600 shadow-fuchsia-500/20";
            if (showResult) {
              if (isCorrect) {
                bgClass = "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-2 ring-emerald-300";
              } else if (isPicked) {
                bgClass = "bg-gradient-to-br from-rose-500 to-red-700 shadow-rose-500/30 ring-2 ring-rose-300";
              } else {
                bgClass = "bg-gradient-to-br from-slate-700 to-slate-800 opacity-60";
              }
            }
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => handlePick(i)}
                disabled={picked !== null}
                whileHover={picked === null ? { scale: 1.03, y: -2 } : undefined}
                whileTap={picked === null ? { scale: 0.97 } : undefined}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`${baseClass} ${bgClass}`}
                lang="he"
                dir="rtl"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                <span className="relative z-10">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {picked !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-center"
            >
              <p className="text-white/70 font-bold text-sm" lang="he" dir="rtl">
                {round.lemma.exampleHe}
              </p>
              <p className="text-white/50 text-xs mt-1" lang="he" dir="rtl">
                {stripNiqqud(round.correct)} · {round.correct}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
