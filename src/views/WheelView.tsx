/**
 * WheelView — teacher-led "Vocab Wheel" classroom mode.
 *
 * One device on the projector.  Teacher taps SPIN → the wheel lands on
 * a student → the wheel also picks a random challenge type (Meaning,
 * Translation, Fill-in-the-Blank, True/False) → the chosen student
 * stands up and answers a single question.  Score is added to their
 * running tally.  Repeat until the teacher hits "End" — the round
 * closes on a podium.
 *
 * Why this exists alongside HotSeat: HotSeat rotates students in a
 * fixed order and runs the same question type for everyone.  The wheel
 * is RANDOM (any kid could be next, so they stay engaged) and ROTATES
 * the challenge type (variety keeps a 20-min lesson alive).
 *
 * Question generation reuses the same buildQuestion helpers as
 * ClassShow — no new vocabulary plumbing, no new server endpoints.
 *
 * Five phases, all owned by this single component:
 *   1. setup    — pick players, words, language, allowed challenge types
 *   2. spinning — wheel rotates 3s, decelerating
 *   3. landed   — reveal "Picked: {Name} · {Challenge}!" + show question btn
 *   4. question — single question of the picked challenge type
 *   5. done     — podium with medals + Play Again / Exit
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, ArrowRight, Volume2, X, Play, BookOpen,
  ClipboardPaste, Eye, ChevronRight, Sparkles, Disc3,
  Languages, FileText, MessageSquareQuote, CheckCircle2,
} from 'lucide-react';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { useVocabularyLazy } from '../hooks/useVocabularyLazy';
import type { Word } from '../data/vocabulary';
import {
  buildClassicQuestion,
  buildReverseQuestion,
  buildFillBlankQuestion,
  buildTrueFalseQuestion,
  type MultiChoiceQuestion,
  type TrueFalseQuestion,
  type TranslationLang,
} from '../utils/buildQuestion';
import PageHero from '../components/PageHero';

export interface WheelAssignment {
  id: string;
  title: string;
  wordIds: number[];
  words?: Word[];
}

export interface WheelTopicPack {
  name: string;
  icon: string;
  ids: number[];
}

interface WheelViewProps {
  onExit: () => void;
  speak: (wordId: number, fallbackText?: string) => void;
  assignments?: WheelAssignment[];
  topicPacks?: WheelTopicPack[];
  /** When launched from a class, pre-fill the roster textarea with
   *  that class's student names so the teacher doesn't retype them. */
  initialPlayerNames?: string[];
}

type Phase = 'setup' | 'spinning' | 'landed' | 'question' | 'done';
type TargetLang = 'hebrew' | 'arabic';
type SourceKind = 'paste' | 'assignment' | 'topic';
type ChallengeKind = 'meaning' | 'translation' | 'fill-blank' | 'true-false';

interface PlayerScore {
  name: string;
  correct: number;
  total: number;
}

interface ActiveQuestion {
  kind: ChallengeKind;
  word: Word;
  multiChoice: MultiChoiceQuestion | null;
  trueFalse: TrueFalseQuestion | null;
}

const ALL_CHALLENGES: ChallengeKind[] = ['meaning', 'translation', 'fill-blank', 'true-false'];

// Slice colours cycle through a kid-friendly palette.  Saturated enough
// that the wheel reads from the back of a classroom but not so loud that
// the projected screen looks like a 90s game show.
const SLICE_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#F43F5E', // rose
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#A855F7', // purple
];

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

