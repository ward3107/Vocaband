/**
 * Locale strings for the Vocabulary Library "Build a Set" wizard
 * (SetBuildWizard). Separate file from vocabulary-library.ts so the
 * wizard's strings tree-shake out of the library-shell bundle for
 * teachers who never open it.
 */
import type { Language } from "../../hooks/useLanguage";

export interface SetBuildWizardStrings {
  // Modal chrome
  modalTitle: string;
  modalCloseAria: string;
  back: string;
  cancel: string;
  save: string;
  saving: string;

  // Step 1: pick source
  pickSourceHeading: string;
  pickSourceSubtitle: string;
  modeManualTitle: string;
  modeManualBlurb: string;
  modePasteTitle: string;
  modePasteBlurb: string;
  modePhotoTitle: string;
  modePhotoBlurb: string;
  modeUploadTitle: string;
  modeUploadBlurb: string;
  modeAiTitle: string;
  modeAiBlurb: string;
  modeCurriculumTitle: string;
  modeCurriculumBlurb: string;
  comingSoonBadge: string;

  // Shared step 2 — set name
  setNameLabel: string;
  setNamePlaceholder: string;
  defaultSetNamePhoto: (date: string) => string;
  defaultSetNamePaste: (date: string) => string;
  defaultSetNameManual: (date: string) => string;

  // Manual mode
  manualHeading: string;
  manualSubtitle: string;
  manualHeaderEnglish: string;
  manualHeaderHebrew: string;
  manualHeaderArabic: string;
  manualAddRow: string;
  manualRemoveRowAria: string;
  manualEmptyHint: string;

  // Paste mode
  pasteHeading: string;
  pasteSubtitle: string;
  pastePlaceholder: string;
  pasteExtract: string;
  pasteExtracting: string;
  pasteExtractedCount: (n: number) => string;
  pasteEmpty: string;

  // Photo mode
  photoHeading: string;
  photoSubtitle: string;
  photoTrigger: string;
  photoProcessing: string;
  photoStatusCompressing: string;
  photoStatusUploading: string;
  photoStatusTranslating: string;
  photoExtractedCount: (n: number) => string;
  photoNoWords: string;

  // Words-review table
  reviewHeading: string;
  reviewSubtitle: (n: number) => string;
  reviewRemoveAria: string;

  // Privacy notice (reused for photo mode)
  privacyNotice: string;

  // Errors + toasts
  errorNoWords: string;
  errorSave: string;
  errorExtract: string;
  toastSaved: (name: string) => string;
}

