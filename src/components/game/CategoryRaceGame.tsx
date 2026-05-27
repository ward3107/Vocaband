/**
 * CategoryRaceGame — Scattergories-style game mode.
 *
 * Flow: SETUP → (ROUND → ROUND_RESULT)×N → FINAL → onFinish.
 *
 * The teacher (or solo student) picks which categories are active +
 * how long each round lasts + how many rounds, then a letter is rolled
 * and the student types one answer per category that starts with the
 * letter.  English answers earn full points; Hebrew/Arabic answers
 * earn a reduced amount.  Each L1 fallback is recorded so the teacher
 * report can later surface "which English words is this kid avoiding."
 *
 * Self-contained mode — owns its own state machine, score, and timer.
 * GameActiveView routes here when gameMode === 'category-race' and
 * passes a single `onFinish(percent)` callback (already-normalized
 * 0-100 score).
 */
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X, Clock, Trophy, AlertCircle, RotateCw } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { type GameThemeColor, getThemeColors } from "./GameShell";
import {
  CATEGORIES,
  type CategoryId,
  type CategoryMeta,
  type ValidationResult,
  validateAnswer,
  rollLetter,
  categoryLabel,
  categoryPlaceholder,
} from "../../data/category-race-bank";

// Points per cell: full credit for English, partial credit for L1.
// Reducing L1 to 30% (3 pts vs 10) was chosen to keep weaker students
// in the game while still nudging them toward English. Lower would
// feel punitive; equal would erase the pedagogical signal.
const PTS_EN = 10;
const PTS_L1 = 3;

const TIMER_OPTIONS: ReadonlyArray<number> = [30, 60, 90, 120];
const ROUND_OPTIONS: ReadonlyArray<number> = [1, 3, 5];

/** Default categories selected when the setup card first opens. */
const DEFAULT_CATEGORY_IDS: ReadonlyArray<CategoryId> = [
  "country", "animal", "food", "verb", "adjective", "object",
];

type Phase = "setup" | "round" | "round-result" | "final";

interface CellResult {
  categoryId: CategoryId;
  typed: string;
  result: ValidationResult;
  points: number;
}

interface RoundLog {
  letter: string;
  cells: CellResult[];
}

interface CategoryRaceGameProps {
  themeColor: GameThemeColor;
  /** Called when the whole game ends.  Score is already normalized 0-100. */
  onFinish: (normalizedScore: number) => void;
  /** Called when the student aborts mid-game from the setup card. */
  onExit: () => void;
}

