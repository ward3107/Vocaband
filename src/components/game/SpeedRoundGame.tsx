/**
 * SpeedRoundGame — 60-second timer mode.  Classic-style questions
 * (English word → 4 translation options) presented as fast as the
 * student can answer them, with combo bonuses for streaks.
 *
 * Self-contained mode (similar to WordChainsGame and IdiomGame):
 * doesn't slot into the per-question orchestration GameActiveView
 * uses for Classic / Listening because Speed Round generates its
 * own question stream and runs its own timer loop.
 *
 * Mechanics:
 *   - 60-second countdown starts on first render
 *   - Each question = 1 random pool word + 3 random distractors,
 *     all shuffled per question so the answer position varies
 *   - Correct answer:  +1 point, +combo bonus if applicable, no
 *     timer change, advance immediately
 *   - Wrong answer:    -1 second timer penalty (doesn't end round),
 *     no point, advance to next question
 *   - Skip:            no point, no penalty, advance
 *   - Timer hits 0:    round ends, finish callback fires with score
 *   - Student hits End: finish callback fires immediately with
 *     score + time-remaining bonus (if they're ending early after
 *     a strong run, that's worth rewarding)
 *
 * Scoring:
 *   - Base: +1 per correct
 *   - Combo bonuses (cumulative, given AT each milestone):
 *       3 in a row = +1
 *       5 in a row = +2
 *       10 in a row = +5
 *   - Time-remaining bonus on early end: +1 per 5s remaining
 *
 * Targets band-2 vocabulary (grades 4-9), so distractors are chosen
 * from the same word pool — the mode tests speed at recall, not
 * disambiguation between obscure words.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, X, SkipForward, Zap, Clock } from "lucide-react";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { gameAriasT } from "../../locales/student/game-arias";
import { type GameThemeColor, getThemeColors } from "./GameShell";

interface SpeedRoundGameProps {
  gameWords: Word[];
  themeColor: GameThemeColor;
  /** Hebrew or Arabic — drives which translation field shows on options. */
  targetLanguage: "hebrew" | "arabic";
  /** Speak the prompt word aloud (audio reinforcement). */
  speak: (wordId: number, fallbackText?: string) => void;
  /** Called when the round ends (timer hit 0 OR End clicked).  Score
   *  passed includes combo bonuses + any early-end time bonus. */
  onFinish: (score: number) => void;
  /** Override for testing — production rounds are 60s. */
  durationSeconds?: number;
}

interface Question {
  word: Word;
  options: Word[];
}

/** Fisher-Yates shuffle (returns a new array, doesn't mutate). */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick the translation field for the active target language. */
function translationOf(word: Word, lang: "hebrew" | "arabic"): string {
  return lang === "hebrew" ? (word.hebrew || "") : (word.arabic || "");
}

/** Build a single Classic-style question: 1 correct word + 3 distinct
 *  distractors drawn from the pool, all shuffled.  Falls back to fewer
 *  options if the pool is too small (rare — most assignments have ≥4
 *  words, but defensive). */
function buildQuestion(pool: Word[]): Question | null {
  if (pool.length === 0) return null;
  const correctIdx = Math.floor(Math.random() * pool.length);
  const correct = pool[correctIdx];
  const others = pool.filter((_, i) => i !== correctIdx);
  const distractors = shuffle(others).slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  return { word: correct, options };
}

/** Combo milestones — bonus XP awarded ONCE when the streak hits each
 *  threshold.  Order matters (lowest first) so the iteration logic
 *  detects the milestone the student just crossed. */
const COMBO_MILESTONES: Array<{ at: number; bonus: number }> = [
  { at: 3, bonus: 1 },
  { at: 5, bonus: 2 },
  { at: 10, bonus: 5 },
];

