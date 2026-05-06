import type { Language } from "../../hooks/useLanguage";

export interface FreeResourcesT {
  backButton: string;
  title: string;
  subtitle: string;

  // Section heading - Topic Packs
  topicPacksTitle: string;
  topicPacksSubtitle: string;
  topicPackDescription: string; // has {count} placeholder
  topicPackSize: string; // has {words} and {pages} placeholders

  // Free resources pill above the title
  freeResourcesPill: string;

  // Download buttons
  download: string;
  downloading: string;
  downloadMatching: string;
  downloadFlashcards: string;
  downloadBingo: string;
  downloadWordSearch: string;
  downloadFillBlank: string;

  // Preview modal
  previewTitle: string;
  print: string;
  cancel: string;
  closePreview: string;

  // Letter case toggle (English only — students who don't yet know
  // capital vs. small letters benefit from a single consistent case).
  casingLabel: string;
  casingOriginal: string;
  casingLower: string;
  casingUpper: string;

  // Audio QR codes — students scan with a phone to hear pronunciation.
  audioQRLabel: string;

  // Topic search
  searchPlaceholder: string;
  searchResults: string; // {matched} of {total} packs
  searchClear: string;
  searchEmpty: string;

  // Customization panel
  settingsLabel: string;
  fontSizeLabel: string;
  fontSizeSmall: string;
  fontSizeMedium: string;
  fontSizeLarge: string;
  inkSaverLabel: string;
  showTranslationsLabel: string;
  wordsPerPageLabel: string;
  orientationLabel: string;
  orientationPortrait: string;
  orientationLandscape: string;

  // Matching Practice
  matchingPracticeTitle: string;
  matchingPracticeSubtitle: string;
  matchingPracticeHebrew: string;
  matchingPracticeArabic: string;
  matchingPracticeDescription: string;

  // CTA
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
}

