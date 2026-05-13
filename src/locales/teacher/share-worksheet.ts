/**
 * share-worksheet.ts — i18n strings for ShareWorksheetDialog
 * (the modal that mints an interactive worksheet share link from
 * any surface that has a word list — FreeResources, WorksheetView,
 * BagrutEditor, CreateAssignment).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface ShareWorksheetStrings {
  // Aria + headings
  dialogAria: string;
  heading: string;
  closeAria: string;

  // Topic + word count
  topicLabel: string;
  wordsCount: (n: number) => string;

  // Exercise picker
  exerciseLabel: string;
  matchingLabel: string;
  matchingDesc: string;
  quizLabel: string;
  quizDesc: string;

  // Translation language picker
  translationLabel: string;

  // Generate button states
  generateBtn: string;
  generating: string;
  generateError: string;

  // After generation
  qrAria: string;
  linkLabel: string;
  expiresNote: string;
  copyBtn: string;
  copiedBtn: string;
  whatsappBtn: string;
  moreShareBtn: string;
  openAsStudent: string;

  // Clipboard fallback prompt
  copyPromptTitle: string;

  // WhatsApp / native share message
  whatsappText: (topic: string, url: string) => string;
  nativeShareTitle: (topic: string) => string;
  nativeShareText: string;
}

export const shareWorksheetT: Record<Language, ShareWorksheetStrings> = {
  en: {
    dialogAria: "Share online worksheet",
    heading: "Share online worksheet",
    closeAria: "Close",
    topicLabel: "Topic",
    wordsCount: (n) => `${n} words`,
    exerciseLabel: "Exercise",
    matchingLabel: "Matching",
    matchingDesc: "Tap pairs of English ↔ translation",
    quizLabel: "Multiple-choice quiz",
    quizDesc: "Pick the right translation from 4 options",
    translationLabel: "Translation",
    generateBtn: "Generate share link",
    generating: "Creating link…",
    generateError: "Could not create the link. Please try again.",
    qrAria: "QR code for the worksheet link",
    linkLabel: "Link",
    expiresNote: "Expires in 30 days. Anyone with this link can solve the worksheet.",
    copyBtn: "Copy",
    copiedBtn: "Copied",
    whatsappBtn: "WhatsApp",
    moreShareBtn: "More share options",
    openAsStudent: "Open as a student →",
    copyPromptTitle: "Copy this link",
    whatsappText: (topic, url) => `Solve this worksheet on your phone: ${topic}\n${url}`,
    nativeShareTitle: (topic) => `Worksheet: ${topic}`,
    nativeShareText: "Solve this worksheet on your phone:",
  },
  he: {
    dialogAria: "שיתוף דף עבודה אונליין",
    heading: "שיתוף דף עבודה אונליין",
    closeAria: "סגירה",
    topicLabel: "נושא",
    wordsCount: (n) => `${n} מילים`,
    exerciseLabel: "תרגיל",
    matchingLabel: "התאמה",
    matchingDesc: "התאימו זוגות אנגלית ↔ תרגום",
    quizLabel: "שאלה רבת-ברירה",
    quizDesc: "בחרו את התרגום הנכון מתוך 4 אפשרויות",
    translationLabel: "שפת תרגום",
    generateBtn: "יצירת קישור שיתוף",
    generating: "יוצר קישור…",
    generateError: "לא ניתן ליצור את הקישור. נסו שוב.",
    qrAria: "קוד QR לקישור דף העבודה",
    linkLabel: "קישור",
    expiresNote: "פג תוקף בעוד 30 ימים. כל מי שיש לו את הקישור יכול לפתור.",
    copyBtn: "העתק",
    copiedBtn: "הועתק",
    whatsappBtn: "WhatsApp",
    moreShareBtn: "אפשרויות שיתוף נוספות",
    openAsStudent: "פתח כתלמיד ←",
    copyPromptTitle: "העתיקו את הקישור",
    whatsappText: (topic, url) => `פתרו את דף העבודה הזה בטלפון: ${topic}\n${url}`,
    nativeShareTitle: (topic) => `דף עבודה: ${topic}`,
    nativeShareText: "פתרו את דף העבודה הזה בטלפון:",
  },
  ar: {
    dialogAria: "مشاركة ورقة عمل إلكترونية",
    heading: "مشاركة ورقة عمل إلكترونية",
    closeAria: "إغلاق",
    topicLabel: "الموضوع",
    wordsCount: (n) => `${n} كلمة`,
    exerciseLabel: "التمرين",
    matchingLabel: "مطابقة",
    matchingDesc: "اضغط على أزواج إنجليزي ↔ ترجمة",
    quizLabel: "اختيار من متعدّد",
    quizDesc: "اختر الترجمة الصحيحة من 4 خيارات",
    translationLabel: "لغة الترجمة",
    generateBtn: "إنشاء رابط مشاركة",
    generating: "جارٍ إنشاء الرابط…",
    generateError: "تعذّر إنشاء الرابط. حاول مرة أخرى.",
    qrAria: "رمز QR لرابط ورقة العمل",
    linkLabel: "الرابط",
    expiresNote: "تنتهي صلاحيته بعد 30 يوماً. يمكن لأي شخص لديه هذا الرابط حل الورقة.",
    copyBtn: "نسخ",
    copiedBtn: "تم النسخ",
    whatsappBtn: "WhatsApp",
    moreShareBtn: "خيارات مشاركة إضافية",
    openAsStudent: "افتح كطالب ←",
    copyPromptTitle: "انسخ هذا الرابط",
    whatsappText: (topic, url) => `حلّ ورقة العمل هذه على هاتفك: ${topic}\n${url}`,
    nativeShareTitle: (topic) => `ورقة عمل: ${topic}`,
    nativeShareText: "حلّ ورقة العمل هذه على هاتفك:",
  },
};
