/**
 * Locale file for the Teacher Dashboard surface (always-on chrome).
 *
 * Covers:
 *  - TeacherDashboardView (greeting + hero + theme button)
 *  - TeacherQuickActions (Quick Play / Classroom / Approvals tiles)
 *  - TeacherClassesSection (header + empty state)
 *  - ClassCard (avatar picker, more menu, assignments list)
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherDashboardT {
  // ─── Hero ───────────────────────────────────────────────────────
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  /** "{firstName}, here's your classroom." */
  heroLine: (firstName: string) => string;
  heroSubtitle: string;
  defaultFirstName: string;

  // ─── Trial / plan banner ────────────────────────────────────────
  trialBannerActive: (daysLeft: number) => string;
  trialBannerActiveCta: string;
  trialBannerExpired: string;
  trialBannerExpiredCta: string;

  // ─── Theme picker trigger ───────────────────────────────────────
  changeThemeTitle: string;

  // ─── Quick actions ─────────────────────────────────────────────
  quickActionsHeading: string;
  qpTitle: string;
  qpDescription: string;
  qpTooltip: string;
  qpButton: string;
  classroomTitle: string;
  classroomDescription: string;
  classroomTooltip: string;
  classroomButton: string;
  approvalsTitle: string;
  approvalsTooltip: string;
  /** "{n} student waiting" / "{n} students waiting". */
  approvalsWaiting: (n: number) => string;
  approvalsNoPending: string;
  approvalsButtonReview: string;
  approvalsButtonCheck: string;

  // ─── Classes section ───────────────────────────────────────────
  myClassesHeading: string;
  noClassesYetSubtitle: string;
  /** "{n} class" / "{n} classes". */
  classCount: (n: number) => string;
  newClassFull: string;
  newClassShort: string;
  newClassAria: string;
  emptyTitle: string;
  emptySubtitle: string;
  emptyCta: string;

  // ─── ClassCard ─────────────────────────────────────────────────
  pickAvatarHeading: string;
  defaultAvatarLabel: string;
  changeAvatarTitle: string;
  saving: string;
  classNamePlaceholder: string;
  clickToEditNameTitle: string;
  copyClassCodeTitle: string;
  classOptionsAria: string;
  shareWhatsApp: string;
  copyClassCode: string;
  printPoster: string;
  shareClassLink: string;
  shareClassLinkEyebrow: string;
  shareClassLinkSubtitle: string;
  shareClassLinkCodeLabel: string;
  shareClassLinkCopy: string;
  shareClassLinkCopied: string;
  shareClassLinkDone: string;
  deleteClass: string;
  newAssignment: string;
  deleteAssignmentAria: string;
  noDeadline: string;
  /** "{n} word" / "{n} words". */
  wordCount: (n: number) => string;
  editAssignment: string;
  duplicateAssignment: string;
}

