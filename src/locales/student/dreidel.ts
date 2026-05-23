/**
 * dreidel.ts — student-facing strings for the Dreidel live blitz mode.
 *
 * One screen covered: DreidelStudentView (the student's phone view
 * while the teacher projects the lobby/leaderboard).
 */
import type { Language } from "../../hooks/useLanguage";

export interface StudentDreidelStrings {
  // Pre-game
  joining: string;
  waitingForSpin: string;
  spinning: string;

  // Input
  letterIs: (letter: string) => string;
  topicIs: (topic: string) => string;
  inputPlaceholder: string;
  submitButton: string;
  rareDoubleHint: string;

  // Outcomes
  youWon: (points: number) => string;
  someoneElseWon: (winner: string, word: string) => string;
  timesUp: string;
  livesLeft: (n: number) => string;
  lostLife: string;
  bonusLife: string;
  stoleFrom: (victim: string) => string;
  victimOfSteal: (stealer: string) => string;

  // Power-ups
  powerUpsHeading: string;
  powerSkip: string;
  powerPeek: string;
  powerTime: string;
  powerUsed: string;
  peekHint: (firstLetters: string) => string;

  // Eliminated / finished
  eliminatedTitle: string;
  eliminatedSubtitle: string;
  spectatorMode: string;
  finishedTitle: string;
  youWon2: string;
  youLost: string;
  finalScore: (points: number) => string;
  finalCorrect: (n: number) => string;
  leaveButton: string;

  // Sudden death
  suddenDeathBanner: string;

  // Error states
  notInDictionary: string;
  alreadyUsed: string;
  wrongLetter: (letter: string) => string;
}

