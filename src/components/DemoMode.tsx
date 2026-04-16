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
  Target
} from "lucide-react";
import { Word, ALL_WORDS } from "../data/vocabulary";
import { useAudio } from "../hooks/useAudio";
import { useLanguage, Language } from "../hooks/useLanguage";
import { AvatarPicker } from "./AvatarPicker";
import { MYSTERY_EGGS, THEMES, NAME_FRAMES } from "../constants/game";

interface DemoModeProps {
  onClose: () => void;
}

type DemoView = "welcome" | "avatar" | "game-select" | "game" | "results" | "shop";
type ShopTab = "eggs" | "avatars" | "themes" | "frames" | "titles" | "powerups" | "premium";

// Avatar categories matching the full app
const AVATAR_CATEGORIES: Record<string, { emoji: string[]; unlockXP: number }> = {
  "Forest Friends": { emoji: ["🦊", "🐻", "🐰", "🦌", "🐿️", "🦔"], unlockXP: 0 },
  "Ocean Crew": { emoji: ["🐬", "🦈", "🐙", "🦀", "🐠", "🐳"], unlockXP: 50 },
  "Sky Squad": { emoji: ["🦅", "🦉", "🦜", "🐦", "🦋", "🦗"], unlockXP: 100 },
  "Dream Team": { emoji: ["🐉", "🦄", "🦁", "🐯", "🦘", "🦒"], unlockXP: 150 },
  "Sport Stars": { emoji: ["⚽", "🏀", "🏈", "🎾", "🏐", "🎱"], unlockXP: 200 },
};

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

// Demo words — a 100-word slice of Set 1 vocabulary so students get
// a real taste of the app instead of looping the same 10 words.  Pulled
// from ALL_WORDS so the demo always stays in sync with what the full
// app teaches.  100 keeps the demo lightweight while feeling expansive.
//
// IMPORTANT: the vocabulary data uses level: "Set 1" (see
// src/data/vocabulary.ts).  An earlier version of this filter said
// 'Band 1' (legacy terminology) which matched NO words and left the
// demo with an empty pool — rendering every game mode screen blank.
// That's the bug the user reported as "no content in each mode".
const DEMO_WORDS: Word[] = ALL_WORDS.filter(w => w.level === 'Set 1').slice(0, 100);

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

// Per-mode gradient — keeps cards visually distinct and mirrors the
// visual language of the real-app GameModeSelectionView so students
// feel at home when they graduate from the demo.
const MODE_GRADIENTS: Record<string, string> = {
  classic:     'from-emerald-500 via-teal-500 to-cyan-600',
  listening:   'from-sky-500 via-blue-500 to-indigo-600',
  spelling:    'from-violet-500 via-purple-500 to-fuchsia-600',
  matching:    'from-amber-500 via-orange-500 to-rose-500',
  truefalse:   'from-rose-500 via-pink-500 to-fuchsia-500',
  flashcards:  'from-cyan-500 via-sky-500 to-blue-500',
  scramble:    'from-indigo-500 via-violet-500 to-purple-600',
  reverse:     'from-fuchsia-500 via-pink-500 to-rose-500',
  lettersounds:'from-violet-500 via-fuchsia-500 to-pink-500',
  sentence:    'from-teal-500 via-emerald-500 to-green-600',
};

