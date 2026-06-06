/**
 * student-dashboard.ts — i18n strings for StudentDashboardView and
 * its sub-components (StudentTopBar, StudentGreetingCard, RetentionStrip,
 * LeaderboardTeaser, etc.).
 *
 * Pattern: see docs/I18N-MIGRATION.md.  Each subcomponent imports this
 * locale file directly and looks up the strings it needs by category.
 */
import type { Language } from "../../hooks/useLanguage";

export interface StudentDashboardStrings {
  // StudentTopBar
  signOut: string;
  logout: string;

  // StudentGreetingCard
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  yourNamePlaceholder: string;
  yourDisplayName: string;
  saveName: string;
  cancel: string;
  changeDisplayName: string;
  tapToCopyClassCode: string;
  totalXp: string;

  // StudentStatsRow
  today: string;
  progress: string;
  xpEarnedToday: string;
  /** "{n}-day streak" — n>0 only.  When n=0, show startYourStreak instead. */
  dayStreak: (n: number) => string;
  startYourStreak: string;
  /** Singular vs plural words mastered ("1 word mastered", "5 words mastered").  Caller picks via n. */
  wordsMastered: (n: number) => string;
  assignmentsDone: (n: number) => string;

  // RetentionStrip
  dailyChest: string;
  claimTodaysReward: string;
  bonusXpStreakKeeper: string;
  openButton: string;
  welcomeBack: string;
  weMissedYou: string;
  claimBonusForReturning: string;
  claimButton: string;
  weeklyChallenge: string;
  welcomeBackXpBonus: (xp: number) => string;
  weeklyReadyToClaim: string;
  /** "{plays} / {target} games this week" */
  weeklyProgressText: (plays: number, target: number) => string;
  dailyChestXpToast: (xp: number) => string;
  weeklyChallengeXpToast: (xp: number) => string;
  badgeClaimXpToast: (xp: number) => string;

  // PowerUpsStrip
  yourPowerUps: string;

  // BadgesStrip
  badges: string;

  // DailyGoalBanner
  dailyGoal: string;
  /** "Play 1 game today to earn a +10 XP bonus" — XP value comes from caller. */
  playGameForBonus: (xp: number) => string;
  goalHit: string;
  /** "You did it! 🎉 +10 XP bonus" — celebration line. */
  youDidIt: (xp: number) => string;
  /** "Almost there — {n} more to go!" */
  almostThere: (remaining: number) => string;

  // LeaderboardTeaser
  classRank: string;
  topOfClass: string;
  /** "Tied with {name} — push ahead!" */
  tiedWith: (name: string) => string;
  keepClimbing: string;
  /** "{gap} XP behind {name}" */
  xpBehind: (gap: number, name: string) => string;
  seeFullLeaderboard: string;

  // PetCompanion
  openPetCompanion: string;
  close: string;
  yourCompanion: string;
  evolutionReward: string;
  petLevel: (n: number) => string;
  petNext: (emoji: string, stage: string) => string;
  petXpProgress: (current: number, target: number) => string;
  petEvolutionTip: (name: string, xpNeeded: number, reward: string) => string;
  petMaxedOut: (stage: string) => string;
  petClaim: string;

  // ActiveBoostersStrip
  boosterXpDouble: string;
  boosterWeekendXp: string;
  boosterFocusMode: string;
  boosterStreakFreeze: (n: number) => string;
  boosterLuckyCharm: (n: number) => string;
  boosterStreakFreezeName: string;
  boosterLuckyCharmName: string;
  powerUps: string;
  noActiveBoosters: string;

  // PowerUpsStrip
  powerUpSkip: string;
  powerUpFiftyFifty: string;
  powerUpRevealLetter: string;
  powerUpWithCount: (label: string, n: number) => string;

  // StudentAssignmentsList / Card
  loadingAssignments: string;
  playAgain: string;
  startAssignment: string;
  startLearning: string;
  yourAssignments: string;
  noAssignmentsYet: string;

  // NextUpCard — primary CTA above the assignments list
  nextUp: string;
  continueAction: string;

  // StudentWelcomeCard — empty-state when student has zero assignments
  welcomeEyebrow: string;
  welcomeTitle: (name: string) => string;
  welcomeSubtitle: string;

