/**
 * Locale strings for the Vocabulary Set Detail view + the Print-to-PDF
 * worksheet renderer.  Kept separate from the build wizard and the
 * sentence-gen modal so each surface tree-shakes independently.
 */
import type { Language } from "../../hooks/useLanguage";

export interface SetDetailStrings {
  // Modal chrome
  closeAria: string;
  back: string;
  wordsHeading: (n: number) => string;
  emptyWordsTitle: string;
  emptyWordsBody: string;

  // Header actions
  actionGenerate: string;
  actionPrint: string;
  actionAssign: string;
  printingPdf: string;

  // Word-row labels
  fullSentenceLabel: string;
  fillBlankLabel: string;
  noSentencesYet: string;
  noSentencesYetHint: string;

  // Inline edit
  editAria: string;
  saveEdit: string;
  cancelEdit: string;
  deleteAria: string;
  confirmDelete: string;
  editedBadge: string;

  // Print-to-PDF copy that appears inside the generated worksheet itself
  pdfTitle: (setName: string) => string;
  pdfDateLabel: string;
  pdfNameLabel: string;
  pdfSectionVocabulary: string;
  pdfSectionFillBlank: string;
  pdfSectionAnswers: string;
  pdfFooter: string;

  // Toasts
  toastSentenceUpdated: string;
  toastSentenceDeleted: string;
  errorUpdate: string;
  errorDelete: string;
  errorLoad: string;
  errorPrint: string;
}

