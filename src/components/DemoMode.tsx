import React, { useState, useEffect, useCallback } from "react";
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
  XCircle,
  Shuffle,
  Lightbulb,
  ShoppingBag,
  Trophy,
  TrendingUp,
  Crown,
  Target
} from "lucide-react";
import { Word } from "../vocabulary";
import { useAudio } from "../hooks/useAudio";
import { useLanguage, Language } from "../hooks/useLanguage";

interface DemoModeProps {
  onClose: () => void;
  onSignUp: () => void;
}

type DemoView = "welcome" | "avatar" | "game-select" | "game" | "results" | "shop";
type ShopTab = "avatars" | "titles" | "powerups" | "premium";

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

// Demo words - curated selection
const DEMO_WORDS: Word[] = [
  { id: 21, english: "adventure", hebrew: "הַרפַּתקָה", arabic: "مغامرة", level: "Band 1", pos: "n" },
  { id: 38, english: "amazing", hebrew: "מדהים", arabic: "مدهش", level: "Band 1", pos: "adj" },
  { id: 127, english: "brave", hebrew: "אַמִיץ", arabic: "شجاع", level: "Band 1", pos: "adj" },
  { id: 175, english: "champion", hebrew: "אַלוּף", arabic: "بطل", level: "Band 1", pos: "n" },
  { id: 282, english: "dream", hebrew: "חֲלוֹם", arabic: "حلم", level: "Band 1", pos: "n" },
  { id: 367, english: "freedom", hebrew: "חוֹפֶשׁ", arabic: "حرية", level: "Band 1", pos: "n" },
  { id: 434, english: "hero", hebrew: "גיבור", arabic: "بطل", level: "Band 1", pos: "n" },
  { id: 580, english: "magic", hebrew: "קֶסֶם", arabic: "سحر", level: "Band 1", pos: "n" },
  { id: 339, english: "fantastic", hebrew: "פַנטַסטִי", arabic: "رائع", level: "Band 1", pos: "adj" },
  { id: 1924, english: "success", hebrew: "הַצלָחָה", arabic: "نجاح", level: "Band 2", pos: "n" },
];

