import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  X,
  Volume2,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Gift,
  Sparkles,
  Check,
  ShoppingBag,
  Trophy,
  Crown,
  Target,
  BookOpen,
  PenTool,
  CheckCircle2,
  Layers,
  Shuffle,
  Repeat,
  Globe,
  GraduationCap,
  Star,
} from "lucide-react";
import { Word, ALL_WORDS } from "../data/vocabulary";
import { useAudio } from "../hooks/useAudio";
import { useLanguage, Language } from "../hooks/useLanguage";
import { AvatarPicker } from "./AvatarPicker";
import { isAnswerCorrect, cleanWordForDisplay } from "../utils/answerMatch";
import { MYSTERY_EGGS, THEMES, NAME_FRAMES } from "../constants/game";
import { DIFFICULTY_META, getModeDifficulty } from "./setup/types";

interface DemoModeProps {
  onClose: () => void;
}

type DemoView = "welcome" | "avatar" | "game-select" | "mode-intro" | "game" | "results" | "shop";
type ShopTab = "eggs" | "avatars" | "themes" | "frames" | "titles" | "powerups" | "premium";

// Avatar categories pulled from the real app constants so the demo shop
// shows the same 17-category ladder students actually see in production.
import { AVATAR_CATEGORIES as REAL_AVATAR_CATEGORIES } from "../constants/avatars";
import { AVATAR_CATEGORY_UNLOCKS } from "../constants/game";

const PREMIUM_AVATARS = [
  { emoji: '🐉', name: 'Dragon', cost: 50 },
  { emoji: '🦅', name: 'Eagle', cost: 50 },
  { emoji: '🐺', name: 'Wolf', cost: 75 },
  { emoji: '👑', name: 'King', cost: 100 },
  { emoji: '🎖️', name: 'General', cost: 100 },
];

// XP Titles matching full app
const XP_TITLES = [
  { min: 0, title: "Newbie", color: "#9CA3AF" },
  { min: 50, title: "Rising Star", color: "#60B5FF" },
  { min: 150, title: "Word Wizard", color: "#FCD34D" },
  { min: 300, title: "Vocab Master", color: "#F97316" },
  { min: 500, title: "Legend", color: "#EF4444" },
];

// Power-ups matching full app
const POWER_UPS = [
  { id: 'skip', name: 'Skip Word', emoji: '⏭️', desc: 'Skip without penalty', cost: 0, freeInDemo: 3 },
  { id: 'fifty_fifty', name: '50/50', emoji: '✂️', desc: 'Remove 2 wrong answers', cost: 0, freeInDemo: 3 },
  { id: 'reveal_letter', name: 'Hint', emoji: '💡', desc: 'Reveal first letter', cost: 0, freeInDemo: 3 },
];

// Demo words — 50 carefully-curated Set 1 words presented in a gentle
// ramp from easiest to hardest so a brand-new visitor succeeds on the
// first handful and only slowly meets trickier words.  Difficulty is
// approximated by English word length (shortest first) — not perfect
// but a good proxy for "cat/dog/run" vs "butterfly/understand".
//
// IMPORTANT: the vocabulary data uses level: "Set 1" (see
// src/data/vocabulary.ts).  An earlier version of this filter said
// 'Band 1' (legacy terminology) which matched NO words and left the
// demo with an empty pool — rendering every game mode screen blank.
const DEMO_WORDS: Word[] = ALL_WORDS
  .filter(w => w.level === 'Set 1')
  .slice()
  .sort((a, b) => a.english.length - b.english.length || a.english.localeCompare(b.english))
  .slice(0, 50);

// Translations
const demoTranslations: Record<Language, Record<string, string>> = {
  en: {
    demoMode: "Demo Mode — a hands-on preview of Vocaband",
    signUpFree: "",
    welcomeTitle: "Welcome to Vocaband",
    welcomeDesc: "An English vocabulary app students actually want to play — built for Israeli classrooms.",
    introHook: "Why Vocaband?",
    introHookBody: "Most vocabulary practice feels like homework. Vocaband turns it into a game: XP, streaks, avatars, mystery eggs, and 10 game modes keep students coming back. Teachers get clear analytics on every word each student is learning.",
    forTeachersTitle: "For English Teachers",
    forTeachersDesc: "Create assignments in minutes, track per-student + per-word mastery, run live challenges, and grade automatically.",
    forStudentsTitle: "For Students",
    forStudentsDesc: "1000+ curated words from Sets 1–3. 10 game modes. XP, streaks, avatars, and a shop full of cosmetics and power-ups.",
    tryDemoIntro: "In the next 2 minutes you'll play a real game mode with 10 sample words and see the XP, avatar and shop systems live.",
    experienceTitle: "What you'll try in this demo:",
    sampleWords: "100 sample words from Set 1 (real vocabulary)",
    gameModes: "A real game mode, end-to-end",
    xpStreak: "XP, streak, and title progression",
    achievements: "Achievements & reward pop-ups",
    shopPreview: "A tour of the avatar + shop system",
    fullVersionTitle: "The full version adds:",
    fullVersionBullets: "• 1000+ words across Sets 1–3\n• 10+ game modes (Classic, Spelling, Matching, Listening, Flashcards, Sentence Builder…)\n• Teacher dashboard, class codes, live challenges, gradebook\n• Mystery eggs, premium avatars, themes, titles, frames, boosters\n• Per-student word-mastery analytics",
    demoRuntime: "~2 minutes, no account needed",
    letsGo: "Start the demo →",
    chooseAvatar: "Choose Your Avatar",
    pickEmoji: "Pick an emoji to represent you",
    yourName: "Your Name",
    enterNickname: "Enter a nickname...",
    continue: "Continue",
    back: "Back",
    chooseGame: "Choose a Game Mode",
    tryPopular: "Try one of our popular modes!",
    exit: "Exit",
    orTryShop: "or Visit Shop",
    wordOf: "Word {current} of {total}",
    tapToHear: "Tap to hear",
    whatDoesMean: "What does this word mean?",
    correct: "Correct!",
    notQuite: "Not quite!",
    theAnswerIs: "The answer is:",
    matched: "Matched:",
    tapCards: "Tap matching pairs",
    tapTwoCards: "Tap two cards to match words with meanings",
    greatJob: "Great Job!",
    completedDemo: "You've completed the demo!",
    correctAns: "Correct",
    xpEarned: "XP Earned",
    yourAvatar: "Your Avatar",
    wantMore: "What you just saw",
    unlockFeatures: "This was a taste of what students experience every day in Vocaband. The full version expands into 1000+ words, 10+ game modes, live class challenges, and a full teacher dashboard.",
    playAgain: "Play Again",
    closeDemo: "Close Demo",
    signFree: "",
    check: "Check",
    typeWord: "Type the word in English",
    translation: "Translation:",
    unscramble: "Unscramble the letters",
    listenType: "Listen and type what you hear",
    trueFalse: "Is this translation correct?",
    trueBtn: "True",
    falseBtn: "False",
    flashcardTap: "Tap to flip",
    flashcardMeaning: "Meaning",
    flashcardWord: "Word",
    reverseTitle: "Translate to English",
    next: "Next",
    skip: "Skip",
    hint: "Hint",
    shop: "🛍️ Shop",
    shopFull: "Shop available in full version!",
    avatars: "Avatars",
    themes: "Themes",
    powerups: "Power-ups",
    freeInDemo: "FREE in demo!",
    premium: "Premium",
    selectAvatar: "Select Avatar",
    xpTitle: "XP Title",
    currentTitle: "Current Title",
    unlockedInFull: "Unlock in full version",
    youEarned: "You earned",
    totalXP: "Total XP",
    wordsLearned: "words mastered",
    badgesEarned: "Badges",
  },
  he: {
    demoMode: "מצב הדגמה — הצצה מעשית ל-Vocaband",
    signUpFree: "",
    welcomeTitle: "ברוכים הבאים ל-Vocaband",
    welcomeDesc: "אפליקציית אוצר מילים באנגלית שתלמידים באמת רוצים לשחק — תפורה לכיתה הישראלית.",
    introHook: "למה Vocaband?",
    introHookBody: "רוב התרגולים של אוצר מילים מרגישים כמו שיעורי בית. Vocaband הופכת את זה למשחק: XP, רצפים, אווטרים, ביצי פתעה ו-10 מצבי משחק שמחזירים את התלמידים שוב ושוב. למורים יש אנליטיקה ברורה על כל מילה שכל תלמיד לומד.",
    forTeachersTitle: "למורים לאנגלית",
    forTeachersDesc: "צרו מטלות תוך דקות, עקבו אחר שליטה במילים לכל תלמיד, נהלו אתגרים בכיתה וקבלו הערכה אוטומטית.",
    forStudentsTitle: "לתלמידים",
    forStudentsDesc: "1000+ מילים ערוכות מ-Set 1 עד 3. 10 מצבי משחק. XP, רצפים, אווטרים וחנות מלאה בפריטים קוסמטיים וחיזוקים.",
    tryDemoIntro: "בשתי הדקות הבאות תשחקו במצב משחק אמיתי עם 10 מילים לדוגמה ותראו איך מערכת ה-XP, האווטרים והחנות עובדת.",
    experienceTitle: "מה תנסו בהדגמה:",
    sampleWords: "100 מילים לדוגמה מ-Set 1 (אוצר מילים אמיתי)",
    gameModes: "מצב משחק אמיתי, מתחילתו עד סופו",
    xpStreak: "התקדמות XP, רצפים ותארים",
    achievements: "הישגים וחלונות פרסים",
    shopPreview: "סיור במערכת האווטרים והחנות",
    fullVersionTitle: "הגרסה המלאה מוסיפה:",
    fullVersionBullets: "• 1000+ מילים ב-Sets 1–3\n• 10+ מצבי משחק (קלאסי, איות, התאמה, הקשבה, כרטיסיות, בונה משפטים…)\n• לוח מורה, קודי כיתה, אתגרי חי, ספר ציונים\n• ביצי פתעה, אווטרים פרימיום, ערכות נושא, תארים, מסגרות וחיזוקים\n• אנליטיקה של שליטה במילים לכל תלמיד",
    demoRuntime: "~2 דקות, בלי הרשמה",
    letsGo: "התחילו את ההדגמה ←",
    chooseAvatar: "בחרו את האווטר שלכם",
    pickEmoji: "בחרו אימוג'י שייצג אתכם",
    yourName: "השם שלכם",
    enterNickname: "הזינו כינוי...",
    continue: "המשך",
    back: "חזור",
    chooseGame: "בחרו מצב משחק",
    tryPopular: "נסו אחד ממצבי המשחק הפופולריים!",
    exit: "יציאה",
    orTryShop: "או בקרו בחנות",
    wordOf: "מילה {current} מתוך {total}",
    tapToHear: "הקישו לשמיעה",
    whatDoesMean: "מה פירוש המילה הזו?",
    correct: "נכון!",
    notQuite: "לא ממש!",
    theAnswerIs: "התשובה היא:",
    matched: "התאמות:",
    tapCards: "התאימו זוגות",
    tapTwoCards: "הקישו על שני כרטיסים להתאמת מילים לפירושים",
    greatJob: "עבודה טובה!",
    completedDemo: "סיימתם את ההדגמה!",
    correctAns: "נכונות",
    xpEarned: "XP שנצבר",
    yourAvatar: "האווטר שלכם",
    wantMore: "מה ראיתם עכשיו",
    unlockFeatures: "זו הייתה טעימה ממה שתלמידים חווים כל יום ב-Vocaband. הגרסה המלאה מתרחבת ל-1000+ מילים, 10+ מצבי משחק, אתגרים חיים בכיתה, ולוח מורה מלא.",
    playAgain: "שחקו שוב",
    closeDemo: "סגור הדגמה",
    signFree: "",
    check: "בדוק",
    typeWord: "הקלד את המילה באנגלית",
    translation: "תרגום:",
    unscramble: "סדר את האותיות",
    listenType: "הקשב והקלד מה שאתה שומע",
    trueFalse: "האם התרגום נכון?",
    trueBtn: "נכון",
    falseBtn: "לא נכון",
    flashcardTap: "הקש להפיכה",
    flashcardMeaning: "פירוש",
    flashcardWord: "מילה",
    reverseTitle: "תרגם לאנגלית",
    next: "הבא",
    skip: "דלג",
    hint: "רמז",
    shop: "🛍️ חנות",
    shopFull: "החנות זמינה בגרסה המלאה!",
    avatars: "אווטרים",
    themes: "ערכות נושא",
    powerups: "חיזוקים",
    freeInDemo: "חינם בהדגמה!",
    premium: "פרימיום",
    selectAvatar: "בחר אווטר",
    xpTitle: "תואר XP",
    currentTitle: "תואר נוכחי",
    unlockedInFull: "פתיח בגרסה המלאה",
    youEarned: "הרווחת",
    totalXP: "סה\"כ XP",
    wordsLearned: "מילים שנלמדו",
    badgesEarned: "הישגים",
  },
  ar: {
    demoMode: "وضع تجريبي — معاينة عملية لـ Vocaband",
    signUpFree: "",
    welcomeTitle: "مرحباً بك في Vocaband",
    welcomeDesc: "تطبيق مفردات إنجليزية يرغب الطلاب فعلاً في اللعب به — مصمم للصفوف الإسرائيلية.",
    introHook: "لماذا Vocaband؟",
    introHookBody: "معظم تمارين المفردات تشبه الواجبات. Vocaband يحولها إلى لعبة: XP، سلاسل، صور رمزية، بيض مفاجآت، و10 أوضاع لعب تُبقي الطلاب يعودون. يحصل المعلمون على تحليلات واضحة لكل كلمة يتعلمها كل طالب.",
    forTeachersTitle: "لمعلمي الإنجليزية",
    forTeachersDesc: "أنشئ واجبات خلال دقائق، تابع إتقان الكلمات لكل طالب، أدر تحديات مباشرة في الصف، واحصل على تقييم تلقائي.",
    forStudentsTitle: "للطلاب",
    forStudentsDesc: "1000+ كلمة منسقة من Sets 1–3. 10 أوضاع لعب. XP، سلاسل، صور رمزية، ومتجر مليء بالتحسينات والتعزيزات.",
    tryDemoIntro: "في الدقيقتين التاليتين ستلعب وضع لعبة حقيقياً مع 10 كلمات نموذجية وترى نظام XP والصور الرمزية والمتجر يعمل مباشرة.",
    experienceTitle: "ما ستجربه في هذا العرض:",
    sampleWords: "100 كلمات نموذجية من Set 1 (مفردات حقيقية)",
    gameModes: "وضع لعبة حقيقي، من البداية إلى النهاية",
    xpStreak: "تقدم XP والسلاسل والألقاب",
    achievements: "الإنجازات وإشعارات المكافآت",
    shopPreview: "جولة في نظام الصور الرمزية والمتجر",
    fullVersionTitle: "النسخة الكاملة تضيف:",
    fullVersionBullets: "• 1000+ كلمة في Sets 1–3\n• 10+ أوضاع لعب (كلاسيكي، تهجئة، مطابقة، استماع، بطاقات، بناء جمل…)\n• لوحة المعلم، رموز الصف، تحديات مباشرة، دفتر درجات\n• بيض مفاجآت، صور رمزية مميزة، مظاهر، ألقاب، إطارات، معززات\n• تحليلات إتقان الكلمات لكل طالب",
    demoRuntime: "~2 دقائق، دون حساب",
    letsGo: "ابدأ العرض التجريبي ←",
    chooseAvatar: "اختر صورتك الرمزية",
    pickEmoji: "اختر إيموجي يمثلك",
    yourName: "اسمك",
    enterNickname: "أدخل اسمًا مستعارًا...",
    continue: "متابعة",
    back: "رجوع",
    chooseGame: "اختر وضع اللعب",
    tryPopular: "جرب أحد أوضاع اللعب الشائعة!",
    exit: "خروج",
    orTryShop: "أو جرب المتجر",
    wordOf: "الكلمة {current} من {total}",
    tapToHear: "اضغط للاستماع",
    whatDoesMean: "ما معنى هذه الكلمة؟",
    correct: "صحيح!",
    notQuite: "ليس تماماً!",
    theAnswerIs: "الإجابة هي:",
    matched: "مطابق:",
    tapCards: "طابق الأزواج",
    tapTwoCards: "اضغط على بطاقتين لمطابقة الكلمات مع المعاني",
    greatJob: "عمل رائع!",
    completedDemo: "لقد أكملت العرض التجريبي!",
    correctAns: "صحيح",
    xpEarned: "XP المكتسب",
    yourAvatar: "صورتك الرمزية",
    wantMore: "ما شاهدته للتو",
    unlockFeatures: "كانت تلك نكهة مما يختبره الطلاب كل يوم في Vocaband. النسخة الكاملة تتوسع إلى 1000+ كلمة، 10+ أوضاع لعب، تحديات صف مباشرة، ولوحة معلم كاملة.",
    playAgain: "العب مرة أخرى",
    closeDemo: "إغلاق العرض",
    signFree: "",
    check: "تحقق",
    typeWord: "اكتب الكلمة بالإنجليزية",
    translation: "الترجمة:",
    unscramble: "رتب الحروف",
    listenType: "استمع واكتب ما تسمعه",
    trueFalse: "هل هذه الترجمة صحيحة؟",
    trueBtn: "صحيح",
    falseBtn: "خطأ",
    flashcardTap: "اضغط للقلب",
    flashcardMeaning: "المعنى",
    flashcardWord: "الكلمة",
    reverseTitle: "ترجم إلى الإنجليزية",
    next: "التالي",
    skip: "تخطي",
    hint: "تلميح",
    shop: "🛍️ المتجر",
    shopFull: "المتجر متاح في النسخة الكاملة!",
    avatars: "الصور الرمزية",
    themes: "المظاهر",
    powerups: "القوى",
    freeInDemo: "مجاني في العرض التجريبي!",
    premium: "مميز",
    selectAvatar: "اختر الصورة",
    xpTitle: "لقب XP",
    currentTitle: "اللقب الحالي",
    unlockedInFull: "فتح في النسخة الكاملة",
    youEarned: "كسبت",
    totalXP: "مجموع XP",
    wordsLearned: "كلمات تم إتقانها",
    badgesEarned: "الشارات",
  },
};

