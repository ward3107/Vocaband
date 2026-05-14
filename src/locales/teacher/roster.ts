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

  // Add student section
  addStudentLabel: string;
  addStudentPlaceholder: string;
  addButton: string;
  addHelp: string;

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
    addStudentLabel: "Add student",
    addStudentPlaceholder: 'e.g. "Yossi K" (first name + last initial)',
    addButton: "Add",
    addHelp: "A 6-character PIN is generated automatically. The student logs in with the class code + their name + this PIN.",
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
    addStudentLabel: "הוספת תלמיד",
    addStudentPlaceholder: 'לדוגמה: "יוסי כ" (שם פרטי + אות ראשונה של שם המשפחה)',
    addButton: "הוסף",
    addHelp: "קוד PIN בן 6 תווים נוצר אוטומטית. התלמיד מתחבר עם קוד הכיתה + השם שלו + הקוד הזה.",
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
    copyHeader: (className, classCode) => `Vocaband — ${className} (${classCode})`,
    copyJoinLink: (classCode) => `קישור הצטרפות: https://www.vocaband.com/student?class=${classCode}`,
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
    inviteShareTitle: (className) => `Vocaband — ${className}`,
    inviteShareMessage: (studentName, className, url) =>
      `היי ${studentName}! הכיתה שלכם ב-Vocaband "${className}" מחכה 🎮\nהקליקו להצטרפות: ${url}\nהמורה תשלח לכם את ה-PIN בנפרד.`,
    pinShareTitle: (studentName) => `PIN של ${studentName} ב-Vocaband`,
    pinShareMessage: (pin, className, classCode) =>
      `🔐 ה-PIN שלכם ב-Vocaband: ${pin}\nכיתה: ${className} (${classCode})\nזה כמו הסיסמה הסודית שלכם — שמרו עליה בסוד.`,
    shareCopiedToast: "הועתק — הדביקו בהודעה.",
    shareFailedToast: "לא ניתן לשתף — נסו להעתיק במקום.",
  },
  ar: {
    title: "قائمة الصف",
    classCodePrefix: "",
    closeAria: "إغلاق",
    addStudentLabel: "إضافة طالب",
    addStudentPlaceholder: 'مثال: "يوسي ك" (الاسم الأول + أول حرف من اسم العائلة)',
    addButton: "إضافة",
    addHelp: "يتم إنشاء رمز PIN مكوّن من 6 أحرف تلقائياً. يسجّل الطالب الدخول برمز الصف + اسمه + هذا الرمز.",
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
    copyHeader: (className, classCode) => `Vocaband — ${className} (${classCode})`,
    copyJoinLink: (classCode) => `رابط الانضمام: https://www.vocaband.com/student?class=${classCode}`,
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
    inviteShareTitle: (className) => `Vocaband — ${className}`,
    inviteShareMessage: (studentName, className, url) =>
      `مرحباً ${studentName}! صف Vocaband "${className}" بانتظارك 🎮\nاضغط للانضمام: ${url}\nسيرسل لك معلمك رمز PIN بشكل منفصل.`,
    pinShareTitle: (studentName) => `رمز PIN لـ ${studentName} في Vocaband`,
    pinShareMessage: (pin, className, classCode) =>
      `🔐 رمز PIN الخاص بك في Vocaband: ${pin}\nالصف: ${className} (${classCode})\nإنها مثل كلمة سرّك السرّية — احتفظ بها لنفسك.`,
    shareCopiedToast: "تم النسخ — الصقه في رسالة.",
    shareFailedToast: "تعذّرت المشاركة — حاول النسخ بدلاً من ذلك.",
  },
};
