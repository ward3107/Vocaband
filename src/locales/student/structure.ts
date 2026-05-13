/**
 * structure.ts — i18n strings for the student dashboard's "structure"
 * system: IdentityHero, TodayStrip, ShopSquare, StructurePreviewTile,
 * StructureHero, StructureDetailModal, StructureKindPicker,
 * PartOriginSheet, MetaphorScene.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface StructureStrings {
  // IdentityHero
  identityProfileAria: string;
  identityHello: string;
  identityFriendFallback: string;
  identityXpLabel: (xp: string) => string;
  identityStreakLabel: (n: number) => string;
  identityNoStreak: string;

  // TodayStrip
  todayAria: string;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  greetingFriendFallback: string;
  todayStreakLabel: (n: number) => string;
  todayStartStreak: string;
  todayPlay: string;
  todayPractice: string;
  todayJobLead: string;
  todayJobTail: string;
  todayAllDone: string;

  // ShopSquare
  shopShop: string;
  shopSpendXp: string;
  shopCategoryLine: string;
  shopXpInWallet: (xp: string) => string;
  shopOpen: string;

  // StructurePreviewTile
  previewTileAria: (kind: string, earned: number, total: number) => string;
  previewTileYourKind: (emoji: string, kind: string) => string;
  previewTilePieces: (earned: number, total: number) => string;
  previewTileOpen: string;

  // StructureHero
  structureAria: string;
  nextPiece: string;
  /** "{label} — {origin}". */
  nextPieceLine: (label: string, origin: string) => string;
  progressLabel: string;
  greatGamesProgress: (played: number, needed: number) => string;
  greatGameDefinition: string;
  completeLabel: string;
  completeBody: (earnedCount: number) => string;

  // StructureDetailModal
  detailTitle: (kind: string) => string;
  detailClose: string;
  howPiecesUnlockTitle: string;
  unlockBullet1: string;
  unlockBullet2: string;
  unlockBullet3: string;

  // PartOriginSheet
  partEarnedTag: string;
  partLockedTag: string;
  partEarnedBecause: (origin: string, date: string | null) => string;
  partToUnlock: (origin: string) => string;
  partCloseAria: string;
  partGotIt: string;

  // StructureKindPicker
  pickerWelcome: string;
  pickerHeading: string;
  pickerBody: string;
  pickerChangeLater: string;

  // MetaphorScene
  metaphorGardenHeading: string;
  metaphorGardenSubheading: string;
  metaphorCityHeading: string;
  metaphorCitySubheading: string;
  metaphorRocketHeading: string;
  metaphorRocketSubheading: string;
  metaphorCastleHeading: string;
  metaphorCastleSubheading: string;
  metaphorSlotAria: (kind: string) => string;
  metaphorPartEarnedAria: (label: string) => string;
  metaphorPartLockedAria: (label: string) => string;
}

