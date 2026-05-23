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
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, ArrowRight, Volume2, X, Play, BookOpen,
  ClipboardPaste, ChevronRight, Sparkles, Disc3,
  Languages, MessageSquareQuote, CheckCircle2,
  Camera, Loader2, AlertTriangle, Image as ImageIcon,
} from 'lucide-react';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { useVocabularyLazy } from '../hooks/useVocabularyLazy';
import type { Word } from '../data/vocabulary';
import {
  buildClassicQuestion,
  buildReverseQuestion,
  buildTrueFalseQuestion,
  type MultiChoiceQuestion,
  type TrueFalseQuestion,
  type TranslationLang,
} from '../utils/buildQuestion';
import PageHero from '../components/PageHero';
import InPageCamera from '../components/InPageCamera';
import { postOcrImage, isPostOcrImageError } from '../utils/postOcrImage';
import { celebrate } from '../utils/celebrate';

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

type Phase = 'setup' | 'spinning' | 'landed' | 'question' | 'winner' | 'done';
type TargetLang = 'hebrew' | 'arabic';
type SourceKind = 'paste' | 'assignment' | 'topic' | 'camera';
type ChallengeKind = 'meaning' | 'translation' | 'true-false';
type OcrStatus = 'idle' | 'reading' | 'done' | 'error';

interface PlayerScore {
  /** Stable id assigned at game start.  Slices reference players by
   *  id (not index) so eliminating one in the middle of the list
   *  doesn't shift every other player's identity on the wheel. */
  id: number;
  name: string;
  correct: number;
  total: number;
  /** Cumulative wrong-answer count.  When this reaches maxWrongAnswers
   *  the player is removed from the wheel for the rest of the round. */
  wrongCount: number;
  eliminated: boolean;
}

interface ActiveQuestion {
  kind: ChallengeKind;
  word: Word;
  multiChoice: MultiChoiceQuestion | null;
  trueFalse: TrueFalseQuestion | null;
}

const ALL_CHALLENGES: ChallengeKind[] = ['meaning', 'translation', 'true-false'];

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

// JS easing that mirrors the visual transition.  Used twice: passed to
// motion/react as the `ease` for the spin, and inverted to schedule
// tick sound effects at the moments the wheel crosses slice boundaries.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const invertEaseOutCubic = (y: number) => 1 - Math.pow(1 - y, 1 / 3);

// ── Web Audio synthesis ──────────────────────────────────────────────
// Sound effects are generated on the fly rather than shipped as audio
// assets — keeps the bundle lean and lets us pitch ticks against the
// spin animation cleanly.  Browsers require a user gesture before
// AudioContext can produce sound, which is fine: the spin button is
// always the first call.

function playWheelTick(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 1500;
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

function playLandingChime(ctx: AudioContext) {
  // C5–E5–G5 major triad, fired in quick succession so it reads as a
  // single triumphant chime rather than three discrete notes.
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const t0 = ctx.currentTime + i * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 1.2);
  });
}

function playWinnerFanfare(ctx: AudioContext) {
  // Ascending major arpeggio (C5–E5–G5–C6–E6) followed by a sustained
  // major triad chord — sounds like "ta-da-da-DAAAA!"  Longer and
  // louder than the landing chime so the winner moment really lands.
  const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  arpeggio.forEach((freq, i) => {
    const t0 = ctx.currentTime + i * 0.13;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.55);
  });
  // Final sustained chord — C5 E5 G5 C6 — fades over 2.5s.
  const chord = [523.25, 659.25, 783.99, 1046.5];
  const chordStart = ctx.currentTime + arpeggio.length * 0.13;
  chord.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, chordStart);
    gain.gain.linearRampToValueAtTime(0.18, chordStart + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 2.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(chordStart);
    osc.stop(chordStart + 2.5);
  });
}

function playAnswerSound(ctx: AudioContext, correct: boolean) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  // Rising minor third for correct, falling tritone for wrong.
  if (correct) {
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.18);
  } else {
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(311.13, now + 0.22);
  }
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

