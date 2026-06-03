/**
 * Locale strings for the Vocabulary Library (teacher-owned persistent
 * vocabulary storage). See VocabularyLibraryView and the migration at
 * supabase/migrations/20260621000000_vocabulary_library.sql.
 *
 * Pattern: see docs/I18N-MIGRATION.md. Strings are split per surface
 * (library shell / set detail / build wizard) for tree-shaking.
 */
import type { Language } from "../../hooks/useLanguage";

export interface VocabularyLibraryStrings {
  // Page chrome
  pageTitle: string;
  pageSubtitle: string;
  backToDashboard: string;

  // Top-level tabs
  tabAllSets: string;
  tabCollections: string;
  tabRecent: string;

  // CTAs
  newCollection: string;
  newSet: string;
  searchPlaceholder: string;

  // Empty states
  emptyLibraryTitle: string;
  emptyLibraryBlurb: string;
  emptyCollectionTitle: string;
  emptyCollectionBlurb: string;
  emptyRecentTitle: string;
  emptyRecentBlurb: string;

  // Source-type labels (matches DB CHECK constraint)
  sourceManual: string;
  sourcePaste: string;
  sourceOcrImage: string;
  sourceOcrDocument: string;
  sourceAiTopic: string;
  sourceAiAugment: string;
  sourceCurriculum: string;
  sourceImported: string;

  // Card meta
  wordsCount: (n: number) => string;
  collectionsCount: (n: number) => string;
  lastUsed: (when: string) => string;
  unfiledLabel: string;

  // Privacy notice shown on the upload step
  privacyNoticeTitle: string;
  privacyNoticeBody: string;

  // Drill-in (inside a collection)
  breadcrumbRoot: string;
  breadcrumbAria: string;
  tabSetsHere: string;
  tabSubFolders: string;
  emptySubfoldersBlurb: string;
  emptySetsHereBlurb: string;

  // Move / reparent
  moveAria: string;
  renameAria: string;
  deleteAria: string;
  renamePrompt: string;
  deleteConfirm: (name: string) => string;
  toastRenamed: string;
  moveModalTitle: (name: string) => string;
  movePickFolder: string;
  moveToRoot: string;
  moveCurrentLocation: (name: string) => string;
  moveConfirm: string;
  moveCancel: string;
  moveCannotIntoSelf: string;
  toastMoved: (name: string) => string;

  // Toasts
  toastCollectionCreated: (name: string) => string;
  toastSetSaved: (name: string) => string;
  toastDeleted: string;
  toastError: string;
}