const GAME_MODES: Record<Language, { id: string; name: string; emoji: string; desc: string }[]> = {
  en: [
    { id: "classic", name: "Classic", emoji: "📝", desc: "See the word, pick the right translation." },
    { id: "listening", name: "Listening", emoji: "🎧", desc: "Only hear the word. No English text!" },
    { id: "spelling", name: "Spelling", emoji: "✍️", desc: "Hear the word, type it in English." },
    { id: "matching", name: "Matching", emoji: "🔗", desc: "Match Hebrew/Arabic to English pairs." },
    { id: "truefalse", name: "True / False", emoji: "✅", desc: "Is the translation correct? Quick!" },
    { id: "flashcards", name: "Flashcards", emoji: "🎴", desc: "Review at your own pace." },
    { id: "scramble", name: "Scramble", emoji: "🔤", desc: "Unscramble the letters into a word." },
    { id: "reverse", name: "Reverse", emoji: "🔄", desc: "See the translation, pick the English word." },
    { id: "lettersounds", name: "Letter Sounds", emoji: "🔡", desc: "Hear each letter, type the full word." },
    { id: "sentence", name: "Sentence Builder", emoji: "🧩", desc: "Tap the words in the right order." },
  ],
  he: [
    { id: "classic", name: "קלאסי", emoji: "📝", desc: "בחר את הפירוש הנכון" },
    { id: "listening", name: "הקשבה", emoji: "🎧", desc: "שמע וזהה" },
    { id: "spelling", name: "איות", emoji: "✍️", desc: "הקלד את המילה נכון" },
    { id: "matching", name: "התאמה", emoji: "🔗", desc: "התאם מילים לפירושים" },
    { id: "truefalse", name: "נכון/לא נכון", emoji: "✓", desc: "האם זה נכון?" },
    { id: "flashcards", name: "כרטיסיות", emoji: "🎴", desc: "הפוך ולמד" },
    { id: "scramble", name: "ערבוב", emoji: "🔤", desc: "סדר את האותיות" },
    { id: "reverse", name: "הפוך", emoji: "🔄", desc: "תרגם לאנגלית" },
    { id: "lettersounds", name: "צלילי אותיות", emoji: "🔡", desc: "השמע את זה" },
    { id: "sentence", name: "בונה משפטים", emoji: "🧩", desc: "בנה משפטים" },
  ],
  ar: [
    { id: "classic", name: "كلاسيكي", emoji: "📝", desc: "اختر المعنى الصحيح" },
    { id: "listening", name: "استماع", emoji: "🎧", desc: "اسمع وحدد" },
    { id: "spelling", name: "تهجئة", emoji: "✍️", desc: "اكتب الكلمة بشكل صحيح" },
    { id: "matching", name: "مطابقة", emoji: "🔗", desc: "طابق الكلمات مع المعاني" },
    { id: "truefalse", name: "صح/خطأ", emoji: "✓", desc: "هل هذا صحيح؟" },
    { id: "flashcards", name: "بطاقات", emoji: "🎴", desc: "اقلب وتعلم" },
    { id: "scramble", name: "خلط", emoji: "🔤", desc: "رتب الحروف" },
    { id: "reverse", name: "عكس", emoji: "🔄", desc: "ترجم للإنجليزية" },
    { id: "lettersounds", name: "أصوات الحروف", emoji: "🔡", desc: "انطقها" },
    { id: "sentence", name: "بناء الجمل", emoji: "🧩", desc: "ابني جملًا" },
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
  const { language, dir, isRTL, textAlign } = useLanguage();
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
  const [targetLanguage, setTargetLanguage] = useState<TargetLang>(language === 'ar' ? 'arabic' : 'arabic');

  // Letter sounds state
  const [letterOptions, setLetterOptions] = useState<string[]>([]);
  const [revealedLetters, setRevealedLetters] = useState(0);
  const LETTER_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F59E0B","#6366F1"];

  // Sentence Builder state
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "incorrect" | null>(null);

  const { speak, preloadMany, playMotivational } = useAudio();

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
          setScrambledWord(shuffleWord(currentWord.english));
          break;
        case "truefalse":
          generateTFStatement();
          break;
        case "lettersounds":
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
  // All modes except flashcards, lettersounds, sentence, and matching: see + hear simultaneously on word load
  // Sentence builder and matching have their own audio handling (explicit user interaction)
  useEffect(() => {
    if (view !== "game" || !currentWord) return;
    if (selectedMode === "flashcards") return; // speak when flipped, not on load
    if (selectedMode === "lettersounds") return; // has its own letter-by-letter speech
    if (selectedMode === "sentence") return; // sentence mode has separate audio handling
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
    if (view !== "game" || selectedMode !== "lettersounds" || !currentWord || selectedAnswer !== null) return;

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
    const correct = spellingInput.toLowerCase().trim() === currentWord.english.toLowerCase();
    setSelectedAnswer(spellingInput);
    setIsCorrect(correct);
    handleFeedback(correct);
  };

  const handleScrambleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellingInput.trim() || selectedAnswer) return;
    const correct = spellingInput.toLowerCase().trim() === currentWord.english.toLowerCase();
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
    const correct = answer.toLowerCase().trim() === currentWord.english.toLowerCase();
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
      playMotivational();
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
    setView("game");
  };

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
    <div className="fixed inset-0 z-[100] bg-stone-50 overflow-auto" dir={dir}>
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

      <div className="max-w-lg mx-auto px-4 py-6 pt-16">
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
            >
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 sm:p-8 mb-5 shadow-xl shadow-violet-500/20 text-center">
                <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-yellow-300/30 rounded-full blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 bg-pink-400/30 rounded-full blur-3xl" />
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

              <button
                onClick={() => setView("avatar")}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black active:scale-[0.98] transition-all shadow-lg"
              >
                {t.letsGo}
              </button>
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
            >
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setView("avatar")}
                  className={`flex items-center gap-2 text-stone-500 hover:text-blue-600 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  {t.back}
                </button>
                <div className={`flex items-center gap-3 bg-stone-100 px-4 py-2 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-3xl">{avatar}</span>
                  <span className="font-bold text-stone-800">{displayName}</span>
                  {xp > 0 && (
                    <div className={`flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded-full`}>
                      <Target size={14} className="text-blue-600" />
                      <span className="font-black text-blue-700 text-xs">{xp} XP</span>
                    </div>
                  )}
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black font-headline text-stone-900 mb-1 text-center">
                {t.chooseGame}
              </h1>
              <p className="text-stone-500 text-center mb-5 text-sm">
                {t.tryPopular}
              </p>

              {/* Power-ups strip — same visual language as real app's chips */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3 mb-5 border border-amber-200">
                <p className="text-xs font-black text-amber-800 mb-2 text-center uppercase tracking-widest">⚡ Power-ups (free in demo)</p>
                <div className="flex justify-center gap-2">
                  {POWER_UPS.map((pu) => (
                    <div key={pu.id} className="bg-white px-3 py-1.5 rounded-xl text-center shadow-sm border border-amber-100 min-w-[60px]">
                      <span className="text-xl block">{pu.emoji}</span>
                      <p className="text-[10px] font-black text-stone-600 mt-0.5">×{powerUps[pu.id as keyof typeof powerUps]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Big gradient mode cards — mirror the real-app layout so
                  students feel a consistent design language between the
                  demo and the full product. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {modes.map((mode) => {
                  const grad = MODE_GRADIENTS[mode.id] ?? 'from-indigo-500 via-violet-500 to-fuchsia-500';
                  return (
                    <motion.button
                      key={mode.id}
                      onClick={() => startGame(mode.id)}
                      type="button"
                      style={{ touchAction: 'manipulation' }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${grad} p-5 text-left shadow-lg hover:shadow-2xl transition-all min-h-[140px]`}
                    >
                      {/* Ambient glow in the corner */}
                      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
                      {/* Subtle contrast overlay */}
                      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />

                      <div className="relative flex items-start gap-3">
                        <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-3xl shadow-inner">
                          {mode.emoji}
                        </div>
                        <div className={`flex-1 min-w-0 ${textAlign}`}>
                          <h3 className="font-black text-white text-lg sm:text-xl leading-tight drop-shadow">{mode.name}</h3>
                          <p className="text-xs sm:text-sm text-white/90 mt-1 leading-snug">{mode.desc}</p>
                        </div>
                      </div>

                      <div className={`relative flex items-center justify-end mt-3 text-white/90 text-xs font-black uppercase tracking-widest ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        Play
                        {isRTL ? <ArrowLeft size={14} className="ml-1" /> : <ArrowRight size={14} className="ml-1" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Game Screen */}
          {view === "game" && currentWord && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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

              {/* Power-ups toolbar */}
              {["classic", "listening", "reverse"].includes(selectedMode!) && (
                <div className="flex justify-center gap-2 mb-3">
                  {(selectedMode === "classic" || selectedMode === "listening" || selectedMode === "reverse") && powerUps.fifty_fifty > 0 && hiddenOptions.length === 0 && !selectedAnswer && (
                    <button onClick={handleFiftyFifty} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 border border-amber-200">
                      ✂️ 50/50 <span className="bg-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.fifty_fifty}</span>
                    </button>
                  )}
                  {powerUps.skip > 0 && !selectedAnswer && (
                    <button onClick={handleSkip} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 border border-blue-200">
                      ⏭️ {t.skip} <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.skip}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Progress (for most modes) */}
              {["classic", "listening", "spelling", "scramble", "truefalse", "flashcards", "reverse", "lettersounds"].includes(selectedMode!) && (
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

              {/* Classic Mode */}
              {selectedMode === "classic" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-4 sm:p-6 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-blue-50 border-[3px] border-blue-600" : isCorrect === false ? "bg-red-50 border-[3px] border-red-500" : "border-[3px] border-transparent"}`}
                >
                  <span className="inline-block bg-stone-100 text-stone-500 font-black text-xs sm:text-base px-3 py-1 rounded-full mb-2 sm:mb-4">
                    {currentWordIndex + 1} / {DEMO_WORDS.length}
                  </span>

                  <div className="flex flex-col items-center justify-center gap-4 mb-8">
                    <h2 className="text-2xl sm:text-5xl font-black text-stone-900 break-words w-full text-center" dir="ltr">
                      {currentWord.english}
                    </h2>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={24} className="text-stone-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {options.map((option, i) => {
                      const optionWord = DEMO_WORDS.find(w => getMeaning(w, targetLanguage) === option);
                      const isSelected = selectedAnswer === option;
                      const isHidden = hiddenOptions.includes(optionWord?.id ?? -1);
                      const isCorrectAnswer = option === getMeaning(currentWord, targetLanguage);
                      const showResult = selectedAnswer !== null;

                      if (isHidden) return null;

                      let btnClass = "bg-stone-100 text-stone-800 hover:bg-stone-200";
                      if (showResult && isCorrectAnswer) btnClass = "bg-blue-600 text-white scale-105 shadow-xl";
                      if (showResult && isSelected && !isCorrect) btnClass = "bg-rose-100 text-rose-500 opacity-50";

                      return (
                        <button
                          key={i}
                          onClick={() => handleClassicAnswer(option)}
                          disabled={selectedAnswer !== null}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${btnClass}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Listening Mode — matches real app: stone card + stone
                  volume pill + Classic-style 2-col answer grid with
                  blurred word indicator. */}
              {selectedMode === "listening" && (
                <div className="max-w-lg mx-auto">
                  <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 mb-4 sm:mb-6 text-center shadow-2xl border border-stone-100">
                    <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-3">
                      {currentWordIndex + 1} / {DEMO_WORDS.length}
                    </span>
                    {/* Blurred word so students train their ear — same
                        visual cue the real WordPromptCard uses when
                        gameMode === 'listening'. */}
                    <h2 className="text-3xl sm:text-5xl font-black text-stone-900 blur-xl select-none opacity-20 mb-4" dir="ltr">
                      {currentWord.english}
                    </h2>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-3 sm:p-4 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors mx-auto flex items-center justify-center"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={24} className="text-stone-600 sm:w-8 sm:h-8" />
                    </button>
                    <p className="text-xs sm:text-sm text-stone-400 mt-3 font-bold">{t.listenType}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {options.map((option, i) => {
                      const optionWord = DEMO_WORDS.find(w => getMeaning(w, targetLanguage) === option);
                      const isHidden = hiddenOptions.includes(optionWord?.id ?? -1);
                      if (isHidden) return null;

                      const isSelected = selectedAnswer === option;
                      const isCorrectAnswer = option === getMeaning(currentWord, targetLanguage);
                      const showResult = selectedAnswer !== null;

                      let btnClass = "bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300";
                      if (showResult && isCorrectAnswer) btnClass = "bg-blue-600 text-white motion-safe:scale-105 shadow-xl";
                      if (showResult && isSelected && !isCorrect) btnClass = "bg-rose-100 text-rose-500 opacity-50";

                      return (
                        <button
                          key={i}
                          onClick={() => handleClassicAnswer(option)}
                          disabled={selectedAnswer !== null}
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${btnClass}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Mode — matches real MatchingModeGame: 2/3-col
                  grid of fixed-height cards, blue-600 + ring on selected,
                  matched cards disappear (not opacity-fade). */}
              {selectedMode === "matching" && (
                <div className="max-w-2xl mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-3">
                    {matchingCards.filter(c => !c.matched).map((card) => (
                      <button
                        key={card.id}
                        onClick={() => handleMatchingSelect(card.id)}
                        disabled={card.matched}
                        dir="auto"
                        style={{ touchAction: 'manipulation' }}
                        className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm font-black text-lg sm:text-2xl h-20 sm:h-32 flex items-center justify-center transition-all duration-200 ${
                          card.selected
                            ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                            : "bg-white text-stone-800 hover:shadow-md"
                        }`}
                      >
                        {card.content}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-center text-xs font-bold text-stone-400 uppercase tracking-widest">
                    {t.matched} {matchedPairs} / 4
                  </div>
                </div>
              )}

              {/* Spelling Mode — matches real SpellingGame: stone-prompt
                  + big feedback-bordered input + stone-900 check button. */}
              {selectedMode === "spelling" && (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl sm:rounded-[32px] p-6 sm:p-8 mb-4 sm:mb-6 text-center shadow-sm border border-stone-200">
                    <p className="text-stone-400 text-xs font-black uppercase tracking-widest mb-2">{t.translation}</p>
                    <div className="text-3xl sm:text-4xl font-black text-stone-900 mb-3" dir="auto">
                      {getMeaning(currentWord, targetLanguage)}
                    </div>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-2.5 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={20} className="text-stone-600" />
                    </button>
                  </div>

                  {/* Power-ups for spelling */}
                  {powerUps.reveal_letter > 0 && !selectedAnswer && spellingInput.length === 0 && (
                    <div className="flex justify-center mb-3">
                      <button onClick={handleRevealLetter} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1 border border-emerald-200">
                        💡 {t.hint} <span className="bg-emerald-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.reveal_letter}</span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSpellingSubmit}>
                    <input
                      autoFocus
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="Type in English..."
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 sm:p-6 text-base sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
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
                        style={{ touchAction: 'manipulation' }}
                        className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Check Answer
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* Scramble Mode — same visual language as Spelling. */}
              {selectedMode === "scramble" && (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl sm:rounded-[32px] p-6 sm:p-8 mb-4 sm:mb-6 text-center shadow-sm border border-stone-200">
                    <p className="text-stone-400 text-xs font-black uppercase tracking-widest mb-2">{t.unscramble}</p>
                    <div className="text-3xl sm:text-5xl font-black text-stone-900 tracking-widest mb-2" dir="ltr">
                      {scrambledWord.toUpperCase()}
                    </div>
                    <div className="mt-4 text-sm sm:text-base text-stone-600 font-bold">
                      <span className="text-stone-400 text-xs uppercase tracking-widest block mb-1">{t.translation}</span>
                      <span className="text-stone-900 text-lg sm:text-xl" dir="auto">{getMeaning(currentWord, targetLanguage)}</span>
                    </div>
                  </div>

                  <form onSubmit={handleScrambleSubmit}>
                    <input
                      autoFocus
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="Type in English..."
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 sm:p-6 text-base sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
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
                        style={{ touchAction: 'manipulation' }}
                        className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Check Answer
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* True/False Mode — matches real app's TrueFalseGame.
                  Emerald + rose gradient buttons, big 3xl font, same
                  stone-gradient prompt card. */}
              {selectedMode === "truefalse" && tfStatement && (
                <div className="max-w-lg mx-auto">
                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-6 sm:p-10 rounded-3xl mb-4 sm:mb-6 shadow-sm border border-stone-200 text-center">
                    <div className="text-2xl sm:text-4xl font-black text-stone-900 mb-2" dir="ltr">
                      {tfStatement.word.english}
                    </div>
                    <div className="text-stone-400 text-sm mb-3 font-black">=</div>
                    <p className="text-2xl sm:text-4xl font-black text-stone-800" dir="auto">
                      {tfStatement.shownMeaning}
                    </p>
                    <button
                      onClick={() => speakWord(tfStatement.word.id)}
                      className="mt-5 p-2.5 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={20} className="text-stone-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleTFAnswer(true)}
                      disabled={selectedAnswer !== null}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '64px' }}
                      className="py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      True ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTFAnswer(false)}
                      disabled={selectedAnswer !== null}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '64px' }}
                      className="py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-black bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      False ✗
                    </button>
                  </div>
                </div>
              )}

              {/* Flashcards Mode — matches real FlashcardsGame: stone
                  flip button, rose "Still Learning" + blue "Got It"
                  judgement buttons after flip. */}
              {selectedMode === "flashcards" && (
                <div className="max-w-md mx-auto">
                  {/* Hero card with the word/translation */}
                  <div className="bg-white rounded-2xl sm:rounded-[32px] p-6 sm:p-10 shadow-2xl border border-stone-100 min-h-[250px] flex flex-col items-center justify-center text-center mb-4 sm:mb-6">
                    {!isFlipped ? (
                      <>
                        <p className="text-stone-400 text-xs font-black uppercase tracking-widest mb-2">{t.flashcardWord}</p>
                        <div className="text-3xl sm:text-5xl font-black text-stone-900 mb-4" dir="ltr">
                          {currentWord.english}
                        </div>
                        <button
                          onClick={() => speakWord(currentWord.id)}
                          className="p-2.5 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                          aria-label="Play pronunciation"
                        >
                          <Volume2 size={20} className="text-stone-600" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-stone-400 text-xs font-black uppercase tracking-widest mb-2">{t.flashcardMeaning}</p>
                        <div className="text-3xl sm:text-5xl font-black text-stone-900" dir="auto">
                          {getMeaning(currentWord, targetLanguage)}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      style={{ touchAction: 'manipulation' }}
                      className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                    >
                      {isFlipped ? "Show English" : "Show Translation"}
                    </button>
                    {isFlipped && selectedAnswer === null && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <button
                          onClick={() => { setIsCorrect(false); handleFeedback(false); setSelectedAnswer("unknown"); }}
                          style={{ touchAction: 'manipulation', minHeight: '56px' }}
                          className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        >Still Learning</button>
                        <button
                          onClick={() => { setIsCorrect(true); handleFeedback(true); setSelectedAnswer("known"); }}
                          style={{ touchAction: 'manipulation', minHeight: '56px' }}
                          className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >Got It!</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reverse Mode (translate from Hebrew/Arabic to English) */}
              {selectedMode === "reverse" && (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl sm:rounded-[32px] p-6 sm:p-8 mb-4 sm:mb-6 text-center shadow-sm border border-stone-200">
                    <p className="text-stone-400 text-xs font-black uppercase tracking-widest mb-2">{t.reverseTitle}</p>
                    <div className="text-3xl sm:text-4xl font-black text-stone-900 mb-3" dir="auto">
                      {getMeaning(currentWord, targetLanguage)}
                    </div>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="p-2.5 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 size={20} className="text-stone-600" />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); if (spellingInput.trim()) handleReverseAnswer(spellingInput); }}>
                    <input
                      autoFocus
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="Type in English..."
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3 sm:p-6 text-base sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
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
                        style={{ touchAction: 'manipulation' }}
                        className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Check Answer
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* Letter Sounds Mode — matches real LetterSoundsGame:
                  translation hint at top, bordered color-tinted letter
                  tiles that fade in, input form appears once all revealed. */}
              {selectedMode === "lettersounds" && (
                <div className="max-w-lg mx-auto">
                  <p className="text-stone-600 text-lg sm:text-xl font-bold mb-4 text-center" dir="auto">
                    {getMeaning(currentWord, targetLanguage)}
                  </p>
                  <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6">
                    <div className="flex justify-center gap-1 sm:gap-2 flex-wrap" dir="ltr">
                      {currentWord.english.split("").map((letter, i) => {
                        const revealed = i < revealedLetters;
                        const color = LETTER_COLORS[i % LETTER_COLORS.length];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: revealed ? 1 : 0.15, scale: revealed ? 1 : 0.5 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-9 h-11 sm:w-12 sm:h-14 rounded-xl font-black text-base sm:text-2xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0"
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

                  {revealedLetters >= currentWord.english.length ? (
                    <form onSubmit={(e) => { e.preventDefault(); if (spellingInput.trim()) handleReverseAnswer(spellingInput); }} className="max-w-sm mx-auto">
                      <input
                        autoFocus
                        type="text"
                        value={spellingInput}
                        onChange={(e) => setSpellingInput(e.target.value)}
                        placeholder="Type the word..."
                        disabled={selectedAnswer !== null}
                        className={`w-full p-3 text-xl font-black text-center border-4 rounded-2xl mb-3 transition-all ${
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
                          style={{ touchAction: 'manipulation' }}
                          className="w-full py-3 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Check Answer
                        </button>
                      )}
                    </form>
                  ) : selectedAnswer === null ? (
                    <div className="text-center">
                      <button
                        onClick={() => { setRevealedLetters(0); }}
                        style={{ touchAction: 'manipulation' }}
                        className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors inline-flex items-center gap-2"
                      >
                        🔊 Replay Sounds
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Sentence Builder — matches real SentenceBuilderGame:
                  stone bg for target area, blue-600 chips for built
                  words, white bordered chips for available words,
                  stone-900 Check button. */}
              {selectedMode === "sentence" && (
                <div className="max-w-xl mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <p className="text-stone-400 text-xs font-black uppercase tracking-widest">
                      Build: "{currentWord.english} is great!"
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

                  {/* Built sentence area */}
                  <div className={`min-h-[60px] border-4 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center transition-colors ${
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
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
                        >{word}</button>
                      ))
                    )}
                  </div>

                  {/* Available words */}
                  <div className="flex flex-wrap gap-2 mb-4 justify-center" dir="ltr">
                    {availableWords.map((word, i) => (
                      <button
                        key={`${word}-${i}`}
                        onClick={() => {
                          if (sentenceFeedback !== null) return;
                          setAvailableWords(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
                          setBuiltSentence(prev => [...prev, word]);
                        }}
                        className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-blue-400 hover:text-blue-700 active:scale-95 transition-all"
                      >{word}</button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setBuiltSentence([]);
                        const target = `${currentWord.english} is great!`.split(" ").filter(Boolean);
                        setAvailableWords([...target].sort(() => Math.random() - 0.5));
                      }}
                      disabled={sentenceFeedback !== null}
                      style={{ touchAction: 'manipulation' }}
                      className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >Clear</button>
                    <button
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
                      style={{ touchAction: 'manipulation' }}
                      className="flex-1 py-2 px-6 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                    >Check ✓</button>
                  </div>
                </div>
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
                        {t.theAnswerIs} <strong dir="ltr">{currentWord.english}</strong> = {getMeaning(currentWord, targetLanguage)}
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
              className="text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-black font-headline text-stone-900 mb-2">
                {t.greatJob}
              </h1>
              <p className="text-stone-600 mb-6">
                {t.completedDemo}
              </p>

              {/* XP Title */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown size={24} className={xpTitle.color} />
                  <span className="font-black text-xl" style={{ color: xpTitle.color }}>{xpTitle.title}</span>
                </div>
                <p className="text-sm text-stone-600">{xp} XP • {score} {t.correctAns}</p>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-stone-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-black text-blue-600">{score}/{DEMO_WORDS.length}</div>
                    <div className="text-sm text-stone-500">{t.correctAns}</div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-amber-500">{xp}</div>
                    <div className="text-sm text-stone-500">{t.xpEarned}</div>
                  </div>
                  <div>
                    <div className="text-3xl">{avatar}</div>
                    <div className="text-sm text-stone-500">{t.yourAvatar}</div>
                  </div>
                </div>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="bg-white rounded-3xl p-4 mb-6 shadow-sm border border-stone-200">
                  <p className="text-xs font-black text-stone-400 uppercase mb-3 tracking-widest">{t.badgesEarned}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {badges.map((badge) => (
                      <span key={badge} className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                        <Trophy size={14} />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary card — recaps what the student just experienced
                  and teases the full feature set without a sign-up CTA. */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-6 mb-6 shadow-xl shadow-violet-500/20">
                <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-yellow-300/25 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift size={20} />
                    <h3 className="text-xl font-black">{t.wantMore}</h3>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {t.unlockFeatures}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetDemo}
                  className={`flex-1 bg-stone-100 text-stone-800 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <RefreshCw size={18} />
                  {t.playAgain}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-stone-100 text-stone-800 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                >
                  {t.closeDemo}
                </button>
              </div>
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
                  {Object.entries(AVATAR_CATEGORIES).map(([category, { emoji, unlockXP }]) => {
                    const isUnlocked = xp >= unlockXP;
                    return (
                      <div key={category} className={`bg-white rounded-3xl p-4 shadow-md border-2 ${isUnlocked ? 'border-green-300' : 'border-stone-200'} ${isRTL ? 'text-right' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-stone-800">{category}</h3>
                          {isUnlocked ? (
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                              <Check size={14} /> UNLOCKED
                            </span>
                          ) : (
                            <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full font-bold">
                              🔒 {unlockXP} XP
                            </span>
                          )}
                        </div>

                        {isUnlocked ? (
                          <div className="grid grid-cols-6 gap-2">
                            {emoji.map((e) => (
                              <button
                                key={e}
                                onClick={() => { setAvatar(e); setView("game-select"); }}
                                className={`text-2xl p-2 rounded-xl text-center transition-all hover:scale-110 ${avatar === e ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-stone-100 hover:bg-stone-200'}`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-6 gap-2 opacity-50">
                              {emoji.slice(0, 6).map((e) => (
                                <div key={e} className="text-2xl p-2 bg-stone-100 rounded-xl text-center">{e}</div>
                              ))}
                              {emoji.length > 6 && (
                                <div className="col-span-6 flex items-center justify-center text-xs text-stone-500">
                                  +{emoji.length - 6} more
                                </div>
                              )}
                            </div>
                            <div className="w-full py-2 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-stone-200">
                              <ShoppingBag size={16} />
                              Unlocks by earning XP in the full version
                            </div>
                          </div>
                        )}
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