// Translations
const demoTranslations: Record<Language, Record<string, string>> = {
  en: {
    demoMode: "Demo Mode — Sign up for full access!",
    signUpFree: "Sign Up Free",
    welcomeTitle: "Welcome to Vocaband!",
    welcomeDesc: "Try our vocabulary games with sample words from Band 1",
    experienceTitle: "What you'll experience:",
    sampleWords: "10 sample vocabulary words",
    gameModes: "10 game modes",
    xpStreak: "XP & streak system",
    achievements: "Achievements & rewards",
    shopPreview: "In-app shop preview",
    letsGo: "Let's Go!",
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
    wantMore: "Want more?",
    unlockFeatures: "Sign up to unlock 1000+ words, 10 game modes, avatars, and more!",
    playAgain: "Play Again",
    closeDemo: "Close Demo",
    signFree: "Sign Up for Free",
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
    demoMode: "מצב הדגמה — הירשמו לגישה מלאה!",
    signUpFree: "הרשמה חינם",
    welcomeTitle: "ברוכים הבאים ל-Vocaband!",
    welcomeDesc: "נסו את משחקי האוצר מילים עם מילים לדוגמה מ-Band 1",
    experienceTitle: "מה תחוו:",
    sampleWords: "10 מילים לדוגמה",
    gameModes: "10 מצבי משחק",
    xpStreak: "מערכת XP ורצפים",
    achievements: "הישגים ופרסים",
    shopPreview: "תצוגה מקדימה של החנות",
    letsGo: "בואו נתחיל!",
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
    wantMore: "רוצים עוד?",
    unlockFeatures: "הירשמו לגישה ל-1000+ מילים, 10 מצבי משחק, אווטרים ועוד!",
    playAgain: "שחקו שוב",
    closeDemo: "סגור הדגמה",
    signFree: "הירשמו בחינם",
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
    demoMode: "وضع تجريبي — سجل للوصول الكامل!",
    signUpFree: "سجل مجاناً",
    welcomeTitle: "مرحباً بك في Vocaband!",
    welcomeDesc: "جرب ألعاب المفردات مع كلمات نموذجية من Band 1",
    experienceTitle: "ما ستجربه:",
    sampleWords: "10 كلمات نموذجية",
    gameModes: "10 أوضاع لعب",
    xpStreak: "نظام XP والتتابعات",
    achievements: "الإنجازات والمكافآت",
    shopPreview: "معاينة متجر التطبيق",
    letsGo: "هيا نبدأ!",
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
    wantMore: "تريد المزيد؟",
    unlockFeatures: "سجل للوصول إلى 1000+ كلمة، 10 أوضاع لعب، صور رمزية والمزيد!",
    playAgain: "العب مرة أخرى",
    closeDemo: "إغلاق العرض",
    signFree: "سجل مجاناً",
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

const GAME_MODES: Record<Language, { id: string; name: string; emoji: string; desc: string }[]> = {
  en: [
    { id: "classic", name: "Classic", emoji: "📝", desc: "Pick the right meaning" },
    { id: "listening", name: "Listening", emoji: "🎧", desc: "Hear and identify" },
    { id: "spelling", name: "Spelling", emoji: "✍️", desc: "Type the word correctly" },
    { id: "matching", name: "Matching", emoji: "🔗", desc: "Match words to meanings" },
    { id: "truefalse", name: "True/False", emoji: "✓", desc: "Is it correct?" },
    { id: "flashcards", name: "Flashcards", emoji: "🎴", desc: "Flip and learn" },
    { id: "scramble", name: "Scramble", emoji: "🔤", desc: "Unscramble letters" },
    { id: "reverse", name: "Reverse", emoji: "🔄", desc: "Translate to English" },
    { id: "lettersounds", name: "Letter Sounds", emoji: "🔡", desc: "Sound it out" },
    { id: "sentence", name: "Sentence Builder", emoji: "🧩", desc: "Build sentences" },
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

const getMeaning = (word: Word, lang: Language): string => {
  return lang === 'ar' ? word.arabic : word.hebrew;
};

const getXPTitle = (xpAmount: number) => {
  return XP_TITLES.filter(t => xpAmount >= t.min).pop() ?? XP_TITLES[0];
};

const DemoMode: React.FC<DemoModeProps> = ({ onClose, onSignUp }) => {
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
  const [powerUps] = useState({ skip: 3, fifty_fifty: 3, reveal_letter: 3 });

  // Matching game state
  const [matchingCards, setMatchingCards] = useState<{ id: string; content: string; type: 'word' | 'meaning'; matched: boolean; selected: boolean }[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);

  // Spelling game state
  const [spellingInput, setSpellingInput] = useState("");

  // Scramble game state
  const [scrambledWord, setScrambledWord] = useState("");

  // True/False game state
  const [tfStatement, setTfStatement] = useState<{ word: Word; shownMeaning: string; isCorrect: boolean } | null>(null);

  // Flashcard state
  const [isFlipped, setIsFlipped] = useState(false);

  // Letter sounds state
  const [letterOptions, setLetterOptions] = useState<string[]>([]);
  const [revealedLetters, setRevealedLetters] = useState(0);
  const LETTER_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F59E0B","#6366F1"];

  // Sentence Builder state
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "incorrect" | null>(null);

  const { speak, playMotivational } = useAudio();

  // Get current word
  const currentWord = DEMO_WORDS[currentWordIndex];

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
    const correctMeaning = getMeaning(currentWord, language);
    const wrongOptions = DEMO_WORDS.filter(w => w.id !== currentWord.id)
      .map(w => getMeaning(w, language))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const allOptions = [...wrongOptions, correctMeaning].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const initMatchingGame = () => {
    const words = DEMO_WORDS.slice(0, 4);
    const cards: { id: string; content: string; type: 'word' | 'meaning'; matched: boolean; selected: boolean }[] = [];
    words.forEach((word, i) => {
      cards.push({ id: `w${i}`, content: word.english, type: 'word', matched: false, selected: false });
      cards.push({ id: `m${i}`, content: getMeaning(word, language), type: 'meaning', matched: false, selected: false });
    });
    setMatchingCards(cards.sort(() => Math.random() - 0.5));
    setMatchedPairs(0);
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
      shownMeaning: getMeaning(randomWord!, language),
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
    const correctMeaning = getMeaning(currentWord, language);
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
    } else if (selectedCards.length === 1) {
      const firstCard = selectedCards[0];
      if (firstCard.type === card.type) {
        setMatchingCards(prev => prev.map(c =>
          c.id === firstCard.id ? { ...c, selected: false } :
          c.id === cardId ? { ...c, selected: true } : c
        ));
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
  };

  const moveToNext = () => {
    if (currentWordIndex < DEMO_WORDS.length - 1) {
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
    } else {
      setView("results");
    }
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
      {/* Top Banner - More subtle */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 text-center font-bold text-sm flex items-center justify-center gap-2">
        <Sparkles size={14} />
        <span>{t.demoMode}</span>
        <button
          onClick={onSignUp}
          className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-black hover:scale-105 transition-transform shadow-md"
        >
          {t.signUpFree}
        </button>
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
          {/* Welcome Screen */}
          {view === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎮</div>
              <h1 className="text-3xl font-black font-headline text-stone-900 mb-2">
                {t.welcomeTitle}
              </h1>
              <p className="text-stone-600 mb-8">
                {t.welcomeDesc}
              </p>

              <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-stone-200">
                <h3 className={`font-bold text-stone-800 mb-4 ${textAlign}`}>{t.experienceTitle}</h3>
                <div className="space-y-3">
                  {[
                    { icon: "🎯", text: t.sampleWords },
                    { icon: "🎮", text: t.gameModes },
                    { icon: "⭐", text: t.xpStreak },
                    { icon: "🏆", text: t.achievements },
                    { icon: "🛍️", text: t.shopPreview },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      <span className="text-xl">{item.icon}</span>
                      <span className={`text-stone-600 ${textAlign}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setView("avatar")}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition-colors flex items-center justify-center gap-2"
              >
                {t.letsGo}
                {!isRTL && <ArrowRight size={20} />}
                {isRTL && <ArrowLeft size={20} />}
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
                className={`flex items-center gap-2 text-stone-500 mb-6 hover:text-blue-600 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                {t.back}
              </button>

              <h1 className="text-2xl font-black font-headline text-stone-900 mb-2 text-center">
                {t.chooseAvatar}
              </h1>
              <p className="text-stone-500 text-center mb-6">
                {t.pickEmoji}
              </p>

              {/* Avatar Categories - ONLY UNLOCKED */}
              <div className="space-y-4 mb-6">
                {Object.entries(AVATAR_CATEGORIES)
                  .filter(([_, { unlockXP }]) => xp >= unlockXP)
                  .map(([category, { emoji, unlockXP }]) => {
                    return (
                      <div key={category} className="rounded-2xl border-2 border-green-200 bg-green-50/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-green-100/50">
                          <div className="flex items-center gap-2">
                            <Check size={16} className="text-green-600" />
                            <span className="font-black text-sm text-green-800">{category}</span>
                            <span className="text-xs text-stone-400">({emoji.length} avatars)</span>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-800">
                            {unlockXP === 0 ? "Free" : "Unlocked!"}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-2 p-3">
                          {emoji.map((e) => (
                            <button
                              key={e}
                              onClick={() => setAvatar(e)}
                              className={`text-2xl sm:text-3xl p-2 rounded-xl transition-all ${
                                avatar === e
                                  ? "bg-blue-500 ring-2 ring-blue-300 scale-110"
                                  : "bg-white hover:bg-stone-100 border border-stone-200"
                              }`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* See More Avatars Button */}
              <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-3xl p-4 mb-6 border-2 border-pink-200">
                <h3 className="text-lg font-black mb-2 text-center">✨ More Avatars in Shop!</h3>
                <p className="text-sm text-stone-600 text-center mb-3">
                  Unlock 20+ more avatars by earning XP or sign up for the full version!
                </p>
                <button
                  onClick={() => setView("shop")}
                  className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-pink-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} />
                  Visit Shop
                </button>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-bold text-stone-600 mb-2 ${textAlign}`}>{t.yourName}</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.enterNickname}
                  className={`w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-stone-200 text-stone-900 focus:border-blue-500 focus:outline-none ${textAlign}`}
                  maxLength={15}
                />
              </div>

              {/* XP Title Display */}
              {xp > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6 border border-blue-200">
                  <div className="flex items-center justify-center gap-2">
                    <Crown size={20} className={xpTitle.color} />
                    <span className="font-black" style={{ color: xpTitle.color }}>{xpTitle.title}</span>
                  </div>
                  <p className="text-xs text-center text-stone-600 mt-1">{xp} XP</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setView("game-select")}
                  disabled={!displayName.trim()}
                  className="flex-1 bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {t.continue}
                  {!isRTL && <ArrowRight size={20} />}
                  {isRTL && <ArrowLeft size={20} />}
                </button>
                <button
                  onClick={() => setView("shop")}
                  className="flex-1 bg-pink-100 text-pink-700 py-4 rounded-2xl font-bold text-lg hover:bg-pink-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={20} />
                  {t.shop}
                </button>
              </div>
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

              <h1 className="text-2xl font-black font-headline text-stone-900 mb-2 text-center">
                {t.chooseGame}
              </h1>
              <p className="text-stone-500 text-center mb-6">
                {t.tryPopular}
              </p>

              {/* Power-ups display */}
              <div className="bg-amber-50 rounded-2xl p-3 mb-4 border border-amber-200">
                <p className="text-xs font-bold text-amber-800 mb-2 text-center">⚡ Power-ups (FREE in demo!)</p>
                <div className="flex justify-center gap-2">
                  {POWER_UPS.map((pu) => (
                    <div key={pu.id} className="bg-white px-2 py-1 rounded-lg text-center">
                      <span className="text-lg">{pu.emoji}</span>
                      <p className="text-xs font-bold text-stone-600">×{powerUps[pu.id as keyof typeof powerUps]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => startGame(mode.id)}
                    className={`w-full bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-stone-50 transition-colors border border-stone-200 group ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <span className="text-2xl">{mode.emoji}</span>
                    <div className={`flex-1 ${textAlign}`}>
                      <h3 className="font-bold text-stone-800">{mode.name}</h3>
                      <p className="text-sm text-stone-500">{mode.desc}</p>
                    </div>
                    {isRTL ?
                      <ArrowLeft className="text-stone-400 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all" size={20} /> :
                      <ArrowRight className="text-stone-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" size={20} />
                    }
                  </button>
                ))}
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
                  className={`bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl p-6 sm:p-12 text-center relative overflow-hidden transition-colors duration-300 ${isCorrect === true ? "bg-blue-50 border-4 border-blue-600" : isCorrect === false ? "bg-red-50 border-4 border-red-500" : "border-4 border-transparent"}`}
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
                      const optionWord = DEMO_WORDS.find(w => getMeaning(w, language) === option);
                      const isSelected = selectedAnswer === option;
                      const isHidden = hiddenOptions.includes(optionWord?.id ?? -1);
                      const isCorrectAnswer = option === getMeaning(currentWord, language);
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
                          className={`py-3 px-4 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold transition-all duration-300 ${btnClass}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Listening Mode */}
              {selectedMode === "listening" && (
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="bg-white rounded-3xl p-8 mb-6 text-center shadow-sm border border-stone-200">
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto hover:bg-blue-700 transition-colors"
                    >
                      <Volume2 size={32} />
                    </button>
                    <p className="text-sm text-stone-500 mt-4">{t.listenType}</p>
                  </div>

                  <p className="text-stone-600 mb-4 text-center">{t.whatDoesMean}</p>

                  <div className="space-y-2">
                    {options.map((option, i) => {
                      const optionWord = DEMO_WORDS.find(w => getMeaning(w, language) === option);
                      const isHidden = hiddenOptions.includes(optionWord?.id ?? -1);
                      if (isHidden) return null;

                      const isSelected = selectedAnswer === option;
                      const isCorrectAnswer = option === getMeaning(currentWord, language);
                      const showResult = selectedAnswer !== null;

                      let bgClass = "bg-white border-stone-200";
                      if (showResult && isCorrectAnswer) bgClass = "bg-green-100 border-green-500";
                      if (showResult && isSelected && !isCorrect) bgClass = "bg-red-100 border-red-500";

                      return (
                        <button
                          key={i}
                          onClick={() => handleClassicAnswer(option)}
                          disabled={selectedAnswer !== null}
                          className={`w-full p-4 rounded-2xl border-2 ${bgClass} transition-all ${textAlign} ${!showResult ? "hover:border-blue-300" : ""}`}
                        >
                          <span className="font-bold text-stone-800">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Mode */}
              {selectedMode === "matching" && (
                <div>
                  <p className="text-center text-stone-600 mb-4">
                    {t.tapTwoCards}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {matchingCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => handleMatchingSelect(card.id)}
                        disabled={card.matched}
                        className={`p-4 rounded-2xl text-center transition-all border-2 ${
                          card.matched
                            ? "bg-green-100 border-green-300 opacity-60"
                            : card.selected
                            ? "bg-blue-100 border-blue-500 ring-2 ring-blue-300"
                            : "bg-white border-stone-200 hover:border-blue-300"
                        }`}
                      >
                        <div className={`text-lg font-bold ${card.type === 'meaning' ? textAlign : ''}`} dir={card.type === 'word' ? 'ltr' : undefined}>
                          {card.content}
                        </div>
                        {card.matched && <span className="text-green-600">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className={`mt-4 text-center text-stone-500 ${isRTL ? 'flex items-center justify-center gap-1' : ''}`}>
                    {t.matched} {matchedPairs} / 4
                  </div>
                </div>
              )}

              {/* Spelling Mode */}
              {selectedMode === "spelling" && (
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="bg-white rounded-3xl p-8 mb-6 text-center shadow-sm border border-stone-200">
                    <div className="text-4xl font-black text-stone-900 mb-4">
                      {getMeaning(currentWord, language)}
                    </div>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto hover:bg-blue-700 transition-colors"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>

                  {/* Power-ups for spelling */}
                  {(selectedMode === "spelling" || selectedMode === "letter-sounds") && powerUps.reveal_letter > 0 && !selectedAnswer && spellingInput.length === 0 && (
                    <div className="flex justify-center mb-3">
                      <button onClick={handleRevealLetter} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200 transition-all flex items-center gap-1 border border-green-200">
                        💡 {t.hint} <span className="bg-green-200 px-1.5 py-0.5 rounded-md text-[10px]">×{powerUps.reveal_letter}</span>
                      </button>
                    </div>
                  )}

                  <p className="text-stone-600 mb-4 text-center">{t.typeWord}</p>

                  <form onSubmit={handleSpellingSubmit}>
                    <input
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder={t.typeWord}
                      disabled={selectedAnswer !== null}
                      className={`w-full px-4 py-4 rounded-2xl bg-white border-2 border-stone-200 text-xl text-center font-bold text-stone-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 ${textAlign}`}
                      dir="ltr"
                    />
                    {selectedAnswer === null && (
                      <button
                        type="submit"
                        disabled={!spellingInput.trim()}
                        className="w-full mt-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {t.check}
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* Scramble Mode */}
              {selectedMode === "scramble" && (
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="bg-white rounded-3xl p-8 mb-6 text-center shadow-sm border border-stone-200">
                    <div className="text-4xl font-black text-stone-900 mb-2 tracking-widest" dir="ltr">
                      {scrambledWord.toUpperCase()}
                    </div>
                    <p className="text-stone-500 text-sm">{t.unscramble}</p>
                    <div className="mt-4 text-xl text-stone-700 font-bold">
                      {t.translation} {getMeaning(currentWord, language)}
                    </div>
                  </div>

                  <form onSubmit={handleScrambleSubmit}>
                    <input
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder={t.typeWord}
                      disabled={selectedAnswer !== null}
                      className={`w-full px-4 py-4 rounded-2xl bg-white border-2 border-stone-200 text-xl text-center font-bold text-stone-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 ${textAlign}`}
                      dir="ltr"
                    />
                    {selectedAnswer === null && (
                      <button
                        type="submit"
                        disabled={!spellingInput.trim()}
                        className="w-full mt-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {t.check}
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* True/False Mode */}
              {selectedMode === "truefalse" && tfStatement && (
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="bg-white rounded-3xl p-8 mb-6 text-center shadow-sm border border-stone-200">
                    <div className="text-2xl font-black text-stone-900 mb-2" dir="ltr">
                      {tfStatement.word.english}
                    </div>
                    <div className="text-stone-500 text-sm mb-4">=</div>
                    <div className="text-2xl font-bold text-stone-800">
                      {tfStatement.shownMeaning}
                    </div>
                    <button
                      onClick={() => speakWord(tfStatement.word.id)}
                      className="mt-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto hover:bg-blue-700 transition-colors"
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>

                  <p className="text-stone-600 mb-4 text-center">{t.trueFalse}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleTFAnswer(true)}
                      disabled={selectedAnswer !== null}
                      className={`py-4 rounded-2xl font-bold text-lg transition-all border-2 ${
                        selectedAnswer === "true" && tfStatement.isCorrect
                          ? "bg-green-100 border-green-500 text-green-700"
                          : selectedAnswer === "true" && !tfStatement.isCorrect
                          ? "bg-red-100 border-red-500 text-red-700"
                          : selectedAnswer !== null && tfStatement.isCorrect
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-white border-stone-200 text-stone-800 hover:border-green-300"
                      }`}
                    >
                      ✓ {t.trueBtn}
                    </button>
                    <button
                      onClick={() => handleTFAnswer(false)}
                      disabled={selectedAnswer !== null}
                      className={`py-4 rounded-2xl font-bold text-lg transition-all border-2 ${
                        selectedAnswer === "false" && !tfStatement.isCorrect
                          ? "bg-green-100 border-green-500 text-green-700"
                          : selectedAnswer === "false" && tfStatement.isCorrect
                          ? "bg-red-100 border-red-500 text-red-700"
                          : selectedAnswer !== null && !tfStatement.isCorrect
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-white border-stone-200 text-stone-800 hover:border-red-300"
                      }`}
                    >
                      ✗ {t.falseBtn}
                    </button>
                  </div>
                </div>
              )}

              {/* Flashcards Mode */}
              {selectedMode === "flashcards" && (
                <div className="text-center">
                  <div
                    onClick={() => !isFlipped && setIsFlipped(true)}
                    className={`bg-white rounded-3xl p-8 shadow-sm border border-stone-200 cursor-pointer min-h-[250px] flex flex-col items-center justify-center ${isFlipped ? '' : 'hover:shadow-md transition-shadow'}`}
                  >
                    {!isFlipped ? (
                      <>
                        <div className="text-4xl font-black text-stone-900 mb-4" dir="ltr">
                          {currentWord.english}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); speakWord(currentWord.id); }}
                          className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                          <Volume2 size={24} />
                        </button>
                        <p className="text-stone-500 mt-4">{t.flashcardTap}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-stone-500 text-sm mb-2">{t.flashcardMeaning}</p>
                        <div className="text-3xl font-black text-stone-900">
                          {getMeaning(currentWord, language)}
                        </div>
                      </>
                    )}
                  </div>

                  {isFlipped && selectedAnswer === null && (
                    <div className="mt-6 space-y-3">
                      <button
                        onClick={() => { setIsCorrect(true); handleFeedback(true); setSelectedAnswer("known"); }}
                        className="w-full py-4 bg-green-100 text-green-700 rounded-2xl font-bold text-lg hover:bg-green-200 transition-colors"
                      >
                        ✓ {t.correct}
                      </button>
                      <button
                        onClick={() => { setIsCorrect(false); handleFeedback(false); setSelectedAnswer("unknown"); }}
                        className="w-full py-4 bg-red-100 text-red-700 rounded-2xl font-bold text-lg hover:bg-red-200 transition-colors"
                      >
                        ✗ {t.notQuite}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reverse Mode (translate from Hebrew/Arabic to English) */}
              {selectedMode === "reverse" && (
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="bg-white rounded-3xl p-8 mb-6 text-center shadow-sm border border-stone-200">
                    <p className="text-stone-500 text-sm mb-2">{t.reverseTitle}</p>
                    <div className="text-4xl font-black text-stone-900 mb-4">
                      {getMeaning(currentWord, language)}
                    </div>
                    <button
                      onClick={() => speakWord(currentWord.id)}
                      className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto hover:bg-blue-700 transition-colors"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); if (spellingInput.trim()) handleReverseAnswer(spellingInput); }}>
                    <input
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder={t.typeWord}
                      disabled={selectedAnswer !== null}
                      className="w-full px-4 py-4 rounded-2xl bg-white border-2 border-stone-200 text-xl text-center font-bold text-stone-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      dir="ltr"
                    />
                    {selectedAnswer === null && (
                      <button
                        type="submit"
                        disabled={!spellingInput.trim()}
                        className="w-full mt-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {t.check}
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* Letter Sounds Mode - Matching full app */}
              {selectedMode === "lettersounds" && (
                <div className="text-center">
                  <div className="bg-white rounded-3xl p-8 mb-6 shadow-sm border border-stone-200">
                    <p className="text-stone-600 mb-4">Listen to each letter sound</p>

                    {/* Letters revealed one by one with colors */}
                    <div className="flex justify-center gap-2 mb-6 flex-wrap" dir="ltr">
                      {currentWord.english.split("").map((letter, i) => {
                        const isRevealed = i < revealedLetters;
                        const color = LETTER_COLORS[i % LETTER_COLORS.length];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black ${
                              isRevealed ? "text-white shadow-lg" : "bg-stone-100 text-stone-300"
                            }`}
                            style={isRevealed ? { backgroundColor: color } : {}}
                          >
                            {letter.toUpperCase()}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* After all letters revealed, show input */}
                    {revealedLetters >= currentWord.english.length && (
                      <div className="mt-4">
                        <p className="text-stone-600 mb-3">Now type the word you heard!</p>
                        <form onSubmit={(e) => { e.preventDefault(); if (spellingInput.trim()) handleReverseAnswer(spellingInput); }}>
                          <input
                            type="text"
                            value={spellingInput}
                            onChange={(e) => setSpellingInput(e.target.value)}
                            placeholder="Type the word..."
                            disabled={selectedAnswer !== null}
                            className="w-full px-4 py-4 rounded-2xl bg-white border-2 border-stone-200 text-xl text-center font-bold text-stone-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                            dir="ltr"
                          />
                          {selectedAnswer === null && (
                            <button
                              type="submit"
                              disabled={!spellingInput.trim()}
                              className="w-full mt-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50"
                            >
                              {t.check}
                            </button>
                          )}
                        </form>
                      </div>
                    )}

                    {/* Replay button */}
                    {revealedLetters < currentWord.english.length && selectedAnswer === null && (
                      <button
                        onClick={() => {
                          setRevealedLetters(0);
                          // Trigger re-reveal by changing the key
                        }}
                        className="mt-4 px-6 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-colors"
                      >
                        🔊 Replay Sounds
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sentence Builder - simplified for demo */}
              {selectedMode === "sentence" && (
                <div className="text-center">
                  <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-stone-200">
                    <p className="text-sm text-stone-500 mb-2">Build this sentence:</p>
                    <p className="text-lg font-bold text-stone-800 mb-4" dir="ltr">
                      "{currentWord.english} is great!"
                    </p>

                    {/* Built sentence area */}
                    <div className="min-h-[80px] bg-blue-50 rounded-2xl p-4 mb-4 flex flex-wrap gap-2 justify-center items-center" dir="ltr">
                      {builtSentence.length === 0 ? (
                        <p className="text-stone-400 text-sm">Tap words below to build the sentence</p>
                      ) : (
                        builtSentence.map((word, i) => (
                          <button
                            key={`${word}-${i}`}
                            onClick={() => {
                              setBuiltSentence(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
                              setAvailableWords(prev => [...prev, word]);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-all"
                          >
                            {word}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Available words area */}
                    <div className="min-h-[80px] bg-stone-50 rounded-2xl p-4 flex flex-wrap gap-2 justify-center items-center" dir="ltr">
                      {availableWords.map((word, i) => (
                        <button
                          key={`${word}-${i}`}
                          onClick={() => {
                            setAvailableWords(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
                            setBuiltSentence(prev => [...prev, word]);
                          }}
                          className="px-4 py-2 bg-white text-stone-800 rounded-xl font-bold shadow-sm hover:bg-stone-100 border-2 border-stone-200 transition-all"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Check button */}
                  {builtSentence.length > 0 && sentenceFeedback === null && (
                    <button
                      onClick={() => {
                        const target = `${currentWord.english} is great!`;
                        const built = builtSentence.join(" ");
                        if (built.toLowerCase() === target.toLowerCase()) {
                          setSentenceFeedback("correct");
                          handleFeedback(true);
                          setTimeout(moveToNext, 2000);
                        } else {
                          setSentenceFeedback("incorrect");
                          setTimeout(() => setSentenceFeedback(null), 1500);
                        }
                      }}
                      className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-colors mb-3"
                    >
                      ✓ Check Sentence
                    </button>
                  )}

                  {/* Feedback */}
                  {sentenceFeedback === "correct" && (
                    <div className="bg-green-100 text-green-800 p-4 rounded-2xl mb-3">
                      <p className="font-bold">✓ Correct! Great job!</p>
                    </div>
                  )}
                  {sentenceFeedback === "incorrect" && (
                    <div className="bg-red-100 text-red-800 p-4 rounded-2xl mb-3">
                      <p className="font-bold">✗ Not quite. Try again!</p>
                      <p className="text-sm mt-1">Hint: "{currentWord.english} is great!"</p>
                    </div>
                  )}
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
                        {t.theAnswerIs} <strong dir="ltr">{currentWord.english}</strong> = {getMeaning(currentWord, language)}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={moveToNext}
                    className={`w-full mt-4 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {t.next}
                    {isRTL ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                  </button>
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

              {/* CTA */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 mb-6">
                <h3 className="text-xl font-black mb-2">{t.wantMore}</h3>
                <p className="text-sm opacity-90 mb-4">
                  {t.unlockFeatures}
                </p>
                <button
                  onClick={onSignUp}
                  className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Gift size={20} />
                  {t.signFree}
                </button>
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
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setView("game-select")}
                  className={`flex items-center gap-2 text-stone-500 hover:text-blue-600 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  {t.back}
                </button>
                <div className={`flex items-center gap-3 bg-stone-100 px-4 py-2 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-3xl">{avatar}</span>
                  <span className="font-bold text-stone-800">{displayName}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {xp} XP
                  </span>
                </div>
              </div>

              <h1 className="text-3xl font-black mb-6 text-center">🛍️ {t.shop}</h1>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setShopTab("avatars")}
                  className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${shopTab === "avatars" ? "bg-primary text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}
                >
                  🎭 {t.avatars}
                </button>
                <button
                  onClick={() => setShopTab("titles")}
                  className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${shopTab === "titles" ? "bg-primary text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}
                >
                  🏆 {t.xpTitle}
                </button>
                <button
                  onClick={() => setShopTab("powerups")}
                  className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${shopTab === "powerups" ? "bg-primary text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}
                >
                  ⚡ {t.powerups}
                </button>
                <button
                  onClick={() => setShopTab("premium")}
                  className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${shopTab === "premium" ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}
                >
                  {t.premium}
                </button>
              </div>

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
                            <button
                              onClick={onSignUp}
                              className="w-full py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:from-pink-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                            >
                              <ShoppingBag size={16} />
                              Sign Up to Unlock
                            </button>
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
                    <button
                      onClick={onSignUp}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={18} />
                      Sign Up to Unlock Premium Avatars
                    </button>
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
                            ×{powerUps.freeInDemo || 3}
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
                    <p className="text-stone-600 text-sm mb-4">
                      Sign up to access 100+ avatars, themes, power-ups, and more!
                    </p>
                    <button
                      onClick={onSignUp}
                      className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-pink-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={18} />
                      {t.signFree}
                    </button>
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