export const teacherDashboardT: Record<Language, TeacherDashboardT> = {
  en: {
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    heroLine: (firstName) => `${firstName}, here's your classroom.`,
    heroSubtitle: "Manage your classes, review student progress, and create new assignments in a few taps.",
    defaultFirstName: "Teacher",

    trialBannerActive: (daysLeft) => `Pro trial: ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`,
    trialBannerActiveCta: "Upgrade to Pro",
    trialBannerExpired: "Your Pro trial has ended.",
    trialBannerExpiredCta: "Upgrade to Pro",

    changeThemeTitle: "Change dashboard theme",

    quickActionsHeading: "Quick actions",
    qpTitle: "Quick Play",
    qpDescription: "Instant QR code challenge",
    qpTooltip: "Create a QR code for students to scan and play selected words - no login required!",
    qpButton: "Create",
    classroomTitle: "Classroom",
    classroomDescription: "Pulse · Mastery · Records",
    classroomTooltip: "One place for everything classroom: who needs attention now (Pulse), per-word mastery + weak words (Mastery), and the full per-student records + CSV export (Records).",
    classroomButton: "Open",
    approvalsTitle: "Approvals",
    approvalsTooltip: "Approve students who signed up for your classes",
    approvalsWaiting: (n) => `${n} student${n === 1 ? '' : 's'} waiting`,
    approvalsNoPending: "No pending approvals",
    approvalsButtonReview: "Review",
    approvalsButtonCheck: "Check",

    myClassesHeading: "My classes",
    noClassesYetSubtitle: "You haven't created any classes yet.",
    classCount: (n) => `${n} class${n === 1 ? '' : 'es'}`,
    newClassFull: "New class",
    newClassShort: "New",
    newClassAria: "Create new class",
    emptyTitle: "No classes yet",
    emptySubtitle: "Create your first class to get a shareable join code.",
    emptyCta: "Create first class",

    pickAvatarHeading: "Pick avatar",
    defaultAvatarLabel: "Default",
    changeAvatarTitle: "Change avatar",
    saving: "Saving...",
    classNamePlaceholder: "Class name",
    clickToEditNameTitle: "Click to edit name",
    copyClassCodeTitle: "Copy class code",
    classOptionsAria: "Class options",
    shareWhatsApp: "Share via WhatsApp",
    copyClassCode: "Copy class code",
    printPoster: "Print classroom poster",
    shareClassLink: "Share class link & QR",
    shareClassLinkEyebrow: "Class join link",
    shareClassLinkSubtitle: "Students scan the QR or open the link to land directly on the class join screen — no marketing detour, no extra typing.",
    shareClassLinkCodeLabel: "Class code",
    shareClassLinkCopy: "Copy",
    shareClassLinkCopied: "Copied",
    shareClassLinkDone: "Done",
    deleteClass: "Delete class",
    newAssignment: "New assignment",
    deleteAssignmentAria: "Delete assignment",
    noDeadline: "No deadline",
    wordCount: (n) => `${n} word${n === 1 ? '' : 's'}`,
    editAssignment: "Edit",
    duplicateAssignment: "Duplicate",
  },

  he: {
    greetingMorning: "בוקר טוב",
    greetingAfternoon: "צהריים טובים",
    greetingEvening: "ערב טוב",
    heroLine: (firstName) => `${firstName}, הכיתה שלך מחכה.`,
    heroSubtitle: "נהל את הכיתות שלך, עקוב אחרי התקדמות התלמידים וצור משימות חדשות בכמה הקשות.",
    defaultFirstName: "מורה",

    trialBannerActive: (daysLeft) => `ניסיון Pro: נותרו ${daysLeft} ${daysLeft === 1 ? 'יום' : 'ימים'}`,
    trialBannerActiveCta: "שדרגו ל־Pro",
    trialBannerExpired: "תקופת הניסיון של Pro הסתיימה.",
    trialBannerExpiredCta: "שדרגו ל־Pro",

    changeThemeTitle: "החלפת ערכת נושא",

    quickActionsHeading: "פעולות מהירות",
    qpTitle: "משחק מהיר",
    qpDescription: "אתגר QR מיידי",
    qpTooltip: "צור קוד QR כדי שהתלמידים יסרקו וישחקו עם המילים שבחרת — בלי הרשמה!",
    qpButton: "צור",
    classroomTitle: "כיתה",
    classroomDescription: "פעילות · שליטה · רשומות",
    classroomTooltip: "מקום אחד לכל הצרכים הכיתתיים: מי זקוק לתשומת לב עכשיו (פעילות), שליטה לכל מילה ומילים חלשות (שליטה), והרשומות המלאות לכל תלמיד עם ייצוא CSV (רשומות).",
    classroomButton: "פתח",
    approvalsTitle: "אישורים",
    approvalsTooltip: "אשר תלמידים שנרשמו לכיתות שלך",
    approvalsWaiting: (n) => `${n} ${n === 1 ? "תלמיד ממתין" : "תלמידים ממתינים"}`,
    approvalsNoPending: "אין אישורים ממתינים",
    approvalsButtonReview: "סקור",
    approvalsButtonCheck: "בדוק",

    myClassesHeading: "הכיתות שלי",
    noClassesYetSubtitle: "עוד לא יצרת כיתות.",
    classCount: (n) => `${n} ${n === 1 ? "כיתה" : "כיתות"}`,
    newClassFull: "כיתה חדשה",
    newClassShort: "חדש",
    newClassAria: "צור כיתה חדשה",
    emptyTitle: "עוד אין כיתות",
    emptySubtitle: "צור את הכיתה הראשונה שלך כדי לקבל קוד הצטרפות.",
    emptyCta: "צור כיתה ראשונה",

    pickAvatarHeading: "בחר אווטאר",
    defaultAvatarLabel: "ברירת מחדל",
    changeAvatarTitle: "שנה אווטאר",
    saving: "שומר...",
    classNamePlaceholder: "שם הכיתה",
    clickToEditNameTitle: "לחץ לעריכת השם",
    copyClassCodeTitle: "העתק קוד כיתה",
    classOptionsAria: "אפשרויות כיתה",
    shareWhatsApp: "שתף בוואטסאפ",
    copyClassCode: "העתק קוד כיתה",
    printPoster: "הדפס פוסטר לכיתה",
    shareClassLink: "שתף קישור וקוד QR",
    shareClassLinkEyebrow: "קישור להצטרפות לכיתה",
    shareClassLinkSubtitle: "תלמידים סורקים את ה־QR או פותחים את הקישור ומגיעים ישר למסך ההצטרפות לכיתה — בלי עקיפים, בלי הקלדה מיותרת.",
    shareClassLinkCodeLabel: "קוד כיתה",
    shareClassLinkCopy: "העתק",
    shareClassLinkCopied: "הועתק",
    shareClassLinkDone: "סיום",
    deleteClass: "מחק כיתה",
    newAssignment: "משימה חדשה",
    deleteAssignmentAria: "מחק משימה",
    noDeadline: "ללא תאריך יעד",
    wordCount: (n) => `${n} ${n === 1 ? "מילה" : "מילים"}`,
    editAssignment: "ערוך",
    duplicateAssignment: "שכפל",
  },

  ar: {
    greetingMorning: "صباح الخير",
    greetingAfternoon: "مساء الخير",
    greetingEvening: "مساء الخير",
    heroLine: (firstName) => `${firstName}، فصلك جاهز.`,
    heroSubtitle: "أدر فصولك، وتابع تقدّم الطلاب، وأنشئ واجبات جديدة بنقرات قليلة.",
    defaultFirstName: "معلم",

    trialBannerActive: (daysLeft) => `تجربة Pro: متبقي ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}`,
    trialBannerActiveCta: "ترقية إلى Pro",
    trialBannerExpired: "انتهت تجربة Pro الخاصة بك.",
    trialBannerExpiredCta: "ترقية إلى Pro",

    changeThemeTitle: "تغيير سمة لوحة التحكم",

    quickActionsHeading: "إجراءات سريعة",
    qpTitle: "لعب سريع",
    qpDescription: "تحدٍّ فوري برمز QR",
    qpTooltip: "أنشئ رمز QR ليمسحه الطلاب ويلعبوا بالكلمات المختارة — دون الحاجة لتسجيل الدخول!",
    qpButton: "إنشاء",
    classroomTitle: "الفصل",
    classroomDescription: "النبض · الإتقان · السجلات",
    classroomTooltip: "مكان واحد لكل ما يخص الفصل: من يحتاج اهتمامًا الآن (النبض)، إتقان كل كلمة والكلمات الضعيفة (الإتقان)، والسجلات الكاملة لكل طالب مع تصدير CSV (السجلات).",
    classroomButton: "فتح",
    approvalsTitle: "الموافقات",
    approvalsTooltip: "وافق على الطلاب الذين سجّلوا في فصولك",
    approvalsWaiting: (n) => `${n} ${n === 1 ? "طالب ينتظر" : "طلاب ينتظرون"}`,
    approvalsNoPending: "لا توجد موافقات معلقة",
    approvalsButtonReview: "مراجعة",
    approvalsButtonCheck: "تحقّق",

    myClassesHeading: "فصولي",
    noClassesYetSubtitle: "لم تنشئ أي فصول بعد.",
    classCount: (n) => `${n} ${n === 1 ? "فصل" : "فصول"}`,
    newClassFull: "فصل جديد",
    newClassShort: "جديد",
    newClassAria: "أنشئ فصلاً جديدًا",
    emptyTitle: "لا توجد فصول بعد",
    emptySubtitle: "أنشئ فصلك الأول للحصول على رمز انضمام قابل للمشاركة.",
    emptyCta: "أنشئ أول فصل",

    pickAvatarHeading: "اختر صورة",
    defaultAvatarLabel: "افتراضي",
    changeAvatarTitle: "تغيير الصورة",
    saving: "جارٍ الحفظ...",
    classNamePlaceholder: "اسم الفصل",
    clickToEditNameTitle: "انقر لتعديل الاسم",
    copyClassCodeTitle: "انسخ رمز الفصل",
    classOptionsAria: "خيارات الفصل",
    shareWhatsApp: "شارك عبر واتساب",
    copyClassCode: "انسخ رمز الفصل",
    printPoster: "اطبع ملصق الفصل",
    shareClassLink: "شارك رابط ورمز QR للفصل",
    shareClassLinkEyebrow: "رابط الانضمام إلى الفصل",
    shareClassLinkSubtitle: "يقوم الطلاب بمسح رمز QR أو فتح الرابط للوصول مباشرة إلى شاشة الانضمام للفصل — دون مرور بصفحات تسويقية أو كتابة إضافية.",
    shareClassLinkCodeLabel: "رمز الفصل",
    shareClassLinkCopy: "انسخ",
    shareClassLinkCopied: "تم النسخ",
    shareClassLinkDone: "تم",
    deleteClass: "احذف الفصل",
    newAssignment: "واجب جديد",
    deleteAssignmentAria: "احذف الواجب",
    noDeadline: "بدون موعد نهائي",
    wordCount: (n) => `${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    editAssignment: "تعديل",
    duplicateAssignment: "تكرار",
  },
};
