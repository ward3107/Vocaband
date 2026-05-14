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
  downloadSpellingTest: string;
  downloadScramble: string;
  downloadQuiz: string;
  downloadCrossword: string;
  downloadCloze: string;
  downloadTracing: string;
  downloadMemory: string;
  downloadPictionary: string;
  downloadParent: string;
  // Category headers in the resource card
  categoryPractice: string;
  categoryGames: string;
  categoryAssess: string;
  categoryFamily: string;
  // Mobile-only disclosure that hides the full format grid behind a tap
  moreFormats: string;
  hideFormats: string;
  // Preview-modal status while the iframe is rendering the worksheet
  previewLoading: string;
  // Theme bundles section
  bundlesTitle: string;
  bundlesSubtitle: string;
  bundleBackToSchool: string;
  bundleBackToSchoolDesc: string;
  bundleHolidays: string;
  bundleHolidaysDesc: string;
  bundleEndOfYear: string;
  bundleEndOfYearDesc: string;
  bundleDownload: string;
  bundleComingSoon: string;
  // Audio MP3 zip
  audioZipTitle: string;
  audioZipDesc: string;
  audioZipDownload: string;
  audioZipComingSoon: string;
  // Google Slides
  slidesTitle: string;
  slidesDesc: string;
  slidesOpen: string;

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

  // Bingo-only settings
  bingoGridSizeLabel: string;
  bingoCardCountLabel: string;
  bingoCallersTitle: string;
  bingoCallersInstructions: string;

  // Teacher-only solution sheet appended to puzzle/quiz worksheets.
  // Optional — defaults to on, but teachers can untick to print a
  // clean student-facing copy.
  includeAnswerKeyLabel: string;

  // PDF export progress overlay — three stages so the wait feels
  // staged instead of frozen. exportTip is the secondary line that
  // tells the teacher roughly how long it'll take.
  exportPreparing: string;
  exportRendering: string;
  exportSaving: string;
  exportTip: string;

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
    downloadSpellingTest: "Spelling Test",
    downloadScramble: "Word Scramble",
    downloadQuiz: "Vocab Quiz",
    downloadCrossword: "Crossword",
    downloadCloze: "Cloze Reading",
    downloadTracing: "Tracing Practice",
    downloadMemory: "Memory Match",
    downloadPictionary: "Pictionary",
    downloadParent: "Parent Handout",
    categoryPractice: "Practice",
    categoryGames: "Games",
    categoryAssess: "Assess",
    categoryFamily: "Family",
    moreFormats: "More formats",
    hideFormats: "Hide formats",
    previewLoading: "Preparing preview…",
    bundlesTitle: "Theme Bundles",
    bundlesSubtitle: "Curated multi-topic packs ready to print and use across the year",
    bundleBackToSchool: "Back to School",
    bundleBackToSchoolDesc: "First-week classroom essentials — School, Family and Numbers, all formats included.",
    bundleHolidays: "Winter Holidays",
    bundleHolidaysDesc: "Seasonal vocabulary for Hanukkah, Christmas and Eid — perfect for festive lessons.",
    bundleEndOfYear: "End-of-Year Review",
    bundleEndOfYearDesc: "All Sets 1–3 essentials in one comprehensive review pack.",
    bundleDownload: "Download bundle (ZIP)",
    bundleComingSoon: "Coming soon",
    audioZipTitle: "Audio Pack",
    audioZipDesc: "Download all word audio for this topic as a ZIP — play offline in class.",
    audioZipDownload: "Download audio (ZIP)",
    audioZipComingSoon: "Coming soon",
    slidesTitle: "Use as Google Slides",
    slidesDesc: "Open an editable Google Slides template you can copy and customise.",
    slidesOpen: "Open template",

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

    bingoGridSizeLabel: "Grid",
    bingoCardCountLabel: "Cards",
    bingoCallersTitle: "Caller's Checklist",
    bingoCallersInstructions: "Read these English words to the class in any order. Tick each word as you call it.",

    includeAnswerKeyLabel: "Include answer key",

    exportPreparing: "Preparing your worksheet…",
    exportRendering: "Rendering pages…",
    exportSaving: "Saving your PDF…",
    exportTip: "This usually takes a few seconds. Please don't close this window.",

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
    downloadSpellingTest: "מבחן איות",
    downloadScramble: "ערבוב אותיות",
    downloadQuiz: "מבחן אוצר מילים",
    downloadCrossword: "תשבץ",
    downloadCloze: "קריאה והשלמה",
    downloadTracing: "תרגול כתיבה",
    downloadMemory: "משחק זיכרון",
    downloadPictionary: "כרטיסי ציור",
    downloadParent: "מדריך להורה",
    categoryPractice: "תרגול",
    categoryGames: "משחקים",
    categoryAssess: "הערכה",
    categoryFamily: "משפחה",
    moreFormats: "פורמטים נוספים",
    hideFormats: "הסתר פורמטים",
    previewLoading: "מכין תצוגה מקדימה…",
    bundlesTitle: "חבילות לפי נושא",
    bundlesSubtitle: "חבילות רב-נושאיות מוכנות להדפסה לאורך כל השנה",
    bundleBackToSchool: "חזרה לבית הספר",
    bundleBackToSchoolDesc: "חיוני לשבוע הראשון בכיתה — בית ספר, משפחה ומספרים, כל הפורמטים כלולים.",
    bundleHolidays: "חגי החורף",
    bundleHolidaysDesc: "אוצר מילים עונתי לחנוכה, חג המולד ועיד — מושלם לשיעורי חג.",
    bundleEndOfYear: "סיכום סוף שנה",
    bundleEndOfYearDesc: "כל החיוני מסטים 1–3 בחבילת סיכום מקיפה אחת.",
    bundleDownload: "הורד חבילה (ZIP)",
    bundleComingSoon: "בקרוב",
    audioZipTitle: "חבילת אודיו",
    audioZipDesc: "הורידו את כל קובצי האודיו של הנושא כ-ZIP — נגנו אופליין בכיתה.",
    audioZipDownload: "הורד אודיו (ZIP)",
    audioZipComingSoon: "בקרוב",
    slidesTitle: "השתמשו ב-Google Slides",
    slidesDesc: "פתחו תבנית Google Slides לעריכה שניתן להעתיק ולהתאים אישית.",
    slidesOpen: "פתח תבנית",

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

    bingoGridSizeLabel: "רשת",
    bingoCardCountLabel: "כרטיסים",
    bingoCallersTitle: "רשימת הקראה למורה",
    bingoCallersInstructions: "הקריאו לתלמידים את המילים באנגלית בכל סדר שתבחרו. סמנו כל מילה אחרי שהקראתם אותה.",

    includeAnswerKeyLabel: "כלול דף פתרונות",

    exportPreparing: "מכין את הדף…",
    exportRendering: "מעבד עמודים…",
    exportSaving: "שומר PDF…",
    exportTip: "זה לוקח בדרך כלל כמה שניות. אנא אל תסגרו את החלון.",

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
    downloadSpellingTest: "اختبار الإملاء",
    downloadScramble: "ترتيب الحروف",
    downloadQuiz: "اختبار المفردات",
    downloadCrossword: "الكلمات المتقاطعة",
    downloadCloze: "قراءة وملء الفراغات",
    downloadTracing: "تمرين الكتابة",
    downloadMemory: "لعبة الذاكرة",
    downloadPictionary: "بطاقات الرسم",
    downloadParent: "دليل ولي الأمر",
    categoryPractice: "تدريب",
    categoryGames: "ألعاب",
    categoryAssess: "تقييم",
    categoryFamily: "العائلة",
    moreFormats: "تنسيقات إضافية",
    hideFormats: "إخفاء التنسيقات",
    previewLoading: "جارٍ تحضير المعاينة…",
    bundlesTitle: "حزم حسب الموضوع",
    bundlesSubtitle: "حزم متعددة المواضيع جاهزة للطباعة والاستخدام طوال العام",
    bundleBackToSchool: "العودة إلى المدرسة",
    bundleBackToSchoolDesc: "أساسيات الأسبوع الأول في الصف — المدرسة والعائلة والأرقام، جميع التنسيقات مضمّنة.",
    bundleHolidays: "أعياد الشتاء",
    bundleHolidaysDesc: "مفردات موسمية لحانوكا وعيد الميلاد والعيد — مثالية للدروس الاحتفالية.",
    bundleEndOfYear: "مراجعة نهاية العام",
    bundleEndOfYearDesc: "جميع أساسيات المجموعات 1-3 في حزمة مراجعة شاملة واحدة.",
    bundleDownload: "تنزيل الحزمة (ZIP)",
    bundleComingSoon: "قريبًا",
    audioZipTitle: "حزمة الصوت",
    audioZipDesc: "نزّلوا جميع ملفات الصوت لهذا الموضوع كـ ZIP — للتشغيل دون اتصال في الصف.",
    audioZipDownload: "تنزيل الصوت (ZIP)",
    audioZipComingSoon: "قريبًا",
    slidesTitle: "استخدم كـ Google Slides",
    slidesDesc: "افتح قالب Google Slides قابل للتعديل يمكنك نسخه وتخصيصه.",
    slidesOpen: "فتح القالب",

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

    bingoGridSizeLabel: "الشبكة",
    bingoCardCountLabel: "البطاقات",
    bingoCallersTitle: "قائمة المعلم للنداء",
    bingoCallersInstructions: "اقرأ هذه الكلمات الإنجليزية للصف بأي ترتيب. ضع علامة على كل كلمة بعد قراءتها.",

    includeAnswerKeyLabel: "أرفق مفتاح الإجابة",

    exportPreparing: "جارٍ تحضير الورقة…",
    exportRendering: "جارٍ معالجة الصفحات…",
    exportSaving: "جارٍ حفظ ملف PDF…",
    exportTip: "يستغرق هذا عادة بضع ثوانٍ. يُرجى عدم إغلاق النافذة.",

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
