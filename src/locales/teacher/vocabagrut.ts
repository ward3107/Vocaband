/**
 * vocabagrut.ts — i18n strings for the Vocabagrut Bagrut-style mock
 * exam generator: BagrutLandingView (Step 1 — pick module + words)
 * and BagrutEditorView (Step 2 — review, edit, export, publish).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface VocabagrutStrings {
  // BagrutLandingView — hero + steps
  back: string;
  productName: string;
  heroBlurb: string;

  step1Heading: string;
  step2Heading: string;
  step3Heading: string;

  // Module pickers
  cefrGrade: (cefr: string, grade: string) => string;
  pointTrack: (points: string) => string;
  comingSoon: string;
  comingSoonTitle: (label: string) => string;

  // Source tabs
  sourcePaste: string;
  sourcePhoto: string;
  sourceClass: string;

  // Paste source
  pastePlaceholder: string;
  noValidWordsYet: string;
  readyToAdd: (n: number) => string;
  addToList: string;

  // Photo source
  openCamera: string;
  uploadFromGallery: string;
  readingWords: string;
  ocrTip: string;

  // Class source
  selectClass: string;
  selectAssignment: string;
  wordsInAssignment: (n: number) => string;
  morePlusN: (n: number) => string;
  addAllToList: string;

  // Review
  clearAll: string;
  emptyReviewBody: string;
  wordsReady: (n: number) => string;
  cappedAt: (max: number) => string;
  removeWordAria: (word: string) => string;

  // Toasts
  addedFromAssignment: (added: number, title: string, skipped: number) => string;
  allDuplicates: string;
  addSomeFirst: string;
  loadedFromCache: string;
  generatedSuccess: string;

  // Generate button
  generating: (module: string) => string;
  generateBtn: (label: string, n: number) => string;
  generateFootnote: string;

  // ── BagrutEditorView ───────────────────────────────────────────
  newTest: string;
  preview: string;
  saveDraft: string;
  shareOnline: string;
  shareDisabledTitle: string;
  shareSkipTitle: (count: number) => string;
  exportPdf: string;
  publishToClass: string;
  publishToClassLabel: string;
  noneKeepDraft: string;
  testHeader: (label: string, points: string, cefr: string) => string;
  timeMin: (minutes: number) => string;
  pointsSuffix: (n: number) => string;
  targetWords: (n: number) => string;
  includeAnswerKey: string;
  bagrutPracticeFallback: string;
  pointsShort: (n: number) => string;

  // Editor toasts
  toastPdfExported: string;
  toastPdfFailed: string;
  toastDraftSaved: string;
  toastPickClassFirst: string;
  toastPublished: string;
}

export const vocabagrutT: Record<Language, VocabagrutStrings> = {
  en: {
    back: "Back",
    productName: "Vocabagrut",
    heroBlurb: "Generate a Bagrut-style mock exam from your word list. Looks like the real paper — perfect for format familiarity.",
    step1Heading: "1 · Choose module",
    step2Heading: "2 · Add words",
    step3Heading: "3 · Review & approve",
    cefrGrade: (cefr, grade) => `CEFR ${cefr} · grade ${grade}`,
    pointTrack: (p) => `${p}-point`,
    comingSoon: "Coming soon",
    comingSoonTitle: (label) => `${label} is coming soon`,
    sourcePaste: "Paste",
    sourcePhoto: "Photo",
    sourceClass: "From class",
    pastePlaceholder: "Paste or type words separated by commas, new lines, or semicolons. Example: harvest, community, neighbour, garden, soil, vegetables",
    noValidWordsYet: "No valid words yet",
    readyToAdd: (n) => `${n} word${n === 1 ? "" : "s"} ready to add`,
    addToList: "Add to list",
    openCamera: "Open camera",
    uploadFromGallery: "Upload from gallery",
    readingWords: "Reading words from image…",
    ocrTip: "Detected words go straight into the list below — review and remove any false positives.",
    selectClass: "Select a class…",
    selectAssignment: "Select an assignment…",
    wordsInAssignment: (n) => `${n} word${n === 1 ? "" : "s"} in this assignment`,
    morePlusN: (n) => `+${n} more…`,
    addAllToList: "Add all to list",
    clearAll: "Clear all",
    emptyReviewBody: "Add words from any source above. They'll appear here for you to review and remove false positives before generating.",
    wordsReady: (n) => `${n} word${n === 1 ? "" : "s"} ready`,
    cappedAt: (max) => `· capped at ${max}`,
    removeWordAria: (w) => `Remove ${w}`,
    addedFromAssignment: (added, title, skipped) =>
      `Added ${added} word${added === 1 ? "" : "s"} from "${title}"${skipped ? ` (${skipped} duplicate${skipped === 1 ? "" : "s"} skipped)` : ""}`,
    allDuplicates: "All those words are already in the list",
    addSomeFirst: "Add some words first",
    loadedFromCache: "Loaded from cache",
    generatedSuccess: "Generated! Review and export.",
    generating: (m) => `Generating Module ${m}…`,
    generateBtn: (label, n) => `Generate ${label} mock exam (${n} word${n === 1 ? "" : "s"})`,
    generateFootnote: "Every word will appear in the reading or vocab section in authentic context.",
    newTest: "New test",
    preview: "Preview",
    saveDraft: "Save draft",
    shareOnline: "Share online",
    shareDisabledTitle: "These custom words aren't in our vocabulary, so an interactive worksheet isn't available.",
    shareSkipTitle: (count) => `${count} custom word(s) aren't in our vocabulary and will be skipped in the online version.`,
    exportPdf: "Export PDF",
    publishToClass: "Publish to class",
    publishToClassLabel: "Publish to class (optional)",
    noneKeepDraft: "None — keep as draft",
    testHeader: (label, points, cefr) => `${label} · ${points}-point program · CEFR ${cefr}`,
    timeMin: (m) => `Time ${m} min`,
    pointsSuffix: (n) => `${n} points`,
    targetWords: (n) => `${n} target words`,
    includeAnswerKey: "Include teacher's answer key page when exporting PDF",
    bagrutPracticeFallback: "Bagrut practice",
    pointsShort: (n) => `${n} pts`,
    toastPdfExported: "PDF exported",
    toastPdfFailed: "PDF export failed",
    toastDraftSaved: "Draft saved",
    toastPickClassFirst: "Pick a class to publish to first",
    toastPublished: "Published — students can now see it",
  },
  he: {
    back: "חזרה",
    productName: "Vocabagrut",
    heroBlurb: "ייצרו בחינת בגרות לדוגמה מרשימת המילים שלכם. נראית כמו השאלון האמיתי — מושלמת להיכרות עם הפורמט.",
    step1Heading: "1 · בחירת מודול",
    step2Heading: "2 · הוספת מילים",
    step3Heading: "3 · סקירה ואישור",
    cefrGrade: (cefr, grade) => `CEFR ${cefr} · כיתה ${grade}`,
    pointTrack: (p) => `${p} יח״ל`,
    comingSoon: "בקרוב",
    comingSoonTitle: (label) => `${label} יגיע בקרוב`,
    sourcePaste: "הדבקה",
    sourcePhoto: "צילום",
    sourceClass: "מתוך כיתה",
    pastePlaceholder: "הדביקו או הקלידו מילים מופרדות בפסיקים, שורות חדשות או נקודה-פסיק. לדוגמה: harvest, community, neighbour, garden, soil, vegetables",
    noValidWordsYet: "אין עדיין מילים תקינות",
    readyToAdd: (n) => `${n} מילים מוכנות להוספה`,
    addToList: "הוסיפו לרשימה",
    openCamera: "פתחו מצלמה",
    uploadFromGallery: "העלאה מהגלריה",
    readingWords: "קוראים מילים מהתמונה…",
    ocrTip: "המילים שזוהו נכנסות ישירות לרשימה למטה — סקרו והסירו זיהויים שגויים.",
    selectClass: "בחרו כיתה…",
    selectAssignment: "בחרו מטלה…",
    wordsInAssignment: (n) => `${n} מילים במטלה זו`,
    morePlusN: (n) => `+${n} נוספות…`,
    addAllToList: "הוסיפו הכל לרשימה",
    clearAll: "נקה הכל",
    emptyReviewBody: "הוסיפו מילים מכל מקור למעלה. הן יופיעו כאן כדי שתוכלו לסקור ולהסיר זיהויים שגויים לפני היצירה.",
    wordsReady: (n) => `${n} מילים מוכנות`,
    cappedAt: (max) => `· מוגבל ל-${max}`,
    removeWordAria: (w) => `הסרת ${w}`,
    addedFromAssignment: (added, title, skipped) =>
      `נוספו ${added} מילים מ-"${title}"${skipped ? ` (${skipped} כפילויות דולגו)` : ""}`,
    allDuplicates: "כל המילים האלה כבר ברשימה",
    addSomeFirst: "הוסיפו קודם מילים",
    loadedFromCache: "נטען מהמטמון",
    generatedSuccess: "נוצר! סקרו ויצאו לקובץ.",
    generating: (m) => `יוצר מודול ${m}…`,
    generateBtn: (label, n) => `צרו בחינה לדוגמה ${label} (${n} מילים)`,
    generateFootnote: "כל מילה תופיע בקטע הקריאה או בחלק אוצר המילים בהקשר אותנטי.",
    newTest: "בחינה חדשה",
    preview: "תצוגה מקדימה",
    saveDraft: "שמירת טיוטה",
    shareOnline: "שתפו אונליין",
    shareDisabledTitle: "המילים המותאמות האלה לא נמצאות באוצר המילים שלנו, כך שדף עבודה אינטראקטיבי אינו זמין.",
    shareSkipTitle: (count) => `${count} מילים מותאמות לא נמצאות באוצר ויידלגו בגרסה האונליין.`,
    exportPdf: "ייצוא PDF",
    publishToClass: "פרסום לכיתה",
    publishToClassLabel: "פרסום לכיתה (אופציונלי)",
    noneKeepDraft: "אין — שמירה כטיוטה",
    testHeader: (label, points, cefr) => `${label} · מסלול ${points} יח״ל · CEFR ${cefr}`,
    timeMin: (m) => `זמן ${m} דקות`,
    pointsSuffix: (n) => `${n} נקודות`,
    targetWords: (n) => `${n} מילים יעד`,
    includeAnswerKey: "כללו עמוד מפתח תשובות למורה בייצוא PDF",
    bagrutPracticeFallback: "תרגול בגרות",
    pointsShort: (n) => `${n} נק׳`,
    toastPdfExported: "PDF יוצא בהצלחה",
    toastPdfFailed: "ייצוא PDF נכשל",
    toastDraftSaved: "טיוטה נשמרה",
    toastPickClassFirst: "בחרו קודם כיתה לפרסום",
    toastPublished: "פורסם — התלמידים יכולים לראות עכשיו",
  },
  ar: {
    back: "رجوع",
    productName: "Vocabagrut",
    heroBlurb: "أنشئ امتحان بجروت تجريبي من قائمة كلماتك. يبدو كالامتحان الحقيقي — مثالي للتعرّف على الصيغة.",
    step1Heading: "1 · اختر الوحدة",
    step2Heading: "2 · أضف كلمات",
    step3Heading: "3 · مراجعة وموافقة",
    cefrGrade: (cefr, grade) => `CEFR ${cefr} · الصف ${grade}`,
    pointTrack: (p) => `${p} وحدة تعليمية`,
    comingSoon: "قريباً",
    comingSoonTitle: (label) => `${label} قريباً`,
    sourcePaste: "لصق",
    sourcePhoto: "صورة",
    sourceClass: "من صف",
    pastePlaceholder: "الصق أو اكتب كلمات مفصولة بفواصل أو أسطر جديدة أو فاصلة منقوطة. مثال: harvest, community, neighbour, garden, soil, vegetables",
    noValidWordsYet: "لا توجد كلمات صالحة بعد",
    readyToAdd: (n) => `${n} كلمة جاهزة للإضافة`,
    addToList: "أضف إلى القائمة",
    openCamera: "افتح الكاميرا",
    uploadFromGallery: "رفع من المعرض",
    readingWords: "جارٍ قراءة الكلمات من الصورة…",
    ocrTip: "تذهب الكلمات المكتشَفة مباشرة إلى القائمة أدناه — راجع وأزل أي إيجابيات كاذبة.",
    selectClass: "اختر صفاً…",
    selectAssignment: "اختر مهمة…",
    wordsInAssignment: (n) => `${n} كلمة في هذه المهمة`,
    morePlusN: (n) => `+${n} إضافية…`,
    addAllToList: "أضف الكل إلى القائمة",
    clearAll: "مسح الكل",
    emptyReviewBody: "أضف كلمات من أي مصدر أعلاه. ستظهر هنا لمراجعتها وإزالة الإيجابيات الكاذبة قبل التوليد.",
    wordsReady: (n) => `${n} كلمة جاهزة`,
    cappedAt: (max) => `· الحد الأقصى ${max}`,
    removeWordAria: (w) => `إزالة ${w}`,
    addedFromAssignment: (added, title, skipped) =>
      `أُضيفت ${added} كلمة من "${title}"${skipped ? ` (تخطّي ${skipped} مكررة)` : ""}`,
    allDuplicates: "كل هذه الكلمات موجودة بالفعل في القائمة",
    addSomeFirst: "أضف بعض الكلمات أولاً",
    loadedFromCache: "تم التحميل من ذاكرة التخزين المؤقّت",
    generatedSuccess: "تم التوليد! راجع وصدِّر.",
    generating: (m) => `جارٍ توليد الوحدة ${m}…`,
    generateBtn: (label, n) => `توليد امتحان ${label} تجريبي (${n} كلمة)`,
    generateFootnote: "كل كلمة ستظهر في قسم القراءة أو المفردات في سياق أصيل.",
    newTest: "اختبار جديد",
    preview: "معاينة",
    saveDraft: "حفظ المسودة",
    shareOnline: "شارك إلكترونياً",
    shareDisabledTitle: "هذه الكلمات المخصّصة ليست في مفرداتنا، لذا لا تتوفر ورقة عمل تفاعلية.",
    shareSkipTitle: (count) => `${count} كلمات مخصّصة ليست في مفرداتنا وسيتم تخطّيها في النسخة الإلكترونية.`,
    exportPdf: "تصدير PDF",
    publishToClass: "نشر إلى الصف",
    publishToClassLabel: "نشر إلى صف (اختياري)",
    noneKeepDraft: "بدون — احتفظ كمسودة",
    testHeader: (label, points, cefr) => `${label} · مسار ${points} وحدة تعليمية · CEFR ${cefr}`,
    timeMin: (m) => `الوقت ${m} دقيقة`,
    pointsSuffix: (n) => `${n} نقطة`,
    targetWords: (n) => `${n} كلمة مستهدفة`,
    includeAnswerKey: "تضمين صفحة إجابات المعلم عند تصدير PDF",
    bagrutPracticeFallback: "تدريب بجروت",
    pointsShort: (n) => `${n} نقطة`,
    toastPdfExported: "تم تصدير PDF",
    toastPdfFailed: "فشل تصدير PDF",
    toastDraftSaved: "تم حفظ المسودة",
    toastPickClassFirst: "اختر صفاً للنشر إليه أولاً",
    toastPublished: "تم النشر — الطلاب يمكنهم الآن رؤيته",
  },
};