const CHALLENGE_META: Record<ChallengeKind, { emoji: string; gradient: string; iconColor: string }> = {
  'meaning':     { emoji: '📖', gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',  iconColor: 'text-indigo-500' },
  'translation': { emoji: '🌍', gradient: 'from-emerald-500 via-teal-500 to-cyan-500',      iconColor: 'text-emerald-500' },
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
  sourceCamera: string;
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
  trueFalseLabel: string;
  trueFalseDesc: string;
  needChallenge: string;

  livesLabel: string;
  livesHint: string;
  eliminatedHeading: string;
  eliminatedSubline: string;
  outBadge: string;
  winnerHeading: string;
  winnerSubline: string;
  winnerAnswered: string;
  viewResultsBtn: string;

  startBtn: string;
  loadingWords: string;

  spinBtn: string;
  spinning: string;
  pickedHeading: string;
  challengeLabel: string;
  getReady: string;
  endRoundBtn: string;
  spinAgainBtn: string;

  pickHebrew: string;
  pickArabic: string;
  pickEnglish: string;
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
    sourceCamera: 'Camera',
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
    trueFalseLabel: 'True or False',
    trueFalseDesc: 'Is this pair correct?',
    needChallenge: 'Pick at least one challenge type.',
    livesLabel: 'Lives (wrong answers before elimination)',
    livesHint: 'When a student passes this many wrong answers their name is removed from the wheel.',
    eliminatedHeading: 'Out of the wheel',
    eliminatedSubline: 'is OUT!',
    outBadge: 'OUT',
    winnerHeading: 'Winner!',
    winnerSubline: 'Last one standing!',
    winnerAnswered: 'answered',
    viewResultsBtn: 'View Full Results',
    startBtn: 'Start the Wheel',
    loadingWords: 'Loading words…',
    spinBtn: 'SPIN',
    spinning: 'Spinning…',
    pickedHeading: "It's",
    challengeLabel: 'Challenge:',
    getReady: 'Get ready!',
    endRoundBtn: 'End Round',
    spinAgainBtn: 'Spin Again',
    pickHebrew: 'Pick the Hebrew translation',
    pickArabic: 'Pick the Arabic translation',
    pickEnglish: 'Pick the English word',
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
    sourceCamera: 'מצלמה',
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
    trueFalseLabel: 'נכון או לא נכון',
    trueFalseDesc: 'האם הזוג נכון?',
    needChallenge: 'בחר לפחות סוג אתגר אחד.',
    livesLabel: 'חיים (תשובות שגויות לפני הדחה)',
    livesHint: 'כאשר תלמיד עובר את מספר התשובות השגויות הזה — שמו יוסר מהגלגל.',
    eliminatedHeading: 'הודח מהגלגל',
    eliminatedSubline: 'בחוץ!',
    outBadge: 'בחוץ',
    winnerHeading: 'מנצח!',
    winnerSubline: 'האחרון שנותר!',
    winnerAnswered: 'תשובות',
    viewResultsBtn: 'הצג תוצאות מלאות',
    startBtn: 'התחל את הגלגל',
    loadingWords: 'טוען מילים…',
    spinBtn: 'סובב',
    spinning: 'מסתובב…',
    pickedHeading: 'זה',
    challengeLabel: 'אתגר:',
    getReady: 'תתכוננו!',
    endRoundBtn: 'סיים סבב',
    spinAgainBtn: 'סובב שוב',
    pickHebrew: 'בחר את התרגום לעברית',
    pickArabic: 'בחר את התרגום לערבית',
    pickEnglish: 'בחר את המילה באנגלית',
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
    sourceCamera: 'الكاميرا',
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
    trueFalseLabel: 'صح أم خطأ',
    trueFalseDesc: 'هل هذا الزوج صحيح؟',
    needChallenge: 'اختر نوع تحدي واحدًا على الأقل.',
    livesLabel: 'الأرواح (الإجابات الخاطئة قبل الإقصاء)',
    livesHint: 'عندما يتجاوز الطالب هذا العدد من الإجابات الخاطئة — يُزال اسمه من العجلة.',
    eliminatedHeading: 'خارج العجلة',
    eliminatedSubline: 'خرج!',
    outBadge: 'خارج',
    winnerHeading: 'الفائز!',
    winnerSubline: 'الأخير المتبقي!',
    winnerAnswered: 'إجابات',
    viewResultsBtn: 'عرض النتائج الكاملة',
    startBtn: 'ابدأ العجلة',
    loadingWords: 'جارٍ تحميل الكلمات…',
    spinBtn: 'أدر',
    spinning: 'يدور…',
    pickedHeading: 'إنه',
    challengeLabel: 'التحدي:',
    getReady: 'استعدوا!',
    endRoundBtn: 'إنهاء الجولة',
    spinAgainBtn: 'أدر مرة أخرى',
    pickHebrew: 'اختر الترجمة العبرية',
    pickArabic: 'اختر الترجمة العربية',
    pickEnglish: 'اختر الكلمة الإنجليزية',
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
    sourceCamera: 'Camera',
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
    trueFalseLabel: 'True or False',
    trueFalseDesc: 'Is this pair correct?',
    needChallenge: 'Pick at least one challenge type.',
    livesLabel: 'Lives (wrong answers before elimination)',
    livesHint: 'When a student passes this many wrong answers their name is removed from the wheel.',
    eliminatedHeading: 'Out of the wheel',
    eliminatedSubline: 'is OUT!',
    outBadge: 'OUT',
    winnerHeading: 'Winner!',
    winnerSubline: 'Last one standing!',
    winnerAnswered: 'answered',
    viewResultsBtn: 'View Full Results',
    startBtn: 'Start the Wheel',
    loadingWords: 'Loading words…',
    spinBtn: 'SPIN',
    spinning: 'Spinning…',
    pickedHeading: "It's",
    challengeLabel: 'Challenge:',
    getReady: 'Get ready!',
    endRoundBtn: 'End Round',
    spinAgainBtn: 'Spin Again',
    pickHebrew: 'Pick the Hebrew translation',
    pickArabic: 'Pick the Arabic translation',
    pickEnglish: 'Pick the English word',
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

  // Camera + OCR state.  ocrWords holds the lowercased English tokens
  // returned by /api/ocr; rawPool below looks each up in englishLookup
  // (same path as the paste source) so unknown words are silently
  // skipped instead of breaking the multi-choice.
  const [showCamera, setShowCamera] = useState(false);
  const [ocrWords, setOcrWords] = useState<string[]>([]);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [allowedChallenges, setAllowedChallenges] = useState<Set<ChallengeKind>>(
    () => new Set(ALL_CHALLENGES),
  );
  // Wrong-answer threshold per student.  When a player's wrongCount
  // reaches this, they're removed from the wheel.  Range 1-5; default
  // 3 (classic "three strikes you're out").
  const [maxWrongAnswers, setMaxWrongAnswers] = useState(3);

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

  // Filter to words that actually have the chosen target translation —
  // otherwise the multi-choice would surface English where it should
  // show Hebrew/Arabic.  Also drop fill-blank-incompatible words from
  // the fill-blank pool elsewhere.
  const wordPool: Word[] = useMemo(
    () => rawPool.filter(w => translationOf(w, targetLang).trim().length > 0),
    [rawPool, targetLang],
  );

  // OCR a captured/uploaded image and stash the resulting English tokens
  // in ocrWords.  rawPool above resolves them against englishLookup, so
  // the same matched/total hint logic the paste source uses just works.
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
    if (e.target) e.target.value = '';
  }, [handleOcrFile]);

  // ── Round state ────────────────────────────────────────────────
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [pickedPlayerId, setPickedPlayerId] = useState<number | null>(null);
  const [pickedChallenge, setPickedChallenge] = useState<ChallengeKind | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [activeQ, setActiveQ] = useState<ActiveQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [tfPicked, setTfPicked] = useState<boolean | null>(null);
  // Set when an answer just dropped a player to zero lives — the
  // wheel screen surfaces "{Name} is OUT!" for a beat before either
  // auto-spinning again or jumping to the podium.
  const [eliminationBanner, setEliminationBanner] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // Only active players appear on the wheel.  When all-but-one are
  // eliminated, the round auto-ends.
  const activePlayers = useMemo(() => players.filter(p => !p.eliminated), [players]);

  // Mirror `players` into a ref so deferred timers (auto-spin after an
  // answer) read the post-elimination state instead of a stale closure
  // from the moment the timer was scheduled.
  const playersRef = useRef<PlayerScore[]>(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ── Audio + scheduled timers ───────────────────────────────────
  // AudioContext is lazy-created on the first user gesture (the Start
  // or Spin tap).  Timer ids accumulate during a spin so we can cancel
  // them cleanly if the teacher exits mid-spin or hits End Round.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pendingTimersRef = useRef<number[]>([]);

  const getAudioCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      try {
        audioCtxRef.current = new AC();
      } catch {
        return null;
      }
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    return ctx;
  }, []);

  const clearPendingTimers = useCallback(() => {
    pendingTimersRef.current.forEach((id) => window.clearTimeout(id));
    pendingTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach((id) => window.clearTimeout(id));
      pendingTimersRef.current = [];
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        void ctx.close();
      }
    };
  }, []);

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
    const initialPlayers: PlayerScore[] = names.map((name, id) => ({
      id, name, correct: 0, total: 0, wrongCount: 0, eliminated: false,
    }));
    setPlayers(initialPlayers);
    setPickedPlayerId(null);
    setPickedChallenge(null);
    setWheelRotation(0);
    setActiveQ(null);
    setPicked(null);
    setTfPicked(null);
    setEliminationBanner(null);
    submittedRef.current = false;
    setPhase('spinning');
    // Prime the audio context on this user-gesture frame so the very
    // first tick fires reliably (browsers gate audio behind a tap).
    getAudioCtx();
    // Kick off the first spin immediately so the wheel screen never
    // shows the static "waiting" state on entry.
    const id = window.setTimeout(() => doSpin(initialPlayers, allowedChallenges, wordPool), 350);
    pendingTimersRef.current.push(id);
  };

  // Single source of truth for moving into the question phase.  Used by
  // the auto-advance scheduled at the end of a spin AND by any future
  // manual trigger.  Stays a useCallback so the timer closure in
  // doSpin can capture a stable reference.
  const showQuestionFor = useCallback(
    (challenge: ChallengeKind, pool: Word[]) => {
      const q = buildOneQuestion(challenge, pool);
      if (!q) return;
      setActiveQ(q);
      setPicked(null);
      setTfPicked(null);
      submittedRef.current = false;
      setPhase('question');
      // Auto-speak the prompt word so the kid hears it before answering.
      // For reverse questions the prompt IS the translation, so don't
      // speak the English — we'd give away the answer.
      if (q.kind === 'meaning' || q.kind === 'true-false') {
        speak(q.word.id, q.word.english);
      }
    },
    [buildOneQuestion, speak],
  );

  const doSpin = useCallback(
    (active: PlayerScore[], allowed: Set<ChallengeKind>, pool: Word[]) => {
      if (active.length < 1) return;
      clearPendingTimers();
      const targetIdx = Math.floor(Math.random() * active.length);
      const targetPlayer = active[targetIdx];
      const allowedList = Array.from(allowed);
      const challenge = allowedList[Math.floor(Math.random() * allowedList.length)];
      // Each slice spans 360/n degrees.  The pointer sits at the top
      // (angle = 0 in our rotation frame).  To land slice `targetIdx`
      // under the pointer we rotate the wheel so its centre lines up
      // there — minus a random jitter within the slice for realism.
      const sliceDeg = 360 / active.length;
      const sliceCenter = targetIdx * sliceDeg + sliceDeg / 2;
      const jitter = (Math.random() - 0.5) * sliceDeg * 0.6;
      const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 turns
      const finalRotation = fullSpins * 360 - sliceCenter - jitter;
      setPickedPlayerId(null);
      setPickedChallenge(null);
      setWheelRotation(prev => {
        // Build on whatever rotation we left off at so the wheel feels
        // continuous across spins (no snap-back to 0).
        const base = prev % 360;
        return prev - base + finalRotation;
      });

      const SPIN_MS = 3000;
      const LANDED_REVEAL_MS = 2200; // how long the "It's NAME!" reveal stays before auto-advancing
      const ctx = getAudioCtx();

      // Schedule a tick at each slice-boundary crossing.  We invert the
      // visual easing so the audio decelerates at exactly the same rate
      // as the wheel.  Ticks closer than 40ms collapse into one — keeps
      // the early "buzz" from drowning itself out.
      if (ctx) {
        const totalDeg = Math.abs(finalRotation);
        const crossings = Math.floor(totalDeg / sliceDeg);
        let lastTickMs = -1000;
        for (let i = 1; i <= crossings; i++) {
          const ratio = (i * sliceDeg) / totalDeg;
          const t = invertEaseOutCubic(ratio);
          const ms = t * SPIN_MS;
          if (ms - lastTickMs < 40) continue;
          lastTickMs = ms;
          const id = window.setTimeout(() => playWheelTick(ctx), ms);
          pendingTimersRef.current.push(id);
        }
        // Landing chime fires the instant the wheel visually stops.
        pendingTimersRef.current.push(
          window.setTimeout(() => playLandingChime(ctx), SPIN_MS),
        );
      }

      // Reveal the landed-on player + challenge a hair after the visual
      // stops so the chime and the text appear together.
      pendingTimersRef.current.push(
        window.setTimeout(() => {
          setPickedPlayerId(targetPlayer.id);
          setPickedChallenge(challenge);
          setPhase('landed');
        }, SPIN_MS + 100),
      );

      // Auto-advance into the question after the landed reveal has had
      // room to land.  Teacher can interrupt with End Round or Re-spin
      // — both call clearPendingTimers() to cancel this.
      pendingTimersRef.current.push(
        window.setTimeout(() => {
          showQuestionFor(challenge, pool);
        }, SPIN_MS + 100 + LANDED_REVEAL_MS),
      );
    },
    [clearPendingTimers, getAudioCtx, showQuestionFor],
  );

  // Re-prep the wheel state and kick off a fresh spin using whoever's
  // still alive in the current player roster.  Used by the Re-spin
  // button on the landed reveal AND by the auto-advance after an
  // answer, so both paths see the same setup.
  const startNextSpin = useCallback(() => {
    const fresh = playersRef.current.filter(p => !p.eliminated);
    if (fresh.length === 1) {
      // Last student standing — celebrate them with the winner screen
      // before dropping to the regular podium.
      clearPendingTimers();
      setEliminationBanner(null);
      setPhase('winner');
      const ctx = getAudioCtx();
      if (ctx) playWinnerFanfare(ctx);
      void celebrate('big');
      // A couple of follow-up bursts so the confetti keeps falling for
      // the full fanfare duration.
      pendingTimersRef.current.push(window.setTimeout(() => void celebrate('big'), 900));
      pendingTimersRef.current.push(window.setTimeout(() => void celebrate('normal'), 1800));
      return;
    }
    if (fresh.length === 0) {
      // Theoretical edge case — nobody left.  Skip to the podium.
      clearPendingTimers();
      setPhase('done');
      return;
    }
    clearPendingTimers();
    setEliminationBanner(null);
    setActiveQ(null);
    setPicked(null);
    setTfPicked(null);
    submittedRef.current = false;
    setPhase('spinning');
    doSpin(fresh, allowedChallenges, wordPool);
  }, [allowedChallenges, clearPendingTimers, doSpin, getAudioCtx, wordPool]);

  const handleSpin = () => {
    if (phase === 'spinning') return;
    startNextSpin();
  };

  // Record the answer AND drive the post-answer flow (feedback delay
  // → optional elimination banner → auto-spin or podium).  Centralised
  // here so MC and T/F handlers stay short.
  const finishAnswer = (isCorrect: boolean) => {
    if (pickedPlayerId === null) return;
    const current = players.find(p => p.id === pickedPlayerId);
    if (!current) return;
    const nextWrongCount = current.wrongCount + (isCorrect ? 0 : 1);
    const willEliminate = !isCorrect && nextWrongCount >= maxWrongAnswers;

    setPlayers(prev =>
      prev.map(p => {
        if (p.id !== pickedPlayerId) return p;
        return {
          ...p,
          correct: p.correct + (isCorrect ? 1 : 0),
          total: p.total + 1,
          wrongCount: nextWrongCount,
          eliminated: willEliminate ? true : p.eliminated,
        };
      }),
    );

    const ctx = getAudioCtx();
    if (ctx) playAnswerSound(ctx, isCorrect);

    // Reveal feedback for ~1.4s.  If this answer eliminated a player,
    // a "X is OUT!" banner appears at 0.8s and the next-step delay
    // extends so the class registers the elimination before the wheel
    // spins again.
    const ANSWER_FEEDBACK_MS = 1400;
    const ELIMINATION_BANNER_DELAY_MS = 800;
    const ELIMINATION_EXTRA_MS = 1200;

    if (willEliminate) {
      pendingTimersRef.current.push(
        window.setTimeout(() => setEliminationBanner(current.name), ELIMINATION_BANNER_DELAY_MS),
      );
    }

    pendingTimersRef.current.push(
      window.setTimeout(
        () => startNextSpin(),
        ANSWER_FEEDBACK_MS + (willEliminate ? ELIMINATION_EXTRA_MS : 0),
      ),
    );
  };

  const handleAnswerMultiChoice = (option: string) => {
    if (!activeQ || !activeQ.multiChoice || picked || submittedRef.current) return;
    submittedRef.current = true;
    setPicked(option);
    const correct = activeQ.multiChoice.options[activeQ.multiChoice.correctIndex];
    finishAnswer(option === correct);
  };

  const handleAnswerTrueFalse = (value: boolean) => {
    if (!activeQ || !activeQ.trueFalse || tfPicked !== null || submittedRef.current) return;
    submittedRef.current = true;
    setTfPicked(value);
    finishAnswer(value === activeQ.trueFalse.isTrue);
  };

  const handleEndRound = () => {
    clearPendingTimers();
    setEliminationBanner(null);
    setPhase('done');
  };

  const handlePlayAgain = () => {
    clearPendingTimers();
    const reset: PlayerScore[] = players.map(p => ({
      ...p,
      correct: 0,
      total: 0,
      wrongCount: 0,
      eliminated: false,
    }));
    setPlayers(reset);
    setPickedPlayerId(null);
    setPickedChallenge(null);
    setWheelRotation(0);
    setActiveQ(null);
    setPicked(null);
    setTfPicked(null);
    setEliminationBanner(null);
    submittedRef.current = false;
    setPhase('spinning');
    const id = window.setTimeout(() => doSpin(reset, allowedChallenges, wordPool), 350);
    pendingTimersRef.current.push(id);
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
                {sourceKind === 'camera' && (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500">{t.cameraHint}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-stone-900 text-white font-bold text-sm active:scale-[0.98] transition"
                      >
                        <Camera size={16} />
                        {t.cameraBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white border-2 border-stone-200 text-stone-700 font-bold text-sm hover:border-violet-200 active:scale-[0.98] transition"
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

              {/* Lives picker — 1 to 5 wrong answers before elimination */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  {t.livesLabel}
                </label>
                <p className="text-xs text-stone-500 mb-2">{t.livesHint}</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxWrongAnswers(n)}
                      aria-pressed={maxWrongAnswers === n}
                      style={{ touchAction: 'manipulation' }}
                      className={`flex-1 py-2.5 rounded-lg font-black text-base border-2 transition-all ${
                        maxWrongAnswers === n
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-rose-200'
                      }`}
                    >
                      {n}
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
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── SPINNING / LANDED ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'spinning' || phase === 'landed') {
    const sliceDeg = activePlayers.length > 0 ? 360 / activePlayers.length : 0;
    const pickedPlayer = pickedPlayerId !== null
      ? players.find(p => p.id === pickedPlayerId) ?? null
      : null;
    const pickedMeta = pickedChallenge ? CHALLENGE_META[pickedChallenge] : null;
    const challengeLabel: Record<ChallengeKind, string> = {
      'meaning': t.meaningLabel,
      'translation': t.translationLabel,
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
          <Scoreboard players={players} label={t.scoreboard} outBadge={t.outBadge} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8">
          {/* Wheel — three layers: static gold frame with studs, rotating
              slices, fixed dome highlight on top.  Splitting the frame
              from the rotating slices is what makes the wheel feel like
              a physical object: the highlight stays put as the wheel
              spins underneath it. */}
          <div className="relative" style={{ width: 'min(86vw, 540px)', height: 'min(86vw, 540px)' }}>
            {/* Soft ground shadow under the wheel — helps it feel
                anchored rather than floating against the gradient bg. */}
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-full blur-xl bg-stone-900/35 pointer-events-none"
              aria-hidden
            />

            {/* Layer 1: static frame — gold metal ring + lightbulb studs */}
            <svg viewBox="0 0 220 220" className="absolute inset-0 w-full h-full drop-shadow-2xl">
              <defs>
                <radialGradient id="vb-wheel-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(250, 204, 21, 0.5)" />
                  <stop offset="55%" stopColor="rgba(250, 204, 21, 0.15)" />
                  <stop offset="100%" stopColor="rgba(250, 204, 21, 0)" />
                </radialGradient>
                <radialGradient id="vb-wheel-rim" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="40%" stopColor="#fbbf24" />
                  <stop offset="75%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#78350f" />
                </radialGradient>
                <radialGradient id="vb-wheel-rim-inner" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#451a03" />
                  <stop offset="100%" stopColor="#1c1917" />
                </radialGradient>
              </defs>
              <circle cx="110" cy="110" r="108" fill="url(#vb-wheel-glow)" />
              <circle cx="110" cy="110" r="106" fill="url(#vb-wheel-rim)" />
              <circle cx="110" cy="110" r="100" fill="url(#vb-wheel-rim-inner)" />
              {/* 24 alternating "lightbulb" studs around the rim — gives
                  the casino / fairground wheel look without needing any
                  CSS animation noise. */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * 360;
                const pos = polarToCart(110, 110, 103, angle);
                const isLit = i % 2 === 0;
                return (
                  <g key={`stud-${i}`}>
                    {isLit && (
                      <circle cx={pos.x} cy={pos.y} r="3.6" fill="rgba(254, 240, 138, 0.55)" />
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="2.2"
                      fill={isLit ? '#fef3c7' : '#fbbf24'}
                      stroke={isLit ? '#facc15' : '#92400e'}
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Layer 2: rotating wheel — slices, labels, hub */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3, ease: easeOutCubic }}
            >
              <svg viewBox="0 0 220 220" className="w-full h-full">
                <defs>
                  {SLICE_COLORS.map((color, i) => (
                    <radialGradient key={`vb-slice-${i}`} id={`vb-slice-${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={color} stopOpacity="1" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.82" />
                    </radialGradient>
                  ))}
                </defs>
                {activePlayers.map((p, i) => {
                  const startAngle = i * sliceDeg;
                  const endAngle = (i + 1) * sliceDeg;
                  const midAngle = startAngle + sliceDeg / 2;
                  const labelPos = polarToCart(110, 110, 68, midAngle);
                  // Colour by stable player id so a kid's slice colour
                  // doesn't reshuffle when somebody else gets eliminated.
                  const colorIdx = p.id % SLICE_COLORS.length;
                  return (
                    <g key={`player-${p.id}`}>
                      <path
                        d={slicePath(startAngle, endAngle, 96, 110, 110)}
                        fill={`url(#vb-slice-${colorIdx})`}
                        stroke="rgba(15, 23, 42, 0.55)"
                        strokeWidth="1.2"
                      />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.max(7, 15 - activePlayers.length * 0.32)}
                        fontWeight={900}
                        transform={`rotate(${midAngle} ${labelPos.x} ${labelPos.y})`}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                      >
                        {p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name}
                      </text>
                    </g>
                  );
                })}
                {/* Centre hub — black outer ring, gold dome, black inner
                    bezel, dark axle.  The tiny pale dot near the top is
                    an asymmetry so the rotation is visible at the centre. */}
                <circle cx="110" cy="110" r="22" fill="#0f172a" />
                <circle cx="110" cy="110" r="20" fill="url(#vb-wheel-rim)" />
                <circle cx="110" cy="110" r="9" fill="#1c1917" />
                <circle cx="110" cy="110" r="7" fill="url(#vb-wheel-rim-inner)" />
                <circle cx="110" cy="98" r="1.4" fill="#fef3c7" />
              </svg>
            </motion.div>

            {/* Layer 3: fixed dome highlight on top — sells the 3D /
                physical object look.  Top-left is bright, bottom-right
                is shadowed, simulating a light source above. */}
            <svg
              viewBox="0 0 220 220"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden
            >
              <defs>
                <radialGradient id="vb-wheel-dome" cx="30%" cy="25%" r="85%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                  <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
                  <stop offset="75%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
                </radialGradient>
              </defs>
              <circle cx="110" cy="110" r="96" fill="url(#vb-wheel-dome)" />
            </svg>

            {/* Pointer — three-tone metallic arrow, drop-shadow casts
                onto the wheel so it reads as physically in front. */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 drop-shadow-xl">
              <svg width="56" height="68" viewBox="0 0 52 62">
                <defs>
                  <linearGradient id="vb-pointer-metal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fef3c7" />
                    <stop offset="45%" stopColor="#fbbf24" />
                    <stop offset="80%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                  <linearGradient id="vb-pointer-shine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <path d="M 26 62 L 0 14 Q 26 -2 52 14 Z" fill="#0f172a" />
                <path d="M 26 56 L 6 18 Q 26 5 46 18 Z" fill="url(#vb-pointer-metal)" />
                <path d="M 26 50 L 12 22 Q 26 14 40 22 Z" fill="url(#vb-pointer-shine)" opacity="0.45" />
                <circle cx="26" cy="22" r="3" fill="#0f172a" />
                <circle cx="26" cy="22" r="1.8" fill="#fef3c7" />
              </svg>
            </div>
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
                  {/* Auto-advance pulse — signals the question is about
                      to appear without making the teacher tap.  Re-spin
                      / End Round still let them bail before it fires. */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.6, 1] }}
                    transition={{ duration: 1.8, times: [0, 0.3, 0.6, 1] }}
                    className="text-sm font-bold text-violet-700"
                  >
                    {t.getReady}
                  </motion.p>
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
                      onClick={handleSpin}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      className="py-3 rounded-lg bg-white text-violet-700 border-2 border-violet-200 font-black text-sm hover:bg-violet-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
                    >
                      <Disc3 size={16} />
                      {t.spinAgainBtn}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile scoreboard at the bottom */}
        <div className="sm:hidden mt-4">
          <Scoreboard players={players} label={t.scoreboard} outBadge={t.outBadge} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── QUESTION ───────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'question' && activeQ && pickedPlayerId !== null && pickedChallenge) {
    const pickedPlayer = players.find(p => p.id === pickedPlayerId);
    if (!pickedPlayer) return null;
    const pickedMeta = CHALLENGE_META[pickedChallenge];
    const mc = activeQ.multiChoice;
    const tf = activeQ.trueFalse;

    // Options dir + prompt dir vary by challenge kind.  For meaning the
    // options are HE/AR (rtl), for translation they're English (ltr),
    // for fill-blank options are English (ltr), for true-false the
    // shown translation is HE/AR (rtl).
    const promptIsEnglish = activeQ.kind === 'meaning' || activeQ.kind === 'true-false';
    const optionsAreEnglish = activeQ.kind === 'translation';
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
                  : t.pickEnglish}
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Elimination overlay — full-screen for ~1.2s after a wrong
            answer pushes a player past their last life.  Pure visual,
            timer in finishAnswer drives mount/unmount. */}
        <AnimatePresence>
          {eliminationBanner && (
            <motion.div
              key="elim-banner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/70 backdrop-blur-sm pointer-events-none"
              dir={dir}
            >
              <motion.div
                initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                className="px-10 py-8 rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 text-white text-center shadow-2xl"
              >
                <p className="text-sm font-black uppercase tracking-[0.4em] mb-3 opacity-90">
                  {t.eliminatedHeading}
                </p>
                <h2 className="text-6xl sm:text-8xl font-black break-words">
                  {eliminationBanner}
                </h2>
                <p className="mt-4 text-2xl font-black">{t.eliminatedSubline}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── WINNER — last student standing ─────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'winner') {
    const winner = activePlayers[0];
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
        dir={dir}
      >
        {/* Soft radial halo behind the name to lift it off the
            gradient bg without going full-on glow. */}
        <div className="absolute inset-0 pointer-events-none opacity-50"
             style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)' }}
             aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center relative z-10 max-w-3xl"
        >
          {/* Big trophy */}
          <motion.div
            initial={{ scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            className="text-9xl sm:text-[10rem] mb-4 inline-block"
            style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))' }}
          >
            🏆
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm sm:text-base font-black uppercase tracking-[0.4em] text-white/90 mb-2"
          >
            {t.winnerHeading}
          </motion.p>

          <motion.h1
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.5 }}
            className="text-6xl sm:text-8xl md:text-9xl font-black text-white break-words leading-tight"
            style={{ textShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
          >
            {winner?.name ?? ''}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-xl sm:text-3xl font-black text-white/95 mt-3"
          >
            {t.winnerSubline}
          </motion.p>

          {winner && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur text-white font-black text-base"
            >
              <span>✓ {winner.correct}</span>
              <span className="opacity-60">·</span>
              <span>{winner.total} {t.winnerAnswered}</span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-8 flex items-center justify-center gap-3 flex-wrap"
          >
            <button
              type="button"
              onClick={() => setPhase('done')}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="px-6 py-3.5 rounded-xl bg-white text-orange-600 font-black text-base shadow-lg active:scale-[0.98] transition flex items-center gap-2"
            >
              <Trophy size={18} />
              {t.viewResultsBtn}
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{ touchAction: 'manipulation' }}
              className="px-5 py-3.5 rounded-xl bg-white/15 text-white border-2 border-white/30 font-black text-base hover:bg-white/25 active:scale-[0.98] transition"
            >
              {t.done}
            </button>
          </motion.div>
        </motion.div>
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
function Scoreboard({
  players,
  label,
  outBadge,
}: {
  players: PlayerScore[];
  label: string;
  outBadge: string;
}) {
  // Active players ranked first (by correct, then total), eliminated
  // appended below in elimination order so the teacher can see
  // everyone's score at a glance.
  const sorted = [...players]
    .map((p, i) => ({ ...p, idx: i }))
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      return b.correct - a.correct || b.total - a.total || a.idx - b.idx;
    })
    .slice(0, 6);
  return (
    <div className="rounded-xl bg-white/85 backdrop-blur shadow-md border border-violet-100 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1.5">
        {label}
      </p>
      <ul className="space-y-1">
        {sorted.map((p, i) => (
          <li
            key={`${p.name}-${p.idx}`}
            className={`flex items-center justify-between gap-3 text-sm ${
              p.eliminated ? 'opacity-55' : ''
            }`}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs w-4 text-center">{i < 3 && !p.eliminated ? MEDAL[i] : `${i + 1}`}</span>
              <span className={`font-bold truncate ${p.eliminated ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                {p.name}
              </span>
              {p.eliminated && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-600">
                  {outBadge}
                </span>
              )}
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