export const setDetailT: Record<Language, SetDetailStrings> = {
  en: {
    closeAria: "Close",
    back: "Back",
    wordsHeading: (n) => `${n} ${n === 1 ? "word" : "words"}`,
    emptyWordsTitle: "No words in this set",
    emptyWordsBody: "Add words by re-opening this set in the build wizard.",

    actionGenerate: "Generate sentences",
    actionPrint: "Print as worksheet",
    actionAssign: "Assign to a class",
    printingPdf: "Building PDF…",

    fullSentenceLabel: "Full",
    fillBlankLabel: "Fill",
    noSentencesYet: "No sentences yet",
    noSentencesYetHint: "Tap Generate sentences above to add them.",

    editAria: "Edit",
    saveEdit: "Save",
    cancelEdit: "Cancel",
    deleteAria: "Delete",
    confirmDelete: "Delete this sentence?",
    editedBadge: "edited",

    pdfTitle: (setName) => setName,
    pdfDateLabel: "Date:",
    pdfNameLabel: "Name:",
    pdfSectionVocabulary: "Vocabulary",
    pdfSectionFillBlank: "Fill in the blank",
    pdfSectionAnswers: "Answer key",
    pdfFooter: "Made with Vocaband",

    toastSentenceUpdated: "Sentence updated",
    toastSentenceDeleted: "Sentence deleted",
    errorUpdate: "Couldn't save the change. Please try again.",
    errorDelete: "Couldn't delete. Please try again.",
    errorLoad: "Couldn't load this set. Please try again.",
    errorPrint: "Couldn't build the PDF. Please try again.",
  },
  he: {
    closeAria: "סגור",
    back: "חזרה",
    wordsHeading: (n) => `${n} ${n === 1 ? "מילה" : "מילים"}`,
    emptyWordsTitle: "אין מילים ברשימה",
    emptyWordsBody: "הוסיפו מילים על־ידי פתיחת הרשימה מחדש באשף הבנייה.",

    actionGenerate: "צור משפטים",
    actionPrint: "הדפס כדף עבודה",
    actionAssign: "שייך לכיתה",
    printingPdf: "בונה PDF…",

    fullSentenceLabel: "מלא",
    fillBlankLabel: "השלמה",
    noSentencesYet: "אין משפטים עדיין",
    noSentencesYetHint: "לחצו על 'צור משפטים' למעלה כדי להוסיף.",

    editAria: "ערוך",
    saveEdit: "שמור",
    cancelEdit: "ביטול",
    deleteAria: "מחק",
    confirmDelete: "למחוק את המשפט הזה?",
    editedBadge: "נערך",

    pdfTitle: (setName) => setName,
    pdfDateLabel: "תאריך:",
    pdfNameLabel: "שם:",
    pdfSectionVocabulary: "אוצר מילים",
    pdfSectionFillBlank: "השלמת החסר",
    pdfSectionAnswers: "מפתח תשובות",
    pdfFooter: "נוצר ב־Vocaband",

    toastSentenceUpdated: "המשפט עודכן",
    toastSentenceDeleted: "המשפט נמחק",
    errorUpdate: "שמירת השינוי נכשלה. נסו שוב.",
    errorDelete: "המחיקה נכשלה. נסו שוב.",
    errorLoad: "טעינת הרשימה נכשלה. נסו שוב.",
    errorPrint: "יצירת ה־PDF נכשלה. נסו שוב.",
  },
  ar: {
    closeAria: "إغلاق",
    back: "رجوع",
    wordsHeading: (n) => `${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    emptyWordsTitle: "لا توجد كلمات في هذه القائمة",
    emptyWordsBody: "أضف كلمات بإعادة فتح القائمة في معالج البناء.",

    actionGenerate: "توليد جمل",
    actionPrint: "طباعة كورقة عمل",
    actionAssign: "إسناد إلى فصل",
    printingPdf: "جارٍ بناء PDF…",

    fullSentenceLabel: "كاملة",
    fillBlankLabel: "فراغ",
    noSentencesYet: "لا توجد جمل بعد",
    noSentencesYetHint: "اضغط 'توليد جمل' في الأعلى لإضافتها.",

    editAria: "تحرير",
    saveEdit: "حفظ",
    cancelEdit: "إلغاء",
    deleteAria: "حذف",
    confirmDelete: "حذف هذه الجملة؟",
    editedBadge: "مُحرَّر",

    pdfTitle: (setName) => setName,
    pdfDateLabel: "التاريخ:",
    pdfNameLabel: "الاسم:",
    pdfSectionVocabulary: "المفردات",
    pdfSectionFillBlank: "املأ الفراغ",
    pdfSectionAnswers: "مفتاح الإجابات",
    pdfFooter: "صُنع باستخدام Vocaband",

    toastSentenceUpdated: "تم تحديث الجملة",
    toastSentenceDeleted: "تم حذف الجملة",
    errorUpdate: "تعذّر حفظ التغيير. حاول مرة أخرى.",
    errorDelete: "تعذّر الحذف. حاول مرة أخرى.",
    errorLoad: "تعذّر تحميل القائمة. حاول مرة أخرى.",
    errorPrint: "تعذّر بناء PDF. حاول مرة أخرى.",
  },
  ru: {
    closeAria: "Close",
    back: "Back",
    wordsHeading: (n) => `${n} ${n === 1 ? "word" : "words"}`,
    emptyWordsTitle: "No words in this set",
    emptyWordsBody: "Add words by re-opening this set in the build wizard.",

    actionGenerate: "Generate sentences",
    actionPrint: "Print as worksheet",
    actionAssign: "Assign to a class",
    printingPdf: "Building PDF…",

    fullSentenceLabel: "Full",
    fillBlankLabel: "Fill",
    noSentencesYet: "No sentences yet",
    noSentencesYetHint: "Tap Generate sentences above to add them.",

    editAria: "Edit",
    saveEdit: "Save",
    cancelEdit: "Cancel",
    deleteAria: "Delete",
    confirmDelete: "Delete this sentence?",
    editedBadge: "edited",

    pdfTitle: (setName) => setName,
    pdfDateLabel: "Date:",
    pdfNameLabel: "Name:",
    pdfSectionVocabulary: "Vocabulary",
    pdfSectionFillBlank: "Fill in the blank",
    pdfSectionAnswers: "Answer key",
    pdfFooter: "Made with Vocaband",

    toastSentenceUpdated: "Sentence updated",
    toastSentenceDeleted: "Sentence deleted",
    errorUpdate: "Couldn't save the change. Please try again.",
    errorDelete: "Couldn't delete. Please try again.",
    errorLoad: "Couldn't load this set. Please try again.",
    errorPrint: "Couldn't build the PDF. Please try again.",
  },
};
