/**
 * Locale file for GameFinishedView (the "you finished!" celebration
 * screen).
 *
 * Pattern matches src/locales/student/game-modes.ts — same shape, same
 * import contract.  See docs/I18N-MIGRATION.md for the full pattern.
 *
 * Subtitle + headline pools are arrays the view picks randomly from
 * via secureRandomInt — pool length is part of the type so adding a
 * 9th headline doesn't desync EN / HE / AR.
 */
import type { Language } from "../../hooks/useLanguage";

export interface GameFinishedT {
  /** Random celebration headline pool — 8 entries, with a {name}
   *  placeholder that's filled in at render time. */
  headlines: [string, string, string, string, string, string, string, string];
  /** Random subtitle pool — 5 entries, no placeholder. */
  subtitles: [string, string, string, string, string];
  finalScore: string;
  totalXp: string;
  streak: string;
  correctOf: (correct: number, total: number) => string;
  toReview: (n: number) => string;
  badgesEarned: string;
  savingScore: string;
  whatsNext: string;
  /** Guest (Quick Play) buttons. */
  playAnotherMode: string;
  exitQuickPlay: string;
  /** Authenticated student buttons. */
  tryAgain: string;
  chooseAnotherMode: string;
  reviewMissedWord: (n: number) => string;
  backToDashboard: string;
  /** Phase-1 redesign (2026-04-30): the post-game screen now collapses
   *  to a single big primary button + a tiny secondary text link.
   *  backToModes is the primary; exitToDashboard is the link. */
  backToModes: string;
  exitToDashboard: string;
  /** Secondary CTA on the celebration screen — opens CertificateModal
   *  with the student's lifetime stats so they can print or share with
   *  parents.  Only rendered for authenticated real students. */
  getCertificate: string;
  preparingCertificate: string;
  certificateUnavailable: string;
  /** Confirmation dialog (e.g. "Are you sure you want to leave?"). */
  confirmActionTitle: string;
  cancel: string;
  confirm: string;
  /** Quick Play endgame (2026-06-11) — celebratory rank banner +
   *  "Words to practice" list on the guest finish screen.  Keys are
   *  APPENDED (here and in each language block) so concurrent locale
   *  PRs merge without conflicts. */
  qpScoredXp: (xp: number) => string;
  qpRankOf: (rank: number, total: number) => string;
  wordsToPractice: string;
  playAgain: string;
  backToHome: string;
}

