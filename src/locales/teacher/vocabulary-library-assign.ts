/**
 * Locale strings for the "Assign Vocabulary Set to a class" modal —
 * opened from the Set Detail view's Send button.
 */
import type { Language } from "../../hooks/useLanguage";

export interface AssignSetStrings {
  modalTitle: (setName: string) => string;
  closeAria: string;
  cancel: string;
  assigning: string;
  assign: string;

  pickClassHeading: string;
  pickClassEmpty: string;
  /** "5 students · code AB3K9X" */
  classMetaRow: (code: string) => string;

  titleLabel: string;
  titlePlaceholder: string;
  deadlineLabel: string;
  deadlineHint: string;
  deadlineNone: string;

  translationsHeading: string;
  translationsHint: string;
  translationHebrew: string;
  translationArabic: string;
  translationBoth: string;

  /** Toast on success — assignment created for class N. */
  toastAssigned: (className: string) => string;

  errorNoClass: string;
  errorNoTitle: string;
  errorCreate: string;
}

export const assignSetT: Record<Language, AssignSetStrings> = {
  en: {
    modalTitle: (setName) => `Assign · ${setName}`,
    closeAria: "Close",
    cancel: "Cancel",
    assigning: "Assigning…",
    assign: "Create assignment",

    pickClassHeading: "Which class?",
    pickClassEmpty: "You don't have any classes yet — create one from the dashboard first.",
    classMetaRow: (code) => `Code · ${code}`,

    titleLabel: "Assignment title",
    titlePlaceholder: "e.g. Animals — Unit 3",
    deadlineLabel: "Deadline (optional)",
    deadlineHint: "Students can still play after the deadline, but the assignment shows as overdue.",
    deadlineNone: "No deadline",

    translationsHeading: "Translations students see",
    translationsHint: "Pick the language(s) shown alongside the English word.",
    translationHebrew: "Hebrew",
    translationArabic: "Arabic",
    translationBoth: "Both",

    toastAssigned: (className) => `Assigned to ${className} 📋`,

    errorNoClass: "Pick a class to assign to.",
    errorNoTitle: "Give the assignment a title.",
    errorCreate: "Couldn't create the assignment. Please try again.",
  },
  he: {
    modalTitle: (setName) => `שיוך · ${setName}`,
    closeAria: "סגור",
    cancel: "ביטול",
    assigning: "משייך…",
    assign: "צור מטלה",

    pickClassHeading: "לאיזו כיתה?",
    pickClassEmpty: "עדיין אין לכם כיתות — צרו כיתה מלוח המורה תחילה.",
    classMetaRow: (code) => `קוד · ${code}`,

    titleLabel: "שם המטלה",
    titlePlaceholder: "למשל: חיות — יחידה 3",
    deadlineLabel: "תאריך יעד (אופציונלי)",
    deadlineHint: "התלמידים יכולים לשחק גם אחרי תאריך היעד, אך המטלה תוצג כבאיחור.",
    deadlineNone: "ללא תאריך יעד",

    translationsHeading: "תרגומים שהתלמידים יראו",
    translationsHint: "בחרו את השפה (או השפות) שיוצגו לצד המילה באנגלית.",
    translationHebrew: "עברית",
    translationArabic: "ערבית",
    translationBoth: "שתיהן",

    toastAssigned: (className) => `המטלה שויכה ל־${className} 📋`,

    errorNoClass: "בחרו כיתה לשיוך.",
    errorNoTitle: "תנו למטלה שם.",
    errorCreate: "יצירת המטלה נכשלה. נסו שוב.",
  },
  ar: {
    modalTitle: (setName) => `إسناد · ${setName}`,
    closeAria: "إغلاق",
    cancel: "إلغاء",
    assigning: "جارٍ الإسناد…",
    assign: "أنشئ الواجب",

    pickClassHeading: "لأيّ فصل؟",
    pickClassEmpty: "لا توجد فصول بعد — أنشئ فصلًا من اللوحة أولًا.",
    classMetaRow: (code) => `الرمز · ${code}`,

    titleLabel: "عنوان الواجب",
    titlePlaceholder: "مثال: الحيوانات — الوحدة 3",
    deadlineLabel: "الموعد النهائي (اختياري)",
    deadlineHint: "يستطيع الطلاب اللعب بعد الموعد، لكن الواجب يظهر متأخّرًا.",
    deadlineNone: "بلا موعد نهائي",

    translationsHeading: "الترجمات التي يراها الطلاب",
    translationsHint: "اختر اللغة (أو اللغتين) التي ستظهر بجانب الكلمة الإنجليزية.",
    translationHebrew: "العبرية",
    translationArabic: "العربية",
    translationBoth: "كلاهما",

    toastAssigned: (className) => `تم الإسناد إلى ${className} 📋`,

    errorNoClass: "اختر فصلًا للإسناد.",
    errorNoTitle: "أعطِ الواجب عنوانًا.",
    errorCreate: "تعذّر إنشاء الواجب. حاول مرة أخرى.",
  },
  ru: {
    modalTitle: (setName) => `Assign · ${setName}`,
    closeAria: "Close",
    cancel: "Cancel",
    assigning: "Assigning…",
    assign: "Create assignment",

    pickClassHeading: "Which class?",
    pickClassEmpty: "You don't have any classes yet — create one from the dashboard first.",
    classMetaRow: (code) => `Code · ${code}`,

    titleLabel: "Assignment title",
    titlePlaceholder: "e.g. Animals — Unit 3",
    deadlineLabel: "Deadline (optional)",
    deadlineHint: "Students can still play after the deadline, but the assignment shows as overdue.",
    deadlineNone: "No deadline",

    translationsHeading: "Translations students see",
    translationsHint: "Pick the language(s) shown alongside the English word.",
    translationHebrew: "Hebrew",
    translationArabic: "Arabic",
    translationBoth: "Both",

    toastAssigned: (className) => `Assigned to ${className} 📋`,

    errorNoClass: "Pick a class to assign to.",
    errorNoTitle: "Give the assignment a title.",
    errorCreate: "Couldn't create the assignment. Please try again.",
  },
};
