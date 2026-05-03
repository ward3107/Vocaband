/**
 * Locale file for the drill-down surfaces:
 *  - StudentProfile (drawer drill on a single student)
 *  - AssignmentDetail (drawer drill on a single assignment)
 *  - SavedTasksSection (saved templates list on the dashboard)
 *  - QuickPlaySetupView success screen + WhatsApp message
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherDrilldownsT {
  // ─── AssignmentDetail ──────────────────────────────────────────
  /** "{avg}% class avg · {pct}% done" — drawer subtitle. */
  assignmentSubtitle: (avg: number, pct: number) => string;
  completionLabel: string;
  classAvgLabel: string;
  studentsPlayedAtLeastOnce: string;
  averageAcrossEveryPlay: string;
  doneTitle: string;
  doneSubtitle: string;
  doneEmpty: string;
  stuckTitle: string;
  stuckSubtitle: string;
  stuckEmpty: string;
  notStartedTitle: string;
  notStartedSubtitle: string;
  notStartedEmpty: string;
  hasntOpenedIt: string;
  /** "{n} plays · best {b}" / "{n} play · best {b}". */
  studentRowSummary: (plays: number, best: number) => string;
  /** "Reassign to {n} student/students who haven't finished". */
  reassignCta: (n: number) => string;

  // ─── StudentProfile ────────────────────────────────────────────
  /** "{n} plays · last {date}" header subtitle. */
  studentHeaderSubtitle: (plays: number, date: string) => string;
  rewardBtn: string;
  /** "Reward {name}" — aria. */
  rewardAria: (name: string) => string;
  noPlaysTitle: string;
  /** "{name} hasn't played any assignments yet..." */
  noPlaysBody: (name: string) => string;
  statAvgScoreLabel: string;
  statAvgScoreCaption: string;
  statAvgScoreTooltip: string;
  statPlayCountSingular: string;
  statPlayCountPlural: string;
  statPlaysCaption: string;
  statPlaysTooltip: string;
  statXpLabel: string;
  statXpCaption: string;
  statXpTooltip: string;
  statLastActiveLabel: string;
  statLastActiveCaption: string;
  statLastActiveTooltip: string;
  perModeTitle: string;
  perModeSubtitle: string;
  wordMasteryTitle: string;
  wordMasterySubtitle: string;
  struggledWithTitle: string;
  struggledWithSubtitle: string;
  /** Title attribute on a struggled-with chip. */
  struggledChipTitle: (english: string, count: number, hebrew: string) => string;
  recentPlaysTitle: string;
  /** "last {n}" suffix on Recent plays. */
  lastNSuffix: (n: number) => string;
  fallbackAssignmentLabel: string;
  noLastActive: string;

  // ─── SavedTasksSection ─────────────────────────────────────────
  savedTemplatesHeading: string;
  savedTemplatesBlurb: string;
  untitledTemplate: string;
  qpBadge: string;
  assignmentBadge: string;
  /** "{n} word(s) · {m} mode(s)". */
  wordModeSummary: (words: number, modes: number) => string;
  /** "Used {n}× · last {when}". */
  usedSummary: (times: number, when: string) => string;
  pinAria: string;
  unpinAria: string;
  useBtn: string;
  deleteAria: string;
  /** confirm("Delete \"{title}\"?"). */
  deleteConfirm: (title: string) => string;
  // Relative time helpers
  neverUsed: string;
  today: string;
  yesterday: string;
  daysAgo: (n: number) => string;
  weeksAgo: (n: number) => string;
  monthsAgo: (n: number) => string;

  // ─── QuickPlaySetupView success ────────────────────────────────
  qpLiveTitle: string;
  qpLiveSubtitle: string;
  qpLiveSession: string;
  qpAnyMode: string;
  sessionCodeLabel: string;
  copyLink: string;
  copiedShort: string;
  whatsAppLabel: string;
  openLivePodium: string;
  playAnother: string;
  backToDashboardSmall: string;
  /** WhatsApp join message. */
  qpJoinMessage: (title: string, joinUrl: string) => string;
}

