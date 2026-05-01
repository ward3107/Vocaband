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
}

export const gameActiveT: Record<Language, GameActiveStrings> = {
  en: {
    wordOfTotal: (i, n) => `Word ${i} of ${n}`,
    dismissError: "Dismiss error message",
    typeInEnglish: "Type in English...",
    typeTheWord: "Type the word...",
    checkAnswer: "Check Answer",
    translationLabel: "Translation:",
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
  },
  he: {
    wordOfTotal: (i, n) => `מילה ${i} מתוך ${n}`,
    dismissError: "סגור הודעת שגיאה",
    typeInEnglish: "הקלד באנגלית...",
    typeTheWord: "הקלד את המילה...",
    checkAnswer: "בדוק תשובה",
    translationLabel: "תרגום:",
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
  },
  ar: {
    wordOfTotal: (i, n) => `الكلمة ${i} من ${n}`,
    dismissError: "إغلاق رسالة الخطأ",
    typeInEnglish: "اكتب بالإنجليزية...",
    typeTheWord: "اكتب الكلمة...",
    checkAnswer: "تحقق من الإجابة",
    translationLabel: "الترجمة:",
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
  },
};
