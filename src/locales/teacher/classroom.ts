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

  // ─── ReportExportBar ───────────────────────────────────────────
  exportThisClass: string;
  exportEmpty: string;
  /** "{n} students · {m} plays · {className}". */
  exportSummary: (students: number, plays: number, className: string) => string;
  csvButton: string;
  pdfButton: string;
  exportNothingToast: string;
  exportCsvSuccess: string;
  exportCsvFailed: string;
  exportPdfSuccess: string;
  exportPdfFailed: string;
  pdfCoverTitle: string;
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
  /** "Page {i} of {n}". */
  pdfPageOf: (i: number, n: number) => string;
  csvHeaderTitle: (className: string) => string;
  csvHeaderExportedAt: (when: string) => string;
  allClasses: string;
  quickPlayLabel: string;

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
    csvButton: "CSV",
    pdfButton: "PDF",
    exportNothingToast: "Nothing to export yet — no gameplay in this class.",
    exportCsvSuccess: "CSV exported",
    exportCsvFailed: "CSV export failed — try again.",
    exportPdfSuccess: "PDF exported",
    exportPdfFailed: "PDF export failed — try again.",
    pdfCoverTitle: "Vocaband Gradebook",
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
    pdfPageOf: (i, n) => `Page ${i} of ${n}`,
    csvHeaderTitle: (className) => `Vocaband gradebook — ${className}`,
    csvHeaderExportedAt: (when) => `Exported ${when}`,
    allClasses: "All classes",
    quickPlayLabel: "Quick Play",

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
    csvButton: "CSV",
    pdfButton: "PDF",
    exportNothingToast: "אין מה לייצא — עוד לא היו משחקים בכיתה.",
    exportCsvSuccess: "CSV יוצא",
    exportCsvFailed: "ייצוא CSV נכשל — נסה שוב.",
    exportPdfSuccess: "PDF יוצא",
    exportPdfFailed: "ייצוא PDF נכשל — נסה שוב.",
    pdfCoverTitle: "פנקס ציונים — Vocaband",
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
    pdfPageOf: (i, n) => `עמוד ${i} מתוך ${n}`,
    csvHeaderTitle: (className) => `פנקס ציונים Vocaband — ${className}`,
    csvHeaderExportedAt: (when) => `יוצא ${when}`,
    allClasses: "כל הכיתות",
    quickPlayLabel: "משחק מהיר",

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
    csvButton: "CSV",
    pdfButton: "PDF",
    exportNothingToast: "لا شيء للتصدير — لم تُلعب لعبات في الفصل.",
    exportCsvSuccess: "تم تصدير CSV",
    exportCsvFailed: "فشل تصدير CSV — حاول مرة أخرى.",
    exportPdfSuccess: "تم تصدير PDF",
    exportPdfFailed: "فشل تصدير PDF — حاول مرة أخرى.",
    pdfCoverTitle: "كشف درجات Vocaband",
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
    pdfPageOf: (i, n) => `الصفحة ${i} من ${n}`,
    csvHeaderTitle: (className) => `كشف درجات Vocaband — ${className}`,
    csvHeaderExportedAt: (when) => `صُدِّر ${when}`,
    allClasses: "كل الفصول",
    quickPlayLabel: "لعب سريع",

    closeDetailsAria: "إغلاق التفاصيل",
  },
};
