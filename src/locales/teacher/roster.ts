/**
 * roster.ts — i18n strings for ClassRosterModal (the teacher's
 * roster management modal where they add/reset/delete PIN students).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface ClassRosterStrings {
  // Header
  title: string;
  classCodePrefix: string;
  closeAria: string;
  /** Label rendered above the title in the v2 redesign, "{prefix} · {className}". */
  sectionLabelPrefix: string;
  /** Per-row "Copy join link" — both label inside the kebab menu and aria. */
  copyLinkLabel: string;
  /** Aria label for the kebab/overflow menu trigger on a student card. */
  moreActionsAria: string;

  // Add student section
  addStudentLabel: string;
  addStudentPlaceholder: string;
  addButton: string;
  addHelp: string;

  // Bulk "add coded students" (anonymous codes — no names). grade/branch/count.
  bulkLabel: string;
  bulkBlurb: string;
  bulkGradeLabel: string;
  bulkBranchLabel: string;
  bulkCountLabel: string;
  bulkGenerate: string;
  bulkGenerating: string;
  bulkSuccess: (n: number) => string;
  bulkCapError: string;
  bulkInvalid: string;
  /** Column header used in print/copy when the roster is coded (no names). */
  codeHeader: string;
  /**
   * Privacy nudge shown under the add-student input.  Discourages teachers
   * from typing full last names — first names / nicknames keep the roster
   * inside the "minimal personal data" promise made in the privacy policy.
   */
  privacyTip: string;

  // Empty state
  emptyTitle: string;
  emptyBody: string;
  loading: string;

  // Row labels
  lastSeen: (date: string) => string;
  neverLoggedIn: string;
  xpSuffix: (xp: number) => string;
  showPin: string;
  showAllPins: string;
  hideAllPins: string;
  resetPinTitle: string;
  resetPinAria: (name: string) => string;
  removeAria: (name: string) => string;
  removeTitle: string;

  // Confirms
  confirmResetPin: (name: string) => string;
  confirmDelete: (name: string) => string;

  // Errors / status
  errorLoadFailed: string;
  errorAddFailed: string;
  errorDuplicateName: (name: string) => string;
  errorResetFailed: string;
  errorDeleteFailed: string;
  errorNoPins: string;
  errorClipboardUnavailable: string;
  errorPopupBlocked: string;
  errorAddStudentsFirst: string;

  // Footer
  studentCount: (n: number) => string;
  copyButton: string;
  copiedButton: string;
  copyTitle: string;
  printButton: string;

  // Copy-to-clipboard format
  copyHeader: (className: string, classCode: string) => string;
  copyJoinLink: (classCode: string) => string;
  copyNameHeader: string;
  copyPinHeader: string;

  // Print sheet
  printTitle: (className: string) => string;
  printClassCodeLabel: string;
  printInstructions: string;

  // Per-student Share buttons — "Link" sends the join URL on one channel,
  // "PIN" sends the secret on a separate channel.  See
  // docs/teacher-share-invites-plan.md.
  shareLinkButton: string;
  sharePinButton: string;
  shareLinkTitle: string;
  sharePinTitle: string;
  shareLinkAria: (name: string) => string;
  sharePinAria: (name: string) => string;
  // Click-to-copy the bare PIN chip
  copyPinTitle: string;
  copyPinAria: (name: string) => string;
  // Share-sheet body templates
  inviteShareTitle: (className: string) => string;
  inviteShareMessage: (studentName: string, className: string, url: string) => string;
  pinShareTitle: (studentName: string) => string;
  pinShareMessage: (pin: string, className: string, classCode: string) => string;
  // Toasts
  shareCopiedToast: string;
  shareFailedToast: string;
}