  // RewardInboxCard
  dismissReward: string;
  thanks: string;
}

export const studentDashboardT: Record<Language, StudentDashboardStrings> = {
  en: {
    signOut: "Sign out",
    logout: "Logout",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    yourNamePlaceholder: "Your name",
    yourDisplayName: "Your display name",
    saveName: "Save name",
    cancel: "Cancel",
    changeDisplayName: "Change display name",
    tapToCopyClassCode: "Tap to copy class code",
    totalXp: "Total XP",
    today: "Today",
    progress: "Progress",
    xpEarnedToday: "XP earned today",
    dayStreak: (n) => `${n}-day streak`,
    startYourStreak: "Start your streak",
    wordsMastered: (n) => n === 1 ? "word mastered" : "words mastered",
    assignmentsDone: (n) => n === 1 ? "1 assignment done" : `${n} assignments done`,
    dailyChest: "Daily chest",
    claimTodaysReward: "Claim today's reward",
    bonusXpStreakKeeper: "Bonus XP + streak keeper",
    openButton: "Open",
    welcomeBack: "Welcome back!",
    weMissedYou: "We missed you",
    claimBonusForReturning: "Claim a bonus for returning",
    claimButton: "Claim",
    weeklyChallenge: "Weekly challenge",
    welcomeBackXpBonus: (xp) => `Welcome back! +${xp} XP bonus`,
    weeklyReadyToClaim: "Ready to claim!",
    weeklyProgressText: (plays, target) => `${plays} / ${target} games this week`,
    dailyChestXpToast: (xp) =>`Daily chest: +${xp} XP`,
    weeklyChallengeXpToast: (xp) => `Weekly challenge complete! +${xp} XP`,
    badgeClaimXpToast: (xp) => `Badge reward claimed! +${xp} XP`,
    yourPowerUps: "Your power-ups",
    badges: "Badges",
    dailyGoal: "Daily goal",
    playGameForBonus: (xp) => `Play 1 game today to earn a +${xp} XP bonus`,
    goalHit: "Goal hit!",
    youDidIt: (xp) => `You did it! 🎉 +${xp} XP bonus`,
    almostThere: (n) => `Almost there — ${n} more to go!`,
    classRank: "Class rank",
    topOfClass: "You're #1 in your class! 👑",
    tiedWith: (name) => `Tied with ${name} — push ahead!`,
    keepClimbing: "Keep earning XP to climb the class rank!",
    xpBehind: (gap, name) => `${gap} XP behind ${name}`,
    seeFullLeaderboard: "See full leaderboard",
    openPetCompanion: "Open pet companion",
    close: "Close",
    yourCompanion: "Your companion",
    evolutionReward: "Evolution reward",
    petLevel: (n) => `Level ${n}`,
    petNext: (emoji, stage) => `Next: ${emoji} ${stage}`,
    petXpProgress: (current, target) => `${current} / ${target} XP`,
    petEvolutionTip: (name, xpNeeded, reward) => `${name}, earn ${xpNeeded} more XP — next unlock: ${reward}`,
    petMaxedOut: (stage) => `Maxed out! You and ${stage} are unstoppable.`,
    petClaim: "Claim",
    boosterXpDouble: "2× XP",
    boosterWeekendXp: "Weekend 2× XP",
    boosterFocusMode: "Focus mode",
    boosterStreakFreeze: (n) => `Streak Freeze ×${n}`,
    boosterLuckyCharm: (n) => `Lucky Charm ×${n}`,
    boosterStreakFreezeName: "Streak Freeze",
    boosterLuckyCharmName: "Lucky Charm",
    powerUps: "Power-ups",
    noActiveBoosters: "No active power-ups",
    powerUpSkip: "Skip",
    powerUpFiftyFifty: "50/50",
    powerUpRevealLetter: "Reveal Letter",
    powerUpWithCount: (label, n) => `${label} ×${n}`,
    loadingAssignments: "Loading your assignments...",
    playAgain: "Play again",
    startAssignment: "Start",
    startLearning: "Start learning",
    yourAssignments: "Your Assignments",
    noAssignmentsYet: "No assignments yet. Check back later!",
    nextUp: "Next up",
    continueAction: "Continue",
    welcomeEyebrow: "Welcome aboard",
    welcomeTitle: (name) => `Hi ${name}! 👋`,
    welcomeSubtitle: "Your teacher hasn't shared an assignment yet — they'll show up here when they do. In the meantime, try the practice tiles below to start earning XP.",
    dismissReward: "Dismiss reward",
    thanks: "Thanks!",
  },
  he: {
    signOut: "התנתקות",
    logout: "התנתקות",
    greetingMorning: "בוקר טוב",
    greetingAfternoon: "צהריים טובים",
    greetingEvening: "ערב טוב",
    yourNamePlaceholder: "השם שלך",
    yourDisplayName: "שם התצוגה שלך",
    saveName: "שמור שם",
    cancel: "ביטול",
    changeDisplayName: "שנה שם תצוגה",
    tapToCopyClassCode: "הקש להעתקת קוד הכיתה",
    totalXp: "XP כולל",
    today: "היום",
    progress: "התקדמות",
    xpEarnedToday: "XP שצברת היום",
    dayStreak: (n) => `רצף של ${n} ימים`,
    startYourStreak: "התחל רצף",
    wordsMastered: (n) => n === 1 ? "מילה שנלמדה" : "מילים שנלמדו",
    assignmentsDone: (n) => n === 1 ? "1 מטלה הושלמה" : `${n} מטלות הושלמו`,
    dailyChest: "תיבה יומית",
    claimTodaysReward: "קבל את הפרס של היום",
    bonusXpStreakKeeper: "בונוס XP + שומר רצף",
    openButton: "פתח",
    welcomeBack: "ברוך שובך!",
    weMissedYou: "התגעגענו אליך",
    claimBonusForReturning: "קבל בונוס על שובך",
    claimButton: "קבל",
    weeklyChallenge: "אתגר שבועי",
    welcomeBackXpBonus: (xp) => `ברוך שובך! בונוס +${xp} XP`,
    weeklyReadyToClaim: "מוכן לאיסוף!",
    weeklyProgressText: (plays, target) => `${plays} / ${target} משחקים השבוע`,
    dailyChestXpToast: (xp) => `תיבה יומית: +${xp} XP`,
    weeklyChallengeXpToast: (xp) => `אתגר שבועי הושלם! +${xp} XP`,
    badgeClaimXpToast: (xp) => `תגמול תג נאסף! +${xp} XP`,
    yourPowerUps: "הכוחות שלך",
    badges: "תגים",
    dailyGoal: "יעד יומי",
    playGameForBonus: (xp) => `שחק משחק אחד היום וקבל בונוס +${xp} XP`,
    goalHit: "השגת את היעד!",
    youDidIt: (xp) => `הצלחת! 🎉 בונוס +${xp} XP`,
    almostThere: (n) => `כמעט שם — נשארו ${n}!`,
    classRank: "דירוג בכיתה",
    topOfClass: "אתה מספר 1 בכיתה! 👑",
    tiedWith: (name) => `שוויון עם ${name} — דחוף קדימה!`,
    keepClimbing: "המשך לצבור XP כדי לטפס בדירוג!",
    xpBehind: (gap, name) => `${gap} XP מאחורי ${name}`,
    seeFullLeaderboard: "צפה בדירוג המלא",
    openPetCompanion: "פתח את חבר החיה",
    close: "סגור",
    yourCompanion: "החבר שלך",
    evolutionReward: "פרס אבולוציה",
    petLevel: (n) => `דרגה ${n}`,
    petNext: (emoji, stage) => `הבא: ${emoji} ${stage}`,
    petXpProgress: (current, target) => `${current} / ${target} XP`,
    petEvolutionTip: (name, xpNeeded, reward) => `${name}, צברו עוד ${xpNeeded} XP — הפתיחה הבאה: ${reward}`,
    petMaxedOut: (stage) => `הגעתם למקסימום! אתם ו-${stage} בלתי ניתנים לעצירה.`,
    petClaim: "אסוף",
    boosterXpDouble: "פי 2 XP",
    boosterWeekendXp: "סוף שבוע פי 2 XP",
    boosterFocusMode: "מצב ריכוז",
    boosterStreakFreeze: (n) => `הקפאת רצף ×${n}`,
    boosterLuckyCharm: (n) => `קמע מזל ×${n}`,
    boosterStreakFreezeName: "הקפאת רצף",
    boosterLuckyCharmName: "קמע מזל",
    powerUps: "כוח-על",
    noActiveBoosters: "אין חיזוקים פעילים",
    powerUpSkip: "דלג",
    powerUpFiftyFifty: "50/50",
    powerUpRevealLetter: "חשוף אות",
    powerUpWithCount: (label, n) => `${label} ×${n}`,
    loadingAssignments: "טוען את המטלות שלך...",
    playAgain: "שחק שוב",
    startAssignment: "התחל",
    startLearning: "התחל ללמוד",
    yourAssignments: "המטלות שלך",
    noAssignmentsYet: "אין מטלות עדיין. חזור מאוחר יותר!",
    nextUp: "הבא בתור",
    continueAction: "המשך",
    welcomeEyebrow: "ברוכים הבאים",
    welcomeTitle: (name) => `שלום ${name}! 👋`,
    welcomeSubtitle: "המורה שלך עדיין לא שיתף מטלה — היא תופיע כאן כשהיא תיווצר. בינתיים, נסה את כרטיסיות התרגול למטה כדי להתחיל לצבור XP.",
    dismissReward: "בטל פרס",
    thanks: "תודה!",
  },
  ar: {
    signOut: "تسجيل الخروج",
    logout: "خروج",
    greetingMorning: "صباح الخير",
    greetingAfternoon: "مساء الخير",
    greetingEvening: "مساء الخير",
    yourNamePlaceholder: "اسمك",
    yourDisplayName: "اسم العرض الخاص بك",
    saveName: "حفظ الاسم",
    cancel: "إلغاء",
    changeDisplayName: "تغيير اسم العرض",
    tapToCopyClassCode: "اضغط لنسخ رمز الصف",
    totalXp: "إجمالي XP",
    today: "اليوم",
    progress: "التقدم",
    xpEarnedToday: "XP المكتسبة اليوم",
    dayStreak: (n) => `سلسلة ${n} أيام`,
    startYourStreak: "ابدأ سلسلتك",
    wordsMastered: (n) => n === 1 ? "كلمة محفوظة" : "كلمات محفوظة",
    assignmentsDone: (n) => n === 1 ? "اكتملت مهمة واحدة" : `${n} مهام مكتملة`,
    dailyChest: "صندوق يومي",
    claimTodaysReward: "احصل على مكافأة اليوم",
    bonusXpStreakKeeper: "مكافأة XP + حافظ السلسلة",
    openButton: "افتح",
    welcomeBack: "مرحباً بعودتك!",
    weMissedYou: "اشتقنا إليك",
    claimBonusForReturning: "احصل على مكافأة للعودة",
    claimButton: "احصل",
    weeklyChallenge: "تحدي أسبوعي",
    welcomeBackXpBonus: (xp) => `مرحباً بعودتك! مكافأة +${xp} XP`,
    weeklyReadyToClaim: "جاهز للاستلام!",
    weeklyProgressText: (plays, target) => `${plays} / ${target} ألعاب هذا الأسبوع`,
    dailyChestXpToast: (xp) => `صندوق يومي: +${xp} XP`,
    weeklyChallengeXpToast: (xp) => `اكتمل التحدي الأسبوعي! +${xp} XP`,
    badgeClaimXpToast: (xp) => `تم استلام مكافأة الشارة! +${xp} XP`,
    yourPowerUps: "قواك",
    badges: "الشارات",
    dailyGoal: "الهدف اليومي",
    playGameForBonus: (xp) => `العب لعبة واحدة اليوم لكسب مكافأة +${xp} XP`,
    goalHit: "تم تحقيق الهدف!",
    youDidIt: (xp) => `أحسنت! 🎉 مكافأة +${xp} XP`,
    almostThere: (n) => `قريباً — تبقى ${n}!`,
    classRank: "ترتيب الصف",
    topOfClass: "أنت رقم 1 في صفك! 👑",
    tiedWith: (name) => `متعادل مع ${name} — اندفع للأمام!`,
    keepClimbing: "استمر في كسب XP للصعود في ترتيب الصف!",
    xpBehind: (gap, name) => `${gap} XP خلف ${name}`,
    seeFullLeaderboard: "عرض الترتيب الكامل",
    openPetCompanion: "افتح رفيق الحيوان",
    close: "إغلاق",
    yourCompanion: "رفيقك",
    evolutionReward: "مكافأة التطور",
    petLevel: (n) => `المستوى ${n}`,
    petNext: (emoji, stage) => `التالي: ${emoji} ${stage}`,
    petXpProgress: (current, target) => `${current} / ${target} XP`,
    petEvolutionTip: (name, xpNeeded, reward) => `${name}، اكسب ${xpNeeded} XP إضافية — الفتح القادم: ${reward}`,
    petMaxedOut: (stage) => `وصلت إلى الحد الأقصى! أنت و${stage} لا يمكن إيقافكما.`,
    petClaim: "احصل",
    boosterXpDouble: "×2 XP",
    boosterWeekendXp: "عطلة الأسبوع ×2 XP",
    boosterFocusMode: "وضع التركيز",
    boosterStreakFreeze: (n) => `تجميد السلسلة ×${n}`,
    boosterLuckyCharm: (n) => `تعويذة الحظ ×${n}`,
    boosterStreakFreezeName: "تجميد السلسلة",
    boosterLuckyCharmName: "تعويذة الحظ",
    powerUps: "تعزيزات",
    noActiveBoosters: "لا توجد تعزيزات نشطة",
    powerUpSkip: "تخطّي",
    powerUpFiftyFifty: "50/50",
    powerUpRevealLetter: "كشف حرف",
    powerUpWithCount: (label, n) => `${label} ×${n}`,
    loadingAssignments: "جاري تحميل المهام...",
    playAgain: "العب مرة أخرى",
    startAssignment: "ابدأ",
    startLearning: "ابدأ التعلم",
    yourAssignments: "مهامك",
    noAssignmentsYet: "لا توجد مهام بعد. عد لاحقاً!",
    nextUp: "التالي",
    continueAction: "متابعة",
    welcomeEyebrow: "أهلاً بك",
    welcomeTitle: (name) => `أهلاً ${name}! 👋`,
    welcomeSubtitle: "لم يشارك معلمك مهمة بعد — ستظهر هنا عندما يضيفها. في هذه الأثناء، جرّب بطاقات التدريب أدناه لتبدأ بكسب XP.",
    dismissReward: "تجاهل المكافأة",
    thanks: "شكراً!",
  },
  ru: {
    signOut: "Sign out",
    logout: "Logout",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    yourNamePlaceholder: "Your name",
    yourDisplayName: "Your display name",
    saveName: "Save name",
    cancel: "Cancel",
    changeDisplayName: "Change display name",
    tapToCopyClassCode: "Tap to copy class code",
    totalXp: "Total XP",
    today: "Today",
    progress: "Progress",
    xpEarnedToday: "XP earned today",
    dayStreak: (n) => `${n}-day streak`,
    startYourStreak: "Start your streak",
    wordsMastered: (n) => n === 1 ? "word mastered" : "words mastered",
    assignmentsDone: (n) => n === 1 ? "1 assignment done" : `${n} assignments done`,
    dailyChest: "Daily chest",
    claimTodaysReward: "Claim today's reward",
    bonusXpStreakKeeper: "Bonus XP + streak keeper",
    openButton: "Open",
    welcomeBack: "Welcome back!",
    weMissedYou: "We missed you",
    claimBonusForReturning: "Claim a bonus for returning",
    claimButton: "Claim",
    weeklyChallenge: "Weekly challenge",
    welcomeBackXpBonus: (xp) => `Welcome back! +${xp} XP bonus`,
    weeklyReadyToClaim: "Ready to claim!",
    weeklyProgressText: (plays, target) => `${plays} / ${target} games this week`,
    dailyChestXpToast: (xp) =>`Daily chest: +${xp} XP`,
    weeklyChallengeXpToast: (xp) => `Weekly challenge complete! +${xp} XP`,
    badgeClaimXpToast: (xp) => `Badge reward claimed! +${xp} XP`,
    yourPowerUps: "Your power-ups",
    badges: "Badges",
    dailyGoal: "Daily goal",
    playGameForBonus: (xp) => `Play 1 game today to earn a +${xp} XP bonus`,
    goalHit: "Goal hit!",
    youDidIt: (xp) => `You did it! 🎉 +${xp} XP bonus`,
    almostThere: (n) => `Almost there — ${n} more to go!`,
    classRank: "Class rank",
    topOfClass: "You're #1 in your class! 👑",
    tiedWith: (name) => `Tied with ${name} — push ahead!`,
    keepClimbing: "Keep earning XP to climb the class rank!",
    xpBehind: (gap, name) => `${gap} XP behind ${name}`,
    seeFullLeaderboard: "See full leaderboard",
    openPetCompanion: "Open pet companion",
    close: "Close",
    yourCompanion: "Your companion",
    evolutionReward: "Evolution reward",
    petLevel: (n) => `Level ${n}`,
    petNext: (emoji, stage) => `Next: ${emoji} ${stage}`,
    petXpProgress: (current, target) => `${current} / ${target} XP`,
    petEvolutionTip: (name, xpNeeded, reward) => `${name}, earn ${xpNeeded} more XP — next unlock: ${reward}`,
    petMaxedOut: (stage) => `Maxed out! You and ${stage} are unstoppable.`,
    petClaim: "Claim",
    boosterXpDouble: "2× XP",
    boosterWeekendXp: "Weekend 2× XP",
    boosterFocusMode: "Focus mode",
    boosterStreakFreeze: (n) => `Streak Freeze ×${n}`,
    boosterLuckyCharm: (n) => `Lucky Charm ×${n}`,
    boosterStreakFreezeName: "Streak Freeze",
    boosterLuckyCharmName: "Lucky Charm",
    powerUps: "Power-ups",
    noActiveBoosters: "No active power-ups",
    powerUpSkip: "Skip",
    powerUpFiftyFifty: "50/50",
    powerUpRevealLetter: "Reveal Letter",
    powerUpWithCount: (label, n) => `${label} ×${n}`,
    loadingAssignments: "Loading your assignments...",
    playAgain: "Play again",
    startAssignment: "Start",
    startLearning: "Start learning",
    yourAssignments: "Your Assignments",
    noAssignmentsYet: "No assignments yet. Check back later!",
    nextUp: "Next up",
    continueAction: "Continue",
    welcomeEyebrow: "Welcome aboard",
    welcomeTitle: (name) => `Hi ${name}! 👋`,
    welcomeSubtitle: "Your teacher hasn't shared an assignment yet — they'll show up here when they do. In the meantime, try the practice tiles below to start earning XP.",
    dismissReward: "Dismiss reward",
    thanks: "Thanks!",
  },
};

