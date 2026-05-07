/**
 * Locale file for the public landing page (vocaband.com root) and
 * the public-nav chrome shared across all logged-out surfaces.
 *
 * Coverage includes:
 *   - Hero headline + subtitle + primary CTAs
 *   - Floating-card labels in the hero
 *   - Social proof line
 *   - Section H2 headings + section subtitles
 *   - Feature card titles and descriptions (student + teacher features)
 *   - Curriculum section content
 *   - Voca Family roadmap tags
 *   - Final CTA + its supporting copy
 *   - PublicNav chrome (Try Demo button + CEFR badge)
 *   - Footer content
 */
import type { Language } from "../../hooks/useLanguage";

export interface LandingPageT {
  // ─── Public nav chrome ──────────────────────────────────────────
  navTryDemo: string;
  navTryDemoShort: string;
  navCefrBadge: string;

  // ─── Hero ───────────────────────────────────────────────────────
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroCtaStart: string;
  heroCtaTeacher: string;
  heroPlayItWord: string;
  heroLearnItWord: string;
  heroTrustCurriculum: string;
  heroTrustTrilingual: string;
  heroTrustEu: string;
  heroTrustOrigin: string;

  // ─── Floating hero cards ────────────────────────────────────────
  floatingCardModes: string;
  floatingCardXp: string;
  floatingCardStreaks: string;
  floatingCardEggs: string;

  // ─── Section: Why Students Love Vocaband ───────────────────────
  studentsSectionH2: string;
  studentsSectionSubtitle: string;

  // ─── Student Feature Cards ──────────────────────────────────────
  // 11 Game Modes
  gameModesTitle: string;
  gameModesDesc: string;
  modeNames: {
    classic: string;
    listen: string;
    spell: string;
    match: string;
    tf: string;
    flash: string;
    scramble: string;
    reverse: string;
    letters: string;
    sentence: string;
    fillBlank: string;
  };

  // Live Challenges
  liveChallengesTitle: string;
  liveChallengesDesc: string;

  // XP Shop
  xpShopTitle: string;
  xpShopDesc: string;

  // Mystery Eggs
  mysteryEggsTitle: string;
  mysteryEggsDesc: string;

  // Power Boosters
  powerBoostersTitle: string;
  powerBoostersDesc: string;

  // Pet Friends
  petFriendsTitle: string;
  petFriendsDesc: string;

  // Daily Streaks
  dailyStreaksTitle: string;
  dailyStreaksDesc: string;

  // ─── Section: The Easiest Tool You'll Use All Year (teachers) ──
  teachersSectionPill: string;
  teachersSectionH2: string;
  teachersSectionSubtitle: string;

  // ─── Teacher Feature Cards ─────────────────────────────────────
  autoGradingTitle: string;
  autoGradingDesc: string;

  useYourOwnWordsTitle: string;
  useYourOwnWordsDesc: string;

  spotStrugglingTitle: string;
  spotStrugglingDesc: string;

  quickSetupTitle: string;
  quickSetupDesc: string;

  studentEngagementTitle: string;
  studentEngagementDesc: string;

  aiSentenceBuilderTitle: string;
  aiSentenceBuilderDesc: string;

  snapWordlistTitle: string;
  snapWordlistDesc: string;

  quickPlayTitle: string;
  quickPlayDesc: string;
  quickPlayScanPlay: string;

  hebrewArabicTitle: string;
  hebrewArabicDesc: string;

  // ─── Section: Curriculum (Sets 1/2/3) ──────────────────────────
  curriculumSectionH2: string;
  curriculumSectionSubtitle: string;
  curriculumProgress: string;

  set1Title: string;
  set1Desc: string;
  set1Words: string;

  set2Title: string;
  set2Desc: string;
  set2Words: string;

  set3Title: string;
  set3Desc: string;
  set3Words: string;

  // ─── Section: The Voca Family (roadmap) ────────────────────────
  vocaFamilyPill: string;
  vocaFamilyH2: string;
  vocaFamilySubtitle: string;
  vocaFamilyComingSoon: string;
  vocaFamilyRequestLine: string;
  vocaFamilyRequestCta: string;

  vocaHistoryName: string;
  vocaHistoryTag: string;
  vocaScienceName: string;
  vocaScienceTag: string;
  vocaHebrewName: string;
  vocaHebrewTag: string;
  vocaArabicName: string;
  vocaArabicTag: string;
  vocaMathName: string;
  vocaMathTag: string;

  // ─── Final CTA section ─────────────────────────────────────────
  finalCtaH2Line1: string;
  finalCtaH2Line2: string;
  finalCtaSubtitle: string;
  finalCtaStart: string;
  finalCtaTeacher: string;

  // ─── Section: AI Does the Heavy Lifting ─────────────────────────
  aiSectionH2: string;
  aiSectionSubtitle: string;
  aiZeroWork: string;
  aiZeroWorkDesc: string;
  aiAutoSentences: string;
  aiAutoSentencesDesc: string;
  aiAutoGrading: string;
  aiAutoGradingDesc: string;
  aiJustAssign: string;

  // ─── Pricing section ────────────────────────────────────────────
  // Individual prices are public.  Schools intentionally have no
  // visible price — they open the inquiry modal instead.  Per
  // docs/PRICING-MODEL.md.
  pricingTitle: string;
  pricingSubtitle: string;

