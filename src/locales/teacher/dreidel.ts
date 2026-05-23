/**
 * dreidel.ts — teacher-facing strings for the Dreidel live blitz mode.
 *
 * Two screens are covered:
 *   • DreidelLobbyView   — class picker + game config form
 *   • DreidelChallengeView — projected gameplay (spin, leaderboard, lives)
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherDreidelStrings {
  // Tile on the teacher dashboard
  tileTitle: string;
  tileSubtitle: string;

  // Lobby
  lobbyTitle: string;
  lobbySubtitle: string;
  selectClassHeading: string;
  selectClassBlurb: string;
  configHeading: string;
  livesLabel: string;
  livesHelp: string;
  timerLabel: string;
  timerHelp: (s: number) => string;
  topicLabel: string;
  topicHelp: string;
  powerUpsLabel: string;
  powerUpsHelp: string;
  suddenDeathLabel: string;
  suddenDeathHelp: string;
  stealLabel: string;
  stealHelp: string;
  startButton: string;
  backButton: string;

  // Live game header
  liveTitle: (className: string) => string;
  classCodeLabel: string;
  liveIndicator: string;
  reconnecting: string;
  endChallenge: string;

  // Phases
  phaseLobby: string;
  phaseLobbyHelp: string;
  phaseSpinning: string;
  phaseAnswering: string;
  phaseRoundEnd: string;
  phaseFinished: string;

  // Spin button
  spinButton: string;
  spinAgain: string;

  // Round overlay
  roundNumber: (n: number) => string;
  topicLabelForRound: (topic: string) => string;
  rareLetterBadge: string;
  winnerOverlay: (name: string, word: string) => string;
  timeUpOverlay: string;
  stealBadge: (victim: string) => string;
  suddenDeathBanner: string;

  // Leaderboard column
  leaderboardTitle: string;
  livesShort: string;
  pointsLabel: string;
  eliminatedLabel: string;
  waitingForPlayers: string;
  shareCode: string;

  // End confirm
  endConfirmTitle: string;
  endConfirmBody: (n: number) => string;
  endConfirmCancel: string;
  endConfirmEnd: string;

  // Final results
  resultsTitle: string;
  winnerLabel: string;
  noWinnerLabel: string;
  close: string;

  // Topic names (used when topicMode on)
  topics: Record<string, string>;
}

export const teacherDreidelT: Record<Language, TeacherDreidelStrings> = {
  en: {
    tileTitle: "Dreidel Blitz",
    tileSubtitle: "Spin a letter — fastest English word wins",
    lobbyTitle: "Set up Dreidel Blitz",
    lobbySubtitle: "Pick a class and tune the rules.",
    selectClassHeading: "Pick a class",
    selectClassBlurb: "Students join automatically once you start.",
    configHeading: "Game rules",
    livesLabel: "Starting lives",
    livesHelp: "How many wrong / timed-out rounds a student can survive.",
    timerLabel: "Time per letter",
    timerHelp: (s) => `${s} seconds to type a word.`,
    topicLabel: "Topic mode",
    topicHelp: "Add a category each round (e.g. F + animals → Fox).",
    powerUpsLabel: "Power-ups",
    powerUpsHelp: "Each student gets 1× Skip, 1× Peek, 1× +Time per game.",
    suddenDeathLabel: "Sudden death finale",
    suddenDeathHelp: "When 2 students remain: 4-second timer, rare letters only.",
    stealLabel: "Steal-a-life",
    stealHelp: "Answer in under 2 seconds → take a life from a random opponent.",
    startButton: "Start Dreidel →",
    backButton: "← Back",
    liveTitle: (name) => `🎲 Dreidel Blitz · ${name}`,
    classCodeLabel: "Class Code:",
    liveIndicator: "🔴 LIVE",
    reconnecting: "Reconnecting…",
    endChallenge: "End",
    phaseLobby: "Waiting in the lobby",
    phaseLobbyHelp: "Share the class code. Hit Spin when you're ready.",
    phaseSpinning: "Spinning…",
    phaseAnswering: "Answer now!",
    phaseRoundEnd: "Round over",
    phaseFinished: "Game over",
    spinButton: "🎲 Spin the Dreidel",
    spinAgain: "Spin again →",
    roundNumber: (n) => `Round ${n}`,
    topicLabelForRound: (topic) => `Topic: ${topic}`,
    rareLetterBadge: "2× POINTS",
    winnerOverlay: (name, word) => `${name} got it: ${word.toUpperCase()}`,
    timeUpOverlay: "⏰ Time's up — no one answered!",
    stealBadge: (victim) => `Stole a life from ${victim}!`,
    suddenDeathBanner: "⚔️ Sudden Death — rare letters, 4-second timer",
    leaderboardTitle: "Players",
    livesShort: "lives",
    pointsLabel: "pts",
    eliminatedLabel: "Out",
    waitingForPlayers: "Waiting for students to join…",
    shareCode: "Share the class code to start.",
    endConfirmTitle: "End the Dreidel?",
    endConfirmBody: (n) => n === 1 ? "1 student is playing." : `${n} students are playing.`,
    endConfirmCancel: "Keep going",
    endConfirmEnd: "Yes, end it",
    resultsTitle: "🏆 Dreidel Results",
    winnerLabel: "Winner",
    noWinnerLabel: "No winner — everyone fell out",
    close: "Close",
    topics: {
      animals: "Animals", food: "Food", sports: "Sports", colors: "Colors",
      clothing: "Clothing", school: "School", verbs: "Verbs", feelings: "Feelings",
      nature: "Nature", household: "Household", jobs: "Jobs", transport: "Transport",
    },
  },
  he: {
    tileTitle: "סביבון בזק",
    tileSubtitle: "סובב לאות — המילה הכי מהירה זוכה",
    lobbyTitle: "הגדרת סביבון בזק",
    lobbySubtitle: "בחר כיתה וכוון את הכללים.",
    selectClassHeading: "בחר כיתה",
    selectClassBlurb: "התלמידים מצטרפים אוטומטית ברגע שתתחיל.",
    configHeading: "כללי המשחק",
    livesLabel: "חיים בהתחלה",
    livesHelp: "כמה תשובות שגויות/פספוסי זמן תלמיד יכול לשרוד.",
    timerLabel: "זמן לכל אות",
    timerHelp: (s) => `${s} שניות להקליד מילה.`,
    topicLabel: "מצב נושא",
    topicHelp: "הוסף קטגוריה בכל סיבוב (לדוגמה F + animals → Fox).",
    powerUpsLabel: "כוחות-על",
    powerUpsHelp: "כל תלמיד מקבל פעם אחת: דילוג, רמז, +זמן.",
    suddenDeathLabel: "מוות פתאומי בסיום",
    suddenDeathHelp: "כשנשארים 2 תלמידים: טיימר 4 שניות, רק אותיות נדירות.",
    stealLabel: "גניבת חיים",
    stealHelp: "ענה תוך פחות מ-2 שניות → קח חיים מתלמיד אקראי.",
    startButton: "התחל סביבון →",
    backButton: "← חזור",
    liveTitle: (name) => `🎲 סביבון בזק · ${name}`,
    classCodeLabel: "קוד כיתה:",
    liveIndicator: "🔴 משדר",
    reconnecting: "מתחבר מחדש…",
    endChallenge: "סיים",
    phaseLobby: "מחכים בלובי",
    phaseLobbyHelp: "שתפו את קוד הכיתה. לחצו 'סובב' כשמוכנים.",
    phaseSpinning: "מסתובב…",
    phaseAnswering: "תענה עכשיו!",
    phaseRoundEnd: "סוף סיבוב",
    phaseFinished: "המשחק נגמר",
    spinButton: "🎲 סובב את הסביבון",
    spinAgain: "סובב שוב →",
    roundNumber: (n) => `סיבוב ${n}`,
    topicLabelForRound: (topic) => `נושא: ${topic}`,
    rareLetterBadge: "כפול נקודות",
    winnerOverlay: (name, word) => `${name} זכה עם: ${word.toUpperCase()}`,
    timeUpOverlay: "⏰ נגמר הזמן — אף אחד לא ענה!",
    stealBadge: (victim) => `גנב חיים מ-${victim}!`,
    suddenDeathBanner: "⚔️ מוות פתאומי — רק אותיות נדירות, 4 שניות",
    leaderboardTitle: "שחקנים",
    livesShort: "חיים",
    pointsLabel: "נק'",
    eliminatedLabel: "מחוץ",
    waitingForPlayers: "מחכים לתלמידים להצטרף…",
    shareCode: "שתפו את קוד הכיתה כדי להתחיל.",
    endConfirmTitle: "לסיים את הסביבון?",
    endConfirmBody: (n) => n === 1 ? "תלמיד אחד משחק כרגע." : `${n} תלמידים משחקים כרגע.`,
    endConfirmCancel: "ממשיכים",
    endConfirmEnd: "כן, לסיים",
    resultsTitle: "🏆 תוצאות הסביבון",
    winnerLabel: "הזוכה",
    noWinnerLabel: "אין זוכה — כולם הודחו",
    close: "סגירה",
    topics: {
      animals: "חיות", food: "אוכל", sports: "ספורט", colors: "צבעים",
      clothing: "ביגוד", school: "בית ספר", verbs: "פעלים", feelings: "רגשות",
      nature: "טבע", household: "בית", jobs: "מקצועות", transport: "תחבורה",
    },
  },
  ar: {
    tileTitle: "دريدل البرق",
    tileSubtitle: "تدور إلى حرف — أسرع كلمة إنجليزية تفوز",
    lobbyTitle: "إعداد دريدل البرق",
    lobbySubtitle: "اختر صفًا واضبط القواعد.",
    selectClassHeading: "اختر صفًا",
    selectClassBlurb: "ينضم الطلاب تلقائيًا عند البدء.",
    configHeading: "قواعد اللعبة",
    livesLabel: "الأرواح الابتدائية",
    livesHelp: "كم إجابة خاطئة أو انتهاء وقت يمكن للطالب أن ينجو منها.",
    timerLabel: "الوقت لكل حرف",
    timerHelp: (s) => `${s} ثانية لكتابة كلمة.`,
    topicLabel: "وضع الموضوع",
    topicHelp: "أضف فئة كل جولة (مثلاً F + animals → Fox).",
    powerUpsLabel: "القوى الخاصة",
    powerUpsHelp: "كل طالب يحصل على: تخطٍ واحد، نظرة واحدة، +وقت واحد.",
    suddenDeathLabel: "الموت المفاجئ في النهاية",
    suddenDeathHelp: "عند بقاء طالبين: مؤقّت 4 ثوانٍ، حروف نادرة فقط.",
    stealLabel: "سرقة روح",
    stealHelp: "أجب في أقل من ثانيتين → خذ روحًا من خصم عشوائي.",
    startButton: "ابدأ الدريدل →",
    backButton: "← رجوع",
    liveTitle: (name) => `🎲 دريدل البرق · ${name}`,
    classCodeLabel: "رمز الصف:",
    liveIndicator: "🔴 مباشر",
    reconnecting: "جارٍ إعادة الاتصال…",
    endChallenge: "إنهاء",
    phaseLobby: "في انتظار اللوبي",
    phaseLobbyHelp: "شارك رمز الصف. اضغط 'دور' عندما تكون جاهزًا.",
    phaseSpinning: "يدور…",
    phaseAnswering: "أجب الآن!",
    phaseRoundEnd: "انتهت الجولة",
    phaseFinished: "انتهت اللعبة",
    spinButton: "🎲 دوّر الدريدل",
    spinAgain: "دوّر مرة أخرى →",
    roundNumber: (n) => `الجولة ${n}`,
    topicLabelForRound: (topic) => `الموضوع: ${topic}`,
    rareLetterBadge: "نقاط مضاعفة",
    winnerOverlay: (name, word) => `${name} فاز بـ: ${word.toUpperCase()}`,
    timeUpOverlay: "⏰ انتهى الوقت — لم يجب أحد!",
    stealBadge: (victim) => `سرق روحًا من ${victim}!`,
    suddenDeathBanner: "⚔️ الموت المفاجئ — حروف نادرة، 4 ثوانٍ",
    leaderboardTitle: "اللاعبون",
    livesShort: "أرواح",
    pointsLabel: "نقاط",
    eliminatedLabel: "خارج",
    waitingForPlayers: "في انتظار انضمام الطلاب…",
    shareCode: "شارك رمز الصف للبدء.",
    endConfirmTitle: "إنهاء الدريدل؟",
    endConfirmBody: (n) => n === 1 ? "هناك طالب واحد يلعب." : `${n} طلاب يلعبون.`,
    endConfirmCancel: "المتابعة",
    endConfirmEnd: "نعم، إنهاء",
    resultsTitle: "🏆 نتائج الدريدل",
    winnerLabel: "الفائز",
    noWinnerLabel: "لا فائز — الجميع خرج",
    close: "إغلاق",
    topics: {
      animals: "حيوانات", food: "طعام", sports: "رياضة", colors: "ألوان",
      clothing: "ملابس", school: "مدرسة", verbs: "أفعال", feelings: "مشاعر",
      nature: "طبيعة", household: "منزل", jobs: "مهن", transport: "نقل",
    },
  },
  ru: {
    tileTitle: "Dreidel Blitz",
    tileSubtitle: "Spin a letter — fastest English word wins",
    lobbyTitle: "Set up Dreidel Blitz",
    lobbySubtitle: "Pick a class and tune the rules.",
    selectClassHeading: "Pick a class",
    selectClassBlurb: "Students join automatically once you start.",
    configHeading: "Game rules",
    livesLabel: "Starting lives",
    livesHelp: "How many wrong / timed-out rounds a student can survive.",
    timerLabel: "Time per letter",
    timerHelp: (s) => `${s} seconds to type a word.`,
    topicLabel: "Topic mode",
    topicHelp: "Add a category each round (e.g. F + animals → Fox).",
    powerUpsLabel: "Power-ups",
    powerUpsHelp: "Each student gets 1× Skip, 1× Peek, 1× +Time per game.",
    suddenDeathLabel: "Sudden death finale",
    suddenDeathHelp: "When 2 students remain: 4-second timer, rare letters only.",
    stealLabel: "Steal-a-life",
    stealHelp: "Answer in under 2 seconds → take a life from a random opponent.",
    startButton: "Start Dreidel →",
    backButton: "← Back",
    liveTitle: (name) => `🎲 Dreidel Blitz · ${name}`,
    classCodeLabel: "Class Code:",
    liveIndicator: "🔴 LIVE",
    reconnecting: "Reconnecting…",
    endChallenge: "End",
    phaseLobby: "Waiting in the lobby",
    phaseLobbyHelp: "Share the class code. Hit Spin when you're ready.",
    phaseSpinning: "Spinning…",
    phaseAnswering: "Answer now!",
    phaseRoundEnd: "Round over",
    phaseFinished: "Game over",
    spinButton: "🎲 Spin the Dreidel",
    spinAgain: "Spin again →",
    roundNumber: (n) => `Round ${n}`,
    topicLabelForRound: (topic) => `Topic: ${topic}`,
    rareLetterBadge: "2× POINTS",
    winnerOverlay: (name, word) => `${name} got it: ${word.toUpperCase()}`,
    timeUpOverlay: "⏰ Time's up — no one answered!",
    stealBadge: (victim) => `Stole a life from ${victim}!`,
    suddenDeathBanner: "⚔️ Sudden Death — rare letters, 4-second timer",
    leaderboardTitle: "Players",
    livesShort: "lives",
    pointsLabel: "pts",
    eliminatedLabel: "Out",
    waitingForPlayers: "Waiting for students to join…",
    shareCode: "Share the class code to start.",
    endConfirmTitle: "End the Dreidel?",
    endConfirmBody: (n) => n === 1 ? "1 student is playing." : `${n} students are playing.`,
    endConfirmCancel: "Keep going",
    endConfirmEnd: "Yes, end it",
    resultsTitle: "🏆 Dreidel Results",
    winnerLabel: "Winner",
    noWinnerLabel: "No winner — everyone fell out",
    close: "Close",
    topics: {
      animals: "Animals", food: "Food", sports: "Sports", colors: "Colors",
      clothing: "Clothing", school: "School", verbs: "Verbs", feelings: "Feelings",
      nature: "Nature", household: "Household", jobs: "Jobs", transport: "Transport",
    },
  },
};
