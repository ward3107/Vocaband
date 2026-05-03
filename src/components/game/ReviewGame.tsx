/**
 * ReviewGame — self-contained spaced-repetition review mode.
 *
 * Pulls today's due words from `get_due_reviews` and runs a
 * Classic-style multi-choice question on each (English word →
 * 4 translation options).  After each answer:
 *   - Calls record_review_result(word_id, is_correct) so the server
 *     advances the interval (correct → next step) or resets it
 *     (wrong → step 0 = tomorrow).
 *   - Animates a green/red flash, advances after 350ms.
 *
 * After the queue is exhausted (or End is tapped), onFinish fires
 * with the count of correct answers so saveScore can record the
 * play.  The Review mode counts as 'review' for the gameMode field
 * — surfaces in analytics distinctly from Classic.
 *
 * Empty-queue state: the dashboard widget gates entry, so reaching
 * this component means there were due words at the time of
 * navigation.  As a safety net we still render a friendly "All
 * caught up!" if the queue comes back empty (e.g. another tab
 * cleared it).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X, ArrowRight, Brain, CheckCircle2, Loader2 } from 'lucide-react';
import type { Word } from '../../data/vocabulary';
import { supabase } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';
import { useVocabularyLazy } from '../../hooks/useVocabularyLazy';
import { type GameThemeColor, getThemeColors } from './GameShell';
import type { ReviewScheduleRow } from '../../hooks/useDueReviews';

interface ReviewGameProps {
  /** Optional pool of words for distractor generation.  When omitted
   *  (the default for the dashboard-launched Review mode) the
   *  component lazy-loads ALL_WORDS itself, since reviews span every
   *  word the student has ever missed across assignments — not just
   *  the active assignment's pool. */
  allWords?: Word[];
  themeColor: GameThemeColor;
  targetLanguage: 'hebrew' | 'arabic';
  /** Speak the prompt word aloud. */
  speak: (wordId: number, fallbackText?: string) => void;
  /** Called when the round ends — passes the count correct out of total. */
  onFinish: (correctCount: number, totalCount: number) => void;
}