// Localized chrome strings.  Hoisted out of the component so the JSX
// stays focused on layout; if we ever extract this to src/locales/student/
// the keys are already grouped semantically.
const STRINGS = {
  en: {
    setupTitle: "Set up your race",
    setupSub: "Pick categories, a timer, and how many rounds.",
    categoriesHeading: "Categories",
    timerHeading: "Round time",
    roundsHeading: "Rounds",
    start: "Start",
    cancel: "Cancel",
    seconds: (n: number) => `${n}s`,
    roundLabel: (i: number, n: number) => `Round ${i} of ${n}`,
    letterLabel: "Your letter",
    submitRound: "Submit round",
    timeUp: "Time's up!",
    roundResultTitle: "Round complete",
    pointsThisRound: (pts: number, max: number) => `${pts} / ${max} points`,
    continue: "Continue",
    seeResults: "See results",
    finalTitle: "Race complete",
    yourScore: (pts: number, max: number) => `${pts} / ${max} points`,
    yourPercent: (pct: number) => `${pct}% — `,
    fallbacksHeading: "Words to learn in English",
    fallbacksEmpty: "You answered every word in English. Nice!",
    done: "Done",
    pickAtLeastOne: "Pick at least one category to start.",
    noEntry: "(skipped)",
    matchedAs: (en: string) => `→ ${en}`,
    legendEn: "+10 in English",
    legendL1: "+3 in Hebrew/Arabic",
  },
  he: {
    setupTitle: "סדרו את המרוץ",
    setupSub: "בחרו קטגוריות, זמן וכמה סבבים.",
    categoriesHeading: "קטגוריות",
    timerHeading: "זמן לסבב",
    roundsHeading: "סבבים",
    start: "התחילו",
    cancel: "ביטול",
    seconds: (n: number) => `${n} שניות`,
    roundLabel: (i: number, n: number) => `סבב ${i} מתוך ${n}`,
    letterLabel: "האות שלכם",
    submitRound: "סיימו סבב",
    timeUp: "הזמן נגמר!",
    roundResultTitle: "סבב הושלם",
    pointsThisRound: (pts: number, max: number) => `${pts} / ${max} נקודות`,
    continue: "המשך",
    seeResults: "תוצאות",
    finalTitle: "המרוץ הסתיים",
    yourScore: (pts: number, max: number) => `${pts} / ${max} נקודות`,
    yourPercent: (pct: number) => `${pct}% — `,
    fallbacksHeading: "מילים ללמוד באנגלית",
    fallbacksEmpty: "ענית על כל המילים באנגלית. כל הכבוד!",
    done: "סיום",
    pickAtLeastOne: "בחרו לפחות קטגוריה אחת.",
    noEntry: "(לא נכתב)",
    matchedAs: (en: string) => `→ ${en}`,
    legendEn: "באנגלית — 10",
    legendL1: "בעברית/ערבית — 3",
  },
  ar: {
    setupTitle: "هيّئ سباقك",
    setupSub: "اختر الفئات والمؤقت وعدد الجولات.",
    categoriesHeading: "الفئات",
    timerHeading: "وقت الجولة",
    roundsHeading: "الجولات",
    start: "ابدأ",
    cancel: "إلغاء",
    seconds: (n: number) => `${n} ثانية`,
    roundLabel: (i: number, n: number) => `الجولة ${i} من ${n}`,
    letterLabel: "حرفك",
    submitRound: "إنهاء الجولة",
    timeUp: "انتهى الوقت!",
    roundResultTitle: "اكتملت الجولة",
    pointsThisRound: (pts: number, max: number) => `${pts} / ${max} نقطة`,
    continue: "متابعة",
    seeResults: "النتائج",
    finalTitle: "انتهى السباق",
    yourScore: (pts: number, max: number) => `${pts} / ${max} نقطة`,
    yourPercent: (pct: number) => `${pct}% — `,
    fallbacksHeading: "كلمات لتتعلمها بالإنجليزية",
    fallbacksEmpty: "أجبتَ على كل الكلمات بالإنجليزية. أحسنت!",
    done: "تم",
    pickAtLeastOne: "اختر فئة واحدة على الأقل.",
    noEntry: "(فارغ)",
    matchedAs: (en: string) => `→ ${en}`,
    legendEn: "بالإنجليزية — 10",
    legendL1: "بالعبرية/العربية — 3",
  },
  ru: {
    // Fallback to English copy — ru is kept in the type for legacy
    // translation maps but not surfaced in the UI.
    setupTitle: "Set up your race",
    setupSub: "Pick categories, a timer, and how many rounds.",
    categoriesHeading: "Categories",
    timerHeading: "Round time",
    roundsHeading: "Rounds",
    start: "Start",
    cancel: "Cancel",
    seconds: (n: number) => `${n}s`,
    roundLabel: (i: number, n: number) => `Round ${i} of ${n}`,
    letterLabel: "Your letter",
    submitRound: "Submit round",
    timeUp: "Time's up!",
    roundResultTitle: "Round complete",
    pointsThisRound: (pts: number, max: number) => `${pts} / ${max} points`,
    continue: "Continue",
    seeResults: "See results",
    finalTitle: "Race complete",
    yourScore: (pts: number, max: number) => `${pts} / ${max} points`,
    yourPercent: (pct: number) => `${pct}% — `,
    fallbacksHeading: "Words to learn in English",
    fallbacksEmpty: "You answered every word in English. Nice!",
    done: "Done",
    pickAtLeastOne: "Pick at least one category to start.",
    noEntry: "(skipped)",
    matchedAs: (en: string) => `→ ${en}`,
    legendEn: "+10 in English",
    legendL1: "+3 in Hebrew/Arabic",
  },
};