export default function SpeedRoundGame({
  gameWords,
  themeColor,
  targetLanguage,
  speak,
  onFinish,
  durationSeconds = 60,
}: SpeedRoundGameProps) {
  const { language, dir } = useLanguage();
  const tAria = gameAriasT[language];
  const theme = getThemeColors(themeColor);

  // Round state.
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ bonus: number; at: number } | null>(null);
  const [question, setQuestion] = useState<Question | null>(() => buildQuestion(gameWords));
  const [picked, setPicked] = useState<Word | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Track which combo milestones we've already awarded so a streak
  // that goes 3 → 4 → 5 doesn't double-grant the +1 from milestone 3.
  const awardedMilestones = useRef<Set<number>>(new Set());

  // Guard against onFinish firing twice (timer-hit-0 + manual End).
  const finishedRef = useRef(false);

  // Speak the current word when a question loads — audio cue helps
  // students who decode pronunciation faster than reading.
  useEffect(() => {
    if (!question) return;
    speak(question.word.id, question.word.english);
  }, [question, speak]);

  // Countdown — ticks every 100 ms so the visible second count is
  // smooth when answers cause -1s penalties (a 1 s cadence would
  // make penalties look laggy).  We hold an integer-second count
  // for the displayed timer and a tenths counter for ticking.
  useEffect(() => {
    if (finishedRef.current) return;
    if (timeLeft <= 0) {
      finishedRef.current = true;
      onFinish(score);
      return;
    }
    const interval = window.setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 0.1));
    }, 100);
    return () => window.clearInterval(interval);
  }, [timeLeft, score, onFinish]);

  // Watch for round-end via timer (separate from the interval so the
  // finish callback doesn't fire mid-tick before state settles).
  useEffect(() => {
    if (timeLeft <= 0 && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(score);
    }
  }, [timeLeft, score, onFinish]);

  if (!question || gameWords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
        <p className="text-stone-500">
          {language === "he" ? "אין מילים זמינות" : language === "ar" ? "لا توجد كلمات متاحة" : "No words available"}
        </p>
      </div>
    );
  }

  const advanceToNext = () => {
    setPicked(null);
    setQuestion(buildQuestion(gameWords));
  };

  const handlePick = (opt: Word) => {
    if (picked || finishedRef.current) return;
    setPicked(opt);
    setQuestionsAnswered(n => n + 1);

    const isCorrect = opt.id === question.word.id;
    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setCorrectCount(n => n + 1);

      // Base +1 plus any combo milestone bonus we haven't paid yet.
      let pointsForThisAnswer = 1;
      const newlyHit = COMBO_MILESTONES.find(
        m => m.at === newCombo && !awardedMilestones.current.has(m.at),
      );
      if (newlyHit) {
        pointsForThisAnswer += newlyHit.bonus;
        awardedMilestones.current.add(newlyHit.at);
        setComboFlash({ bonus: newlyHit.bonus, at: newlyHit.at });
        window.setTimeout(() => setComboFlash(null), 1200);
      }
      setScore(s => s + pointsForThisAnswer);
    } else {
      // Wrong answer: combo resets, awarded milestones reset (next
      // streak gets the bonuses again — keeps the mode forgiving),
      // and the timer takes a 1-second penalty.
      setCombo(0);
      awardedMilestones.current = new Set();
      setTimeLeft(t => Math.max(0, t - 1));
    }

    // Brief reveal flash (200 ms green/red) before the next question.
    window.setTimeout(() => {
      if (!finishedRef.current) advanceToNext();
    }, 350);
  };

  const handleSkip = () => {
    if (finishedRef.current) return;
    // Skip resets combo (you didn't actually keep the streak going)
    // but doesn't penalise the timer.  Mid-game escape hatch.
    setCombo(0);
    awardedMilestones.current = new Set();
    setQuestionsAnswered(n => n + 1);
    advanceToNext();
  };

  const handleEnd = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Time-remaining bonus: +1 per 5 whole seconds left, rewarding
    // students who finish strong instead of slogging through the
    // last questions.
    const timeBonus = Math.floor(timeLeft / 5);
    onFinish(score + timeBonus);
  };

  // Visual treatment of the timer — pulses red under 10s.
  const timerSecondsDisplay = Math.ceil(timeLeft);
  const timerLow = timerSecondsDisplay <= 10;

  return (
    <div className="flex flex-col items-center px-4 py-6 sm:py-10 w-full" dir="ltr">
      {/* Top status row: timer (centre/large), score + combo (right) */}
      <div className="w-full max-w-2xl flex items-start justify-between gap-3 mb-4">
        {/* Timer */}
        <div className="flex-1 flex flex-col items-center">
          <motion.div
            key={timerLow ? "low" : "ok"}
            animate={timerLow ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={timerLow ? { repeat: Infinity, duration: 0.8 } : {}}
            className={`flex items-baseline gap-1 font-black tabular-nums ${
              timerLow ? "text-rose-600" : "text-stone-800"
            }`}
          >
            <Clock size={18} className="self-center" />
            <span className="text-4xl sm:text-5xl">{timerSecondsDisplay}</span>
            <span className="text-sm font-semibold opacity-70">
              {language === "he" ? "שניות" : language === "ar" ? "ث" : "s"}
            </span>
          </motion.div>
          {/* Thin progress bar visualises timer at a glance. */}
          <div className="mt-1 w-32 h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <div
              className={`h-full transition-all ${timerLow ? "bg-rose-500" : theme.fill}`}
              style={{ width: `${(timeLeft / durationSeconds) * 100}%` }}
            />
          </div>
        </div>

        {/* Score + combo cluster */}
        <div className="flex flex-col items-end gap-1.5">
          <div className={`px-3 py-1.5 rounded-full font-black text-sm ${theme.pillBg} ${theme.pillText} shadow-md`}>
            ⚡ {score}
          </div>
          {combo > 0 && (
            <div
              className="px-2.5 py-1 rounded-full font-black text-xs bg-amber-100 text-amber-700 shadow-sm flex items-center gap-1"
              dir={dir}
            >
              <Zap size={12} />
              {language === "he"
                ? `${combo} ברצף`
                : language === "ar"
                ? `${combo} متتالية`
                : `${combo} in a row`}
            </div>
          )}
        </div>
      </div>

      {/* Combo milestone flash — appears for ~1.2s when a milestone hits */}
      <AnimatePresence>
        {comboFlash && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="mb-3 px-4 py-2 rounded-2xl bg-amber-500 text-white font-black text-sm shadow-lg flex items-center gap-2"
          >
            🔥 {comboFlash.at} {language === "he" ? "ברצף!" : language === "ar" ? "متتالية!" : "in a row!"}
            <span className="bg-white/30 px-2 py-0.5 rounded-full">+{comboFlash.bonus}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent task label — sits ABOVE the word so it's always clear
          the displayed English word is what the student must translate.
          Earlier versions only showed this on Q1 and students forgot the
          task mid-round. */}
      <p className="mb-2 text-xs sm:text-sm uppercase tracking-widest font-bold text-stone-400" dir={dir}>
        {language === "he"
          ? "תרגם את המילה"
          : language === "ar"
          ? "ترجم الكلمة"
          : "Translate this word"}
      </p>

      {/* Big prompt word */}
      <div className="mb-2 text-center">
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          {question.word.english}
        </h2>
      </div>
      <button
        type="button"
        onClick={() => speak(question.word.id, question.word.english)}
        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
        aria-label={tAria.replayAudio}
      >
        <Volume2 size={14} />
        {language === "he" ? "השמע שוב" : language === "ar" ? "أعد التشغيل" : "Replay"}
      </button>

      {/* Speed nudge — only on Q1, where it nudges without cluttering later */}
      {questionsAnswered === 0 && (
        <p className="mt-3 text-xs sm:text-sm text-stone-500 font-semibold" dir={dir}>
          {language === "he"
            ? "בחר את התשובה הנכונה מהר ככל האפשר"
            : language === "ar"
            ? "اختر الإجابة الصحيحة بأسرع ما يمكن"
            : "Pick the correct answer as fast as you can"}
        </p>
      )}

      {/* Option grid */}
      <div className="mt-5 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          const isPicked = picked?.id === opt.id;
          const isCorrect = opt.id === question.word.id;
          const showResult = picked != null;
          let stateClasses = `bg-white border-2 ${theme.border} ${theme.hoverBg}`;
          if (showResult) {
            if (isCorrect) {
              stateClasses = "bg-emerald-50 border-2 border-emerald-500 text-emerald-900";
            } else if (isPicked) {
              stateClasses = "bg-rose-50 border-2 border-rose-500 text-rose-900";
            } else {
              stateClasses = "bg-stone-50 border-2 border-stone-200 opacity-60";
            }
          }
          return (
            <motion.button
              key={`${opt.id}-${i}`}
              whileTap={!showResult ? { scale: 0.98 } : undefined}
              onClick={() => handlePick(opt)}
              disabled={showResult}
              type="button"
              dir={targetLanguage === "hebrew" || targetLanguage === "arabic" ? "rtl" : "ltr"}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-4 py-4 sm:py-5 rounded-2xl text-center font-black text-lg sm:text-xl transition-all shadow-sm ${stateClasses}`}
            >
              {translationOf(opt, targetLanguage) || opt.english}
            </motion.button>
          );
        })}
      </div>

      {/* Action row — Skip + End.  No "Next" button: questions auto-advance. */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSkip}
          disabled={picked != null}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 text-sm font-bold transition"
        >
          <SkipForward size={16} />
          {language === "he" ? "דלג" : language === "ar" ? "تخطي" : "Skip"}
        </button>
        <button
          type="button"
          onClick={handleEnd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition"
        >
          <X size={16} />
          {language === "he" ? "סיים" : language === "ar" ? "إنهاء" : "End round"}
        </button>
      </div>

      {/* Tiny stats line so the student gets feedback on accuracy */}
      {questionsAnswered > 0 && (
        <p className="mt-4 text-xs text-stone-500 font-semibold tabular-nums" dir={dir}>
          {language === "he"
            ? `${correctCount}/${questionsAnswered} נכונות`
            : language === "ar"
            ? `${correctCount}/${questionsAnswered} صحيحة`
            : `${correctCount}/${questionsAnswered} correct`}
        </p>
      )}
    </div>
  );
}
