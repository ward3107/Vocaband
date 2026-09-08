/**
 * game-arias.ts — shared aria-label strings used by many game-mode
 * components: "Replay audio", "Play pronunciation", "Listen to
 * sentence", "Submit word", etc.
 *
 * Pulled out so individual game files (SpeedRound, SentenceBuilder,
 * Scramble, Review, Relations, Flashcards, Idiom,
 * ClassShowQuestion, AdaptedModes) don't each redefine the same
 * inline EN/HE/AR map.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface GameAriasStrings {
  replayAudio: string;
  playPronunciation: string;
  playAudio: string;
  playSound: string;
  listenToSentence: string;
  removeLastLetter: string;
  submitWord: string;
  replayIdiom: string;
  hearExampleSentence: string;
  /** Generic "Delete" used by SavedTasksSection row. */
  deleteItem: string;
  /** Generic "Close" used across modals + drawer. */
  close: string;
  /** Used in setup ConfigureStep — sentence row remove button. */
  removeSentence: string;
  /** Theme picker close button (TeacherThemeMenu). */
  closeThemePicker: string;
  /** Language picker button (StudentTopBar + StudentAccountLoginView). */
  changeLanguage: string;
  /** Generic "Copy" label (ClassCreatedModal). */
  copy: string;
  /** "Back" button in InteractiveWorksheetView. */
  back: string;
  /** "Type your name" placeholder in InteractiveWorksheetView. */
  typeYourName: string;
  /** "Enter your nickname..." placeholder (QuickPlayStudentView). */
  enterNickname: string;
  /** TeacherDashboardView TopAppBar title. */
  vocabandTitle: string;
  /** Toggle presentation mode aria (TeacherDashboardView). */
  togglePresentation: string;
  /** AdaptiveDrawer close-details aria. */
  closeDetails: string;
  /** QpReactionBar — the bar wrapper + per-emoji send button. */
  sendReactionBar: string;
  sendReactionEmoji: (emoji: string) => string;
  /** QPAvatarPicker — per-avatar select button. */
  selectAvatar: (avatar: string) => string;
  /** Live-region announcement when an answer is marked correct (AnswerFeedback). */
  answerCorrect: string;
  /** Live-region announcement when an answer is marked wrong (AnswerFeedback). */
  answerWrong: string;
  /** Live-region announcement when the correct answer is revealed after the
   *  final wrong attempt (AnswerFeedback show-answer state). */
  answerShown: string;
  /** Flashcards flip-card aria-label (the tappable card that flips front↔back). */
  flipCard: string;
}

export const gameAriasT: Record<Language, GameAriasStrings> = {
  en: {
    replayAudio: "Replay audio",
    playPronunciation: "Play pronunciation",
    playAudio: "Play audio",
    playSound: "Play sound",
    listenToSentence: "Listen to sentence",
    removeLastLetter: "Remove last letter",
    submitWord: "Submit word",
    replayIdiom: "Replay idiom",
    hearExampleSentence: "Hear example sentence",
    deleteItem: "Delete",
    close: "Close",
    removeSentence: "Remove sentence",
    closeThemePicker: "Close theme picker",
    changeLanguage: "Change language",
    copy: "Copy",
    back: "Back",
    typeYourName: "Type your name",
    enterNickname: "Enter your nickname...",
    vocabandTitle: "Vocaband",
    togglePresentation: "Toggle presentation mode",
    closeDetails: "Close details",
    sendReactionBar: "Send a reaction to the class screen",
    sendReactionEmoji: (emoji) => `Send ${emoji}`,
    selectAvatar: (avatar) => `Avatar ${avatar}`,
    answerCorrect: "Correct!",
    answerWrong: "Not quite — try again",
    answerShown: "Here's the correct answer",
    flipCard: "Flip card",
  },
  he: {
    replayAudio: "השמע שוב",
    playPronunciation: "השמע הגייה",
    playAudio: "השמע אודיו",
    playSound: "השמע צליל",
    listenToSentence: "האזן למשפט",
    removeLastLetter: "הסר את האות האחרונה",
    submitWord: "שלח מילה",
    replayIdiom: "השמע ביטוי שוב",
    hearExampleSentence: "השמע משפט לדוגמה",
    deleteItem: "מחק",
    close: "סגירה",
    removeSentence: "הסר משפט",
    closeThemePicker: "סגור בוחר ערכת נושא",
    changeLanguage: "החלף שפה",
    copy: "העתק",
    back: "חזרה",
    typeYourName: "הקלידו את שמכם",
    enterNickname: "הכניסו כינוי...",
    vocabandTitle: "Vocaband",
    togglePresentation: "החלף מצב הצגה",
    closeDetails: "סגור פרטים",
    sendReactionBar: "שלחו תגובה למסך הכיתה",
    sendReactionEmoji: (emoji) => `שלח ${emoji}`,
    selectAvatar: (avatar) => `דמות ${avatar}`,
    answerCorrect: "נכון!",
    answerWrong: "לא מדויק — נסו שוב",
    answerShown: "הנה התשובה הנכונה",
    flipCard: "הפכו את הכרטיס",
  },
  ar: {
    replayAudio: "إعادة تشغيل الصوت",
    playPronunciation: "تشغيل النطق",
    playAudio: "تشغيل الصوت",
    playSound: "تشغيل صوت",
    listenToSentence: "استمع إلى الجملة",
    removeLastLetter: "إزالة آخر حرف",
    submitWord: "إرسال الكلمة",
    replayIdiom: "إعادة تشغيل التعبير",
    hearExampleSentence: "استمع إلى جملة المثال",
    deleteItem: "حذف",
    close: "إغلاق",
    removeSentence: "إزالة الجملة",
    closeThemePicker: "إغلاق منتقي السمات",
    changeLanguage: "تغيير اللغة",
    copy: "نسخ",
    back: "رجوع",
    typeYourName: "اكتب اسمك",
    enterNickname: "أدخل اسمك المستعار...",
    vocabandTitle: "Vocaband",
    togglePresentation: "تبديل وضع العرض",
    closeDetails: "إغلاق التفاصيل",
    sendReactionBar: "أرسل تفاعلًا إلى شاشة الصف",
    sendReactionEmoji: (emoji) => `أرسل ${emoji}`,
    selectAvatar: (avatar) => `صورة ${avatar}`,
    answerCorrect: "صحيح!",
    answerWrong: "ليس تمامًا — حاول مرة أخرى",
    answerShown: "إليك الإجابة الصحيحة",
    flipCard: "اقلب البطاقة",
  },
};
