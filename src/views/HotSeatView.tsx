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
 * Scope decisions:
 *   - Word source: teacher pastes their own word list (one English word
 *     per line) and the app looks each one up against the curriculum
 *     vocabulary for Hebrew/Arabic translations.  If they have saved
 *     assignments (passed from the New Activity wizard), an Assignment
 *     toggle lets them use one of those instead.  Curriculum Sets 1/2/3
 *     are intentionally NOT offered — teachers told us they always have
 *     their own list in mind for Hot Seat and the set picker added
 *     friction.
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
import { useCallback, useMemo, useState, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, Users, ArrowRight, Volume2, X, ChevronRight, Play, BookOpen,
  Camera, Sparkles, Eye, ClipboardPaste, Loader2, AlertTriangle, Image as ImageIcon,
} from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useVocabularyLazy } from "../hooks/useVocabularyLazy";
import type { Word } from "../data/vocabulary";
import InPageCamera from "../components/InPageCamera";
import { postOcrImage, isPostOcrImageError } from "../utils/postOcrImage";

export interface HotSeatAssignment {
  id: string;
  title: string;
  wordIds: number[];
  words?: Word[];
}

export interface HotSeatTopicPack {
  name: string;
  icon: string;
  ids: number[];
}

interface HotSeatViewProps {
  onExit: () => void;
  speak: (wordId: number, fallbackText?: string) => void;
  /** Teacher's saved assignments offered as a word source.  Optional —
   *  if empty/undefined, the picker only shows the three curriculum
   *  Sets.  Filter to the relevant class + language before passing. */
  assignments?: HotSeatAssignment[];
  /** Curriculum-aligned topic packs (Animals, Family, Phrasal Verbs, …).
   *  Same shape as `TOPIC_PACKS` in vocabulary.ts — passing the whole
   *  array is fine, the picker UI scopes display itself. */
  topicPacks?: HotSeatTopicPack[];
}

