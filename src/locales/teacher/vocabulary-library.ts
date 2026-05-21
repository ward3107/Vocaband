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

  // Toasts
  toastCollectionCreated: (name: string) => string;
  toastSetSaved: (name: string) => string;
  toastDeleted: string;
  toastError: string;
}

export const vocabularyLibraryT: Record<Language, VocabularyLibraryStrings> = {
  en: {
    pageTitle: "Vocabulary Library",
    pageSubtitle: "Your saved word lists, organized into collections",
    backToDashboard: "Back to dashboard",

    tabAllSets: "All sets",
    tabCollections: "Collections",
    tabRecent: "Recent",

    newCollection: "New collection",
    newSet: "New vocabulary set",
    searchPlaceholder: "Search your library…",

    emptyLibraryTitle: "Your library is empty",
    emptyLibraryBlurb:
      "Build a vocabulary set from a photo of a page, a paste, a topic, or by typing words manually. Everything you create is saved here for reuse.",
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

    toastCollectionCreated: (name) => `Created “${name}”`,
    toastSetSaved: (name) => `Saved “${name}” to your library`,
    toastDeleted: "Deleted",
    toastError: "Something went wrong. Please try again.",
  },
  he: {
    pageTitle: "ספריית אוצר המילים",
    pageSubtitle: "רשימות המילים השמורות שלך, מאורגנות באוספים",
    backToDashboard: "חזרה ללוח המורה",

    tabAllSets: "כל הרשימות",
    tabCollections: "אוספים",
    tabRecent: "אחרונים",

    newCollection: "אוסף חדש",
    newSet: "רשימת מילים חדשה",
    searchPlaceholder: "חיפוש בספרייה…",

    emptyLibraryTitle: "הספרייה שלך ריקה",
    emptyLibraryBlurb:
      "בנו רשימת מילים מצילום של עמוד, מהדבקת טקסט, מנושא או על־ידי הקלדה ידנית. כל מה שתצרו יישמר כאן לשימוש חוזר.",
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

    toastCollectionCreated: (name) => `נוצר "${name}"`,
    toastSetSaved: (name) => `הרשימה "${name}" נשמרה בספרייה`,
    toastDeleted: "נמחק",
    toastError: "משהו השתבש. נסו שוב.",
  },
  ar: {
    pageTitle: "مكتبة المفردات",
    pageSubtitle: "قوائم الكلمات المحفوظة لديك، مرتّبة في مجموعات",
    backToDashboard: "العودة إلى لوحة المعلّم",

    tabAllSets: "كل القوائم",
    tabCollections: "المجموعات",
    tabRecent: "الأخيرة",

    newCollection: "مجموعة جديدة",
    newSet: "قائمة مفردات جديدة",
    searchPlaceholder: "ابحث في مكتبتك…",

    emptyLibraryTitle: "مكتبتك فارغة",
    emptyLibraryBlurb:
      "أنشئ قائمة مفردات من صورة لصفحة، أو من نص ملصوق، أو من موضوع، أو بكتابة الكلمات يدويًا. كل ما تنشئه يُحفظ هنا لإعادة استخدامه.",
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

    toastCollectionCreated: (name) => `تم إنشاء "${name}"`,
    toastSetSaved: (name) => `تم حفظ "${name}" في مكتبتك`,
    toastDeleted: "تم الحذف",
    toastError: "حدث خطأ ما. حاول مرة أخرى.",
  },
  ru: {
    pageTitle: "Vocabulary Library",
    pageSubtitle: "Your saved word lists, organized into collections",
    backToDashboard: "Back to dashboard",

    tabAllSets: "All sets",
    tabCollections: "Collections",
    tabRecent: "Recent",

    newCollection: "New collection",
    newSet: "New vocabulary set",
    searchPlaceholder: "Search your library…",

    emptyLibraryTitle: "Your library is empty",
    emptyLibraryBlurb:
      "Build a vocabulary set from a photo of a page, a paste, a topic, or by typing words manually. Everything you create is saved here for reuse.",
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

    toastCollectionCreated: (name) => `Created “${name}”`,
    toastSetSaved: (name) => `Saved “${name}” to your library`,
    toastDeleted: "Deleted",
    toastError: "Something went wrong. Please try again.",
  },
};
