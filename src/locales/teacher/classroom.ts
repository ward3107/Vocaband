/**
 * Locale file for the Classroom view + its analytics components.
 *
 * Covers:
 *  - ClassroomView (TopAppBar title + 4 V2 tabs + 2 legacy tabs +
 *    StatChip labels passed in via props)
 *  - AttendanceTable
 *  - TopStrugglingWords
 *  - ReportsDashboard (KPI chips + section titles + sub-text)
 *  - ReportExportBar (CSV/PDF buttons + toasts)
 *  - StatChip (the "What this means" tooltip header)
 *  - AdaptiveDrawer (close button aria)
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherClassroomT {
  // ─── Top app bar ────────────────────────────────────────────────
  classroomTitle: string;
  legacySubtitle: string;
  loading: string;

  // ─── V2 tabs ────────────────────────────────────────────────────
  tabToday: string;
  tabStudents: string;
  tabAssignments: string;
  tabReports: string;
  blurbToday: string;
  blurbStudents: string;
  blurbAssignments: string;
  blurbReports: string;

  // ─── Legacy tabs ────────────────────────────────────────────────
  tabPulse: string;
  tabMastery: string;

  // ─── Mobile bottom nav aria ────────────────────────────────────
  classroomSectionsAria: string;

  // ─── StatChips on Today tab ────────────────────────────────────
  statActiveLabel: string;
  statActiveTooltip: string;
  statAvgScoreLabel: string;
  statAvgScoreTooltip: string;
  statPlaysLabel: string;
  statPlaysTooltip: string;
  /** Heading inside StatChip's tooltip. */
  whatThisMeans: string;
  /** Tooltip aria-label template, e.g. `What "avg score" means`. */
  whatLabelMeansAria: (label: string) => string;

  // ─── AttendanceTable ───────────────────────────────────────────
  whoNeedsHelp: string;
  attendanceSubtitle: string;
  attendanceEmpty: string;
  attendanceColStudent: string;
  attendanceColDays: string;

  // ─── TopStrugglingWords ────────────────────────────────────────
  whatToReteach: string;
  reteachSubtitle: string;
  reteachCta: string;
  reteachEmpty: string;
  reteachColWord: string;
  reteachColHebrew: string;
  reteachColArabic: string;
  reteachColMisses: string;
  reteachColPctOfClass: string;

  // ─── ReportsDashboard ──────────────────────────────────────────
  kpiPlaysAllTime: string;
  kpiStudentsRoster: string;
  kpiAssignments: string;
  kpiPlaysThisWeek: string;
  trendTitle: string;
  trendSubtitle: string;
  trendAxisAvgScore: string;
  histogramTitle: string;
  histogramSubtitle: string;
  histogramAxisPlays: string;

  // ─── ReportExportBar (Excel + Report buttons) ──────────────────
  exportThisClass: string;
  exportEmpty: string;
  /** "{n} students · {m} plays · {className}". */
  exportSummary: (students: number, plays: number, className: string) => string;
  excelButton: string;
  reportButton: string;
  exportNothingToast: string;
  exportExcelSuccess: string;
  exportExcelFailed: string;
  // Shared report/excel column labels (Excel sheets reuse these so the
  // download names line up with the on-screen Report modal).
  pdfClassLabel: string;
  pdfExportedAt: string;
  /** "{n} students  ·  {m} plays  ·  avg {p}%  ·  roster {r}". */
  pdfHeadlineStats: (students: number, plays: number, avg: number, roster: number) => string;
  pdfStudentSummaryHeading: string;
  pdfAllPlaysHeading: string;
  pdfColStudent: string;
  pdfColPlays: string;
  pdfColAvg: string;
  pdfColBest: string;
  pdfColMistakes: string;
  pdfColLastActive: string;
  pdfColAssignment: string;
  pdfColMode: string;
  pdfColScore: string;
  pdfColDate: string;
  allClasses: string;
  quickPlayLabel: string;

  // Excel workbook sheet names + section headings
  excelSheetOverview: string;
  excelSheetGameHistory: string;
  excelSheetWordMastery: string;
  excelOverviewTitle: (className: string) => string;
  excelColStatus: string;
  excelColWord: string;
  excelColTimesMissed: string;
  excelColStudentsAffected: string;
  excelStatusGreen: string;
  excelStatusAmber: string;
  excelStatusRed: string;

  // ─── ClassReportModal ──────────────────────────────────────────
  reportModalTitle: string;
  reportModalSubtitle: (className: string) => string;
  reportCloseAria: string;
  reportEmpty: string;
  reportSummaryStudents: string;
  reportSummaryPlays: string;
  reportSummaryAvg: string;
  reportSummaryMistakes: string;
  reportPerStudentTitle: string;
  reportPerStudentSubtitle: string;
  reportPerStudentAxis: string;
  reportTopWordsTitle: string;
  reportTopWordsSubtitle: string;
  reportTopWordsAxis: string;
  reportTopWordsEmpty: string;
  reportStatusTableHeading: string;
  reportStatusGreen: string;
  reportStatusAmber: string;
  reportStatusRed: string;
  reportDownloadPdf: string;
  reportPrintBtn: string;
  reportPdfSuccess: string;
  reportPdfFailed: string;

  // ─── AdaptiveDrawer ────────────────────────────────────────────
  closeDetailsAria: string;
}