type Phase = 'setup' | 'interstitial' | 'question' | 'done';
type TargetLang = 'hebrew' | 'arabic';
type SourceKind = 'paste' | 'assignment' | 'camera' | 'topic';
type OcrStatus = 'idle' | 'reading' | 'done' | 'error';

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
  wordsLabel: string;
  sourcePaste: string;
  sourceAssignment: string;
  sourceCamera: string;
  sourceTopic: string;
  pickAssignment: string;
  pickTopic: string;
  wordsPlaceholder: string;
  wordsHint: string;
  cameraHint: string;
  cameraBtn: string;
  galleryBtn: string;
  ocrReading: string;
  ocrError: string;
  ocrFoundCount: (n: number) => string;
  matchedHint: (matched: number, total: number) => string;
  poolHint: (count: number) => string;
  poolTooSmall: string;
  translateTo: string;
  hebrew: string;
  arabic: string;
  qpp: string;
  reviewBtn: (n: number) => string;
  reviewTitle: string;
  reviewSubtitle: (n: number) => string;
  reviewEmpty: string;
  reviewStartBtn: string;
  reviewCancelBtn: string;
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
    wordsLabel: 'Words',
    sourcePaste: 'Paste',
    sourceAssignment: 'Assignment',
    sourceCamera: 'Camera',
    sourceTopic: 'Topic',
    pickAssignment: 'Pick an assignment',
    pickTopic: 'Pick a topic pack',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'One English word per line. We look up the translation in the curriculum.',
    cameraHint: 'Snap a photo of your word list. We read it and pull translations from the curriculum.',
    cameraBtn: 'Take photo',
    galleryBtn: 'Choose from gallery',
    ocrReading: 'Reading words from photo…',
    ocrError: "Couldn't read words from that photo. Try a clearer shot.",
    ocrFoundCount: (n) => `Found ${n} word${n === 1 ? '' : 's'} in the photo`,
    matchedHint: (matched, total) =>
      total === matched
        ? `${matched} words ready`
        : `${matched} of ${total} words found — others skipped`,
    poolHint: (count) => `${count} words available`,
    poolTooSmall: 'Need at least 4 words with the chosen translation.',
    translateTo: 'Translate to:',
    hebrew: 'Hebrew',
    arabic: 'Arabic',
    qpp: 'Questions per player',
    reviewBtn: (n) => `Review ${n} word${n === 1 ? '' : 's'} →`,
    reviewTitle: 'Words to play',
    reviewSubtitle: (n) => `${n} word${n === 1 ? '' : 's'} ready to play`,
    reviewEmpty: 'Pick a source above first.',
    reviewStartBtn: 'Start Hot Seat',
    reviewCancelBtn: 'Cancel',
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
    wordsLabel: 'מילים',
    sourcePaste: 'הדבקה',
    sourceAssignment: 'מטלה',
    sourceCamera: 'מצלמה',
    sourceTopic: 'נושא',
    pickAssignment: 'בחר מטלה',
    pickTopic: 'בחר חבילת נושא',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'מילה אחת באנגלית בכל שורה. נחפש את התרגום באוצר המילים.',
    cameraHint: 'צלם את רשימת המילים שלך. נקרא אותה ונשלוף תרגומים מתכנית הלימודים.',
    cameraBtn: 'צלם תמונה',
    galleryBtn: 'בחר מהגלריה',
    ocrReading: 'קורא מילים מהתמונה…',
    ocrError: 'לא הצלחנו לקרוא מילים מהתמונה. נסה תמונה ברורה יותר.',
    ocrFoundCount: (n) => `נמצאו ${n} מילים בתמונה`,
    matchedHint: (matched, total) =>
      total === matched
        ? `${matched} מילים מוכנות`
        : `${matched} מתוך ${total} מילים נמצאו — האחרות דולגו`,
    poolHint: (count) => `${count} מילים זמינות`,
    poolTooSmall: 'צריך לפחות 4 מילים עם התרגום שנבחר.',
    translateTo: 'תרגום ל:',
    hebrew: 'עברית',
    arabic: 'ערבית',
    qpp: 'שאלות לכל שחקן',
    reviewBtn: (n) => `סקור ${n} מילים ←`,
    reviewTitle: 'מילים למשחק',
    reviewSubtitle: (n) => `${n} מילים מוכנות למשחק`,
    reviewEmpty: 'בחר מקור למעלה קודם.',
    reviewStartBtn: 'התחל כיסא חם',
    reviewCancelBtn: 'ביטול',
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
    wordsLabel: 'الكلمات',
    sourcePaste: 'لصق',
    sourceAssignment: 'مهمة',
    sourceCamera: 'الكاميرا',
    sourceTopic: 'موضوع',
    pickAssignment: 'اختر مهمة',
    pickTopic: 'اختر حزمة موضوع',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'كلمة إنجليزية واحدة في كل سطر. سنبحث عن الترجمة في المفردات.',
    cameraHint: 'التقط صورة لقائمة كلماتك. سنقرأها ونجلب الترجمات من المنهج.',
    cameraBtn: 'التقط صورة',
    galleryBtn: 'اختر من المعرض',
    ocrReading: 'جارٍ قراءة الكلمات من الصورة…',
    ocrError: 'لم نتمكن من قراءة الكلمات من هذه الصورة. جرّب صورة أوضح.',
    ocrFoundCount: (n) => `تم العثور على ${n} كلمة في الصورة`,
    matchedHint: (matched, total) =>
      total === matched
        ? `${matched} كلمات جاهزة`
        : `تم العثور على ${matched} من ${total} كلمات — تم تخطي الباقي`,
    poolHint: (count) => `${count} كلمة متاحة`,
    poolTooSmall: 'يلزم 4 كلمات على الأقل لها الترجمة المختارة.',
    translateTo: 'الترجمة إلى:',
    hebrew: 'العبرية',
    arabic: 'العربية',
    qpp: 'الأسئلة لكل لاعب',
    reviewBtn: (n) => `راجع ${n} كلمة ←`,
    reviewTitle: 'الكلمات للعب',
    reviewSubtitle: (n) => `${n} كلمة جاهزة للعب`,
    reviewEmpty: 'اختر مصدرًا أعلاه أولاً.',
    reviewStartBtn: 'ابدأ الكرسي الساخن',
    reviewCancelBtn: 'إلغاء',
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