interface Question {
  word: Word;
  options: Word[];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function translationOf(word: Word, lang: 'hebrew' | 'arabic'): string {
  return lang === 'hebrew' ? word.hebrew || '' : word.arabic || '';
}

function buildQuestion(target: Word, pool: Word[]): Question | null {
  if (!target) return null;
  const others = pool.filter(w => w.id !== target.id);
  const distractors = shuffle(others).slice(0, 3);
  if (distractors.length < 1) return null;
  const options = shuffle([target, ...distractors]);
  return { word: target, options };
}

export default function ReviewGame({
  allWords: passedWords,
  themeColor,
  targetLanguage,
  speak,
  onFinish,
}: ReviewGameProps) {
  const { language, dir } = useLanguage();
  const theme = getThemeColors(themeColor);

  // Lazy-load the vocabulary chunk if the caller didn't pass one in.
  // Most callers (dashboard widget) won't — Review mode spans the
  // entire word universe rather than an assignment's word pool.
  const vocab = useVocabularyLazy(!passedWords);
  const allWords: Word[] = passedWords ?? vocab?.ALL_WORDS ?? [];

  // Self-fetch the due-words queue on mount.  Keeps ReviewGame fully
  // self-contained — App.tsx doesn't need to know about the SRS data
  // layer.
  const [dueWords, setDueWords] = useState<ReviewScheduleRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
        const { data, error } = await supabase.rpc('get_due_reviews', {
          p_today_local: today,
          p_limit: 15,
        });
        if (cancelled) return;
        if (error) {
          console.error('[srs] get_due_reviews failed:', error);
          setDueWords([]);
          return;
        }
        setDueWords((data ?? []) as ReviewScheduleRow[]);
      } catch (err) {
        if (!cancelled) {
          console.error('[srs] get_due_reviews threw:', err);
          setDueWords([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Materialise the queue: hydrate ReviewScheduleRow → Word objects
  // by looking up word_id in allWords.  Filter out any that no longer
  // exist in the dataset (rare — defensive against stale rows that
  // outlived a vocab cleanup).
  const queue = useMemo<Word[]>(() => {
    if (!dueWords) return [];
    return dueWords
      .map(row => allWords.find(w => w.id === row.word_id))
      .filter((w): w is Word => Boolean(w));
  }, [dueWords, allWords]);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<Word | null>(null);
  const submittedRef = useRef(false);

  // Loading state while the queue OR vocabulary fetches.
  if (dueWords === null || (allWords.length === 0 && !passedWords)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const target = queue[questionIdx];
  const question = useMemo(() => target ? buildQuestion(target, allWords) : null, [target, allWords]);

  // Speak the word when a new question loads.  No replay loop needed
  // — the student has a Replay button below the prompt.
  useEffect(() => {
    if (!target) return;
    setPicked(null);
    speak(target.id, target.english);
  }, [target, speak]);

  // Empty-state: the queue is empty when the component mounts.  This
  // shouldn't happen via normal navigation (the dashboard widget
  // gates entry) but a multi-tab edge case could clear the queue
  // between widget render and Review-mode mount.
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4" dir={dir}>
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-2">
          {language === 'he' ? 'הכל מעודכן!' : language === 'ar' ? 'كل شيء محدث!' : 'All caught up!'}
        </h2>
        <p className="text-stone-600 text-sm mb-6 text-center max-w-sm">
          {language === 'he'
            ? 'אין מילים לחזרה כרגע. המשך לשחק כדי לבנות את התור.'
            : language === 'ar'
            ? 'لا توجد كلمات للمراجعة الآن. واصل اللعب لبناء قائمة المراجعة.'
            : 'No words to review right now. Keep playing to build the queue.'}
        </p>
        <button
          type="button"
          onClick={() => onFinish(0, 0)}
          className={`px-5 py-2.5 rounded-xl font-black text-white shadow-md hover:opacity-90 ${theme.fill}`}
        >
          {language === 'he' ? 'חזרה' : language === 'ar' ? 'العودة' : 'Back'}
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
        <p className="text-stone-500">
          {language === 'he' ? 'טוען...' : language === 'ar' ? 'جارٍ التحميل...' : 'Loading…'}
        </p>
      </div>
    );
  }

  const handlePick = (opt: Word) => {
    if (picked || submittedRef.current) return;
    submittedRef.current = true;
    setPicked(opt);
    const isCorrect = opt.id === question.word.id;
    if (isCorrect) setCorrect(c => c + 1);

    // Fire-and-forget the server-side interval update.  We don't
    // await it because the next-question UX shouldn't wait on a
    // network round-trip; if the call fails the student can still
    // play through, and the same word will resurface in tomorrow's
    // queue (worst case = the interval doesn't advance).
    // Wrap in an async IIFE — supabase.rpc returns a PostgrestBuilder
    // which is thenable but not a true Promise (no .catch).  The IIFE
    // gives us a real Promise we can attach error handling to.
    void (async () => {
      try {
        await supabase.rpc('record_review_result', {
          p_word_id: question.word.id,
          p_is_correct: isCorrect,
        });
      } catch (err) {
        console.error('[srs] record_review_result failed:', err);
      }
    })();

    // Reveal flash for 700ms then advance.
    window.setTimeout(() => {
      submittedRef.current = false;
      if (questionIdx + 1 >= queue.length) {
        onFinish(isCorrect ? correct + 1 : correct, queue.length);
      } else {
        setQuestionIdx(i => i + 1);
      }
    }, 700);
  };

  const handleEnd = () => onFinish(correct, queue.length);

  return (
    <div className="flex flex-col items-center px-4 py-6 sm:py-10 w-full" dir="ltr">
      {/* Top status row: progress + score */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-3 mb-4">
        <div className={`px-4 py-2 rounded-full font-black text-sm ${theme.pillBg} ${theme.pillText} shadow-md flex items-center gap-1.5`}>
          <Brain size={14} />
          {language === 'he' ? 'חזרה' : language === 'ar' ? 'مراجعة' : 'Review'} {questionIdx + 1}/{queue.length}
        </div>
        <div className="px-3 py-2 rounded-full font-black text-sm bg-emerald-100 text-emerald-700 shadow-md">
          ✓ {correct}
        </div>
      </div>

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
        aria-label="Replay audio"
      >
        <Volume2 size={14} />
        {language === 'he' ? 'השמע שוב' : language === 'ar' ? 'أعد التشغيل' : 'Replay'}
      </button>

      {/* Hint label */}
      <p className="mt-4 mb-3 text-center text-sm sm:text-base text-stone-600 font-semibold" dir={dir}>
        {language === 'he'
          ? 'בחר את התרגום הנכון'
          : language === 'ar'
          ? 'اختر الترجمة الصحيحة'
          : 'Pick the correct translation'}
      </p>

      {/* Option grid */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          const isPicked = picked?.id === opt.id;
          const isCorrect = opt.id === question.word.id;
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
              key={`${opt.id}-${i}`}
              whileTap={!showResult ? { scale: 0.98 } : undefined}
              onClick={() => handlePick(opt)}
              disabled={showResult}
              type="button"
              dir={targetLanguage === 'hebrew' || targetLanguage === 'arabic' ? 'rtl' : 'ltr'}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className={`px-4 py-4 sm:py-5 rounded-2xl text-center font-black text-lg sm:text-xl transition-all shadow-sm ${stateClasses}`}
            >
              {translationOf(opt, targetLanguage) || opt.english}
            </motion.button>
          );
        })}
      </div>

      {/* End button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleEnd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition"
        >
          <X size={16} />
          {language === 'he' ? 'סיים' : language === 'ar' ? 'إنهاء' : 'End review'}
        </button>
      </div>

      {/* Brief reveal flash */}
      <AnimatePresence>
        {picked && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mt-4 text-sm font-bold ${
              picked.id === question.word.id ? 'text-emerald-700' : 'text-rose-700'
            }`}
            dir={dir}
          >
            {picked.id === question.word.id
              ? (language === 'he' ? 'נכון! המילה תחזור עוד יותר זמן ✨'
                : language === 'ar' ? 'صحيح! ستعود الكلمة بعد فترة أطول ✨'
                : 'Correct! Next review pushed further out ✨')
              : (language === 'he' ? `המילה הנכונה: ${translationOf(question.word, targetLanguage)}`
                : language === 'ar' ? `الإجابة الصحيحة: ${translationOf(question.word, targetLanguage)}`
                : `Correct answer: ${translationOf(question.word, targetLanguage)}`)}
            <ArrowRight size={14} className="inline ml-1" />
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