  pricingFreeName: string;
  pricingFreeTagline: string;
  pricingFreePrice: string;
  pricingFreePriceSuffix: string;
  pricingFreeFeature1: string;
  pricingFreeFeature2: string;
  pricingFreeFeature3: string;
  pricingFreeFeature4: string;
  pricingFreeFeature5: string;
  pricingFreeCta: string;

  pricingProBadge: string;
  pricingProName: string;
  pricingProTagline: string;
  pricingProPrice: string;
  pricingProPriceSuffix: string;
  pricingProPriceAlt: string;
  pricingProTrialNote: string;
  pricingProFeature1: string;
  pricingProFeature2: string;
  pricingProFeature3: string;
  pricingProFeature4: string;
  pricingProFeature5: string;
  pricingProFeature6: string;
  pricingProFeature7: string;
  pricingProCta: string;

  pricingSchoolName: string;
  pricingSchoolTagline: string;
  pricingSchoolPrice: string;
  pricingSchoolPriceNote: string;
  pricingSchoolFeature1: string;
  pricingSchoolFeature2: string;
  pricingSchoolFeature3: string;
  pricingSchoolFeature4: string;
  pricingSchoolFeature5: string;
  pricingSchoolFeature6: string;
  pricingSchoolFeature7: string;
  pricingSchoolCta: string;

  // ─── Footer ─────────────────────────────────────────────────────
  footerTagline: string;
  footerSchoolPlans: string;
  footerIndividualTeacher: string;
  footerProduct: string;
  footerResources: string;
  footerLegal: string;
  footerStartLearning: string;
  footerTryDemo: string;
  footerTeacherLogin: string;
  footerCefrVocab: string;
  footerCefrExplained: string;
  footerBestEsl: string;
  footerTerms: string;
  footerPrivacy: string;
  footerSecurity: string;
  footerAccessibility: string;
  footerFaq: string;
  footerContact: string;
  footerTeacherInquiry: string;
  footerFeatureRequest: string;
  footerFreeResources: string;
  footerStatus: string;
  footerCopyright: (year: number) => string;
}

