/**
 * Locale file for the remaining teacher-facing views:
 *  - TeacherApprovalsView
 *  - LiveChallengeClassSelectView
 *  - ClassNotFoundBanner (shown to students whose class code is missing)
 *  - QuickPlayMonitor (visible primary chrome — full inner UI is large)
 *  - RewardInboxCard (TYPE_META labels + Thanks! button)
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherViewsT {
  // ─── TeacherApprovalsView ──────────────────────────────────────
  approvalsTitle: string;
  approvalsSubtitle: string;
  allCaughtUp: string;
  allCaughtUpBlurb: string;
  backToDashboard: string;
  pendingApprovals: string;
  /** "{n} student/students waiting for you to approve or reject." */
  pendingSummary: (n: number) => string;
  refresh: string;
  refreshTitle: string;
  /** "Approve all (N)". */
  approveAllN: (n: number) => string;
  approveAllTitle: string;
  /** "Approved N students!" toast. */
  approvedNToast: (n: number) => string;
  /** "Joined {date}". */
  joinedOn: (date: string) => string;
  rejectShort: string;
  rejectTitle: string;
  approve: string;
  approveTitle: string;
  approvalsHelper: string;

  // ─── LiveChallengeClassSelectView ──────────────────────────────
  liveModeTitle: string;
  liveModeSubtitle: string;
  selectClassHeading: string;
  selectClassBlurb: string;
  /** "Code: " label preceding the join code. */
  codeLabel: string;

  // ─── ClassNotFoundBanner ───────────────────────────────────────
  classNotFoundTitle: (code: string) => string;
  classNotFoundBody: string;
  signOutAndTryAgain: string;
  stayHere: string;
  dismissAria: string;

  // ─── QuickPlayMonitor ──────────────────────────────────────────
  qpJoinedFlag: string;
  qpJoinCodeLabel: string;
  qpCurrentLeaders: string;
  qpPodium: string;
  qpWords: string;
  qpStop: string;
  qpRemovePlayerTitle: string;
  qpSelectedWords: string;
  qpBackgroundMusic: string;
  qpPrevTrackTitle: string;
  qpNextTrackTitle: string;

  // ─── RewardInboxCard ───────────────────────────────────────────
  rewardXpLabel: string;
  rewardBadgeLabel: string;
  rewardTitleLabel: string;
  rewardAvatarLabel: string;
  rewardGenericLabel: string;
  /** "{label} · from {teacherName}". */
  rewardFromTeacher: (label: string, teacherName: string) => string;
  thanksBtn: string;
  dismissRewardAria: string;
}

