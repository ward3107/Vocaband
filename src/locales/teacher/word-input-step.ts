/**
 * word-input-step.ts — i18n strings for WordInputStep2026 (the
 * "Step 1: choose your words" screen of the assignment / Quick Play
 * setup wizard).
 *
 * The component already centralised all strings in a single TEXT
 * const, so this file mirrors that exact shape per language and the
 * component picks the right one off `useLanguage().language`.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface WordInputStepStrings {
  pasteTitle: string;
  pastePlaceholder: string;
  pasteTip: string;
  analyzeButton: string;
  analyzing: string;
  or: string;
  topicPacks: string;
  savedGroups: string;
  browseLibrary: string;
  ocr: string;
  ocrSubtitle: string;
  view: string;
  upload: string;
  packs: string;
  groups: string;
  words: string;
  wordsSelected: string;
  ready: string;
  readyDesc: string;
  needsWork: string;
  needsWorkDesc: string;
  fixTranslations: string;
  translateMissing: (n: number) => string;
  translating: string;
  done: string;
  fix: string;
  addTranslation: string;
  continue: string;
  back: string;
  cancel: string;
  addWords: string;
  camera: string;
  gallery: string;
  uploading: string;
  extracting: string;
  ocrError: string;
  ocrErrorDesc: string;
  tryAgain: string;
  wordsFound: string;
  reviewWords: string;
  new: string;
  noSavedGroups: string;
  saveGroupHint: string;
  searchPlaceholder: string;
  showingFirst: string;
  refineSearch: string;
  addSelectedPacks: string;
  addSelectedWords: string;
  chooseFile: string;
  noFileSelected: string;
  translationLang: string;
  bothLang: string;
  hebrewOnly: string;
  arabicOnly: string;
  clearAll: string;
  clearAllConfirm: string;
  selectWords: string;
  allWords: string;
  addSelected: string;
  alreadyAdded: string;
  aiGenerate: string;
  aiGenerateSubtitle: string;
  aiGenerateCard: string;

  // Translation editor (added Phase 2 i18n)
  editTranslations: string;
  enterHebrew: string;
  enterArabic: string;
  enterRussian: string;
  renameGroupAria: (name: string) => string;
  deleteGroupAria: (name: string) => string;
}

export const wordInputStepT: Record<Language, WordInputStepStrings> = {
  en: {
    pasteTitle: "Paste your word list here",
    pastePlaceholder: "apple, banana, orange, grape",
    pasteTip: "Separate words with commas, spaces, or lines",
    analyzeButton: "Analyze & Add Words",
    analyzing: "Analyzing...",
    or: "OR",
    topicPacks: "Topic Packs",
    savedGroups: "Saved Groups",
    browseLibrary: "Browse Library",
    ocr: "Scan & Upload",
    ocrSubtitle: "Photo to text",
    view: "View",
    upload: "Upload",
    packs: "packs",
    groups: "groups",
    words: "words",
    wordsSelected: "words selected",
    ready: "READY",
    readyDesc: "All words have translations",
    needsWork: "NEEDS WORK",
    needsWorkDesc: "Missing translations",
    fixTranslations: "Fix Missing Translations",
    translateMissing: (n) => `Translate ${n} missing word${n === 1 ? "" : "s"}`,
    translating: "Translating…",
    done: "Done",
    fix: "Fix",
    addTranslation: "Add translation",
    continue: "Continue to Step 2",
    back: "Back",
    cancel: "Cancel",
    addWords: "Add Words",
    camera: "Camera",
    gallery: "Gallery",
    uploading: "Uploading...",
    extracting: "Extracting words...",
    ocrError: "No words detected",
    ocrErrorDesc: "Try a clearer photo or different angle",
    tryAgain: "Try Again",
    wordsFound: "words found",
    reviewWords: "Review and edit before adding:",
    new: "new",
    noSavedGroups: "No saved groups yet",
    saveGroupHint: "Create a group from your selected words",
    searchPlaceholder: "Search words...",
    showingFirst: "Showing first 100",
    refineSearch: "refine your search",
    addSelectedPacks: "Add selected packs",
    addSelectedWords: "Add selected words",
    chooseFile: "Choose File",
    noFileSelected: "No file selected",
    translationLang: "Translation Language",
    bothLang: "Both",
    hebrewOnly: "Hebrew Only",
    arabicOnly: "Arabic Only",
    clearAll: "Clear All",
    clearAllConfirm: "Are you sure you want to remove all words?",
    selectWords: "Select words to add:",
    allWords: "All words",
    addSelected: "Add selected words",
    alreadyAdded: "Already added",
    aiGenerate: "AI Generate",
    aiGenerateSubtitle: "Topic to words",
    aiGenerateCard: "✨ Generate",
    editTranslations: "Edit Translations",
    enterHebrew: "Enter Hebrew translation",
    enterArabic: "Enter Arabic translation",
    enterRussian: "Enter Russian translation",
    renameGroupAria: (name) => `Rename ${name}`,
    deleteGroupAria: (name) => `Delete ${name}`,
  },
  he: {
    pasteTitle: "הדביקו כאן את רשימת המילים שלכם",
    pastePlaceholder: "תפוח, בננה, תפוז, ענב",
    pasteTip: "הפרידו מילים בפסיקים, רווחים או שורות",
    analyzeButton: "נתח והוסף מילים",
    analyzing: "מנתח...",
    or: "או",
    topicPacks: "חבילות נושא",
    savedGroups: "קבוצות שמורות",
    browseLibrary: "עיין בספרייה",
    ocr: "סרוק והעלה",
    ocrSubtitle: "תמונה לטקסט",
    view: "תצוגה",
    upload: "העלה",
    packs: "חבילות",
    groups: "קבוצות",
    words: "מילים",
    wordsSelected: "מילים נבחרו",
    ready: "מוכן",
    readyDesc: "לכל המילים יש תרגום",
    needsWork: "דורש עבודה",
    needsWorkDesc: "חסרים תרגומים",
    fixTranslations: "תקן תרגומים חסרים",
    translateMissing: (n) => `תרגם ${n} מילים חסרות`,
    translating: "מתרגם…",
    done: "סיום",
    fix: "תקן",
    addTranslation: "הוסף תרגום",
    continue: "המשך לשלב 2",
    back: "חזור",
    cancel: "ביטול",
    addWords: "הוסף מילים",
    camera: "מצלמה",
    gallery: "גלריה",
    uploading: "מעלה...",
    extracting: "מחלץ מילים...",
    ocrError: "לא זוהו מילים",
    ocrErrorDesc: "נסו תמונה בהירה יותר או זווית אחרת",
    tryAgain: "נסו שוב",
    wordsFound: "מילים נמצאו",
    reviewWords: "סקרו וערכו לפני ההוספה:",
    new: "חדש",
    noSavedGroups: "עדיין אין קבוצות שמורות",
    saveGroupHint: "צרו קבוצה מהמילים שבחרתם",
    searchPlaceholder: "חיפוש מילים...",
    showingFirst: "מציג 100 ראשונות",
    refineSearch: "צמצמו את החיפוש",
    addSelectedPacks: "הוסף חבילות נבחרות",
    addSelectedWords: "הוסף מילים נבחרות",
    chooseFile: "בחר קובץ",
    noFileSelected: "לא נבחר קובץ",
    translationLang: "שפת תרגום",
    bothLang: "שתיהן",
    hebrewOnly: "עברית בלבד",
    arabicOnly: "ערבית בלבד",
    clearAll: "נקה הכל",
    clearAllConfirm: "האם אתם בטוחים שברצונכם להסיר את כל המילים?",
    selectWords: "בחרו מילים להוספה:",
    allWords: "כל המילים",
    addSelected: "הוסף מילים נבחרות",
    alreadyAdded: "כבר נוסף",
    aiGenerate: "יצירה ב-AI",
    aiGenerateSubtitle: "נושא למילים",
    aiGenerateCard: "✨ צור",
    editTranslations: "ערוך תרגומים",
    enterHebrew: "הקלידו תרגום בעברית",
    enterArabic: "הקלידו תרגום בערבית",
    enterRussian: "הקלידו תרגום ברוסית",
    renameGroupAria: (name) => `שנה שם ל-${name}`,
    deleteGroupAria: (name) => `מחק ${name}`,
  },
  ar: {
    pasteTitle: "الصق قائمة المفردات هنا",
    pastePlaceholder: "تفاحة، موزة، برتقال، عنب",
    pasteTip: "افصل بين الكلمات بفواصل أو مسافات أو أسطر",
    analyzeButton: "حلّل وأضف الكلمات",
    analyzing: "جارٍ التحليل...",
    or: "أو",
    topicPacks: "حزم المواضيع",
    savedGroups: "المجموعات المحفوظة",
    browseLibrary: "تصفّح المكتبة",
    ocr: "مسح ورفع",
    ocrSubtitle: "صورة إلى نص",
    view: "عرض",
    upload: "رفع",
    packs: "حزم",
    groups: "مجموعات",
    words: "كلمات",
    wordsSelected: "كلمة مختارة",
    ready: "جاهز",
    readyDesc: "جميع الكلمات لها ترجمات",
    needsWork: "بحاجة إلى عمل",
    needsWorkDesc: "ترجمات ناقصة",
    fixTranslations: "إصلاح الترجمات الناقصة",
    translateMissing: (n) => `ترجمة ${n} كلمات ناقصة`,
    translating: "جارٍ الترجمة…",
    done: "تم",
    fix: "إصلاح",
    addTranslation: "إضافة ترجمة",
    continue: "متابعة إلى الخطوة 2",
    back: "رجوع",
    cancel: "إلغاء",
    addWords: "إضافة كلمات",
    camera: "الكاميرا",
    gallery: "المعرض",
    uploading: "جارٍ الرفع...",
    extracting: "جارٍ استخراج الكلمات...",
    ocrError: "لم يتم اكتشاف كلمات",
    ocrErrorDesc: "جرّب صورة أوضح أو زاوية مختلفة",
    tryAgain: "حاول مرة أخرى",
    wordsFound: "كلمة موجودة",
    reviewWords: "راجع وعدّل قبل الإضافة:",
    new: "جديد",
    noSavedGroups: "لا توجد مجموعات محفوظة بعد",
    saveGroupHint: "أنشئ مجموعة من الكلمات المختارة",
    searchPlaceholder: "ابحث عن كلمات...",
    showingFirst: "عرض أول 100",
    refineSearch: "ضيّق بحثك",
    addSelectedPacks: "إضافة الحزم المختارة",
    addSelectedWords: "إضافة الكلمات المختارة",
    chooseFile: "اختر ملفًا",
    noFileSelected: "لم يتم اختيار ملف",
    translationLang: "لغة الترجمة",
    bothLang: "كلاهما",
    hebrewOnly: "العبرية فقط",
    arabicOnly: "العربية فقط",
    clearAll: "مسح الكل",
    clearAllConfirm: "هل أنت متأكد أنك تريد إزالة كل الكلمات؟",
    selectWords: "اختر كلمات لإضافتها:",
    allWords: "كل الكلمات",
    addSelected: "إضافة الكلمات المختارة",
    alreadyAdded: "تمت الإضافة بالفعل",
    aiGenerate: "توليد بالذكاء",
    aiGenerateSubtitle: "موضوع إلى كلمات",
    aiGenerateCard: "✨ توليد",
    editTranslations: "تعديل الترجمات",
    enterHebrew: "أدخل الترجمة العبرية",
    enterArabic: "أدخل الترجمة العربية",
    enterRussian: "أدخل الترجمة الروسية",
    renameGroupAria: (name) => `إعادة تسمية ${name}`,
    deleteGroupAria: (name) => `حذف ${name}`,
  },
};