export const classRosterT: Record<Language, ClassRosterStrings> = {
  en: {
    title: "Class roster",
    classCodePrefix: "",
    closeAria: "Close",
    sectionLabelPrefix: "Class",
    copyLinkLabel: "Copy join link",
    moreActionsAria: "More actions",
    addStudentLabel: "Add student",
    addStudentPlaceholder: 'e.g. "Yossi K" (first name + last initial)',
    addButton: "Add",
    addHelp: "A 6-character PIN is generated automatically. The student logs in with the class code + their name + this PIN.",
    bulkLabel: "Add a whole class at once",
    bulkBlurb: "No names needed. Each student gets an anonymous code (school-grade-branch-number) and a PIN. You keep the name↔code list on the printed sheet.",
    bulkGradeLabel: "Grade",
    bulkBranchLabel: "Branch",
    bulkCountLabel: "Students",
    bulkGenerate: "Generate codes",
    bulkGenerating: "Generating…",
    bulkSuccess: (n) => `Created ${n} student ${n === 1 ? "code" : "codes"}. Print the sheet to hand out.`,
    bulkCapError: "Free plan is limited to 30 students per class. Upgrade for unlimited.",
    bulkInvalid: "Enter a grade, branch, and how many students (1–60).",
    codeHeader: "Student code",
    privacyTip: "Tip: First names or nicknames are best — full last names aren't needed. The gradebook shows whatever you type here, so keep it minimal.",
    emptyTitle: "No students yet",
    emptyBody: "Add your first student above.",
    loading: "Loading roster…",
    lastSeen: (date) => `Last seen ${date}`,
    neverLoggedIn: "Hasn't logged in yet",
    xpSuffix: (xp) => ` · ${xp} XP`,
    showPin: "Show PIN",
    showAllPins: "Show all PINs",
    hideAllPins: "Hide all PINs",
    resetPinTitle: "Reset PIN",
    resetPinAria: (name) => `Reset PIN for ${name}`,
    removeAria: (name) => `Remove ${name}`,
    removeTitle: "Remove student",
    confirmResetPin: (name) => `Generate a new PIN for ${name}? Their old PIN will stop working immediately.`,
    confirmDelete: (name) => `Remove ${name} from the class? Their progress and XP will be permanently deleted.`,
    errorLoadFailed: "Failed to load roster",
    errorAddFailed: "Failed to add student",
    errorDuplicateName: (name) => `There's already a student named "${name}" in this class. Add a last initial to distinguish them (e.g. "Yossi K", "Yossi M").`,
    errorResetFailed: "Failed to reset PIN",
    errorDeleteFailed: "Failed to delete student",
    errorNoPins: "No PINs to copy.",
    errorClipboardUnavailable: "Clipboard not available in this browser.",
    errorPopupBlocked: "Pop-up blocked — allow pop-ups for vocaband.com.",
    errorAddStudentsFirst: "Add students first.",
    studentCount: (n) => `${n} ${n === 1 ? "student" : "students"}`,
    copyButton: "Copy",
    copiedButton: "Copied",
    copyTitle: "Copy roster + PINs to clipboard",
    printButton: "Print roster",
    copyHeader: (className, classCode) => `Vocaband — ${className} (${classCode})`,
    copyJoinLink: (classCode) => `Class join: https://www.vocaband.com/student?class=${classCode}`,
    copyNameHeader: "Name",
    copyPinHeader: "PIN",
    printTitle: (className) => `${className} — Class roster`,
    printClassCodeLabel: "Class code",
    printInstructions: "Each student logs in at vocaband.com with the class code, picks their name, and types their PIN. Keep this sheet safe.",
    shareLinkButton: "Link",
    sharePinButton: "PIN",
    shareLinkTitle: "Share invite link (no PIN)",
    sharePinTitle: "Share PIN (separately!)",
    shareLinkAria: (name) => `Share invite link for ${name}`,
    sharePinAria: (name) => `Share PIN for ${name}`,
    copyPinTitle: "Copy PIN",
    copyPinAria: (name) => `Copy PIN for ${name}`,
    inviteShareTitle: (className) => `Vocaband — ${className}`,
    inviteShareMessage: (studentName, className, url) =>
      `Hi ${studentName}! Your Vocaband class "${className}" is waiting 🎮\nTap to join: ${url}\nYour teacher will share your secret PIN separately.`,
    pinShareTitle: (studentName) => `Vocaband PIN for ${studentName}`,
    pinShareMessage: (pin, className, classCode) =>
      `🔐 Your Vocaband PIN: ${pin}\nClass: ${className} (${classCode})\nIt's like your secret password — keep it private.`,
    shareCopiedToast: "Copied — paste it into a message.",
    shareFailedToast: "Couldn't share — try copying instead.",
  },
  he: {
    title: "רשימת הכיתה",
    classCodePrefix: "",
    closeAria: "סגירה",
    sectionLabelPrefix: "כיתה",
    copyLinkLabel: "העתק קישור הצטרפות",
    moreActionsAria: "פעולות נוספות",
    addStudentLabel: "הוספת תלמיד",
    addStudentPlaceholder: 'לדוגמה: "יוסי כ" (שם פרטי + אות ראשונה של שם המשפחה)',
    addButton: "הוסף",
    addHelp: "קוד PIN בן 6 תווים נוצר אוטומטית. התלמיד מתחבר עם קוד הכיתה + השם שלו + הקוד הזה.",
    bulkLabel: "הוספת כיתה שלמה בבת אחת",
    bulkBlurb: "ללא שמות. כל תלמיד מקבל קוד אנונימי (בית-ספר-שכבה-כיתה-מספר) ו-PIN. רשימת השם↔קוד נשארת אצלכם על הדף המודפס.",
    bulkGradeLabel: "שכבה",
    bulkBranchLabel: "כיתה",
    bulkCountLabel: "תלמידים",
    bulkGenerate: "צור קודים",
    bulkGenerating: "יוצר…",
    bulkSuccess: (n) => `נוצרו ${n} קודי תלמידים. הדפיסו את הדף לחלוקה.`,
    bulkCapError: "התוכנית החינמית מוגבלת ל-30 תלמידים בכיתה. שדרגו ללא הגבלה.",
    bulkInvalid: "הזינו שכבה, כיתה, וכמה תלמידים (1–60).",
    codeHeader: "קוד תלמיד",
    privacyTip: "טיפ: שמות פרטיים או כינויים הם הבחירה הטובה ביותר — אין צורך בשמות משפחה מלאים. השם שתכתבו כאן מופיע בגרדבוק, אז כדאי לשמור על מינימום.",
    emptyTitle: "אין עדיין תלמידים",
    emptyBody: "הוסיפו את התלמיד הראשון שלכם למעלה.",
    loading: "טוען רשימה…",
    lastSeen: (date) => `נראה לאחרונה ${date}`,
    neverLoggedIn: "עוד לא התחבר",
    xpSuffix: (xp) => ` · ${xp} XP`,
    showPin: "הצג PIN",
    showAllPins: "הצג את כל הקודים",
    hideAllPins: "הסתר את כל הקודים",
    resetPinTitle: "איפוס PIN",
    resetPinAria: (name) => `איפוס PIN עבור ${name}`,
    removeAria: (name) => `הסרת ${name}`,
    removeTitle: "הסרת תלמיד",
    confirmResetPin: (name) => `ליצור PIN חדש עבור ${name}? ה-PIN הישן יפסיק לעבוד מיד.`,
    confirmDelete: (name) => `להסיר את ${name} מהכיתה? ההתקדמות וה-XP שלו יימחקו לצמיתות.`,
    errorLoadFailed: "טעינת הרשימה נכשלה",
    errorAddFailed: "הוספת התלמיד נכשלה",
    errorDuplicateName: (name) => `כבר יש תלמיד בשם "${name}" בכיתה הזו. הוסיפו אות של שם המשפחה כדי להבדיל (לדוגמה: "יוסי כ", "יוסי מ").`,
    errorResetFailed: "איפוס ה-PIN נכשל",
    errorDeleteFailed: "מחיקת התלמיד נכשלה",
    errorNoPins: "אין קודי PIN להעתקה.",
    errorClipboardUnavailable: "הלוח לא זמין בדפדפן הזה.",
    errorPopupBlocked: "החלון הקופץ נחסם — אפשרו חלונות קופצים ל-vocaband.com.",
    errorAddStudentsFirst: "הוסיפו תלמידים קודם.",
    studentCount: (n) => `${n} ${n === 1 ? "תלמיד" : "תלמידים"}`,
    copyButton: "העתק",
    copiedButton: "הועתק",
    copyTitle: "העתק את הרשימה וה-PINs ללוח",
    printButton: "הדפס רשימה",
    // copyJoinLink (and the per-student invite/PIN share text below)
    // ship to students, not back to the teacher — so they're always in
    // English regardless of the teacher's UI-language preference.
    copyHeader: (className, classCode) => `Vocaband — ${className} (${classCode})`,
    copyJoinLink: (classCode) => `Class join: https://www.vocaband.com/student?class=${classCode}`,
    copyNameHeader: "שם",
    copyPinHeader: "PIN",
    printTitle: (className) => `${className} — רשימת הכיתה`,
    printClassCodeLabel: "קוד הכיתה",
    printInstructions: "כל תלמיד מתחבר ב-vocaband.com עם קוד הכיתה, בוחר את השם שלו, ומקליד את ה-PIN. שמרו את הדף במקום בטוח.",
    shareLinkButton: "קישור",
    sharePinButton: "PIN",
    shareLinkTitle: "שיתוף קישור הצטרפות (ללא PIN)",
    sharePinTitle: "שיתוף PIN (בנפרד!)",
    shareLinkAria: (name) => `שיתוף קישור הצטרפות עבור ${name}`,
    sharePinAria: (name) => `שיתוף PIN עבור ${name}`,
    copyPinTitle: "העתק PIN",
    copyPinAria: (name) => `העתק PIN עבור ${name}`,
    inviteShareTitle: (className) => `Vocaband — ${className}`,
    inviteShareMessage: (studentName, className, url) =>
      `Hi ${studentName}! Your Vocaband class "${className}" is waiting 🎮\nTap to join: ${url}\nYour teacher will share your secret PIN separately.`,
    pinShareTitle: (studentName) => `Vocaband PIN for ${studentName}`,
    pinShareMessage: (pin, className, classCode) =>
      `🔐 Your Vocaband PIN: ${pin}\nClass: ${className} (${classCode})\nIt's like your secret password — keep it private.`,
    shareCopiedToast: "הועתק — הדביקו בהודעה.",
    shareFailedToast: "לא ניתן לשתף — נסו להעתיק במקום.",
  },
  ar: {
    title: "قائمة الصف",
    classCodePrefix: "",
    closeAria: "إغلاق",
    sectionLabelPrefix: "الصف",
    copyLinkLabel: "انسخ رابط الانضمام",
    moreActionsAria: "إجراءات إضافية",
    addStudentLabel: "إضافة طالب",
    addStudentPlaceholder: 'مثال: "يوسي ك" (الاسم الأول + أول حرف من اسم العائلة)',
    addButton: "إضافة",
    addHelp: "يتم إنشاء رمز PIN مكوّن من 6 أحرف تلقائياً. يسجّل الطالب الدخول برمز الصف + اسمه + هذا الرمز.",
    bulkLabel: "إضافة صف كامل دفعة واحدة",
    bulkBlurb: "بدون أسماء. يحصل كل طالب على رمز مجهول (مدرسة-صف-شعبة-رقم) ورمز PIN. تبقى قائمة الاسم↔الرمز معك على الورقة المطبوعة.",
    bulkGradeLabel: "الصف",
    bulkBranchLabel: "الشعبة",
    bulkCountLabel: "الطلاب",
    bulkGenerate: "إنشاء الرموز",
    bulkGenerating: "جارٍ الإنشاء…",
    bulkSuccess: (n) => `تم إنشاء ${n} رمز طالب. اطبع الورقة للتوزيع.`,
    bulkCapError: "الخطة المجانية محدودة بـ 30 طالباً لكل صف. قم بالترقية لعدد غير محدود.",
    bulkInvalid: "أدخل الصف والشعبة وعدد الطلاب (1–60).",
    codeHeader: "رمز الطالب",
    privacyTip: "نصيحة: الأسماء الأولى أو الكنى هي الأفضل — لا حاجة لأسماء العائلة الكاملة. يظهر دفتر العلامات بما تكتبه هنا، لذا اجعله بسيطاً قدر الإمكان.",
    emptyTitle: "لا يوجد طلاب بعد",
    emptyBody: "أضف أول طالب أعلاه.",
    loading: "جارٍ تحميل القائمة…",
    lastSeen: (date) => `آخر ظهور ${date}`,
    neverLoggedIn: "لم يسجّل الدخول بعد",
    xpSuffix: (xp) => ` · ${xp} XP`,
    showPin: "إظهار PIN",
    showAllPins: "إظهار كل الرموز",
    hideAllPins: "إخفاء كل الرموز",
    resetPinTitle: "إعادة تعيين PIN",
    resetPinAria: (name) => `إعادة تعيين PIN لـ ${name}`,
    removeAria: (name) => `إزالة ${name}`,
    removeTitle: "إزالة الطالب",
    confirmResetPin: (name) => `إنشاء PIN جديد لـ ${name}؟ سيتوقف PIN القديم عن العمل فوراً.`,
    confirmDelete: (name) => `إزالة ${name} من الصف؟ سيتم حذف تقدّمه ونقاط XP بشكل دائم.`,
    errorLoadFailed: "فشل تحميل القائمة",
    errorAddFailed: "فشلت إضافة الطالب",
    errorDuplicateName: (name) => `يوجد بالفعل طالب باسم "${name}" في هذا الصف. أضف أول حرف من اسم العائلة للتمييز (مثل "يوسي ك"، "يوسي م").`,
    errorResetFailed: "فشلت إعادة تعيين PIN",
    errorDeleteFailed: "فشل حذف الطالب",
    errorNoPins: "لا توجد رموز PIN للنسخ.",
    errorClipboardUnavailable: "الحافظة غير متاحة في هذا المتصفح.",
    errorPopupBlocked: "تم حظر النافذة المنبثقة — اسمح بالنوافذ المنبثقة لـ vocaband.com.",
    errorAddStudentsFirst: "أضف طلاباً أولاً.",
    studentCount: (n) => `${n} ${n === 1 ? "طالب" : "طلاب"}`,
    copyButton: "نسخ",
    copiedButton: "تم النسخ",
    copyTitle: "نسخ القائمة ورموز PIN إلى الحافظة",
    printButton: "طباعة القائمة",
    // copyJoinLink (and the per-student invite/PIN share text below)
    // ship to students, not back to the teacher — so they're always in
    // English regardless of the teacher's UI-language preference.
    copyHeader: (className, classCode) => `Vocaband — ${className} (${classCode})`,
    copyJoinLink: (classCode) => `Class join: https://www.vocaband.com/student?class=${classCode}`,
    copyNameHeader: "الاسم",
    copyPinHeader: "PIN",
    printTitle: (className) => `${className} — قائمة الصف`,
    printClassCodeLabel: "رمز الصف",
    printInstructions: "يسجّل كل طالب الدخول في vocaband.com باستخدام رمز الصف، يختار اسمه، ويكتب رمز PIN. احتفظ بهذه الورقة في مكان آمن.",
    shareLinkButton: "رابط",
    sharePinButton: "PIN",
    shareLinkTitle: "مشاركة رابط الانضمام (بدون PIN)",
    sharePinTitle: "مشاركة PIN (بشكل منفصل!)",
    shareLinkAria: (name) => `مشاركة رابط الانضمام لـ ${name}`,
    sharePinAria: (name) => `مشاركة PIN لـ ${name}`,
    copyPinTitle: "نسخ PIN",
    copyPinAria: (name) => `نسخ PIN لـ ${name}`,
    inviteShareTitle: (className) => `Vocaband — ${className}`,
    inviteShareMessage: (studentName, className, url) =>
      `Hi ${studentName}! Your Vocaband class "${className}" is waiting 🎮\nTap to join: ${url}\nYour teacher will share your secret PIN separately.`,
    pinShareTitle: (studentName) => `Vocaband PIN for ${studentName}`,
    pinShareMessage: (pin, className, classCode) =>
      `🔐 Your Vocaband PIN: ${pin}\nClass: ${className} (${classCode})\nIt's like your secret password — keep it private.`,
    shareCopiedToast: "تم النسخ — الصقه في رسالة.",
    shareFailedToast: "تعذّرت المشاركة — حاول النسخ بدلاً من ذلك.",
  },
  ru: {
    title: "Class roster",
    classCodePrefix: "",
    closeAria: "Close",
    sectionLabelPrefix: "Class",
    copyLinkLabel: "Copy join link",
    moreActionsAria: "More actions",
    addStudentLabel: "Add student",
    addStudentPlaceholder: 'e.g. "Yossi K" (first name + last initial)',
    addButton: "Add",
    addHelp: "A 6-character PIN is generated automatically. The student logs in with the class code + their name + this PIN.",
    bulkLabel: "Add a whole class at once",
    bulkBlurb: "No names needed. Each student gets an anonymous code (school-grade-branch-number) and a PIN. You keep the name↔code list on the printed sheet.",
    bulkGradeLabel: "Grade",
    bulkBranchLabel: "Branch",
    bulkCountLabel: "Students",
    bulkGenerate: "Generate codes",
    bulkGenerating: "Generating…",
    bulkSuccess: (n) => `Created ${n} student ${n === 1 ? "code" : "codes"}. Print the sheet to hand out.`,
    bulkCapError: "Free plan is limited to 30 students per class. Upgrade for unlimited.",
    bulkInvalid: "Enter a grade, branch, and how many students (1–60).",
    codeHeader: "Student code",
    privacyTip: "Tip: First names or nicknames are best — full last names aren't needed. The gradebook shows whatever you type here, so keep it minimal.",
    emptyTitle: "No students yet",
    emptyBody: "Add your first student above.",
    loading: "Loading roster…",
    lastSeen: (date) => `Last seen ${date}`,
    neverLoggedIn: "Hasn't logged in yet",
    xpSuffix: (xp) => ` · ${xp} XP`,
    showPin: "Show PIN",
    showAllPins: "Show all PINs",
    hideAllPins: "Hide all PINs",
    resetPinTitle: "Reset PIN",
    resetPinAria: (name) => `Reset PIN for ${name}`,
    removeAria: (name) => `Remove ${name}`,
    removeTitle: "Remove student",
    confirmResetPin: (name) => `Generate a new PIN for ${name}? Their old PIN will stop working immediately.`,
    confirmDelete: (name) => `Remove ${name} from the class? Their progress and XP will be permanently deleted.`,
    errorLoadFailed: "Failed to load roster",
    errorAddFailed: "Failed to add student",
    errorDuplicateName: (name) => `There's already a student named "${name}" in this class. Add a last initial to distinguish them (e.g. "Yossi K", "Yossi M").`,
    errorResetFailed: "Failed to reset PIN",
    errorDeleteFailed: "Failed to delete student",
    errorNoPins: "No PINs to copy.",
    errorClipboardUnavailable: "Clipboard not available in this browser.",
    errorPopupBlocked: "Pop-up blocked — allow pop-ups for vocaband.com.",
    errorAddStudentsFirst: "Add students first.",
    studentCount: (n) => `${n} ${n === 1 ? "student" : "students"}`,
    copyButton: "Copy",
    copiedButton: "Copied",
    copyTitle: "Copy roster + PINs to clipboard",
    printButton: "Print roster",
    copyHeader: (className, classCode) => `Vocaband — ${className} (${classCode})`,
    copyJoinLink: (classCode) => `Class join: https://www.vocaband.com/student?class=${classCode}`,
    copyNameHeader: "Name",
    copyPinHeader: "PIN",
    printTitle: (className) => `${className} — Class roster`,
    printClassCodeLabel: "Class code",
    printInstructions: "Each student logs in at vocaband.com with the class code, picks their name, and types their PIN. Keep this sheet safe.",
    shareLinkButton: "Link",
    sharePinButton: "PIN",
    shareLinkTitle: "Share invite link (no PIN)",
    sharePinTitle: "Share PIN (separately!)",
    shareLinkAria: (name) => `Share invite link for ${name}`,
    sharePinAria: (name) => `Share PIN for ${name}`,
    copyPinTitle: "Copy PIN",
    copyPinAria: (name) => `Copy PIN for ${name}`,
    inviteShareTitle: (className) => `Vocaband — ${className}`,
    inviteShareMessage: (studentName, className, url) =>
      `Hi ${studentName}! Your Vocaband class "${className}" is waiting 🎮\nTap to join: ${url}\nYour teacher will share your secret PIN separately.`,
    pinShareTitle: (studentName) => `Vocaband PIN for ${studentName}`,
    pinShareMessage: (pin, className, classCode) =>
      `🔐 Your Vocaband PIN: ${pin}\nClass: ${className} (${classCode})\nIt's like your secret password — keep it private.`,
    shareCopiedToast: "Copied — paste it into a message.",
    shareFailedToast: "Couldn't share — try copying instead.",
  },
};
