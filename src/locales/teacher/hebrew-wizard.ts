/**
 * hebrew-wizard.ts — i18n strings for HebrewAssignmentWizard (the
 * 3-step Hebrew assignment-creation flow rendered when a teacher
 * picks a VocaHebrew class).
 *
 * The wizard's data (Hebrew lemmas, niqqud, pack metadata) stays
 * in Hebrew because it IS the curriculum.  The CHROME (step
 * headings, button labels, source-tab labels, OCR fallback copy)
 * follows useLanguage() so an EN or AR teacher who runs a Hebrew
 * class can still navigate the wizard.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface HebrewWizardStrings {
  // Step 1 — pick lemmas
  step1Heading: string;
  step1Selected: (n: number) => string;
  sourceTabPacks: string;
  sourceTabOcr: string;
  sourceTabUpload: string;
  sourceTabLibrary: string;
  noSavedTasksYet: string;
  unnamedTask: string;
  ocrUnmatched: (n: number) => string;
  ocrUnmatchedMore: (n: number) => string;
  allClasses: string;
  selectAll: string;
  clearAll: string;
  continueBtn: string;

  // Step 2 — title + deadline
  step2Heading: string;
  step2Subheading: string;
  titleLabel: string;
  titlePlaceholder: string;
  deadlineLabel: string;
  back: string;

  // Step 3 — modes
  step3Heading: string;
  step3Subheading: string;
  comingSoon: string;
  saveBtnNew: string;
  saveBtnEdit: string;
}

export const hebrewWizardT: Record<Language, HebrewWizardStrings> = {
  en: {
    step1Heading: "Pick words to practice",
    step1Selected: (n) => `${n} words selected`,
    sourceTabPacks: "From curriculum",
    sourceTabOcr: "Camera",
    sourceTabUpload: "Upload image",
    sourceTabLibrary: "From library",
    noSavedTasksYet: "No saved Hebrew tasks yet. Save a task to see it here.",
    unnamedTask: "Untitled task",
    ocrUnmatched: (n) => `${n} words from the image weren't found in the vocabulary and will be skipped.`,
    ocrUnmatchedMore: (n) => `… and ${n} more`,
    allClasses: "All classes",
    selectAll: "Select all",
    clearAll: "Clear",
    continueBtn: "Continue",
    step2Heading: "Assignment details",
    step2Subheading: "Assignment name and deadline (optional)",
    titleLabel: "Assignment name",
    titlePlaceholder: "e.g.: Verb roots — Lesson 3",
    deadlineLabel: "Deadline (optional)",
    back: "Back",
    step3Heading: "Practice games",
    step3Subheading: "Pick which modes will be available to students",
    comingSoon: "Coming soon",
    saveBtnNew: "Save assignment",
    saveBtnEdit: "Update assignment",
  },
  he: {
    step1Heading: "בחרו מילים לתרגול",
    step1Selected: (n) => `${n} מילים נבחרו`,
    sourceTabPacks: "מהאוצר",
    sourceTabOcr: "צילום",
    sourceTabUpload: "העלאת תמונה",
    sourceTabLibrary: "מהספרייה",
    noSavedTasksYet: "אין עדיין מטלות שמורות בעברית. שמרו מטלה כדי לראות אותה כאן.",
    unnamedTask: "מטלה ללא שם",
    ocrUnmatched: (n) => `${n} מילים מהתמונה לא נמצאו באוצר ויידלגו כעת.`,
    ocrUnmatchedMore: (n) => `… ועוד ${n}`,
    allClasses: "כל הכיתות",
    selectAll: "בחרו הכל",
    clearAll: "נקה",
    continueBtn: "המשך",
    step2Heading: "פרטי המטלה",
    step2Subheading: "שם המטלה ותאריך הגשה (אופציונלי)",
    titleLabel: "שם המטלה",
    titlePlaceholder: "לדוגמה: שורש פעלים — שיעור 3",
    deadlineLabel: "תאריך הגשה (אופציונלי)",
    back: "חזרה",
    step3Heading: "משחקי תרגול",
    step3Subheading: "בחרו אילו מצבים יהיו זמינים לתלמידים",
    comingSoon: "בקרוב",
    saveBtnNew: "שמירת מטלה",
    saveBtnEdit: "עדכון מטלה",
  },
  ar: {
    step1Heading: "اختر الكلمات للتدرّب",
    step1Selected: (n) => `${n} كلمة مختارة`,
    sourceTabPacks: "من المنهج",
    sourceTabOcr: "كاميرا",
    sourceTabUpload: "رفع صورة",
    sourceTabLibrary: "من المكتبة",
    noSavedTasksYet: "لا توجد مهام عبرية محفوظة بعد. احفظ مهمة لتظهر هنا.",
    unnamedTask: "مهمة بلا اسم",
    ocrUnmatched: (n) => `${n} كلمات من الصورة لم تُوجد في المفردات وسيتم تخطّيها.`,
    ocrUnmatchedMore: (n) => `… و${n} إضافية`,
    allClasses: "كل الصفوف",
    selectAll: "تحديد الكل",
    clearAll: "مسح",
    continueBtn: "متابعة",
    step2Heading: "تفاصيل المهمة",
    step2Subheading: "اسم المهمة والموعد النهائي (اختياري)",
    titleLabel: "اسم المهمة",
    titlePlaceholder: "مثال: جذور الأفعال — الدرس 3",
    deadlineLabel: "الموعد النهائي (اختياري)",
    back: "رجوع",
    step3Heading: "ألعاب التدرّب",
    step3Subheading: "اختر الأوضاع المتاحة للطلاب",
    comingSoon: "قريباً",
    saveBtnNew: "حفظ المهمة",
    saveBtnEdit: "تحديث المهمة",
  },
};
