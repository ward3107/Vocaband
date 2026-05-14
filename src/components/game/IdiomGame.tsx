/**
 * IdiomGame — pick the correct figurative meaning of an English idiom.
 *
 * Self-contained mode (similar to WordChainsGame): doesn't slot into
 * the per-question orchestration GameActiveView uses for Classic /
 * Listening because the question source is the idiom dataset, not
 * the assignment word pool.
 *
 * Round structure:
 *   1. Pick N random idioms (default 10, capped at the pool size).
 *   2. For each idiom, show 4 options — 1 correct meaning + 3
 *      hand-curated distractors from the dataset.  Options are
 *      shuffled per question so the right answer isn't always at A.
 *   3. Student picks an option.  Reveal panel shows correct answer
 *      + a sample sentence using the idiom in context.
 *   4. Continue → next idiom.  Round ends after N idioms or End.
 *   5. onFinish receives the score (number correct out of N).
 *
 * UI language:
 *   - Idiom phrase always renders in English (the thing being learned).
 *   - The correct meaning shows in the student's UI language so HE/AR
 *     readers see the figurative meaning in their language.
 *   - Distractors render in English (translation of all distractors
 *     is a future enhancement — see docs/SELECTED-FEATURES-PLAN.md).
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, X, ArrowRight } from "lucide-react";
import { IDIOMS, pickRandomIdioms, type Idiom } from "../../data/idioms";
import { useLanguage } from "../../hooks/useLanguage";
import { gameAriasT } from "../../locales/student/game-arias";
import { type GameThemeColor, getThemeColors } from "./GameShell";

interface IdiomGameProps {
  themeColor: GameThemeColor;
  /** TTS for the idiom phrase + example sentence on reveal. */
  speak: (text: string) => void;
  /** Called when the student ends the round.  Score = correct count. */
  onFinish: (score: number) => void;
  /** How many idioms in a round.  Defaults to 10; clamped to dataset
   *  size so we don't ask for more than we have. */
  questionsPerRound?: number;
}

interface Option {
  text: string;
  isCorrect: boolean;
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

/** Build the 4 options for a single idiom, shuffled. */
function buildOptions(idiom: Idiom): Option[] {
  const opts: Option[] = [
    { text: idiom.meaningEn, isCorrect: true },
    { text: idiom.distractorsEn[0], isCorrect: false },
    { text: idiom.distractorsEn[1], isCorrect: false },
    { text: idiom.distractorsEn[2], isCorrect: false },
  ];
  return shuffle(opts);
}

export default function IdiomGame({
  themeColor,
  speak,
  onFinish,
  questionsPerRound = 10,
}: IdiomGameProps) {
  const { language, dir } = useLanguage();
  const tAria = gameAriasT[language];
  const theme = getThemeColors(themeColor);

  // Build the round's question list once on mount.  Picking N random
  // idioms keeps the round feeling fresh — same student replaying
  // the mode gets a different mix every time.
  const round = useMemo(
    () => pickRandomIdioms(Math.min(questionsPerRound, IDIOMS.length)),
    [questionsPerRound],
  );

  const [questionIdx, setQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<Option | null>(null);

  const current = round[questionIdx];
  const options = useMemo(() => (current ? buildOptions(current) : []), [current]);

  // When the question changes, speak the idiom out loud so audio
  // learners can hear the phrase before committing to a meaning.
  useEffect(() => {
    if (!current) return;
    setPicked(null);
    speak(current.english);
  }, [current, speak]);

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
        <p className="text-stone-500">
          {language === "he" ? "אין ביטויים זמינים" : language === "ar" ? "لا توجد تعابير متاحة" : "No idioms available"}
        </p>
      </div>
    );
  }

  // Pick the language-appropriate version of the figurative meaning
  // for the reveal panel.  Falls back to English if the translation
  // is empty (shouldn't happen with current dataset but defensive).
  const localizedMeaning =
    language === "he" ? current.meaningHe || current.meaningEn :
    language === "ar" ? current.meaningAr || current.meaningEn :
    current.meaningEn;

  const handlePick = (opt: Option) => {
    if (picked) return; // already answered, ignore extra taps
    setPicked(opt);
    if (opt.isCorrect) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (questionIdx + 1 >= round.length) {
      // Last question — round complete.  handlePick already updated
      // `score` for the current pick, so we pass it through verbatim.
      onFinish(score);
      return;
    }
    setQuestionIdx(i => i + 1);
  };

  const handleEnd = () => onFinish(score);