export const studentDreidelT: Record<Language, StudentDreidelStrings> = {
  en: {
    joining: "Joining the Dreidel…",
    waitingForSpin: "Get ready — your teacher will spin the dreidel.",
    spinning: "🎲 Spinning…",
    letterIs: (l) => `Type an English word starting with ${l}`,
    topicIs: (topic) => `Topic: ${topic}`,
    inputPlaceholder: "Your word…",
    submitButton: "Submit",
    rareDoubleHint: "Rare letter — 2× points!",
    youWon: (p) => `You got it! +${p} pts`,
    someoneElseWon: (w, word) => `${w} got it first: ${word.toUpperCase()}`,
    timesUp: "⏰ Time's up — nobody answered.",
    livesLeft: (n) => `${n} ${n === 1 ? "life" : "lives"}`,
    lostLife: "−1 life",
    bonusLife: "+1 BONUS LIFE!",
    stoleFrom: (v) => `🦹 You stole a life from ${v}!`,
    victimOfSteal: (s) => `💔 ${s} stole a life from you!`,
    powerUpsHeading: "Power-ups",
    powerSkip: "Skip",
    powerPeek: "Peek",
    powerTime: "+3s",
    powerUsed: "Used",
    peekHint: (l) => `💡 Hint: try "${l.toUpperCase()}…"`,
    eliminatedTitle: "You're out of lives",
    eliminatedSubtitle: "Watch the rest — the survivor wins.",
    spectatorMode: "Spectator",
    finishedTitle: "🏁 Game Over",
    youWon2: "🏆 You won!",
    youLost: "Better luck next round!",
    finalScore: (p) => `Final score: ${p} pts`,
    finalCorrect: (n) => `Correct answers: ${n}`,
    leaveButton: "Back to dashboard",
    suddenDeathBanner: "⚔️ Sudden Death!",
    notInDictionary: "Not in the dictionary",
    alreadyUsed: "Already used this game",
    wrongLetter: (l) => `Must start with ${l}`,
  },
  he: {
    joining: "מצטרף לסביבון…",
    waitingForSpin: "תתכונן — המורה יסובב את הסביבון.",
    spinning: "🎲 מסתובב…",
    letterIs: (l) => `הקלד מילה באנגלית שמתחילה ב-${l}`,
    topicIs: (topic) => `נושא: ${topic}`,
    inputPlaceholder: "המילה שלך…",
    submitButton: "שלח",
    rareDoubleHint: "אות נדירה — כפול נקודות!",
    youWon: (p) => `הצלחת! +${p} נק'`,
    someoneElseWon: (w, word) => `${w} ענה ראשון: ${word.toUpperCase()}`,
    timesUp: "⏰ נגמר הזמן — אף אחד לא ענה.",
    livesLeft: (n) => `${n} ${n === 1 ? "חיים" : "חיים"}`,
    lostLife: "פחות חיים אחד",
    bonusLife: "בונוס חיים!",
    stoleFrom: (v) => `🦹 גנבת חיים מ-${v}!`,
    victimOfSteal: (s) => `💔 ${s} גנב ממך חיים!`,
    powerUpsHeading: "כוחות-על",
    powerSkip: "דילוג",
    powerPeek: "רמז",
    powerTime: "+3 שניות",
    powerUsed: "בשימוש",
    peekHint: (l) => `💡 רמז: נסה "${l.toUpperCase()}…"`,
    eliminatedTitle: "נגמרו לך החיים",
    eliminatedSubtitle: "צפה בשאר — מי שנשאר אחרון מנצח.",
    spectatorMode: "צופה",
    finishedTitle: "🏁 המשחק נגמר",
    youWon2: "🏆 ניצחת!",
    youLost: "בהצלחה בסיבוב הבא!",
    finalScore: (p) => `ניקוד סופי: ${p} נק'`,
    finalCorrect: (n) => `תשובות נכונות: ${n}`,
    leaveButton: "חזרה ללוח הבקרה",
    suddenDeathBanner: "⚔️ מוות פתאומי!",
    notInDictionary: "לא נמצא במילון",
    alreadyUsed: "כבר נוצל במשחק הזה",
    wrongLetter: (l) => `חייב להתחיל ב-${l}`,
  },
  ar: {
    joining: "جارٍ الانضمام إلى الدريدل…",
    waitingForSpin: "استعد — معلمك سيدور الدريدل.",
    spinning: "🎲 يدور…",
    letterIs: (l) => `اكتب كلمة إنجليزية تبدأ بـ ${l}`,
    topicIs: (topic) => `الموضوع: ${topic}`,
    inputPlaceholder: "كلمتك…",
    submitButton: "إرسال",
    rareDoubleHint: "حرف نادر — نقاط مضاعفة!",
    youWon: (p) => `أحسنت! +${p} نقاط`,
    someoneElseWon: (w, word) => `${w} أجاب أولًا: ${word.toUpperCase()}`,
    timesUp: "⏰ انتهى الوقت — لم يجب أحد.",
    livesLeft: (n) => `${n} ${n === 1 ? "روح" : "أرواح"}`,
    lostLife: "−1 روح",
    bonusLife: "+1 روح إضافية!",
    stoleFrom: (v) => `🦹 سرقت روحًا من ${v}!`,
    victimOfSteal: (s) => `💔 ${s} سرق منك روحًا!`,
    powerUpsHeading: "القوى الخاصة",
    powerSkip: "تخطٍ",
    powerPeek: "نظرة",
    powerTime: "+3 ثوانٍ",
    powerUsed: "مستخدم",
    peekHint: (l) => `💡 تلميح: جرّب "${l.toUpperCase()}…"`,
    eliminatedTitle: "نفدت أرواحك",
    eliminatedSubtitle: "شاهد البقية — آخر من يبقى يفوز.",
    spectatorMode: "متفرج",
    finishedTitle: "🏁 انتهت اللعبة",
    youWon2: "🏆 لقد فزت!",
    youLost: "حظ أوفر في الجولة القادمة!",
    finalScore: (p) => `النتيجة النهائية: ${p} نقاط`,
    finalCorrect: (n) => `إجابات صحيحة: ${n}`,
    leaveButton: "العودة إلى لوحة التحكم",
    suddenDeathBanner: "⚔️ الموت المفاجئ!",
    notInDictionary: "ليست في القاموس",
    alreadyUsed: "تم استخدامها بالفعل",
    wrongLetter: (l) => `يجب أن تبدأ بـ ${l}`,
  },
  ru: {
    joining: "Joining the Dreidel…",
    waitingForSpin: "Get ready — your teacher will spin the dreidel.",
    spinning: "🎲 Spinning…",
    letterIs: (l) => `Type an English word starting with ${l}`,
    topicIs: (topic) => `Topic: ${topic}`,
    inputPlaceholder: "Your word…",
    submitButton: "Submit",
    rareDoubleHint: "Rare letter — 2× points!",
    youWon: (p) => `You got it! +${p} pts`,
    someoneElseWon: (w, word) => `${w} got it first: ${word.toUpperCase()}`,
    timesUp: "⏰ Time's up — nobody answered.",
    livesLeft: (n) => `${n} ${n === 1 ? "life" : "lives"}`,
    lostLife: "−1 life",
    bonusLife: "+1 BONUS LIFE!",
    stoleFrom: (v) => `🦹 You stole a life from ${v}!`,
    victimOfSteal: (s) => `💔 ${s} stole a life from you!`,
    powerUpsHeading: "Power-ups",
    powerSkip: "Skip",
    powerPeek: "Peek",
    powerTime: "+3s",
    powerUsed: "Used",
    peekHint: (l) => `💡 Hint: try "${l.toUpperCase()}…"`,
    eliminatedTitle: "You're out of lives",
    eliminatedSubtitle: "Watch the rest — the survivor wins.",
    spectatorMode: "Spectator",
    finishedTitle: "🏁 Game Over",
    youWon2: "🏆 You won!",
    youLost: "Better luck next round!",
    finalScore: (p) => `Final score: ${p} pts`,
    finalCorrect: (n) => `Correct answers: ${n}`,
    leaveButton: "Back to dashboard",
    suddenDeathBanner: "⚔️ Sudden Death!",
    notInDictionary: "Not in the dictionary",
    alreadyUsed: "Already used this game",
    wrongLetter: (l) => `Must start with ${l}`,
  },
};