export default function HotSeatView({ onExit, speak, assignments, topicPacks }: HotSeatViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  // Lazy-loads the vocabulary chunk on mount.  The setup phase shows a
  // loading line until the dynamic import resolves so Start can't fire
  // against an empty pool.
  const vocab = useVocabularyLazy(true);

  const [phase, setPhase] = useState<Phase>('setup');
  const [playersText, setPlayersText] = useState('');
  const [questionsPerPlayer, setQuestionsPerPlayer] = useState(5);
  const [targetLang, setTargetLang] = useState<TargetLang>('hebrew');
  const [sourceKind, setSourceKind] = useState<SourceKind>('paste');
  const [wordsText, setWordsText] = useState('');
  // Stable reference so the useMemo below doesn't re-run on every parent
  // re-render — `assignments ?? []` would otherwise produce a fresh
  // array each pass and bust the memo.
  const availableAssignments = useMemo(() => assignments ?? [], [assignments]);
  const availableTopics = useMemo(() => topicPacks ?? [], [topicPacks]);
  const [assignmentId, setAssignmentId] = useState<string | null>(
    availableAssignments[0]?.id ?? null,
  );
  const [topicIdx, setTopicIdx] = useState<number>(0);

  // Camera + OCR state.  ocrWords holds the lowercased English tokens
  // returned by /api/ocr; rawPool below looks each up in englishLookup
  // (same path as the paste source) so unknown words are silently
  // skipped instead of breaking the multi-choice.
  const [showCamera, setShowCamera] = useState(false);
  const [ocrWords, setOcrWords] = useState<string[]>([]);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Review-before-start modal.  After picking a source, teacher taps
  // "Review N words →" to see the matched word list with its target-
  // language translation before committing to a round.
  const [showReview, setShowReview] = useState(false);

  // Build a lowercase-english → Word lookup once per vocab load so the
  // paste-source pool doesn't scan ALL_WORDS for every typed line.
  const englishLookup = useMemo(() => {
    if (!vocab) return null;
    const map = new Map<string, Word>();
    for (const w of vocab.ALL_WORDS) {
      map.set(w.english.toLowerCase().trim(), w);
    }
    return map;
  }, [vocab]);

  // Parse the textarea once — both the rawPool and the matched-count
  // hint need it, and re-splitting inline would re-run on every render.
  const pastedLines = useMemo(
    () =>
      wordsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0),
    [wordsText],
  );

  // Resolve the raw pool from the picked source.  Paste-sourced pools
  // match each line against ALL_WORDS by english (case-insensitive);
  // assignment-sourced pools merge in any teacher-uploaded custom words
  // (which carry their own hebrew/arabic from the OCR/Gemini pipeline);
  // camera-sourced pools resolve the OCR-extracted tokens against the
  // same englishLookup as paste; topic-sourced pools take the whole
  // pack's id list straight out of ALL_WORDS.
  const rawPool: Word[] = useMemo(() => {
    if (!vocab) return [];
    if (sourceKind === 'assignment') {
      const a = availableAssignments.find(x => x.id === assignmentId);
      if (!a) return [];
      const known = vocab.ALL_WORDS.filter(w => a.wordIds.includes(w.id));
      const customs = a.words ?? [];
      return [...known, ...customs.filter(c => !known.some(k => k.id === c.id))];
    }
    if (sourceKind === 'topic') {
      const pack = availableTopics[topicIdx];
      if (!pack) return [];
      const idSet = new Set(pack.ids);
      return vocab.ALL_WORDS.filter(w => idSet.has(w.id));
    }
    if (sourceKind === 'camera') {
      if (!englishLookup) return [];
      const matched: Word[] = [];
      const seenIds = new Set<number>();
      for (const tok of ocrWords) {
        const hit = englishLookup.get(tok.toLowerCase().trim());
        if (hit && !seenIds.has(hit.id)) {
          matched.push(hit);
          seenIds.add(hit.id);
        }
      }
      return matched;
    }
    // sourceKind === 'paste' — look each pasted line up in the vocabulary.
    // Unknown words are silently skipped; the matched-count hint tells
    // the teacher how many made it through.
    if (!englishLookup) return [];
    const matched: Word[] = [];
    const seenIds = new Set<number>();
    for (const line of pastedLines) {
      const hit = englishLookup.get(line.toLowerCase());
      if (hit && !seenIds.has(hit.id)) {
        matched.push(hit);
        seenIds.add(hit.id);
      }
    }
    return matched;
  }, [vocab, sourceKind, assignmentId, availableAssignments, pastedLines, englishLookup, topicIdx, availableTopics, ocrWords]);

  // Filter to words that actually have the chosen target translation.
  // A custom word missing its hebrew/arabic would otherwise show up as
  // an English option and break the multi-choice.
  const wordPool: Word[] = useMemo(
    () => rawPool.filter(w => translationOf(w, targetLang).trim().length > 0),
    [rawPool, targetLang],
  );

  // Round state — only meaningful after Start was tapped.
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<Word | null>(null);
  const submittedRef = useRef(false);

  // OCR a captured/uploaded image and stash the resulting English tokens
  // in ocrWords.  rawPool above resolves them against englishLookup, so
  // the same "matched/total" hint logic the paste source uses just
  // works.  Errors land in ocrError; the UI surfaces them inline rather
  // than via toast because Hot Seat is launched outside the teacher
  // dashboard's toast portal.
  const handleOcrFile = useCallback(async (file: File) => {
    setOcrStatus('reading');
    setOcrError(null);
    try {
      const result = await postOcrImage(file, 'en');
      setOcrWords(result.words);
      setOcrStatus('done');
    } catch (err) {
      if (isPostOcrImageError(err)) {
        setOcrError(err.message);
      } else {
        setOcrError(t.ocrError);
      }
      setOcrStatus('error');
      setOcrWords([]);
    }
  }, [t.ocrError]);

  const handleGalleryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleOcrFile(file);
    // Reset so the same file can be re-picked if the teacher wants to
    // re-run OCR on it (e.g. they bumped the camera and got a partial
    // first read).
    if (e.target) e.target.value = '';
  }, [handleOcrFile]);

  const handleStart = () => {
    const names = playersText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    if (names.length < 2) return;
    if (wordPool.length < 4) return;
    setShowReview(false);
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

  // Cancel an in-progress round.  Drops back to the setup screen so the
  // teacher can tweak names/settings and restart, or use setup's own
  // Back button to exit the mode entirely.  Without this, once "Start
  // Hot Seat" was tapped there was no way out until the last player's
  // last question.
  const handleCancel = () => {
    setPhase('setup');
    setQuestion(null);
    setPicked(null);
    submittedRef.current = false;
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
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={14} className="text-stone-600" />
                  <p className="text-sm font-bold text-stone-700">{t.wordsLabel}</p>
                </div>
                {/* Source picker — 4 cards in a 2×2 (or 2×1 when assignments
                    is empty + no topics) grid.  Each card shows an icon + label
                    so the teacher scans the choices visually instead of
                    reading text-only chips. */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {([
                    { kind: 'paste' as SourceKind, label: t.sourcePaste, Icon: ClipboardPaste, visible: true },
                    { kind: 'camera' as SourceKind, label: t.sourceCamera, Icon: Camera, visible: true },
                    { kind: 'topic' as SourceKind, label: t.sourceTopic, Icon: Sparkles, visible: availableTopics.length > 0 },
                    { kind: 'assignment' as SourceKind, label: t.sourceAssignment, Icon: BookOpen, visible: availableAssignments.length > 0 },
                  ])
                    .filter(opt => opt.visible)
                    .map(opt => {
                      const Icon = opt.Icon;
                      const active = sourceKind === opt.kind;
                      return (
                        <button
                          key={opt.kind}
                          type="button"
                          onClick={() => setSourceKind(opt.kind)}
                          style={{ touchAction: 'manipulation' }}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl font-black text-sm border-2 transition-all ${
                            active
                              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-orange-200'
                          }`}
                        >
                          <Icon size={20} className={active ? 'text-white' : 'text-orange-500'} />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                </div>
                {sourceKind === 'paste' && (
                  <>
                    <textarea
                      value={wordsText}
                      onChange={e => setWordsText(e.target.value)}
                      placeholder={t.wordsPlaceholder}
                      rows={5}
                      dir="ltr"
                      className="w-full rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none px-3 py-2.5 text-base font-semibold text-stone-800 placeholder:text-stone-400 placeholder:font-normal"
                    />
                    <p className="mt-1 text-xs text-stone-500">{t.wordsHint}</p>
                  </>
                )}
                {sourceKind === 'assignment' && availableAssignments.length > 0 && (
                  <select
                    value={assignmentId ?? ''}
                    onChange={e => setAssignmentId(e.target.value || null)}
                    dir={dir}
                    aria-label={t.pickAssignment}
                    className="w-full rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none px-3 py-2.5 text-sm font-semibold text-stone-800 bg-white"
                  >
                    {availableAssignments.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                )}
                {sourceKind === 'topic' && availableTopics.length > 0 && (
                  <select
                    value={String(topicIdx)}
                    onChange={e => setTopicIdx(Number(e.target.value))}
                    dir={dir}
                    aria-label={t.pickTopic}
                    className="w-full rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none px-3 py-2.5 text-sm font-semibold text-stone-800 bg-white"
                  >
                    {availableTopics.map((pack, i) => (
                      <option key={`${pack.name}-${i}`} value={String(i)}>
                        {pack.icon} {pack.name}
                      </option>
                    ))}
                  </select>
                )}
                {sourceKind === 'camera' && (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500">{t.cameraHint}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm active:scale-[0.98] transition"
                      >
                        <Camera size={16} />
                        {t.cameraBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border-2 border-stone-200 text-stone-700 font-bold text-sm hover:border-orange-200 active:scale-[0.98] transition"
                      >
                        <ImageIcon size={16} />
                        {t.galleryBtn}
                      </button>
                    </div>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleGalleryChange}
                    />
                    {ocrStatus === 'reading' && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                        <Loader2 size={14} className="animate-spin" />
                        {t.ocrReading}
                      </p>
                    )}
                    {ocrStatus === 'error' && ocrError && (
                      <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-600">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{ocrError}</span>
                      </p>
                    )}
                    {ocrStatus === 'done' && ocrWords.length > 0 && (
                      <p className="text-xs font-semibold text-emerald-700">
                        {t.ocrFoundCount(ocrWords.length)}
                      </p>
                    )}
                  </div>
                )}
                {vocab && (sourceKind !== 'camera' || ocrStatus === 'done' || rawPool.length > 0) && (
                  <p className={`mt-1.5 text-xs font-semibold ${wordPool.length < 4 ? 'text-rose-600' : 'text-stone-500'}`}>
                    {wordPool.length < 4
                      ? t.poolTooSmall
                      : sourceKind === 'paste'
                      ? t.matchedHint(rawPool.length, pastedLines.length)
                      : sourceKind === 'camera'
                      ? t.matchedHint(rawPool.length, ocrWords.length)
                      : t.poolHint(wordPool.length)}
                  </p>
                )}
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
                onClick={() => setShowReview(true)}
                disabled={!canStart}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Eye size={18} />
                {!vocab ? t.loadingWords : t.reviewBtn(wordPool.length)}
                {vocab && <ChevronRight size={18} />}
              </button>
              {parsedNameCount < 2 && (
                <p className="text-xs text-rose-600 font-semibold text-center -mt-2">{t.needTwo}</p>
              )}
            </div>
          </div>
        </div>

        {/* In-page camera modal — only mounted when explicitly opened so the
            getUserMedia request doesn't fire until the teacher taps. */}
        {showCamera && (
          <InPageCamera
            onCapture={(file) => {
              setShowCamera(false);
              void handleOcrFile(file);
            }}
            onCancel={() => setShowCamera(false)}
            onUseGallery={() => {
              setShowCamera(false);
              galleryInputRef.current?.click();
            }}
          />
        )}

        {/* Review-before-start modal.  Lists every word that will enter
            the question pool with its target-language translation so the
            teacher can sanity-check the OCR/paste/topic result before
            committing to a 5-10 minute round. */}
        <AnimatePresence>
          {showReview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowReview(false)}
              role="dialog"
              aria-modal="true"
              aria-label={t.reviewTitle}
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 240 }}
                onClick={(e) => e.stopPropagation()}
                dir={dir}
                className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 px-5 py-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{t.reviewTitle}</h2>
                      <p className="text-white/85 text-xs font-semibold">{t.reviewSubtitle(wordPool.length)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReview(false)}
                      aria-label={t.reviewCancelBtn}
                      className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {wordPool.length === 0 ? (
                    <p className="text-sm font-semibold text-stone-500 text-center py-6">
                      {t.reviewEmpty}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {wordPool.map(w => (
                        <li
                          key={w.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100"
                        >
                          <span className="text-base font-bold text-stone-900" dir="ltr">{w.english}</span>
                          <span
                            className="text-base font-bold text-stone-600"
                            dir={targetLang === 'arabic' || targetLang === 'hebrew' ? 'rtl' : 'ltr'}
                          >
                            {translationOf(w, targetLang)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="px-5 py-4 grid grid-cols-2 gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowReview(false)}
                    style={{ touchAction: 'manipulation' }}
                    className="py-3 rounded-xl bg-stone-100 text-stone-700 font-black text-sm hover:bg-stone-200 active:scale-[0.98] transition"
                  >
                    {t.reviewCancelBtn}
                  </button>
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!canStart}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm shadow-md disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    {t.reviewStartBtn}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── INTERSTITIAL — "Pass to {Name}" ─────────────────────────────
  if (phase === 'interstitial') {
    const player = players[currentPlayerIdx];
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-100 to-rose-100 flex items-center justify-center p-4 relative" dir={dir}>
        <button
          type="button"
          onClick={handleCancel}
          style={{ touchAction: 'manipulation' }}
          className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} inline-flex items-center gap-1.5 text-sm font-bold text-stone-700 hover:text-stone-900 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full shadow-sm`}
        >
          <X size={16} />
          {t.exitBtn}
        </button>
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
  // Full-screen layout: status strip + prompt block at the top, options
  // grid fills the rest of the viewport via flex-1.  Fonts scale up to
  // text-8xl on desktop so a teacher's tablet/projector reads from the
  // back of a 30-student classroom.
  if (phase === 'question' && question) {
    const player = players[currentPlayerIdx];
    const optionDir = targetLang === 'hebrew' || targetLang === 'arabic' ? 'rtl' : 'ltr';
    return (
      <div className="h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50 px-4 py-4 sm:px-8 sm:py-6 flex flex-col" dir="ltr">
        {/* Cancel row — kept from main's cancel-button patch so the
            teacher can bail out mid-question, sized small so it doesn't
            steal vertical room from the full-screen prompt layout. */}
        <div className="w-full flex items-center mb-2" dir={dir}>
          <button
            type="button"
            onClick={handleCancel}
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 px-2 py-1.5 -mx-2 rounded-full"
          >
            <X size={16} />
            {t.exitBtn}
          </button>
        </div>
        {/* Status strip — full width, slightly bigger pills */}
        <div className="w-full flex items-center justify-between gap-3" dir={dir}>
          <div className="px-4 py-2 rounded-full bg-orange-100 text-orange-800 text-sm sm:text-base font-black uppercase tracking-wider truncate max-w-[40%]">
            {player.name}
          </div>
          <div className="px-4 py-2 rounded-full bg-stone-100 text-stone-700 text-sm sm:text-base font-black">
            {t.questionOf(questionNumber, questionsPerPlayer)}
          </div>
          <div className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm sm:text-base font-black">
            ✓ {player.correct}
          </div>
        </div>

        {/* Prompt block — bigger fonts, generous spacing.  Centered both
            axes within the available vertical room above the options. */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6">
          <h2 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-stone-900 text-center leading-tight">
            {question.word.english}
          </h2>
          <button
            type="button"
            onClick={() => speak(question.word.id, question.word.english)}
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-base font-bold transition"
            aria-label={t.replay}
          >
            <Volume2 size={18} />
            {t.replay}
          </button>
          <p className="mt-4 text-base sm:text-lg font-bold text-stone-600" dir={dir}>
            {targetLang === 'hebrew' ? t.pickHebrew : t.pickArabic}
          </p>
        </div>

        {/* Options — fill all remaining vertical space.  2-up on mobile
            (so each card has real height), still 2-up on desktop because
            4 stacked rows would push fonts smaller than the prompt. */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 sm:gap-4 pb-2">
          {question.options.map((opt, i) => {
            const isPicked = picked?.id === opt.id;
            const isCorrect = opt.id === question.word.id;
            const showResult = picked != null;
            let cls = 'bg-white border-4 border-stone-200 hover:border-orange-300 text-stone-900';
            if (showResult) {
              if (isCorrect) {
                cls = 'bg-emerald-50 border-4 border-emerald-500 text-emerald-900';
              } else if (isPicked) {
                cls = 'bg-rose-50 border-4 border-rose-500 text-rose-900';
              } else {
                cls = 'bg-stone-50 border-4 border-stone-200 opacity-60 text-stone-700';
              }
            }
            return (
              <motion.button
                key={`${opt.id}-${i}`}
                whileTap={!showResult ? { scale: 0.98 } : undefined}
                onClick={() => handleAnswer(opt)}
                disabled={showResult}
                type="button"
                dir={optionDir}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`h-full px-4 py-4 rounded-3xl text-center font-black text-3xl sm:text-5xl md:text-6xl leading-tight transition-all shadow-md break-words flex items-center justify-center ${cls}`}
              >
                <span>{translationOf(opt, targetLang) || opt.english}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Reveal flash — bigger so it reads from the back of the room */}
        <AnimatePresence>
          {picked && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`mt-3 text-center text-lg sm:text-xl font-black ${
                picked.id === question.word.id ? 'text-emerald-700' : 'text-rose-700'
              }`}
              dir={dir}
            >
              {picked.id === question.word.id
                ? t.correct
                : `${t.wrong} ${t.correctAnswer} ${translationOf(question.word, targetLang)}`}
              <ArrowRight size={16} className="inline ml-1" />
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
