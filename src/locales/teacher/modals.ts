/**
 * Locale file for the teacher's modals + dashboard chrome controls.
 *
 * Covers:
 *  - CreateClassModal
 *  - ClassCreatedModal
 *  - EditClassModal
 *  - DeleteAssignmentModal
 *  - RejectStudentModal
 *  - ConfirmDialog (generic confirm)
 *  - TeacherRewardModal
 *  - RewardInboxCard (TYPE_META labels)
 *  - TeacherThemeMenu
 *  - UiScaleControl
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherModalsT {
  // Generic shared
  cancel: string;
  saving: string;

  // ─── CreateClassModal ──────────────────────────────────────────
  createTitle: string;
  createBlurb: string;
  classNamePlaceholder: string;
  createBtn: string;

  // ─── ClassCreatedModal ─────────────────────────────────────────
  classCreatedTitle: string;
  classCreatedBlurb: string;
  copyShort: string;
  whatsAppShort: string;
  doneBtn: string;
  /** Clipboard message when copying the class card. */
  classCardCopyMsg: (className: string, code: string) => string;

  // ─── EditClassModal ────────────────────────────────────────────
  editTitle: string;
  editBlurb: string;
  classNameLabel: string;
  classNameInputPlaceholder: string;
  /** "Class code: {code} (cannot change)". */
  classCodeStatic: (code: string) => string;
  classAvatarLabel: string;
  useDefaultIconTitle: string;
  saveChanges: string;

  // ─── DeleteAssignmentModal ────────────────────────────────────
  delAssignTitle: string;
  /** Body with the assignment title interpolated. */
  delAssignBody: (title: string) => string;
  delAssignWarn: string;
  delAssignKeep: string;
  delAssignConfirm: string;

  // ─── RejectStudentModal ────────────────────────────────────────
  rejectTitle: string;
  /** Body with the student display name interpolated. */
  rejectBody: (displayName: string) => string;
  rejectWarn: string;
  rejectKeep: string;
  rejectConfirm: string;

  // ─── ConfirmDialog (generic) ──────────────────────────────────
  confirmActionTitle: string;
  confirmBtn: string;

  // ─── TeacherRewardModal ────────────────────────────────────────
  sendXpBoostTitle: string;
  /** "Reward {name} for their hard work". */
  sendXpBoostBlurb: (name: string) => string;
  selectXpAmount: string;
  shortMsgToStudentLabel: string;
  shortMsgPlaceholder: string;
  shortMsgHelper: string;
  closeAria: string;
  sendingShort: string;
  sendXp: string;
  /** "Sent +{xp} XP to {name}!". */
  sentXpToast: (xp: number, name: string) => string;
  /** "Couldn't give reward: {reason}". */
  rewardErrorToast: (reason: string) => string;
  rewardUnknownError: string;

  // ─── RewardInboxCard (teacher-side only sees nothing, but TYPE_META keys live cross-cutting) ─
  // (Student-side TYPE_META is already covered in student-dashboard.ts;
  // we expose the teacher-side reward-modal subset here.)

  // ─── TeacherThemeMenu ──────────────────────────────────────────
  themeMenuHeading: string;
  themeMenuBlurb: string;
  themeCloseAria: string;

  // ─── UiScaleControl ────────────────────────────────────────────
  scaleGroupAria: string;
  scaleNormalAria: string;
  scaleLargeAria: string;
  scaleXLargeAria: string;
}

