/**
 * RelationsGame — "pick the synonym" / "pick the antonym" mode.
 *
 * Self-contained mode (similar to WordChainsGame, IdiomGame,
 * SpeedRoundGame): doesn't slot into the per-question orchestration
 * GameActiveView uses for Classic / Listening because the question
 * source is the curated `RELATIONS` dataset, not the assignment
 * word pool.
 *
 * Round structure:
 *   1. Pick N random entries from RELATIONS (default 10).
 *   2. For each entry, randomly pick "synonym" or "antonym" question
 *      type — alternates so a round doesn't end up all one type.
 *   3. Show the base word + the prompt ("Pick the synonym").
 *   4. 4 options: 1 correct (random pick from the matching list) +
 *      3 distractors drawn from OTHER entries' relations, excluding
 *      anything that's also in the same list (so the antonym
 *      question doesn't accidentally have a co-equal antonym as a
 *      distractor).
 *   5. Reveal flash on pick, advance after 700ms.
 *   6. End → onFinish with the count correct.
 *
 * Pedagogy note: the distractor pool intentionally INCLUDES words
 * that are the OPPOSITE relation of the prompt.  E.g., for "happy →
 * antonym?", the distractors might include "glad" (a synonym).  This
 * is the most common student confusion and worth practising — they
 * have to actually understand the question, not just match by topic.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Volume2 } from 'lucide-react';
import { RELATIONS, ALL_RELATION_WORDS, type WordRelation } from '../../data/word-relations';
import { useLanguage } from '../../hooks/useLanguage';
import { gameAriasT } from '../../locales/student/game-arias';
import { type GameThemeColor, getThemeColors } from './GameShell';

interface RelationsGameProps {
  themeColor: GameThemeColor;
  /** TTS for the base word + correct answer on reveal. */
  speak: (text: string) => void;
  /** Called when the round ends.  Score = correct count. */
  onFinish: (correctCount: number) => void;
  /** Override for testing — production rounds are 10 questions. */
  questionsPerRound?: number;
}

type QuestionType = 'synonym' | 'antonym';

interface Question {
  base: string;
  type: QuestionType;
  /** Correct answer (one valid pick from the matching relation list). */
  answer: string;
  /** Four shuffled options including the answer. */
  options: string[];
  /** All valid answers from the matching list — used so a distractor
   *  filter can exclude OTHER valid answers that aren't `answer`. */
  validAnswers: string[];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickOne<T>(arr: readonly T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build a single question.  Returns null if the entry doesn't have
 *  enough relations of the chosen type (rare — the dataset is
 *  curated so every entry has both). */
function buildQuestion(entry: WordRelation, type: QuestionType): Question | null {
  const validAnswers = type === 'synonym' ? entry.synonyms : entry.antonyms;
  if (validAnswers.length === 0) return null;
  const answer = pickOne(validAnswers);
  if (!answer) return null;

  // Distractor pool: all relation words except
  //   - the base word itself
  //   - any other valid answer for THIS question (so we don't pick
  //     "joyful" as a distractor for a "happy → synonym → glad" Q)
  const exclude = new Set<string>([
    entry.english.toLowerCase(),
    ...validAnswers.map(s => s.toLowerCase()),
  ]);
  const candidates = ALL_RELATION_WORDS.filter(w => !exclude.has(w.toLowerCase()));
  const distractors = shuffle(candidates).slice(0, 3);
  if (distractors.length < 3) {
    // Tiny dataset / heavy exclusion — pad with random words anyway.
    while (distractors.length < 3 && candidates.length > 0) {
      distractors.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }

  const options = shuffle([answer, ...distractors]);
  return { base: entry.english, type, answer, options, validAnswers };
}

export default function RelationsGame({
  themeColor,
  speak,
  onFinish,
  questionsPerRound = 10,
}: RelationsGameProps) {
  const { language, dir } = useLanguage();
  const tAria = gameAriasT[language];
  const theme = getThemeColors(themeColor);

  // Build the round's questions once on mount.  Alternate syn/ant
  // (50/50) within the round so the student practises both directions.
  const round = useMemo<Question[]>(() => {
    const entries = shuffle(RELATIONS).slice(0, Math.min(questionsPerRound, RELATIONS.length));
    const out: Question[] = [];
    entries.forEach((entry, i) => {
      // Alternate types — even index = syn, odd = ant — but flip a coin
      // on the first one so two consecutive rounds aren't identical.
      const typePref: QuestionType = (i + Math.floor(Math.random() * 2)) % 2 === 0 ? 'synonym' : 'antonym';
      const q = buildQuestion(entry, typePref);
      if (q) out.push(q);
    });
    return out;
  }, [questionsPerRound]);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const current = round[questionIdx];

  // Speak the base word when a new question loads.  Skip on the very
  // first render so the student gets a chance to read first.
  useEffect(() => {
    if (!current) return;
    setPicked(null);
    submittedRef.current = false;
    if (questionIdx > 0) speak(current.base);
  }, [current, questionIdx, speak]);

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
        <p className="text-stone-500">
          {language === 'he' ? 'אין שאלות זמינות' : language === 'ar' ? 'لا توجد أسئلة متاحة' : 'No questions available'}
        </p>
      </div>
    );
  }

  const handlePick = (opt: string) => {
    if (picked || submittedRef.current) return;
    submittedRef.current = true;
    setPicked(opt);
    // Correct if EXACTLY the displayed answer (not just any valid
    // answer — the option grid only contains one valid answer because
    // distractors are filtered against validAnswers).
    if (opt === current.answer) setScore(s => s + 1);
    // Speak the correct word so the student hears it associated
    // with the base word, regardless of whether they got it right.
    speak(current.answer);
  };

  const handleNext = () => {
    if (questionIdx + 1 >= round.length) {
      onFinish(score);
      return;
    }
    setQuestionIdx(i => i + 1);
  };

  const handleEnd = () => onFinish(score);

  const promptLabel = (() => {
    if (current.type === 'synonym') {
      return language === 'he' ? 'בחר מילה נרדפת'
        : language === 'ar' ? 'اختر كلمة مرادفة'
        : 'Pick the synonym';
    }
    return language === 'he' ? 'בחר מילה הפוכה'
      : language === 'ar' ? 'اختر كلمة معاكسة'
      : 'Pick the antonym';
  })();

  // Color-code the prompt chip by question type so the student gets
  // an at-a-glance reminder which direction they're answering.
  const typeChipClasses = current.type === 'synonym'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';

  return (
    <div className="flex flex-col items-center px-4 py-6 sm:py-10 w-full" dir="ltr">
      {/* Top status row */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-3 mb-4">
        <div className={`px-4 py-2 rounded-full font-black text-sm ${theme.pillBg} ${theme.pillText} shadow-md`}>
          {language === 'he' ? 'מילים' : language === 'ar' ? 'كلمات' : 'Relations'} {questionIdx + 1}/{round.length}
        </div>
        <div className="px-3 py-2 rounded-full font-black text-sm bg-emerald-100 text-emerald-700 shadow-md">
          ✓ {score}
        </div>
      </div>

      {/* Prompt-type chip — emerald for synonym, rose for antonym */}
      <div className={`mb-3 px-3 py-1 rounded-full font-black text-[11px] uppercase tracking-widest ${typeChipClasses}`} dir={dir}>
        {promptLabel}
      </div>

      {/* Big base word */}
      <div className="mb-2 text-center">
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          {current.base}
        </h2>
      </div>
      <button
        type="button"
        onClick={() => speak(current.base)}
        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
        aria-label={tAria.replayAudio}
      >
        <Volume2 size={14} />
        {language === 'he' ? 'השמע שוב' : language === 'ar' ? 'أعد التشغيل' : 'Replay'}
      </button>

      {/* Option grid */}
      <div className="mt-5 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.options.map((opt, i) => {
          const isPicked = picked === opt;
          const isCorrect = opt === current.answer;
          const showResult = picked != null;
          let stateClasses = `bg-white border-2 ${theme.border} ${theme.hoverBg}`;
          if (showResult) {
            if (isCorrect) {
              stateClasses = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900';
            } else if (isPicked) {
              stateClasses = 'bg-rose-50 border-2 border-rose-500 text-rose-900';
            } else {
              stateClasses = 'bg-stone-50 border-2 border-stone-200 opacity-60';
            }
          }
          return (
            <motion.button
              key={`${opt}-${i}`}
              whileTap={!showResult ? { scale: 0.98 } : undefined}
              onClick={() => handlePick(opt)}
              disabled={showResult}
              type="button"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className={`px-4 py-4 sm:py-5 rounded-2xl text-center font-black text-lg sm:text-xl transition-all shadow-sm ${stateClasses}`}
            >
              <span className="inline-block w-7 h-7 mr-2 rounded-full bg-stone-100 text-stone-700 text-xs font-black leading-7 text-center">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </motion.button>
          );
        })}
      </div>