export const vocabularyLibraryT: Record<Language, VocabularyLibraryStrings> = {
  en: {
    pageTitle: "Vocabulary Library",
    pageSubtitle: "Your saved word lists — name each after its book, unit, or page",
    backToDashboard: "Back to dashboard",

    tabAllSets: "My word lists",
    tabCollections: "Folders",
    tabRecent: "Recent",

    newCollection: "New folder",
    newSet: "New word list",
    searchPlaceholder: "Search your library…",

    emptyLibraryTitle: "Create your first word list",
    emptyLibraryBlurb:
      "Tap “New word list”, name it after the book, unit, or page (e.g. “English 6 · Unit 3”), then paste the words or snap a photo of the page. Everything you save here is reusable.",
    emptyCollectionTitle: "This collection is empty",
    emptyCollectionBlurb: "Add a vocabulary set or a sub-collection to get started.",
    emptyRecentTitle: "Nothing recent yet",
    emptyRecentBlurb: "Sets you use in assignments, worksheets, or Class Show will appear here.",

    sourceManual: "Typed",
    sourcePaste: "Pasted",
    sourceOcrImage: "From a photo",
    sourceOcrDocument: "From a document",
    sourceAiTopic: "AI from topic",
    sourceAiAugment: "AI expanded",
    sourceCurriculum: "Curriculum",
    sourceImported: "Imported",

    wordsCount: (n) => `${n} ${n === 1 ? "word" : "words"}`,
    collectionsCount: (n) => `${n} ${n === 1 ? "collection" : "collections"}`,
    lastUsed: (when) => `Last used ${when}`,
    unfiledLabel: "Unfiled",

    privacyNoticeTitle: "Your file stays private",
    privacyNoticeBody:
      "We process your file to extract vocabulary, then delete it within 72 hours. We don't share, index, or keep your materials. Only the extracted words are saved to your library.",

    breadcrumbRoot: "Library",
    breadcrumbAria: "Folder location",
    tabSetsHere: "Sets in this folder",
    tabSubFolders: "Sub-folders",
    emptySubfoldersBlurb: "No sub-folders here yet. Tap “New collection” to add one.",
    emptySetsHereBlurb: "No sets in this folder yet. Tap “New vocabulary set” to add one.",

    moveAria: "Move",
    renameAria: "Rename",
    deleteAria: "Delete",
    renamePrompt: "New name:",
    deleteConfirm: (name) => `Delete “${name}”? This can't be undone.`,
    toastRenamed: "Renamed",
    moveModalTitle: (name) => `Move “${name}”`,
    movePickFolder: "Pick a destination folder",
    moveToRoot: "Move to root (no folder)",
    moveCurrentLocation: (name) => `Currently in: ${name}`,
    moveConfirm: "Move here",
    moveCancel: "Cancel",
    moveCannotIntoSelf: "Can't move a folder into itself or one of its sub-folders.",
    toastMoved: (name) => `Moved “${name}”`,

    toastCollectionCreated: (name) => `Created “${name}”`,
    toastSetSaved: (name) => `Saved “${name}” to your library`,
    toastDeleted: "Deleted",
    toastError: "Something went wrong. Please try again.",
  },
  he: {
    pageTitle: "ספריית אוצר המילים",
    pageSubtitle: "רשימות המילים השמורות שלך — תנו שם לפי הספר, היחידה או העמוד",
    backToDashboard: "חזרה ללוח המורה",

    tabAllSets: "הרשימות שלי",
    tabCollections: "תיקיות",
    tabRecent: "אחרונים",

    newCollection: "תיקייה חדשה",
    newSet: "רשימת מילים חדשה",
    searchPlaceholder: "חיפוש בספרייה…",

    emptyLibraryTitle: "צרו את רשימת המילים הראשונה",
    emptyLibraryBlurb:
      "הקישו על “רשימת מילים חדשה”, תנו שם לפי הספר, היחידה או העמוד (למשל “אנגלית 6 · יחידה 3”), ואז הדביקו את המילים או צלמו את העמוד. כל מה שתשמרו כאן ניתן לשימוש חוזר.",
    emptyCollectionTitle: "האוסף הזה ריק",
    emptyCollectionBlurb: "הוסיפו רשימת מילים או תת־אוסף כדי להתחיל.",
    emptyRecentTitle: "עדיין אין פעילות אחרונה",
    emptyRecentBlurb: "רשימות שתשתמשו בהן במטלות, בדפי עבודה או ב־Class Show יופיעו כאן.",

    sourceManual: "הוקלד",
    sourcePaste: "הודבק",
    sourceOcrImage: "מצילום",
    sourceOcrDocument: "ממסמך",
    sourceAiTopic: "AI מנושא",
    sourceAiAugment: "AI הורחב",
    sourceCurriculum: "תוכנית הלימודים",
    sourceImported: "מיובא",

    wordsCount: (n) => `${n} ${n === 1 ? "מילה" : "מילים"}`,
    collectionsCount: (n) => `${n} ${n === 1 ? "אוסף" : "אוספים"}`,
    lastUsed: (when) => `שימוש אחרון: ${when}`,
    unfiledLabel: "לא בתיק",

    privacyNoticeTitle: "הקובץ שלכם נשאר פרטי",
    privacyNoticeBody:
      "אנחנו מעבדים את הקובץ כדי לחלץ ממנו מילים ואז מוחקים אותו תוך 72 שעות. איננו משתפים, מאנדקסים או שומרים את החומר שלכם. רק המילים המחולצות נשמרות בספרייה שלכם.",

    breadcrumbRoot: "ספרייה",
    breadcrumbAria: "מיקום בתיקייה",
    tabSetsHere: "רשימות בתיקייה",
    tabSubFolders: "תת־תיקיות",
    emptySubfoldersBlurb: "אין עדיין תת־תיקיות. הקישו על “אוסף חדש” כדי להוסיף.",
    emptySetsHereBlurb: "אין עדיין רשימות בתיקייה הזו. הקישו על “רשימת מילים חדשה” כדי להוסיף.",

    moveAria: "העברה",
    renameAria: "שינוי שם",
    deleteAria: "מחיקה",
    renamePrompt: "שם חדש:",
    deleteConfirm: (name) => `למחוק את "${name}"? אי אפשר לבטל.`,
    toastRenamed: "השם שונה",
    moveModalTitle: (name) => `העברת "${name}"`,
    movePickFolder: "בחרו תיקיית יעד",
    moveToRoot: "העבר לשורש (ללא תיקייה)",
    moveCurrentLocation: (name) => `נמצא כעת ב־${name}`,
    moveConfirm: "העבר לכאן",
    moveCancel: "ביטול",
    moveCannotIntoSelf: "לא ניתן להעביר תיקייה לתוך עצמה או לתת־תיקייה שלה.",
    toastMoved: (name) => `"${name}" הועבר`,

    toastCollectionCreated: (name) => `נוצר "${name}"`,
    toastSetSaved: (name) => `הרשימה "${name}" נשמרה בספרייה`,
    toastDeleted: "נמחק",
    toastError: "משהו השתבש. נסו שוב.",
  },
  ar: {
    pageTitle: "مكتبة المفردات",
    pageSubtitle: "قوائم الكلمات المحفوظة لديك — سمِّ كل واحدة باسم الكتاب أو الوحدة أو الصفحة",
    backToDashboard: "العودة إلى لوحة المعلّم",

    tabAllSets: "قوائمي",
    tabCollections: "المجلدات",
    tabRecent: "الأخيرة",

    newCollection: "مجلد جديد",
    newSet: "قائمة كلمات جديدة",
    searchPlaceholder: "ابحث في مكتبتك…",

    emptyLibraryTitle: "أنشئ أول قائمة كلمات",
    emptyLibraryBlurb:
      "اضغط على “قائمة كلمات جديدة”، وسمِّها باسم الكتاب أو الوحدة أو الصفحة (مثل “إنجليزي 6 · الوحدة 3”)، ثم الصق الكلمات أو التقط صورة للصفحة. كل ما تحفظه هنا قابل لإعادة الاستخدام.",
    emptyCollectionTitle: "هذه المجموعة فارغة",
    emptyCollectionBlurb: "أضف قائمة مفردات أو مجموعة فرعية للبدء.",
    emptyRecentTitle: "لا يوجد نشاط حديث بعد",
    emptyRecentBlurb: "ستظهر هنا القوائم التي تستخدمها في الواجبات أو أوراق العمل أو Class Show.",

    sourceManual: "مكتوبة يدويًا",
    sourcePaste: "ملصوقة",
    sourceOcrImage: "من صورة",
    sourceOcrDocument: "من مستند",
    sourceAiTopic: "AI من موضوع",
    sourceAiAugment: "AI موسّعة",
    sourceCurriculum: "المنهج",
    sourceImported: "مستوردة",

    wordsCount: (n) => `${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    collectionsCount: (n) => `${n} ${n === 1 ? "مجموعة" : "مجموعات"}`,
    lastUsed: (when) => `آخر استخدام: ${when}`,
    unfiledLabel: "غير مصنّفة",

    privacyNoticeTitle: "ملفك يبقى خاصًا",
    privacyNoticeBody:
      "نعالج ملفك لاستخراج المفردات ثم نحذفه خلال 72 ساعة. لا نشارك موادّك ولا نفهرسها ولا نحتفظ بها. فقط الكلمات المستخرَجة تُحفظ في مكتبتك.",

    breadcrumbRoot: "المكتبة",
    breadcrumbAria: "موقع المجلد",
    tabSetsHere: "القوائم في هذا المجلد",
    tabSubFolders: "المجلدات الفرعية",
    emptySubfoldersBlurb: "لا توجد مجلدات فرعية بعد. اضغط على “مجموعة جديدة” لإضافة واحدة.",
    emptySetsHereBlurb: "لا توجد قوائم في هذا المجلد بعد. اضغط على “قائمة مفردات جديدة” لإضافة قائمة.",

    moveAria: "نقل",
    renameAria: "إعادة تسمية",
    deleteAria: "حذف",
    renamePrompt: "الاسم الجديد:",
    deleteConfirm: (name) => `حذف "${name}"؟ لا يمكن التراجع.`,
    toastRenamed: "تمت إعادة التسمية",
    moveModalTitle: (name) => `نقل "${name}"`,
    movePickFolder: "اختر مجلد الوجهة",
    moveToRoot: "النقل إلى الجذر (بدون مجلد)",
    moveCurrentLocation: (name) => `الموقع الحالي: ${name}`,
    moveConfirm: "انقل هنا",
    moveCancel: "إلغاء",
    moveCannotIntoSelf: "لا يمكن نقل مجلد إلى نفسه أو إلى أحد مجلداته الفرعية.",
    toastMoved: (name) => `تم نقل "${name}"`,

    toastCollectionCreated: (name) => `تم إنشاء "${name}"`,
    toastSetSaved: (name) => `تم حفظ "${name}" في مكتبتك`,
    toastDeleted: "تم الحذف",
    toastError: "حدث خطأ ما. حاول مرة أخرى.",
  },
  ru: {
    pageTitle: "Vocabulary Library",
    pageSubtitle: "Your saved word lists — name each after its book, unit, or page",
    backToDashboard: "Back to dashboard",

    tabAllSets: "My word lists",
    tabCollections: "Folders",
    tabRecent: "Recent",

    newCollection: "New folder",
    newSet: "New word list",
    searchPlaceholder: "Search your library…",

    emptyLibraryTitle: "Create your first word list",
    emptyLibraryBlurb:
      "Tap “New word list”, name it after the book, unit, or page (e.g. “English 6 · Unit 3”), then paste the words or snap a photo of the page. Everything you save here is reusable.",
    emptyCollectionTitle: "This collection is empty",
    emptyCollectionBlurb: "Add a vocabulary set or a sub-collection to get started.",
    emptyRecentTitle: "Nothing recent yet",
    emptyRecentBlurb: "Sets you use in assignments, worksheets, or Class Show will appear here.",

    sourceManual: "Typed",
    sourcePaste: "Pasted",
    sourceOcrImage: "From a photo",
    sourceOcrDocument: "From a document",
    sourceAiTopic: "AI from topic",
    sourceAiAugment: "AI expanded",
    sourceCurriculum: "Curriculum",
    sourceImported: "Imported",

    wordsCount: (n) => `${n} ${n === 1 ? "word" : "words"}`,
    collectionsCount: (n) => `${n} ${n === 1 ? "collection" : "collections"}`,
    lastUsed: (when) => `Last used ${when}`,
    unfiledLabel: "Unfiled",

    privacyNoticeTitle: "Your file stays private",
    privacyNoticeBody:
      "We process your file to extract vocabulary, then delete it within 72 hours. We don't share, index, or keep your materials. Only the extracted words are saved to your library.",

    breadcrumbRoot: "Library",
    breadcrumbAria: "Folder location",
    tabSetsHere: "Sets in this folder",
    tabSubFolders: "Sub-folders",
    emptySubfoldersBlurb: "No sub-folders here yet. Tap “New collection” to add one.",
    emptySetsHereBlurb: "No sets in this folder yet. Tap “New vocabulary set” to add one.",

    moveAria: "Move",
    renameAria: "Rename",
    deleteAria: "Delete",
    renamePrompt: "New name:",
    deleteConfirm: (name) => `Delete “${name}”? This can't be undone.`,
    toastRenamed: "Renamed",
    moveModalTitle: (name) => `Move “${name}”`,
    movePickFolder: "Pick a destination folder",
    moveToRoot: "Move to root (no folder)",
    moveCurrentLocation: (name) => `Currently in: ${name}`,
    moveConfirm: "Move here",
    moveCancel: "Cancel",
    moveCannotIntoSelf: "Can't move a folder into itself or one of its sub-folders.",
    toastMoved: (name) => `Moved “${name}”`,

    toastCollectionCreated: (name) => `Created “${name}”`,
    toastSetSaved: (name) => `Saved “${name}” to your library`,
    toastDeleted: "Deleted",
    toastError: "Something went wrong. Please try again.",
  },
};