export const teacherModalsT: Record<Language, TeacherModalsT> = {
  en: {
    cancel: "Cancel",
    saving: "Saving…",

    createTitle: "Create New Class",
    createBlurb: "Enter a name for your class (e.g. Grade 8-B)",
    classNamePlaceholder: "Class Name",
    createBtn: "Create",

    classCreatedTitle: "Class Created!",
    classCreatedBlurb: "Share this code with your students so they can join.",
    copyShort: "Copy",
    whatsAppShort: "WhatsApp",
    doneBtn: "Done",
    classCardCopyMsg: (className, code) => `${className} - Class Code: ${code}`,

    editTitle: "Edit class",
    editBlurb: "Rename this class or pick a new avatar — students, assignments, and progress all stay intact.  Class code stays the same.",
    classNameLabel: "Class name",
    classNameInputPlaceholder: "e.g. Grade 8-B",
    classCodeStatic: (code) => `Class code: ${code} (cannot change)`,
    classAvatarLabel: "Class avatar",
    useDefaultIconTitle: "Use default icon",
    saveChanges: "Save changes",

    delAssignTitle: "Delete Assignment?",
    delAssignBody: (title) =>
      `You're about to delete "${title}". This action cannot be undone — all student progress and data for this assignment will be permanently removed.`,
    delAssignWarn: "⚠️ Make sure you want to delete this assignment before continuing.",
    delAssignKeep: "Keep Assignment",
    delAssignConfirm: "Delete Assignment",

    rejectTitle: "Reject Student?",
    rejectBody: (name) =>
      `You're about to reject "${name}". They will need to sign up again with a new class code to join your class.`,
    rejectWarn: "⚠️ This action cannot be undone. The student's profile will be marked as rejected.",
    rejectKeep: "Keep Student",
    rejectConfirm: "Reject Student",

    confirmActionTitle: "Confirm Action",
    confirmBtn: "Confirm",

    sendXpBoostTitle: "Send XP Boost",
    sendXpBoostBlurb: (name) => `Reward ${name} for their hard work`,
    selectXpAmount: "Select XP amount:",
    shortMsgToStudentLabel: "Short message to the student (optional)",
    shortMsgPlaceholder: "e.g., Great participation today!",
    shortMsgHelper: "Shows up in the student's dashboard next to the XP boost.",
    closeAria: "Close",
    sendingShort: "Sending...",
    sendXp: "Send XP",
    sentXpToast: (xp, name) => `Sent +${xp} XP to ${name}!`,
    rewardErrorToast: (reason) => `Couldn't give reward: ${reason}`,
    rewardUnknownError: "unknown error",

    themeMenuHeading: "Dashboard theme",
    themeMenuBlurb: "Pick a look for your teacher dashboard.  Only you see this — students keep their own theme from the shop.",
    themeCloseAria: "Close theme picker",

    scaleGroupAria: "Display size",
    scaleNormalAria: "Normal size",
    scaleLargeAria: "Large size",
    scaleXLargeAria: "Extra large size",
  },

  he: {
    cancel: "ביטול",
    saving: "שומר…",

    createTitle: "יצירת כיתה חדשה",
    createBlurb: "הזן שם לכיתה שלך (לדוגמה: ח'-2)",
    classNamePlaceholder: "שם הכיתה",
    createBtn: "צור",

    classCreatedTitle: "הכיתה נוצרה!",
    classCreatedBlurb: "שתף את הקוד הזה עם התלמידים כדי שיוכלו להצטרף.",
    copyShort: "העתק",
    whatsAppShort: "וואטסאפ",
    doneBtn: "סיום",
    classCardCopyMsg: (className, code) => `${className} - קוד כיתה: ${code}`,

    editTitle: "עריכת כיתה",
    editBlurb: "שנה את שם הכיתה או בחר אווטאר חדש — התלמידים, המשימות וההתקדמות יישארו ללא שינוי. קוד הכיתה יישאר זהה.",
    classNameLabel: "שם הכיתה",
    classNameInputPlaceholder: "לדוגמה: ח'-2",
    classCodeStatic: (code) => `קוד כיתה: ${code} (לא ניתן לשינוי)`,
    classAvatarLabel: "אווטאר הכיתה",
    useDefaultIconTitle: "השתמש באייקון ברירת מחדל",
    saveChanges: "שמור שינויים",

    delAssignTitle: "למחוק את המשימה?",
    delAssignBody: (title) =>
      `אתה עומד למחוק את "${title}". פעולה זו אינה הפיכה — כל ההתקדמות והנתונים של התלמידים במשימה זו יימחקו לצמיתות.`,
    delAssignWarn: "⚠️ ודא שאתה אכן רוצה למחוק את המשימה לפני שתמשיך.",
    delAssignKeep: "השאר משימה",
    delAssignConfirm: "מחק משימה",

    rejectTitle: "לדחות תלמיד?",
    rejectBody: (name) =>
      `אתה עומד לדחות את "${name}". הוא/היא יצטרך/תצטרך להירשם מחדש עם קוד כיתה חדש כדי להצטרף.`,
    rejectWarn: "⚠️ פעולה זו אינה הפיכה. פרופיל התלמיד יסומן כנדחה.",
    rejectKeep: "השאר תלמיד",
    rejectConfirm: "דחה תלמיד",

    confirmActionTitle: "אישור פעולה",
    confirmBtn: "אשר",

    sendXpBoostTitle: "שלח בוסט XP",
    sendXpBoostBlurb: (name) => `תגמל את ${name} על ההשקעה`,
    selectXpAmount: "בחר כמות XP:",
    shortMsgToStudentLabel: "הודעה קצרה לתלמיד (אופציונלי)",
    shortMsgPlaceholder: "לדוגמה: השתתפות נהדרת היום!",
    shortMsgHelper: "מופיעה בלוח הבקרה של התלמיד ליד בוסט ה-XP.",
    closeAria: "סגור",
    sendingShort: "שולח...",
    sendXp: "שלח XP",
    sentXpToast: (xp, name) => `נשלחו +${xp} XP אל ${name}!`,
    rewardErrorToast: (reason) => `לא ניתן היה להעניק תגמול: ${reason}`,
    rewardUnknownError: "שגיאה לא ידועה",

    themeMenuHeading: "ערכת נושא ללוח הבקרה",
    themeMenuBlurb: "בחר מראה ללוח הבקרה שלך. רק אתה רואה את זה — לתלמידים יש ערכת נושא משלהם מהחנות.",
    themeCloseAria: "סגור בורר ערכת נושא",

    scaleGroupAria: "גודל תצוגה",
    scaleNormalAria: "גודל רגיל",
    scaleLargeAria: "גודל גדול",
    scaleXLargeAria: "גודל גדול במיוחד",
  },

  ar: {
    cancel: "إلغاء",
    saving: "جارٍ الحفظ…",

    createTitle: "إنشاء فصل جديد",
    createBlurb: "أدخل اسمًا لفصلك (مثلاً: الصف 8-ب)",
    classNamePlaceholder: "اسم الفصل",
    createBtn: "إنشاء",

    classCreatedTitle: "تم إنشاء الفصل!",
    classCreatedBlurb: "شارك هذا الرمز مع طلابك ليتمكنوا من الانضمام.",
    copyShort: "نسخ",
    whatsAppShort: "واتساب",
    doneBtn: "تم",
    classCardCopyMsg: (className, code) => `${className} - رمز الفصل: ${code}`,

    editTitle: "تعديل الفصل",
    editBlurb: "أعد تسمية هذا الفصل أو اختر صورة جديدة — يبقى الطلاب والواجبات والتقدم سليمًا. يبقى رمز الفصل كما هو.",
    classNameLabel: "اسم الفصل",
    classNameInputPlaceholder: "مثلاً: الصف 8-ب",
    classCodeStatic: (code) => `رمز الفصل: ${code} (لا يمكن تغييره)`,
    classAvatarLabel: "صورة الفصل",
    useDefaultIconTitle: "استخدام الأيقونة الافتراضية",
    saveChanges: "حفظ التغييرات",

    delAssignTitle: "حذف الواجب؟",
    delAssignBody: (title) =>
      `أنت على وشك حذف "${title}". لا يمكن التراجع عن هذا الإجراء — سيُحذف نهائيًا كل تقدم الطلاب وبيانات هذا الواجب.`,
    delAssignWarn: "⚠️ تأكد من رغبتك في حذف الواجب قبل المتابعة.",
    delAssignKeep: "الإبقاء على الواجب",
    delAssignConfirm: "حذف الواجب",

    rejectTitle: "رفض الطالب؟",
    rejectBody: (name) =>
      `أنت على وشك رفض "${name}". سيحتاج/تحتاج إلى التسجيل مرة أخرى برمز فصل جديد للانضمام إلى صفك.`,
    rejectWarn: "⚠️ لا يمكن التراجع عن هذا الإجراء. سيُعلَّم ملف الطالب كمرفوض.",
    rejectKeep: "الإبقاء على الطالب",
    rejectConfirm: "رفض الطالب",

    confirmActionTitle: "تأكيد الإجراء",
    confirmBtn: "تأكيد",

    sendXpBoostTitle: "أرسل دعم XP",
    sendXpBoostBlurb: (name) => `كافِئ ${name} على جهده`,
    selectXpAmount: "اختر كمية XP:",
    shortMsgToStudentLabel: "رسالة قصيرة للطالب (اختياري)",
    shortMsgPlaceholder: "مثلاً: مشاركة رائعة اليوم!",
    shortMsgHelper: "تظهر في لوحة الطالب بجوار دعم XP.",
    closeAria: "إغلاق",
    sendingShort: "جارٍ الإرسال...",
    sendXp: "أرسل XP",
    sentXpToast: (xp, name) => `أُرسلت +${xp} XP إلى ${name}!`,
    rewardErrorToast: (reason) => `تعذر منح المكافأة: ${reason}`,
    rewardUnknownError: "خطأ غير معروف",

    themeMenuHeading: "سمة لوحة التحكم",
    themeMenuBlurb: "اختر مظهرًا للوحة التحكم خاصتك. تراه أنت فقط — الطلاب يحتفظون بسمتهم الخاصة من المتجر.",
    themeCloseAria: "إغلاق منتقي السمة",

    scaleGroupAria: "حجم العرض",
    scaleNormalAria: "حجم عادي",
    scaleLargeAria: "حجم كبير",
    scaleXLargeAria: "حجم كبير جدًا",
  },
};
