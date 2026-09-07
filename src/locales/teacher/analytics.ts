/**
 * analytics.ts — i18n strings for AnalyticsView and the
 * ClassPatternsSection (activity heatmap + hardest-words list).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface AnalyticsStrings {
  // TopAppBar
  title: string;
  subtitle: string;

  // Class filter
  filterByClass: string;
  allClasses: string;
  backToAllClasses: string;
  /** Default fallback when a class object is missing a name. */
  allClassesFallback: string;
  /** "{students} students • {attempts} total attempts" header summary. */
  studentsAttemptsSummary: (students: number, attempts: number) => string;

  // Empty state
  noStudentData: string;

  // Class card stats
  students: string;
  averageScore: string;
  totalAttempts: string;
  /** "{n} need help" small label at the bottom of class cards. */
  needHelpCount: (n: number) => string;

  // Card 1: Who Needs Help
  whoNeedsHelp: string;
  allStudentsDoingWell: string;
  attempts: (n: number) => string;
  giveRewardTitle: string;
  rewardButton: string;
  cantFindStudent: (name: string) => string;
  studentNoAccount: (name: string) => string;
  moreStudentsNeedAttention: (n: number) => string;

  // Card 2: What to Reteach
  whatToReteach: string;
  selectAll: string;
  clear: string;
  noMistakesRecorded: string;
  /** "{n} word(s) selected" — plural-aware. */
  wordsSelected: (n: number) => string;
  createAssignmentBelow: string;
  /** FAB label "Create Assignment with {n} word(s)". */
  createAssignmentWithWords: (n: number) => string;

  // Card 3: Class Health
  classHealth: string;
  mostPlayedMode: string;
  playsCount: (n: number) => string;
  activeStudents: string;

  // Student detail modal
  attemptsLabel: (n: number) => string;
  mostChallengingWords: string;
  recentAttempts: string;

  // Score detail modal
  wordsMissed: string;
  unknownWord: string;

  // ClassPatternsSection — activity heatmap
  activityPattern: string;
  /** "When your class actually plays, over the last {n} weeks." */
  activityIntro: (weeks: number) => string;
  busiestDayLabel: string;
  noPlaysInWindow: string;
  thisWeek: string;
  lastWeek: string;
  weeksAgo: (n: number) => string;
  playsTooltip: (n: number) => string;
  /** Mon–Sun labels rendered as a single char in the column header. */
  dayLabels: string[];

  // Hardest-words card
  hardestWords: string;
  hardestWordsIntro: string;
  noMistakesNiceWork: string;
}