// Encouragement lines the dashboard pet speaks idly, keyed by evolution
// stage so it gets "smarter" as it grows. EN ships 6+ per stage; HE/AR/RU
// start at 4 each (top up later). Stage keys match CharacterStage's.
export type PetStageKey =
  | "egg" | "hatchling" | "fox" | "eagle"
  | "dragon" | "unicorn" | "mythic" | "ascended";

export const petLines: Record<Language, Record<PetStageKey, string[]>> = {
  en: {
    egg: ["Almost ready to hatch!", "I can feel something stirring...", "Play more — I'll grow!", "Are you there?", "Crack, crack!", "Soon, soon..."],
    hatchling: ["I just hatched — let's learn!", "New words, please!", "Peep peep! Quiz time?", "I'm tiny but eager!", "Teach me something!", "One more round?"],
    fox: ["Let's pounce on a quiz!", "I'm getting fast!", "More words!", "Sly and ready!", "Quick — another one!", "I love a good streak!"],
    eagle: ["Let's soar through these!", "I see the answer from up here!", "Sharp eyes, sharp mind!", "Aim high today!", "Catch the next word!", "Nothing escapes us!"],
    dragon: ["Let's blaze through this!", "Feel the fire — keep going!", "Mighty words, mighty you!", "I'm warmed up — are you?", "Breathe fire on that quiz!", "Legendary effort!"],
    unicorn: ["A little magic in every word!", "You're sparkling today!", "Believe — then answer!", "Rare and brilliant, like you!", "Let's make it magical!", "Dream big, learn bigger!"],
    mythic: ["Few reach this far — well done!", "Ancient words await!", "Your mind is a marvel!", "Mythic focus — let's go!", "Beyond ordinary, that's us!", "The legends speak of you!"],
    ascended: ["You've transcended — keep climbing!", "Pure brilliance!", "The peak is just the start!", "Limitless, like your learning!", "Radiate that knowledge!", "Unstoppable!"],
  },
  he: {
    egg: ["כמעט מוכן לבקוע!", "משהו מתעורר בפנים...", "שחק עוד ואגדל!", "אתה שם?"],
    hatchling: ["בקעתי! בוא נלמד!", "עוד מילים בבקשה!", "פיפ! זמן חידון?", "קטן אבל נלהב!"],
    fox: ["בוא נזנק לחידון!", "אני נעשה מהיר!", "עוד מילים!", "ערמומי ומוכן!"],
    eagle: ["בוא נמריא דרכן!", "אני רואה הכול מלמעלה!", "עין חדה, מוח חד!", "תכוון גבוה!"],
    dragon: ["בוא נבעיר את זה!", "תרגיש את האש — תמשיך!", "מילים אדירות, אתה אדיר!", "אני מחומם — ואתה?"],
    unicorn: ["קצת קסם בכל מילה!", "אתה נוצץ היום!", "תאמין — ואז תענה!", "נדיר ומבריק, כמוך!"],
    mythic: ["מעטים מגיעים לכאן — כל הכבוד!", "מילים עתיקות מחכות!", "המוח שלך פלא!", "ריכוז מיתי — קדימה!"],
    ascended: ["התעלית — תמשיך לטפס!", "מבריק לחלוטין!", "הפסגה היא רק ההתחלה!", "ללא גבולות!"],
  },
  ar: {
    egg: ["جاهز تقريبًا للفقس!", "أشعر بشيء يتحرك...", "العب أكثر لأكبر!", "هل أنت هناك؟"],
    hatchling: ["لقد فقست! لنتعلم!", "كلمات جديدة من فضلك!", "وقت الاختبار؟", "صغير لكن متحمس!"],
    fox: ["لننقضّ على اختبار!", "أصبح سريعًا!", "المزيد من الكلمات!", "ماكر وجاهز!"],
    eagle: ["لنحلّق عبرها!", "أرى الإجابة من الأعلى!", "عين حادة، عقل حاد!", "صوّب عاليًا!"],
    dragon: ["لنشعلها!", "اشعر بالنار وواصل!", "كلمات عظيمة، وأنت عظيم!", "أنا متحمّس، وأنت؟"],
    unicorn: ["سحر في كل كلمة!", "أنت متألق اليوم!", "آمن ثم أجب!", "نادر ولامع مثلك!"],
    mythic: ["قلة تصل إلى هنا — أحسنت!", "كلمات قديمة تنتظر!", "عقلك أعجوبة!", "تركيز أسطوري — هيا!"],
    ascended: ["لقد تساميت — واصل الصعود!", "تألق خالص!", "القمة مجرد البداية!", "بلا حدود!"],
  },
  ru: {
    egg: ["Почти готов вылупиться!", "Что-то шевелится внутри...", "Играй больше — я вырасту!", "Ты здесь?"],
    hatchling: ["Я вылупился! Давай учиться!", "Больше слов, пожалуйста!", "Время викторины?", "Маленький, но рвусь в бой!"],
    fox: ["Прыгнем в викторину!", "Я становлюсь быстрым!", "Ещё слова!", "Хитрый и готов!"],
    eagle: ["Взлетим над ними!", "Я вижу ответ свысока!", "Острый глаз, острый ум!", "Целься выше!"],
    dragon: ["Прожжём это насквозь!", "Почувствуй огонь — вперёд!", "Великие слова, великий ты!", "Я разогрелся, а ты?"],
    unicorn: ["Немного магии в каждом слове!", "Ты сегодня сияешь!", "Поверь — и отвечай!", "Редкий и блестящий, как ты!"],
    mythic: ["Немногие дошли — молодец!", "Древние слова ждут!", "Твой ум — чудо!", "Мифическая концентрация — вперёд!"],
    ascended: ["Ты превзошёл себя — продолжай!", "Чистый блеск!", "Вершина — только начало!", "Безграничен!"],
  },
};
