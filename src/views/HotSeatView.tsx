/**
 * HotSeatView — single-device, pass-around classroom game.
 *
 * Built for the half of Israeli classrooms where not every student
 * has a phone (grades 4–6, religious schools, lower-income areas).
 * Kahoot needs N devices for N students; hot-seat needs ONE — the
 * teacher's tablet or phone.
 *
 * Three phases, all owned by this single component:
 *   1. setup        — teacher types player names, picks target
 *                     language + questions-per-player, taps Start
 *   2. interstitial — "Pass to {Name}" full-screen prompt; the
 *                     student walks up + taps "I'm Ready" to reveal
 *                     the question (no peeking from their seat)
 *   3. question     — single Classic-style multi-choice question
 *                     (English word → 4 translation options); answer
 *                     reveals correct/wrong, then auto-advances after
 *                     1.2s back to the next player's interstitial
 *   4. done         — podium with medals + Play Again / Exit
 *
 * Scope decisions for v1:
 *   - Word source is SET_2_WORDS (the curriculum-2 pool).  Picker for
 *     specific assignments is a v2 — keeps the setup screen short and
 *     gets the demo running tonight.
 *   - Scores live in component state only.  Nothing is saved to
 *     Supabase — the players aren't logged in (they're sharing the
 *     teacher's device), so there's no user.uid to attribute to.  The
 *     final podium is the deliverable.
 *   - Question shell is duplicated from SpeedRoundGame's pattern
 *     rather than refactored into a shared component, same reason as
 *     ReviewGame + SpeedRoundGame: self-contained = no risk of
 *     breaking other modes for a v1.  Worth factoring out in a v2 if
 *     a third pass-around mode shows up.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Users, ArrowRight, Volume2, X, ChevronRight, Play } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useVocabularyLazy } from "../hooks/useVocabularyLazy";
import type { Word } from "../data/vocabulary";

interface HotSeatViewProps {
  onExit: () => void;
  speak: (wordId: number, fallbackText?: string) => void;
}

type Phase = 'setup' | 'interstitial' | 'question' | 'done';
type TargetLang = 'hebrew' | 'arabic';

interface PlayerScore {
  name: string;
  correct: number;
  total: number;
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

function translationOf(word: Word, lang: TargetLang): string {
  return lang === 'hebrew' ? word.hebrew || '' : word.arabic || '';
}

function buildQuestion(pool: Word[]): Question | null {
  if (pool.length < 4) return null;
  const correctIdx = Math.floor(Math.random() * pool.length);
  const correct = pool[correctIdx];
  const others = pool.filter((_, i) => i !== correctIdx);
  const distractors = shuffle(others).slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  return { word: correct, options };
}

const STRINGS: Record<'en' | 'he' | 'ar', {
  title: string;
  subtitle: string;
  playersLabel: string;
  playersPlaceholder: string;
  playersHint: string;
  translateTo: string;
  hebrew: string;
  arabic: string;
  qpp: string;
  startBtn: string;
  exitBtn: string;
  needTwo: string;
  loadingWords: string;
  passTo: string;
  passToTurn: (n: number, total: number) => string;
  readyBtn: string;
  questionOf: (n: number, total: number) => string;
  pickHebrew: string;
  pickArabic: string;
  correct: string;
  wrong: string;
  correctAnswer: string;
  replay: string;
  podiumTitle: string;
  podiumSubtitle: string;
  playAgain: string;
  done: string;
  scoreOf: (correct: number, total: number) => string;
}> = {
  en: {
    title: 'Hot Seat',
    subtitle: 'Pass-around classroom mode — one device, many players.',
    playersLabel: 'Players (one name per line)',
    playersPlaceholder: 'Sarah\nDaniel\nMaya\n…',
    playersHint: 'Need at least 2 players.',
    translateTo: 'Translate to:',
    hebrew: 'Hebrew',
    arabic: 'Arabic',
    qpp: 'Questions per player',
    startBtn: 'Start Hot Seat',
    exitBtn: 'Back',
    needTwo: 'Add at least 2 player names to start.',
    loadingWords: 'Loading words…',
    passTo: 'Pass to',
    passToTurn: (n, total) => `Question ${n} of ${total}`,
    readyBtn: "I'm ready →",
    questionOf: (n, total) => `Q ${n}/${total}`,
    pickHebrew: 'Pick the Hebrew translation',
    pickArabic: 'Pick the Arabic translation',
    correct: 'Correct!',
    wrong: 'Not quite —',
    correctAnswer: 'Correct answer:',
    replay: 'Replay',
    podiumTitle: 'Hot Seat results',
    podiumSubtitle: 'Final scores',
    playAgain: 'Play again',
    done: 'Done',
    scoreOf: (correct, total) => `${correct}/${total}`,
  },
  he: {
    title: 'כיסא חם',
    subtitle: 'מצב כיתה במכשיר אחד — מעבירים את המכשיר בין השחקנים.',
    playersLabel: 'שחקנים (שם אחד בכל שורה)',
    playersPlaceholder: 'שרה\nדניאל\nמאיה\n…',
    playersHint: 'צריך לפחות 2 שחקנים.',
    translateTo: 'תרגום ל:',
    hebrew: 'עברית',
    arabic: 'ערבית',
    qpp: 'שאלות לכל שחקן',
    startBtn: 'התחל כיסא חם',
    exitBtn: 'חזור',
    needTwo: 'הוסף לפחות 2 שמות שחקנים כדי להתחיל.',
    loadingWords: 'טוען מילים…',
    passTo: 'העבר ל',
    passToTurn: (n, total) => `שאלה ${n} מתוך ${total}`,
    readyBtn: 'אני מוכן →',
    questionOf: (n, total) => `${n}/${total}`,
    pickHebrew: 'בחר את התרגום לעברית',
    pickArabic: 'בחר את התרגום לערבית',
    correct: 'נכון!',
    wrong: 'לא בדיוק —',
    correctAnswer: 'התשובה הנכונה:',
    replay: 'השמע שוב',
    podiumTitle: 'תוצאות כיסא חם',
    podiumSubtitle: 'ניקוד סופי',
    playAgain: 'שחק שוב',
    done: 'סיום',
    scoreOf: (correct, total) => `${correct}/${total}`,
  },
  ar: {
    title: 'الكرسي الساخن',
    subtitle: 'وضع الصف بجهاز واحد — مرّر الجهاز بين اللاعبين.',
    playersLabel: 'اللاعبون (اسم واحد في كل سطر)',
    playersPlaceholder: 'سارة\nدانيال\nمايا\n…',
    playersHint: 'تحتاج إلى لاعبَين على الأقل.',
    translateTo: 'الترجمة إلى:',
    hebrew: 'العبرية',
    arabic: 'العربية',
    qpp: 'الأسئلة لكل لاعب',
    startBtn: 'ابدأ الكرسي الساخن',
    exitBtn: 'رجوع',
    needTwo: 'أضف اسمَي لاعبَين على الأقل للبدء.',
    loadingWords: 'جارٍ تحميل الكلمات…',
    passTo: 'مرّر إلى',
    passToTurn: (n, total) => `السؤال ${n} من ${total}`,
    readyBtn: 'أنا جاهز →',
    questionOf: (n, total) => `${n}/${total}`,
    pickHebrew: 'اختر الترجمة العبرية',
    pickArabic: 'اختر الترجمة العربية',
    correct: 'صحيح!',
    wrong: 'ليس تمامًا —',
    correctAnswer: 'الإجابة الصحيحة:',
    replay: 'إعادة',
    podiumTitle: 'نتائج الكرسي الساخن',
    podiumSubtitle: 'النتائج النهائية',
    playAgain: 'العب مرة أخرى',
    done: 'تم',
    scoreOf: (correct, total) => `${correct}/${total}`,
  },
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function HotSeatView({ onExit, speak }: HotSeatViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  // Lazy-loads the vocabulary chunk on mount.  wordPool stays empty
  // until the dynamic import resolves; the setup phase shows a
  // loading line in that brief window so the Start button can't fire
  // against an empty pool.
  const vocab = useVocabularyLazy(true);
  const wordPool: Word[] = vocab?.SET_2_WORDS ?? [];

  const [phase, setPhase] = useState<Phase>('setup');
  const [playersText, setPlayersText] = useState('');
  const [questionsPerPlayer, setQuestionsPerPlayer] = useState(5);
  const [targetLang, setTargetLang] = useState<TargetLang>('hebrew');

  // Round state — only meaningful after Start was tapped.
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<Word | null>(null);
  const submittedRef = useRef(false);

  const handleStart = () => {
    const names = playersText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    if (names.length < 2) return;
    if (wordPool.length < 4) return;
    setPlayers(names.map(name => ({ name, correct: 0, total: 0 })));
    setCurrentPlayerIdx(0);
    setQuestionNumber(1);
    setPhase('interstitial');
  };

  const handleReady = () => {
    const q = buildQuestion(wordPool);
    if (!q) return;
    setQuestion(q);
    setPicked(null);
    submittedRef.current = false;
    setPhase('question');
    speak(q.word.id, q.word.english);
  };

  const handleAnswer = (opt: Word) => {
    if (picked || submittedRef.current || !question) return;
    submittedRef.current = true;
    setPicked(opt);
    const isCorrect = opt.id === question.word.id;
    setPlayers(prev => prev.map((p, i) => i === currentPlayerIdx ? {
      ...p,
      correct: p.correct + (isCorrect ? 1 : 0),
      total: p.total + 1,
    } : p));
    window.setTimeout(() => {
      // Determine the next slot.  Players answer in rotation; once we
      // wrap back to player 0 the question number bumps.  When the
      // question number passes the cap, the round is done.
      const nextPlayerIdx = (currentPlayerIdx + 1) % players.length;
      const nextQ = nextPlayerIdx === 0 ? questionNumber + 1 : questionNumber;
      if (nextQ > questionsPerPlayer) {
        setPhase('done');
        return;
      }
      setCurrentPlayerIdx(nextPlayerIdx);
      setQuestionNumber(nextQ);
      setPhase('interstitial');
    }, 1200);
  };

  const handlePlayAgain = () => {
    // Keeps the same player list + settings; resets scores so a class
    // can run round after round without retyping names.
    setPlayers(prev => prev.map(p => ({ ...p, correct: 0, total: 0 })));
    setCurrentPlayerIdx(0);
    setQuestionNumber(1);
    setPhase('interstitial');
  };

  const parsedNameCount = playersText
    .split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0).length;

  // ── SETUP ───────────────────────────────────────────────────────
  if (phase === 'setup') {
    const canStart = parsedNameCount >= 2 && wordPool.length >= 4;
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50 p-4 sm:p-6" dir={dir}>
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={onExit}
            style={{ touchAction: 'manipulation' }}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900"
          >
            <X size={16} />
            {t.exitBtn}
          </button>

          <div className="rounded-3xl bg-white shadow-lg border border-orange-100 overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 px-6 py-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Users size={26} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black">{t.title}</h1>
                  <p className="text-white/85 text-sm">{t.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  {t.playersLabel}
                </label>
                <textarea
                  value={playersText}
                  onChange={e => setPlayersText(e.target.value)}
                  placeholder={t.playersPlaceholder}
                  rows={6}
                  dir={dir}
                  className="w-full rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none px-3 py-2.5 text-base font-semibold text-stone-800 placeholder:text-stone-400 placeholder:font-normal"
                />
                <p className="mt-1 text-xs text-stone-500">{t.playersHint}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-stone-700 mb-2">{t.translateTo}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['hebrew', 'arabic'] as TargetLang[]).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setTargetLang(lang)}
                      style={{ touchAction: 'manipulation' }}
                      className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                        targetLang === lang
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-orange-200'
                      }`}
                    >
                      {lang === 'hebrew' ? t.hebrew : t.arabic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  {t.qpp}
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5, 8, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuestionsPerPlayer(n)}
                      style={{ touchAction: 'manipulation' }}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                        questionsPerPlayer === n
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-amber-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Play size={18} />
                {wordPool.length < 4 ? t.loadingWords : t.startBtn}
                {wordPool.length >= 4 && <ChevronRight size={18} />}
              </button>
              {parsedNameCount < 2 && (
                <p className="text-xs text-rose-600 font-semibold text-center -mt-2">{t.needTwo}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── INTERSTITIAL — "Pass to {Name}" ─────────────────────────────
  if (phase === 'interstitial') {
    const player = players[currentPlayerIdx];
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-100 to-rose-100 flex items-center justify-center p-4" dir={dir}>
        <motion.div
          key={`${currentPlayerIdx}-${questionNumber}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full text-center"
        >
          <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-600 mb-3">{t.passTo}</p>
          <h2 className="text-5xl sm:text-7xl font-black text-stone-900 mb-4 break-words">
            {player.name}
          </h2>
          <p className="text-base font-bold text-stone-600 mb-8">
            {t.passToTurn(questionNumber, questionsPerPlayer)}
          </p>
          <button
            type="button"
            onClick={handleReady}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {t.readyBtn}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── QUESTION ─────────────────────────────────────────────────────
  if (phase === 'question' && question) {
    const player = players[currentPlayerIdx];
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50 px-4 py-6 sm:py-10 flex flex-col items-center" dir="ltr">
        {/* Status row */}
        <div className="w-full max-w-2xl flex items-center justify-between gap-3 mb-6" dir={dir}>
          <div className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-wider">
            {player.name}
          </div>
          <div className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-black">
            {t.questionOf(questionNumber, questionsPerPlayer)}
          </div>
          <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
            ✓ {player.correct}
          </div>
        </div>

        {/* Prompt */}
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 text-center mb-2">
          {question.word.english}
        </h2>
        <button
          type="button"
          onClick={() => speak(question.word.id, question.word.english)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition mb-5"
          aria-label={t.replay}
        >
          <Volume2 size={14} />
          {t.replay}
        </button>

        <p className="mb-4 text-sm font-bold text-stone-600" dir={dir}>
          {targetLang === 'hebrew' ? t.pickHebrew : t.pickArabic}
        </p>

        {/* Options */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt, i) => {
            const isPicked = picked?.id === opt.id;
            const isCorrect = opt.id === question.word.id;
            const showResult = picked != null;
            let cls = 'bg-white border-2 border-stone-200 hover:border-orange-300';
            if (showResult) {
              if (isCorrect) {
                cls = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900';
              } else if (isPicked) {
                cls = 'bg-rose-50 border-2 border-rose-500 text-rose-900';
              } else {
                cls = 'bg-stone-50 border-2 border-stone-200 opacity-60';
              }
            }
            return (
              <motion.button
                key={`${opt.id}-${i}`}
                whileTap={!showResult ? { scale: 0.98 } : undefined}
                onClick={() => handleAnswer(opt)}
                disabled={showResult}
                type="button"
                dir={targetLang === 'hebrew' || targetLang === 'arabic' ? 'rtl' : 'ltr'}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`px-4 py-4 sm:py-5 rounded-2xl text-center font-black text-lg sm:text-xl transition-all shadow-sm ${cls}`}
              >
                {translationOf(opt, targetLang) || opt.english}
              </motion.button>
            );
          })}
        </div>

        {/* Reveal flash */}
        <AnimatePresence>
          {picked && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`mt-5 text-sm font-bold ${
                picked.id === question.word.id ? 'text-emerald-700' : 'text-rose-700'
              }`}
              dir={dir}
            >
              {picked.id === question.word.id
                ? t.correct
                : `${t.wrong} ${t.correctAnswer} ${translationOf(question.word, targetLang)}`}
              <ArrowRight size={14} className="inline ml-1" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── DONE — podium ───────────────────────────────────────────────
  // Sort descending by correct count; ties keep input order (stable).
  const podium = [...players]
    .map((p, originalIdx) => ({ ...p, originalIdx }))
    .sort((a, b) => b.correct - a.correct || a.originalIdx - b.originalIdx);
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-6" dir={dir}>
      <div className="max-w-xl mx-auto">
        <div className="rounded-3xl bg-white shadow-lg border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-6 text-white text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
              <Trophy size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black">{t.podiumTitle}</h1>
            <p className="text-white/85 text-sm">{t.podiumSubtitle}</p>
          </div>

          <div className="px-4 sm:px-6 py-5 space-y-2">
            {podium.map((p, rank) => (
              <div
                key={`${p.name}-${p.originalIdx}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 ${
                  rank === 0
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                    : rank === 1
                    ? 'bg-stone-50 border-stone-200'
                    : rank === 2
                    ? 'bg-orange-50/60 border-orange-100'
                    : 'bg-white border-stone-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl w-8 text-center shrink-0">
                    {rank < 3 ? MEDAL[rank] : <span className="text-stone-400 text-sm font-black">#{rank + 1}</span>}
                  </span>
                  <span className="text-base font-black text-stone-900 truncate">{p.name}</span>
                </div>
                <span className="text-base font-black text-stone-700 tabular-nums shrink-0">
                  {t.scoreOf(p.correct, p.total)}
                </span>
              </div>
            ))}
          </div>

          <div className="px-4 sm:px-6 pb-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePlayAgain}
              style={{ touchAction: 'manipulation' }}
              className="py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm shadow-md active:scale-[0.98] transition-all"
            >
              {t.playAgain}
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{ touchAction: 'manipulation' }}
              className="py-3 rounded-xl bg-stone-100 text-stone-700 font-black text-sm hover:bg-stone-200 active:scale-[0.98] transition-all"
            >
              {t.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