export default function CategoryRaceGame({
  themeColor,
  onFinish,
  onExit,
}: CategoryRaceGameProps) {
  const { language, dir } = useLanguage();
  const theme = getThemeColors(themeColor);
  const t = STRINGS[language];

  const [phase, setPhase] = useState<Phase>("setup");

  // Setup config — locked in by the Start button on the setup card.
  const [selectedCats, setSelectedCats] = useState<CategoryId[]>([...DEFAULT_CATEGORY_IDS]);
  const [roundSeconds, setRoundSeconds] = useState<number>(60);
  const [totalRounds, setTotalRounds] = useState<number>(3);

  // Round state.
  const [roundIndex, setRoundIndex] = useState<number>(0); // 0-based
  const [letter, setLetter] = useState<string>("");
  const [inputs, setInputs] = useState<Record<CategoryId, string>>({} as Record<CategoryId, string>);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [history, setHistory] = useState<RoundLog[]>([]);

  // Hold latest inputs in a ref so the timer's auto-submit captures
  // the freshest text instead of the stale closure value. The timer
  // effect runs in an interval and the `inputs` state update from the
  // last keystroke might not have flushed before the tick fires.
  const inputsRef = useRef<Record<CategoryId, string>>(inputs);
  useEffect(() => { inputsRef.current = inputs; }, [inputs]);

  const activeCategories: CategoryMeta[] = useMemo(
    () => CATEGORIES.filter(c => selectedCats.includes(c.id)),
    [selectedCats],
  );

  // ─── Setup helpers ───────────────────────────────────────────────
  const toggleCategory = (id: CategoryId) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const startGame = () => {
    if (selectedCats.length === 0) return;
    setHistory([]);
    setRoundIndex(0);
    beginRound(0, new Set());
  };

  // ─── Round lifecycle ─────────────────────────────────────────────
  const beginRound = (idx: number, usedLetters: ReadonlySet<string>) => {
    const next = rollLetter(usedLetters);
    setLetter(next);
    // Reset inputs for every active category. Inactive categories stay
    // out of the record so the result view doesn't render empty rows.
    const blank = {} as Record<CategoryId, string>;
    for (const c of activeCategories) blank[c.id] = "";
    setInputs(blank);
    setSecondsLeft(roundSeconds);
    setRoundIndex(idx);
    setPhase("round");
  };

  const submitRound = () => {
    // Snapshot the latest inputs (in case the timer fires while a
    // keystroke is still in flight).
    const current = inputsRef.current;
    const cells: CellResult[] = activeCategories.map(cat => {
      const typed = (current[cat.id] ?? "").trim();
      const result = typed
        ? validateAnswer(cat.id, letter, typed)
        : { valid: false, matchedEn: null, matchedLanguage: null };
      let points = 0;
      if (result.valid) {
        points = result.matchedLanguage === "en" ? PTS_EN : PTS_L1;
      }
      return { categoryId: cat.id, typed, result, points };
    });
    setHistory(prev => [...prev, { letter, cells }]);
    setPhase("round-result");
  };

  const handleNext = () => {
    const nextIdx = roundIndex + 1;
    if (nextIdx >= totalRounds) {
      setPhase("final");
      return;
    }
    const used = new Set(history.map(h => h.letter).concat(letter));
    beginRound(nextIdx, used);
  };

  // ─── Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "round") return;
    if (secondsLeft <= 0) {
      submitRound();
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => window.clearTimeout(id);
    // submitRound depends on `letter` + `activeCategories` — both stable
    // for the duration of a single round, so omitting them from deps
    // is safe and avoids resetting the timer mid-countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  // ─── Final score ─────────────────────────────────────────────────
  const { totalEarned, totalMax, fallbacks } = useMemo(() => {
    let earned = 0;
    const fb: Array<{ category: CategoryMeta; typed: string; matchedEn: string; lang: "he" | "ar" }> = [];
    for (const round of history) {
      for (const cell of round.cells) {
        earned += cell.points;
        if (cell.result.valid && cell.result.matchedLanguage && cell.result.matchedLanguage !== "en" && cell.result.matchedEn) {
          const meta = CATEGORIES.find(c => c.id === cell.categoryId);
          if (meta) {
            fb.push({
              category: meta,
              typed: cell.typed,
              matchedEn: cell.result.matchedEn,
              lang: cell.result.matchedLanguage,
            });
          }
        }
      }
    }
    const max = totalRounds * activeCategories.length * PTS_EN;
    return { totalEarned: earned, totalMax: max, fallbacks: fb };
  }, [history, totalRounds, activeCategories.length]);

  const finalPercent = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  // ─── Render branches ─────────────────────────────────────────────
  if (phase === "setup") {
    return <SetupCard
      theme={theme}
      themeColor={themeColor}
      t={t}
      dir={dir}
      selectedCats={selectedCats}
      onToggle={toggleCategory}
      roundSeconds={roundSeconds}
      setRoundSeconds={setRoundSeconds}
      totalRounds={totalRounds}
      setTotalRounds={setTotalRounds}
      onStart={startGame}
      onCancel={onExit}
    />;
  }

  if (phase === "round") {
    return <ActiveRound
      theme={theme}
      themeColor={themeColor}
      t={t}
      dir={dir}
      roundIndex={roundIndex}
      totalRounds={totalRounds}
      roundSeconds={roundSeconds}
      secondsLeft={secondsLeft}
      letter={letter}
      categories={activeCategories}
      inputs={inputs}
      setInputs={setInputs}
      language={language}
      onSubmit={submitRound}
    />;
  }

  if (phase === "round-result") {
    const last = history[history.length - 1];
    const roundPoints = last.cells.reduce((sum, c) => sum + c.points, 0);
    const roundMax = activeCategories.length * PTS_EN;
    const isFinal = roundIndex + 1 >= totalRounds;
    return <RoundResultCard
      theme={theme}
      t={t}
      dir={dir}
      round={last}
      roundIndex={roundIndex}
      totalRounds={totalRounds}
      roundPoints={roundPoints}
      roundMax={roundMax}
      ctaLabel={isFinal ? t.seeResults : t.continue}
      onNext={handleNext}
      language={language}
    />;
  }

  // phase === "final"
  return <FinalCard
    theme={theme}
    t={t}
    dir={dir}
    totalEarned={totalEarned}
    totalMax={totalMax}
    finalPercent={finalPercent}
    fallbacks={fallbacks}
    language={language}
    onDone={() => onFinish(finalPercent)}
  />;
}

// ───────────────────────── Setup ─────────────────────────────────
interface SetupCardProps {
  theme: ReturnType<typeof getThemeColors>;
  themeColor: GameThemeColor;
  t: typeof STRINGS["en"];
  dir: "ltr" | "rtl";
  selectedCats: CategoryId[];
  onToggle: (id: CategoryId) => void;
  roundSeconds: number;
  setRoundSeconds: (n: number) => void;
  totalRounds: number;
  setTotalRounds: (n: number) => void;
  onStart: () => void;
  onCancel: () => void;
}

function SetupCard({ theme, t, dir, selectedCats, onToggle, roundSeconds, setRoundSeconds, totalRounds, setTotalRounds, onStart, onCancel }: SetupCardProps) {
  const { language } = useLanguage();
  const canStart = selectedCats.length > 0;
  return (
    <div className="w-full max-w-3xl mx-auto px-3 py-4 sm:py-6" dir={dir}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <header className="text-center mb-5">
          <span className={`inline-block ${theme.pillBg} ${theme.pillText} font-black text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}>
            Category Race
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black text-stone-900">{t.setupTitle}</h2>
          <p className="mt-1 text-stone-500 font-bold text-sm">{t.setupSub}</p>
        </header>

        <section className="mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">{t.categoriesHeading}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map(cat => {
              const picked = selectedCats.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onToggle(cat.id)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`relative rounded-xl p-3 text-start transition-all border-2 ${picked ? `bg-gradient-to-br ${cat.gradient} border-transparent text-white shadow-md` : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="font-black text-sm">{categoryLabel(cat, language)}</span>
                    {picked && <Check size={14} className="ms-auto" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
          {!canStart && (
            <p className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {t.pickAtLeastOne}
            </p>
          )}
        </section>

        <section className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">{t.timerHeading}</h3>
            <div className="flex gap-2 flex-wrap">
              {TIMER_OPTIONS.map(opt => {
                const picked = roundSeconds === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRoundSeconds(opt)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`px-4 py-2 rounded-lg font-black text-sm transition border-2 ${picked ? `${theme.fill} text-white border-transparent shadow-md` : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
                  >
                    {t.seconds(opt)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">{t.roundsHeading}</h3>
            <div className="flex gap-2 flex-wrap">
              {ROUND_OPTIONS.map(opt => {
                const picked = totalRounds === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTotalRounds(opt)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`px-4 py-2 rounded-lg font-black text-sm transition border-2 ${picked ? `${theme.fill} text-white border-transparent shadow-md` : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="px-5 py-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-sm"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black text-sm shadow-lg transition ${canStart ? `${theme.fill} text-white hover:opacity-90` : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}
          >
            {t.start} <ArrowRight size={16} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ───────────────────────── Active Round ───────────────────────────
interface ActiveRoundProps {
  theme: ReturnType<typeof getThemeColors>;
  themeColor: GameThemeColor;
  t: typeof STRINGS["en"];
  dir: "ltr" | "rtl";
  roundIndex: number;
  totalRounds: number;
  roundSeconds: number;
  secondsLeft: number;
  letter: string;
  categories: ReadonlyArray<CategoryMeta>;
  inputs: Record<CategoryId, string>;
  setInputs: React.Dispatch<React.SetStateAction<Record<CategoryId, string>>>;
  language: "en" | "he" | "ar" | "ru";
  onSubmit: () => void;
}

function ActiveRound({ theme, t, dir, roundIndex, totalRounds, roundSeconds, secondsLeft, letter, categories, inputs, setInputs, language, onSubmit }: ActiveRoundProps) {
  const lowTime = secondsLeft <= 10;
  const pct = Math.max(0, Math.min(100, (secondsLeft / roundSeconds) * 100));
  return (
    <div className="w-full max-w-3xl mx-auto px-3 py-4 sm:py-6" dir={dir}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <header className="flex items-center justify-between mb-3">
          <span className={`inline-block ${theme.pillBg} ${theme.pillText} font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}>
            {t.roundLabel(roundIndex + 1, totalRounds)}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-sm ${lowTime ? "bg-red-100 text-red-700 animate-pulse" : "bg-stone-100 text-stone-700"}`}>
            <Clock size={14} /> {secondsLeft}s
          </span>
        </header>

        {/* Timer fill bar */}
        <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden mb-5">
          <div
            className={`h-full transition-all ${lowTime ? "bg-red-500" : theme.fill}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Letter hero */}
        <div className="text-center mb-5">
          <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">{t.letterLabel}</p>
          <motion.div
            key={letter}
            initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className={`inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ${theme.pillBg} ${theme.pillText} shadow-xl`}
          >
            <span className="text-6xl sm:text-7xl font-black">{letter}</span>
          </motion.div>
        </div>

        {/* Category inputs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categories.map(cat => (
            <label
              key={cat.id}
              className="flex items-center gap-3 bg-white rounded-xl border-2 border-stone-200 focus-within:border-stone-400 p-3 transition"
            >
              <span className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${cat.gradient} text-white text-xl shadow-sm`}>
                {cat.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-400">
                  {categoryLabel(cat, language)}
                </div>
                <input
                  type="text"
                  value={inputs[cat.id] ?? ""}
                  onChange={e => setInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder={categoryPlaceholder(cat, language)}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  dir="auto"
                  className="w-full bg-transparent outline-none text-base sm:text-lg font-bold text-stone-900 placeholder-stone-300"
                />
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black text-sm shadow-lg ${theme.fill} text-white hover:opacity-90`}
          >
            {t.submitRound} <ArrowRight size={16} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ───────────────────────── Round Result ───────────────────────────
interface RoundResultCardProps {
  theme: ReturnType<typeof getThemeColors>;
  t: typeof STRINGS["en"];
  dir: "ltr" | "rtl";
  round: RoundLog;
  roundIndex: number;
  totalRounds: number;
  roundPoints: number;
  roundMax: number;
  ctaLabel: string;
  onNext: () => void;
  language: "en" | "he" | "ar" | "ru";
}

function RoundResultCard({ theme, t, dir, round, roundIndex, totalRounds, roundPoints, roundMax, ctaLabel, onNext, language }: RoundResultCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-3 py-4 sm:py-6" dir={dir}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <header className="text-center mb-4">
          <span className={`inline-block ${theme.pillBg} ${theme.pillText} font-black text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}>
            {t.roundLabel(roundIndex + 1, totalRounds)}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black text-stone-900">{t.roundResultTitle}</h2>
          <p className="mt-1 text-stone-600 font-bold">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 text-stone-700 font-black me-2">{round.letter}</span>
            {t.pointsThisRound(roundPoints, roundMax)}
          </p>
        </header>

        <ul className="space-y-2 mb-4">
          {round.cells.map(cell => {
            const meta = CATEGORIES.find(c => c.id === cell.categoryId)!;
            const isEn = cell.result.matchedLanguage === "en";
            const isL1 = cell.result.matchedLanguage === "he" || cell.result.matchedLanguage === "ar";
            const colorClass = isEn
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : isL1
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-rose-50 border-rose-200 text-rose-900";
            const Icon = isEn ? Check : isL1 ? RotateCw : X;
            return (
              <li key={cell.categoryId} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${colorClass}`}>
                <span className="text-xl">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-70">{categoryLabel(meta, language)}</div>
                  <div className="font-black text-sm sm:text-base truncate" dir="auto">
                    {cell.typed || <span className="opacity-50">{t.noEntry}</span>}
                    {isL1 && cell.result.matchedEn && (
                      <span className="ms-2 text-xs font-bold opacity-70">{t.matchedAs(cell.result.matchedEn)}</span>
                    )}
                  </div>
                </div>
                <span className="font-black text-sm sm:text-base">
                  {cell.points > 0 ? `+${cell.points}` : "0"}
                </span>
                <Icon size={18} className="flex-shrink-0" strokeWidth={3} />
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-center gap-2 mb-4 text-[11px] font-bold text-stone-500 flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t.legendEn}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{t.legendL1}</span>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNext}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black text-sm shadow-lg ${theme.fill} text-white hover:opacity-90`}
          >
            {ctaLabel} <ArrowRight size={16} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ───────────────────────── Final ──────────────────────────────────
interface FinalCardProps {
  theme: ReturnType<typeof getThemeColors>;
  t: typeof STRINGS["en"];
  dir: "ltr" | "rtl";
  totalEarned: number;
  totalMax: number;
  finalPercent: number;
  fallbacks: Array<{ category: CategoryMeta; typed: string; matchedEn: string; lang: "he" | "ar" }>;
  language: "en" | "he" | "ar" | "ru";
  onDone: () => void;
}

function FinalCard({ theme, t, dir, totalEarned, totalMax, finalPercent, fallbacks, language, onDone }: FinalCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-3 py-4 sm:py-6" dir={dir}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
        <header className="text-center mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${theme.pillBg} ${theme.pillText} shadow-lg mb-3`}
          >
            <Trophy size={36} strokeWidth={2.5} />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900">{t.finalTitle}</h2>
          <p className="mt-1 text-stone-600 font-bold">
            <span className="font-black text-lg">{t.yourPercent(finalPercent)}</span>
            <span>{t.yourScore(totalEarned, totalMax)}</span>
          </p>
        </header>

        <AnimatePresence>
          <section className="mb-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">{t.fallbacksHeading}</h3>
            {fallbacks.length === 0 ? (
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 p-4 text-sm font-bold text-center">
                {t.fallbacksEmpty}
              </div>
            ) : (
              <ul className="space-y-2">
                {fallbacks.map((fb, i) => (
                  <li key={`${fb.matchedEn}-${i}`} className="flex items-center gap-3 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-900 px-3 py-2.5">
                    <span className="text-xl">{fb.category.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-70">{categoryLabel(fb.category, language)}</div>
                      <div className="font-black text-sm sm:text-base">
                        <span dir="auto">{fb.typed}</span>
                        <span className="mx-2 opacity-50">→</span>
                        <span className="text-emerald-900" dir="ltr">{fb.matchedEn}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-black opacity-70">{fb.lang.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </AnimatePresence>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDone}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black text-sm shadow-lg ${theme.fill} text-white hover:opacity-90`}
          >
            {t.done} <ArrowRight size={16} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
