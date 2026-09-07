/**
 * gradebook.ts — i18n strings for GradebookView (the teacher's
 * progress-and-decision-support page with the Class Pulse cards,
 * activity heatmap, student rollups, and per-assignment summary).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface GradebookStrings {
  // TopAppBar
  title: string;
  subtitle: string;

  // Class + window selectors
  classLabel: string;
  selectClassAria: string;
  exportCsv: string;

  // Pulse cards
  onTrackTitle: string;
  onTrackSubtitle: string;
  needsAttentionTitle: string;
  needsAttentionSubtitle: string;
  notPlayingTitle: string;
  notPlayingSubtitle: string;
  strongEngagement: string;

  // Activity chart
  classActivity: string;
  classActivityHelp: string;
  /** "Last {n} days · {className}". */
  lastNDaysFor: (n: number, className: string) => string;
  loadingDots: string;

  // Students list
  studentsHeading: string;
  noStudentsPlayed: string;
  playsLabel: (n: number) => string;
  /** " · last {date}" suffix after the play count. */
  lastSeenAt: (date: string) => string;
  rewardTitle: string;
  rewardAria: (name: string) => string;
  toggleDetailsAria: string;

  // Expanded student panel
  perMode: string;
  noModeData: string;
  wordMastery: string;

  // Assignments rollup
  assignmentsHeading: string;
  /** "{students} student(s) · {attempts} play(s)" */
  assignmentMetaRow: (students: number, attempts: number) => string;
  quickPlayFallback: string;
  reassignToast: (n: number) => string;
}

export const gradebookT: Record<Language, GradebookStrings> = {
  en: {
    title: "Gradebook",
    subtitle: "PROGRESS · DECISION SUPPORT",
    classLabel: "Class",
    selectClassAria: "Select class",
    exportCsv: "Export CSV",
    onTrackTitle: "On track",
    onTrackSubtitle: "≥70% and active this week",
    needsAttentionTitle: "Needs attention",
    needsAttentionSubtitle: "Low scores or stuck on specific words",
    notPlayingTitle: "Not playing",
    notPlayingSubtitle: "No activity in 7+ days",
    strongEngagement: "Strong engagement",
    classActivity: "Class activity",
    classActivityHelp: "Total XP earned by all students per day.",
    lastNDaysFor: (n, name) => `Last ${n} days · ${name}`,
    loadingDots: " · loading…",
    studentsHeading: "Students",
    noStudentsPlayed: "No students have played yet in this class.",
    playsLabel: (n) => `${n} ${n === 1 ? "play" : "plays"}`,
    lastSeenAt: (date) => ` · last ${date}`,
    rewardTitle: "Reward",
    rewardAria: (name) => `Reward ${name}`,
    toggleDetailsAria: "Toggle details",
    perMode: "Per mode",
    noModeData: "No mode data yet.",
    wordMastery: "Word mastery",
    assignmentsHeading: "Assignments",
    assignmentMetaRow: (s, a) => `${s} student${s === 1 ? "" : "s"} · ${a} play${a === 1 ? "" : "s"}`,
    quickPlayFallback: "Quick Play",
    reassignToast: (n) => `Reassign flow coming next: ${n} student${n === 1 ? "" : "s"} flagged.`,
  },
  he: {
    title: "ספר ציונים",
    subtitle: "התקדמות · תמיכה בהחלטות",
    classLabel: "כיתה",
    selectClassAria: "בחירת כיתה",
    exportCsv: "ייצוא CSV",
    onTrackTitle: "במסלול",
    onTrackSubtitle: "≥70% ופעילים השבוע",
    needsAttentionTitle: "דורש תשומת לב",
    needsAttentionSubtitle: "ציונים נמוכים או תקועים על מילים מסוימות",
    notPlayingTitle: "לא משחקים",
    notPlayingSubtitle: "ללא פעילות 7+ ימים",
    strongEngagement: "מעורבות חזקה",
    classActivity: "פעילות הכיתה",
    classActivityHelp: "סך ה-XP שצברו כל התלמידים ביום.",
    lastNDaysFor: (n, name) => `${n} הימים האחרונים · ${name}`,
    loadingDots: " · טוען…",
    studentsHeading: "תלמידים",
    noStudentsPlayed: "אף תלמיד עדיין לא שיחק בכיתה הזו.",
    playsLabel: (n) => `${n} משחקים`,
    lastSeenAt: (date) => ` · אחרון ${date}`,
    rewardTitle: "פרס",
    rewardAria: (name) => `תן פרס ל-${name}`,
    toggleDetailsAria: "הצג פרטים",
    perMode: "לפי מצב",
    noModeData: "אין עדיין נתונים לפי מצב.",
    wordMastery: "שליטה במילים",
    assignmentsHeading: "מטלות",
    assignmentMetaRow: (s, a) => `${s} תלמידים · ${a} משחקים`,
    quickPlayFallback: "משחק מהיר",
    reassignToast: (n) => `זרימת הקצאה מחדש בקרוב: ${n} תלמידים סומנו.`,
  },
  ar: {
    title: "سجل العلامات",
    subtitle: "التقدّم · دعم القرار",
    classLabel: "الصف",
    selectClassAria: "اختيار الصف",
    exportCsv: "تصدير CSV",
    onTrackTitle: "على المسار",
    onTrackSubtitle: "≥70% ونشط هذا الأسبوع",
    needsAttentionTitle: "يحتاج إلى اهتمام",
    needsAttentionSubtitle: "علامات منخفضة أو متعثّر في كلمات محدّدة",
    notPlayingTitle: "لا يلعب",
    notPlayingSubtitle: "لا نشاط منذ 7+ أيام",
    strongEngagement: "تفاعل قوي",
    classActivity: "نشاط الصف",
    classActivityHelp: "إجمالي XP الذي اكتسبه جميع الطلاب يومياً.",
    lastNDaysFor: (n, name) => `آخر ${n} يوماً · ${name}`,
    loadingDots: " · جارٍ التحميل…",
    studentsHeading: "الطلاب",
    noStudentsPlayed: "لم يلعب أي طالب بعد في هذا الصف.",
    playsLabel: (n) => `${n} ${n === 1 ? "لعبة" : "ألعاب"}`,
    lastSeenAt: (date) => ` · آخر ${date}`,
    rewardTitle: "مكافأة",
    rewardAria: (name) => `منح مكافأة لـ ${name}`,
    toggleDetailsAria: "تبديل التفاصيل",
    perMode: "حسب الوضع",
    noModeData: "لا توجد بيانات حسب الوضع بعد.",
    wordMastery: "إتقان الكلمات",
    assignmentsHeading: "المهام",
    assignmentMetaRow: (s, a) => `${s} طالب · ${a} لعبة`,
    quickPlayFallback: "لعب سريع",
    reassignToast: (n) => `سيتم تفعيل تدفّق إعادة التعيين قريباً: تم وضع علامة على ${n} طالب.`,
  },
};