export const freeResourcesT: Record<Language, FreeResourcesT> = {
  en: {
    backButton: "Back",
    title: "Free Resources",
    subtitle: "Downloadable vocabulary lists by topic",

    topicPacksTitle: "Topic-Based Vocabulary Packs",
    topicPacksSubtitle: "Download word lists organized by topic for easy printing and sharing",
    topicPackDescription: "Essential vocabulary words for this topic. Perfect for classroom use and self-study.",
    topicPackSize: "{words} words • {pages} pages",

    freeResourcesPill: "Free Resources",

    download: "Download PDF",
    downloading: "Downloading...",
    downloadMatching: "Matching Exercise",
    downloadFlashcards: "Flashcards",
    downloadBingo: "Bingo Cards",
    downloadWordSearch: "Word Search",
    downloadFillBlank: "Fill in the Blank",

    previewTitle: "Preview",
    print: "Print",
    cancel: "Cancel",
    closePreview: "Close preview",

    casingLabel: "Letter case",
    casingOriginal: "As is",
    casingLower: "abc",
    casingUpper: "ABC",

    audioQRLabel: "Audio QR",

    searchPlaceholder: "Search topic packs…",
    searchResults: "{matched} of {total} packs",
    searchClear: "Clear search",
    searchEmpty: "No packs match your search.",

    settingsLabel: "Settings",
    fontSizeLabel: "Font size",
    fontSizeSmall: "S",
    fontSizeMedium: "M",
    fontSizeLarge: "L",
    inkSaverLabel: "Ink saver (B&W)",
    showTranslationsLabel: "Show translations",
    wordsPerPageLabel: "Words per page",
    orientationLabel: "Orientation",
    orientationPortrait: "Portrait",
    orientationLandscape: "Landscape",

    matchingPracticeTitle: "Interactive Practice",
    matchingPracticeSubtitle: "Practice matching words with translations",
    matchingPracticeHebrew: "English ↔ Hebrew",
    matchingPracticeArabic: "English ↔ Arabic",
    matchingPracticeDescription: "Play an interactive matching game to test your vocabulary skills.",

    ctaTitle: "Want more?",
    ctaText: "Join thousands of teachers using Vocaband to make vocabulary practice engaging and effective.",
    ctaButton: "Get Started Free",
  },

  he: {
    backButton: "חזרה",
    title: "משאבים בחינם",
    subtitle: "רשימות אוצר מילים לפי נושא להורדה",

    topicPacksTitle: "חבילות אוצר מילים לפי נושאים",
    topicPacksSubtitle: "הורידו רשימות מילים מאורגנות לפי נושא להדפסה ושיתוף קל",
    topicPackDescription: "מילים חיוניות לנושא זה. מושלם לשימוש בכיתה וללמידה עצמאית.",
    topicPackSize: "{words} מילים • {pages} עמודים",

    freeResourcesPill: "משאבים בחינם",

    download: "הורד PDF",
    downloading: "מוריד...",
    downloadMatching: "תרגיל התאמה",
    downloadFlashcards: "כרטיסיות",
    downloadBingo: "כרטיסי בינגו",
    downloadWordSearch: "חיפוש מילים",
    downloadFillBlank: "השלמת חסר",

    previewTitle: "תצוגה מקדימה",
    print: "הדפסה",
    cancel: "ביטול",
    closePreview: "סגור תצוגה מקדימה",

    casingLabel: "אותיות",
    casingOriginal: "כפי שהוא",
    casingLower: "abc",
    casingUpper: "ABC",

    audioQRLabel: "קודי QR לאודיו",

    searchPlaceholder: "חיפוש חבילות נושאים…",
    searchResults: "{matched} מתוך {total} חבילות",
    searchClear: "נקה חיפוש",
    searchEmpty: "לא נמצאו חבילות התואמות לחיפוש.",

    settingsLabel: "הגדרות",
    fontSizeLabel: "גודל גופן",
    fontSizeSmall: "S",
    fontSizeMedium: "M",
    fontSizeLarge: "L",
    inkSaverLabel: "חיסכון בדיו (שחור-לבן)",
    showTranslationsLabel: "הצג תרגומים",
    wordsPerPageLabel: "מילים לעמוד",
    orientationLabel: "כיוון דף",
    orientationPortrait: "לאורך",
    orientationLandscape: "לרוחב",

    matchingPracticeTitle: "תרגול אינטראקטיבי",
    matchingPracticeSubtitle: "תרגל התאמת מילים עם תרגומים",
    matchingPracticeHebrew: "אנגלית ↔ עברית",
    matchingPracticeArabic: "אנגלית ↔ ערבית",
    matchingPracticeDescription: "שחקו משחק התאמה אינטראקטיבי לבדיקת הידע שלכם.",

    ctaTitle: "רוצים עוד?",
    ctaText: "הצטרפו לאלפי המורים שמשתמשים ב-Vocaband כדי להפוך את תרגול אוצר המילים למהנה ואפקטיבי.",
    ctaButton: "התחילו בחינם",
  },

  ar: {
    backButton: "رجوع",
    title: "موارد مجانية",
    subtitle: "قوائم مفردات حسب الموضوع للتنزيل",

    topicPacksTitle: "حزم المفردات حسب الموضوع",
    topicPacksSubtitle: "نزّل قوائم الكلمات المنظمة حسب الموضوع للطباعة والمشاركة السهولة",
    topicPackDescription: "كلمات أساسية لهذا الموضوع. مثالية للاستخدام في الصف والدراسة الذاتية.",
    topicPackSize: "{words} كلمات • {pages} صفحات",

    freeResourcesPill: "موارد مجانية",

    download: "تنزيل PDF",
    downloading: "جاري التنزيل...",
    downloadMatching: "تمرين المطابقة",
    downloadFlashcards: "بطاقات تعليمية",
    downloadBingo: "بطاقات البينغو",
    downloadWordSearch: "بحث الكلمات",
    downloadFillBlank: "املأ الفراغ",

    previewTitle: "معاينة",
    print: "طباعة",
    cancel: "إلغاء",
    closePreview: "إغلاق المعاينة",

    casingLabel: "حالة الأحرف",
    casingOriginal: "كما هي",
    casingLower: "abc",
    casingUpper: "ABC",

    audioQRLabel: "رموز QR صوتية",

    searchPlaceholder: "ابحث عن حزم المواضيع…",
    searchResults: "{matched} من {total} حزمة",
    searchClear: "مسح البحث",
    searchEmpty: "لا توجد حزم تطابق بحثك.",

    settingsLabel: "إعدادات",
    fontSizeLabel: "حجم الخط",
    fontSizeSmall: "S",
    fontSizeMedium: "M",
    fontSizeLarge: "L",
    inkSaverLabel: "توفير الحبر (أبيض وأسود)",
    showTranslationsLabel: "إظهار الترجمات",
    wordsPerPageLabel: "كلمات في الصفحة",
    orientationLabel: "اتجاه الصفحة",
    orientationPortrait: "عمودي",
    orientationLandscape: "أفقي",

    matchingPracticeTitle: "تمرين تفاعلي",
    matchingPracticeSubtitle: "تدرب على مطابقة الكلمات مع الترجمات",
    matchingPracticeHebrew: "الإنجليزية ↔ العبرية",
    matchingPracticeArabic: "الإنجليزية ↔ العربية",
    matchingPracticeDescription: "العب لعبة المطابقة التفاعلية لاختبار مهاراتك في المفردات.",

    ctaTitle: "تريد المزيد؟",
    ctaText: "انضم إلى آلاف المعلمين الذين يستخدمون Vocaband لجعل ممارسة المفردات ممتعة وفعالة.",
    ctaButton: "ابدأ مجانًا",
  },
};