// Visual mapping for mode cards — mirrors the real app's
// GameModeSelectionView exactly (same Tailwind palette, same Lucide icons).
// Keeping these two maps rather than hex codes means when the real view
// swaps a colour, updating this map keeps demo in sync with one edit.
// Color classes matching GameModeSelectionView exactly
const colorClasses: Record<string, string> = {
  emerald: "bg-blue-50 border-blue-100 hover:bg-blue-50 text-blue-700",
  blue: "bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-700",
  purple: "bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-700",
  amber: "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700",
  rose: "bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700",
  cyan: "bg-cyan-50 border-cyan-100 hover:bg-cyan-100 text-cyan-700",
  indigo: "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700",
  fuchsia: "bg-fuchsia-50 border-fuchsia-100 hover:bg-fuchsia-100 text-fuchsia-700",
  violet: "bg-violet-50 border-violet-100 hover:bg-violet-100 text-violet-700",
  teal: "bg-teal-50 border-teal-100 hover:bg-teal-100 text-teal-700",
};

const iconColorClasses: Record<string, string> = {
  emerald: "text-blue-700",
  blue: "text-blue-600",
  purple: "text-purple-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  cyan: "text-cyan-600",
  indigo: "text-indigo-600",
  fuchsia: "text-fuchsia-600",
  violet: "text-violet-600",
  teal: "text-teal-600",
};

// Mode color mapping
const MODE_COLORS: Record<string, string> = {
  classic: "emerald",
  listening: "blue",
  spelling: "purple",
  matching: "amber",
  "true-false": "rose",
  flashcards: "cyan",
  scramble: "indigo",
  reverse: "fuchsia",
  "letter-sounds": "violet",
  "sentence-builder": "teal",
};

const MODE_CARD_CLASSES: Record<string, string> = {
  classic:      'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200 text-emerald-800 shadow-emerald-200/50 hover:shadow-emerald-300/70',
  listening:    'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 text-blue-800 shadow-blue-200/50 hover:shadow-blue-300/70',
  spelling:     'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200 text-purple-800 shadow-purple-200/50 hover:shadow-purple-300/70',
  matching:     'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:from-amber-100 hover:to-amber-200 text-amber-800 shadow-amber-200/50 hover:shadow-amber-300/70',
  "true-false":    'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 hover:from-rose-100 hover:to-rose-200 text-rose-800 shadow-rose-200/50 hover:shadow-rose-300/70',
  flashcards:   'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:from-cyan-100 hover:to-cyan-200 text-cyan-800 shadow-cyan-200/50 hover:shadow-cyan-300/70',
  scramble:     'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:from-indigo-100 hover:to-indigo-200 text-indigo-800 shadow-indigo-200/50 hover:shadow-indigo-300/70',
  reverse:      'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 border-fuchsia-200 hover:from-fuchsia-100 hover:to-fuchsia-200 text-fuchsia-800 shadow-fuchsia-200/50 hover:shadow-fuchsia-300/70',
  "letter-sounds": 'bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 hover:from-violet-100 hover:to-violet-200 text-violet-800 shadow-violet-200/50 hover:shadow-violet-300/70',
  "sentence-builder":     'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 hover:from-teal-100 hover:to-teal-200 text-teal-800 shadow-teal-200/50 hover:shadow-teal-300/70',
};

const MODE_ICON_COLORS: Record<string, string> = {
  classic:      'text-emerald-600 bg-emerald-100',
  listening:    'text-blue-600 bg-blue-100',
  spelling:     'text-purple-600 bg-purple-100',
  matching:     'text-amber-600 bg-amber-100',
  "true-false":    'text-rose-600 bg-rose-100',
  flashcards:   'text-cyan-600 bg-cyan-100',
  scramble:     'text-indigo-600 bg-indigo-100',
  reverse:      'text-fuchsia-600 bg-fuchsia-100',
  "letter-sounds": 'text-violet-600 bg-violet-100',
  "sentence-builder":     'text-teal-600 bg-teal-100',
};

const MODE_ICONS: Record<string, React.ReactNode> = {
  classic:      <BookOpen size={24} />,
  listening:    <Volume2 size={24} />,
  spelling:     <PenTool size={24} />,
  matching:     <Zap size={24} />,
  "true-false":    <CheckCircle2 size={24} />,
  flashcards:   <Layers size={24} />,
  scramble:     <Shuffle size={24} />,
  reverse:      <Repeat size={24} />,
  "letter-sounds": <span className="text-2xl">🔡</span>,
  "sentence-builder":     <span className="text-2xl">🧩</span>,
};

// Game mode configuration with tooltips — matching GameModeSelectionView exactly.
// Flashcards is flagged as the LEARNING mode (isLearnMode) so the demo's
// mode picker can render it as a hero card above the practice grid, just
// like the real game does.
const GAME_MODES_CONFIG: Array<{
  id: string;
  name: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
  tooltip: string[];
  isLearnMode?: boolean;
}> = [
    {
      id: "flashcards",
      name: "Flashcards",
      desc: "Learn the words first — flip, listen, and earn XP at your own pace.",
      color: "cyan",
      icon: <Layers size={28} />,
      tooltip: ["Learn before you practice", "Flip cards to see answers", "No pressure — still earns XP"],
      isLearnMode: true,
    },
    {
      id: "classic",
      name: "Classic Mode",
      desc: "See the word, hear the word, pick translation.",
      color: "emerald",
      icon: <BookOpen size={24} />,
      tooltip: ["See the word in Hebrew/Arabic", "Hear the pronunciation", "Choose the correct English translation"]
    },
    {
      id: "listening",
      name: "Listening Mode",
      desc: "Only hear the word. No English text!",
      color: "blue",
      icon: <Volume2 size={24} />,
      tooltip: ["Listen to the word pronunciation", "No text shown - audio only!", "Great for training your ear"]
    },
    {
      id: "spelling",
      name: "Spelling Mode",
      desc: "Type the English word. Hardest mode!",
      color: "purple",
      icon: <PenTool size={24} />,
      tooltip: ["Hear the word", "Type it correctly in English", "Best for mastering spelling"]
    },
    {
      id: "matching",
      name: "Matching Mode",
      desc: "Match Hebrew to English. Fun & fast!",
      color: "amber",
      icon: <Zap size={24} />,
      tooltip: ["Match pairs together", "Connect Hebrew to English", "Fast-paced and fun!"]
    },
    {
      id: "true-false",
      name: "True/False",
      desc: "Is the translation correct? Quick thinking!",
      color: "rose",
      icon: <CheckCircle2 size={24} />,
      tooltip: ["See a word and translation", "Decide if it's correct", "Quick reflexes game"]
    },
    {
      id: "scramble",
      name: "Word Scramble",
      desc: "Unscramble the letters to find the word.",
      color: "indigo",
      icon: <Shuffle size={24} />,
      tooltip: ["Letters are mixed up", "Rearrange to form the word", "Tests your spelling skills"]
    },
    {
      id: "reverse",
      name: "Reverse Mode",
      desc: "See Hebrew/Arabic, pick the English word.",
      color: "fuchsia",
      icon: <Repeat size={24} />,
      tooltip: ["See Hebrew/Arabic word", "Choose matching English word", "Reverse of classic mode"]
    },
    {
      id: "letter-sounds",
      name: "Letter Sounds",
      desc: "Watch each letter light up and hear its sound.",
      color: "violet",
      icon: <span className="text-2xl">🔡</span>,
      tooltip: ["Each letter lights up in color", "Listen to each letter sound", "Type the full word you heard"]
    },
    {
      id: "sentence-builder",
      name: "Sentence Builder",
      desc: "Tap words in the right order to build the sentence.",
      color: "teal",
      icon: <span className="text-2xl">🧩</span>,
      tooltip: ["Words are shuffled", "Tap them in the correct order", "Build the sentence correctly!"]
    },
  ];