  return (
    <div className="flex flex-col items-center px-4 py-6 sm:py-10 w-full" dir="ltr">
      {/* Score + progress chip */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`px-4 py-2 rounded-full font-black text-sm ${theme.pillBg} ${theme.pillText} shadow-md`}>
          💭 {language === "he" ? "ביטוי" : language === "ar" ? "تعبير" : "Idiom"} {questionIdx + 1}/{round.length}
        </div>
        <div className="px-3 py-2 rounded-full font-black text-sm bg-emerald-100 text-emerald-700 shadow-md">
          ✓ {score}
        </div>
      </div>

      {/* Idiom phrase — large, with replay-audio chip below */}
      <div className="mb-2 text-center">
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          {current.english}
        </h2>
      </div>
      <button
        type="button"
        onClick={() => speak(current.english)}
        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
        aria-label={tAria.replayIdiom}
      >
        <Volume2 size={14} />
        {language === "he" ? "השמע שוב" : language === "ar" ? "أعد التشغيل" : "Replay"}
      </button>

      {/* Hint label above options — the parenthetical reminds HE/AR
          speakers we want the figurative meaning, not a word-for-word
          translation (a common point of confusion for younger students). */}
      <p className="mt-5 mb-3 text-center text-sm sm:text-base text-stone-600 font-semibold" dir={dir}>
        {language === "he"
          ? "מה המשמעות של הביטוי? (לא תרגום מילולי)"
          : language === "ar"
          ? "ما معنى هذا التعبير؟ (وليس ترجمة حرفية)"
          : "What does this idiom mean?"}
      </p>

      {/* Option grid — 1 column on mobile, 2 on tablet+ */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isPicked = picked === opt;
          const showResult = picked != null;
          const isCorrect = opt.isCorrect;

          // Visual states once an answer is picked:
          //   - picked + correct → green
          //   - picked + wrong → red
          //   - not picked + correct (revealed) → green outline
          //   - not picked + wrong → dimmed
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
              key={i}
              whileTap={!showResult ? { scale: 0.98 } : undefined}
              onClick={() => handlePick(opt)}
              disabled={showResult}
              type="button"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-4 py-4 rounded-2xl text-left font-bold text-sm sm:text-base transition-all shadow-sm ${stateClasses}`}
            >
              <span className="inline-block w-7 h-7 mr-2 rounded-full bg-stone-100 text-stone-700 text-xs font-black leading-7 text-center">
                {String.fromCharCode(65 + i)}
              </span>
              {opt.text}
            </motion.button>
          );
        })}
      </div>

      {/* Reveal panel — appears below options once the student picks. */}
      <AnimatePresence>
        {picked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mt-5 w-full max-w-2xl rounded-2xl border-2 p-4 sm:p-5 ${
              picked.isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className={`font-black text-sm sm:text-base ${picked.isCorrect ? "text-emerald-700" : "text-rose-700"}`} dir={dir}>
                {picked.isCorrect
                  ? (language === "he" ? "נכון! 🎉" : language === "ar" ? "صحيح! 🎉" : "Correct! 🎉")
                  : (language === "he" ? "לא נכון" : language === "ar" ? "غير صحيح" : "Not quite")}
              </p>
              <button
                type="button"
                onClick={() => speak(current.example)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/70 hover:bg-white text-stone-600 text-[11px] font-semibold transition shrink-0"
                aria-label={tAria.hearExampleSentence}
              >
                <Volume2 size={12} />
                {language === "he" ? "דוגמה" : language === "ar" ? "مثال" : "Example"}
              </button>
            </div>
            <p className="text-stone-800 font-bold text-sm sm:text-base leading-snug mb-2" dir={dir}>
              <span className="text-stone-500 text-xs uppercase tracking-widest mr-2">
                {language === "he" ? "משמעות" : language === "ar" ? "المعنى" : "Meaning"}
              </span>
              {localizedMeaning}
            </p>
            <p className="italic text-stone-700 text-sm leading-snug" dir="ltr">
              "{current.example}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action row — Next / End */}
      <div className="mt-6 flex items-center gap-3">
        {picked && (
          <button
            type="button"
            onClick={handleNext}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-white shadow-md hover:opacity-90 ${theme.fill}`}
          >
            {questionIdx + 1 >= round.length
              ? (language === "he" ? "סיום" : language === "ar" ? "إنهاء" : "Finish")
              : (language === "he" ? "הבא" : language === "ar" ? "التالي" : "Next")}
            <ArrowRight size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={handleEnd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition"
        >
          <X size={16} />
          {language === "he" ? "סיים" : language === "ar" ? "إنهاء" : "End round"}
        </button>
      </div>
    </div>
  );
}
