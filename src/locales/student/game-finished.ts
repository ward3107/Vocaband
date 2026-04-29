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
  },
};
