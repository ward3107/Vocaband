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

  // ─── Plan-state card in the Management grid ─────────────────────
  // Four variants — every teacher now sees a card so paid Pro / School
  // teachers get a positive confirmation of their plan rather than the
  // absence of an upgrade prompt.
  /** Small uppercase label above the plan name ("Your plan"). */
  planCardLabel: string;
  /** Short labels for the TopAppBar plan pill — sit next to the teacher
   *  name, so they need to be brief (one or two words max). */
  planPillFree: string;
  planPillTrial: (daysLeft: number) => string;
  planPillPro: string;
  planPillSchool: string;
  planCardTrialTitle: string;
  planCardTrialDesc: (daysLeft: number) => string;
  planCardFreeTitle: string;
  planCardFreeDesc: string;
  planCardProTitle: string;
  planCardProDesc: string;
  planCardSchoolTitle: string;
  /** Receives the school's display name (or null when missing). */
  planCardSchoolDesc: (schoolName: string | null) => string;
  planCardTooltip: string;

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
  approvalsButtonReview: string;
  approvalsButtonCheck: string;

  // ─── Worksheet Results tile (interactive worksheet attempts) ──
  worksheetResultsTitle: string;
  worksheetResultsDescription: string;
  worksheetResultsTooltip: string;

  // ─── Vocabulary Library tile ──────────────────────────────────
  libraryTitle: string;
  libraryDescription: string;
  libraryTooltip: string;

  // ─── Quick Play hero accents + section headings ────────────────
  qpInstantBadge: string;
  qpStartBtn: string;
  forYourClassesHeading: string;
  managementHeading: string;

  // ─── Class Show / Worksheet / Vocabagrut tiles ─────────────────
  classShowTitle: string;
  classShowDescription: string;
  classShowTooltip: string;
  worksheetTitle: string;
  worksheetDescription: string;
  worksheetTooltip: string;
  vocabagrutTitle: string;
  vocabagrutDescription: string;
  vocabagrutTooltip: string;
  hotSeatTitle: string;
  hotSeatDescription: string;
  hotSeatTooltip: string;
  wheelTitle: string;
  wheelDescription: string;
  wheelTooltip: string;

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
  /** Header above the accent-colour swatch row in the pastel
   *  avatar popover (English dashboard only). */
  accentColorHeading: string;
  defaultAvatarLabel: string;
  changeAvatarTitle: string;
  saving: string;
  classNamePlaceholder: string;
  clickToEditNameTitle: string;
  copyClassCodeTitle: string;
  classOptionsAria: string;
  shareWhatsApp: string;
  shareGoogleClassroom: string;
  shareTeams: string;
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

  // ClassCard primary action row (Roster button + assignment-row actions)
  rosterShortLabel: string;
  rosterButtonTitle: string;
  rosterButtonAria: string;
  shareAssignmentAria: string;
  shareAssignmentTitle: string;
  shareShortLabel: string;
  projectToClassAria: string;
  projectShortLabel: string;
  printWorksheetAria: string;
  printShortLabel: string;
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

    planCardLabel: "Your plan",
    planPillFree: "Free",
    planPillTrial: (daysLeft) => `Trial · ${daysLeft}d`,
    planPillPro: "Pro",
    planPillSchool: "School",
    planCardTrialTitle: "Pro trial",
    planCardTrialDesc: (daysLeft) => `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left · Upgrade`,
    planCardFreeTitle: "Free plan",
    planCardFreeDesc: "Upgrade to unlock Pro features",
    planCardProTitle: "Pro plan",
    planCardProDesc: "Active · All Pro features unlocked",
    planCardSchoolTitle: "School license",
    planCardSchoolDesc: (schoolName) => schoolName ? `Active · ${schoolName}` : "Active · School-wide license",
    planCardTooltip: "View your plan and upgrade options",

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
    approvalsButtonReview: "Review",
    approvalsButtonCheck: "Check",

    worksheetResultsTitle: "Worksheet Results",
    worksheetResultsDescription: "Scores from shared worksheets",
    worksheetResultsTooltip: "See who completed the worksheets you shared via the Free Resources page and how they did.",

    libraryTitle: "Vocabulary Library",
    libraryDescription: "Your saved word lists & collections",
    libraryTooltip: "Build vocabulary sets from photos, paste, AI, or your curriculum — organize them into collections and reuse across classes.",

    qpInstantBadge: "Instant",
    qpStartBtn: "Start",
    forYourClassesHeading: "For your classes",
    managementHeading: "Management",

    classShowTitle: "Class Show",
    classShowDescription: "Project to the classroom",
    classShowTooltip: "Project a vocabulary game on your classroom screen. Students answer by raising their hand or shouting the answer — no phones needed.",
    worksheetTitle: "Worksheet",
    worksheetDescription: "Print a sheet for class",
    worksheetTooltip: "Generate a printable worksheet (word list, scramble, fill-in-the-blank, or match-up) and print or save as PDF. Works without any projector.",
    vocabagrutTitle: "Vocabagrut",
    vocabagrutDescription: "Bagrut-style mock exam",
    vocabagrutTooltip: "Generate a Bagrut-style mock exam from your word list. Looks like the real Israeli MoE Bagrut paper — perfect for format familiarity in grades 7–9.",
    hotSeatTitle: "Hot Seat",
    hotSeatDescription: "Pass-around single-device game",
    hotSeatTooltip: "One device, many players. Type student names, pass the tablet around — each student gets a turn in the hot seat. Perfect for classes where not every kid has a phone.",
    wheelTitle: "Vocab Wheel",
    wheelDescription: "Spin to pick a student + a challenge",
    wheelTooltip: "Project the wheel on your classroom screen. Each spin randomly picks a student AND a challenge type (meaning, translation, fill-in-the-blank, true/false). Keeps the whole class engaged because anyone could be next.",

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
    accentColorHeading: "Color",
    defaultAvatarLabel: "Default",
    changeAvatarTitle: "Change avatar",
    saving: "Saving...",
    classNamePlaceholder: "Class name",
    clickToEditNameTitle: "Click to edit name",
    copyClassCodeTitle: "Copy class code",
    classOptionsAria: "Class options",
    shareWhatsApp: "Share via WhatsApp",
    shareGoogleClassroom: "Post to Google Classroom",
    shareTeams: "Post to Microsoft Teams",
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
    newAssignment: "New activity",
    deleteAssignmentAria: "Delete assignment",
    noDeadline: "No deadline",
    wordCount: (n) => `${n} word${n === 1 ? '' : 's'}`,
    editAssignment: "Edit",
    duplicateAssignment: "Duplicate",
    rosterShortLabel: "Roster",
    rosterButtonTitle: "Manage roster + PINs",
    rosterButtonAria: "Manage roster",
    shareAssignmentAria: "Share assignment link",
    shareAssignmentTitle: "Share assignment link",
    shareShortLabel: "Share",
    projectToClassAria: "Project to class",
    projectShortLabel: "Project",
    printWorksheetAria: "Worksheet — print or share online",
    printShortLabel: "Worksheet",
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

    planCardLabel: "התוכנית שלכם",
    planPillFree: "חינם",
    planPillTrial: (daysLeft) => `ניסיון · ${daysLeft} ימים`,
    planPillPro: "Pro",
    planPillSchool: "בית-ספר",
    planCardTrialTitle: "ניסיון Pro",
    planCardTrialDesc: (daysLeft) => `${daysLeft === 1 ? 'נותר יום אחד' : `נותרו ${daysLeft} ימים`} · שדרוג`,
    planCardFreeTitle: "תוכנית חינמית",
    planCardFreeDesc: "שדרגו כדי לפתוח את כל היכולות של Pro",
    planCardProTitle: "תוכנית Pro",
    planCardProDesc: "פעיל · כל יכולות Pro פתוחות",
    planCardSchoolTitle: "רישיון בית-ספרי",
    planCardSchoolDesc: (schoolName) => schoolName ? `פעיל · ${schoolName}` : "פעיל · רישיון לכל בית הספר",
    planCardTooltip: "צפו בתוכנית שלכם ובאפשרויות השדרוג",

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

    worksheetResultsTitle: "תוצאות דף עבודה",
    worksheetResultsDescription: "ציונים מדפי עבודה ששותפו",
    worksheetResultsTooltip: "ראה מי השלים את דפי העבודה ששיתפת דרך עמוד המשאבים החינמיים וכמה הצליחו.",
    approvalsButtonReview: "סקור",
    approvalsButtonCheck: "בדוק",

    libraryTitle: "ספריית אוצר המילים",
    libraryDescription: "רשימות המילים והאוספים השמורים שלך",
    libraryTooltip: "בנו רשימות מילים מצילומים, הדבקת טקסט, AI או מתוכנית הלימודים — סדרו אותן באוספים והשתמשו בהן שוב בכיתות שונות.",

    qpInstantBadge: "מיידי",
    qpStartBtn: "התחל",
    forYourClassesHeading: "לכיתות שלך",
    managementHeading: "ניהול",

    classShowTitle: "מצב הקרנה",
    classShowDescription: "הקרנה לכיתה",
    classShowTooltip: "הקרינו משחק אוצר מילים על מסך הכיתה. התלמידים עונים בהרמת יד או בקריאה — בלי טלפונים.",
    worksheetTitle: "דף עבודה",
    worksheetDescription: "הדפסה לשיעור",
    worksheetTooltip: "צרו דף עבודה להדפסה (רשימת מילים, ערבוב אותיות, השלמה, או התאמה). אפשר להדפיס או לשמור כ־PDF. עובד גם בלי מקרן.",
    vocabagrutTitle: "ווקבגרות",
    vocabagrutDescription: "מבחן בגרות לדוגמה",
    vocabagrutTooltip: "צרו מבחן בנוסח בגרות מתוך רשימת המילים שלכם. נראה כמו השאלון של משרד החינוך — מצוין להיכרות עם הפורמט בכיתות ז–ט.",
    hotSeatTitle: "כיסא חם",
    hotSeatDescription: "משחק במכשיר אחד עם תורות",
    hotSeatTooltip: "מכשיר אחד, הרבה שחקנים. הקלידו שמות תלמידים, העבירו את הטאבלט — לכל תלמיד תור בכיסא החם. מושלם לכיתות שבהן לא לכל ילד יש טלפון.",
    wheelTitle: "גלגל המילים",
    wheelDescription: "סובבו לבחור תלמיד ואתגר",
    wheelTooltip: "הקרינו את הגלגל למסך הכיתה. כל סיבוב בוחר באקראי תלמיד וגם סוג אתגר (משמעות, תרגום, השלמת חסר, נכון/לא נכון). שומר על מעורבות כל הכיתה — כי כל אחד יכול להיות הבא בתור.",

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
    accentColorHeading: "צבע",
    defaultAvatarLabel: "ברירת מחדל",
    changeAvatarTitle: "שנה אווטאר",
    saving: "שומר...",
    classNamePlaceholder: "שם הכיתה",
    clickToEditNameTitle: "לחץ לעריכת השם",
    copyClassCodeTitle: "העתק קוד כיתה",
    classOptionsAria: "אפשרויות כיתה",
    shareWhatsApp: "שתף בוואטסאפ",
    shareGoogleClassroom: "פרסם ב-Google Classroom",
    shareTeams: "פרסם ב-Microsoft Teams",
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
    newAssignment: "פעילות חדשה",
    deleteAssignmentAria: "מחק משימה",
    noDeadline: "ללא תאריך יעד",
    wordCount: (n) => `${n} ${n === 1 ? "מילה" : "מילים"}`,
    editAssignment: "ערוך",
    duplicateAssignment: "שכפל",
    rosterShortLabel: "רשימה",
    rosterButtonTitle: "ניהול רשימה ו-PINs",
    rosterButtonAria: "ניהול רשימת הכיתה",
    shareAssignmentAria: "שיתוף קישור למשימה",
    shareAssignmentTitle: "שיתוף קישור למשימה",
    shareShortLabel: "שתף",
    projectToClassAria: "הקרנה לכיתה",
    projectShortLabel: "הקרן",
    printWorksheetAria: "דף עבודה — הדפסה או שיתוף מקוון",
    printShortLabel: "דף עבודה",
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

    planCardLabel: "خطتك",
    planPillFree: "مجاني",
    planPillTrial: (daysLeft) => `تجربة · ${daysLeft} أيام`,
    planPillPro: "Pro",
    planPillSchool: "مدرسة",
    planCardTrialTitle: "تجربة Pro",
    planCardTrialDesc: (daysLeft) => `${daysLeft === 1 ? 'يوم واحد متبقي' : `${daysLeft} أيام متبقية`} · ترقية`,
    planCardFreeTitle: "الخطة المجانية",
    planCardFreeDesc: "ترقية لفتح ميزات Pro",
    planCardProTitle: "خطة Pro",
    planCardProDesc: "نشط · جميع ميزات Pro مفتوحة",
    planCardSchoolTitle: "ترخيص مدرسي",
    planCardSchoolDesc: (schoolName) => schoolName ? `نشط · ${schoolName}` : "نشط · ترخيص لكامل المدرسة",
    planCardTooltip: "اعرض خطتك وخيارات الترقية",

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

    worksheetResultsTitle: "نتائج ورقة العمل",
    worksheetResultsDescription: "نتائج أوراق العمل المشتركة",
    worksheetResultsTooltip: "اطّلع على من أكمل أوراق العمل التي شاركتها عبر صفحة الموارد المجانية وعلى كيفية أدائهم.",
    approvalsButtonReview: "مراجعة",
    approvalsButtonCheck: "تحقّق",

    libraryTitle: "مكتبة المفردات",
    libraryDescription: "قوائم الكلمات والمجموعات المحفوظة لديك",
    libraryTooltip: "أنشئ قوائم مفردات من الصور أو النصوص الملصوقة أو الذكاء الاصطناعي أو منهجك — رتّبها في مجموعات وأعد استخدامها عبر الفصول.",

    qpInstantBadge: "فوري",
    qpStartBtn: "ابدأ",
    forYourClassesHeading: "لفصولك",
    managementHeading: "الإدارة",

    classShowTitle: "عرض الفصل",
    classShowDescription: "عرض على شاشة الفصل",
    classShowTooltip: "اعرض لعبة مفردات على شاشة الفصل. يجيب الطلاب برفع الأيدي أو بالنطق — دون الحاجة إلى هواتف.",
    worksheetTitle: "ورقة عمل",
    worksheetDescription: "اطبع ورقة للفصل",
    worksheetTooltip: "أنشئ ورقة عمل قابلة للطباعة (قائمة كلمات، تشويش حروف، ملء فراغ، أو مطابقة) واطبعها أو احفظها كـ PDF. تعمل بدون أي شاشة عرض.",
    vocabagrutTitle: "ووكاباجروت",
    vocabagrutDescription: "نموذج اختبار باجروت",
    vocabagrutTooltip: "أنشئ نموذج اختبار بنمط باجروت من قائمة الكلمات. يبدو مثل ورقة باجروت الإسرائيلية الحقيقية — ممتاز للتعرف على الشكل في الصفوف 7–9.",
    hotSeatTitle: "الكرسي الساخن",
    hotSeatDescription: "لعبة بجهاز واحد بالأدوار",
    hotSeatTooltip: "جهاز واحد، عدة لاعبين. اكتب أسماء الطلاب ومرّر الجهاز — كل طالب يحصل على دوره في الكرسي الساخن. مثالي للصفوف التي لا يملك فيها كل طالب هاتفًا.",
    wheelTitle: "عجلة المفردات",
    wheelDescription: "أدرها لاختيار طالب وتحدٍ",
    wheelTooltip: "اعرض العجلة على شاشة الصف. كل دورة تختار طالبًا عشوائيًا ونوع تحدٍ (المعنى، الترجمة، ملء الفراغ، صح/خطأ). تحافظ على انتباه الصف بأكمله — لأن أي شخص قد يكون التالي.",

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
    accentColorHeading: "اللون",
    defaultAvatarLabel: "افتراضي",
    changeAvatarTitle: "تغيير الصورة",
    saving: "جارٍ الحفظ...",
    classNamePlaceholder: "اسم الفصل",
    clickToEditNameTitle: "انقر لتعديل الاسم",
    copyClassCodeTitle: "انسخ رمز الفصل",
    classOptionsAria: "خيارات الفصل",
    shareWhatsApp: "شارك عبر واتساب",
    shareGoogleClassroom: "انشر في Google Classroom",
    shareTeams: "انشر في Microsoft Teams",
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
    newAssignment: "نشاط جديد",
    deleteAssignmentAria: "احذف الواجب",
    noDeadline: "بدون موعد نهائي",
    wordCount: (n) => `${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    editAssignment: "تعديل",
    duplicateAssignment: "تكرار",
    rosterShortLabel: "القائمة",
    rosterButtonTitle: "إدارة القائمة ورموز PIN",
    rosterButtonAria: "إدارة قائمة الصف",
    shareAssignmentAria: "مشاركة رابط الواجب",
    shareAssignmentTitle: "مشاركة رابط الواجب",
    shareShortLabel: "مشاركة",
    projectToClassAria: "عرض على الصف",
    projectShortLabel: "عرض",
    printWorksheetAria: "ورقة عمل — طباعة أو مشاركة عبر الإنترنت",
    printShortLabel: "ورقة عمل",
  },

  ru: {
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

    planCardLabel: "Your plan",
    planPillFree: "Free",
    planPillTrial: (daysLeft) => `Trial · ${daysLeft}d`,
    planPillPro: "Pro",
    planPillSchool: "School",
    planCardTrialTitle: "Pro trial",
    planCardTrialDesc: (daysLeft) => `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left · Upgrade`,
    planCardFreeTitle: "Free plan",
    planCardFreeDesc: "Upgrade to unlock Pro features",
    planCardProTitle: "Pro plan",
    planCardProDesc: "Active · All Pro features unlocked",
    planCardSchoolTitle: "School license",
    planCardSchoolDesc: (schoolName) => schoolName ? `Active · ${schoolName}` : "Active · School-wide license",
    planCardTooltip: "View your plan and upgrade options",

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
    approvalsButtonReview: "Review",
    approvalsButtonCheck: "Check",

    worksheetResultsTitle: "Worksheet Results",
    worksheetResultsDescription: "Scores from shared worksheets",
    worksheetResultsTooltip: "See who completed the worksheets you shared via the Free Resources page and how they did.",

    libraryTitle: "Vocabulary Library",
    libraryDescription: "Your saved word lists & collections",
    libraryTooltip: "Build vocabulary sets from photos, paste, AI, or your curriculum — organize them into collections and reuse across classes.",

    qpInstantBadge: "Instant",
    qpStartBtn: "Start",
    forYourClassesHeading: "For your classes",
    managementHeading: "Management",

    classShowTitle: "Class Show",
    classShowDescription: "Project to the classroom",
    classShowTooltip: "Project a vocabulary game on your classroom screen. Students answer by raising their hand or shouting the answer — no phones needed.",
    worksheetTitle: "Worksheet",
    worksheetDescription: "Print a sheet for class",
    worksheetTooltip: "Generate a printable worksheet (word list, scramble, fill-in-the-blank, or match-up) and print or save as PDF. Works without any projector.",
    vocabagrutTitle: "Vocabagrut",
    vocabagrutDescription: "Bagrut-style mock exam",
    vocabagrutTooltip: "Generate a Bagrut-style mock exam from your word list. Looks like the real Israeli MoE Bagrut paper — perfect for format familiarity in grades 7–9.",
    hotSeatTitle: "Hot Seat",
    hotSeatDescription: "Pass-around single-device game",
    hotSeatTooltip: "One device, many players. Type student names, pass the tablet around — each student gets a turn in the hot seat. Perfect for classes where not every kid has a phone.",
    wheelTitle: "Vocab Wheel",
    wheelDescription: "Spin to pick a student + a challenge",
    wheelTooltip: "Project the wheel on your classroom screen. Each spin randomly picks a student AND a challenge type (meaning, translation, fill-in-the-blank, true/false). Keeps the whole class engaged because anyone could be next.",

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
    accentColorHeading: "Color",
    defaultAvatarLabel: "Default",
    changeAvatarTitle: "Change avatar",
    saving: "Saving...",
    classNamePlaceholder: "Class name",
    clickToEditNameTitle: "Click to edit name",
    copyClassCodeTitle: "Copy class code",
    classOptionsAria: "Class options",
    shareWhatsApp: "Share via WhatsApp",
    shareGoogleClassroom: "Post to Google Classroom",
    shareTeams: "Post to Microsoft Teams",
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
    newAssignment: "New activity",
    deleteAssignmentAria: "Delete assignment",
    noDeadline: "No deadline",
    wordCount: (n) => `${n} word${n === 1 ? '' : 's'}`,
    editAssignment: "Edit",
    duplicateAssignment: "Duplicate",
    rosterShortLabel: "Roster",
    rosterButtonTitle: "Manage roster + PINs",
    rosterButtonAria: "Manage roster",
    shareAssignmentAria: "Share assignment link",
    shareAssignmentTitle: "Share assignment link",
    shareShortLabel: "Share",
    projectToClassAria: "Project to class",
    projectShortLabel: "Project",
    printWorksheetAria: "Worksheet — print or share online",
    printShortLabel: "Worksheet",
  },
};
