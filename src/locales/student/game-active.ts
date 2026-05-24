/**
 * game-active.ts — i18n strings for the in-game UI surface.
 *
 * Covers strings that appear DURING gameplay across multiple game-mode
 * components.  Per-game-mode lessons (instructions, walkthrough text)
 * live in mode-intro.ts; this file is the actual button labels and
 * input placeholders the student sees while answering questions.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface GameActiveStrings {
  /** "Word 3 of 10" progress label below the answer card.
   *  Receives index + total at call site (e.g. `t.wordOfTotal(3, 10)`). */
  wordOfTotal: (index: number, total: number) => string;
  /** Dismiss button aria-label on the save-error toast. */
  dismissError: string;

  // SpellingGame + LetterSoundsGame
  typeInEnglish: string;
  typeTheWord: string;
  checkAnswer: string;
  /** "Translation:" label inline above the target-language word in
   *  Spelling mode. Includes trailing punctuation. */
  translationLabel: string;
  /** Pedagogical hint shown when the student typed every letter
   *  correctly but ran a multi-word phrase together (e.g. "allover"
   *  for "all over"). Helps them learn it's a phrase, not one word. */
  missingSpaceHint: string;

  // FlashcardsGame
  stillLearning: string;
  gotIt: string;
  showEnglish: string;
  showTranslation: string;

  // SentenceBuilderGame
  clear: string;
  /** Trailing space for the ✓ glyph already kept inside the constant. */
  checkSentence: string;

  // TrueFalseGame
  /** Question label shown above the candidate translation card. */
  isThisTrue: string;
  trueLabel: string;
  falseLabel: string;
  /** Hint shown below the buttons telling students they can swipe. */
  swipeHint: string;

  // GameView chrome (added Phase 1 i18n)
  exit: string;
  playPronunciation: string;
  trueWithMark: string;
  falseWithMark: string;
  noSentencesAdded: string;
  askTeacherToAddSentences: string;
  sentenceCounter: (index: number, total: number) => string;
  listenToSentence: string;
  tapWordsToBuild: string;
  waitingForPlayers: string;

  // ShowAnswerFeedback (the amber pulse shown after 3 failed attempts).
  correctAnswerIs: string;

  // LiveLeaderboardWidget heading.
  liveRank: string;

  // LazyWrapper loading messages used across GameRoutes — every
  // student waiting for a code-split chunk sees one of these.
  loadingGame: string;
  loadingResults: string;
  loadingGameModes: string;
  loadingHebrewModes: string;
  loadingGeneric: string;

  // PowerUpToolbar button labels + aria descriptions.  Emoji stays
  // outside the translation (the icon is universal) — only the text
  // part is localized.
  powerUpSkip: string;
  powerUpHint: string;
  powerUpFiftyFifty: string;
  powerUpSkipAria: string;
  powerUpHintAria: string;
  powerUpFiftyFiftyAria: string;

  /** Translated mode-label pill text shown at the top of every themed
   *  game.  Falls back to the gameMode id raw if a label isn't yet
   *  defined.  English-default labels under HE/AR look out of place
   *  visually because the surrounding chrome flips to RTL. */
  modeLabels: Record<string, string>;
}