// SVG slice path for a single segment of the wheel.  Segments live on
// a 200×200 viewBox centred at (100,100) with radius 96.  Pointer is at
// the top (-90deg) so slice 0 starts at the right (0deg) — we account
// for this when computing the final landed rotation.
function slicePath(startAngle: number, endAngle: number, radius = 96, cx = 100, cy = 100): string {
  const start = polarToCart(cx, cy, radius, endAngle);
  const end = polarToCart(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}
function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

const CHALLENGE_META: Record<ChallengeKind, { emoji: string; gradient: string; iconColor: string }> = {
  'meaning':     { emoji: '📖', gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',  iconColor: 'text-indigo-500' },
  'translation': { emoji: '🌍', gradient: 'from-emerald-500 via-teal-500 to-cyan-500',      iconColor: 'text-emerald-500' },
  'fill-blank':  { emoji: '✍️', gradient: 'from-amber-500 via-orange-500 to-rose-500',      iconColor: 'text-amber-500' },
  'true-false':  { emoji: '✅', gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',      iconColor: 'text-rose-500' },
};

const STRINGS: Record<Language, {
  title: string;
  subtitle: string;
  exitBtn: string;

  playersLabel: string;
  playersPlaceholder: string;
  playersHint: string;
  needTwo: string;

  wordsLabel: string;
  sourcePaste: string;
  sourceAssignment: string;
  sourceTopic: string;
  pickAssignment: string;
  pickTopic: string;
  wordsPlaceholder: string;
  wordsHint: string;
  poolTooSmall: string;
  poolHint: (count: number) => string;
  matchedHint: (matched: number, total: number) => string;

  translateTo: string;
  hebrew: string;
  arabic: string;

  challengesLabel: string;
  challengesHint: string;
  meaningLabel: string;
  meaningDesc: string;
  translationLabel: string;
  translationDesc: string;
  fillBlankLabel: string;
  fillBlankDesc: string;
  trueFalseLabel: string;
  trueFalseDesc: string;
  needChallenge: string;

  startBtn: string;
  loadingWords: string;

  spinBtn: string;
  spinning: string;
  pickedHeading: string;
  challengeLabel: string;
  showQuestionBtn: string;
  endRoundBtn: string;
  spinAgainBtn: string;

  pickHebrew: string;
  pickArabic: string;
  pickEnglish: string;
  fillBlankPrompt: string;
  trueFalsePrompt: string;
  trueLabel: string;
  falseLabel: string;
  correct: string;
  wrong: string;
  correctAnswer: string;
  replay: string;

  podiumTitle: string;
  podiumSubtitle: string;
  playAgain: string;
  done: string;
  scoreOf: (correct: number, total: number) => string;
  scoreboard: string;
}> = {
  en: {
    title: 'Vocab Wheel',
    subtitle: 'Spin the wheel — pick a student, pick a challenge.',
    exitBtn: 'Back',
    playersLabel: 'Players (one name per line)',
    playersPlaceholder: 'Sarah\nDaniel\nMaya\n…',
    playersHint: 'Need at least 2 players.',
    needTwo: 'Add at least 2 player names to start.',
    wordsLabel: 'Words',
    sourcePaste: 'Paste',
    sourceAssignment: 'Assignment',
    sourceTopic: 'Topic',
    pickAssignment: 'Pick an assignment',
    pickTopic: 'Pick a topic pack',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'One English word per line. We look up the translation in the curriculum.',
    poolTooSmall: 'Need at least 4 words with the chosen translation.',
    poolHint: (n) => `${n} words available`,
    matchedHint: (m, t) => t === m ? `${m} words ready` : `${m} of ${t} words found — others skipped`,
    translateTo: 'Translate to:',
    hebrew: 'Hebrew',
    arabic: 'Arabic',
    challengesLabel: 'Challenge types',
    challengesHint: 'The wheel picks one at random for each spin.',
    meaningLabel: 'Meaning',
    meaningDesc: 'English → pick translation',
    translationLabel: 'Translation',
    translationDesc: 'Translation → pick English',
    fillBlankLabel: 'Fill in the Blank',
    fillBlankDesc: 'Sentence with missing word',
    trueFalseLabel: 'True or False',
    trueFalseDesc: 'Is this pair correct?',
    needChallenge: 'Pick at least one challenge type.',
    startBtn: 'Start the Wheel',
    loadingWords: 'Loading words…',
    spinBtn: 'SPIN',
    spinning: 'Spinning…',
    pickedHeading: "It's",
    challengeLabel: 'Challenge:',
    showQuestionBtn: 'Show Question',
    endRoundBtn: 'End Round',
    spinAgainBtn: 'Spin Again',
    pickHebrew: 'Pick the Hebrew translation',
    pickArabic: 'Pick the Arabic translation',
    pickEnglish: 'Pick the English word',
    fillBlankPrompt: 'Fill the blank',
    trueFalsePrompt: 'Is this match correct?',
    trueLabel: 'TRUE',
    falseLabel: 'FALSE',
    correct: 'Correct!',
    wrong: 'Not quite —',
    correctAnswer: 'Correct answer:',
    replay: 'Replay',
    podiumTitle: 'Wheel results',
    podiumSubtitle: 'Final scores',
    playAgain: 'Play again',
    done: 'Done',
    scoreOf: (c, t) => `${c}/${t}`,
    scoreboard: 'Scoreboard',
  },
  he: {
    title: 'גלגל המילים',
    subtitle: 'סובבו את הגלגל — בוחר תלמיד, בוחר אתגר.',
    exitBtn: 'חזור',
    playersLabel: 'שחקנים (שם אחד בכל שורה)',
    playersPlaceholder: 'שרה\nדניאל\nמאיה\n…',
    playersHint: 'צריך לפחות 2 שחקנים.',
    needTwo: 'הוסף לפחות 2 שמות שחקנים כדי להתחיל.',
    wordsLabel: 'מילים',
    sourcePaste: 'הדבקה',
    sourceAssignment: 'מטלה',
    sourceTopic: 'נושא',
    pickAssignment: 'בחר מטלה',
    pickTopic: 'בחר חבילת נושא',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'מילה אחת באנגלית בכל שורה. נחפש את התרגום באוצר המילים.',
    poolTooSmall: 'צריך לפחות 4 מילים עם התרגום שנבחר.',
    poolHint: (n) => `${n} מילים זמינות`,
    matchedHint: (m, t) => t === m ? `${m} מילים מוכנות` : `${m} מתוך ${t} מילים נמצאו — האחרות דולגו`,
    translateTo: 'תרגום ל:',
    hebrew: 'עברית',
    arabic: 'ערבית',
    challengesLabel: 'סוגי אתגר',
    challengesHint: 'הגלגל בוחר אחד באקראי בכל סיבוב.',
    meaningLabel: 'משמעות',
    meaningDesc: 'אנגלית ← בחר תרגום',
    translationLabel: 'תרגום',
    translationDesc: 'תרגום ← בחר אנגלית',
    fillBlankLabel: 'השלם את החסר',
    fillBlankDesc: 'משפט עם מילה חסרה',
    trueFalseLabel: 'נכון או לא נכון',
    trueFalseDesc: 'האם הזוג נכון?',
    needChallenge: 'בחר לפחות סוג אתגר אחד.',
    startBtn: 'התחל את הגלגל',
    loadingWords: 'טוען מילים…',
    spinBtn: 'סובב',
    spinning: 'מסתובב…',
    pickedHeading: 'זה',
    challengeLabel: 'אתגר:',
    showQuestionBtn: 'הצג שאלה',
    endRoundBtn: 'סיים סבב',
    spinAgainBtn: 'סובב שוב',
    pickHebrew: 'בחר את התרגום לעברית',
    pickArabic: 'בחר את התרגום לערבית',
    pickEnglish: 'בחר את המילה באנגלית',
    fillBlankPrompt: 'השלם את המילה החסרה',
    trueFalsePrompt: 'האם ההתאמה נכונה?',
    trueLabel: 'נכון',
    falseLabel: 'לא נכון',
    correct: 'נכון!',
    wrong: 'לא בדיוק —',
    correctAnswer: 'התשובה הנכונה:',
    replay: 'השמע שוב',
    podiumTitle: 'תוצאות הגלגל',
    podiumSubtitle: 'ניקוד סופי',
    playAgain: 'שחק שוב',
    done: 'סיום',
    scoreOf: (c, t) => `${c}/${t}`,
    scoreboard: 'טבלת ניקוד',
  },
  ar: {
    title: 'عجلة المفردات',
    subtitle: 'أدر العجلة — اختر طالبًا، اختر تحديًا.',
    exitBtn: 'رجوع',
    playersLabel: 'اللاعبون (اسم واحد في كل سطر)',
    playersPlaceholder: 'سارة\nدانيال\nمايا\n…',
    playersHint: 'تحتاج إلى لاعبَين على الأقل.',
    needTwo: 'أضف اسمَي لاعبَين على الأقل للبدء.',
    wordsLabel: 'الكلمات',
    sourcePaste: 'لصق',
    sourceAssignment: 'مهمة',
    sourceTopic: 'موضوع',
    pickAssignment: 'اختر مهمة',
    pickTopic: 'اختر حزمة موضوع',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'كلمة إنجليزية واحدة في كل سطر. سنبحث عن الترجمة في المفردات.',
    poolTooSmall: 'يلزم 4 كلمات على الأقل لها الترجمة المختارة.',
    poolHint: (n) => `${n} كلمة متاحة`,
    matchedHint: (m, t) => t === m ? `${m} كلمات جاهزة` : `تم العثور على ${m} من ${t} كلمات — تم تخطي الباقي`,
    translateTo: 'الترجمة إلى:',
    hebrew: 'العبرية',
    arabic: 'العربية',
    challengesLabel: 'أنواع التحدي',
    challengesHint: 'تختار العجلة واحدًا عشوائيًا في كل دورة.',
    meaningLabel: 'المعنى',
    meaningDesc: 'إنجليزي ← اختر الترجمة',
    translationLabel: 'الترجمة',
    translationDesc: 'ترجمة ← اختر الإنجليزية',
    fillBlankLabel: 'املأ الفراغ',
    fillBlankDesc: 'جملة بكلمة ناقصة',
    trueFalseLabel: 'صح أم خطأ',
    trueFalseDesc: 'هل هذا الزوج صحيح؟',
    needChallenge: 'اختر نوع تحدي واحدًا على الأقل.',
    startBtn: 'ابدأ العجلة',
    loadingWords: 'جارٍ تحميل الكلمات…',
    spinBtn: 'أدر',
    spinning: 'يدور…',
    pickedHeading: 'إنه',
    challengeLabel: 'التحدي:',
    showQuestionBtn: 'عرض السؤال',
    endRoundBtn: 'إنهاء الجولة',
    spinAgainBtn: 'أدر مرة أخرى',
    pickHebrew: 'اختر الترجمة العبرية',
    pickArabic: 'اختر الترجمة العربية',
    pickEnglish: 'اختر الكلمة الإنجليزية',
    fillBlankPrompt: 'املأ الكلمة الناقصة',
    trueFalsePrompt: 'هل التطابق صحيح؟',
    trueLabel: 'صحيح',
    falseLabel: 'خطأ',
    correct: 'صحيح!',
    wrong: 'ليس تمامًا —',
    correctAnswer: 'الإجابة الصحيحة:',
    replay: 'إعادة',
    podiumTitle: 'نتائج العجلة',
    podiumSubtitle: 'النتائج النهائية',
    playAgain: 'العب مرة أخرى',
    done: 'تم',
    scoreOf: (c, t) => `${c}/${t}`,
    scoreboard: 'لوحة النتائج',
  },
  ru: {
    title: 'Vocab Wheel',
    subtitle: 'Spin the wheel — pick a student, pick a challenge.',
    exitBtn: 'Back',
    playersLabel: 'Players (one name per line)',
    playersPlaceholder: 'Sarah\nDaniel\nMaya\n…',
    playersHint: 'Need at least 2 players.',
    needTwo: 'Add at least 2 player names to start.',
    wordsLabel: 'Words',
    sourcePaste: 'Paste',
    sourceAssignment: 'Assignment',
    sourceTopic: 'Topic',
    pickAssignment: 'Pick an assignment',
    pickTopic: 'Pick a topic pack',
    wordsPlaceholder: 'apple\nbook\ncat\n…',
    wordsHint: 'One English word per line. We look up the translation in the curriculum.',
    poolTooSmall: 'Need at least 4 words with the chosen translation.',
    poolHint: (n) => `${n} words available`,
    matchedHint: (m, t) => t === m ? `${m} words ready` : `${m} of ${t} words found — others skipped`,
    translateTo: 'Translate to:',
    hebrew: 'Hebrew',
    arabic: 'Arabic',
    challengesLabel: 'Challenge types',
    challengesHint: 'The wheel picks one at random for each spin.',
    meaningLabel: 'Meaning',
    meaningDesc: 'English → pick translation',
    translationLabel: 'Translation',
    translationDesc: 'Translation → pick English',
    fillBlankLabel: 'Fill in the Blank',
    fillBlankDesc: 'Sentence with missing word',
    trueFalseLabel: 'True or False',
    trueFalseDesc: 'Is this pair correct?',
    needChallenge: 'Pick at least one challenge type.',
    startBtn: 'Start the Wheel',
    loadingWords: 'Loading words…',
    spinBtn: 'SPIN',
    spinning: 'Spinning…',
    pickedHeading: "It's",
    challengeLabel: 'Challenge:',
    showQuestionBtn: 'Show Question',
    endRoundBtn: 'End Round',
    spinAgainBtn: 'Spin Again',
    pickHebrew: 'Pick the Hebrew translation',
    pickArabic: 'Pick the Arabic translation',
    pickEnglish: 'Pick the English word',
    fillBlankPrompt: 'Fill the blank',
    trueFalsePrompt: 'Is this match correct?',
    trueLabel: 'TRUE',
    falseLabel: 'FALSE',
    correct: 'Correct!',
    wrong: 'Not quite —',
    correctAnswer: 'Correct answer:',
    replay: 'Replay',
    podiumTitle: 'Wheel results',
    podiumSubtitle: 'Final scores',
    playAgain: 'Play again',
    done: 'Done',
    scoreOf: (c, t) => `${c}/${t}`,
    scoreboard: 'Scoreboard',
  },
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function WheelView({ onExit, speak, assignments, topicPacks, initialPlayerNames }: WheelViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  const vocab = useVocabularyLazy(true);

  const [phase, setPhase] = useState<Phase>('setup');

  // ── Setup state ────────────────────────────────────────────────
  const [playersText, setPlayersText] = useState(() =>
    initialPlayerNames && initialPlayerNames.length > 0 ? initialPlayerNames.join('\n') : '',
  );
  const [targetLang, setTargetLang] = useState<TargetLang>('hebrew');
  const [sourceKind, setSourceKind] = useState<SourceKind>('paste');
  const [wordsText, setWordsText] = useState('');
  const availableAssignments = useMemo(() => assignments ?? [], [assignments]);
  const availableTopics = useMemo(() => topicPacks ?? [], [topicPacks]);
  const [assignmentId, setAssignmentId] = useState<string | null>(availableAssignments[0]?.id ?? null);
  const [topicIdx, setTopicIdx] = useState(0);
  const [allowedChallenges, setAllowedChallenges] = useState<Set<ChallengeKind>>(
    () => new Set(ALL_CHALLENGES),
  );

  const englishLookup = useMemo(() => {
    if (!vocab) return null;
    const map = new Map<string, Word>();
    for (const w of vocab.ALL_WORDS) {
      map.set(w.english.toLowerCase().trim(), w);
    }
    return map;
  }, [vocab]);

  const pastedLines = useMemo(
    () => wordsText.split('\n').map(l => l.trim()).filter(l => l.length > 0),
    [wordsText],
  );

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
  }, [vocab, sourceKind, assignmentId, availableAssignments, pastedLines, englishLookup, topicIdx, availableTopics]);

  // Filter to words that actually have the chosen target translation —
  // otherwise the multi-choice would surface English where it should
  // show Hebrew/Arabic.  Also drop fill-blank-incompatible words from
  // the fill-blank pool elsewhere.
  const wordPool: Word[] = useMemo(
    () => rawPool.filter(w => translationOf(w, targetLang).trim().length > 0),
    [rawPool, targetLang],
  );

  // ── Round state ────────────────────────────────────────────────
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [pickedPlayerIdx, setPickedPlayerIdx] = useState<number | null>(null);
  const [pickedChallenge, setPickedChallenge] = useState<ChallengeKind | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [activeQ, setActiveQ] = useState<ActiveQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [tfPicked, setTfPicked] = useState<boolean | null>(null);
  const submittedRef = useRef(false);

  // Translation lang used by builders.  Mirrors HotSeat — hebrew/arabic
  // target maps directly to TranslationLang.
  const translationLang: TranslationLang = targetLang === 'hebrew' ? 'he' : 'ar';

  // Build a single question of the picked challenge type.  Returns
  // null when the chosen word can't satisfy the kind (e.g. fill-blank
  // on a word without an example sentence) — caller re-picks.
  const buildOneQuestion = useCallback(
    (kind: ChallengeKind, pool: Word[]): ActiveQuestion | null => {
      if (pool.length < 4) return null;
      // Try up to 8 words before giving up — covers fill-blank's frequent
      // "no sentence" misses without an infinite loop.
      const candidates = shuffle(pool).slice(0, 8);
      for (const word of candidates) {
        if (kind === 'meaning') {
          return {
            kind,
            word,
            multiChoice: buildClassicQuestion(word, pool, translationLang),
            trueFalse: null,
          };
        }
        if (kind === 'translation') {
          return {
            kind,
            word,
            multiChoice: buildReverseQuestion(word, pool, translationLang),
            trueFalse: null,
          };
        }
        if (kind === 'fill-blank') {
          const q = buildFillBlankQuestion(word, pool);
          if (q) return { kind, word, multiChoice: q, trueFalse: null };
          continue;
        }
        if (kind === 'true-false') {
          return {
            kind,
            word,
            multiChoice: null,
            trueFalse: buildTrueFalseQuestion(word, pool, translationLang),
          };
        }
      }
      return null;
    },
    [translationLang],
  );

  const parsedNameCount = playersText
    .split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0).length;

  const canStart =
    parsedNameCount >= 2 && wordPool.length >= 4 && allowedChallenges.size > 0;

  const handleStart = () => {
    const names = playersText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    if (names.length < 2 || wordPool.length < 4 || allowedChallenges.size === 0) return;
    setPlayers(names.map(name => ({ name, correct: 0, total: 0 })));
    setPickedPlayerIdx(null);
    setPickedChallenge(null);
    setWheelRotation(0);
    setActiveQ(null);
    setPicked(null);
    setTfPicked(null);
    submittedRef.current = false;
    setPhase('spinning');
    // Kick off the first spin immediately so the wheel screen never
    // shows the static "waiting" state on entry.
    window.setTimeout(() => doSpin(names.length, allowedChallenges), 350);
  };

  const doSpin = useCallback(
    (playerCount: number, allowed: Set<ChallengeKind>) => {
      if (playerCount < 1) return;
      const targetIdx = Math.floor(Math.random() * playerCount);
      const allowedList = Array.from(allowed);
      const challenge = allowedList[Math.floor(Math.random() * allowedList.length)];
      // Each slice spans 360/n degrees.  The pointer sits at the top
      // (angle = 0 in our rotation frame).  To land slice `targetIdx`
      // under the pointer we rotate the wheel so its centre lines up
      // there — minus a random jitter within the slice for realism.
      const sliceDeg = 360 / playerCount;
      const sliceCenter = targetIdx * sliceDeg + sliceDeg / 2;
      const jitter = (Math.random() - 0.5) * sliceDeg * 0.6;
      const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 turns
      const finalRotation = fullSpins * 360 - sliceCenter - jitter;
      setPickedPlayerIdx(null);
      setPickedChallenge(null);
      setWheelRotation(prev => {
        // Build on whatever rotation we left off at so the wheel feels
        // continuous across spins (no snap-back to 0).
        const base = prev % 360;
        return prev - base + finalRotation;
      });
      // Reveal after the CSS transition (3s + small buffer).
      window.setTimeout(() => {
        setPickedPlayerIdx(targetIdx);
        setPickedChallenge(challenge);
        setPhase('landed');
      }, 3200);
    },
    [],
  );

  const handleSpin = () => {
    if (phase === 'spinning') return;
    setPhase('spinning');
    setActiveQ(null);
    setPicked(null);
    setTfPicked(null);
    submittedRef.current = false;
    doSpin(players.length, allowedChallenges);
  };

  const handleShowQuestion = () => {
    if (pickedChallenge === null) return;
    const q = buildOneQuestion(pickedChallenge, wordPool);
    if (!q) return; // shouldn't happen — wordPool >= 4 gate handles it
    setActiveQ(q);
    setPicked(null);
    setTfPicked(null);
    submittedRef.current = false;
    setPhase('question');
    // Auto-speak the prompt word so the kid hears it before answering.
    // For reverse questions the prompt IS the translation, so don't
    // speak the English — we'd give away the answer.
    if (q.kind === 'meaning' || q.kind === 'fill-blank' || q.kind === 'true-false') {
      speak(q.word.id, q.word.english);
    }
  };

  const recordResult = (isCorrect: boolean) => {
    if (pickedPlayerIdx === null) return;
    setPlayers(prev =>
      prev.map((p, i) =>
        i === pickedPlayerIdx
          ? { ...p, correct: p.correct + (isCorrect ? 1 : 0), total: p.total + 1 }
          : p,
      ),
    );
  };

  const handleAnswerMultiChoice = (option: string) => {
    if (!activeQ || !activeQ.multiChoice || picked || submittedRef.current) return;
    submittedRef.current = true;
    setPicked(option);
    const correct = activeQ.multiChoice.options[activeQ.multiChoice.correctIndex];
    recordResult(option === correct);
  };

  const handleAnswerTrueFalse = (value: boolean) => {
    if (!activeQ || !activeQ.trueFalse || tfPicked !== null || submittedRef.current) return;
    submittedRef.current = true;
    setTfPicked(value);
    recordResult(value === activeQ.trueFalse.isTrue);
  };

  const handleEndRound = () => {
    setPhase('done');
  };

  const handlePlayAgain = () => {
    setPlayers(prev => prev.map(p => ({ ...p, correct: 0, total: 0 })));
    setPickedPlayerIdx(null);
    setPickedChallenge(null);
    setWheelRotation(0);
    setActiveQ(null);
    setPicked(null);
    setTfPicked(null);
    submittedRef.current = false;
    setPhase('spinning');
    window.setTimeout(() => doSpin(players.length, allowedChallenges), 350);
  };

  const toggleChallenge = (k: ChallengeKind) => {
    setAllowedChallenges(prev => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k); // never let it hit 0
      } else {
        next.add(k);
      }
      return next;
    });
  };

  // ════════════════════════════════════════════════════════════
  // ── SETUP ───────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-violet-50 to-fuchsia-50" dir={dir}>
        <PageHero
          icon={<Disc3 size={32} className="text-white" />}
          title={t.title}
          subtitle={t.subtitle}
          onBack={onExit}
          backLabel={t.exitBtn}
          gradient="from-indigo-500 via-violet-500 to-fuchsia-500"
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-8">
          <div className="rounded-2xl bg-white shadow-lg border border-violet-100 overflow-hidden">
            <div className="px-6 py-6 space-y-5">
              {/* Players */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">{t.playersLabel}</label>
                <textarea
                  value={playersText}
                  onChange={e => setPlayersText(e.target.value)}
                  placeholder={t.playersPlaceholder}
                  rows={6}
                  dir={dir}
                  className="w-full rounded-lg border-2 border-stone-200 focus:border-violet-400 focus:outline-none px-3 py-2.5 text-base font-semibold text-stone-800 placeholder:text-stone-400 placeholder:font-normal"
                />
                <p className="mt-1 text-xs text-stone-500">{t.playersHint}</p>
              </div>

              {/* Words source */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={14} className="text-stone-600" />
                  <p className="text-sm font-bold text-stone-700">{t.wordsLabel}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {([
                    { kind: 'paste' as SourceKind, label: t.sourcePaste, Icon: ClipboardPaste, visible: true },
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
                          className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-lg font-black text-sm border-2 transition-all ${
                            active
                              ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-violet-200'
                          }`}
                        >
                          <Icon size={20} className={active ? 'text-white' : 'text-violet-500'} />
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
                      className="w-full rounded-lg border-2 border-stone-200 focus:border-violet-400 focus:outline-none px-3 py-2.5 text-base font-semibold text-stone-800 placeholder:text-stone-400 placeholder:font-normal"
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
                    className="w-full rounded-lg border-2 border-stone-200 focus:border-violet-400 focus:outline-none px-3 py-2.5 text-sm font-semibold text-stone-800 bg-white"
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
                    className="w-full rounded-lg border-2 border-stone-200 focus:border-violet-400 focus:outline-none px-3 py-2.5 text-sm font-semibold text-stone-800 bg-white"
                  >
                    {availableTopics.map((pack, i) => (
                      <option key={`${pack.name}-${i}`} value={String(i)}>
                        {pack.icon} {pack.name}
                      </option>
                    ))}
                  </select>
                )}
                {vocab && (
                  <p className={`mt-1.5 text-xs font-semibold ${wordPool.length < 4 ? 'text-rose-600' : 'text-stone-500'}`}>
                    {wordPool.length < 4
                      ? t.poolTooSmall
                      : sourceKind === 'paste'
                      ? t.matchedHint(rawPool.length, pastedLines.length)
                      : t.poolHint(wordPool.length)}
                  </p>
                )}
              </div>

              {/* Target language */}
              <div>
                <p className="text-sm font-bold text-stone-700 mb-2">{t.translateTo}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['hebrew', 'arabic'] as TargetLang[]).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setTargetLang(lang)}
                      style={{ touchAction: 'manipulation' }}
                      className={`py-2.5 rounded-lg font-bold text-sm border-2 transition-all ${
                        targetLang === lang
                          ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-violet-200'
                      }`}
                    >
                      {lang === 'hebrew' ? t.hebrew : t.arabic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Challenge type picker */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={14} className="text-stone-600" />
                  <p className="text-sm font-bold text-stone-700">{t.challengesLabel}</p>
                </div>
                <p className="text-xs text-stone-500 mb-3">{t.challengesHint}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { kind: 'meaning'     as ChallengeKind, label: t.meaningLabel,     desc: t.meaningDesc,     Icon: BookOpen },
                    { kind: 'translation' as ChallengeKind, label: t.translationLabel, desc: t.translationDesc, Icon: Languages },
                    { kind: 'fill-blank'  as ChallengeKind, label: t.fillBlankLabel,   desc: t.fillBlankDesc,   Icon: FileText },
                    { kind: 'true-false'  as ChallengeKind, label: t.trueFalseLabel,   desc: t.trueFalseDesc,   Icon: MessageSquareQuote },
                  ]).map(opt => {
                    const active = allowedChallenges.has(opt.kind);
                    const meta = CHALLENGE_META[opt.kind];
                    const Icon = opt.Icon;
                    return (
                      <button
                        key={opt.kind}
                        type="button"
                        onClick={() => toggleChallenge(opt.kind)}
                        aria-pressed={active}
                        style={{ touchAction: 'manipulation' }}
                        className={`relative flex items-start gap-2.5 p-3 rounded-lg border-2 text-left transition-all ${
                          active
                            ? `bg-gradient-to-br ${meta.gradient} text-white border-transparent shadow-md`
                            : 'bg-white text-stone-700 border-stone-200 hover:border-violet-200'
                        }`}
                      >
                        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          active ? 'bg-white/20' : 'bg-stone-100'
                        }`}>
                          <Icon size={18} className={active ? 'text-white' : meta.iconColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-black text-sm leading-tight ${active ? 'text-white' : 'text-stone-900'}`}>
                            {opt.label}
                          </p>
                          <p className={`text-xs font-semibold leading-tight mt-0.5 ${active ? 'text-white/85' : 'text-stone-500'}`}>
                            {opt.desc}
                          </p>
                        </div>
                        {active && (
                          <CheckCircle2 size={16} className="absolute top-2 end-2 text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-black text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Play size={18} />
                {!vocab ? t.loadingWords : t.startBtn}
                {vocab && <ChevronRight size={18} />}
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

  // ════════════════════════════════════════════════════════════
  // ── SPINNING / LANDED ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'spinning' || phase === 'landed') {
    const sliceDeg = players.length > 0 ? 360 / players.length : 0;
    const pickedPlayer = pickedPlayerIdx !== null ? players[pickedPlayerIdx] : null;
    const pickedMeta = pickedChallenge ? CHALLENGE_META[pickedChallenge] : null;
    const challengeLabel: Record<ChallengeKind, string> = {
      'meaning': t.meaningLabel,
      'translation': t.translationLabel,
      'fill-blank': t.fillBlankLabel,
      'true-false': t.trueFalseLabel,
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 flex flex-col p-4 sm:p-6 relative" dir={dir}>
        <button
          type="button"
          onClick={onExit}
          style={{ touchAction: 'manipulation' }}
          className="absolute top-4 start-4 inline-flex items-center gap-1.5 text-sm font-bold text-stone-700 hover:text-stone-900 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full shadow-sm z-10"
        >
          <X size={16} />
          {t.exitBtn}
        </button>

        {/* Scoreboard strip */}
        <div className="absolute top-4 end-4 max-w-[60%] hidden sm:block z-10">
          <Scoreboard players={players} label={t.scoreboard} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8">
          {/* Wheel */}
          <div className="relative" style={{ width: 'min(80vw, 480px)', height: 'min(80vw, 480px)' }}>
            {/* Pointer arrow (top centre, pointing down into the wheel) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow-md">
              <svg width="36" height="44" viewBox="0 0 36 44">
                <path d="M 18 44 L 0 8 Q 18 -4 36 8 Z" fill="#0f172a" />
                <path d="M 18 38 L 6 12 Q 18 4 30 12 Z" fill="#facc15" />
              </svg>
            </div>

            <motion.div
              className="w-full h-full"
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3, ease: [0.17, 0.67, 0.32, 1] }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                {/* Slices */}
                {players.map((p, i) => {
                  const startAngle = i * sliceDeg;
                  const endAngle = (i + 1) * sliceDeg;
                  const midAngle = startAngle + sliceDeg / 2;
                  const labelPos = polarToCart(100, 100, 62, midAngle);
                  // Rotate label so its baseline runs along the slice's
                  // radial axis — kids should read the name without
                  // tilting their head 90° to one side.
                  const labelRotation = midAngle;
                  const color = SLICE_COLORS[i % SLICE_COLORS.length];
                  return (
                    <g key={`${p.name}-${i}`}>
                      <path d={slicePath(startAngle, endAngle)} fill={color} stroke="white" strokeWidth="1.5" />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.max(6, 14 - players.length * 0.3)}
                        fontWeight={900}
                        transform={`rotate(${labelRotation} ${labelPos.x} ${labelPos.y})`}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
                      >
                        {p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name}
                      </text>
                    </g>
                  );
                })}
                {/* Outer ring */}
                <circle cx="100" cy="100" r="96" fill="none" stroke="#0f172a" strokeWidth="2.5" />
                {/* Centre hub */}
                <circle cx="100" cy="100" r="18" fill="#0f172a" />
                <circle cx="100" cy="100" r="14" fill="#facc15" />
              </svg>
            </motion.div>
          </div>

          {/* CTA panel under the wheel */}
          <div className="w-full max-w-md text-center">
            {phase === 'spinning' && (
              <motion.p
                key="spinning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-black text-violet-900"
              >
                {t.spinning}
              </motion.p>
            )}

            <AnimatePresence mode="wait">
              {phase === 'landed' && pickedPlayer && pickedMeta && pickedChallenge && (
                <motion.div
                  key="landed"
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 240 }}
                  className="space-y-4"
                >
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-600">
                    {t.pickedHeading}
                  </p>
                  <h2 className="text-5xl sm:text-7xl font-black text-stone-900 break-words leading-tight">
                    {pickedPlayer.name}
                  </h2>
                  <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r ${pickedMeta.gradient} text-white font-black text-base shadow-md`}>
                    <span className="text-xl">{pickedMeta.emoji}</span>
                    <span>{t.challengeLabel} {challengeLabel[pickedChallenge]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleEndRound}
                      style={{ touchAction: 'manipulation' }}
                      className="py-3 rounded-lg bg-white text-stone-700 border-2 border-stone-200 font-black text-sm hover:border-rose-200 hover:text-rose-600 active:scale-[0.98] transition"
                    >
                      {t.endRoundBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleShowQuestion}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      className="py-3 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-black text-sm shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      {t.showQuestionBtn}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile scoreboard at the bottom */}
        <div className="sm:hidden mt-4">
          <Scoreboard players={players} label={t.scoreboard} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── QUESTION ───────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'question' && activeQ && pickedPlayerIdx !== null && pickedChallenge) {
    const pickedPlayer = players[pickedPlayerIdx];
    const pickedMeta = CHALLENGE_META[pickedChallenge];
    const mc = activeQ.multiChoice;
    const tf = activeQ.trueFalse;

    // Options dir + prompt dir vary by challenge kind.  For meaning the
    // options are HE/AR (rtl), for translation they're English (ltr),
    // for fill-blank options are English (ltr), for true-false the
    // shown translation is HE/AR (rtl).
    const promptIsEnglish = activeQ.kind === 'meaning' || activeQ.kind === 'fill-blank' || activeQ.kind === 'true-false';
    const optionsAreEnglish = activeQ.kind === 'translation' || activeQ.kind === 'fill-blank';
    const promptDir = promptIsEnglish ? 'ltr' : 'rtl';
    const optionDir = optionsAreEnglish ? 'ltr' : 'rtl';

    const correctMcOption = mc ? mc.options[mc.correctIndex] : null;

    return (
      <div className="h-screen bg-gradient-to-b from-indigo-50 via-violet-50 to-fuchsia-50 px-4 py-4 sm:px-8 sm:py-6 flex flex-col" dir="ltr">
        {/* Top strip — player, challenge, score */}
        <div className="w-full flex items-center justify-between gap-3 flex-wrap" dir={dir}>
          <button
            type="button"
            onClick={() => setPhase('landed')}
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 px-2 py-1.5 -mx-2 rounded-full"
          >
            <X size={16} />
            {t.exitBtn}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-4 py-2 rounded-full bg-violet-100 text-violet-800 text-sm sm:text-base font-black uppercase tracking-wider truncate max-w-[40vw]">
              {pickedPlayer.name}
            </div>
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${pickedMeta.gradient} text-white text-sm sm:text-base font-black`}>
              {pickedMeta.emoji} {{
                'meaning': t.meaningLabel,
                'translation': t.translationLabel,
                'fill-blank': t.fillBlankLabel,
                'true-false': t.trueFalseLabel,
              }[pickedChallenge]}
            </div>
            <div className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm sm:text-base font-black">
              ✓ {pickedPlayer.correct}
            </div>
          </div>
        </div>

        {/* Prompt block */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6">
          {mc && (
            <>
              <h2
                dir={promptDir}
                className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-stone-900 text-center leading-tight break-words max-w-full"
              >
                {mc.prompt}
              </h2>
              {activeQ.kind === 'meaning' && (
                <button
                  type="button"
                  onClick={() => speak(activeQ.word.id, activeQ.word.english)}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-base font-bold transition"
                  aria-label={t.replay}
                >
                  <Volume2 size={18} />
                  {t.replay}
                </button>
              )}
              <p className="mt-4 text-base sm:text-lg font-bold text-stone-600" dir={dir}>
                {activeQ.kind === 'meaning'
                  ? (targetLang === 'hebrew' ? t.pickHebrew : t.pickArabic)
                  : activeQ.kind === 'translation'
                  ? t.pickEnglish
                  : t.fillBlankPrompt}
              </p>
            </>
          )}

          {tf && (
            <>
              <h2
                dir="ltr"
                className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-stone-900 text-center leading-tight break-words"
              >
                {tf.word.english}
              </h2>
              <div className="mt-3 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-stone-100">
                <span className="text-xl">↔</span>
                <span
                  dir="rtl"
                  className="text-3xl sm:text-5xl font-black text-stone-900"
                >
                  {tf.shownTranslation}
                </span>
              </div>
              <button
                type="button"
                onClick={() => speak(tf.word.id, tf.word.english)}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-base font-bold transition"
                aria-label={t.replay}
              >
                <Volume2 size={18} />
                {t.replay}
              </button>
              <p className="mt-4 text-base sm:text-lg font-bold text-stone-600" dir={dir}>
                {t.trueFalsePrompt}
              </p>
            </>
          )}
        </div>

        {/* Options grid */}
        {mc && correctMcOption && (
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 sm:gap-4 pb-2">
            {mc.options.map((opt, i) => {
              const isPicked = picked === opt;
              const isCorrect = opt === correctMcOption;
              const showResult = picked !== null;
              let cls = 'bg-white border-4 border-stone-200 hover:border-violet-300 text-stone-900';
              if (showResult) {
                if (isCorrect) cls = 'bg-emerald-50 border-4 border-emerald-500 text-emerald-900';
                else if (isPicked) cls = 'bg-rose-50 border-4 border-rose-500 text-rose-900';
                else cls = 'bg-stone-50 border-4 border-stone-200 opacity-60 text-stone-700';
              }
              return (
                <motion.button
                  key={`${opt}-${i}`}
                  whileTap={!showResult ? { scale: 0.98 } : undefined}
                  onClick={() => handleAnswerMultiChoice(opt)}
                  disabled={showResult}
                  type="button"
                  dir={optionDir}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className={`h-full px-4 py-4 rounded-2xl text-center font-black text-3xl sm:text-5xl md:text-6xl leading-tight transition-all shadow-md break-words flex items-center justify-center ${cls}`}
                >
                  <span>{opt}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {tf && (
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 sm:gap-4 pb-2">
            {([true, false] as const).map(value => {
              const isPicked = tfPicked === value;
              const isCorrect = tf.isTrue === value;
              const showResult = tfPicked !== null;
              let cls = value
                ? 'bg-white border-4 border-emerald-300 hover:border-emerald-500 text-emerald-700'
                : 'bg-white border-4 border-rose-300 hover:border-rose-500 text-rose-700';
              if (showResult) {
                if (isCorrect) cls = 'bg-emerald-50 border-4 border-emerald-500 text-emerald-900';
                else if (isPicked) cls = 'bg-rose-50 border-4 border-rose-500 text-rose-900';
                else cls = 'bg-stone-50 border-4 border-stone-200 opacity-60 text-stone-700';
              }
              return (
                <motion.button
                  key={String(value)}
                  whileTap={!showResult ? { scale: 0.98 } : undefined}
                  onClick={() => handleAnswerTrueFalse(value)}
                  disabled={showResult}
                  type="button"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className={`h-full px-4 py-4 rounded-2xl text-center font-black text-5xl sm:text-7xl md:text-8xl leading-tight transition-all shadow-md flex items-center justify-center ${cls}`}
                >
                  <span>{value ? `✓ ${t.trueLabel}` : `✗ ${t.falseLabel}`}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Reveal flash + Next Spin button */}
        <AnimatePresence>
          {(picked !== null || tfPicked !== null) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 flex items-center justify-between gap-3 flex-wrap"
              dir={dir}
            >
              <p
                className={`text-lg sm:text-xl font-black ${
                  (mc && picked === correctMcOption) || (tf && tfPicked === tf.isTrue)
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {(mc && picked === correctMcOption) || (tf && tfPicked === tf.isTrue) ? (
                  <>
                    {t.correct} <ArrowRight size={16} className={`inline ms-1 ${isRTL ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <>
                    {t.wrong}{' '}
                    {mc && (
                      <span dir={optionDir} className="font-black">
                        {t.correctAnswer} {correctMcOption}
                      </span>
                    )}
                    {tf && (
                      <span className="font-black">
                        {t.correctAnswer} {tf.isTrue ? t.trueLabel : t.falseLabel}
                      </span>
                    )}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEndRound}
                  style={{ touchAction: 'manipulation' }}
                  className="px-4 py-2.5 rounded-full bg-white text-stone-700 border-2 border-stone-200 font-black text-sm hover:border-rose-200 hover:text-rose-600 active:scale-[0.98] transition"
                >
                  {t.endRoundBtn}
                </button>
                <button
                  type="button"
                  onClick={handleSpin}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-black text-sm shadow-md active:scale-[0.98] transition flex items-center gap-2"
                >
                  <Disc3 size={16} />
                  {t.spinAgainBtn}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── DONE — podium ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  const podium = [...players]
    .map((p, originalIdx) => ({ ...p, originalIdx }))
    .sort((a, b) => b.correct - a.correct || a.originalIdx - b.originalIdx);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-violet-50 to-fuchsia-50 p-4 sm:p-6" dir={dir}>
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl bg-white shadow-lg border border-violet-100 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-6 text-white text-center">
            <div className="w-16 h-16 mx-auto rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
              <Trophy size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black">{t.podiumTitle}</h1>
            <p className="text-white/85 text-sm">{t.podiumSubtitle}</p>
          </div>

          <div className="px-4 sm:px-6 py-5 space-y-2">
            {podium.map((p, rank) => (
              <div
                key={`${p.name}-${p.originalIdx}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 ${
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
              className="py-3 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-black text-sm shadow-md active:scale-[0.98] transition-all"
            >
              {t.playAgain}
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{ touchAction: 'manipulation' }}
              className="py-3 rounded-lg bg-stone-100 text-stone-700 font-black text-sm hover:bg-stone-200 active:scale-[0.98] transition-all"
            >
              {t.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scoreboard — compact running tally shown alongside the wheel ──
function Scoreboard({ players, label }: { players: PlayerScore[]; label: string }) {
  // Top 5 by correct count.  Ties broken by total attempted (more
  // tries = higher position in tie), then by original order.
  const top = [...players]
    .map((p, i) => ({ ...p, idx: i }))
    .sort((a, b) => b.correct - a.correct || b.total - a.total || a.idx - b.idx)
    .slice(0, 5);
  return (
    <div className="rounded-xl bg-white/85 backdrop-blur shadow-md border border-violet-100 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1.5">
        {label}
      </p>
      <ul className="space-y-1">
        {top.map((p, i) => (
          <li key={`${p.name}-${p.idx}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs w-4 text-center">{i < 3 ? MEDAL[i] : `${i + 1}`}</span>
              <span className="font-bold text-stone-900 truncate">{p.name}</span>
            </span>
            <span className="font-black text-stone-700 tabular-nums shrink-0">
              {p.correct}/{p.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
