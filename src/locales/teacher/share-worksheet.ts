/**
 * share-worksheet.ts — i18n strings for ShareWorksheetDialog
 * (the modal that mints an interactive worksheet share link from
 * any surface that has a word list — FreeResources, WorksheetView,
 * BagrutEditor, CreateAssignment).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface ExerciseTypeStrings {
  label: string;
  desc: string;
}

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
  pickAtLeastOne: string;
  // Keyed by ExerciseType so the dialog renders one chip per supported
  // type without a long flat list of label1, desc1, label2, desc2…
  exercises: Record<string, ExerciseTypeStrings>;

  // Per-exercise config rows
  translationDirectionLabel: string;
  synonymModeLabel: string;
  synonymOption: string;
  antonymOption: string;

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
  downloadPngBtn: string;
  downloadPdfBtn: string;

  // Clipboard fallback prompt
  copyPromptTitle: string;

  // WhatsApp / native share message
  whatsappText: (topic: string, url: string) => string;
  nativeShareTitle: (topic: string) => string;
  nativeShareText: string;

  // Back-compat with callers reading the old single-format API.  Phase
  // 1 dialog used these directly; the new picker reads from `exercises`
  // above, but several call sites still consume the originals.
  matchingLabel: string;
  matchingDesc: string;
  quizLabel: string;
  quizDesc: string;
}

export const shareWorksheetT: Record<Language, ShareWorksheetStrings> = {
  en: {
    dialogAria: "Share online worksheet",
    heading: "Share online worksheet",
    closeAria: "Close",
    topicLabel: "Topic",
    wordsCount: (n) => `${n} words`,
    exerciseLabel: "Pick exercises",
    pickAtLeastOne: "Pick at least one exercise.",
    exercises: {
      matching: { label: "Matching", desc: "Pair English ↔ translation" },
      quiz: { label: "Multiple-choice quiz", desc: "Pick the translation from 4 options" },
      letter_scramble: { label: "Letter scramble", desc: "Tap letters to spell the word" },
      listening_dictation: { label: "Listening dictation", desc: "Hear the word, type it" },
      fill_blank: { label: "Fill in the blank", desc: "Type the missing word in a sentence" },
      definition_match: { label: "Definition match", desc: "Match each word to its definition" },
      synonym_antonym: { label: "Synonyms / antonyms", desc: "Pick the matching or opposite word" },
      cloze: { label: "Cloze paragraph", desc: "Fill multiple blanks in a paragraph" },
      sentence_building: { label: "Sentence building", desc: "Arrange words into a sentence" },
      translation_typing: { label: "Translation typing", desc: "Type the translation" },
      word_in_context: { label: "Word in context", desc: "Read a sentence using the word" },
      true_false: { label: "True or false", desc: "Decide if a claim is true" },
    },
    translationDirectionLabel: "Direction",
    synonymModeLabel: "Mode",
    synonymOption: "Synonyms",
    antonymOption: "Antonyms",
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
    downloadPngBtn: "Save as image",
    downloadPdfBtn: "Save as PDF",
    copyPromptTitle: "Copy this link",
    whatsappText: (topic, url) => `Solve this worksheet on your phone: ${topic}\n${url}`,
    nativeShareTitle: (topic) => `Worksheet: ${topic}`,
    nativeShareText: "Solve this worksheet on your phone:",
    matchingLabel: "Matching",
    matchingDesc: "Tap pairs of English ↔ translation",
    quizLabel: "Multiple-choice quiz",
    quizDesc: "Pick the right translation from 4 options",
  },
  he: {
    dialogAria: "שיתוף דף עבודה אונליין",
    heading: "שיתוף דף עבודה אונליין",
    closeAria: "סגירה",
    topicLabel: "נושא",
    wordsCount: (n) => `${n} מילים`,
    exerciseLabel: "בחרו תרגילים",
    pickAtLeastOne: "בחרו לפחות תרגיל אחד.",
    exercises: {
      matching: { label: "התאמה", desc: "התאימו זוגות אנגלית ↔ תרגום" },
      quiz: { label: "שאלה רבת-ברירה", desc: "בחרו את התרגום מתוך 4 אפשרויות" },
      letter_scramble: { label: "ערבוב אותיות", desc: "הקישו אותיות לאיות המילה" },
      listening_dictation: { label: "הכתבה לפי הקלטה", desc: "שמעו את המילה והקלידו" },
      fill_blank: { label: "השלמת מילה חסרה", desc: "הקלידו את המילה החסרה במשפט" },
      definition_match: { label: "התאמת הגדרה", desc: "התאימו כל מילה להגדרה שלה" },
      synonym_antonym: { label: "מילים נרדפות / הפוכות", desc: "בחרו את המילה המתאימה או ההפוכה" },
      cloze: { label: "פסקת חסר", desc: "השלימו כמה מילים חסרות בפסקה" },
      sentence_building: { label: "בניית משפט", desc: "סדרו מילים למשפט" },
      translation_typing: { label: "תרגום בכתב", desc: "הקלידו את התרגום" },
      word_in_context: { label: "מילה בהקשר", desc: "קראו משפט המשתמש במילה" },
      true_false: { label: "נכון / לא נכון", desc: "החליטו אם המשפט נכון" },
    },
    translationDirectionLabel: "כיוון",
    synonymModeLabel: "מצב",
    synonymOption: "נרדפות",
    antonymOption: "הפוכות",
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
    downloadPngBtn: "שמירה כתמונה",
    downloadPdfBtn: "שמירה כ-PDF",
    copyPromptTitle: "העתיקו את הקישור",
    whatsappText: (topic, url) => `פתרו את דף העבודה הזה בטלפון: ${topic}\n${url}`,
    nativeShareTitle: (topic) => `דף עבודה: ${topic}`,
    nativeShareText: "פתרו את דף העבודה הזה בטלפון:",
    matchingLabel: "התאמה",
    matchingDesc: "התאימו זוגות אנגלית ↔ תרגום",
    quizLabel: "שאלה רבת-ברירה",
    quizDesc: "בחרו את התרגום הנכון מתוך 4 אפשרויות",
  },
  ar: {
    dialogAria: "مشاركة ورقة عمل إلكترونية",
    heading: "مشاركة ورقة عمل إلكترونية",
    closeAria: "إغلاق",
    topicLabel: "الموضوع",
    wordsCount: (n) => `${n} كلمة`,
    exerciseLabel: "اختر التمارين",
    pickAtLeastOne: "اختر تمريناً واحداً على الأقل.",
    exercises: {
      matching: { label: "مطابقة", desc: "اضغط أزواج إنجليزي ↔ ترجمة" },
      quiz: { label: "اختيار من متعدّد", desc: "اختر الترجمة من 4 خيارات" },
      letter_scramble: { label: "ترتيب الحروف", desc: "اضغط الحروف لتهجئة الكلمة" },
      listening_dictation: { label: "إملاء بالاستماع", desc: "اسمع الكلمة ثم اكتبها" },
      fill_blank: { label: "املأ الفراغ", desc: "اكتب الكلمة الناقصة في الجملة" },
      definition_match: { label: "مطابقة التعريف", desc: "طابق كل كلمة بتعريفها" },
      synonym_antonym: { label: "مرادفات / أضداد", desc: "اختر الكلمة المرادفة أو الضد" },
      cloze: { label: "فقرة بإكمال الفراغات", desc: "املأ عدة فراغات في الفقرة" },
      sentence_building: { label: "بناء جملة", desc: "رتب الكلمات لتكوين جملة" },
      translation_typing: { label: "ترجمة بالكتابة", desc: "اكتب الترجمة" },
      word_in_context: { label: "كلمة في سياق", desc: "اقرأ جملة تستخدم الكلمة" },
      true_false: { label: "صح أم خطأ", desc: "قرّر إن كانت العبارة صحيحة" },
    },
    translationDirectionLabel: "الاتجاه",
    synonymModeLabel: "الوضع",
    synonymOption: "مرادفات",
    antonymOption: "أضداد",
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
    downloadPngBtn: "حفظ كصورة",
    downloadPdfBtn: "حفظ كـ PDF",
    copyPromptTitle: "انسخ هذا الرابط",
    whatsappText: (topic, url) => `حلّ ورقة العمل هذه على هاتفك: ${topic}\n${url}`,
    nativeShareTitle: (topic) => `ورقة عمل: ${topic}`,
    nativeShareText: "حلّ ورقة العمل هذه على هاتفك:",
    matchingLabel: "مطابقة",
    matchingDesc: "اضغط على أزواج إنجليزي ↔ ترجمة",
    quizLabel: "اختيار من متعدّد",
    quizDesc: "اختر الترجمة الصحيحة من 4 خيارات",
  },
};