export const teacherViewsT: Record<Language, TeacherViewsT> = {
  en: {
    approvalsTitle: "Student Approvals",
    approvalsSubtitle: "Review and approve student signups",
    allCaughtUp: "All caught up!",
    allCaughtUpBlurb: "No students are waiting for approval right now.",
    backToDashboard: "Back to dashboard",
    pendingApprovals: "Pending approvals",
    pendingSummary: (n) =>
      `${n} ${n === 1 ? 'student' : 'students'} waiting for you to approve or reject.`,
    refresh: "Refresh",
    refreshTitle: "Refresh list",
    approveAllN: (n) => `Approve all (${n})`,
    approveAllTitle: "Approve all pending students at once",
    approvedNToast: (n) => `Approved ${n} students!`,
    joinedOn: (date) => `Joined ${date}`,
    rejectShort: "Reject",
    rejectTitle: "Reject this student — they'll need to sign up again",
    approve: "Approve",
    approveTitle: "Approve this student so they can log in and start learning",
    approvalsHelper:
      "After approval, students can log in immediately with their class code and start earning XP. Their progress is saved automatically.",

    liveModeTitle: "Live Mode for Classes",
    liveModeSubtitle: "SELECT A CLASS TO START",
    selectClassHeading: "Select a Class",
    selectClassBlurb: "Choose which class to start the Live Challenge for",
    codeLabel: "Code:",

    classNotFoundTitle: (code) => `Class code "${code}" not found`,
    classNotFoundBody: "That class doesn't exist. You're still signed in to your current class.",
    signOutAndTryAgain: "Sign out & try again",
    stayHere: "Stay here",
    dismissAria: "Dismiss",

    qpJoinedFlag: "Joined!",
    qpJoinCodeLabel: "Join code",
    qpCurrentLeaders: "Current Leaders",
    qpPodium: "Podium",
    qpWords: "Words",
    qpStop: "Stop",
    qpRemovePlayerTitle: "Remove Player?",
    qpSelectedWords: "Selected Words",
    qpBackgroundMusic: "Background Music",
    qpPrevTrackTitle: "Previous track",
    qpNextTrackTitle: "Next track",

    rewardXpLabel: "XP Boost",
    rewardBadgeLabel: "New Badge",
    rewardTitleLabel: "New Title",
    rewardAvatarLabel: "New Avatar",
    rewardGenericLabel: "Reward",
    rewardFromTeacher: (label, teacherName) => `${label} · from ${teacherName}`,
    thanksBtn: "Thanks!",
    dismissRewardAria: "Dismiss reward",
  },

  he: {
    approvalsTitle: "אישור תלמידים",
    approvalsSubtitle: "סקור ואשר רישומי תלמידים",
    allCaughtUp: "הכל מסודר!",
    allCaughtUpBlurb: "אין תלמידים שממתינים לאישור כרגע.",
    backToDashboard: "חזרה ללוח הבקרה",
    pendingApprovals: "אישורים ממתינים",
    pendingSummary: (n) =>
      `${n} ${n === 1 ? "תלמיד ממתין לאישור או דחייה." : "תלמידים ממתינים לאישור או דחייה."}`,
    refresh: "רענן",
    refreshTitle: "רענן רשימה",
    approveAllN: (n) => `אשר הכל (${n})`,
    approveAllTitle: "אשר את כל התלמידים הממתינים בבת אחת",
    approvedNToast: (n) => `אושרו ${n} תלמידים!`,
    joinedOn: (date) => `הצטרף בתאריך ${date}`,
    rejectShort: "דחה",
    rejectTitle: "דחה את התלמיד — הוא/היא יצטרך/תצטרך להירשם מחדש",
    approve: "אשר",
    approveTitle: "אשר את התלמיד כדי שיוכל להתחבר ולהתחיל ללמוד",
    approvalsHelper:
      "לאחר האישור, התלמידים יוכלו להתחבר מיד עם קוד הכיתה ולהתחיל לצבור XP. ההתקדמות נשמרת אוטומטית.",

    liveModeTitle: "מצב חי לכיתות",
    liveModeSubtitle: "בחר כיתה כדי להתחיל",
    selectClassHeading: "בחר כיתה",
    selectClassBlurb: "בחר עבור איזו כיתה להתחיל את האתגר החי",
    codeLabel: "קוד:",

    classNotFoundTitle: (code) => `קוד הכיתה "${code}" לא נמצא`,
    classNotFoundBody: "הכיתה הזו לא קיימת. אתה עדיין מחובר לכיתה הנוכחית שלך.",
    signOutAndTryAgain: "התנתק ונסה שוב",
    stayHere: "השאר כאן",
    dismissAria: "סגור",

    qpJoinedFlag: "הצטרף!",
    qpJoinCodeLabel: "קוד הצטרפות",
    qpCurrentLeaders: "המובילים כעת",
    qpPodium: "פודיום",
    qpWords: "מילים",
    qpStop: "עצור",
    qpRemovePlayerTitle: "להסיר שחקן?",
    qpSelectedWords: "מילים נבחרות",
    qpBackgroundMusic: "מוזיקת רקע",
    qpPrevTrackTitle: "שיר קודם",
    qpNextTrackTitle: "שיר הבא",

    rewardXpLabel: "בוסט XP",
    rewardBadgeLabel: "תג חדש",
    rewardTitleLabel: "תואר חדש",
    rewardAvatarLabel: "אווטאר חדש",
    rewardGenericLabel: "תגמול",
    rewardFromTeacher: (label, teacherName) => `${label} · מאת ${teacherName}`,
    thanksBtn: "תודה!",
    dismissRewardAria: "סגור תגמול",
  },

  ar: {
    approvalsTitle: "موافقات الطلاب",
    approvalsSubtitle: "راجع ووافق على تسجيلات الطلاب",
    allCaughtUp: "كل شيء جاهز!",
    allCaughtUpBlurb: "لا يوجد طلاب ينتظرون الموافقة الآن.",
    backToDashboard: "العودة إلى لوحة التحكم",
    pendingApprovals: "الموافقات المعلقة",
    pendingSummary: (n) =>
      `${n} ${n === 1 ? "طالب ينتظر موافقتك أو رفضك." : "طلاب ينتظرون موافقتك أو رفضك."}`,
    refresh: "تحديث",
    refreshTitle: "تحديث القائمة",
    approveAllN: (n) => `وافق على الجميع (${n})`,
    approveAllTitle: "وافق على جميع الطلاب المعلقين دفعة واحدة",
    approvedNToast: (n) => `تمت الموافقة على ${n} طلاب!`,
    joinedOn: (date) => `انضم في ${date}`,
    rejectShort: "رفض",
    rejectTitle: "ارفض هذا الطالب — سيحتاج إلى التسجيل مرة أخرى",
    approve: "وافق",
    approveTitle: "وافق على الطالب ليتمكن من تسجيل الدخول والبدء في التعلم",
    approvalsHelper:
      "بعد الموافقة، يمكن للطلاب تسجيل الدخول فورًا برمز الفصل وبدء كسب XP. يُحفظ تقدمهم تلقائيًا.",

    liveModeTitle: "الوضع المباشر للفصول",
    liveModeSubtitle: "اختر فصلاً للبدء",
    selectClassHeading: "اختر فصلاً",
    selectClassBlurb: "اختر الفصل الذي تريد بدء التحدي المباشر له",
    codeLabel: "الرمز:",

    classNotFoundTitle: (code) => `رمز الفصل "${code}" غير موجود`,
    classNotFoundBody: "هذا الفصل غير موجود. أنت لا تزال مسجل الدخول إلى فصلك الحالي.",
    signOutAndTryAgain: "تسجيل الخروج والمحاولة مجددًا",
    stayHere: "ابقَ هنا",
    dismissAria: "إغلاق",

    qpJoinedFlag: "انضم!",
    qpJoinCodeLabel: "رمز الانضمام",
    qpCurrentLeaders: "المتصدرون حاليًا",
    qpPodium: "المنصة",
    qpWords: "الكلمات",
    qpStop: "إيقاف",
    qpRemovePlayerTitle: "إزالة اللاعب؟",
    qpSelectedWords: "الكلمات المختارة",
    qpBackgroundMusic: "موسيقى الخلفية",
    qpPrevTrackTitle: "المقطع السابق",
    qpNextTrackTitle: "المقطع التالي",

    rewardXpLabel: "دعم XP",
    rewardBadgeLabel: "شارة جديدة",
    rewardTitleLabel: "لقب جديد",
    rewardAvatarLabel: "صورة جديدة",
    rewardGenericLabel: "مكافأة",
    rewardFromTeacher: (label, teacherName) => `${label} · من ${teacherName}`,
    thanksBtn: "شكرًا!",
    dismissRewardAria: "إغلاق المكافأة",
  },
};