      {/* Reveal panel — shows ALL valid answers when student picked,
          so they learn the other synonyms / antonyms too (depth) */}
      <AnimatePresence>
        {picked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mt-5 w-full max-w-2xl rounded-2xl border-2 p-4 sm:p-5 ${
              picked === current.answer ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}
          >
            <p className={`font-black text-sm sm:text-base mb-2 ${picked === current.answer ? 'text-emerald-700' : 'text-rose-700'}`} dir={dir}>
              {picked === current.answer
                ? (language === 'he' ? 'נכון! 🎉' : language === 'ar' ? 'صحيح! 🎉' : 'Correct! 🎉')
                : (language === 'he' ? `התשובה הנכונה: ${current.answer}`
                  : language === 'ar' ? `الإجابة الصحيحة: ${current.answer}`
                  : `Correct answer: ${current.answer}`)}
            </p>
            {/* All valid answers — extra learning even when they got it right */}
            <p className="text-xs sm:text-sm text-stone-700 leading-snug" dir={dir}>
              <span className="text-stone-500 uppercase tracking-widest text-[10px] mr-2">
                {current.type === 'synonym'
                  ? (language === 'he' ? 'נרדפות' : language === 'ar' ? 'مرادفات' : 'Synonyms')
                  : (language === 'he' ? 'הפוכות' : language === 'ar' ? 'متضادات' : 'Antonyms')}
              </span>
              <span className="font-bold">{current.validAnswers.join(', ')}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action row */}
      <div className="mt-6 flex items-center gap-3">
        {picked && (
          <button
            type="button"
            onClick={handleNext}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-white shadow-md hover:opacity-90 ${theme.fill}`}
          >
            {questionIdx + 1 >= round.length
              ? (language === 'he' ? 'סיום' : language === 'ar' ? 'إنهاء' : 'Finish')
              : (language === 'he' ? 'הבא' : language === 'ar' ? 'التالي' : 'Next')}
            <ArrowRight size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={handleEnd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition"
        >
          <X size={16} />
          {language === 'he' ? 'סיים' : language === 'ar' ? 'إنهاء' : 'End round'}
        </button>
      </div>
    </div>
  );
}