export const gameActiveT: Record<Language, GameActiveStrings> = {
  en: {
    wordOfTotal: (i, n) => `Word ${i} of ${n}`,
    dismissError: "Dismiss error message",
    typeInEnglish: "Type in English...",
    typeTheWord: "Type the word...",
    checkAnswer: "Check Answer",
    translationLabel: "Translation:",
    missingSpaceHint: "💡 Almost! Don't forget the space — it's more than one word.",
    stillLearning: "Still Learning",
    gotIt: "Got It!",
    showEnglish: "Show English",
    showTranslation: "Show Translation",
    clear: "Clear",
    checkSentence: "Check ✓",
    isThisTrue: "Is this the right translation?",
    trueLabel: "True",
    falseLabel: "False",
    swipeHint: "Swipe right for True, left for False",
    exit: "Exit",
    playPronunciation: "Play pronunciation",
    trueWithMark: "True ✓",
    falseWithMark: "False ✗",
    noSentencesAdded: "No sentences were added to this assignment.",
    askTeacherToAddSentences: "Ask your teacher to add sentences.",
    sentenceCounter: (i, n) => `Sentence ${i} / ${n}`,
    listenToSentence: "Listen to sentence",
    tapWordsToBuild: "Tap words below to build the sentence",
    waitingForPlayers: "Waiting for players...",
    correctAnswerIs: "The correct answer is:",
    liveRank: "Live Rank",
    loadingGame: "Loading game...",
    loadingResults: "Loading results...",
    loadingGameModes: "Loading game modes...",
    loadingHebrewModes: "Loading Hebrew modes...",
    loadingGeneric: "Loading...",
    powerUpSkip: "Skip",
    powerUpHint: "Hint",
    powerUpFiftyFifty: "50/50",
    powerUpSkipAria: "Skip this question",
    powerUpHintAria: "Reveal the first letter",
    powerUpFiftyFiftyAria: "Remove two wrong answers",
    modeLabels: {
      classic: "Classic",
      listening: "Listening",
      reverse: "Reverse",
      spelling: "Spelling",
      matching: "Matching",
      "memory-flip": "Memory Flip",
      "true-false": "True / False",
      flashcards: "Flashcards",
      scramble: "Scramble",
      "letter-sounds": "Letter Sounds",
      "sentence-builder": "Sentence Builder",
      "fill-blank": "Fill in the Blank",
      idiom: "Idiom",
      "speed-round": "Speed Round",
    },
  },
  he: {
    wordOfTotal: (i, n) => `מילה ${i} מתוך ${n}`,
    dismissError: "סגור הודעת שגיאה",
    typeInEnglish: "הקלד באנגלית...",
    typeTheWord: "הקלד את המילה...",
    checkAnswer: "בדוק תשובה",
    translationLabel: "תרגום:",
    missingSpaceHint: "💡 כמעט! אל תשכחו את הרווח — זה יותר ממילה אחת.",
    stillLearning: "עדיין לומד",
    gotIt: "הבנתי!",
    showEnglish: "הצג באנגלית",
    showTranslation: "הצג תרגום",
    clear: "נקה",
    checkSentence: "בדוק ✓",
    isThisTrue: "האם זה התרגום הנכון?",
    trueLabel: "נכון",
    falseLabel: "לא נכון",
    swipeHint: "החליקו ימינה לנכון, שמאלה לא נכון",
    exit: "יציאה",
    playPronunciation: "השמע הגייה",
    trueWithMark: "נכון ✓",
    falseWithMark: "לא נכון ✗",
    noSentencesAdded: "לא נוספו משפטים למטלה הזו.",
    askTeacherToAddSentences: "בקשו מהמורה להוסיף משפטים.",
    sentenceCounter: (i, n) => `משפט ${i} / ${n}`,
    listenToSentence: "האזן למשפט",
    tapWordsToBuild: "הקישו על המילים למטה כדי לבנות את המשפט",
    waitingForPlayers: "מחכים לשחקנים...",
    correctAnswerIs: "התשובה הנכונה היא:",
    liveRank: "דירוג חי",
    loadingGame: "טוען משחק...",
    loadingResults: "טוען תוצאות...",
    loadingGameModes: "טוען מצבי משחק...",
    loadingHebrewModes: "טוען מצבים בעברית...",
    loadingGeneric: "טוען...",
    powerUpSkip: "דלג",
    powerUpHint: "רמז",
    powerUpFiftyFifty: "50/50",
    powerUpSkipAria: "דלג על השאלה הזו",
    powerUpHintAria: "חשוף את האות הראשונה",
    powerUpFiftyFiftyAria: "הסר שתי תשובות שגויות",
    modeLabels: {
      classic: "קלאסי",
      listening: "האזנה",
      reverse: "הפוך",
      spelling: "איות",
      matching: "התאמה",
      "memory-flip": "זיכרון",
      "true-false": "נכון / לא נכון",
      flashcards: "כרטיסיות",
      scramble: "ערבוב אותיות",
      "letter-sounds": "צלילי אותיות",
      "sentence-builder": "בניית משפט",
      "fill-blank": "השלם את החסר",
      idiom: "ביטוי",
      "speed-round": "סבב מהירות",
    },
  },
  ar: {
    wordOfTotal: (i, n) => `الكلمة ${i} من ${n}`,
    dismissError: "إغلاق رسالة الخطأ",
    typeInEnglish: "اكتب بالإنجليزية...",
    typeTheWord: "اكتب الكلمة...",
    checkAnswer: "تحقق من الإجابة",
    translationLabel: "الترجمة:",
    missingSpaceHint: "💡 تقريبًا! لا تنسَ المسافة — إنها أكثر من كلمة واحدة.",
    stillLearning: "ما زلت أتعلم",
    gotIt: "فهمت!",
    showEnglish: "إظهار بالإنجليزية",
    showTranslation: "إظهار الترجمة",
    clear: "مسح",
    checkSentence: "تحقق ✓",
    isThisTrue: "هل هذه الترجمة الصحيحة؟",
    trueLabel: "صحيح",
    falseLabel: "خطأ",
    swipeHint: "اسحب يمينًا لصحيح، يسارًا لخطأ",
    exit: "خروج",
    playPronunciation: "تشغيل النطق",
    trueWithMark: "صحيح ✓",
    falseWithMark: "خطأ ✗",
    noSentencesAdded: "لم تُضف جمل إلى هذه المهمة.",
    askTeacherToAddSentences: "اطلب من معلمك إضافة جمل.",
    sentenceCounter: (i, n) => `الجملة ${i} / ${n}`,
    listenToSentence: "استمع إلى الجملة",
    tapWordsToBuild: "اضغط على الكلمات في الأسفل لتكوين الجملة",
    waitingForPlayers: "في انتظار اللاعبين...",
    correctAnswerIs: "الإجابة الصحيحة هي:",
    liveRank: "الترتيب المباشر",
    loadingGame: "جارٍ تحميل اللعبة...",
    loadingResults: "جارٍ تحميل النتائج...",
    loadingGameModes: "جارٍ تحميل أوضاع اللعب...",
    loadingHebrewModes: "جارٍ تحميل الأوضاع العبرية...",
    loadingGeneric: "جارٍ التحميل...",
    powerUpSkip: "تخطَّ",
    powerUpHint: "تلميح",
    powerUpFiftyFifty: "50/50",
    powerUpSkipAria: "تخطَّ هذا السؤال",
    powerUpHintAria: "اكشف الحرف الأول",
    powerUpFiftyFiftyAria: "احذف إجابتين خاطئتين",
    modeLabels: {
      classic: "كلاسيكي",
      listening: "استماع",
      reverse: "معكوس",
      spelling: "إملاء",
      matching: "مطابقة",
      "memory-flip": "ذاكرة",
      "true-false": "صحيح / خطأ",
      flashcards: "بطاقات",
      scramble: "خلط الحروف",
      "letter-sounds": "أصوات الحروف",
      "sentence-builder": "بناء جملة",
      "fill-blank": "املأ الفراغ",
      idiom: "تعبير",
      "speed-round": "جولة سريعة",
    },
  },
  ru: {
    wordOfTotal: (i, n) => `Word ${i} of ${n}`,
    dismissError: "Dismiss error message",
    typeInEnglish: "Type in English...",
    typeTheWord: "Type the word...",
    checkAnswer: "Check Answer",
    translationLabel: "Translation:",
    missingSpaceHint: "💡 Almost! Don't forget the space — it's more than one word.",
    stillLearning: "Still Learning",
    gotIt: "Got It!",
    showEnglish: "Show English",
    showTranslation: "Show Translation",
    clear: "Clear",
    checkSentence: "Check ✓",
    isThisTrue: "Is this the right translation?",
    trueLabel: "True",
    falseLabel: "False",
    swipeHint: "Swipe right for True, left for False",
    exit: "Exit",
    playPronunciation: "Play pronunciation",
    trueWithMark: "True ✓",
    falseWithMark: "False ✗",
    noSentencesAdded: "No sentences were added to this assignment.",
    askTeacherToAddSentences: "Ask your teacher to add sentences.",
    sentenceCounter: (i, n) => `Sentence ${i} / ${n}`,
    listenToSentence: "Listen to sentence",
    tapWordsToBuild: "Tap words below to build the sentence",
    waitingForPlayers: "Waiting for players...",
    correctAnswerIs: "The correct answer is:",
    liveRank: "Live Rank",
    loadingGame: "Loading game...",
    loadingResults: "Loading results...",
    loadingGameModes: "Loading game modes...",
    loadingHebrewModes: "Loading Hebrew modes...",
    loadingGeneric: "Loading...",
    powerUpSkip: "Skip",
    powerUpHint: "Hint",
    powerUpFiftyFifty: "50/50",
    powerUpSkipAria: "Skip this question",
    powerUpHintAria: "Reveal the first letter",
    powerUpFiftyFiftyAria: "Remove two wrong answers",
    modeLabels: {
      classic: "Classic",
      listening: "Listening",
      reverse: "Reverse",
      spelling: "Spelling",
      matching: "Matching",
      "memory-flip": "Memory Flip",
      "true-false": "True / False",
      flashcards: "Flashcards",
      scramble: "Scramble",
      "letter-sounds": "Letter Sounds",
      "sentence-builder": "Sentence Builder",
      "fill-blank": "Fill in the Blank",
      idiom: "Idiom",
      "speed-round": "Speed Round",
    },
  },
};