// Localized mode data for translations (kept for backwards compatibility)
const GAME_MODES: Record<Language, { id: string; name: string; emoji: string; desc: string }[]> = {
  en: [
    { id: "classic", name: "Classic", emoji: "📖", desc: "See the word, pick the right translation." },
    { id: "listening", name: "Listening", emoji: "🎧", desc: "Only hear the word. No English text!" },
    { id: "spelling", name: "Spelling", emoji: "✏️", desc: "Hear the word, type it in English." },
    { id: "matching", name: "Matching", emoji: "⚡", desc: "Match Hebrew/Arabic to English pairs." },
    { id: "true-false", name: "True / False", emoji: "✅", desc: "Is the translation correct? Quick!" },
    { id: "flashcards", name: "Flashcards", emoji: "🃏", desc: "Review at your own pace." },
    { id: "scramble", name: "Scramble", emoji: "🔤", desc: "Unscramble the letters into a word." },
    { id: "reverse", name: "Reverse", emoji: "🔄", desc: "See the translation, pick the English word." },
    { id: "letter-sounds", name: "Letter Sounds", emoji: "🔡", desc: "Hear each letter, type the full word." },
    { id: "sentence-builder", name: "Sentence Builder", emoji: "🧩", desc: "Tap the words in the right order." },
  ],
  he: [
    { id: "classic", name: "קלאסי", emoji: "📖", desc: "בחר את הפירוש הנכון" },
    { id: "listening", name: "הקשבה", emoji: "🎧", desc: "שמע וזהה" },
    { id: "spelling", name: "איות", emoji: "✏️", desc: "הקלד את המילה נכון" },
    { id: "matching", name: "התאמה", emoji: "⚡", desc: "התאם מילים לפירושים" },
    { id: "true-false", name: "נכון/לא נכון", emoji: "✅", desc: "האם זה נכון?" },
    { id: "flashcards", name: "כרטיסיות", emoji: "🃏", desc: "הפוך ולמד" },
    { id: "scramble", name: "ערבוב", emoji: "🔤", desc: "סדר את האותיות" },
    { id: "reverse", name: "הפוך", emoji: "🔄", desc: "תרגם לאנגלית" },
    { id: "letter-sounds", name: "צלילי אותיות", emoji: "🔡", desc: "השמע את זה" },
    { id: "sentence-builder", name: "בונה משפטים", emoji: "🧩", desc: "בנה משפטים" },
  ],
  ar: [
    { id: "classic", name: "كلاسيكي", emoji: "📖", desc: "اختر المعنى الصحيح" },
    { id: "listening", name: "استماع", emoji: "🎧", desc: "اسمع وحدد" },
    { id: "spelling", name: "تهجئة", emoji: "✏️", desc: "اكتب الكلمة بشكل صحيح" },
    { id: "matching", name: "مطابقة", emoji: "⚡", desc: "طابق الكلمات مع المعاني" },
    { id: "true-false", name: "صح/خطأ", emoji: "✅", desc: "هل هذا صحيح؟" },
    { id: "flashcards", name: "بطاقات", emoji: "🃏", desc: "اقلب وتعلم" },
    { id: "scramble", name: "خلط", emoji: "🔤", desc: "رتب الحروف" },
    { id: "reverse", name: "عكس", emoji: "🔄", desc: "ترجم للإنجليزية" },
    { id: "letter-sounds", name: "أصوات الحروف", emoji: "🔡", desc: "انطقها" },
    { id: "sentence-builder", name: "بناء الجمل", emoji: "🧩", desc: "ابني جملًا" },
  ],
};

type TargetLang = 'hebrew' | 'arabic';

const getMeaning = (word: Word, targetLang: TargetLang): string => {
  return targetLang === 'arabic' ? word.arabic : word.hebrew;
};

const getXPTitle = (xpAmount: number) => {
  return XP_TITLES.filter(t => xpAmount >= t.min).pop() ?? XP_TITLES[0];
};