export const analyticsT: Record<Language, AnalyticsStrings> = {
  en: {
    title: "Analytics",
    subtitle: "CLASSROOM INSIGHTS",
    filterByClass: "Filter by class",
    allClasses: "All classes",
    backToAllClasses: "← Back to all classes",
    allClassesFallback: "All Classes",
    studentsAttemptsSummary: (s, a) => `${s} students • ${a} total attempts`,
    noStudentData: "No student data yet. Analytics will appear once students complete assignments.",
    students: "Students",
    averageScore: "Average Score",
    totalAttempts: "Total Attempts",
    needHelpCount: (n) => `${n} need help`,
    whoNeedsHelp: "Who Needs Help",
    allStudentsDoingWell: "All students are doing well! 🎉",
    attempts: (n) => `${n} attempts`,
    giveRewardTitle: "Give reward",
    rewardButton: "Reward",
    cantFindStudent: (name) => `Can't find ${name} in this class. Try refreshing the page.`,
    studentNoAccount: (name) => `${name} hasn't created an account yet — can't receive rewards.`,
    moreStudentsNeedAttention: (n) => `+${n} more students need attention`,
    whatToReteach: "What to Reteach",
    selectAll: "Select All",
    clear: "Clear",
    noMistakesRecorded: "No mistakes recorded yet — students are doing great!",
    wordsSelected: (n) => `${n} word${n !== 1 ? "s" : ""} selected`,
    createAssignmentBelow: "Create assignment below ↓",
    createAssignmentWithWords: (n) => `Create Assignment with ${n} word${n !== 1 ? "s" : ""}`,
    classHealth: "Class Health",
    mostPlayedMode: "Most Played Mode",
    playsCount: (n) => `${n} plays`,
    activeStudents: "Active Students",
    attemptsLabel: (n) => `${n} ${n === 1 ? "attempt" : "attempts"}`,
    mostChallengingWords: "Most Challenging Words",
    recentAttempts: "Recent Attempts",
    wordsMissed: "Words Missed",
    unknownWord: "Unknown",
    activityPattern: "Activity Pattern",
    activityIntro: (weeks) => `When your class actually plays, over the last ${weeks} weeks.`,
    busiestDayLabel: "Busiest day:",
    noPlaysInWindow: "No plays recorded yet in this window.",
    thisWeek: "this wk",
    lastWeek: "last wk",
    weeksAgo: (n) => `${n}w ago`,
    playsTooltip: (n) => `${n} ${n === 1 ? "play" : "plays"}`,
    dayLabels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    hardestWords: "Hardest Words",
    hardestWordsIntro: "Words your class has missed the most. Re-teach these first.",
    noMistakesNiceWork: "No mistakes recorded yet — nice work.",
  },
  he: {
    title: "ניתוח נתונים",
    subtitle: "תובנות על הכיתה",
    filterByClass: "סינון לפי כיתה",
    allClasses: "כל הכיתות",
    backToAllClasses: "→ חזרה לכל הכיתות",
    allClassesFallback: "כל הכיתות",
    studentsAttemptsSummary: (s, a) => `${s} תלמידים • ${a} ניסיונות סך הכל`,
    noStudentData: "אין עדיין נתוני תלמידים. הנתונים יופיעו כשהתלמידים ישלימו מטלות.",
    students: "תלמידים",
    averageScore: "ציון ממוצע",
    totalAttempts: "סך כל הניסיונות",
    needHelpCount: (n) => `${n} זקוקים לעזרה`,
    whoNeedsHelp: "מי זקוק לעזרה",
    allStudentsDoingWell: "כל התלמידים מסתדרים מצוין! 🎉",
    attempts: (n) => `${n} ניסיונות`,
    giveRewardTitle: "תן פרס",
    rewardButton: "פרס",
    cantFindStudent: (name) => `לא ניתן למצוא את ${name} בכיתה הזו. נסו לרענן את הדף.`,
    studentNoAccount: (name) => `ל-${name} עדיין אין חשבון — לא ניתן לתת פרס.`,
    moreStudentsNeedAttention: (n) => `+${n} תלמידים נוספים זקוקים לתשומת לב`,
    whatToReteach: "מה ללמד מחדש",
    selectAll: "בחר הכל",
    clear: "נקה",
    noMistakesRecorded: "עוד לא נרשמו טעויות — התלמידים מסתדרים מצוין!",
    wordsSelected: (n) => `${n} מילים נבחרו`,
    createAssignmentBelow: "צור מטלה למטה ↓",
    createAssignmentWithWords: (n) => `צור מטלה עם ${n} מילים`,
    classHealth: "מצב הכיתה",
    mostPlayedMode: "המצב הכי נשחק",
    playsCount: (n) => `${n} משחקים`,
    activeStudents: "תלמידים פעילים",
    attemptsLabel: (n) => `${n} ${n === 1 ? "ניסיון" : "ניסיונות"}`,
    mostChallengingWords: "המילים הכי מאתגרות",
    recentAttempts: "ניסיונות אחרונים",
    wordsMissed: "מילים שפוספסו",
    unknownWord: "לא ידוע",
    activityPattern: "דפוס פעילות",
    activityIntro: (weeks) => `מתי הכיתה שלכם משחקת בפועל, ב-${weeks} השבועות האחרונים.`,
    busiestDayLabel: "היום העמוס ביותר:",
    noPlaysInWindow: "עוד לא נרשמו משחקים בחלון הזה.",
    thisWeek: "השבוע",
    lastWeek: "שעבר",
    weeksAgo: (n) => `לפני ${n} שב'`,
    playsTooltip: (n) => `${n} ${n === 1 ? "משחק" : "משחקים"}`,
    dayLabels: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"],
    hardestWords: "המילים הקשות ביותר",
    hardestWordsIntro: "המילים שהכיתה שלכם הכי טועה בהן. לימדו אותן קודם.",
    noMistakesNiceWork: "עוד לא נרשמו טעויות — עבודה יפה.",
  },
  ar: {
    title: "التحليلات",
    subtitle: "رؤى الصف",
    filterByClass: "تصفية حسب الصف",
    allClasses: "كل الصفوف",
    backToAllClasses: "→ العودة إلى كل الصفوف",
    allClassesFallback: "كل الصفوف",
    studentsAttemptsSummary: (s, a) => `${s} طالباً • ${a} محاولة إجمالاً`,
    noStudentData: "لا توجد بيانات للطلاب بعد. ستظهر التحليلات بعد إكمال الطلاب للمهام.",
    students: "الطلاب",
    averageScore: "المعدل",
    totalAttempts: "إجمالي المحاولات",
    needHelpCount: (n) => `${n} يحتاجون مساعدة`,
    whoNeedsHelp: "من يحتاج إلى مساعدة",
    allStudentsDoingWell: "كل الطلاب يبلون حسناً! 🎉",
    attempts: (n) => `${n} محاولة`,
    giveRewardTitle: "منح مكافأة",
    rewardButton: "مكافأة",
    cantFindStudent: (name) => `تعذّر العثور على ${name} في هذا الصف. حاول تحديث الصفحة.`,
    studentNoAccount: (name) => `${name} لم ينشئ حساباً بعد — لا يمكن منحه مكافأة.`,
    moreStudentsNeedAttention: (n) => `+${n} طلاب آخرون يحتاجون اهتماماً`,
    whatToReteach: "ما الذي يجب إعادة تدريسه",
    selectAll: "تحديد الكل",
    clear: "مسح",
    noMistakesRecorded: "لم تُسجّل أخطاء بعد — الطلاب يبلون حسناً!",
    wordsSelected: (n) => `${n} كلمة مختارة`,
    createAssignmentBelow: "أنشئ مهمة في الأسفل ↓",
    createAssignmentWithWords: (n) => `إنشاء مهمة بـ ${n} كلمة`,
    classHealth: "صحة الصف",
    mostPlayedMode: "الوضع الأكثر لعباً",
    playsCount: (n) => `${n} لعبة`,
    activeStudents: "الطلاب النشطون",
    attemptsLabel: (n) => `${n} ${n === 1 ? "محاولة" : "محاولات"}`,
    mostChallengingWords: "أصعب الكلمات",
    recentAttempts: "آخر المحاولات",
    wordsMissed: "الكلمات الفائتة",
    unknownWord: "غير معروف",
    activityPattern: "نمط النشاط",
    activityIntro: (weeks) => `متى يلعب صفك فعلياً، خلال آخر ${weeks} أسابيع.`,
    busiestDayLabel: "أكثر الأيام ازدحاماً:",
    noPlaysInWindow: "لم تُسجّل ألعاب في هذه النافذة بعد.",
    thisWeek: "هذا الأسبوع",
    lastWeek: "الأسبوع الماضي",
    weeksAgo: (n) => `قبل ${n} أسبوع`,
    playsTooltip: (n) => `${n} ${n === 1 ? "لعبة" : "ألعاب"}`,
    dayLabels: ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
    hardestWords: "أصعب الكلمات",
    hardestWordsIntro: "الكلمات التي أخطأ فيها صفك أكثر من غيرها. علّمها أولاً.",
    noMistakesNiceWork: "لم تُسجّل أخطاء بعد — عمل جيد.",
  },
};
