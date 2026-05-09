/**
 * ShoreshHuntView — VocaHebrew native-track game.
 *
 * Shows the lemma with niqqud + its meaning, then asks the student
 * to pick the 3 root letters (shoresh) from the Hebrew alphabet.
 * Order doesn't matter — what matters is identifying which 3 letters
 * carry the lexical meaning across the binyan/mishkal patterns.
 *
 * Pool is restricted to lemmas where shoresh has exactly 3 letters;
 * 2-letter roots (אב, אם, אח) and the rare 4-letter root (פרפר) are
 * excluded so the rules stay consistent for the student.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { HEBREW_LEMMAS } from "../data/vocabulary-hebrew";
import { stripNiqqud, type HebrewLemma } from "../data/types-hebrew";

// 22 letters of the Hebrew alphabet.  Final forms (ך ם ן ף ץ) never
// appear in a shoresh entry because the root tracks the abstract
// consonant, not its positional variant.
const HEBREW_ALPHABET = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ",
  "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
] as const;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface Round {
  lemma: HebrewLemma;
  shoresh: readonly string[];
}

const ROUNDS_PER_SESSION = 10;

interface ShoreshHuntViewProps {
  onExit: () => void;
  gradeBand?: HebrewLemma["gradeBand"] | null;
  /** Assignment-scoped lemma whitelist (see NiqqudModeView). */
  lemmaIds?: readonly number[] | null;
  onComplete?: (score: number, total: number) => void;
}

export default function ShoreshHuntView({ onExit, gradeBand, lemmaIds, onComplete }: ShoreshHuntViewProps) {
  const lemmaPool = useMemo(() => {
    let all: readonly HebrewLemma[] = gradeBand
      ? HEBREW_LEMMAS.filter((l) => l.gradeBand === gradeBand)
      : HEBREW_LEMMAS;
    if (lemmaIds && lemmaIds.length > 0) {
      const allow = new Set(lemmaIds);
      all = all.filter((l) => allow.has(l.id));
    }
    const eligible = all.filter((l) => l.shoresh && l.shoresh.length === 3);
    return shuffle([...eligible]).slice(0, ROUNDS_PER_SESSION);
  }, [gradeBand, lemmaIds]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [resolved, setResolved] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  const round = useMemo<Round | null>(() => {
    if (roundIdx >= lemmaPool.length) return null;
    const lemma = lemmaPool[roundIdx];
    return { lemma, shoresh: lemma.shoresh ?? [] };
  }, [lemmaPool, roundIdx]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  function tapLetter(letter: string) {
    if (resolved !== null || !round) return;
    if (picked.includes(letter)) {
      setPicked((p) => p.filter((l) => l !== letter));
      return;
    }
    if (picked.length >= 3) return;
    const next = [...picked, letter];
    setPicked(next);
    if (next.length === 3) {
      // Order-insensitive comparison against the canonical shoresh.
      const target = [...round.shoresh].sort().join("");
      const guess = [...next].sort().join("");
      const correct = target === guess;
      setResolved(correct ? "correct" : "wrong");
      if (correct) setScore((s) => s + 1);
      advanceTimer.current = window.setTimeout(() => {
        setPicked([]);
        setResolved(null);
        if (roundIdx + 1 >= lemmaPool.length) {
          setDone(true);
          onComplete?.(score + (correct ? 1 : 0), lemmaPool.length);
        } else {
          setRoundIdx((idx) => idx + 1);
        }
      }, correct ? 900 : 1800);
    }
  }

  function restart() {
    setRoundIdx(0);
    setPicked([]);
    setResolved(null);
    setScore(0);
    setDone(false);
  }

  if (lemmaPool.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <p className="font-bold">No 3-letter shoresh lemmas available for this grade band.</p>
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
          className="max-w-md w-full rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white text-center shadow-lg shadow-emerald-500/20"
        >
          <div className="text-7xl mb-4 drop-shadow-lg">
            {pct >= 80 ? "🏆" : pct >= 50 ? "🎯" : "💪"}
          </div>
          <h2 className="text-3xl font-black mb-2">
            {pct}% — {score} / {lemmaPool.length}
          </h2>
          <p className="font-bold mb-6 text-white/85">
            {pct >= 80
              ? "מצוין! זיהית את השורשים"
              : pct >= 50
              ? "יפה — ממשיכים לחפש שורשים"
              : "תרגול נוסף יעזור — נסה שוב"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={restart}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-white text-emerald-700 font-black text-sm tracking-wide shadow-sm hover:bg-amber-100"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 font-black text-sm tracking-wide hover:bg-white/15"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!round) return null;

  const target = [...round.shoresh].sort().join("");
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
            Back
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
          className="text-center mb-6 sm:mb-8"
        >
          <p className="text-blue-300 font-black text-[10px] tracking-[0.25em] uppercase mb-3">
            Find the 3 root letters
          </p>
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

        {/* Picked-letters slots */}
        <div className="flex justify-center gap-3 mb-6" dir="rtl">
          {[0, 1, 2].map((slot) => {
            const letter = picked[slot];
            const showResult = resolved !== null;
            const slotIsCorrect =
              showResult &&
              letter !== undefined &&
              [...round.shoresh].sort().join("") ===
                [...picked].sort().join("");
            let cls =
              "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-lg transition-all";
            if (showResult) {
              cls += slotIsCorrect
                ? " bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-300"
                : " bg-gradient-to-br from-rose-500 to-red-700 ring-2 ring-rose-300";
            } else if (letter) {
              cls += " bg-gradient-to-br from-indigo-500 to-violet-700";
            } else {
              cls += " bg-white/5 border-2 border-dashed border-white/20";
            }
            return (
              <div key={slot} className={cls} lang="he" dir="rtl">
                {letter ?? ""}
              </div>
            );
          })}
        </div>

        {/* Alphabet */}
        <div
          className="grid grid-cols-6 sm:grid-cols-8 gap-2 sm:gap-3"
          dir="rtl"
        >
          {HEBREW_ALPHABET.map((letter) => {
            const isPicked = picked.includes(letter);
            const disabled = resolved !== null;
            return (
              <motion.button
                key={letter}
                type="button"
                onClick={() => tapLetter(letter)}
                disabled={disabled}
                whileHover={!disabled && !isPicked ? { scale: 1.05, y: -2 } : undefined}
                whileTap={!disabled ? { scale: 0.95 } : undefined}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`aspect-square rounded-xl text-2xl sm:text-3xl font-black shadow-md transition-all ${
                  isPicked
                    ? "bg-gradient-to-br from-indigo-500 to-violet-700 text-white ring-2 ring-indigo-300"
                    : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/15"
                } ${disabled && !isPicked ? "opacity-40" : ""}`}
                lang="he"
                dir="rtl"
              >
                {letter}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {resolved !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-center"
            >
              <p
                className={`font-black text-lg ${
                  resolved === "correct" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {resolved === "correct"
                  ? "✓ נכון"
                  : `✗ השורש: ${round.shoresh.join("·")}`}
              </p>
              {/* stripNiqqud is referenced so consumers see the unmarked
                  word + shoresh letters side-by-side when reviewing. */}
              <p className="mt-1 text-white/70 font-bold text-sm" lang="he" dir="rtl">
                {stripNiqqud(round.lemma.lemmaNiqqud)} ← {target.split("").join("·")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