export const gameFinishedT: Record<Language, GameFinishedT> = {
  en: {
    headlines: [
      "Kol Hakavod, {name}!",
      "Amazing work, {name}!",
      "You crushed it, {name}!",
      "{name}, you're a star!",
      "Incredible, {name}!",
      "Way to go, {name}!",
      "{name} is on fire!",
      "Bravo, {name}!",
    ],
    subtitles: [
      "You finished the assignment!",
      "Another challenge conquered!",
      "Your vocabulary is growing!",
      "Keep this momentum going!",
      "You're making great progress!",
    ],
    finalScore: "Final Score",
    totalXp: "Total XP",
    streak: "Streak",
    correctOf: (correct, total) => `${correct} / ${total} correct`,
    toReview: (n) => `(${n} to review)`,
    badgesEarned: "Badges Earned",
    savingScore: "Saving your score...",
    whatsNext: "What's next?",
    playAnotherMode: "Play Another Mode",
    exitQuickPlay: "Exit Quick Play",
    tryAgain: "Try Again",
    chooseAnotherMode: "Choose Another Mode",
    reviewMissedWord: (n) => `Review ${n} Missed Word${n > 1 ? "s" : ""}`,
    backToDashboard: "Back to Dashboard",
    backToModes: "Back to Modes →",
    exitToDashboard: "Exit to dashboard",
    getCertificate: "Get my certificate",
    preparingCertificate: "Preparing your certificate…",
    certificateUnavailable: "Couldn't load your stats. Try again in a moment.",
    confirmActionTitle: "Confirm Action",
    cancel: "Cancel",
    confirm: "Confirm",
    qpScoredXp: (xp) => `🎉 You scored ${xp} XP`,
    // English ordinal suffix (1st / 2nd / 3rd / 4th…) — the teens
    // (11th–13th) are the only irregulars, handled by the v-20 check.
    qpRankOf: (rank, total) => {
      const s = ["th", "st", "nd", "rd"];
      const v = rank % 100;
      return `${rank}${s[(v - 20) % 10] || s[v] || s[0]} of ${total} students`;
    },
    wordsToPractice: "Words to practice 📚",
    playAgain: "Play again",
    backToHome: "Back to home",
  },

  he: {
    headlines: [
      "כל הכבוד, {name}!",
      "עבודה מדהימה, {name}!",
      "ניצחת בגדול, {name}!",
      "{name}, אתה כוכב!",
      "מדהים, {name}!",
      "כל הכבוד, {name}!",
      "{name} בוער!",
      "ברבו, {name}!",
    ],
    subtitles: [
      "סיימת את המטלה!",
      "אתגר נוסף נכבש!",
      "אוצר המילים שלך גדל!",
      "המשך עם המומנטום!",
      "אתה מתקדם נהדר!",
    ],
    finalScore: "ציון סופי",
    totalXp: 'סה"כ XP',
    streak: "רצף",
    correctOf: (correct, total) => `${correct} / ${total} נכונות`,
    toReview: (n) => `(${n} לחזרה)`,
    badgesEarned: "עיטורים שזכית בהם",
    savingScore: "שומר את הציון שלך...",
    whatsNext: "מה הלאה?",
    playAnotherMode: "שחק במצב אחר",
    exitQuickPlay: "צא ממשחק מהיר",
    tryAgain: "נסה שוב",
    chooseAnotherMode: "בחר מצב אחר",
    reviewMissedWord: (n) => `חזור על ${n} מילים שפיספסת`,
    backToDashboard: "חזור ללוח הבקרה",
    backToModes: "חזרה למצבים →",
    exitToDashboard: "יציאה ללוח הבקרה",
    getCertificate: "קבל את התעודה שלי",
    preparingCertificate: "מכין את התעודה שלך…",
    certificateUnavailable: "לא הצלחנו לטעון את הנתונים שלך. נסה שוב בעוד רגע.",
    confirmActionTitle: "אישור פעולה",
    cancel: "ביטול",
    confirm: "אישור",
    qpScoredXp: (xp) => `🎉 צברת ${xp} XP`,
    qpRankOf: (rank, total) => `מקום ${rank} מתוך ${total} תלמידים`,
    wordsToPractice: "מילים לתרגול 📚",
    playAgain: "שחק שוב",
    backToHome: "חזרה לדף הבית",
  },

  ar: {
    headlines: [
      "أحسنت يا {name}!",
      "عمل رائع يا {name}!",
      "لقد سحقتها يا {name}!",
      "{name}، أنت نجم!",
      "لا يصدق يا {name}!",
      "أحسنت صنعا يا {name}!",
      "{name} في قمته!",
      "برافو يا {name}!",
    ],
    subtitles: [
      "أنهيت المهمة!",
      "تحد آخر تم قهره!",
      "مفرداتك تنمو!",
      "حافظ على هذا الزخم!",
      "أنت تحرز تقدمًا رائعًا!",
    ],
    finalScore: "النتيجة النهائية",
    totalXp: "إجمالي XP",
    streak: "سلسلة",
    correctOf: (correct, total) => `${correct} / ${total} صحيح`,
    toReview: (n) => `(${n} للمراجعة)`,
    badgesEarned: "الشارات المكتسبة",
    savingScore: "جارٍ حفظ نتيجتك...",
    whatsNext: "ما التالي؟",
    playAnotherMode: "العب وضعًا آخر",
    exitQuickPlay: "اخرج من اللعب السريع",
    tryAgain: "حاول مرة أخرى",
    chooseAnotherMode: "اختر وضعًا آخر",
    reviewMissedWord: (n) => `راجع ${n} كلمة فاتتك`,
    backToDashboard: "العودة إلى لوحة التحكم",
    backToModes: "العودة إلى الأوضاع →",
    exitToDashboard: "الخروج إلى لوحة التحكم",
    getCertificate: "احصل على شهادتي",
    preparingCertificate: "جاري تحضير شهادتك…",
    certificateUnavailable: "تعذر تحميل إحصاءاتك. حاول مرة أخرى بعد لحظة.",
    confirmActionTitle: "تأكيد الإجراء",
    cancel: "إلغاء",
    confirm: "تأكيد",
    qpScoredXp: (xp) => `🎉 حصلت على ${xp} XP`,
    qpRankOf: (rank, total) => `المركز ${rank} من ${total} طالبًا`,
    wordsToPractice: "كلمات للتدريب 📚",
    playAgain: "العب مرة أخرى",
    backToHome: "العودة إلى الصفحة الرئيسية",
  },

  ru: {
    headlines: [
      "Kol Hakavod, {name}!",
      "Amazing work, {name}!",
      "You crushed it, {name}!",
      "{name}, you're a star!",
      "Incredible, {name}!",
      "Way to go, {name}!",
      "{name} is on fire!",
      "Bravo, {name}!",
    ],
    subtitles: [
      "You finished the assignment!",
      "Another challenge conquered!",
      "Your vocabulary is growing!",
      "Keep this momentum going!",
      "You're making great progress!",
    ],
    finalScore: "Final Score",
    totalXp: "Total XP",
    streak: "Streak",
    correctOf: (correct, total) => `${correct} / ${total} correct`,
    toReview: (n) => `(${n} to review)`,
    badgesEarned: "Badges Earned",
    savingScore: "Saving your score...",
    whatsNext: "What's next?",
    playAnotherMode: "Play Another Mode",
    exitQuickPlay: "Exit Quick Play",
    tryAgain: "Try Again",
    chooseAnotherMode: "Choose Another Mode",
    reviewMissedWord: (n) => `Review ${n} Missed Word${n > 1 ? "s" : ""}`,
    backToDashboard: "Back to Dashboard",
    backToModes: "Back to Modes →",
    exitToDashboard: "Exit to dashboard",
    getCertificate: "Get my certificate",
    preparingCertificate: "Preparing your certificate…",
    certificateUnavailable: "Couldn't load your stats. Try again in a moment.",
    confirmActionTitle: "Confirm Action",
    cancel: "Cancel",
    confirm: "Confirm",
    // The ru block mirrors EN throughout this file (see entries above) —
    // keeping that convention so the screen isn't a mix of languages.
    qpScoredXp: (xp) => `🎉 You scored ${xp} XP`,
    qpRankOf: (rank, total) => {
      const s = ["th", "st", "nd", "rd"];
      const v = rank % 100;
      return `${rank}${s[(v - 20) % 10] || s[v] || s[0]} of ${total} students`;
    },
    wordsToPractice: "Words to practice 📚",
    playAgain: "Play again",
    backToHome: "Back to home",
  },
};