export const structureT: Record<Language, StructureStrings> = {
  en: {
    identityProfileAria: "Your profile",
    identityHello: "Hello,",
    identityFriendFallback: "Friend",
    identityXpLabel: (xp) => `${xp} XP`,
    identityStreakLabel: (n) => `${n}-day streak`,
    identityNoStreak: "No streak yet",
    todayAria: "Today",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    greetingFriendFallback: "friend",
    todayStreakLabel: (n) => `${n}-day streak`,
    todayStartStreak: "Start a streak",
    todayPlay: "Play",
    todayPractice: "Practice",
    todayJobLead: "Today's job:",
    todayJobTail: ". Every play grows your structure.",
    todayAllDone: "All assignments done — nice! Tap Practice to keep your streak and unlock more pieces.",
    shopShop: "Shop",
    shopSpendXp: "Spend XP",
    shopCategoryLine: "🥚 Eggs · ⚡ Power-ups · 🎭 Avatars",
    shopXpInWallet: (xp) => `${xp} XP in wallet`,
    shopOpen: "Open →",
    previewTileAria: (kind, earned, total) => `Open your ${kind} — ${earned} of ${total} pieces earned`,
    previewTileYourKind: (emoji, kind) => `${emoji} Your ${kind}`,
    previewTilePieces: (earned, total) => `${earned} / ${total} pieces`,
    previewTileOpen: "Open",
    structureAria: "Your structure",
    nextPiece: "Next piece",
    nextPieceLine: (label, origin) => `${label} — ${origin}`,
    progressLabel: "Progress",
    greatGamesProgress: (played, needed) => `${played} / ${needed} great games`,
    greatGameDefinition: 'A "great game" is any game with a score of 80 or higher.',
    completeLabel: "Complete!",
    completeBody: (n) => `You've earned every piece — ${n} in total.`,
    detailTitle: (kind) => `Your ${kind}`,
    detailClose: "Close",
    howPiecesUnlockTitle: "How pieces unlock",
    unlockBullet1: "Play a game and score 80 or higher — every 2 great games adds a piece.",
    unlockBullet2: "Score a perfect 100 — instantly unlocks a landmark piece.",
    unlockBullet3: "Keep a 7-day streak — unlocks a commitment piece.",
    partEarnedTag: "Earned",
    partLockedTag: "Locked",
    partEarnedBecause: (origin, date) => date
      ? `You earned this because ${origin} on ${date}.`
      : `You earned this because ${origin}.`,
    partToUnlock: (origin) => `To unlock: ${origin}`,
    partCloseAria: "Close",
    partGotIt: "Got it",
    pickerWelcome: "Welcome!",
    pickerHeading: "Pick what you'd like to build.",
    pickerBody: "As you master words and earn perfect scores, pieces of your creation unlock — one by one. Pick a style you'll love to see grow.",
    pickerChangeLater: "Don't worry — you can change later.",
    metaphorGardenHeading: "Your Garden",
    metaphorGardenSubheading: "A quiet field that fills as you learn",
    metaphorCityHeading: "Your City",
    metaphorCitySubheading: "A skyline you build, block by block",
    metaphorRocketHeading: "Your Rocket",
    metaphorRocketSubheading: "Every part assembles toward launch",
    metaphorCastleHeading: "Your Castle",
    metaphorCastleSubheading: "Stone by stone, raise your keep",
    metaphorSlotAria: (kind) => `Your ${kind}`,
    metaphorPartEarnedAria: (label) => `${label} — earned`,
    metaphorPartLockedAria: (label) => `${label} — locked`,
  },
  he: {
    identityProfileAria: "הפרופיל שלכם",
    identityHello: "שלום,",
    identityFriendFallback: "חבר",
    identityXpLabel: (xp) => `${xp} XP`,
    identityStreakLabel: (n) => `רצף ${n} ימים`,
    identityNoStreak: "אין עדיין רצף",
    todayAria: "היום",
    greetingMorning: "בוקר טוב",
    greetingAfternoon: "צהריים טובים",
    greetingEvening: "ערב טוב",
    greetingFriendFallback: "חבר",
    todayStreakLabel: (n) => `רצף ${n} ימים`,
    todayStartStreak: "התחילו רצף",
    todayPlay: "שחקו",
    todayPractice: "תרגלו",
    todayJobLead: "המשימה היום:",
    todayJobTail: ". כל משחק מצמיח את היצירה שלכם.",
    todayAllDone: "סיימתם את כל המטלות — יופי! הקישו על תרגול כדי לשמור על הרצף ולפתוח חלקים נוספים.",
    shopShop: "חנות",
    shopSpendXp: "השתמשו ב-XP",
    shopCategoryLine: "🥚 ביצים · ⚡ כוחות · 🎭 אווטרים",
    shopXpInWallet: (xp) => `${xp} XP בארנק`,
    shopOpen: "פתחו →",
    previewTileAria: (kind, earned, total) => `פתחו את ה${kind} שלכם — ${earned} מתוך ${total} חלקים`,
    previewTileYourKind: (emoji, kind) => `${emoji} ה${kind} שלכם`,
    previewTilePieces: (earned, total) => `${earned} / ${total} חלקים`,
    previewTileOpen: "פתחו",
    structureAria: "היצירה שלכם",
    nextPiece: "החלק הבא",
    nextPieceLine: (label, origin) => `${label} — ${origin}`,
    progressLabel: "התקדמות",
    greatGamesProgress: (played, needed) => `${played} / ${needed} משחקים מצוינים`,
    greatGameDefinition: 'משחק "מצוין" הוא משחק עם ציון 80 ומעלה.',
    completeLabel: "הושלם!",
    completeBody: (n) => `זכיתם בכל החלקים — ${n} בסך הכל.`,
    detailTitle: (kind) => `ה${kind} שלכם`,
    detailClose: "סגירה",
    howPiecesUnlockTitle: "איך פותחים חלקים",
    unlockBullet1: "שחקו וקבלו ציון 80 ומעלה — כל 2 משחקים מצוינים מוסיפים חלק.",
    unlockBullet2: "ציון 100 מושלם — פותח מיד חלק מיוחד.",
    unlockBullet3: "שמרו על רצף 7 ימים — פותח חלק של מחויבות.",
    partEarnedTag: "הושג",
    partLockedTag: "נעול",
    partEarnedBecause: (origin, date) => date
      ? `קיבלתם את זה בגלל ש${origin} בתאריך ${date}.`
      : `קיבלתם את זה בגלל ש${origin}.`,
    partToUnlock: (origin) => `לפתיחה: ${origin}`,
    partCloseAria: "סגירה",
    partGotIt: "הבנתי",
    pickerWelcome: "ברוכים הבאים!",
    pickerHeading: "בחרו מה תרצו לבנות.",
    pickerBody: "ככל שתשלטו במילים ותקבלו ציונים מושלמים, חלקים מהיצירה שלכם ייפתחו — אחד אחרי השני. בחרו סגנון שתאהבו לראות גדל.",
    pickerChangeLater: "אל תדאגו — אפשר לשנות אחר כך.",
    metaphorGardenHeading: "הגן שלכם",
    metaphorGardenSubheading: "שדה שקט שמתמלא ככל שאתם לומדים",
    metaphorCityHeading: "העיר שלכם",
    metaphorCitySubheading: "קו רקיע שאתם בונים, בלוק אחר בלוק",
    metaphorRocketHeading: "הרקטה שלכם",
    metaphorRocketSubheading: "כל חלק מתחבר לקראת השיגור",
    metaphorCastleHeading: "הטירה שלכם",
    metaphorCastleSubheading: "אבן אחר אבן, הקימו את המבצר",
    metaphorSlotAria: (kind) => `ה${kind} שלכם`,
    metaphorPartEarnedAria: (label) => `${label} — הושג`,
    metaphorPartLockedAria: (label) => `${label} — נעול`,
  },
  ar: {
    identityProfileAria: "ملفك الشخصي",
    identityHello: "مرحباً،",
    identityFriendFallback: "صديق",
    identityXpLabel: (xp) => `${xp} XP`,
    identityStreakLabel: (n) => `سلسلة ${n} أيام`,
    identityNoStreak: "لا سلسلة بعد",
    todayAria: "اليوم",
    greetingMorning: "صباح الخير",
    greetingAfternoon: "مساء الخير",
    greetingEvening: "مساء النور",
    greetingFriendFallback: "صديق",
    todayStreakLabel: (n) => `سلسلة ${n} أيام`,
    todayStartStreak: "ابدأ سلسلة",
    todayPlay: "العب",
    todayPractice: "تدرّب",
    todayJobLead: "مهمة اليوم:",
    todayJobTail: ". كل لعبة تُنمّي بناءك.",
    todayAllDone: "أنجزت كل المهام — رائع! اضغط تدرّب للحفاظ على السلسلة وفتح المزيد من القطع.",
    shopShop: "المتجر",
    shopSpendXp: "اصرف XP",
    shopCategoryLine: "🥚 بيض · ⚡ تعزيزات · 🎭 أفاتارات",
    shopXpInWallet: (xp) => `${xp} XP في المحفظة`,
    shopOpen: "افتح →",
    previewTileAria: (kind, earned, total) => `افتح ${kind}ك — ${earned} من ${total} قطع`,
    previewTileYourKind: (emoji, kind) => `${emoji} ${kind}ك`,
    previewTilePieces: (earned, total) => `${earned} / ${total} قطع`,
    previewTileOpen: "افتح",
    structureAria: "بناؤك",
    nextPiece: "القطعة التالية",
    nextPieceLine: (label, origin) => `${label} — ${origin}`,
    progressLabel: "التقدّم",
    greatGamesProgress: (played, needed) => `${played} / ${needed} ألعاب رائعة`,
    greatGameDefinition: 'اللعبة "الرائعة" هي أي لعبة بعلامة 80 أو أعلى.',
    completeLabel: "اكتمل!",
    completeBody: (n) => `حصلت على كل القطع — ${n} في المجموع.`,
    detailTitle: (kind) => `${kind}ك`,
    detailClose: "إغلاق",
    howPiecesUnlockTitle: "كيف تُفتح القطع",
    unlockBullet1: "العب لعبة واحصل على 80 أو أعلى — كل لعبتين رائعتين تضيفان قطعة.",
    unlockBullet2: "احصل على 100 — يفتح فوراً قطعة معلَم.",
    unlockBullet3: "حافظ على سلسلة 7 أيام — يفتح قطعة الالتزام.",
    partEarnedTag: "حُصِل عليها",
    partLockedTag: "مقفلة",
    partEarnedBecause: (origin, date) => date
      ? `حصلت على هذه لأن ${origin} في ${date}.`
      : `حصلت على هذه لأن ${origin}.`,
    partToUnlock: (origin) => `للفتح: ${origin}`,
    partCloseAria: "إغلاق",
    partGotIt: "فهمت",
    pickerWelcome: "أهلاً بك!",
    pickerHeading: "اختر ما تريد بناءه.",
    pickerBody: "كلما أتقنت الكلمات وحصلت على علامات كاملة، تُفتح قطع من إبداعك — واحدة تلو الأخرى. اختر نمطاً تحب رؤيته يكبر.",
    pickerChangeLater: "لا تقلق — يمكنك التغيير لاحقاً.",
    metaphorGardenHeading: "حديقتك",
    metaphorGardenSubheading: "حقل هادئ يمتلئ كلما تعلّمت",
    metaphorCityHeading: "مدينتك",
    metaphorCitySubheading: "أفق تبنيه، مبنى بعد مبنى",
    metaphorRocketHeading: "صاروخك",
    metaphorRocketSubheading: "كل قطعة تجتمع نحو الإطلاق",
    metaphorCastleHeading: "قلعتك",
    metaphorCastleSubheading: "حجرٌ بحجر، شيّد حصنك",
    metaphorSlotAria: (kind) => `${kind}ك`,
    metaphorPartEarnedAria: (label) => `${label} — حُصِل عليها`,
    metaphorPartLockedAria: (label) => `${label} — مقفلة`,
  },
};