export const landingPageT: Record<Language, LandingPageT> = {
  en: {
    navTryDemo: "PLAY NOW",
    navTryDemoShort: "PLAY",
    navCefrBadge: "CEFR A1–B2",

    heroTitleLine1: "Level Up",
    heroTitleLine2: "Your Vocabulary",
    heroSubtitle:
      "The vocabulary game students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    heroCtaStart: "Start Learning",
    heroCtaTeacher: "Teacher Login",
    heroPlayItWord: "Play it",
    heroLearnItWord: "Learn it",
    heroTrustCurriculum: "MoE-Aligned Curriculum",
    heroTrustTrilingual: "Hebrew · Arabic · English",
    heroTrustEu: "EU-Hosted · GDPR",
    heroTrustOrigin: "Built in Israel",

    floatingCardModes: "🎮 11 Game Modes",
    floatingCardXp: "⭐ Earn XP",
    floatingCardStreaks: "🔥 Daily Streaks",
    floatingCardEggs: "🎁 Daily Chests",

    studentsSectionH2: "Why Students Love Vocaband",
    studentsSectionSubtitle: "Everything you need to master vocabulary, gamified.",

    // Student Features
    gameModesTitle: "11 Game Modes",
    gameModesDesc: "From Classic to Sentence Builder — every mode teaches differently. Find your favorite!",
    modeNames: {
      classic: "Classic",
      listen: "Listen",
      spell: "Spell",
      match: "Match",
      tf: "T/F",
      flash: "Flash",
      scramble: "Scramble",
      reverse: "Reverse",
      letters: "Letters",
      sentence: "Sentence",
      fillBlank: "Fill Blank",
    },
    liveChallengesTitle: "Live Challenges",
    liveChallengesDesc: "Battle classmates in real-time podiums!",
    xpShopTitle: "XP Shop",
    xpShopDesc: "Earn XP, spend on avatars, frames & power-ups!",
    mysteryEggsTitle: "Daily Chests",
    mysteryEggsDesc: "Open chests to unlock legendary avatars!",
    powerBoostersTitle: "Power Boosters",
    powerBoostersDesc: "XP multipliers, streak freeze & more!",
    petFriendsTitle: "Pet Friends",
    petFriendsDesc: "Unlock cute pets that cheer you on!",
    dailyStreaksTitle: "Daily Streaks",
    dailyStreaksDesc: "Keep the flame burning! Earn rewards.",

    // Teacher Section
    teachersSectionPill: "For Teachers",
    teachersSectionH2: "The Easiest Tool You'll Use All Year",
    teachersSectionSubtitle:
      "Zero prep, zero paperwork, zero learning curve. Teach more, click less.",

    // Teacher Features
    autoGradingTitle: "Auto-Grading",
    autoGradingDesc: "Every practice session graded instantly. No worksheets to collect, no stacks to review. Focus on teaching, not paperwork.",
    useYourOwnWordsTitle: "Use Your Own Words",
    useYourOwnWordsDesc: "Upload your custom vocabulary lists. Assign any words you need.",
    spotStrugglingTitle: "Spot Who's Struggling",
    spotStrugglingDesc: "Real-time analytics show exactly who needs help — before the test.",
    quickSetupTitle: "Setup in 30 Seconds",
    quickSetupDesc: "Create class → Share code → Students join. That's it.",
    studentEngagementTitle: "They Actually Want to Practice",
    studentEngagementDesc: "Game modes, XP, streaks — students voluntarily study at home.",
    aiSentenceBuilderTitle: "AI Sentence Builder",
    aiSentenceBuilderDesc: "One click, 10 example sentences per word — at the right level for your grade.",
    snapWordlistTitle: "Snap a Wordlist",
    snapWordlistDesc: "Take a photo of any printed list — handwriting, textbook page, board — words extracted in seconds.",
    quickPlayTitle: "Quick Play — No-Signup Live Game",
    quickPlayDesc: "Project a QR on the board, students join with their phones — no accounts, no class code typing, no setup. Live podium, real-time scores, ready in 10 seconds.",
    quickPlayScanPlay: "scan & play",
    hebrewArabicTitle: "Hebrew + Arabic, built in",
    hebrewArabicDesc: "Every word ships with native Hebrew AND Arabic translations — no second app, no copy-paste. RTL layouts handled automatically. More languages on the roadmap.",

    // Curriculum
    curriculumSectionH2: "Your Journey to Mastery",
    curriculumSectionSubtitle:
      "Aligned with CEFR A1 to B2 — three comprehensive vocabulary sets covering 6,500+ words.",
    curriculumProgress: "Progress",
    set1Title: "Set 1 — Foundation",
    set1Desc: "Beginner vocabulary",
    set1Words: "~2000 words",
    set2Title: "Set 2 — Intermediate",
    set2Desc: "Building complexity",
    set2Words: "~2500 words",
    set3Title: "Set 3 — Academic",
    set3Desc: "Advanced mastery",
    set3Words: "~3000 words",

    // Voca Family
    vocaFamilyPill: "Coming Soon",
    vocaFamilyH2: "The Voca Family",
    vocaFamilySubtitle:
      "We're starting with English vocabulary — but the same gameplay engine teaches anything. Subjects on the roadmap, by teacher demand:",
    vocaFamilyComingSoon: "Soon",
    vocaFamilyRequestLine: "Teach a different subject? Tell us which Voca to build next:",
    vocaFamilyRequestCta: "Request a subject",
    vocaHistoryName: "VocaHistory",
    vocaHistoryTag: "Dates · figures · events",
    vocaScienceName: "VocaScience",
    vocaScienceTag: "Terms · concepts · diagrams",
    vocaHebrewName: "VocaHebrew",
    vocaHebrewTag: "Hebrew vocabulary",
    vocaArabicName: "VocaArabic",
    vocaArabicTag: "Arabic vocabulary",
    vocaMathName: "VocaMath",
    vocaMathTag: "Definitions · formulas",

    // Final CTA
    finalCtaH2Line1: "Ready to Become a",
    finalCtaH2Line2: "Vocabulary Legend?",
    finalCtaSubtitle:
      "Join thousands of students leveling up their English — one word at a time.",
    finalCtaStart: "Start Learning Free",
    finalCtaTeacher: "Teacher Login",

    // AI Does the Heavy Lifting
    aiSectionH2: "AI Does All the Work",
    aiSectionSubtitle: "You focus on teaching. AI handles the rest.",
    aiZeroWork: "⚡ Zero Prep Work",
    aiZeroWorkDesc: "Just pick your words. AI generates everything automatically — sentences, questions, exercises.",
    aiAutoSentences: "🤖 AI-Generated Content",
    aiAutoSentencesDesc: "Contextual sentences, fill-in-the-blank exercises, and more — created instantly.",
    aiAutoGrading: "✅ Auto-Grading",
    aiAutoGradingDesc: "Instant feedback for students. Zero grading for you. Track progress with one click.",
    aiJustAssign: "Just Assign. That's It.",

    // Pricing
    pricingTitle: "Simple pricing for teachers",
    pricingSubtitle: "Start with 30 days of Pro free — no credit card required.",
    pricingFreeName: "Free",
    pricingFreeTagline: "Forever free, no card needed",
    pricingFreePrice: "₪0",
    pricingFreePriceSuffix: "/forever",
    pricingFreeFeature1: "1 class",
    pricingFreeFeature2: "Up to 30 students",
    pricingFreeFeature3: "All 11 game modes",
    pricingFreeFeature4: "MoE word sets (Set 1, 2, 3)",
    pricingFreeFeature5: "Hebrew + Arabic translations",
    pricingFreeCta: "Start free",
    pricingProBadge: "Most popular",
    pricingProName: "Pro",
    pricingProTagline: "For teachers who want everything",
    pricingProPrice: "₪290",
    pricingProPriceSuffix: "/year",
    pricingProPriceAlt: "or ₪29 / month",
    pricingProTrialNote: "30-day free trial — no card required",
    pricingProFeature1: "Everything in Free, plus:",
    pricingProFeature2: "Unlimited classes",
    pricingProFeature3: "Unlimited students",
    pricingProFeature4: "AI Sentence Builder",
    pricingProFeature5: "Camera OCR for custom word lists",
    pricingProFeature6: "Advanced analytics",
    pricingProFeature7: "Priority support",
    pricingProCta: "Start 30-day free trial",
    pricingSchoolName: "Schools",
    pricingSchoolTagline: "Tailored to your school",
    pricingSchoolPrice: "Custom",
    pricingSchoolPriceNote: "Quoted per school",
    pricingSchoolFeature1: "Everything in Pro for all teachers",
    pricingSchoolFeature2: "Central billing — one NIS invoice",
    pricingSchoolFeature3: "Principal dashboard",
    pricingSchoolFeature4: "SSO / Google Workspace",
    pricingSchoolFeature5: "Training session for staff",
    pricingSchoolFeature6: "Priority support, 24h SLA",
    pricingSchoolFeature7: "DPA + EU-hosted data",
    pricingSchoolCta: "Get a quote",

    // Footer
    footerTagline: "The vocabulary platform students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    footerSchoolPlans: "School plans",
    footerIndividualTeacher: "Individual teacher",
    footerProduct: "Product",
    footerResources: "Resources",
    footerLegal: "Legal & Trust",
    footerStartLearning: "Start Learning",
    footerTryDemo: "Try the Demo",
    footerTeacherLogin: "Teacher Login",
    footerCefrVocab: "CEFR A1 vocabulary",
    footerCefrExplained: "A1 vs A2 explained",
    footerBestEsl: "Best ESL app — Grades 1-12",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    footerSecurity: "Security & Trust",
    footerAccessibility: "Accessibility",
    footerFaq: "FAQ",
    footerContact: "Contact Support",
    footerTeacherInquiry: "Individual teacher? Get in touch",
    footerFeatureRequest: "Request a Feature",
    footerFreeResources: "Free Resources",
    footerStatus: "System Status",
    footerCopyright: (year) =>
      `© ${year} Vocaband. Made with 💙 for learners everywhere.`,
  },

  he: {
    navTryDemo: "שחקו עכשיו",
    navTryDemoShort: "שחקו",
    navCefrBadge: "CEFR A1–B2",

    heroTitleLine1: "שדרגו",
    heroTitleLine2: "את אוצר המילים",
    heroSubtitle:
      "משחק אוצר מילים שתלמידים בכל העולם באמת רוצים לשחק — וכלי הכיתה הקל ביותר שמורים ישתמשו בו לאורך כל השנה.",
    heroCtaStart: "התחילו ללמוד",
    heroCtaTeacher: "כניסת מורים",
    heroPlayItWord: "שחקו אותה",
    heroLearnItWord: "למדו אותה",
    heroTrustCurriculum: "מותאם לתוכנית משרד החינוך",
    heroTrustTrilingual: "עברית · ערבית · אנגלית",
    heroTrustEu: "מאוחסן באירופה · GDPR",
    heroTrustOrigin: "פותח בישראל",

    floatingCardModes: "🎮 11 מצבי משחק",
    floatingCardXp: "⭐ צבור נקודות",
    floatingCardStreaks: "🔥 רצף יומי",
    floatingCardEggs: "🎁 תיבות יומיות",

    studentsSectionH2: "למה תלמידים אוהבים את Vocaband",
    studentsSectionSubtitle: "כל מה שצריך כדי לשלוט באוצר מילים — בצורה משחקית.",

    // Student Features
    gameModesTitle: "11 מצבי משחק",
    gameModesDesc: "מקלאסי עד בונה משפטים — כל מצב מלמד אחרת. מצאו את המועדף!",
    modeNames: {
      classic: "קלאסי",
      listen: "הקשבה",
      spell: "איות",
      match: "התאמה",
      tf: "נ/ל",
      flash: "כרטיסיות",
      scramble: "ערבוב",
      reverse: "הפוך",
      letters: "אותיות",
      sentence: "משפטים",
      fillBlank: "מלא חסר",
    },
    liveChallengesTitle: "אתגרים חיים",
    liveChallengesDesc: "התחרו בחברי לכיתה בפודיום בזמן אמת!",
    xpShopTitle: "חנות XP",
    xpShopDesc: "צברו XP, הוציאו על אווטארים, מסגרות וחיזוקים!",
    mysteryEggsTitle: "תיבות הפתעה",
    mysteryEggsDesc: "פתחו תיבות כדי לקבל אווטארים אגדיים!",
    powerBoostersTitle: "חיזוקי כוח",
    powerBoostersDesc: "מכפילי XP, הקפאת רצפים ועוד!",
    petFriendsTitle: "חיות מחמד",
    petFriendsDesc: "פתחו חיות מחמד חמודות שמעודדות אתכם!",
    dailyStreaksTitle: "רצף יומי",
    dailyStreaksDesc: "שמרו על ההשפעה! קבלו פרסים.",

    // Teacher Section
    teachersSectionPill: "למורים",
    teachersSectionH2: "הכלי הכי קל שתשתמשו בו השנה",
    teachersSectionSubtitle:
      "אפס הכנה, אפס ניירת, אפס עקומת למידה. ללמד יותר, ללחוץ פחות.",

    // Teacher Features
    autoGradingTitle: "דירוג אוטומטי",
    autoGradingDesc: "כל אימון מדורג באופן מיידי. בלי לאסוף דפי עבודה, בלי ערימות לבדיקה. התמקדו בהוראה, לא בניירת.",
    useYourOwnWordsTitle: "השתמשו במילים שלכם",
    useYourOwnWordsDesc: "העלו רשימות אוצר מילים מותאמות אישית. הקצו כל מילה שאתם צריכים.",
    spotStrugglingTitle: "זיהוי תלמידים שצריכים עזרה",
    spotStrugglingDesc: "ניתוח בזמן אמת מראה בדיוק מי צריך עזרה — לפני המבחן.",
    quickSetupTitle: "הקמה ב-30 שניות",
    quickSetupDesc: "צרו כיתה → שתפו קוד → תלמידים מצטרפים. זה הכל.",
    studentEngagementTitle: "תלמידים רוצים לתרגל",
    studentEngagementDesc: "מצבי משחק, XP, רצפים — תלמידים מתאמנים מרצון בבית.",
    aiSentenceBuilderTitle: "בונה משפטים בבינה מלאכותית",
    aiSentenceBuilderDesc: "לחיצה אחת, 10 משפטים לדוגמה לכל מילה — ברמה המתאימה לכיתה שלכם.",
    snapWordlistTitle: "צלמו רשימת מילים",
    snapWordlistDesc: "צלמו כל רשימה מודפסת — כתב יד, דף בספר לימוד, לוח — מילים חולצות תוך שניות.",
    quickPlayTitle: "משחק מהיר — משחק חי בלי הרשמה",
    quickPlayDesc: "הקרינו QR על הלוח, תלמידים מצטרפים עם הטלפונים — בלי חשבונות, בלי להקליד קוד כיתה, בלי התקנה. פודיום חי, ניקוד בזמן אמת, מוכן ב-10 שניות.",
    quickPlayScanPlay: "סרקו ושחקו",
    hebrewArabicTitle: "עברית + ערבית, מובנה",
    hebrewArabicDesc: "כל מילה מגיעה עם תרגומים מקוריים בעברית וערבית — בלי אפליקציה שנייה, בלי העתקה והדבקה. פריסות RTL מטופלות אוטומטית. שפות נוספות בתכנון.",

    // Curriculum
    curriculumSectionH2: "המסע שלך לשליטה",
    curriculumSectionSubtitle:
      "מותאם ל-CEFR מ-A1 עד B2 — שלוש סטים מקיפים של אוצר מילים עם +6,500 מילים.",
    curriculumProgress: "התקדמות",
    set1Title: "סט 1 — יסודות",
    set1Desc: "אוצר מילים למתחילים",
    set1Words: "~2000 מילים",
    set2Title: "סט 2 — בינוני",
    set2Desc: "בניית מורכבות",
    set2Words: "~2500 מילים",
    set3Title: "סט 3 — אקדמי",
    set3Desc: "שליטה מתקדמת",
    set3Words: "~3000 מילים",

    // Voca Family
    vocaFamilyPill: "בקרוב",
    vocaFamilyH2: "משפחת Voca",
    vocaFamilySubtitle:
      "אנחנו מתחילים עם אוצר מילים באנגלית — אבל אותו מנוע משחק מלמד כל נושא. המקצועות על המפה, לפי בקשת המורים:",
    vocaFamilyComingSoon: "בקרוב",
    vocaFamilyRequestLine: "מלמדים מקצוע אחר? ספרו לנו איזה Voca לבנות הבא:",
    vocaFamilyRequestCta: "בקשו מקצוע",
    vocaHistoryName: "VocaHistory",
    vocaHistoryTag: "תאריכים · אישים · אירועים",
    vocaScienceName: "VocaScience",
    vocaScienceTag: "מונחים · מושגים · דיאגרמות",
    vocaHebrewName: "VocaHebrew",
    vocaHebrewTag: "אוצר מילים בעברית",
    vocaArabicName: "VocaArabic",
    vocaArabicTag: "אוצר מילים בערבית",
    vocaMathName: "VocaMath",
    vocaMathTag: "הגדרות · נוסחאות",

    // Final CTA
    finalCtaH2Line1: "מוכנים להפוך ל",
    finalCtaH2Line2: "אגדת אוצר מילים?",
    finalCtaSubtitle:
      "הצטרפו לאלפי תלמידים שמשדרגים את האנגלית שלהם — מילה אחת בכל פעם.",
    finalCtaStart: "התחילו ללמוד חינם",
    finalCtaTeacher: "כניסת מורים",

    // AI Does the Heavy Lifting
    aiSectionH2: "הבינה המלאכותית עושה את כל העבודה",
    aiSectionSubtitle: "אתם מתמקדים בלימוד. הבינה המלאכותית מטפלת בכל השאר.",
    aiZeroWork: "⚡ אפס עבודת הכנה",
    aiZeroWorkDesc: "רק בחרו מילים. הבינה המלאכותית יוצרת הכל אוטומטית — משפטים, שאלות, תרגילים.",
    aiAutoSentences: "🤖 תוכן שנוצר על ידי בינה מלאכותית",
    aiAutoSentencesDesc: "משפטים בהקשר, תרגילי השלמה, ועוד — נוצרים באופן מיידי.",
    aiAutoGrading: "✅ בדיקה אוטומטית",
    aiAutoGradingDesc: "משוב מיידי לתלמידים. אפס בדיקה עבורכם. מעקב אחר התקדמות בלחיצת כפתור.",
    aiJustAssign: "פשוט מקצים משימות. זה הכל.",

    // Pricing
    pricingTitle: "מחירים פשוטים למורים",
    pricingSubtitle: "התחילו עם 30 ימי Pro חינם — בלי כרטיס אשראי.",
    pricingFreeName: "חינם",
    pricingFreeTagline: "חינם לתמיד, בלי כרטיס",
    pricingFreePrice: "₪0",
    pricingFreePriceSuffix: "/לתמיד",
    pricingFreeFeature1: "כיתה אחת",
    pricingFreeFeature2: "עד 30 תלמידים",
    pricingFreeFeature3: "כל 11 מצבי המשחק",
    pricingFreeFeature4: "ערכות משרד החינוך (סט 1, 2, 3)",
    pricingFreeFeature5: "תרגומים לעברית וערבית",
    pricingFreeCta: "התחילו בחינם",
    pricingProBadge: "הכי פופולרי",
    pricingProName: "Pro",
    pricingProTagline: "למורים שרוצים את הכל",
    pricingProPrice: "₪290",
    pricingProPriceSuffix: "/שנה",
    pricingProPriceAlt: "או ₪29 / חודש",
    pricingProTrialNote: "30 ימי ניסיון חינם — בלי כרטיס אשראי",
    pricingProFeature1: "כל מה שבחינם, ובנוסף:",
    pricingProFeature2: "כיתות ללא הגבלה",
    pricingProFeature3: "תלמידים ללא הגבלה",
    pricingProFeature4: "בונה משפטים AI",
    pricingProFeature5: "סריקת מצלמה לרשימות מילים",
    pricingProFeature6: "אנליטיקה מתקדמת",
    pricingProFeature7: "תמיכה מועדפת",
    pricingProCta: "התחילו ניסיון חינם של 30 יום",
    pricingSchoolName: "בתי ספר",
    pricingSchoolTagline: "מותאם לבית הספר שלכם",
    pricingSchoolPrice: "מותאם אישית",
    pricingSchoolPriceNote: "הצעת מחיר לכל בית ספר",
    pricingSchoolFeature1: "כל מה שב־Pro לכל המורים",
    pricingSchoolFeature2: "חיוב מרכזי — חשבונית אחת בשקלים",
    pricingSchoolFeature3: "לוח בקרה למנהל/ת",
    pricingSchoolFeature4: "התחברות SSO / Google Workspace",
    pricingSchoolFeature5: "הדרכה לצוות",
    pricingSchoolFeature6: "תמיכה מועדפת, SLA של 24 שעות",
    pricingSchoolFeature7: "DPA + נתונים מאוחסנים באירופה",
    pricingSchoolCta: "קבלו הצעת מחיר",

    // Footer
    footerTagline: "פלטפורמת אוצר המילים שתלמידים בכל העולם באמת רוצים לשחק — וכלי הכיתה הקל ביותר שמורים ישתמשו בו לאורך כל השנה.",
    footerSchoolPlans: "תכניות בתי ספר",
    footerIndividualTeacher: "מורה פרטי",
    footerProduct: "מוצר",
    footerResources: "משאבים",
    footerLegal: "משפטי ואמון",
    footerStartLearning: "התחילו ללמוד",
    footerTryDemo: "נסו את הדמו",
    footerTeacherLogin: "כניסת מורים",
    footerCefrVocab: "אוצר מילים CEFR A1",
    footerCefrExplained: "ההבדל בין A1 ל-A2",
    footerBestEsl: "האפליקציה הטובה ביותר לאנגלית — כיתות א-יב",
    footerTerms: "תנאי שימוש",
    footerPrivacy: "מדיניות פרטיות",
    footerSecurity: "אבטחה ואמון",
    footerAccessibility: "נגישות",
    footerFaq: "שאלות נפוצות",
    footerContact: "צור קשר",
    footerTeacherInquiry: "מורה פרטי? צרו איתנו קשר",
    footerFeatureRequest: "הצע פיצ'ר חדש",
    footerFreeResources: "משאבים בחינם",
    footerStatus: "סטטוס מערכת",
    footerCopyright: (year) =>
      `© ${year} Vocaband. נוצר עם 💙 ללומדים בכל העולם.`,
  },

  ar: {
    navTryDemo: "العب الآن",
    navTryDemoShort: "العب",
    navCefrBadge: "CEFR A1–B2",

    heroTitleLine1: "ارتقِ",
    heroTitleLine2: "بمفرداتك",
    heroSubtitle:
      "لعبة المفردات التي يريد الطلاب حول العالم أن يلعبوها فعلاً — وأسهل أداة صفية سيستخدمها المعلمون طوال العام.",
    heroCtaStart: "ابدأ التعلم",
    heroCtaTeacher: "دخول المعلمين",
    heroPlayItWord: "العبها",
    heroLearnItWord: "تعلمها",
    heroTrustCurriculum: "متوافق مع منهج وزارة التربية",
    heroTrustTrilingual: "العربية · العبرية · الإنجليزية",
    heroTrustEu: "مستضاف في أوروبا · GDPR",
    heroTrustOrigin: "صُنع في إسرائيل",

    floatingCardModes: "🎮 11 لعبة",
    floatingCardXp: "⭐ اكسب النقاط",
    floatingCardStreaks: "🔥 سلسلة أيام",
    floatingCardEggs: "🎁 صناديق يومية",

    studentsSectionH2: "لماذا يحب الطلاب Vocaband",
    studentsSectionSubtitle: "كل ما تحتاجه لإتقان المفردات، بأسلوب لعبة.",

    // Student Features
    gameModesTitle: "11 لعبة",
    gameModesDesc: "من الكلاسيكي إلى بناء الجمل — كل وضع يعلّم بشكل مختلف. اعثر على المفضّل!",
    modeNames: {
      classic: "كلاسيكي",
      listen: "استماع",
      spell: "تهجئة",
      match: "تطابق",
      tf: "ص/خ",
      flash: "بطاقات",
      scramble: "خلط",
      reverse: "عكسي",
      letters: "حروف",
      sentence: "جمل",
      fillBlank: "املأ الفراغ",
    },
    liveChallengesTitle: "التحديات المباشرة",
    liveChallengesDesc: "نافس زملاء الصف في منصات مباشرة!",
    xpShopTitle: "متجر XP",
    xpShopDesc: "اكسب XP، أنفقها على صور رمزية وإطارات وقوّات!",
    mysteryEggsTitle: "صناديق المفاجآت",
    mysteryEggsDesc: "افتح الصناديق لتكشف صورًا رمزية أسطورية!",
    powerBoostersTitle: "قوّات تعزيز",
    powerBoostersDesc: "مضاعفات XP، تجميد السلاسل والمزيد!",
    petFriendsTitle: "رفاق الحيوانات",
    petFriendsDesc: "اكتشف حيوانات أليفة لطيفة تشجّعك!",
    dailyStreaksTitle: "سلاسل يومية",
    dailyStreaksDesc: "أبقِ الشعلة مشتعلة! اكسب جوائز.",

    // Teacher Section
    teachersSectionPill: "للمعلمين",
    teachersSectionH2: "أسهل أداة ستستخدمها طوال العام",
    teachersSectionSubtitle:
      "بلا تحضير، بلا أوراق، بلا منحنى تعلّم. علّم أكثر، انقر أقل.",

    // Teacher Features
    autoGradingTitle: "تصحيح تلقائي",
    autoGradingDesc: "كل جلسة ممارسة تصحَّح فورًا. بلا أوراق عمل لجمعها، بلا أكوام لمراجعتها. ركّز على التدريس لا على الأوراق.",
    useYourOwnWordsTitle: "استخدم كلماتك الخاصة",
    useYourOwnWordsDesc: "حمّل قوائم مفردات مخصصة. عيّن أي كلمات تحتاجها.",
    spotStrugglingTitle: "تحديد من يحتاج مساعدة",
    spotStrugglingDesc: "التحليلات الفورية تظهر بدقة من يحتاج مساعدة — قبل الاختبار.",
    quickSetupTitle: "الإعداد في 30 ثانية",
    quickSetupDesc: "أنشئ فصلًا → شارِك الرمز → الطلاب ينضمون. هذا كل شيء.",
    studentEngagementTitle: "يريدون فعلًا الممارسة",
    studentEngagementDesc: "أوضاع اللعب وXP والسلاسل — الطلاب يدرسون طوعًا في المنزل.",
    aiSentenceBuilderTitle: "باني الجمل بالذكاء الاصطناعي",
    aiSentenceBuilderDesc: "نقرة واحدة، 10 جمل مثال لكل كلمة — بالمستوى المناسب لصفّك.",
    snapWordlistTitle: "التقط صورة لقائمة",
    snapWordlistDesc: "التقط صورة لأي قائمة مطبوعة — خط اليد، صفحة كتاب، سبورة — كلمات مستخرجة في ثوانٍ.",
    quickPlayTitle: "اللعب السريع — لعبة مباشرة بلا تسجيل",
    quickPlayDesc: "اعرض QR على السبورة، الطلاب ينضمون بهواتفهم — بلا حسابات، بلا كتابة رمز الفصل، بلا إعداد. منصة مباشرة، نقاط فورية، جاهز في 10 ثوانٍ.",
    quickPlayScanPlay: "امسح والعب",
    hebrewArabicTitle: "العبرية والعربية، مدمجة",
    hebrewArabicDesc: "كل كلمة تأتي مع ترجمات أصلية بالعبرية والعربية — بلا تطبيق ثاني، بلا نسخ ولصق. تخطيطات RTL تُعالَج تلقائيًا. لغات أخرى قادمة.",

    // Curriculum
    curriculumSectionH2: "رحلتك نحو الإتقان",
    curriculumSectionSubtitle:
      "متوافق مع CEFR من A1 إلى B2 — ثلاث مجموعات شاملة من المفردات تغطي +6,500 كلمة.",
    curriculumProgress: "التقدم",
    set1Title: "المجموعة 1 — الأساسيات",
    set1Desc: "مفردات للمبتدئين",
    set1Words: "~2000 كلمة",
    set2Title: "المجموعة 2 — المتوسط",
    set2Desc: "بناء التعقيد",
    set2Words: "~2500 كلمة",
    set3Title: "المجموعة 3 — الأكاديمي",
    set3Desc: "إتقان متقدم",
    set3Words: "~3000 كلمة",

    // Voca Family
    vocaFamilyPill: "قريباً",
    vocaFamilyH2: "عائلة Voca",
    vocaFamilySubtitle:
      "نبدأ بمفردات الإنجليزية — لكن المحرك نفسه يعلّم أي مادة. المواد المخططة، بحسب طلب المعلمين:",
    vocaFamilyComingSoon: "قريباً",
    vocaFamilyRequestLine: "تعلّم مادة مختلفة؟ أخبرنا أيّ Voca نبني تالياً:",
    vocaFamilyRequestCta: "اطلب مادة",
    vocaHistoryName: "VocaHistory",
    vocaHistoryTag: "تواريخ · شخصيات · أحداث",
    vocaScienceName: "VocaScience",
    vocaScienceTag: "مصطلحات · مفاهيم · رسوم",
    vocaHebrewName: "VocaHebrew",
    vocaHebrewTag: "مفردات العبرية",
    vocaArabicName: "VocaArabic",
    vocaArabicTag: "مفردات العربية",
    vocaMathName: "VocaMath",
    vocaMathTag: "تعريفات · معادلات",

    // Final CTA
    finalCtaH2Line1: "جاهز لتصبح",
    finalCtaH2Line2: "أسطورة مفردات؟",
    finalCtaSubtitle:
      "انضم إلى آلاف الطلاب الذين يطورون إنجليزيتهم — كلمة واحدة في كل مرة.",
    finalCtaStart: "ابدأ التعلم مجاناً",
    finalCtaTeacher: "دخول المعلمين",

    // AI Does the Heavy Lifting
    aiSectionH2: "الذكاء الاصطناعي يقوم بكل العمل",
    aiSectionSubtitle: "أنت تركز على التدريس. الذكاء الاصطناعي يتولى الباقي.",
    aiZeroWork: "⚡ لا حاجة للتحضير",
    aiZeroWorkDesc: "فقط اختر الكلمات. الذكاء الاصطناعي ينشئ كل شيء تلقائياً — جمل وأسئلة وتمارين.",
    aiAutoSentences: "🤖 محتوى مدعوم بالذكاء الاصطناعي",
    aiAutoSentencesDesc: "جمل سياقية وتمارين ملء الفراغات والمزيد — تنشأ على الفور.",
    aiAutoGrading: "✅ تصحيح تلقائي",
    aiAutoGradingDesc: "ملاحظات فورية للطلاب. لا تصحيح عليك. تتبع التقدم بنقرة واحدة.",
    aiJustAssign: "فقط عيّن مهام. هذا كل شيء.",

    // Pricing
    pricingTitle: "أسعار بسيطة للمعلمين",
    pricingSubtitle: "ابدأ بـ 30 يومًا من Pro مجانًا — بدون بطاقة ائتمان.",
    pricingFreeName: "مجاني",
    pricingFreeTagline: "مجاني للأبد، بدون بطاقة",
    pricingFreePrice: "₪0",
    pricingFreePriceSuffix: "/للأبد",
    pricingFreeFeature1: "صف واحد",
    pricingFreeFeature2: "حتى 30 طالبًا",
    pricingFreeFeature3: "جميع أنماط اللعب الـ11",
    pricingFreeFeature4: "مجموعات وزارة التربية (1، 2، 3)",
    pricingFreeFeature5: "ترجمات بالعبرية والعربية",
    pricingFreeCta: "ابدأ مجانًا",
    pricingProBadge: "الأكثر شعبية",
    pricingProName: "Pro",
    pricingProTagline: "للمعلمين الذين يريدون كل شيء",
    pricingProPrice: "₪290",
    pricingProPriceSuffix: "/سنة",
    pricingProPriceAlt: "أو ₪29 / شهر",
    pricingProTrialNote: "تجربة مجانية لـ 30 يومًا — بدون بطاقة",
    pricingProFeature1: "كل ما في المجاني، بالإضافة إلى:",
    pricingProFeature2: "صفوف بلا حدود",
    pricingProFeature3: "طلاب بلا حدود",
    pricingProFeature4: "منشئ الجمل بالذكاء الاصطناعي",
    pricingProFeature5: "مسح ضوئي لقوائم الكلمات المخصصة",
    pricingProFeature6: "تحليلات متقدمة",
    pricingProFeature7: "دعم ذو أولوية",
    pricingProCta: "ابدأ تجربة 30 يومًا مجانًا",
    pricingSchoolName: "المدارس",
    pricingSchoolTagline: "مخصص لمدرستك",
    pricingSchoolPrice: "مخصص",
    pricingSchoolPriceNote: "عرض سعر لكل مدرسة",
    pricingSchoolFeature1: "كل ما في Pro لجميع المعلمين",
    pricingSchoolFeature2: "فوترة مركزية — فاتورة واحدة بالشيكل",
    pricingSchoolFeature3: "لوحة تحكم للمدير",
    pricingSchoolFeature4: "تسجيل دخول SSO / Google Workspace",
    pricingSchoolFeature5: "جلسة تدريب للطاقم",
    pricingSchoolFeature6: "دعم ذو أولوية، SLA 24 ساعة",
    pricingSchoolFeature7: "DPA + بيانات مستضافة في أوروبا",
    pricingSchoolCta: "احصل على عرض سعر",

    // Footer
    footerTagline: "منصة المفردات التي يريد الطلاب حول العالم لعبها فعلاً — وأسهل أداة صفية سيستخدمها المعلمون طوال العام.",
    footerSchoolPlans: "خطط المدارس",
    footerIndividualTeacher: "معلم فردي",
    footerProduct: "المنتج",
    footerResources: "الموارد",
    footerLegal: "قانوني والثقة",
    footerStartLearning: "ابدأ التعلم",
    footerTryDemo: "جرّب العرض",
    footerTeacherLogin: "دخول المعلمين",
    footerCefrVocab: "مفردات CEFR A1",
    footerCefrExplained: "الفرق بين A1 و A2",
    footerBestEsl: "أفضل تطبيق ESL — الصفوف 1-12",
    footerTerms: "شروط الخدمة",
    footerPrivacy: "سياسة الخصوصية",
    footerSecurity: "الأمان والثقة",
    footerAccessibility: "إمكانية الوصول",
    footerFaq: "الأسئلة الشائعة",
    footerContact: "تواصل مع الدعم",
    footerTeacherInquiry: "معلم فردي؟ تواصل معنا",
    footerFeatureRequest: "اقترح ميزة جديدة",
    footerFreeResources: "موارد مجانية",
    footerStatus: "حالة النظام",
    footerCopyright: (year) =>
      `© ${year} Vocaband. صُنع بحب 💙 للمتعلمين في كل مكان.`,
  },
};
