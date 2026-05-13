/**
 * ListeningModeView — VocaHebrew native-track game.
 *
 * Inverse of Niqqud Mode: the student HEARS the lemma (Web Speech
 * API, Hebrew voice) and picks the correct niqqud-marked spelling
 * out of 4 options.  Distractors are 3 other lemmas pulled from the
 * same pool — they sound visibly different so the listening signal
 * (not the visual niqqud guess) is what drives the answer.
 *
 * When the studio Hebrew TTS pipeline ships (Google Cloud, mirrors
 * scripts/generate-audio.ts), this component swaps speakHebrew for
 * preloaded <audio> elements with no other code changes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, ArrowLeft } from "lucide-react";
import {
  HEBREW_LEMMAS,
  HEBREW_LEMMAS_BY_GRADE,
} from "../data/vocabulary-hebrew";
import type { HebrewLemma } from "../data/types-hebrew";
import { useLanguage } from "../hooks/useLanguage";
import { hebrewModesT } from "../locales/student/hebrew-modes";

const ROUNDS_PER_SESSION = 10;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function speakHebrew(text: string) {
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "he-IL";
    utter.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const heVoice = voices.find((v) => v.lang.startsWith("he"));
    if (heVoice) utter.voice = heVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* speech synthesis unavailable; silent */ }
}

interface Round {
  lemma: HebrewLemma;
  options: HebrewLemma[];
  correctIndex: number;
}

function buildRound(target: HebrewLemma, allLemmas: readonly HebrewLemma[]): Round {
  const distractors = shuffle(
    allLemmas.filter((l) => l.id !== target.id),
  ).slice(0, 3);
  const options = shuffle([target, ...distractors]);
  return {
    lemma: target,
    options,
    correctIndex: options.findIndex((l) => l.id === target.id),
  };
}

interface ListeningModeViewProps {
  onExit: () => void;
  gradeBand?: HebrewLemma["gradeBand"] | null;
  /** Assignment-scoped lemma whitelist (see NiqqudModeView). */
  lemmaIds?: readonly number[] | null;
  onComplete?: (score: number, total: number) => void;
}

export default function ListeningModeView({ onExit, gradeBand, lemmaIds, onComplete }: ListeningModeViewProps) {
  const { language } = useLanguage();
  const t = hebrewModesT[language];
  const lemmaPool = useMemo(() => {
    let pool: readonly HebrewLemma[] = gradeBand
      ? (HEBREW_LEMMAS_BY_GRADE[gradeBand] ?? [])
      : HEBREW_LEMMAS;
    if (lemmaIds && lemmaIds.length > 0) {
      const allow = new Set(lemmaIds);
      pool = pool.filter((l) => allow.has(l.id));
    }
    return shuffle([...pool]).slice(0, ROUNDS_PER_SESSION);
  }, [gradeBand, lemmaIds]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  const round = useMemo<Round | null>(() => {
    if (roundIdx >= lemmaPool.length) return null;
    return buildRound(lemmaPool[roundIdx], HEBREW_LEMMAS);
  }, [lemmaPool, roundIdx]);

  // Auto-play the prompt at the start of each round.  Browsers
  // synthesize voices async on first call, so wait one tick to give
  // the speechSynthesis voice list time to populate.
  useEffect(() => {
    if (!round) return;
    const t = window.setTimeout(() => speakHebrew(round.lemma.lemmaNiqqud), 250);
    return () => window.clearTimeout(t);
  }, [round]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  function handlePick(i: number) {
    if (picked !== null || !round) return;
    setPicked(i);
    const correct = i === round.correctIndex;
    if (correct) setScore((s) => s + 1);
    speakHebrew(round.lemma.lemmaNiqqud);
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
        <p className="font-bold">{t.noLemmasForBand}</p>
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
          className="max-w-md w-full rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-white text-center shadow-lg shadow-amber-500/20"
        >
          <div className="text-7xl mb-4 drop-shadow-lg">
            {pct >= 80 ? "🏆" : pct >= 50 ? "🎯" : "💪"}
          </div>
          <h2 className="text-3xl font-black mb-2">
            {pct}% — {score} / {lemmaPool.length}
          </h2>
          <p className="font-bold mb-6 text-white/85">
            {pct >= 80 ? t.listenPraiseHigh : pct >= 50 ? t.listenPraiseMid : t.listenPraiseLow}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={restart}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-white text-orange-700 font-black text-sm tracking-wide shadow-sm hover:bg-amber-100"
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
          <p className="text-blue-300 font-black text-[10px] tracking-[0.25em] uppercase mb-4">
            {t.listenInstruction}
          </p>
          <motion.button
            type="button"
            onClick={() => speakHebrew(round.lemma.lemmaNiqqud)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30"
            aria-label={t.listenPlayWordAria}
          >
            <Volume2 size={48} />
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {round.options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = round.correctIndex === i;
            const showResult = picked !== null;
            const baseClass =
              "relative rounded-2xl p-5 sm:p-6 text-2xl sm:text-3xl font-black text-white shadow-lg overflow-hidden transition-all";
            let bgClass =
              "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-orange-500/20";
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
                key={opt.id}
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
                <span className="relative z-10">{opt.lemmaNiqqud}</span>
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
              <p className="text-white/85 font-bold text-base" lang="he" dir="rtl">
                {round.lemma.lemmaNiqqud}
              </p>
              <p className="text-white/60 font-bold text-sm mt-1">
                {round.lemma.translationEn} · {round.lemma.translationAr}
              </p>
              <p className="text-white/50 text-xs mt-2" lang="he" dir="rtl">
                {round.lemma.exampleHe}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
