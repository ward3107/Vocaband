/**
 * game-arias.ts — shared aria-label strings used by many game-mode
 * components: "Replay audio", "Play pronunciation", "Listen to
 * sentence", "Submit word", etc.
 *
 * Pulled out so individual game files (SpeedRound, SentenceBuilder,
 * Scramble, Review, Relations, Flashcards, WordChains, Idiom,
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
  },
};
