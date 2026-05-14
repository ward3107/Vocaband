/**
 * paste-preview.ts — i18n strings for PastePreviewModal (the modal
 * the teacher sees after pasting a word list during assignment /
 * Quick Play setup).  Splits the pasted terms into Matched / New /
 * Filtered / Duplicates buckets and lets the teacher edit inline.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface PastePreviewStrings {
  // Header + stats
  pasteAnalysisHeading: string;
  statTotal: string;
  statMatched: string;
  statNew: string;
  statFiltered: string;
  statFuzzy: string;
  statHebAr: string;

  // Section headings (with count)
  addedWordsHeading: (n: number) => string;
  suggestionsHeading: (n: number) => string;
  customWordsHeading: (n: number) => string;
  relatedWordsHeading: (n: number) => string;
  clickToAddSuffix: string;

  // Inline buttons / titles
  saveChangesTitle: string;
  editTranslationTitle: string;
  removeThisWordTitle: string;
  hebrewPlaceholder: string;
  arabicPlaceholder: string;

  // Match-type labels
  matchExact: string;
  matchHebrew: string;
  matchArabic: string;
  matchPhrase: string;
  matchFuzzy: string;
  matchFamily: string;
  matchStartsWith: string;

  // Duplicates banner
  duplicatesDetectedLabel: string;
  duplicateCountTail: (n: number) => string;

  // Inline help
  editTranslationsHelpLabel: string;
  editTranslationsHelpBody: string;

  // Footer buttons
  cancel: string;
  translating: string;
  translateCustomWords: string;
  saveAndAssign: string;
}

export const pastePreviewT: Record<Language, PastePreviewStrings> = {
  en: {
    pasteAnalysisHeading: "Paste Analysis Results",
    statTotal: "Total:",
    statMatched: "Matched:",
    statNew: "New:",
    statFiltered: "Filtered:",
    statFuzzy: "Fuzzy:",
    statHebAr: "HE/AR:",
    addedWordsHeading: (n) => `Added Words (${n})`,
    suggestionsHeading: (n) => `Suggestions (${n})`,
    customWordsHeading: (n) => `New Custom Words (${n} unique)`,
    relatedWordsHeading: (n) => `Related Words — Suggestions (${n})`,
    clickToAddSuffix: "— click to add",
    saveChangesTitle: "Save changes",
    editTranslationTitle: "Edit translation",
    removeThisWordTitle: "Remove this word",
    hebrewPlaceholder: "Hebrew",
    arabicPlaceholder: "Arabic",
    matchExact: "✓ exact",
    matchHebrew: "✓ Hebrew",
    matchArabic: "✓ Arabic",
    matchPhrase: "✓ phrase",
    matchFuzzy: "≈ fuzzy",
    matchFamily: "~ family",
    matchStartsWith: "~ starts-with",
    duplicatesDetectedLabel: "Duplicates detected:",
    duplicateCountTail: (n) => `${n} duplicate${n === 1 ? "" : "s"}`,
    editTranslationsHelpLabel: "Edit Translations:",
    editTranslationsHelpBody: " Click the edit button next to any word to correct its Hebrew or Arabic translation inline.",
    cancel: "Cancel",
    translating: "Translating...",
    translateCustomWords: "Translate Custom Words",
    saveAndAssign: "Save & Assign",
  },
  he: {
    pasteAnalysisHeading: "תוצאות ניתוח הדבקה",
    statTotal: "סך הכל:",
    statMatched: "תואמו:",
    statNew: "חדשות:",
    statFiltered: "סוננו:",
    statFuzzy: "מקורבות:",
    statHebAr: "עב/ער:",
    addedWordsHeading: (n) => `מילים שנוספו (${n})`,
    suggestionsHeading: (n) => `הצעות (${n})`,
    customWordsHeading: (n) => `מילים מותאמות חדשות (${n} ייחודיות)`,
    relatedWordsHeading: (n) => `מילים קשורות — הצעות (${n})`,
    clickToAddSuffix: "— הקישו להוספה",
    saveChangesTitle: "שמירת שינויים",
    editTranslationTitle: "עריכת תרגום",
    removeThisWordTitle: "הסרת המילה",
    hebrewPlaceholder: "עברית",
    arabicPlaceholder: "ערבית",
    matchExact: "✓ מדויק",
    matchHebrew: "✓ עברית",
    matchArabic: "✓ ערבית",
    matchPhrase: "✓ ביטוי",
    matchFuzzy: "≈ מקורב",
    matchFamily: "~ משפחה",
    matchStartsWith: "~ מתחיל ב",
    duplicatesDetectedLabel: "כפילויות זוהו:",
    duplicateCountTail: (n) => `${n} כפולות`,
    editTranslationsHelpLabel: "עריכת תרגומים:",
    editTranslationsHelpBody: " לחצו על כפתור העריכה ליד כל מילה כדי לתקן את תרגום העברית או הערבית.",
    cancel: "ביטול",
    translating: "מתרגם...",
    translateCustomWords: "תרגם מילים מותאמות",
    saveAndAssign: "שמירה והקצאה",
  },
  ar: {
    pasteAnalysisHeading: "نتائج تحليل اللصق",
    statTotal: "المجموع:",
    statMatched: "مطابق:",
    statNew: "جديد:",
    statFiltered: "مفلتر:",
    statFuzzy: "تقريبي:",
    statHebAr: "عبر/عرب:",
    addedWordsHeading: (n) => `كلمات أضيفت (${n})`,
    suggestionsHeading: (n) => `اقتراحات (${n})`,
    customWordsHeading: (n) => `كلمات مخصّصة جديدة (${n} فريدة)`,
    relatedWordsHeading: (n) => `كلمات ذات صلة — اقتراحات (${n})`,
    clickToAddSuffix: "— انقر للإضافة",
    saveChangesTitle: "حفظ التغييرات",
    editTranslationTitle: "تعديل الترجمة",
    removeThisWordTitle: "إزالة هذه الكلمة",
    hebrewPlaceholder: "العبرية",
    arabicPlaceholder: "العربية",
    matchExact: "✓ تطابق تام",
    matchHebrew: "✓ عبرية",
    matchArabic: "✓ عربية",
    matchPhrase: "✓ عبارة",
    matchFuzzy: "≈ تقريبي",
    matchFamily: "~ عائلة",
    matchStartsWith: "~ يبدأ بـ",
    duplicatesDetectedLabel: "اكتُشفت مكررات:",
    duplicateCountTail: (n) => `${n} مكررة`,
    editTranslationsHelpLabel: "تعديل الترجمات:",
    editTranslationsHelpBody: " انقر زر التعديل بجوار أي كلمة لتصحيح ترجمتها العبرية أو العربية مباشرةً.",
    cancel: "إلغاء",
    translating: "جارٍ الترجمة...",
    translateCustomWords: "ترجم الكلمات المخصّصة",
    saveAndAssign: "حفظ وتعيين",
  },
};