const DemoMode: React.FC<DemoModeProps> = ({ onClose }) => {
  const { language, setLanguage, dir, isRTL, textAlign } = useLanguage();
  const t = demoTranslations[language];
  const modes = GAME_MODES[language];

  const [view, setView] = useState<DemoView>("welcome");
  const [shopTab, setShopTab] = useState<ShopTab>("avatars");
  const [avatar, setAvatar] = useState("🦊");
  const [displayName, setDisplayName] = useState("");
  const [xp, setXp] = useState(0);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);

  // Power-ups state (FREE in demo!)
  const [powerUps, setPowerUps] = useState({ skip: 3, fifty_fifty: 3, reveal_letter: 3 });

  // Matching game state
  const [matchingCards, setMatchingCards] = useState<{ id: string; content: string; type: 'word' | 'meaning'; matched: boolean; selected: boolean; wordId: number }[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);

  // Spelling game state
  const [spellingInput, setSpellingInput] = useState("");

  // Scramble game state
  const [scrambledWord, setScrambledWord] = useState("");

  // True/False game state
  const [tfStatement, setTfStatement] = useState<{ word: Word; shownMeaning: string; isCorrect: boolean } | null>(null);

  // Flashcard state
  const [isFlipped, setIsFlipped] = useState(false);

  // Translation language toggle (independent of UI language)
  const [targetLanguage, setTargetLanguage] = useState<TargetLang>(language === 'ar' ? 'arabic' : 'hebrew');

  // Letter sounds state
  const [letterOptions, setLetterOptions] = useState<string[]>([]);
  const [revealedLetters, setRevealedLetters] = useState(0);
  const LETTER_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F59E0B","#6366F1"];

  // Sentence Builder state
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "incorrect" | null>(null);

  const { speak, preloadMany } = useAudio();

  // Track response timing for adaptive transitions
  const responseStartTime = useRef(Date.now());
  const averageResponseMs = useRef(3000); // start at moderate pace

  // Get current word
  const currentWord = DEMO_WORDS[currentWordIndex];

  // Preload next word's audio for seamless transitions
  useEffect(() => {
    if (view === "game" && currentWordIndex < DEMO_WORDS.length - 1) {
      preloadMany([DEMO_WORDS[currentWordIndex + 1].id]);
    }
  }, [view, currentWordIndex]);

  // Initialize game
  useEffect(() => {
    if (view === "game" && selectedMode && currentWord) {
      setSelectedAnswer(null);
      setIsCorrect(null);
      setHiddenOptions([]);
      setSpellingInput("");
      setIsFlipped(false);
      setRevealedLetters(0);
      setSentenceFeedback(null);

      switch (selectedMode) {
        case "classic":
        case "listening":
          generateOptions();
          break;
        case "matching":
          initMatchingGame();
          break;
        case "scramble":
          setScrambledWord(shuffleWord(cleanWordForDisplay(currentWord.english)));
          break;
        case "true-false":
          generateTFStatement();
          break;
        case "letter-sounds":
          // Don't generate options - the full app reveals letters one by one
          setRevealedLetters(0);
          break;
        case "sentence":
          // Initialize sentence builder with shuffled words
          const sentence = `${currentWord.english} is great!`;
          const words = shuffle(sentence.split(" "));
          setAvailableWords(words);
          setBuiltSentence([]);
          setSentenceFeedback(null);
          break;
      }
    }
  }, [view, selectedMode, currentWordIndex]);

  // Auto-speak: play word audio when a new word loads in game view
  // All modes except flashcards, letter-sounds, sentence, and matching: see + hear simultaneously on word load
  // Sentence builder and matching have their own audio handling (explicit user interaction)
  useEffect(() => {
    if (view !== "game" || !currentWord) return;
    if (selectedMode === "flashcards") return; // speak when flipped, not on load
    if (selectedMode === "letter-sounds") return; // has its own letter-by-letter speech
    if (selectedMode === "sentence-builder") return; // sentence mode has separate audio handling
    if (selectedMode === "matching") return; // matching mode: user clicks speaker icon to hear

    responseStartTime.current = Date.now();
    speak(currentWord.id);
  }, [view, selectedMode, currentWordIndex]);

  // Sentence Builder: speak the full sentence so the learner hears it
  useEffect(() => {
    if (view !== "game" || selectedMode !== "sentence" || !currentWord) return;
    responseStartTime.current = Date.now();
    window.speechSynthesis?.cancel();
    const utter = new SpeechSynthesisUtterance(`${currentWord.english} is great!`);
    utter.rate = 0.9;
    window.speechSynthesis?.speak(utter);
  }, [view, selectedMode, currentWordIndex]);

  // Flashcards: speak when card is flipped to reveal meaning
  useEffect(() => {
    if (view !== "game" || selectedMode !== "flashcards" || !isFlipped || !currentWord) return;
    speak(currentWord.id);
  }, [view, selectedMode, currentWordIndex, isFlipped]);

  // Letter Sounds: reveal letters one by one with colors and sounds
  useEffect(() => {
    if (view !== "game" || selectedMode !== "letter-sounds" || !currentWord || selectedAnswer !== null) return;

    const word = currentWord.english;
    let cancelled = false;

    const revealNext = (idx: number) => {
      if (cancelled || idx >= word.length || selectedAnswer !== null) {
        // All letters revealed - show input field
        return;
      }
      setRevealedLetters(idx + 1);
      // Speak the letter
      setTimeout(() => {
        if (cancelled || selectedAnswer !== null) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word[idx]);
        utter.rate = 0.8;
        window.speechSynthesis.speak(utter);
        // Continue to next letter after a delay
        setTimeout(() => revealNext(idx + 1), 800);
      }, 300);
    };

    const startTimer = setTimeout(() => revealNext(0), 500);
    return () => { cancelled = true; clearTimeout(startTimer); window.speechSynthesis.cancel(); };
  }, [view, selectedMode, currentWordIndex, currentWord, selectedAnswer]);

  const generateOptions = () => {
    if (!currentWord) return;
    const correctMeaning = getMeaning(currentWord, targetLanguage);
    const wrongOptions = DEMO_WORDS.filter(w => w.id !== currentWord.id)
      .map(w => getMeaning(w, targetLanguage))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const allOptions = [...wrongOptions, correctMeaning].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const initMatchingGame = () => {
    const words = DEMO_WORDS.slice(0, 4);
    const cards: { id: string; content: string; type: 'word' | 'meaning'; matched: boolean; selected: boolean; wordId: number }[] = [];
    words.forEach((word, i) => {
      cards.push({ id: `w${i}`, content: word.english, type: 'word', matched: false, selected: false, wordId: word.id });
      cards.push({ id: `m${i}`, content: getMeaning(word, targetLanguage), type: 'meaning', matched: false, selected: false, wordId: word.id });
    });
    setMatchingCards(cards.sort(() => Math.random() - 0.5));
    setMatchedPairs(0);

    // Preload audio for all words in the matching game
    const wordIds = words.map(w => w.id);
    preloadMany(wordIds);
  };

  const shuffleWord = (word: string): string => {
    return word.split('').sort(() => Math.random() - 0.5).join('');
  };

  const shuffle = <T,>(array: T[]): T[] => {
    return array.sort(() => Math.random() - 0.5);
  };

  const generateTFStatement = () => {
    if (!currentWord) return;
    const useCorrect = Math.random() > 0.5;
    const randomWord = useCorrect ? currentWord : DEMO_WORDS.filter(w => w.id !== currentWord.id)[Math.floor(Math.random() * (DEMO_WORDS.length - 1))];
    setTfStatement({
      word: currentWord,
      shownMeaning: getMeaning(randomWord!, targetLanguage),
      isCorrect: useCorrect
    });
  };

  const generateLetterOptions = () => {
    if (!currentWord) return;
    const word = currentWord.english;
    const firstLetter = word[0].toUpperCase();
    const letters = [firstLetter];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    while (letters.length < 4) {
      const randomLetter = alphabet[Math.floor(Math.random() * 26)];
      if (!letters.includes(randomLetter)) letters.push(randomLetter);
    }
    setLetterOptions(letters.sort(() => Math.random() - 0.5));
  };

  // Award badges based on achievements
  const checkAndAwardBadges = (correct: boolean, newXP: number) => {
    const newBadges = [...badges];

    if (correct) {
      if (newXP >= 100 && !badges.includes("🎯 Quick Learner")) {
        newBadges.push("🎯 Quick Learner");
      }
      if (streak + 1 >= 3 && !badges.includes("🔥 Streak Master")) {
        newBadges.push("🔥 Streak Master");
      }
      if (score + 1 >= 5 && !badges.includes("⭐ Halfway There")) {
        newBadges.push("⭐ Halfway There");
      }
      if (score + 1 >= DEMO_WORDS.length && !badges.includes("🏆 Demo Champion")) {
        newBadges.push("🏆 Demo Champion");
      }
    }

    if (newBadges.length > badges.length) {
      setBadges(newBadges);
      // Confetti burst for new badge
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleClassicAnswer = (answer: string) => {
    if (selectedAnswer) return;
    const correctMeaning = getMeaning(currentWord, targetLanguage);
    const correct = answer === correctMeaning;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    handleFeedback(correct);
  };

  const handleMatchingSelect = (cardId: string) => {
    const card = matchingCards.find(c => c.id === cardId);
    if (!card || card.matched) return;

    const selectedCards = matchingCards.filter(c => c.selected && !c.matched);

    if (selectedCards.length === 0) {
      setMatchingCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, selected: true } : c
      ));
      // Play audio when selecting a card
      speak(card.wordId);
    } else if (selectedCards.length === 1) {
      const firstCard = selectedCards[0];
      if (firstCard.type === card.type) {
        setMatchingCards(prev => prev.map(c =>
          c.id === firstCard.id ? { ...c, selected: false } :
          c.id === cardId ? { ...c, selected: true } : c
        ));
        // No auto-speak - user can click speaker icon to hear the word
      } else {
        const firstIndex = parseInt(firstCard.id.slice(1));
        const secondIndex = parseInt(card.id.slice(1));
        const isMatch = firstIndex === secondIndex;

        if (isMatch) {
          setMatchingCards(prev => prev.map(c =>
            c.id === firstCard.id || c.id === cardId
              ? { ...c, matched: true, selected: false }
              : c
          ));
          setMatchedPairs(prev => prev + 1);
          setXp(prev => prev + 15);
          setScore(prev => prev + 1);
          confetti({ particleCount: 30, spread: 40, origin: { y: 0.6 } });

          if (matchedPairs + 1 >= 4) {
            setTimeout(() => setView("results"), 500);
          }
        } else {
          setMatchingCards(prev => prev.map(c =>
            c.id === cardId ? { ...c, selected: true } : c
          ));
          setTimeout(() => {
            setMatchingCards(prev => prev.map(c =>
              c.id === firstCard.id || c.id === cardId
                ? { ...c, selected: false }
                : c
            ));
          }, 500);
        }
      }
    }
  };

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellingInput.trim() || selectedAnswer) return;
    const correct = isAnswerCorrect(spellingInput, currentWord.english);
    setSelectedAnswer(spellingInput);
    setIsCorrect(correct);
    handleFeedback(correct);
  };

  const handleScrambleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellingInput.trim() || selectedAnswer) return;
    const correct = isAnswerCorrect(spellingInput, currentWord.english);
    setSelectedAnswer(spellingInput);
    setIsCorrect(correct);
    handleFeedback(correct);
  };

  const handleTFAnswer = (answer: boolean) => {
    if (selectedAnswer !== null) return;
    const correct = answer === tfStatement?.isCorrect;
    setSelectedAnswer(answer ? "true" : "false");
    setIsCorrect(correct);
    handleFeedback(correct);
  };

  const handleLetterAnswer = (letter: string) => {
    if (selectedAnswer) return;
    const correct = letter === currentWord.english[0].toUpperCase();
    setSelectedAnswer(letter);
    setIsCorrect(correct);
    handleFeedback(correct);
  };

  const handleReverseAnswer = (answer: string) => {
    if (selectedAnswer) return;
    const correct = isAnswerCorrect(answer, currentWord.english);
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    handleFeedback(correct);
  };


  const getAdaptiveDelay = () => {
    const responseMs = Date.now() - responseStartTime.current;

    // Update running average with smoothing factor
    averageResponseMs.current = averageResponseMs.current * 0.6 + responseMs * 0.4;

    // Map response time to transition delay (exponential curve)
    if (averageResponseMs.current < 1500) return 300;       // fast answers → quick transition
    if (averageResponseMs.current < 3000) return 500;
    if (averageResponseMs.current < 5000) return 800;
    return 1200;                                                  // slow answers → longer pause
  };

  const moveToNext = () => {
    if (currentWordIndex < DEMO_WORDS.length - 1) {
      const delay = getAdaptiveDelay();
      setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setHiddenOptions([]);
        setSpellingInput("");
        setIsFlipped(false);
        setScrambledWord("");
        setRevealedLetters(0);
        setAvailableWords([]);
        setBuiltSentence([]);
        setSentenceFeedback(null);
        responseStartTime.current = Date.now(); // reset timer for next word
      }, delay);
    } else {
      setView("results");
    }
  };

  // Guard against double-advance: store auto-advance timeout so the manual
  // "Next" button can cancel it before triggering its own advance.
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFeedback = (correct: boolean) => {
    if (correct) {
      const xpEarned = 10 + streak * 2;
      const newXp = xp + xpEarned;
      setXp(newXp);
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      checkAndAwardBadges(true, newXp);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
      setStreak(0);
    }

    // Auto-advance so the user doesn't have to click "Next" manually
    const delay = correct ? 1200 : 1800;
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null;
      moveToNext();
    }, delay);
  };

  // Power-up handlers
  const handleFiftyFifty = () => {
    if (powerUps.fifty_fifty <= 0 || hiddenOptions.length > 0) return;
    const wrong = DEMO_WORDS.filter(w => w.id !== currentWord.id);
    const toHide = shuffle(wrong).slice(0, 2).map(w => w.id);
    setHiddenOptions(toHide);
    setPowerUps(prev => ({ ...prev, fifty_fifty: prev.fifty_fifty - 1 }));
    confetti({ particleCount: 20, spread: 30, origin: { y: 0.7 } });
  };

  const handleSkip = () => {
    if (powerUps.skip <= 0) return;
    setCurrentIndex(currentWordIndex + 1);
    setPowerUps(prev => ({ ...prev, skip: prev.skip - 1 }));
    setHiddenOptions([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleRevealLetter = () => {
    if (powerUps.reveal_letter <= 0 || !currentWord || spellingInput.length > 0) return;
    setSpellingInput(currentWord.english[0]);
    setPowerUps(prev => ({ ...prev, reveal_letter: prev.reveal_letter - 1 }));
  };

  const setCurrentIndex = (idx: number) => {
    if (idx < DEMO_WORDS.length) {
      setCurrentWordIndex(idx);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setHiddenOptions([]);
      setSpellingInput("");
      setIsFlipped(false);
      setScrambledWord("");
      setRevealedLetters(0);
      setAvailableWords([]);
      setBuiltSentence([]);
      setSentenceFeedback(null);
    } else {
      setView("results");
    }
  };

  const startGame = (mode: string) => {
    setSelectedMode(mode);
    setCurrentWordIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setSpellingInput("");
    setIsFlipped(false);
    setMatchedPairs(0);
    setMatchingCards([]);
    setHiddenOptions([]);
    setRevealedLetters(0);
    setAvailableWords([]);
    setBuiltSentence([]);
    setSentenceFeedback(null);
    // Show the mode-intro screen first — matches the real app's flow where
    // a tap on a mode card takes you to GameModeIntroView (rules / steps /
    // "Let's go!") before gameplay. Without this, demo players were dropped
    // straight into the first question with zero orientation.
    setView("mode-intro");
  };

  const beginGameplay = () => setView("game");

  const resetDemo = () => {
    setView("welcome");
    setXp(0);
    setBadges([]);
    setSelectedMode(null);
    setCurrentWordIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setSpellingInput("");
    setIsFlipped(false);
    setRevealedLetters(0);
    setAvailableWords([]);
    setBuiltSentence([]);
    setSentenceFeedback(null);
    setPowerUps({ skip: 3, fifty_fifty: 3, reveal_letter: 3 });
  };

  const speakWord = (wordId: number) => {
    speak(wordId);
  };

  const xpTitle = getXPTitle(xp);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-sky-200 via-indigo-300 to-violet-400 overflow-auto" dir={dir}>
      {/* Top banner — demo indicator only (no sign-up CTA; demo's job is
          to showcase the product, not push a sign-up). */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white py-2.5 px-4 text-center font-bold text-sm flex items-center justify-center gap-2 shadow-md">
        <Sparkles size={14} />
        <span className="tracking-wide">{t.demoMode}</span>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`absolute top-14 z-50 w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 shadow-lg transition-colors ${isRTL ? 'left-4' : 'right-4'}`}
      >
        <X size={20} />
      </button>

      {/* Width scales per view: narrow for welcome/avatar (focused UX),
          wide for game-select/game/results/shop (needs room for 4-col grids
          and real-app parity on desktop). */}
      {/* The demo's outer content container used a fixed max-w-lg (512px)
          for welcome / avatar / mode-intro. On mobile that fills the
          screen nicely, but on a 1920px desktop the card floats as a
          narrow strip with huge empty sides. Widen non-game views to
          max-w-2xl (672px) so they read as a proper centred card on
          laptops without hurting the mobile layout. */}
      <div className={`${['game-select', 'game', 'results', 'shop'].includes(view) ? 'max-w-5xl' : 'max-w-2xl'} mx-auto px-4 py-6 pt-16`}>
        <AnimatePresence mode="wait">
          {/* Welcome screen — short, no marketing.  The demo's job is to let
              students taste the product immediately, not pitch them; the
              full pitch lives on the public landing page. */}
          {view === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              {/* Floating game icons - animated, scattered across the entire page below */}
              <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[30rem] left-[5%] text-5xl opacity-60 z-20"
              >⭐</motion.div>
              <motion.div
                animate={{ y: [0, 15, 0], rotate: [0, -15, 15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-[36rem] right-[8%] text-4xl opacity-50 z-20"
              >🏆</motion.div>
              <motion.div
                animate={{ y: [0, -25, 0], x: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-8 left-[15%] text-4xl opacity-40 z-20"
              >🎯</motion.div>
              <motion.div
                animate={{ y: [0, 20, 0], rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 1.5 }}
                className="absolute top-[40rem] right-[20%] text-5xl opacity-30 z-20"
              >💎</motion.div>
              <motion.div
                animate={{ y: [0, -18, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-16 right-[12%] text-4xl opacity-50 z-20"
              >🎮</motion.div>
              <motion.div
                animate={{ y: [0, 22, 0], rotate: [0, -20, 20, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="absolute top-[44rem] left-[25%] text-3xl opacity-40 z-20"
              >🚀</motion.div>
              <motion.div
                animate={{ x: [0, 15, 0], y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                className="absolute bottom-24 left-[40%] text-4xl opacity-35 z-20"
              >⚡</motion.div>
              <motion.div
                animate={{ y: [0, -15, 0], rotate: [0, 180] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="absolute top-[48rem] right-[35%] text-3xl opacity-45 z-20"
              >🎁</motion.div>

              {/* Main content */}
              <div className="relative z-10">
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 sm:p-8 mb-5 shadow-xl shadow-violet-500/20 text-center">
                  <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-yellow-300/30 rounded-full blur-3xl" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 bg-pink-400/30 rounded-full blur-3xl" />

                {/* 3D Demo Mode Badge — floating in top-right corner */}
                <motion.div
                  initial={{ rotate: -15, y: -10 }}
                  animate={{ rotate: [-15, -10, -15], y: [-10, -5, -10] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 z-10"
                >
                  <div className="relative">
                    {/* 3D shadow layers */}
                    <div className="absolute inset-0 bg-black/20 rounded-xl transform translate-x-1 translate-y-1" />
                    <div className="absolute inset-0 bg-black/10 rounded-xl transform translate-x-0.5 translate-y-0.5" />
                    {/* Main badge */}
                    <div className="relative bg-white rounded-xl px-4 py-2 shadow-lg border-2 border-white/50 transform rotate-3">
                      <div className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotateY: [0, 360] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="text-2xl"
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          🎮
                        </motion.span>
                        <div className="text-left">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {language === 'en' ? 'Try' : language === 'he' ? 'נסו' : 'جرب'}
                          </div>
                          <div className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">
                            DEMO
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="relative">
                  <div className="text-5xl sm:text-6xl mb-3">🎮</div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {t.welcomeTitle}
                  </h1>
                  <p className="text-white/90 text-sm sm:text-base mt-2">
                    {t.welcomeDesc}
                  </p>
                </div>
              </div>

              {/* Language selector — let users choose their preferred language */}
              <div className="mb-5">
                <p className="text-sm font-black text-white uppercase tracking-wide mb-3 text-center drop-shadow-lg">
                  {language === 'en' ? 'Choose your language' : language === 'he' ? 'בחרו שפה' : 'اختر لغتك'}
                </p>
                {/* Force LTR direction so buttons stay in place: EN | HE | AR */}
                <div className="flex gap-3" dir="ltr">
                  {(['en', 'he', 'ar'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      type="button"
                      style={{ touchAction: 'manipulation', minWidth: '100px', flex: 1 }}
                      className={`py-3 px-3 rounded-xl font-bold text-sm border-2 transition-all shadow-lg ${
                        language === lang
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-orange-400 shadow-orange-500/50 scale-105'
                          : 'bg-white/90 text-on-surface border-white/60 hover:bg-white hover:scale-102'
                      }`}
                    >
                      <span className="text-xl">{lang === 'en' ? '🇬🇧' : lang === 'he' ? '🇮🇱' : '🇸🇦'}</span>
                      <span className="block text-xs mt-0.5">{lang === 'en' ? 'English' : lang === 'he' ? 'עברית' : 'العربية'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                onClick={() => setView("avatar")}
                type="button"
                style={{ touchAction: 'manipulation' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-violet-500/40 border-2 border-white/30 relative overflow-hidden"
              >
                {/* Animated shine effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
                <span className="relative z-10">{t.letsGo}</span>
              </motion.button>
              </div>
            </motion.div>
          )}

          {/* Avatar Selection */}
          {view === "avatar" && (
            <motion.div
              key="avatar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setView("welcome")}
                className={`flex items-center gap-2 text-on-surface-variant mb-6 hover:text-primary transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                {t.back}
              </button>

              <h1 className="text-2xl font-black font-headline text-on-surface mb-2 text-center">
                {t.chooseAvatar}
              </h1>
              <p className="text-on-surface-variant text-center mb-6">
                {t.pickEmoji}
              </p>

              {/* Name field — styled to match signup screen */}
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide">
                  {t.yourName}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.enterNickname}
                  className={`w-full px-6 py-4 text-lg font-bold bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 ${textAlign}`}
                  maxLength={15}
                  dir={dir}
                />
              </div>

              {/* Shared AvatarPicker — same component that powers real signup,
                  so the demo inherits every future tweak automatically. XP is
                  passed in so categories still lock/unlock based on the demo
                  sandbox's XP progression. */}
              <div className="mb-6">
                <AvatarPicker
                  value={avatar}
                  onChange={setAvatar}
                  xp={xp}
                  label={t.chooseAvatar}
                />
              </div>

              {/* XP Title Display */}
              {xp > 0 && (
                <div className="bg-gradient-to-r from-primary/10 to-tertiary/10 rounded-2xl p-4 mb-6 border border-primary/20">
                  <div className="flex items-center justify-center gap-2">
                    <Crown size={20} style={{ color: xpTitle.color }} />
                    <span className="font-black" style={{ color: xpTitle.color }}>{xpTitle.title}</span>
                  </div>
                  <p className="text-xs text-center text-on-surface-variant mt-1">{xp} XP</p>
                </div>
              )}

              <button
                onClick={() => setView("game-select")}
                disabled={!displayName.trim()}
                className="w-full signature-gradient text-white py-5 rounded-xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                {t.continue}
                {!isRTL && <ArrowRight size={24} />}
                {isRTL && <ArrowLeft size={24} />}
              </button>
            </motion.div>
          )}

          {/* Game Mode Selection */}
          {view === "game-select" && (
            <motion.div
              key="game-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 sm:p-6"
            >
              {/* Top bar — back button left, avatar/XP chip right.
                  Outside the main card so the card itself feels clean. */}
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setView("avatar")}
                  className={`flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  {t.back}
                </button>
                <div className={`flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-2xl">{avatar}</span>
                  <span className="font-bold text-on-surface">{displayName}</span>
                  {xp > 0 && (
                    <div className="flex items-center gap-1 bg-primary/15 px-2 py-0.5 rounded-full">
                      <Target size={14} className="text-primary" />
                      <span className="font-black text-primary text-xs">{xp} XP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Game mode selection — no white card, content on gradient background */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 sm:mb-8"
              >
                <h2 className="text-2xl sm:text-4xl font-black mb-2 text-stone-900 tracking-tight">
                  {t.chooseGame}
                </h2>
                <p className="text-stone-600 text-sm sm:text-lg font-medium">
                  {t.tryPopular}
                </p>
              </motion.div>

              {/* Power-ups strip — demo-specific but styled to feel native */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 mb-5 border border-white/50 shadow-sm">
                <p className="text-xs font-black text-amber-800 mb-2 text-center uppercase tracking-widest">
                  ⚡ Power-ups (free in demo)
                </p>
                <div className="flex justify-center gap-2">
                  {POWER_UPS.map((pu) => (
                    <div key={pu.id} className="bg-white px-3 py-1.5 rounded-xl text-center shadow-sm border border-amber-100 min-w-[60px]">
                      <span className="text-xl block">{pu.emoji}</span>
                      <p className="text-[10px] font-black text-stone-600 mt-0.5">×{powerUps[pu.id as keyof typeof powerUps]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning hero — Flashcards is promoted above the
                  practice grid with its own big card so the demo
                  visitor sees the same "Start here · Learn first"
                  positioning as the real app's mode selection. */}
              {(() => {
                const learn = GAME_MODES_CONFIG.find(m => m.isLearnMode);
                if (!learn) return null;
                return (
                  <motion.button
                    key={learn.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    whileHover={{ scale: 1.02, translateY: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startGame(learn.id)}
                    type="button"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="w-full mb-4 sm:mb-6 p-5 sm:p-8 rounded-[32px] text-left relative overflow-hidden shadow-xl hover:shadow-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white"
                  >
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute top-0 left-0 right-0 flex justify-between items-start px-5 pt-4">
                      <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                        <Sparkles size={12} />
                        Start here · Learn first
                      </span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 mt-10 sm:mt-6">
                      <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                        <GraduationCap size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xl sm:text-3xl mb-1">{learn.name}</p>
                        <p className="text-white/90 text-sm sm:text-base font-semibold leading-snug">{learn.desc}</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 opacity-60">
                        <Layers size={28} />
                      </div>
                    </div>
                  </motion.button>
                );
              })()}

              <div className="mb-3 text-left">
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-stone-500/80">Then practise with</p>
              </div>

              {/* Difficulty legend — 3 tiers, each with 1/2/3 filled
                  stars. Same pattern as the real app's mode picker so
                  demo players learn the difficulty vocabulary that
                  carries over once they sign up. */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-5 flex-wrap">
                {(['easy', 'medium', 'hard'] as const).map(tier => {
                  const m = DIFFICULTY_META[tier];
                  return (
                    <div
                      key={tier}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${m.badgeBg} ${m.badgeText}`}
                      title={m.description}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {[0, 1, 2].map(i => (
                          <Star key={i} size={12} strokeWidth={2}
                            className={i < m.stars ? m.starColor : 'text-stone-300'}
                            fill={i < m.stars ? 'currentColor' : 'none'}
                          />
                        ))}
                      </span>
                      {m.label}
                    </div>
                  );
                })}
              </div>

              {/* Practice modes grid — matches GameModeSelectionView */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {GAME_MODES_CONFIG.filter(m => !m.isLearnMode).map((mode, idx) => {
                  const modeColor = MODE_COLORS[mode.id] || "emerald";
                  return (
                    <motion.button
                      key={mode.id}
                      onClick={() => startGame(mode.id)}
                      type="button"
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      className={`p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${colorClasses[modeColor]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.05, translateY: -8 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[24px] bg-white flex items-center justify-center mb-3 sm:mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[modeColor]} relative`}>
                        {mode.icon}
                      </div>
                      <p className="font-black text-base sm:text-xl mb-1 sm:mb-2 leading-tight">{mode.name}</p>
                      <p className="opacity-70 text-xs sm:text-sm font-bold leading-snug mb-2">{mode.desc}</p>
                      {(() => {
                        const tier = getModeDifficulty(mode.id);
                        const meta = DIFFICULTY_META[tier];
                        return (
                          <span className="inline-flex items-center gap-0.5">
                            {[0, 1, 2].map(i => (
                              <Star key={i} size={12} strokeWidth={2}
                                className={i < meta.stars ? meta.starColor : 'text-stone-300'}
                                fill={i < meta.stars ? 'currentColor' : 'none'}
                              />
                            ))}
                          </span>
                        );
                      })()}

                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Zap size={20} className="animate-pulse" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Mode Intro — shown between mode pick and gameplay. Ports the
              real app's GameModeIntroView pattern (gradient hero + 3
              numbered steps + big "Let's go!" CTA) into demo so a
              first-time player gets the same orientation as a logged-in
              student does on a real assignment. We use a trimmed in-place
              version instead of importing GameModeIntroView so the demo
              stays self-contained and its language strings stay in
              demoTranslations. */}
          {view === "mode-intro" && selectedMode && (() => {
            const modeIntros: Record<string, { icon: string; steps: string[]; cardClass: string; accentClass: string; stepBgClass: string; stepNumClass: string; ctaClass: string }> = {
              classic:           { icon: '📖', steps: ['See the English word', 'Listen to the pronunciation', 'Pick the correct translation'], cardClass: 'from-emerald-400 to-emerald-600', accentClass: 'text-emerald-700', stepBgClass: 'bg-emerald-50 border-emerald-100', stepNumClass: 'bg-emerald-500', ctaClass: 'from-emerald-500 to-emerald-600' },
              listening:         { icon: '🎧', steps: ['Listen carefully to the word', 'The English is hidden!', 'Choose the correct translation'], cardClass: 'from-blue-400 to-indigo-600', accentClass: 'text-blue-700', stepBgClass: 'bg-blue-50 border-blue-100', stepNumClass: 'bg-blue-500', ctaClass: 'from-blue-500 to-indigo-600' },
              spelling:          { icon: '✏️', steps: ['See the translation', 'Type the English word', 'Spelling must be exact!'], cardClass: 'from-purple-400 to-fuchsia-600', accentClass: 'text-purple-700', stepBgClass: 'bg-purple-50 border-purple-100', stepNumClass: 'bg-purple-500', ctaClass: 'from-purple-500 to-fuchsia-600' },
              matching:          { icon: '⚡', steps: ['Find the matching pairs', 'Tap English then translation', 'Clear the board to finish!'], cardClass: 'from-amber-400 to-orange-500', accentClass: 'text-amber-700', stepBgClass: 'bg-amber-50 border-amber-100', stepNumClass: 'bg-amber-500', ctaClass: 'from-amber-500 to-orange-500' },
              "true-false":      { icon: '✅', steps: ['See a word and a translation', 'Decide if the pair is correct', 'Think fast!'], cardClass: 'from-rose-400 to-pink-500', accentClass: 'text-rose-700', stepBgClass: 'bg-rose-50 border-rose-100', stepNumClass: 'bg-rose-500', ctaClass: 'from-rose-500 to-pink-500' },
              flashcards:        { icon: '🃏', steps: ['Go at your own pace', 'Flip to see the answer', 'No pressure — just learn!'], cardClass: 'from-cyan-400 to-teal-500', accentClass: 'text-cyan-700', stepBgClass: 'bg-cyan-50 border-cyan-100', stepNumClass: 'bg-cyan-500', ctaClass: 'from-cyan-500 to-teal-500' },
              scramble:          { icon: '🔤', steps: ['The letters are scrambled', 'Type the correct English word', 'Unscramble them all!'], cardClass: 'from-indigo-400 to-violet-600', accentClass: 'text-indigo-700', stepBgClass: 'bg-indigo-50 border-indigo-100', stepNumClass: 'bg-indigo-500', ctaClass: 'from-indigo-500 to-violet-600' },
              reverse:           { icon: '🔄', steps: ['See the Hebrew/Arabic word', 'Pick the English translation', 'Reverse of classic!'], cardClass: 'from-fuchsia-400 to-purple-600', accentClass: 'text-fuchsia-700', stepBgClass: 'bg-fuchsia-50 border-fuchsia-100', stepNumClass: 'bg-fuchsia-500', ctaClass: 'from-fuchsia-500 to-purple-600' },
              "letter-sounds":   { icon: '🔡', steps: ['Each letter lights up', 'Listen to each letter sound', 'Type the full word when ready'], cardClass: 'from-violet-400 to-purple-500', accentClass: 'text-violet-700', stepBgClass: 'bg-violet-50 border-violet-100', stepNumClass: 'bg-violet-500', ctaClass: 'from-violet-500 to-purple-500' },
              "sentence-builder":{ icon: '🧩', steps: ['Words are shuffled below', 'Tap them in the correct order', 'Build the full sentence!'], cardClass: 'from-teal-400 to-emerald-500', accentClass: 'text-teal-700', stepBgClass: 'bg-teal-50 border-teal-100', stepNumClass: 'bg-teal-500', ctaClass: 'from-teal-500 to-emerald-500' },
            };
            const info = modeIntros[selectedMode] ?? modeIntros.classic;
            const modeName = GAME_MODES_CONFIG.find(m => m.id === selectedMode)?.name ?? selectedMode;
            return (
              <motion.div
                key="mode-intro"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                className="bg-white rounded-[28px] sm:rounded-[36px] shadow-xl ring-1 ring-stone-100 p-6 sm:p-10 max-w-xl mx-auto"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-[22px] sm:rounded-[28px] bg-gradient-to-br ${info.cardClass} flex items-center justify-center text-4xl sm:text-5xl shadow-lg`}
                >
                  {info.icon}
                </motion.div>
                <h2 className={`text-2xl sm:text-4xl font-black ${info.accentClass} mb-6 sm:mb-8 text-center`}>
                  {modeName}
                </h2>
                <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                  {info.steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className={`flex items-center gap-3 sm:gap-4 ${info.stepBgClass} border p-3 sm:p-4 rounded-2xl`}
                    >
                      <span className={`w-8 h-8 sm:w-10 sm:h-10 ${info.stepNumClass} text-white rounded-full flex items-center justify-center text-sm sm:text-base font-black flex-shrink-0 shadow-sm`}>
                        {i + 1}
                      </span>
                      <span className="text-stone-700 font-semibold text-sm sm:text-base leading-snug">
                        {step}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + info.steps.length * 0.1 }}
                  onClick={beginGameplay}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className={`w-full py-4 sm:py-5 bg-gradient-to-br ${info.ctaClass} text-white rounded-2xl font-black text-lg sm:text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-transform`}
                >
                  Let's Go! →
                </motion.button>
                <button
                  onClick={() => setView('game-select')}
                  className="w-full mt-3 py-2 text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors"
                >
                  ← Back to Modes
                </button>
              </motion.div>
            );
          })()}


          {/* Game Screen */}
          {view === "game" && currentWord && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              {/* Header */}
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setView("game-select")}
                  className={`flex items-center gap-2 text-stone-500 hover:text-blue-600 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  {t.exit}
                </button>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-1 bg-stone-100 px-3 py-1.5 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Zap size={14} className="text-amber-500" />
                    <span className="font-bold text-stone-800">{xp}</span>
                  </div>
                  {streak > 0 && (
                    <div className={`flex items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm">🔥</span>
                      <span className="font-bold text-orange-600">{streak}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setTargetLanguage(targetLanguage === 'hebrew' ? 'arabic' : 'hebrew')}
                    className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {targetLanguage === 'arabic' ? 'عربي' : 'עברית'}
                  </button>
                </div>
              </div>

              {/* Power-ups toolbar — mirrors the real app's PowerUpToolbar.
                  Each power-up has its own eligibility rules:
                    • 50/50 — hides two wrong options in multiple-choice
                      modes (classic / listening / reverse). Needs options
                      on screen and no answer selected yet.
                    • Skip  — advances to next word in every mode. Only
                      hidden on the flashcards self-pacing screen (which
                      has its own "next" button) and at the final word.
                    • Hint  — types the first letter for the student in
                      text-input modes (spelling / scramble / letter-sounds).
                      Only when the input is still empty.
                  Before this change, demo only surfaced 50/50 + Skip and
                  only on three modes, so most of the demo played without
                  any power-up buttons at all. */}
              {(() => {
                const mode = selectedMode!;
                const isMultiChoice = mode === 'classic' || mode === 'listening' || mode === 'reverse';
                const isTextInput = mode === 'spelling' || mode === 'scramble' || mode === 'letter-sounds';
                const canSkip = mode !== 'flashcards' && !selectedAnswer && powerUps.skip > 0 && currentWordIndex < DEMO_WORDS.length - 1;
                const canFiftyFifty = isMultiChoice && powerUps.fifty_fifty > 0 && hiddenOptions.length === 0 && !selectedAnswer;
                const canHint = isTextInput && powerUps.reveal_letter > 0 && !selectedAnswer && spellingInput.length === 0;
                if (!canSkip && !canFiftyFifty && !canHint) return null;
                return (
                  <div className="flex justify-center gap-2 mb-3">
                    {canFiftyFifty && (
                      <motion.button onClick={handleFiftyFifty} className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:from-amber-200 hover:to-amber-300 transition-all flex items-center gap-1 border border-amber-300 shadow-sm hover:shadow-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ✂️ 50/50 <span className="bg-amber-300 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.fifty_fifty}</span>
                      </motion.button>
                    )}
                    {canSkip && (
                      <motion.button onClick={handleSkip} className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:from-blue-200 hover:to-blue-300 transition-all flex items-center gap-1 border border-blue-300 shadow-sm hover:shadow-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ⏭️ {t.skip} <span className="bg-blue-300 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.skip}</span>
                      </motion.button>
                    )}
                    {canHint && (
                      <motion.button onClick={handleRevealLetter} className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-200 text-green-700 rounded-xl text-xs font-bold hover:from-green-200 hover:to-green-300 transition-all flex items-center gap-1 border border-green-300 shadow-sm hover:shadow-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        💡 Hint <span className="bg-green-300 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.reveal_letter}</span>
                      </motion.button>
                    )}
                  </div>
                );
              })()}

              {/* Progress bar now lives INSIDE each mode card (matches real
                  app's GameActiveView). Older per-mode standalone progress
                  was removed — only Classic/Listening/Reverse/TrueFalse have
                  it baked in currently; other modes still get the wordOf pill. */}
              {["spelling", "scramble", "flashcards", "letter-sounds"].includes(selectedMode!) && (
                <div className="mb-4">
                  <div className={`flex justify-between text-sm text-stone-500 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t.wordOf.replace('{current}', String(currentWordIndex + 1)).replace('{total}', String(DEMO_WORDS.length))}</span>
                    <span>{Math.round((currentWordIndex / DEMO_WORDS.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Classic Mode — EMERALD/GREEN theme */}
              {selectedMode === "classic" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-gradient-to-br from-emerald-50 to-green-50 border-[3px] border-emerald-500 shadow-emerald-200/50" : isCorrect === false ? "bg-gradient-to-br from-rose-50 to-red-50 border-[3px] border-rose-500 shadow-rose-200/50" : "border-[3px] border-emerald-100"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 shadow-lg shadow-emerald-300/50"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2 shadow-sm">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-4 sm:mb-6">
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 break-words w-full text-center" dir="ltr">
                      {cleanWordForDisplay(currentWord.english)}
                    </h2>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-1.5 sm:p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full hover:from-emerald-100 hover:to-emerald-200 transition-all shadow-sm hover:shadow-md border border-emerald-200"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={20} className="text-emerald-600 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    {options.map((option, i) => {
                      const optionWord = DEMO_WORDS.find(w => getMeaning(w, targetLanguage) === option);
                      const isSelected = selectedAnswer === option;
                      const isHidden = hiddenOptions.includes(optionWord?.id ?? -1);
                      const isCorrectAnswer = option === getMeaning(currentWord, targetLanguage);
                      const showResult = selectedAnswer !== null;

                      if (isHidden) return null;

                      let btnClass = "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-800 hover:from-emerald-100 hover:to-emerald-200 active:from-emerald-200 active:to-emerald-300 shadow-sm hover:shadow-md border border-emerald-200";
                      if (showResult && isCorrectAnswer) btnClass = "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white motion-safe:scale-105 shadow-xl shadow-emerald-300/50 ring-2 ring-emerald-400";
                      else if (showResult && isSelected && !isCorrect) btnClass = "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-600 opacity-50";
                      else if (showResult) btnClass = "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed";

                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleClassicAnswer(option)}
                          disabled={selectedAnswer !== null}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${btnClass}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                          whileHover={{ scale: showResult ? 1 : 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {showResult && isCorrectAnswer && <span aria-hidden="true">✓</span>}
                          <span>{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Listening Mode — unified card like Classic, with the word
                  blurred (same visual cue as real WordPromptCard when
                  gameMode === 'listening'). */}
              {selectedMode === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-blue-50 border-[3px] border-blue-600" : isCorrect === false ? "bg-red-50 border-[3px] border-red-500" : "border-[3px] border-transparent"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-500"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-4 sm:mb-6">
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 blur-xl select-none opacity-20 break-words w-full text-center" dir="ltr">
                      {cleanWordForDisplay(currentWord.english)}
                    </h2>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md border border-blue-200 mx-auto flex items-center justify-center"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={24} className="text-stone-600 sm:w-8 sm:h-8" />
                    </button>
                    <p className="text-xs sm:text-sm text-stone-400 font-bold">{t.listenType}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    {options.map((option, i) => {
                      const optionWord = DEMO_WORDS.find(w => getMeaning(w, targetLanguage) === option);
                      const isHidden = hiddenOptions.includes(optionWord?.id ?? -1);
                      if (isHidden) return null;

                      const isSelected = selectedAnswer === option;
                      const isCorrectAnswer = option === getMeaning(currentWord, targetLanguage);
                      const showResult = selectedAnswer !== null;

                      let btnClass = "bg-gradient-to-br from-stone-100 to-stone-200 text-stone-800 hover:from-stone-200 hover:to-stone-300 active:from-stone-300 active:to-stone-400 shadow-sm hover:shadow-md";
                      if (showResult && isCorrectAnswer) btnClass = "bg-gradient-to-br from-blue-500 to-blue-600 text-white motion-safe:scale-105 shadow-xl shadow-blue-300/50 ring-2 ring-blue-400";
                      else if (showResult && isSelected && !isCorrect) btnClass = "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-600 opacity-50";
                      else if (showResult) btnClass = "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed";

                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleClassicAnswer(option)}
                          disabled={selectedAnswer !== null}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${btnClass}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                          whileHover={{ scale: showResult ? 1 : 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {showResult && isCorrectAnswer && <span aria-hidden="true">✓</span>}
                          <span>{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Matching Mode — matches real MatchingModeGame: 2/3-col
                  grid of fixed-height cards, blue-600 + ring on selected,
                  matched cards disappear (not opacity-fade). */}
              {selectedMode === "matching" && (
                <motion.div
                  key="matching"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto"
                >
                  <AnimatePresence>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-3">
                      {matchingCards.filter(c => !c.matched).map((card) => (
                        <motion.button
                          key={card.id}
                          initial={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
                          whileHover={{ scale: 1.05, translateY: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMatchingSelect(card.id)}
                          disabled={card.matched}
                          dir="auto"
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-md font-black text-lg sm:text-2xl h-20 sm:h-32 flex items-center justify-center transition-all duration-200 border-2 ${
                            card.selected
                              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-300/50 ring-4 ring-blue-200 border-blue-400"
                              : "bg-gradient-to-br from-white to-stone-50 text-stone-800 border-stone-200 hover:shadow-lg hover:border-blue-200"
                          }`}
                        >
                          {card.content}
                        </motion.button>
                      ))}
                    </div>
                  </AnimatePresence>
                  <div className="mt-4 text-center text-[10px] sm:text-xs font-black text-stone-400 uppercase tracking-widest">
                    {t.matched} <span className="text-stone-800">{matchedPairs} / 4</span>
                  </div>
                </motion.div>
              )}

              {/* Spelling Mode — matches real SpellingGame: stone-prompt
                  + big feedback-bordered input + stone-900 check button. */}
              {selectedMode === "spelling" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-gradient-to-br from-blue-50 to-emerald-50 border-[3px] border-blue-600 shadow-blue-200/50" : isCorrect === false ? "bg-gradient-to-br from-rose-50 to-red-50 border-[3px] border-rose-500 shadow-rose-200/50" : "border-[3px] border-stone-100"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 shadow-lg shadow-purple-300/50"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  {/* Word display — student hears the English word, types it.
                      Translation shown underneath as a hint (matches real
                      SpellingGame pattern). */}
                  <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-4 sm:mb-6">
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md border border-blue-200 mx-auto flex items-center justify-center"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={24} className="text-stone-600 sm:w-8 sm:h-8" />
                    </button>
                    <p className="text-stone-400 text-sm sm:text-base font-bold mt-2">
                      {t.translation}: <span className="text-stone-900 text-lg sm:text-2xl font-black" dir="auto">
                        {getMeaning(currentWord, targetLanguage)}
                      </span>
                    </p>
                  </div>

                  {/* Power-ups for spelling */}
                  {powerUps.reveal_letter > 0 && !selectedAnswer && spellingInput.length === 0 && (
                    <div className="flex justify-center mb-3">
                      <button onClick={handleRevealLetter} className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:from-emerald-100 hover:to-emerald-200 transition-all flex items-center gap-1 border border-emerald-300 shadow-sm hover:shadow-md">
                        💡 {t.hint} <span className="bg-emerald-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.reveal_letter}</span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSpellingSubmit} className="max-w-md mx-auto">
                    <input
                      autoFocus
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="Type in English..."
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 sm:p-5 text-base sm:text-2xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-5 transition-all shadow-sm ${
                        isCorrect === true ? "border-blue-500 bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-700 shadow-blue-200/50" :
                        isCorrect === false ? "border-rose-500 bg-gradient-to-br from-rose-50 to-red-50 text-rose-700 shadow-rose-200/50" :
                        "border-stone-200 bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none hover:border-stone-300"
                      }`}
                      dir="ltr"
                    />
                    {selectedAnswer === null && (
                      <motion.button
                        type="submit"
                        disabled={!spellingInput.trim()}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl font-black text-base sm:text-xl hover:from-stone-900 hover:to-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        whileHover={{ scale: spellingInput.trim() ? 1.02 : 1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Check Answer
                      </motion.button>
                    )}
                  </form>
                </motion.div>
              )}

              {/* Scramble Mode — same visual language as Spelling. */}
              {selectedMode === "scramble" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-blue-50 border-[3px] border-blue-600" : isCorrect === false ? "bg-red-50 border-[3px] border-red-500" : "border-[3px] border-transparent"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-500"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-4 sm:mb-6">
                    <p className="text-stone-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">{t.unscramble}</p>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 tracking-widest break-words w-full text-center" dir="ltr">
                      {scrambledWord.toUpperCase()}
                    </h2>
                    <p className="text-stone-400 text-sm sm:text-base font-bold mt-2">
                      {t.translation}: <span className="text-stone-900 text-lg sm:text-2xl font-black" dir="auto">
                        {getMeaning(currentWord, targetLanguage)}
                      </span>
                    </p>
                  </div>

                  <form onSubmit={handleScrambleSubmit} className="max-w-md mx-auto">
                    <input
                      autoFocus
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="Type in English..."
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 sm:p-5 text-base sm:text-2xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-5 transition-all shadow-sm ${
                        isCorrect === true ? "border-blue-500 bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-700 shadow-blue-200/50" :
                        isCorrect === false ? "border-rose-500 bg-gradient-to-br from-rose-50 to-red-50 text-rose-700 shadow-rose-200/50" :
                        "border-stone-200 bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none hover:border-stone-300"
                      }`}
                      dir="ltr"
                    />
                    {selectedAnswer === null && (
                      <motion.button
                        type="submit"
                        disabled={!spellingInput.trim()}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl font-black text-base sm:text-xl hover:from-stone-900 hover:to-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        whileHover={{ scale: spellingInput.trim() ? 1.02 : 1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Check Answer
                      </motion.button>
                    )}
                  </form>
                </motion.div>
              )}

              {/* True/False Mode — unified card + progress + large
                  translation shown (matches real TrueFalseGame which shows
                  only the translation; demo keeps English + translation so
                  a 2-min demo taster doesn't force students to listen). */}
              {selectedMode === "true-false" && tfStatement && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-blue-50 border-[3px] border-blue-600" : isCorrect === false ? "bg-red-50 border-[3px] border-red-500" : "border-[3px] border-transparent"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-500"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-5 sm:p-8 rounded-2xl sm:rounded-3xl mb-4 shadow-sm border border-stone-200 max-w-lg mx-auto">
                    <div className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 mb-2" dir="ltr">
                      {cleanWordForDisplay(tfStatement.word.english)}
                    </div>
                    <div className="text-stone-400 text-sm mb-3 font-black">=</div>
                    <p className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-800" dir="auto">
                      {tfStatement.shownMeaning}
                    </p>
                    <button
                      onClick={() => speakWord(tfStatement.word.id)}
                      className="mt-4 p-2 sm:p-3 bg-gradient-to-br from-rose-50 to-rose-100 rounded-full hover:from-rose-100 hover:to-rose-200 transition-all shadow-sm hover:shadow-md border border-rose-200"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={20} className="text-stone-600 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto">
                    <motion.button
                      type="button"
                      onClick={() => handleTFAnswer(true)}
                      disabled={selectedAnswer !== null}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '64px' }}
                      className="py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/50 hover:shadow-xl hover:shadow-emerald-400/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-emerald-300"
                      whileHover={{ scale: selectedAnswer === null ? 1.05 : 1, translateY: selectedAnswer === null ? -4 : 0 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      True ✓
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleTFAnswer(false)}
                      disabled={selectedAnswer !== null}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '64px' }}
                      className="py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-300/50 hover:shadow-xl hover:shadow-rose-400/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-rose-300"
                      whileHover={{ scale: selectedAnswer === null ? 1.05 : 1, translateY: selectedAnswer === null ? -4 : 0 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      False ✗
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Flashcards Mode — matches real FlashcardsGame: stone
                  flip button, rose "Still Learning" + blue "Got It"
                  judgement buttons after flip. */}
              {selectedMode === "flashcards" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-500 shadow-lg shadow-cyan-300/50"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2 shadow-sm">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  {/* Hero card with the word/translation (inner, sits inside
                      the main game card so we match the GameActiveView
                      structure: outer card + progress + inner content). */}
                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl sm:rounded-[28px] p-5 sm:p-10 border-2 border-stone-200 shadow-sm min-h-[220px] flex flex-col items-center justify-center text-center mb-4 sm:mb-6 max-w-md mx-auto">
                    {!isFlipped ? (
                      <>
                        <p className="text-stone-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">{t.flashcardWord}</p>
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 mb-4 break-words w-full" dir="ltr">
                          {cleanWordForDisplay(currentWord.english)}
                        </h2>
                        <motion.button
                          onClick={() => speakWord(currentWord.id)}
                          className="p-2 sm:p-3 bg-white rounded-full hover:bg-stone-50 transition-colors shadow-sm border border-stone-200"
                          aria-label="Play pronunciation"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Volume2 size={20} className="text-stone-600 sm:w-6 sm:h-6" />
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <p className="text-stone-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">{t.flashcardMeaning}</p>
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 break-words w-full" dir="auto">
                          {getMeaning(currentWord, targetLanguage)}
                        </h2>
                      </>
                    )}
                  </div>

                  <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
                    <motion.button
                      onClick={() => setIsFlipped(!isFlipped)}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-gradient-to-r from-stone-100 to-stone-200 text-stone-700 hover:from-stone-200 hover:to-stone-300 transition-all shadow-sm hover:shadow-md"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isFlipped ? "Show English" : "Show Translation"}
                    </motion.button>
                    {isFlipped && selectedAnswer === null && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <motion.button
                          onClick={() => { setIsCorrect(false); handleFeedback(false); setSelectedAnswer("unknown"); }}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '56px' }}
                          className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 hover:from-rose-100 hover:to-rose-200 transition-all shadow-sm hover:shadow-md border border-rose-200"
                          whileHover={{ scale: 1.05, translateY: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >Still Learning</motion.button>
                        <motion.button
                          onClick={() => { setIsCorrect(true); handleFeedback(true); setSelectedAnswer("known"); }}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '56px' }}
                          className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md border border-blue-200"
                          whileHover={{ scale: 1.05, translateY: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >Got It!</motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Reverse Mode — translate from Hebrew/Arabic to English.
                  Unified card like Classic, translation at top, English
                  text input below. */}
              {selectedMode === "reverse" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-blue-50 border-[3px] border-blue-600" : isCorrect === false ? "bg-red-50 border-[3px] border-red-500" : "border-[3px] border-transparent"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-500"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-4 sm:mb-6">
                    <p className="text-stone-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">{t.reverseTitle}</p>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 break-words w-full text-center" dir="auto">
                      {getMeaning(currentWord, targetLanguage)}
                    </h2>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-1.5 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md border border-blue-200"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={20} className="text-stone-600 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); if (spellingInput.trim()) handleReverseAnswer(spellingInput); }} className="max-w-md mx-auto">
                    <input
                      autoFocus
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="Type in English..."
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 sm:p-5 text-base sm:text-2xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-5 transition-all shadow-sm ${
                        isCorrect === true ? "border-blue-500 bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-700 shadow-blue-200/50" :
                        isCorrect === false ? "border-rose-500 bg-gradient-to-br from-rose-50 to-red-50 text-rose-700 shadow-rose-200/50" :
                        "border-stone-200 bg-white focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100 outline-none hover:border-stone-300"
                      }`}
                      dir="ltr"
                    />
                    {selectedAnswer === null && (
                      <motion.button
                        type="submit"
                        disabled={!spellingInput.trim()}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl font-black text-base sm:text-xl hover:from-stone-900 hover:to-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        whileHover={{ scale: spellingInput.trim() ? 1.02 : 1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Check Answer
                      </motion.button>
                    )}
                  </form>
                </motion.div>
              )}

              {/* Letter Sounds Mode — matches real LetterSoundsGame:
                  translation hint at top, bordered color-tinted letter
                  tiles that fade in, input form appears once all revealed. */}
              {selectedMode === "letter-sounds" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-gradient-to-br from-blue-50 to-emerald-50 border-[3px] border-blue-600 shadow-blue-200/50" : isCorrect === false ? "bg-gradient-to-br from-rose-50 to-red-50 border-[3px] border-rose-500 shadow-rose-200/50" : "border-[3px] border-stone-100"}`}
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-500 shadow-lg shadow-violet-300/50"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <span className="inline-block bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1 mt-2 shadow-sm">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <p className="text-stone-600 text-lg sm:text-xl font-bold mb-4 text-center" dir="auto">
                    {getMeaning(currentWord, targetLanguage)}
                  </p>
                  <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6">
                    <div className="flex justify-center gap-1 sm:gap-2 flex-wrap" dir="ltr">
                      {cleanWordForDisplay(currentWord.english).split("").map((letter, i) => {
                        const revealed = i < revealedLetters;
                        const color = LETTER_COLORS[i % LETTER_COLORS.length];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: revealed ? 1 : 0.15, scale: revealed ? 1 : 0.5 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-10 h-12 sm:w-14 sm:h-16 rounded-xl font-black text-lg sm:text-3xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0"
                            style={{
                              color: revealed ? color : color + "40",
                              borderColor: revealed ? color : color + "40",
                              background: color + "18",
                            }}
                          >
                            {revealed ? letter.toUpperCase() : "?"}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {revealedLetters >= cleanWordForDisplay(currentWord.english).length ? (
                    <form onSubmit={(e) => { e.preventDefault(); if (spellingInput.trim()) handleReverseAnswer(spellingInput); }} className="max-w-sm mx-auto">
                      <input
                        autoFocus
                        type="text"
                        value={spellingInput}
                        onChange={(e) => setSpellingInput(e.target.value)}
                        placeholder="Type the word..."
                        disabled={selectedAnswer !== null}
                        className={`w-full p-3 sm:p-4 text-base sm:text-2xl font-black text-center border-4 rounded-2xl mb-3 transition-all ${
                          isCorrect === true ? "border-blue-600 bg-blue-50 text-blue-700" :
                          isCorrect === false ? "border-rose-500 bg-rose-50 text-rose-700" :
                          "border-stone-100 focus:border-stone-900 outline-none"
                        }`}
                        dir="ltr"
                      />
                      {selectedAnswer === null && (
                        <button
                          type="submit"
                          disabled={!spellingInput.trim()}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-base sm:text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Check Answer
                        </button>
                      )}
                    </form>
                  ) : selectedAnswer === null ? (
                    <div className="text-center">
                      <button
                        onClick={() => { setRevealedLetters(0); }}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors inline-flex items-center gap-2"
                      >
                        🔊 Replay Sounds
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {/* Sentence Builder — matches real SentenceBuilderGame:
                  stone bg for target area, blue-600 chips for built
                  words, white bordered chips for available words,
                  stone-900 Check button. */}
              {selectedMode === "sentence-builder" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-8 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-500"
                    style={{ width: `${((currentWordIndex + 1) / DEMO_WORDS.length) * 100}%` }}
                  />

                  <div className="flex items-center justify-center gap-2 mb-3 mt-2">
                    <p className="text-stone-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      {t.sentenceBuild || "Build the sentence"}
                    </p>
                    <button
                      onClick={() => {
                        window.speechSynthesis?.cancel();
                        const utter = new SpeechSynthesisUtterance(`${currentWord.english} is great!`);
                        utter.rate = 0.9;
                        window.speechSynthesis.speak(utter);
                      }}
                      className="text-blue-500 hover:text-blue-700 active:scale-90 transition-all"
                      title="Listen to sentence"
                    >🔊</button>
                  </div>

                  <div className="max-w-xl mx-auto">
                    {/* Built sentence area */}
                    <div className={`min-h-[64px] sm:min-h-[72px] border-4 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center transition-colors ${
                      sentenceFeedback === "correct" ? "border-blue-500 bg-blue-50" :
                      sentenceFeedback === "incorrect" ? "border-rose-500 bg-rose-50" :
                      "border-stone-200 bg-stone-50"
                    }`} dir="ltr">
                      {builtSentence.length === 0 ? (
                        <span className="text-stone-300 text-sm italic w-full text-center">Tap words below to build the sentence</span>
                      ) : (
                        builtSentence.map((word, i) => (
                          <button
                            key={`${word}-${i}`}
                            onClick={() => {
                              if (sentenceFeedback !== null) return;
                              setBuiltSentence(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
                              setAvailableWords(prev => [...prev, word]);
                            }}
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-md"
                          >{word}</button>
                        ))
                      )}
                    </div>

                    {/* Available words */}
                    <div className="flex flex-wrap gap-2 mb-4 justify-center" dir="ltr">
                      {availableWords.map((word, i) => (
                        <motion.button
                          key={`${word}-${i}`}
                          onClick={() => {
                            if (sentenceFeedback !== null) return;
                            setAvailableWords(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
                            setBuiltSentence(prev => [...prev, word]);
                          }}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-teal-400 hover:text-teal-700 active:scale-95 transition-all shadow-sm hover:shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >{word}</motion.button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => {
                          setBuiltSentence([]);
                          const target = `${currentWord.english} is great!`.split(" ").filter(Boolean);
                          setAvailableWords([...target].sort(() => Math.random() - 0.5));
                        }}
                        disabled={sentenceFeedback !== null}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        className="flex-1 py-2 bg-gradient-to-r from-stone-100 to-stone-200 text-stone-600 rounded-xl font-bold hover:from-stone-200 hover:to-stone-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        whileHover={{ scale: sentenceFeedback === null ? 1.02 : 1 }}
                        whileTap={{ scale: 0.97 }}
                      >Clear</motion.button>
                      <motion.button
                        onClick={() => {
                          const target = `${currentWord.english} is great!`;
                          const built = builtSentence.join(" ");
                          if (built.toLowerCase() === target.toLowerCase()) {
                            setSentenceFeedback("correct");
                            handleFeedback(true);
                          } else {
                            setSentenceFeedback("incorrect");
                            setTimeout(() => setSentenceFeedback(null), 1500);
                          }
                        }}
                        disabled={builtSentence.length === 0 || sentenceFeedback !== null}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        className="flex-2 py-2 px-6 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-xl font-bold hover:from-stone-900 hover:to-black transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                        whileHover={{ scale: (builtSentence.length > 0 && sentenceFeedback === null) ? 1.02 : 1 }}
                        whileTap={{ scale: 0.97 }}
                      >Check ✓</motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Feedback */}
              {selectedAnswer !== null && selectedMode !== "matching" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-2xl ${
                    isCorrect ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {isCorrect ? (
                    <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Star size={20} className="text-green-600" />
                      <span className="font-bold text-green-700">{t.correct} +{10 + streak * 2} XP</span>
                      {badges.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Trophy size={14} className="text-amber-500" />
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">+{badges.filter(b => !b.includes("🏆")).length}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <span className="font-bold text-red-700">{t.notQuite}</span>
                      <p className="text-sm mt-1 text-red-600">
                        {t.theAnswerIs} <strong dir="ltr">{cleanWordForDisplay(currentWord.english)}</strong> = {getMeaning(currentWord, targetLanguage)}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Results Screen */}
          {view === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center"
            >
              {/* Trophy hero — matches real GameFinishedView */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-6"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                  <Trophy size={48} className="text-white sm:w-16 sm:h-16" />
                </div>
              </motion.div>

              <h1 className="text-3xl sm:text-5xl font-black font-headline text-stone-900 mb-2">
                {t.greatJob}
              </h1>
              <p className="text-stone-500 text-sm sm:text-base mb-6 sm:mb-8">
                {t.completedDemo}
              </p>

              {/* Score / XP / Streak triple card — matches GameFinishedView */}
              <div className="w-full flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
                <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-md flex-1 text-center border border-stone-100">
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-stone-500 mb-1 font-black">Final Score</p>
                  <p className="text-4xl sm:text-6xl font-black text-blue-500">{score}</p>
                </div>
                <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-md flex-1 text-center border border-stone-100">
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-stone-500 mb-1 font-black">Total XP</p>
                  <p className="text-4xl sm:text-6xl font-black text-blue-600">{xp}</p>
                </div>
                {streak > 0 && (
                  <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-md border-2 border-orange-100 flex-1 text-center">
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-orange-500 mb-1 font-black">Streak</p>
                    <p className="text-4xl sm:text-6xl font-black text-orange-600">{streak} 🔥</p>
                  </div>
                )}
              </div>

              {/* Accuracy summary row — new, matches real app */}
              <div className="bg-white rounded-2xl shadow-sm px-6 py-3 mb-6 text-stone-600 text-sm">
                <span className="font-bold">{score}</span> / {DEMO_WORDS.length} correct
              </div>

              {/* XP Title callout */}
              <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6 border border-blue-200">
                <div className="flex items-center justify-center gap-2">
                  <Crown size={20} style={{ color: xpTitle.color }} />
                  <span className="font-black text-lg" style={{ color: xpTitle.color }}>{xpTitle.title}</span>
                </div>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="w-full mb-6">
                  <p className="text-[10px] sm:text-xs font-black text-stone-400 uppercase mb-3 tracking-widest text-center">{t.badgesEarned}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {badges.map((badge) => (
                      <motion.div
                        key={badge}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-2"
                      >
                        <span className="text-lg">🏅</span>
                        <span className="font-bold text-stone-800 text-sm">{badge}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* "What's next?" action panel — matches GameFinishedView
                  layout: single card, primary filled, secondary outlined. */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.3 }}
                className="w-full bg-white rounded-[28px] shadow-2xl border border-stone-200 p-5 sm:p-6 max-w-md"
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-center mb-3 text-stone-400">
                  What's next?
                </p>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={resetDemo}
                    type="button"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-base sm:text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                  >
                    <RefreshCw size={20} />
                    {t.playAgain}
                  </button>
                  <button
                    onClick={() => setView("game-select")}
                    type="button"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white border-2 border-stone-200 text-stone-800 px-6 py-3 rounded-2xl font-black text-sm sm:text-base hover:border-stone-300 active:scale-[0.98] transition-all"
                  >
                    Try Another Mode
                  </button>
                  <button
                    onClick={onClose}
                    type="button"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="w-full text-stone-500 py-2 font-bold text-sm hover:text-stone-800 transition-colors"
                  >
                    {t.closeDemo}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Shop - matches full app with tabs */}
          {view === "shop" && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Back row + live XP pill — visual language matches the
                  real-app ShopView header. */}
              <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setView("game-select")}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 rounded-full px-3 py-2 shadow-sm transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                  {t.back}
                </button>
                <div className={`flex items-center gap-2 bg-white rounded-full pl-2 pr-3 py-1.5 border border-stone-200 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs">{avatar}</span>
                  <span className="font-black text-stone-900 tabular-nums text-sm">{xp}</span>
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">XP</span>
                </div>
              </div>

              {/* Shop hero — same gradient hero as the real ShopView hub
                  so students feel the same visual language before and
                  after they sign up. */}
              <div className="relative overflow-hidden rounded-[28px] mb-5 bg-gradient-to-br from-fuchsia-600 via-pink-500 to-rose-500 p-5 sm:p-7 shadow-xl shadow-pink-500/20">
                <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-yellow-300/30 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 bg-cyan-400/25 rounded-full blur-3xl" />
                <div className="relative">
                  <p className="text-xs font-black text-white/85 uppercase tracking-widest mb-1">The Shop</p>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Treat yourself 🎁</h1>
                  <p className="text-sm text-white/90 mt-2 max-w-md">
                    Preview avatars, titles, and power-ups — earn XP in the full app to unlock more.
                  </p>
                </div>
              </div>

              {/* Segmented pill tabs — 7 tabs now, mirrors the real
                  ShopView's category set so the demo previews the full
                  shop breadth (eggs, themes, frames are the three new
                  ones that were missing before). */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-1 flex overflow-x-auto hide-scrollbar gap-0.5 mb-6" style={{ scrollSnapType: 'x mandatory' }}>
                {(["eggs", "avatars", "themes", "frames", "titles", "powerups", "premium"] as const).map(tab => {
                  const isActive = shopTab === tab;
                  const labels: Record<typeof tab, { emoji: string; text: string }> = {
                    eggs:     { emoji: '🥚', text: 'Eggs' },
                    avatars:  { emoji: '🎭', text: t.avatars },
                    themes:   { emoji: '🎨', text: t.themes },
                    frames:   { emoji: '🖼️', text: 'Frames' },
                    titles:   { emoji: '🏷️', text: t.xpTitle },
                    powerups: { emoji: '⚡', text: t.powerups },
                    premium:  { emoji: '🔥', text: t.premium },
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setShopTab(tab)}
                      type="button"
                      style={{ touchAction: 'manipulation', scrollSnapAlign: 'center' }}
                      className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${isActive ? "bg-stone-900 text-white shadow-sm" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"}`}
                    >
                      <span className="text-base">{labels[tab].emoji}</span>
                      <span>{labels[tab].text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Eggs Tab — mirrors the real ShopView eggs category.
                  Shows the 6 mystery eggs with rarity-coded gradients,
                  ambient glow, drop-range chip, and an "In full app"
                  hint (opening is locked in demo). */}
              {shopTab === "eggs" && (
                <div>
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 mb-4 shadow-lg shadow-violet-500/20">
                    <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-amber-300/40 rounded-full blur-3xl" />
                    <div className="relative">
                      <h2 className="text-lg sm:text-xl font-black text-white">Mystery Eggs & Chests</h2>
                      <p className="text-xs sm:text-sm text-white/90 mt-0.5">Spend XP to open — every egg drops a random XP reward.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {MYSTERY_EGGS.map(egg => {
                      const rarityBg: Record<string, string> = {
                        common:    'from-stone-100 to-stone-200',
                        rare:      'from-sky-100 to-blue-200',
                        epic:      'from-violet-100 to-purple-200',
                        legendary: 'from-amber-100 via-yellow-100 to-orange-200',
                        mythic:    'from-pink-200 via-fuchsia-200 to-violet-200',
                      };
                      const rarityRing: Record<string, string> = {
                        common: 'ring-stone-300', rare: 'ring-blue-300', epic: 'ring-violet-300',
                        legendary: 'ring-amber-300', mythic: 'ring-fuchsia-400',
                      };
                      return (
                        <div key={egg.id} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${rarityBg[egg.rarity]} p-4 sm:p-5 ring-2 ${rarityRing[egg.rarity]} shadow-lg`}>
                          <div className="flex justify-end">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/70 text-stone-700">{egg.rarity}</span>
                          </div>
                          <div className="flex justify-center my-2 sm:my-3">
                            <span className="text-6xl sm:text-7xl drop-shadow-lg">{egg.emoji}</span>
                          </div>
                          <h3 className="text-sm sm:text-base font-black text-stone-900 text-center">{egg.name}</h3>
                          <p className="text-[11px] sm:text-xs text-stone-700/80 text-center mt-1 min-h-[2.5rem]">{egg.desc}</p>
                          <div className="flex justify-center mt-2">
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-stone-700 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/80">
                              {egg.minXp}–{egg.maxXp} XP drop
                            </span>
                          </div>
                          <div className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-black bg-white/60 text-stone-500 border border-white/80">
                            <ShoppingBag size={14} />
                            Unlock in full app
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Themes Tab — full-bleed preview strip + Apply button,
                  matches the real ShopView themes section. */}
              {shopTab === "themes" && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-xl font-black text-stone-900">Themes</h2>
                    <p className="text-stone-500 text-sm mt-1">Change the whole-app vibe.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEMES.slice(0, 6).map(theme => (
                      <div key={theme.id} className="relative overflow-hidden rounded-3xl shadow-lg border-2 border-white/80">
                        <div className={`${theme.colors.bg} h-28 sm:h-32 relative flex items-center justify-center`}>
                          <span className="text-5xl sm:text-6xl drop-shadow-lg">{theme.preview}</span>
                          <div aria-hidden className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        </div>
                        <div className="bg-white p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-stone-900 truncate">{theme.name}</h3>
                            <p className="text-[10px] text-stone-500 mt-0.5">{theme.cost === 0 ? 'Free' : `${theme.cost} XP in full app`}</p>
                          </div>
                          <div className="shrink-0 text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-1 rounded-lg">
                            Full app
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Frames Tab — dark card with the student's avatar
                  wearing each frame.  Same layout as real ShopView. */}
              {shopTab === "frames" && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-xl font-black text-stone-900">Avatar Frames</h2>
                    <p className="text-stone-500 text-sm mt-1">Glowing rings around your avatar everywhere it appears.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {NAME_FRAMES.slice(0, 6).map(frame => (
                      <div key={frame.id} className="relative overflow-hidden rounded-3xl shadow-lg bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-5">
                        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-violet-500/30 to-pink-500/30 rounded-full blur-3xl" />
                        <div className="relative flex items-center gap-4">
                          <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-100 to-white flex items-center justify-center shadow-inner border border-white/20">
                            <span className={`w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-3xl ${frame.border}`}>
                              {avatar || '😎'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Frame</p>
                            <h3 className="text-base font-black text-white truncate">{frame.name}</h3>
                            <p className="text-xs text-white/70 mt-1">Full app — {frame.cost} XP</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Avatars Tab - UNLOCKED FEATURES */}
              {shopTab === "avatars" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black mb-2 text-stone-900">Avatar Collections</h2>
                  <p className="text-stone-500 text-sm mb-4">Earn XP to unlock new avatar packs! Select any unlocked avatar to equip it.</p>
                  {(Object.keys(REAL_AVATAR_CATEGORIES) as Array<keyof typeof REAL_AVATAR_CATEGORIES>).map((category) => {
                    const unlock = AVATAR_CATEGORY_UNLOCKS[category] ?? { xpRequired: 0, label: 'Free' };
                    const isUnlocked = xp >= unlock.xpRequired;
                    const progressPercent = unlock.xpRequired > 0 ? Math.min(100, Math.round((xp / unlock.xpRequired) * 100)) : 100;
                    return (
                      <div key={category} className={`rounded-2xl border-2 overflow-hidden transition-all ${isUnlocked ? 'border-green-200 bg-green-50/50' : 'border-stone-200 bg-stone-50'}`}>
                        <div className={`flex items-center justify-between px-4 py-3 ${isUnlocked ? 'bg-green-100/50' : 'bg-stone-100'}`}>
                          <div className="flex items-center gap-2">
                            {isUnlocked ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <span className="text-sm">🔒</span>
                            )}
                            <span className={`text-sm font-black ${isUnlocked ? 'text-green-800' : 'text-stone-500'}`}>{category}</span>
                            <span className="text-xs text-stone-400">({REAL_AVATAR_CATEGORIES[category].length} avatars)</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-green-200 text-green-800' : 'bg-amber-100 text-amber-700'}`}>
                            {unlock.xpRequired === 0 ? 'Free' : isUnlocked ? 'Unlocked!' : `${unlock.label} needed`}
                          </span>
                        </div>
                        {!isUnlocked && (
                          <div className="px-4 pt-2 pb-1">
                            <div className="w-full bg-stone-200 rounded-full h-1.5">
                              <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">{xp} / {unlock.xpRequired} XP ({progressPercent}%)</p>
                          </div>
                        )}
                        <div className={`grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 p-3 sm:p-4 ${!isUnlocked ? 'opacity-40 pointer-events-none' : ''}`}>
                          {REAL_AVATAR_CATEGORIES[category].map((a) => {
                            const isEquipped = avatar === a;
                            return (
                              <button
                                key={a}
                                onClick={() => { if (isUnlocked) { setAvatar(a); setView('game-select'); } }}
                                type="button"
                                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                className={`relative aspect-square flex items-center justify-center rounded-2xl text-3xl sm:text-4xl transition-all border ${
                                  isEquipped
                                    ? 'bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 border-white shadow-lg shadow-violet-300/50 ring-2 ring-violet-400 scale-105'
                                    : isUnlocked
                                    ? 'bg-gradient-to-br from-white to-stone-50 border-stone-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-violet-200 shadow-sm cursor-pointer'
                                    : 'bg-stone-100 border-stone-200 grayscale'
                                }`}
                              >
                                <span className="drop-shadow-sm">{isUnlocked ? a : '?'}</span>
                                {isEquipped && (
                                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md">
                                    <Check size={12} className="text-violet-600" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Premium Avatars - LOCKED */}
                  <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-4 shadow-md border-2 border-amber-200 ${isRTL ? 'text-right' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-stone-800">✨ Premium Avatars</h3>
                      <span className="text-xs bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <ShoppingBag size={14} /> FULL VERSION
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-2 opacity-50 mb-3">
                      {PREMIUM_AVATARS.map((avatar) => (
                        <div key={avatar.emoji} className="text-2xl p-2 bg-white rounded-xl text-center border border-stone-200">
                          {avatar.emoji}
                        </div>
                      ))}
                    </div>
                    <div className="w-full py-3 bg-white text-stone-700 rounded-xl font-bold flex items-center justify-center gap-2 border border-amber-200">
                      <ShoppingBag size={18} />
                      Available in the full version
                    </div>
                  </div>
                </div>
              )}

              {/* XP Titles Tab - UNLOCKED FEATURES */}
              {shopTab === "titles" && (
                <div className="space-y-3">
                  {XP_TITLES.map((title, i) => {
                    const isUnlocked = xp >= title.min;
                    const currentTitle = getXPTitle(xp);

                    return (
                      <div
                        key={title.title}
                        className={`bg-white rounded-3xl p-4 shadow-md border-2 transition-all ${isUnlocked ? 'border-green-300 hover:border-green-400' : 'border-stone-200 opacity-50'} ${currentTitle.title === title.title ? 'ring-2 ring-primary' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                            style={{ backgroundColor: isUnlocked ? title.color : '#9CA3AF' }}
                          >
                            {i === 0 ? '🌱' : i + 1}
                          </div>
                          <div className={`flex-1 ${textAlign}`}>
                            <p className="font-bold text-lg" style={{ color: isUnlocked ? title.color : '#9CA3AF' }}>{title.title}</p>
                            <p className="text-xs text-stone-500">{title.min} XP required</p>
                          </div>
                          {currentTitle.title === title.title && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Power-ups Tab - FREE IN DEMO */}
              {shopTab === "powerups" && (
                <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-stone-200">
                  <div className="mb-4 p-3 bg-green-50 rounded-xl text-center">
                    <p className="font-bold text-green-700">⚡ All power-ups are FREE in demo!</p>
                    <p className="text-xs text-green-600">You have: {powerUps.skip} Skip, {powerUps.fifty_fifty} 50/50, {powerUps.reveal_letter} Hints</p>
                  </div>
                  <div className="space-y-3">
                    {POWER_UPS.map((powerUp) => (
                      <div key={powerUp.id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border-2 border-green-200">
                        <span className="text-3xl">{powerUp.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-stone-800">{powerUp.name}</p>
                          <p className="text-xs text-stone-500">{powerUp.desc}</p>
                        </div>
                        <div className="text-center">
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-bold">
                            ×{powerUp.freeInDemo || 3}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Premium Tab - LOCKED */}
              {shopTab === "premium" && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-3xl p-6 border-2 border-pink-200">
                    <h2 className="text-xl font-black mb-2 bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
                      🔥 {t.shopFull}
                    </h2>
                    <p className="text-stone-600 text-sm">
                      The full version includes 100+ avatars, themes, frames, titles,
                      mystery eggs, and power-ups — all earned by playing and gaining XP.
                    </p>
                  </div>

                  {/* Locked Premium Avatars Preview */}
                  <div className="bg-white rounded-3xl p-4 shadow-md border-2 border-stone-200">
                    <h3 className="font-bold text-stone-800 mb-3">🌟 Premium Avatars</h3>
                    <div className="grid grid-cols-6 gap-2">
                      {["🐉", "🦅", "🐺", "👑", "🎖️", "🦸"].map((e) => (
                        <div key={e} className="text-2xl p-2 bg-stone-100 rounded-xl text-center opacity-40">
                          {e}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DemoMode;