export const teacherClassroomT: Record<Language, TeacherClassroomT> = {
  en: {
    classroomTitle: "Classroom",
    legacySubtitle: "PULSE · MASTERY",
    loading: "Loading…",

    tabToday: "Today",
    tabStudents: "Students",
    tabAssignments: "Assignments",
    tabReports: "Reports",
    blurbToday: "Who needs my attention today?",
    blurbStudents: "Deep-dive on one kid",
    blurbAssignments: "How did my class do on this?",
    blurbReports: "Plan my next lesson",

    tabPulse: "Pulse",
    tabMastery: "Mastery",

    classroomSectionsAria: "Classroom sections",

    statActiveLabel: "active",
    statActiveTooltip: "Active = students who completed at least one game this week. The /N is the class roster total.",
    statAvgScoreLabel: "avg score",
    statAvgScoreTooltip: "Mean score across every completed game in the last 7 days. Green ≥80, amber 50–79, rose under 50.",
    statPlaysLabel: "plays",
    statPlaysTooltip: "Every time a student finishes a game mode counts as one play. Last 7 days.",
    whatThisMeans: "What this means",
    whatLabelMeansAria: (label) => `What "${label}" means`,

    whoNeedsHelp: "Who needs help",
    attendanceSubtitle: "Last 14 days · ✓ = played at least once that day · students at the bottom are drifting.",
    attendanceEmpty: "Add a class to see attendance.",
    attendanceColStudent: "Student",
    attendanceColDays: "Days",

    whatToReteach: "What to reteach",
    reteachSubtitle: "Most-missed words across the class. Coverage % shows how widespread the confusion is.",
    reteachCta: "Reteach these",
    reteachEmpty: "No mistakes recorded yet — your class is doing great.",
    reteachColWord: "Word",
    reteachColHebrew: "Hebrew",
    reteachColArabic: "Arabic",
    reteachColMisses: "Misses",
    reteachColPctOfClass: "% of class",

    kpiPlaysAllTime: "Plays (all-time)",
    kpiStudentsRoster: "Students on roster",
    kpiAssignments: "Assignments",
    kpiPlaysThisWeek: "Plays this week",
    trendTitle: "Class average — last 8 weeks",
    trendSubtitle: "Average score across every play, week by week. Gaps mean no plays that week.",
    trendAxisAvgScore: "Avg score",
    histogramTitle: "Plays per day — last 30 days",
    histogramSubtitle: "One bar per day.  Spikes around assignment due dates; flat days = nobody played.",
    histogramAxisPlays: "Plays",

    exportThisClass: "Export this class",
    exportEmpty: "No gameplay in this class yet — exports unlock once students start playing.",
    exportSummary: (students, plays, className) => `${students} students · ${plays} plays · ${className}`,
    excelButton: "Excel",
    reportButton: "Report",
    exportNothingToast: "Nothing to export yet — no gameplay in this class.",
    exportExcelSuccess: "Excel exported",
    exportExcelFailed: "Excel export failed — try again.",
    pdfClassLabel: "Class",
    pdfExportedAt: "Exported",
    pdfHeadlineStats: (students, plays, avg, roster) => `${students} students  ·  ${plays} plays  ·  avg ${avg}%  ·  roster ${roster}`,
    pdfStudentSummaryHeading: "Student summary",
    pdfAllPlaysHeading: "All plays (newest first)",
    pdfColStudent: "Student",
    pdfColPlays: "Plays",
    pdfColAvg: "Avg",
    pdfColBest: "Best",
    pdfColMistakes: "Mistakes",
    pdfColLastActive: "Last active",
    pdfColAssignment: "Assignment",
    pdfColMode: "Mode",
    pdfColScore: "Score",
    pdfColDate: "Date",
    allClasses: "All classes",
    quickPlayLabel: "Quick Play",

    excelSheetOverview: "Overview",
    excelSheetGameHistory: "Game History",
    excelSheetWordMastery: "Word Mastery",
    excelOverviewTitle: (className) => `Vocaband Gradebook — ${className}`,
    excelColStatus: "Status",
    excelColWord: "Word",
    excelColTimesMissed: "Times missed",
    excelColStudentsAffected: "Students affected",
    excelStatusGreen: "On track",
    excelStatusAmber: "Watch",
    excelStatusRed: "Needs support",

    reportModalTitle: "Class report",
    reportModalSubtitle: (className) => `Visual summary — ${className}`,
    reportCloseAria: "Close report",
    reportEmpty: "Nothing to chart yet — no gameplay in this class.",
    reportSummaryStudents: "Students",
    reportSummaryPlays: "Plays",
    reportSummaryAvg: "Avg score",
    reportSummaryMistakes: "Mistakes",
    reportPerStudentTitle: "Average score per student",
    reportPerStudentSubtitle: "Across every play in this class",
    reportPerStudentAxis: "Avg %",
    reportTopWordsTitle: "Words to review",
    reportTopWordsSubtitle: "Most-missed words across the class",
    reportTopWordsAxis: "Times missed",
    reportTopWordsEmpty: "No missed words logged yet — perfect run!",
    reportStatusTableHeading: "Per-student status",
    reportStatusGreen: "On track",
    reportStatusAmber: "Watch",
    reportStatusRed: "Needs support",
    reportDownloadPdf: "Download PDF",
    reportPrintBtn: "Print",
    reportPdfSuccess: "Report exported",
    reportPdfFailed: "Report export failed — try again.",

    closeDetailsAria: "Close details",
  },

  he: {
    classroomTitle: "כיתה",
    legacySubtitle: "פעילות · שליטה",
    loading: "טוען…",

    tabToday: "היום",
    tabStudents: "תלמידים",
    tabAssignments: "משימות",
    tabReports: "דוחות",
    blurbToday: "מי צריך תשומת לב היום?",
    blurbStudents: "צלילה לעומק על תלמיד",
    blurbAssignments: "איך הכיתה הסתדרה?",
    blurbReports: "תכנון השיעור הבא",

    tabPulse: "פעילות",
    tabMastery: "שליטה",

    classroomSectionsAria: "מקטעי הכיתה",

    statActiveLabel: "פעילים",
    statActiveTooltip: "פעיל = תלמיד שסיים לפחות משחק אחד השבוע. ה־/N הוא גודל הכיתה.",
    statAvgScoreLabel: "ציון ממוצע",
    statAvgScoreTooltip: "ציון ממוצע של כל המשחקים שהושלמו ב־7 הימים האחרונים. ירוק ≥80, ענבר 50–79, ורוד מתחת ל־50.",
    statPlaysLabel: "משחקים",
    statPlaysTooltip: "כל פעם שתלמיד מסיים מצב משחק נספרת כמשחק אחד. 7 הימים האחרונים.",
    whatThisMeans: "מה זה אומר",
    whatLabelMeansAria: (label) => `מה המשמעות של "${label}"`,

    whoNeedsHelp: "מי זקוק לעזרה",
    attendanceSubtitle: "14 ימים אחרונים · ✓ = שיחק לפחות פעם ביום · תלמידים בתחתית מתרחקים.",
    attendanceEmpty: "הוסף כיתה כדי לראות נוכחות.",
    attendanceColStudent: "תלמיד",
    attendanceColDays: "ימים",

    whatToReteach: "מה ללמד שוב",
    reteachSubtitle: "המילים שהוחמצו הכי הרבה בכיתה. אחוז הכיסוי מראה כמה הבלבול נפוץ.",
    reteachCta: "למד שוב",
    reteachEmpty: "אין טעויות עדיין — הכיתה מסתדרת מצוין.",
    reteachColWord: "מילה",
    reteachColHebrew: "עברית",
    reteachColArabic: "ערבית",
    reteachColMisses: "החמצות",
    reteachColPctOfClass: "% מהכיתה",

    kpiPlaysAllTime: "משחקים (סך הכל)",
    kpiStudentsRoster: "תלמידים בכיתה",
    kpiAssignments: "משימות",
    kpiPlaysThisWeek: "משחקים השבוע",
    trendTitle: "ממוצע כיתתי — 8 שבועות אחרונים",
    trendSubtitle: "ציון ממוצע על פני כל המשחקים, שבוע אחרי שבוע. רווחים = שבועות בלי משחקים.",
    trendAxisAvgScore: "ציון ממוצע",
    histogramTitle: "משחקים ליום — 30 ימים אחרונים",
    histogramSubtitle: "עמודה לכל יום. עליות סביב מועדי הגשה; ימים שטוחים = אף אחד לא שיחק.",
    histogramAxisPlays: "משחקים",

    exportThisClass: "ייצא את הכיתה",
    exportEmpty: "אין עדיין משחקים בכיתה הזו — הייצוא ייפתח כשתלמידים יתחילו לשחק.",
    exportSummary: (students, plays, className) => `${students} תלמידים · ${plays} משחקים · ${className}`,
    excelButton: "Excel",
    reportButton: "דוח",
    exportNothingToast: "אין מה לייצא — עוד לא היו משחקים בכיתה.",
    exportExcelSuccess: "Excel יוצא",
    exportExcelFailed: "ייצוא Excel נכשל — נסה שוב.",
    pdfClassLabel: "כיתה",
    pdfExportedAt: "יוצא",
    pdfHeadlineStats: (students, plays, avg, roster) => `${students} תלמידים  ·  ${plays} משחקים  ·  ממוצע ${avg}%  ·  כיתה ${roster}`,
    pdfStudentSummaryHeading: "סיכום תלמידים",
    pdfAllPlaysHeading: "כל המשחקים (חדשים ראשונים)",
    pdfColStudent: "תלמיד",
    pdfColPlays: "משחקים",
    pdfColAvg: "ממוצע",
    pdfColBest: "מיטב",
    pdfColMistakes: "טעויות",
    pdfColLastActive: "פעילות אחרונה",
    pdfColAssignment: "משימה",
    pdfColMode: "מצב",
    pdfColScore: "ציון",
    pdfColDate: "תאריך",
    allClasses: "כל הכיתות",
    quickPlayLabel: "משחק מהיר",

    excelSheetOverview: "סקירה",
    excelSheetGameHistory: "היסטוריית משחקים",
    excelSheetWordMastery: "שליטה במילים",
    excelOverviewTitle: (className) => `פנקס ציונים Vocaband — ${className}`,
    excelColStatus: "סטטוס",
    excelColWord: "מילה",
    excelColTimesMissed: "החמצות",
    excelColStudentsAffected: "תלמידים מושפעים",
    excelStatusGreen: "במסלול",
    excelStatusAmber: "במעקב",
    excelStatusRed: "זקוק לתמיכה",

    reportModalTitle: "דוח כיתה",
    reportModalSubtitle: (className) => `סיכום ויזואלי — ${className}`,
    reportCloseAria: "סגור דוח",
    reportEmpty: "אין עדיין נתונים להצגה — הכיתה לא שיחקה.",
    reportSummaryStudents: "תלמידים",
    reportSummaryPlays: "משחקים",
    reportSummaryAvg: "ציון ממוצע",
    reportSummaryMistakes: "טעויות",
    reportPerStudentTitle: "ציון ממוצע לכל תלמיד",
    reportPerStudentSubtitle: "ממוצע של כל המשחקים בכיתה",
    reportPerStudentAxis: "ממוצע %",
    reportTopWordsTitle: "מילים לחזרה",
    reportTopWordsSubtitle: "המילים שהוחמצו הכי הרבה בכיתה",
    reportTopWordsAxis: "מספר החמצות",
    reportTopWordsEmpty: "אין מילים שהוחמצו עדיין — כל הכבוד!",
    reportStatusTableHeading: "סטטוס לפי תלמיד",
    reportStatusGreen: "במסלול",
    reportStatusAmber: "במעקב",
    reportStatusRed: "זקוק לתמיכה",
    reportDownloadPdf: "הורד PDF",
    reportPrintBtn: "הדפס",
    reportPdfSuccess: "הדוח יוצא",
    reportPdfFailed: "ייצוא הדוח נכשל — נסה שוב.",

    closeDetailsAria: "סגור פרטים",
  },

  ar: {
    classroomTitle: "الفصل",
    legacySubtitle: "النبض · الإتقان",
    loading: "جارٍ التحميل…",

    tabToday: "اليوم",
    tabStudents: "الطلاب",
    tabAssignments: "الواجبات",
    tabReports: "التقارير",
    blurbToday: "من يحتاج اهتمامي اليوم؟",
    blurbStudents: "تعمّق مع طالب واحد",
    blurbAssignments: "كيف أبلى صفي في هذا الواجب؟",
    blurbReports: "خطّط درسي القادم",

    tabPulse: "النبض",
    tabMastery: "الإتقان",

    classroomSectionsAria: "أقسام الفصل",

    statActiveLabel: "نشطون",
    statActiveTooltip: "نشط = طالب أنهى لعبة واحدة على الأقل هذا الأسبوع. الرقم بعد / هو إجمالي عدد الطلاب.",
    statAvgScoreLabel: "متوسط الدرجة",
    statAvgScoreTooltip: "متوسط الدرجات لكل الألعاب المنتهية خلال آخر 7 أيام. أخضر ≥80، كهرماني 50–79، وردي أقل من 50.",
    statPlaysLabel: "اللعبات",
    statPlaysTooltip: "كل مرة ينهي فيها طالب نمط لعبة تُحتسب لعبة واحدة. آخر 7 أيام.",
    whatThisMeans: "ماذا يعني هذا",
    whatLabelMeansAria: (label) => `ما معنى "${label}"`,

    whoNeedsHelp: "من يحتاج إلى مساعدة",
    attendanceSubtitle: "آخر 14 يومًا · ✓ = لعب مرة واحدة على الأقل في ذلك اليوم · الطلاب في الأسفل يبتعدون.",
    attendanceEmpty: "أضف فصلاً لرؤية الحضور.",
    attendanceColStudent: "الطالب",
    attendanceColDays: "أيام",

    whatToReteach: "ماذا أعيد تدريسه",
    reteachSubtitle: "الكلمات الأكثر إخفاقًا في الفصل. النسبة المئوية للتغطية توضح مدى انتشار الالتباس.",
    reteachCta: "أعد تدريسها",
    reteachEmpty: "لم تُسجّل أخطاء بعد — صفك بحال ممتاز.",
    reteachColWord: "الكلمة",
    reteachColHebrew: "العبرية",
    reteachColArabic: "العربية",
    reteachColMisses: "الإخفاقات",
    reteachColPctOfClass: "% من الفصل",

    kpiPlaysAllTime: "اللعبات (الإجمالية)",
    kpiStudentsRoster: "الطلاب في القائمة",
    kpiAssignments: "الواجبات",
    kpiPlaysThisWeek: "اللعبات هذا الأسبوع",
    trendTitle: "متوسط الفصل — آخر 8 أسابيع",
    trendSubtitle: "متوسط الدرجات لكل لعبة، أسبوعًا بأسبوع. الفجوات تعني عدم وجود لعبات ذلك الأسبوع.",
    trendAxisAvgScore: "متوسط الدرجة",
    histogramTitle: "اللعبات في اليوم — آخر 30 يومًا",
    histogramSubtitle: "شريط لكل يوم. ارتفاعات حول مواعيد التسليم؛ أيام مسطحة = لم يلعب أحد.",
    histogramAxisPlays: "اللعبات",

    exportThisClass: "تصدير هذا الفصل",
    exportEmpty: "لا توجد لعبات في هذا الفصل بعد — تُفتح الصادرات بمجرد بدء الطلاب باللعب.",
    exportSummary: (students, plays, className) => `${students} طلاب · ${plays} لعبات · ${className}`,
    excelButton: "Excel",
    reportButton: "تقرير",
    exportNothingToast: "لا شيء للتصدير — لم تُلعب لعبات في الفصل.",
    exportExcelSuccess: "تم تصدير Excel",
    exportExcelFailed: "فشل تصدير Excel — حاول مرة أخرى.",
    pdfClassLabel: "الفصل",
    pdfExportedAt: "صُدِّر في",
    pdfHeadlineStats: (students, plays, avg, roster) => `${students} طلاب  ·  ${plays} لعبات  ·  متوسط ${avg}%  ·  قائمة ${roster}`,
    pdfStudentSummaryHeading: "ملخص الطلاب",
    pdfAllPlaysHeading: "كل اللعبات (الأحدث أولاً)",
    pdfColStudent: "الطالب",
    pdfColPlays: "اللعبات",
    pdfColAvg: "المتوسط",
    pdfColBest: "الأفضل",
    pdfColMistakes: "الأخطاء",
    pdfColLastActive: "آخر نشاط",
    pdfColAssignment: "الواجب",
    pdfColMode: "النمط",
    pdfColScore: "الدرجة",
    pdfColDate: "التاريخ",
    allClasses: "كل الفصول",
    quickPlayLabel: "لعب سريع",

    excelSheetOverview: "نظرة عامة",
    excelSheetGameHistory: "سجل اللعبات",
    excelSheetWordMastery: "إتقان الكلمات",
    excelOverviewTitle: (className) => `كشف درجات Vocaband — ${className}`,
    excelColStatus: "الحالة",
    excelColWord: "الكلمة",
    excelColTimesMissed: "مرات الخطأ",
    excelColStudentsAffected: "طلاب متأثرون",
    excelStatusGreen: "على المسار",
    excelStatusAmber: "للمتابعة",
    excelStatusRed: "بحاجة لدعم",

    reportModalTitle: "تقرير الفصل",
    reportModalSubtitle: (className) => `ملخص مرئي — ${className}`,
    reportCloseAria: "إغلاق التقرير",
    reportEmpty: "لا توجد بيانات للعرض بعد — لم يلعب أحد بعد.",
    reportSummaryStudents: "الطلاب",
    reportSummaryPlays: "اللعبات",
    reportSummaryAvg: "متوسط الدرجة",
    reportSummaryMistakes: "الأخطاء",
    reportPerStudentTitle: "متوسط الدرجة لكل طالب",
    reportPerStudentSubtitle: "عبر كل اللعبات في هذا الفصل",
    reportPerStudentAxis: "المتوسط %",
    reportTopWordsTitle: "كلمات للمراجعة",
    reportTopWordsSubtitle: "الكلمات الأكثر خطأ في الفصل",
    reportTopWordsAxis: "مرات الخطأ",
    reportTopWordsEmpty: "لا أخطاء مُسجَّلة بعد — أداء مثالي!",
    reportStatusTableHeading: "الحالة حسب الطالب",
    reportStatusGreen: "على المسار",
    reportStatusAmber: "للمتابعة",
    reportStatusRed: "بحاجة لدعم",
    reportDownloadPdf: "تنزيل PDF",
    reportPrintBtn: "طباعة",
    reportPdfSuccess: "تم تصدير التقرير",
    reportPdfFailed: "فشل تصدير التقرير — حاول مرة أخرى.",

    closeDetailsAria: "إغلاق التفاصيل",
  },
};
