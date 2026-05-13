/**
 * live-challenge.ts — i18n strings for LiveChallengeView (the
 * teacher-projected podium that shows real-time scores during a
 * Live Challenge session).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface LiveChallengeStrings {
  // Header bar
  backToClassSelection: string;
  liveIndicator: string;
  reconnecting: string;
  endChallenge: string;

  // Title block
  liveChallengeFor: (className: string) => string;
  classCodeLabel: string;

  // Socket-offline warning
  podiumNotConnected: string;
  podiumOfflineHelp: string;

  // Podium / leaderboard
  fullLeaderboard: string;
  /** Plural-aware label for the player counter chip. */
  playerCount: (n: number) => string;

  // Empty state
  waitingForStudents: string;
  shareCodeToStart: string;

  // Top-3 podium plaques
  pointsLabel: string;
  rankBadge1: string;
  rankBadge2: string;
  rankBadge3: string;

  // Results modal
  challengeComplete: string;
  placeSuffix: (rank: number) => string;
  studentsPlayedSummary: (n: number) => string;
  close: string;
}

export const liveChallengeT: Record<Language, LiveChallengeStrings> = {
  en: {
    backToClassSelection: "← Back to Class Selection",
    liveIndicator: "🔴 LIVE",
    reconnecting: "Reconnecting...",
    endChallenge: "End Challenge",
    liveChallengeFor: (name) => `🏆 Live Challenge: ${name}`,
    classCodeLabel: "Class Code:",
    podiumNotConnected: "Live podium not connected",
    podiumOfflineHelp:
      "Students who join right now won't show up here until the socket reconnects. This is usually the real-time server waking up from idle — try refreshing this page in 10–20 seconds. If it keeps showing, the live backend (Render) may be down or unreachable from your network.",
    fullLeaderboard: "Full Leaderboard",
    playerCount: (n) => `${n} ${n === 1 ? "Player" : "Players"}`,
    waitingForStudents: "Waiting for students to join...",
    shareCodeToStart: "Share the class code to start the competition!",
    pointsLabel: "POINTS",
    rankBadge1: "1ST",
    rankBadge2: "2ND",
    rankBadge3: "3RD",
    challengeComplete: "Challenge Complete!",
    placeSuffix: (rank) => `#${rank} place`,
    studentsPlayedSummary: (n) => `${n} ${n === 1 ? "student" : "students"} played`,
    close: "Close",
  },
  he: {
    backToClassSelection: "→ חזרה לבחירת כיתה",
    liveIndicator: "🔴 משדר",
    reconnecting: "מתחבר מחדש...",
    endChallenge: "סיים אתגר",
    liveChallengeFor: (name) => `🏆 אתגר חי: ${name}`,
    classCodeLabel: "קוד כיתה:",
    podiumNotConnected: "הפודיום החי לא מחובר",
    podiumOfflineHelp:
      "תלמידים שמצטרפים כרגע לא יופיעו כאן עד שהחיבור יחזור. זה בדרך כלל השרת בזמן אמת מתעורר ממצב סרק — נסו לרענן את הדף בעוד 10–20 שניות. אם זה ממשיך להופיע, ייתכן שהשרת החי (Render) מושבת או לא נגיש מהרשת שלכם.",
    fullLeaderboard: "טבלת המובילים המלאה",
    playerCount: (n) => `${n} ${n === 1 ? "שחקן" : "שחקנים"}`,
    waitingForStudents: "מחכים לתלמידים שיצטרפו...",
    shareCodeToStart: "שתפו את קוד הכיתה כדי להתחיל את התחרות!",
    pointsLabel: "נקודות",
    rankBadge1: "1",
    rankBadge2: "2",
    rankBadge3: "3",
    challengeComplete: "האתגר הסתיים!",
    placeSuffix: (rank) => `מקום ${rank}`,
    studentsPlayedSummary: (n) => `${n} ${n === 1 ? "תלמיד שיחק" : "תלמידים שיחקו"}`,
    close: "סגירה",
  },
  ar: {
    backToClassSelection: "→ العودة إلى اختيار الصف",
    liveIndicator: "🔴 مباشر",
    reconnecting: "جارٍ إعادة الاتصال...",
    endChallenge: "إنهاء التحدي",
    liveChallengeFor: (name) => `🏆 تحدٍّ مباشر: ${name}`,
    classCodeLabel: "رمز الصف:",
    podiumNotConnected: "منصة المباشر غير متصلة",
    podiumOfflineHelp:
      "الطلاب الذين ينضمون الآن لن يظهروا هنا حتى يعود الاتصال. عادةً ما يكون السبب أن الخادم اللحظي يستيقظ من الخمول — حاول تحديث هذه الصفحة بعد 10–20 ثانية. إذا استمر الظهور، فقد يكون الخادم (Render) معطلاً أو غير متاح من شبكتك.",
    fullLeaderboard: "لوحة المتصدّرين الكاملة",
    playerCount: (n) => `${n} ${n === 1 ? "لاعب" : "لاعبين"}`,
    waitingForStudents: "في انتظار انضمام الطلاب...",
    shareCodeToStart: "شارك رمز الصف لبدء المنافسة!",
    pointsLabel: "نقاط",
    rankBadge1: "1",
    rankBadge2: "2",
    rankBadge3: "3",
    challengeComplete: "اكتمل التحدي!",
    placeSuffix: (rank) => `المركز ${rank}`,
    studentsPlayedSummary: (n) => `${n} ${n === 1 ? "طالب لعب" : "طلاب لعبوا"}`,
    close: "إغلاق",
  },
};