export const setBuildWizardT: Record<Language, SetBuildWizardStrings> = {
  en: {
    modalTitle: "Build a Vocabulary Set",
    modalCloseAria: "Close",
    back: "Back",
    cancel: "Cancel",
    save: "Save to library",
    saving: "Saving…",

    pickSourceHeading: "How would you like to start?",
    pickSourceSubtitle: "Pick any source — the words land in a new Set you can use anywhere.",
    modeManualTitle: "Type manually",
    modeManualBlurb: "Add words by hand. Best for short lists.",
    modePasteTitle: "Type or paste",
    modePasteBlurb: "Type words, or paste a list. One per line or comma-separated.",
    modePhotoTitle: "Photo or image",
    modePhotoBlurb: "Snap a photo, pick from gallery, or upload a screenshot. AI extracts the words.",
    modeUploadTitle: "Upload a document",
    modeUploadBlurb: "Upload a PDF or Word file to extract from.",
    modeAiTitle: "Generate with AI",
    modeAiBlurb: "Describe a topic — AI proposes a level-appropriate word list.",
    modeCurriculumTitle: "From curriculum",
    modeCurriculumBlurb: "Pick from the built-in Set 1 / Set 2 / Set 3 word banks.",
    comingSoonBadge: "Soon",

    setNameLabel: "Set name",
    setNamePlaceholder: "e.g. Animals — Unit 3",
    defaultSetNamePhoto: (date) => `Photo · ${date}`,
    defaultSetNamePaste: (date) => `Pasted · ${date}`,
    defaultSetNameManual: (date) => `New set · ${date}`,

    manualHeading: "Type your word list",
    manualSubtitle: "Add as many words as you need. Translations are optional — you can fill them in later.",
    manualHeaderEnglish: "English",
    manualHeaderHebrew: "Hebrew",
    manualHeaderArabic: "Arabic",
    manualAddRow: "+ Add row",
    manualRemoveRowAria: "Remove row",
    manualEmptyHint: "Type a word in the English column to get started.",

    pasteHeading: "Paste a word list",
    pasteSubtitle: "One word per line, or separated by commas / semicolons.",
    pastePlaceholder: "lion\nelephant\ntiger\nzoo\n…",
    pasteExtract: "Extract words",
    pasteExtracting: "Extracting + translating…",
    pasteExtractedCount: (n) => `Found ${n} unique ${n === 1 ? "word" : "words"}.`,
    pasteEmpty: "Paste some text above, then tap Extract.",

    photoHeading: "Photograph a page",
    photoSubtitle: "Snap a clear photo of your word list. We'll extract the English words and translate them.",
    photoTrigger: "Choose a photo",
    photoProcessing: "Reading the page…",
    photoStatusCompressing: "Compressing image…",
    photoStatusUploading: "Uploading…",
    photoStatusTranslating: "Translating to Hebrew + Arabic…",
    photoExtractedCount: (n) => `Found ${n} ${n === 1 ? "word" : "words"} on the page.`,
    photoNoWords: "No words detected — the photo may be unclear. Try a closer shot with better lighting.",

    reviewHeading: "Review the words",
    reviewSubtitle: (n) => `${n} ${n === 1 ? "word" : "words"} ready to save. Edit or remove anything that's wrong.`,
    reviewRemoveAria: "Remove word",

    privacyNotice:
      "Your file is processed privately to extract words, then deleted within 72 hours. We don't share, index, or keep your materials.",

    errorNoWords: "Add at least one word before saving.",
    errorSave: "Couldn't save the set. Please try again.",
    errorExtract: "Couldn't extract words. Please try again.",
    toastSaved: (name) => `Saved "${name}" to your library 📚`,
  },
  he: {
    modalTitle: "בניית רשימת מילים",
    modalCloseAria: "סגור",
    back: "חזרה",
    cancel: "ביטול",
    save: "שמור לספרייה",
    saving: "שומר…",

    pickSourceHeading: "איך תרצו להתחיל?",
    pickSourceSubtitle: "בחרו מקור — המילים יישמרו ברשימה חדשה שתוכלו להשתמש בה בכל מקום.",
    modeManualTitle: "הקלדה ידנית",
    modeManualBlurb: "הוסיפו מילים ידנית. מתאים לרשימות קצרות.",
    modePasteTitle: "הקלדה או הדבקה",
    modePasteBlurb: "הקלידו או הדביקו רשימה — מילה בשורה או מופרדות בפסיק.",
    modePhotoTitle: "תמונה",
    modePhotoBlurb: "צלמו, בחרו מהגלריה או העלו צילום מסך — ה־AI יחלץ את המילים.",
    modeUploadTitle: "העלאת מסמך",
    modeUploadBlurb: "העלו קובץ PDF או Word לחילוץ.",
    modeAiTitle: "יצירה עם AI",
    modeAiBlurb: "תיארו נושא — ה־AI יציע רשימת מילים מתאימה לרמה.",
    modeCurriculumTitle: "מתוכנית הלימודים",
    modeCurriculumBlurb: "בחרו מתוך מאגר Set 1 / Set 2 / Set 3 המובנה.",
    comingSoonBadge: "בקרוב",

    setNameLabel: "שם הרשימה",
    setNamePlaceholder: "למשל: חיות — יחידה 3",
    defaultSetNamePhoto: (date) => `צילום · ${date}`,
    defaultSetNamePaste: (date) => `הדבקה · ${date}`,
    defaultSetNameManual: (date) => `רשימה חדשה · ${date}`,

    manualHeading: "הקלידו את רשימת המילים",
    manualSubtitle: "הוסיפו כמה מילים שצריך. התרגומים אופציונליים — אפשר למלא בהמשך.",
    manualHeaderEnglish: "אנגלית",
    manualHeaderHebrew: "עברית",
    manualHeaderArabic: "ערבית",
    manualAddRow: "+ הוסף שורה",
    manualRemoveRowAria: "הסר שורה",
    manualEmptyHint: "הקלידו מילה בעמודה האנגלית כדי להתחיל.",

    pasteHeading: "הדביקו רשימת מילים",
    pasteSubtitle: "מילה בשורה, או מופרדות בפסיק / נקודה־פסיק.",
    pastePlaceholder: "lion\nelephant\ntiger\nzoo\n…",
    pasteExtract: "חלץ מילים",
    pasteExtracting: "מחלץ ומתרגם…",
    pasteExtractedCount: (n) => `נמצאו ${n} ${n === 1 ? "מילה ייחודית" : "מילים ייחודיות"}.`,
    pasteEmpty: "הדביקו טקסט למעלה ואז לחצו על חילוץ.",

    photoHeading: "צלמו עמוד",
    photoSubtitle: "צלמו תמונה ברורה של רשימת המילים. נחלץ את המילים באנגלית ונתרגם אותן.",
    photoTrigger: "בחרו תמונה",
    photoProcessing: "קוראים את העמוד…",
    photoStatusCompressing: "דחיסת תמונה…",
    photoStatusUploading: "מעלה…",
    photoStatusTranslating: "מתרגם לעברית + ערבית…",
    photoExtractedCount: (n) => `נמצאו ${n} ${n === 1 ? "מילה" : "מילים"} בעמוד.`,
    photoNoWords: "לא זוהו מילים — התמונה אולי לא ברורה. נסו צילום קרוב יותר עם תאורה טובה יותר.",

    reviewHeading: "סקירת המילים",
    reviewSubtitle: (n) => `${n} ${n === 1 ? "מילה" : "מילים"} מוכנות לשמירה. ערכו או הסירו כל מה שלא נכון.`,
    reviewRemoveAria: "הסר מילה",

    privacyNotice:
      "הקובץ שלכם מעובד פרטית לצורך חילוץ המילים ואז נמחק תוך 72 שעות. איננו משתפים, מאנדקסים או שומרים את החומר שלכם.",

    errorNoWords: "הוסיפו לפחות מילה אחת לפני השמירה.",
    errorSave: "שמירת הרשימה נכשלה. נסו שוב.",
    errorExtract: "חילוץ המילים נכשל. נסו שוב.",
    toastSaved: (name) => `הרשימה "${name}" נשמרה בספרייה 📚`,
  },
  ar: {
    modalTitle: "إنشاء قائمة مفردات",
    modalCloseAria: "إغلاق",
    back: "رجوع",
    cancel: "إلغاء",
    save: "احفظ في المكتبة",
    saving: "جارٍ الحفظ…",

    pickSourceHeading: "كيف تودّ أن تبدأ؟",
    pickSourceSubtitle: "اختر أي مصدر — تُحفظ الكلمات في قائمة جديدة يمكنك استخدامها في أي مكان.",
    modeManualTitle: "كتابة يدوية",
    modeManualBlurb: "أضف الكلمات يدويًا. مناسب للقوائم القصيرة.",
    modePasteTitle: "اكتب أو الصق",
    modePasteBlurb: "اكتب أو الصق قائمة — كلمة في كل سطر أو مفصولة بفواصل.",
    modePhotoTitle: "صورة",
    modePhotoBlurb: "التقط صورة، اختر من المعرض، أو ارفع لقطة شاشة — يستخرج الذكاء الاصطناعي الكلمات.",
    modeUploadTitle: "رفع مستند",
    modeUploadBlurb: "ارفع ملف PDF أو Word للاستخراج منه.",
    modeAiTitle: "إنشاء بالذكاء الاصطناعي",
    modeAiBlurb: "صِف موضوعًا — يقترح الذكاء الاصطناعي قائمة كلمات مناسبة للمستوى.",
    modeCurriculumTitle: "من المنهج",
    modeCurriculumBlurb: "اختر من بنوك الكلمات المضمّنة Set 1 / Set 2 / Set 3.",
    comingSoonBadge: "قريبًا",

    setNameLabel: "اسم القائمة",
    setNamePlaceholder: "مثال: الحيوانات — الوحدة 3",
    defaultSetNamePhoto: (date) => `صورة · ${date}`,
    defaultSetNamePaste: (date) => `لصق · ${date}`,
    defaultSetNameManual: (date) => `قائمة جديدة · ${date}`,

    manualHeading: "اكتب قائمتك",
    manualSubtitle: "أضف ما تشاء من الكلمات. الترجمات اختيارية — يمكنك إكمالها لاحقًا.",
    manualHeaderEnglish: "الإنجليزية",
    manualHeaderHebrew: "العبرية",
    manualHeaderArabic: "العربية",
    manualAddRow: "+ أضف صفًّا",
    manualRemoveRowAria: "إزالة الصف",
    manualEmptyHint: "اكتب كلمة في عمود الإنجليزية للبدء.",

    pasteHeading: "الصق قائمة كلمات",
    pasteSubtitle: "كلمة في كل سطر أو مفصولة بفواصل / فاصلة منقوطة.",
    pastePlaceholder: "lion\nelephant\ntiger\nzoo\n…",
    pasteExtract: "استخرج الكلمات",
    pasteExtracting: "جارٍ الاستخراج والترجمة…",
    pasteExtractedCount: (n) => `تم العثور على ${n} ${n === 1 ? "كلمة فريدة" : "كلمات فريدة"}.`,
    pasteEmpty: "الصق نصًا في الأعلى، ثم اضغط استخراج.",

    photoHeading: "صَوِّر صفحة",
    photoSubtitle: "التقط صورة واضحة لقائمة الكلمات. سنستخرج الكلمات الإنجليزية ونترجمها.",
    photoTrigger: "اختر صورة",
    photoProcessing: "نقرأ الصفحة…",
    photoStatusCompressing: "ضغط الصورة…",
    photoStatusUploading: "جارٍ الرفع…",
    photoStatusTranslating: "الترجمة إلى العبرية + العربية…",
    photoExtractedCount: (n) => `تم العثور على ${n} ${n === 1 ? "كلمة" : "كلمات"} في الصفحة.`,
    photoNoWords: "لم تُكتشف كلمات — قد لا تكون الصورة واضحة. حاول التقاط صورة أقرب بإضاءة أفضل.",

    reviewHeading: "مراجعة الكلمات",
    reviewSubtitle: (n) => `${n} ${n === 1 ? "كلمة" : "كلمات"} جاهزة للحفظ. عدّل أو احذف أي شيء غير صحيح.`,
    reviewRemoveAria: "إزالة الكلمة",

    privacyNotice:
      "ملفك يُعالَج بشكل خاص لاستخراج الكلمات، ثم يُحذف خلال 72 ساعة. لا نشارك موادك ولا نفهرسها ولا نحتفظ بها.",

    errorNoWords: "أضف كلمة واحدة على الأقل قبل الحفظ.",
    errorSave: "تعذّر حفظ القائمة. حاول مرة أخرى.",
    errorExtract: "تعذّر استخراج الكلمات. حاول مرة أخرى.",
    toastSaved: (name) => `تم حفظ "${name}" في مكتبتك 📚`,
  },
  ru: {
    modalTitle: "Build a Vocabulary Set",
    modalCloseAria: "Close",
    back: "Back",
    cancel: "Cancel",
    save: "Save to library",
    saving: "Saving…",

    pickSourceHeading: "How would you like to start?",
    pickSourceSubtitle: "Pick any source — the words land in a new Set you can use anywhere.",
    modeManualTitle: "Type manually",
    modeManualBlurb: "Add words by hand. Best for short lists.",
    modePasteTitle: "Type or paste",
    modePasteBlurb: "Type words, or paste a list. One per line or comma-separated.",
    modePhotoTitle: "Photo or image",
    modePhotoBlurb: "Snap a photo, pick from gallery, or upload a screenshot. AI extracts the words.",
    modeUploadTitle: "Upload a document",
    modeUploadBlurb: "Upload a PDF or Word file to extract from.",
    modeAiTitle: "Generate with AI",
    modeAiBlurb: "Describe a topic — AI proposes a level-appropriate word list.",
    modeCurriculumTitle: "From curriculum",
    modeCurriculumBlurb: "Pick from the built-in Set 1 / Set 2 / Set 3 word banks.",
    comingSoonBadge: "Soon",

    setNameLabel: "Set name",
    setNamePlaceholder: "e.g. Animals — Unit 3",
    defaultSetNamePhoto: (date) => `Photo · ${date}`,
    defaultSetNamePaste: (date) => `Pasted · ${date}`,
    defaultSetNameManual: (date) => `New set · ${date}`,

    manualHeading: "Type your word list",
    manualSubtitle: "Add as many words as you need. Translations are optional — you can fill them in later.",
    manualHeaderEnglish: "English",
    manualHeaderHebrew: "Hebrew",
    manualHeaderArabic: "Arabic",
    manualAddRow: "+ Add row",
    manualRemoveRowAria: "Remove row",
    manualEmptyHint: "Type a word in the English column to get started.",

    pasteHeading: "Paste a word list",
    pasteSubtitle: "One word per line, or separated by commas / semicolons.",
    pastePlaceholder: "lion\nelephant\ntiger\nzoo\n…",
    pasteExtract: "Extract words",
    pasteExtracting: "Extracting + translating…",
    pasteExtractedCount: (n) => `Found ${n} unique ${n === 1 ? "word" : "words"}.`,
    pasteEmpty: "Paste some text above, then tap Extract.",

    photoHeading: "Photograph a page",
    photoSubtitle: "Snap a clear photo of your word list. We'll extract the English words and translate them.",
    photoTrigger: "Choose a photo",
    photoProcessing: "Reading the page…",
    photoStatusCompressing: "Compressing image…",
    photoStatusUploading: "Uploading…",
    photoStatusTranslating: "Translating to Hebrew + Arabic…",
    photoExtractedCount: (n) => `Found ${n} ${n === 1 ? "word" : "words"} on the page.`,
    photoNoWords: "No words detected — the photo may be unclear. Try a closer shot with better lighting.",

    reviewHeading: "Review the words",
    reviewSubtitle: (n) => `${n} ${n === 1 ? "word" : "words"} ready to save. Edit or remove anything that's wrong.`,
    reviewRemoveAria: "Remove word",

    privacyNotice:
      "Your file is processed privately to extract words, then deleted within 72 hours. We don't share, index, or keep your materials.",

    errorNoWords: "Add at least one word before saving.",
    errorSave: "Couldn't save the set. Please try again.",
    errorExtract: "Couldn't extract words. Please try again.",
    toastSaved: (name) => `Saved "${name}" to your library 📚`,
  },
};