export const teacherDrilldownsT: Record<Language, TeacherDrilldownsT> = {
  en: {
    assignmentSubtitle: (avg, pct) => `${avg}% class avg · ${pct}% done`,
    completionLabel: "Completion",
    classAvgLabel: "Class avg",
    studentsPlayedAtLeastOnce: "students who've played at least once",
    averageAcrossEveryPlay: "average across every play",
    doneTitle: "Done",
    doneSubtitle: "Played and averaging ≥70%",
    doneEmpty: "No one has crossed 70% yet.",
    stuckTitle: "Stuck",
    stuckSubtitle: "Played but averaging under 70%",
    stuckEmpty: "Everyone who played is doing fine.",
    notStartedTitle: "Not started",
    notStartedSubtitle: "Zero plays on this assignment",
    notStartedEmpty: "Everyone's opened this one.",
    hasntOpenedIt: "Hasn't opened it",
    studentRowSummary: (plays, best) => `${plays} ${plays === 1 ? "play" : "plays"} · best ${best}`,
    reassignCta: (n) => `Reassign to ${n} ${n === 1 ? "student" : "students"} who haven't finished`,

    studentHeaderSubtitle: (plays, date) => `${plays} ${plays === 1 ? "play" : "plays"} · last ${date}`,
    rewardBtn: "Reward",
    rewardAria: (name) => `Reward ${name}`,
    noPlaysTitle: "No plays yet",
    noPlaysBody: (name) => `${name} hasn't played any assignments yet. Their stats will appear here as soon as they start.`,
    statAvgScoreLabel: "avg score",
    statAvgScoreCaption: "across every game",
    statAvgScoreTooltip: "The student's average score (out of 100) across every game they've finished. 80+ = solid, 70-79 = okay, below 70 = needs help.",
    statPlayCountSingular: "play",
    statPlayCountPlural: "plays",
    statPlaysCaption: "total attempts",
    statPlaysTooltip: "Total number of game-rounds completed by this student across all assignments and modes.",
    statXpLabel: "XP earned",
    statXpCaption: "sum of all scores",
    statXpTooltip: "Cumulative XP — the sum of every score the student has earned in every game. Drives shop unlocks + their level title.",
    statLastActiveLabel: "last active",
    statLastActiveCaption: "most recent play",
    statLastActiveTooltip: "The date of this student's most recent game. Useful for spotting students who've gone quiet.",
    perModeTitle: "Per mode",
    perModeSubtitle: "where they're strong vs. weak",
    wordMasteryTitle: "Word mastery",
    wordMasterySubtitle: "green = solid, amber = shaky, rose = struggling",
    struggledWithTitle: "Struggled with",
    struggledWithSubtitle: "words missed on first try (any game)",
    struggledChipTitle: (english, count, hebrew) =>
      `Got "${english}" wrong on first try ${count} time${count === 1 ? '' : 's'}. Hebrew: ${hebrew}`,
    recentPlaysTitle: "Recent plays",
    lastNSuffix: (n) => `· last ${n}`,
    fallbackAssignmentLabel: "Quick Play",
    noLastActive: "—",

    savedTemplatesHeading: "Saved templates",
    savedTemplatesBlurb: "Re-use a task in one tap. Pinned + most-used appear first.",
    untitledTemplate: "Untitled template",
    qpBadge: "🎮 Quick Play",
    assignmentBadge: "📝 Assignment",
    wordModeSummary: (words, modes) =>
      `${words} word${words === 1 ? '' : 's'} · ${modes} mode${modes === 1 ? '' : 's'}`,
    usedSummary: (times, when) => `Used ${times}× · last ${when}`,
    pinAria: "Pin",
    unpinAria: "Unpin",
    useBtn: "Use",
    deleteAria: "Delete",
    deleteConfirm: (title) => `Delete "${title}"?`,
    neverUsed: "never used",
    today: "today",
    yesterday: "yesterday",
    daysAgo: (n) => `${n} days ago`,
    weeksAgo: (n) => `${n} weeks ago`,
    monthsAgo: (n) => `${n} months ago`,

    qpLiveTitle: "Quick Play is live!",
    qpLiveSubtitle: "Share the code with your students — they can join instantly from any phone.",
    qpLiveSession: "live session",
    qpAnyMode: "any mode",
    sessionCodeLabel: "Session code",
    copyLink: "Copy link",
    copiedShort: "Copied!",
    whatsAppLabel: "WhatsApp",
    openLivePodium: "Open live podium",
    playAnother: "Play another",
    backToDashboardSmall: "Back to dashboard",
    qpJoinMessage: (title, joinUrl) =>
      title
        ? `Join "${title}" on Vocaband! ${joinUrl}`
        : `Join my Vocaband Quick Play session: ${joinUrl}`,
  },

  he: {
    assignmentSubtitle: (avg, pct) => `${avg}% ממוצע כיתה · ${pct}% השלימו`,
    completionLabel: "השלמה",
    classAvgLabel: "ממוצע כיתה",
    studentsPlayedAtLeastOnce: "תלמידים ששיחקו לפחות פעם אחת",
    averageAcrossEveryPlay: "ממוצע על פני כל המשחקים",
    doneTitle: "סיימו",
    doneSubtitle: "שיחקו ועם ממוצע ≥70%",
    doneEmpty: "עדיין אף אחד לא חצה את ה-70%.",
    stuckTitle: "תקועים",
    stuckSubtitle: "שיחקו אבל ממוצע מתחת ל-70%",
    stuckEmpty: "כל מי ששיחק בסדר.",
    notStartedTitle: "לא התחילו",
    notStartedSubtitle: "אפס משחקים במשימה זו",
    notStartedEmpty: "כולם פתחו את המשימה.",
    hasntOpenedIt: "לא פתח/ה את המשימה",
    studentRowSummary: (plays, best) => `${plays} ${plays === 1 ? "משחק" : "משחקים"} · מיטב ${best}`,
    reassignCta: (n) => `שלח שוב ל-${n} ${n === 1 ? "תלמיד שלא סיים" : "תלמידים שלא סיימו"}`,

    studentHeaderSubtitle: (plays, date) => `${plays} ${plays === 1 ? "משחק" : "משחקים"} · אחרון ${date}`,
    rewardBtn: "תגמול",
    rewardAria: (name) => `תגמל את ${name}`,
    noPlaysTitle: "אין משחקים עדיין",
    noPlaysBody: (name) => `${name} עדיין לא שיחק/ה במשימות. הסטטיסטיקות יופיעו ברגע שיתחיל/תתחיל.`,
    statAvgScoreLabel: "ציון ממוצע",
    statAvgScoreCaption: "בכל המשחקים",
    statAvgScoreTooltip: "הציון הממוצע של התלמיד (מתוך 100) על פני כל המשחקים שסיים. 80+ = מצוין, 70-79 = בסדר, מתחת ל-70 = זקוק לעזרה.",
    statPlayCountSingular: "משחק",
    statPlayCountPlural: "משחקים",
    statPlaysCaption: "סך הניסיונות",
    statPlaysTooltip: "מספר סיבובי המשחק שהושלמו על ידי התלמיד בכל המשימות והמצבים.",
    statXpLabel: "XP שנצברו",
    statXpCaption: "סכום כל הציונים",
    statXpTooltip: "XP מצטבר — סכום של כל ציון שהתלמיד צבר בכל משחק. נותן גישה לחנות ולתואר רמה.",
    statLastActiveLabel: "פעילות אחרונה",
    statLastActiveCaption: "המשחק האחרון",
    statLastActiveTooltip: "התאריך של המשחק האחרון של התלמיד. שימושי לזהות תלמידים שנעלמו.",
    perModeTitle: "לפי מצב",
    perModeSubtitle: "איפה הוא חזק ואיפה חלש",
    wordMasteryTitle: "שליטה במילים",
    wordMasterySubtitle: "ירוק = מוצק, ענבר = רעוע, ורוד = מתקשה",
    struggledWithTitle: "התקשה עם",
    struggledWithSubtitle: "מילים שהוחמצו בניסיון הראשון (בכל משחק)",
    struggledChipTitle: (english, count, hebrew) =>
      `שגה ב-"${english}" בניסיון ראשון ${count} ${count === 1 ? "פעם" : "פעמים"}. עברית: ${hebrew}`,
    recentPlaysTitle: "משחקים אחרונים",
    lastNSuffix: (n) => `· ${n} אחרונים`,
    fallbackAssignmentLabel: "משחק מהיר",
    noLastActive: "—",

    savedTemplatesHeading: "תבניות שמורות",
    savedTemplatesBlurb: "השתמש שוב במשימה בלחיצה אחת. ננעצים והכי בשימוש מופיעים ראשונים.",
    untitledTemplate: "תבנית ללא שם",
    qpBadge: "🎮 משחק מהיר",
    assignmentBadge: "📝 משימה",
    wordModeSummary: (words, modes) =>
      `${words} ${words === 1 ? "מילה" : "מילים"} · ${modes} ${modes === 1 ? "מצב" : "מצבים"}`,
    usedSummary: (times, when) => `שימוש ${times}× · אחרון ${when}`,
    pinAria: "נעץ",
    unpinAria: "בטל נעיצה",
    useBtn: "השתמש",
    deleteAria: "מחק",
    deleteConfirm: (title) => `למחוק את "${title}"?`,
    neverUsed: "לא נעשה שימוש",
    today: "היום",
    yesterday: "אתמול",
    daysAgo: (n) => `לפני ${n} ימים`,
    weeksAgo: (n) => `לפני ${n} ${n === 1 ? "שבוע" : "שבועות"}`,
    monthsAgo: (n) => `לפני ${n} ${n === 1 ? "חודש" : "חודשים"}`,

    qpLiveTitle: "המשחק המהיר חי!",
    qpLiveSubtitle: "שתף את הקוד עם התלמידים — הם יוכלו להצטרף מיד מכל טלפון.",
    qpLiveSession: "מפגש חי",
    qpAnyMode: "כל מצב",
    sessionCodeLabel: "קוד המפגש",
    copyLink: "העתק קישור",
    copiedShort: "הועתק!",
    whatsAppLabel: "וואטסאפ",
    openLivePodium: "פתח פודיום חי",
    playAnother: "שחק שוב",
    backToDashboardSmall: "חזרה ללוח הבקרה",
    qpJoinMessage: (title, joinUrl) =>
      title
        ? `הצטרף ל-"${title}" ב-Vocaband! ${joinUrl}`
        : `הצטרף למפגש המשחק המהיר שלי ב-Vocaband: ${joinUrl}`,
  },

  ar: {
    assignmentSubtitle: (avg, pct) => `${avg}% متوسط الفصل · ${pct}% أكملوا`,
    completionLabel: "الإنجاز",
    classAvgLabel: "متوسط الفصل",
    studentsPlayedAtLeastOnce: "الطلاب الذين لعبوا مرة واحدة على الأقل",
    averageAcrossEveryPlay: "المتوسط عبر كل لعبة",
    doneTitle: "أنجزوا",
    doneSubtitle: "لعبوا وبمتوسط ≥70%",
    doneEmpty: "لم يتجاوز أحد 70% بعد.",
    stuckTitle: "متعثرون",
    stuckSubtitle: "لعبوا لكن المتوسط أقل من 70%",
    stuckEmpty: "كل من لعب يبلي حسنًا.",
    notStartedTitle: "لم يبدؤوا",
    notStartedSubtitle: "صفر لعبات على هذا الواجب",
    notStartedEmpty: "الجميع فتحوا هذا الواجب.",
    hasntOpenedIt: "لم يفتح الواجب",
    studentRowSummary: (plays, best) => `${plays} ${plays === 1 ? "لعبة" : "لعبات"} · أفضل ${best}`,
    reassignCta: (n) => `أعد التعيين لـ ${n} ${n === 1 ? "طالب لم يُكمل" : "طلاب لم يكملوا"}`,

    studentHeaderSubtitle: (plays, date) => `${plays} ${plays === 1 ? "لعبة" : "لعبات"} · آخر ${date}`,
    rewardBtn: "مكافأة",
    rewardAria: (name) => `كافِئ ${name}`,
    noPlaysTitle: "لا توجد لعبات بعد",
    noPlaysBody: (name) => `${name} لم يلعب أي واجبات بعد. ستظهر إحصائياته هنا فور بدء اللعب.`,
    statAvgScoreLabel: "متوسط الدرجة",
    statAvgScoreCaption: "عبر كل لعبة",
    statAvgScoreTooltip: "متوسط درجة الطالب (من 100) عبر كل لعبة أنهاها. 80+ = ممتاز، 70-79 = جيد، أقل من 70 = يحتاج إلى مساعدة.",
    statPlayCountSingular: "لعبة",
    statPlayCountPlural: "لعبات",
    statPlaysCaption: "إجمالي المحاولات",
    statPlaysTooltip: "إجمالي عدد جولات اللعب التي أكملها الطالب في كل الواجبات والأنماط.",
    statXpLabel: "نقاط XP",
    statXpCaption: "مجموع كل الدرجات",
    statXpTooltip: "النقاط المتراكمة — مجموع كل درجة كسبها الطالب في كل لعبة. تُفعل عناصر المتجر ولقب المستوى.",
    statLastActiveLabel: "آخر نشاط",
    statLastActiveCaption: "أحدث لعبة",
    statLastActiveTooltip: "تاريخ آخر لعبة لهذا الطالب. مفيد لرصد الطلاب الذين توقفوا.",
    perModeTitle: "حسب النمط",
    perModeSubtitle: "أين هو قوي وأين ضعيف",
    wordMasteryTitle: "إتقان الكلمات",
    wordMasterySubtitle: "أخضر = متقن، كهرماني = متذبذب، وردي = يكافح",
    struggledWithTitle: "تعثر في",
    struggledWithSubtitle: "كلمات أخفق فيها من المحاولة الأولى (في أي لعبة)",
    struggledChipTitle: (english, count, hebrew) =>
      `أخطأ في "${english}" من المحاولة الأولى ${count} ${count === 1 ? "مرة" : "مرات"}. العبرية: ${hebrew}`,
    recentPlaysTitle: "اللعبات الأخيرة",
    lastNSuffix: (n) => `· آخر ${n}`,
    fallbackAssignmentLabel: "لعب سريع",
    noLastActive: "—",

    savedTemplatesHeading: "القوالب المحفوظة",
    savedTemplatesBlurb: "أعد استخدام مهمة بنقرة واحدة. المثبتة والأكثر استخدامًا تظهر أولاً.",
    untitledTemplate: "قالب بدون عنوان",
    qpBadge: "🎮 لعب سريع",
    assignmentBadge: "📝 واجب",
    wordModeSummary: (words, modes) =>
      `${words} ${words === 1 ? "كلمة" : "كلمات"} · ${modes} ${modes === 1 ? "نمط" : "أنماط"}`,
    usedSummary: (times, when) => `استُخدم ${times}× · آخر ${when}`,
    pinAria: "تثبيت",
    unpinAria: "إلغاء التثبيت",
    useBtn: "استخدم",
    deleteAria: "حذف",
    deleteConfirm: (title) => `حذف "${title}"؟`,
    neverUsed: "لم يُستخدم بعد",
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: (n) => `قبل ${n} أيام`,
    weeksAgo: (n) => `قبل ${n} ${n === 1 ? "أسبوع" : "أسابيع"}`,
    monthsAgo: (n) => `قبل ${n} ${n === 1 ? "شهر" : "أشهر"}`,

    qpLiveTitle: "اللعب السريع جاهز!",
    qpLiveSubtitle: "شارك الرمز مع طلابك — يمكنهم الانضمام فورًا من أي هاتف.",
    qpLiveSession: "جلسة مباشرة",
    qpAnyMode: "أي نمط",
    sessionCodeLabel: "رمز الجلسة",
    copyLink: "انسخ الرابط",
    copiedShort: "تم النسخ!",
    whatsAppLabel: "واتساب",
    openLivePodium: "افتح المنصة المباشرة",
    playAnother: "العب أخرى",
    backToDashboardSmall: "العودة إلى لوحة التحكم",
    qpJoinMessage: (title, joinUrl) =>
      title
        ? `انضم إلى "${title}" على Vocaband! ${joinUrl}`
        : `انضم إلى جلسة اللعب السريع على Vocaband: ${joinUrl}`,
  },
};
