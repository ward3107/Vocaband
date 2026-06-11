/**
 * Below-the-fold landing-page copy — the strings rendered ONLY by the
 * lazy landing section components (Students / AI / Teachers / Journey /
 * Vocas / Schools / FinalCTA / Footer), each gated behind a
 * DeferredSection IntersectionObserver.
 *
 * WHY this file exists: the hero + nav (PublicNav, eager LandingPage)
 * import landingPageT on the cold critical path. Co-locating these
 * section-only strings there forced the full ~60 KB locale into the cold
 * chunk even though the hero uses a fraction of it. Splitting the
 * section copy here lets it ride the lazy section chunks instead, so it
 * only downloads once the user scrolls. Cold/shared strings stay in
 * landing-page.ts.
 *
 * Keep the two files partitioned by usage: a key belongs here ONLY if it
 * is referenced exclusively by the lazy section components.
 */
import type { Language } from "../../hooks/useLanguage";

export interface LandingSectionsT {
  schools: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    point1: string;
    point2: string;
    point3: string;
    cta: string;
    previewTitle: string;
    previewBadge: string;
    previewChart: string;
    kpiTeachers: string;
    kpiClasses: string;
    kpiStudents: string;
    kpiActive: string;
  };
  studentsSectionH2: string;
  studentsSectionSubtitle: string;
  gameModesTitle: string;
  gameModesDesc: string;
  modeNames: {
    classic: string;
    listen: string;
    spell: string;
    match: string;
    memory: string;
    tf: string;
    flash: string;
    scramble: string;
    reverse: string;
    letters: string;
    sentence: string;
    fillBlank: string;
    idiom: string;
    speedRound: string;
  };
  liveChallengesTitle: string;
  liveChallengesDesc: string;
  xpShopTitle: string;
  xpShopDesc: string;
  mysteryEggsTitle: string;
  mysteryEggsDesc: string;
  powerBoostersTitle: string;
  powerBoostersDesc: string;
  petFriendsTitle: string;
  petFriendsDesc: string;
  dailyStreaksTitle: string;
  dailyStreaksDesc: string;
  teachersSectionPill: string;
  teachersSectionH2: string;
  teachersSectionSubtitle: string;
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
  summitTitle: string;
  summitDesc: string;
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
  finalCtaH2Line1: string;
  finalCtaH2Line2: string;
  finalCtaSubtitle: string;
  finalCtaStart: string;
  finalCtaTeacher: string;
  aiSectionH2: string;
  aiSectionSubtitle: string;
  aiZeroWork: string;
  aiZeroWorkDesc: string;
  aiAutoSentences: string;
  aiAutoSentencesDesc: string;
  aiAutoGrading: string;
  aiAutoGradingDesc: string;
  aiJustAssign: string;
  footerTagline: string;
  footerSchoolPlans: string;
  footerIndividualTeacher: string;
  footerProduct: string;
  footerResources: string;
  footerDownloads: string;
  footerLegal: string;
  footerTryDemo: string;
  footerTeacherLogin: string;
  footerCefrVocab: string;
  footerCefrExplained: string;
  footerBestEsl: string;
  footerTerms: string;
  footerPrivacy: string;
  footerForParents: string;
  footerSecurity: string;
  footerAccessibility: string;
  footerFaq: string;
  footerContact: string;
  footerTeacherInquiry: string;
  footerFeatureRequest: string;
  footerFreeResources: string;
  footerSchoolDeck: string;
  footerSchoolPdfHe: string;
  footerSchoolPdfAr: string;
  footerSchoolOnePagerAr: string;
  footerSchoolPptxAr: string;
  footerStatus: string;
  footerCopyright: (year: number) => string;
}

export const landingSectionsT: Record<Language, LandingSectionsT> = {
  en: {
    schools: {
      eyebrow: "For school leaders",
      heading: "Run a whole school? See all of it.",
      subtitle: "One principal dashboard to oversee every teacher, class, and student — with school-wide analytics that show what's working and what needs attention.",
      point1: "Every teacher & class in one place",
      point2: "School-wide engagement, XP & scores",
      point3: "Spot the classes that need attention",
      cta: "Talk to us about your school",
      previewTitle: "Principal console",
      previewBadge: "Live preview",
      previewChart: "Active students · last 14 days",
      kpiTeachers: "Teachers",
      kpiClasses: "Classes",
      kpiStudents: "Students",
      kpiActive: "Active 7d",
    },
    studentsSectionH2: "Why Students Love Vocaband",
    studentsSectionSubtitle: "Everything you need to master vocabulary, gamified.",
    gameModesTitle: "15 Game Modes",
    gameModesDesc: "From Classic to Idioms and Speed Round — every mode teaches differently. Find your favorite!",
    modeNames: {
      classic: "Classic",
      listen: "Listen",
      spell: "Spell",
      match: "Match",
      memory: "Memory",
      tf: "T/F",
      flash: "Flash",
      scramble: "Scramble",
      reverse: "Reverse",
      letters: "Letters",
      sentence: "Sentence",
      fillBlank: "Fill Blank",
      idiom: "Idioms",
      speedRound: "Speed",
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
    teachersSectionPill: "For Teachers",
    teachersSectionH2: "The Easiest Tool You'll Use All Year",
    teachersSectionSubtitle: "Zero prep, zero paperwork, zero learning curve. Teach more, click less.",
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
    curriculumSectionH2: "Your Journey to Mastery",
    curriculumSectionSubtitle: "Aligned with CEFR A1 to B2 — three comprehensive vocabulary sets covering 6,500+ words.",
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
    summitTitle: "Mastery Reached",
    summitDesc: "Climb to the summit. Become a vocabulary champion.",
    vocaFamilyPill: "Coming Soon",
    vocaFamilyH2: "The Voca Family",
    vocaFamilySubtitle: "We're starting with English vocabulary — but the same gameplay engine teaches anything. Subjects on the roadmap, by teacher demand:",
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
    finalCtaH2Line1: "Ready to Turn Students Into",
    finalCtaH2Line2: "Vocabulary Legends?",
    finalCtaSubtitle: "Join thousands of teachers turning vocabulary lessons into a game students actually want to play.",
    finalCtaStart: "Try the Demo",
    finalCtaTeacher: "Teacher Login",
    aiSectionH2: "AI Does All the Work",
    aiSectionSubtitle: "You focus on teaching. AI handles the rest.",
    aiZeroWork: "⚡ Zero Prep Work",
    aiZeroWorkDesc: "Just pick your words. AI generates everything automatically — sentences, questions, exercises.",
    aiAutoSentences: "🤖 AI-Generated Content",
    aiAutoSentencesDesc: "Contextual sentences, fill-in-the-blank exercises, and more — created instantly.",
    aiAutoGrading: "✅ Auto-Grading",
    aiAutoGradingDesc: "Instant feedback for students. Zero grading for you. Track progress with one click.",
    aiJustAssign: "Just Assign. That's It.",
    footerTagline: "The vocabulary platform students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    footerSchoolPlans: "School plans",
    footerIndividualTeacher: "Individual teacher",
    footerProduct: "Product",
    footerResources: "Resources",
    footerDownloads: "Downloads",
    footerLegal: "Legal & Trust",
    footerTryDemo: "Try the Demo",
    footerTeacherLogin: "Teacher Login",
    footerCefrVocab: "CEFR A1 vocabulary",
    footerCefrExplained: "A1 vs A2 explained",
    footerBestEsl: "Best ESL app — Grades 1-12",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    footerForParents: "For Parents",
    footerSecurity: "Security & Trust",
    footerAccessibility: "Accessibility",
    footerFaq: "FAQ",
    footerContact: "Contact Support",
    footerTeacherInquiry: "Individual teacher? Get in touch",
    footerFeatureRequest: "Request a Feature",
    footerFreeResources: "Free Resources",
    footerSchoolDeck: "School Pitch Deck",
    footerSchoolPdfHe: "PDF Hebrew for School",
    footerSchoolPdfAr: "PDF Arabic for School",
    footerSchoolOnePagerAr: "Arabic 1-Page Summary",
    footerSchoolPptxAr: "Arabic Editable PowerPoint",
    footerStatus: "System Status",
    footerCopyright: (year: number) =>
      `© ${year} Vocaband. Made with 💙 for learners everywhere.`,
  },
  he: {
    schools: {
      eyebrow: "למנהלי בתי ספר",
      heading: "מנהלים בית ספר שלם? ראו את הכול.",
      subtitle: "לוח ניהול אחד למנהל/ת — מעקב אחר כל מורה, כיתה ותלמיד, עם נתונים ברמת בית הספר שמראים מה עובד ומה דורש תשומת לב.",
      point1: "כל המורים והכיתות במקום אחד",
      point2: "מעורבות, XP וציונים ברמת בית הספר",
      point3: "זיהוי כיתות שדורשות תשומת לב",
      cta: "דברו איתנו על בית הספר שלכם",
      previewTitle: "לוח המנהל/ת",
      previewBadge: "תצוגה מקדימה",
      previewChart: "תלמידים פעילים · 14 ימים אחרונים",
      kpiTeachers: "מורים",
      kpiClasses: "כיתות",
      kpiStudents: "תלמידים",
      kpiActive: "פעילים (7 ימים)",
    },
    studentsSectionH2: "למה תלמידים אוהבים את Vocaband",
    studentsSectionSubtitle: "כל מה שצריך כדי לשלוט באוצר מילים — בצורה משחקית.",
    gameModesTitle: "15 מצבי משחק",
    gameModesDesc: "מקלאסי דרך ניבים ועד סבב מהיר — כל מצב מלמד אחרת. מצאו את המועדף!",
    modeNames: {
      classic: "קלאסי",
      listen: "הקשבה",
      spell: "איות",
      match: "התאמה",
      memory: "זיכרון",
      tf: "נ/ל",
      flash: "כרטיסיות",
      scramble: "ערבוב",
      reverse: "הפוך",
      letters: "אותיות",
      sentence: "משפטים",
      fillBlank: "מלא חסר",
      idiom: "ניבים",
      speedRound: "מהיר",
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
    teachersSectionPill: "למורים",
    teachersSectionH2: "הכלי הכי קל שתשתמשו בו השנה",
    teachersSectionSubtitle: "אפס הכנה, אפס ניירת, אפס עקומת למידה. ללמד יותר, ללחוץ פחות.",
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
    curriculumSectionH2: "המסע שלך לשליטה",
    curriculumSectionSubtitle: "מותאם ל-CEFR מ-A1 עד B2 — שלוש סטים מקיפים של אוצר מילים עם +6,500 מילים.",
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
    summitTitle: "הגעתם לפסגה",
    summitDesc: "טפסו אל הפסגה והפכו לאלופי אוצר המילים.",
    vocaFamilyPill: "בקרוב",
    vocaFamilyH2: "משפחת Voca",
    vocaFamilySubtitle: "אנחנו מתחילים עם אוצר מילים באנגלית — אבל אותו מנוע משחק מלמד כל נושא. המקצועות על המפה, לפי בקשת המורים:",
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
    finalCtaH2Line1: "מוכנים להפוך תלמידים",
    finalCtaH2Line2: "לאגדת אוצר מילים?",
    finalCtaSubtitle: "הצטרפו לאלפי מורים שהופכים שיעורי אוצר מילים למשחק שתלמידים באמת רוצים לשחק.",
    finalCtaStart: "נסו את הדמו",
    finalCtaTeacher: "כניסת מורים",
    aiSectionH2: "הבינה המלאכותית עושה את כל העבודה",
    aiSectionSubtitle: "אתם מתמקדים בלימוד. הבינה המלאכותית מטפלת בכל השאר.",
    aiZeroWork: "⚡ אפס עבודת הכנה",
    aiZeroWorkDesc: "רק בחרו מילים. הבינה המלאכותית יוצרת הכל אוטומטית — משפטים, שאלות, תרגילים.",
    aiAutoSentences: "🤖 תוכן שנוצר על ידי בינה מלאכותית",
    aiAutoSentencesDesc: "משפטים בהקשר, תרגילי השלמה, ועוד — נוצרים באופן מיידי.",
    aiAutoGrading: "✅ בדיקה אוטומטית",
    aiAutoGradingDesc: "משוב מיידי לתלמידים. אפס בדיקה עבורכם. מעקב אחר התקדמות בלחיצת כפתור.",
    aiJustAssign: "פשוט מקצים משימות. זה הכל.",
    footerTagline: "פלטפורמת אוצר המילים שתלמידים בכל העולם באמת רוצים לשחק — וכלי הכיתה הקל ביותר שמורים ישתמשו בו לאורך כל השנה.",
    footerSchoolPlans: "תכניות בתי ספר",
    footerIndividualTeacher: "מורה פרטי",
    footerProduct: "מוצר",
    footerResources: "משאבים",
    footerDownloads: "הורדות",
    footerLegal: "משפטי ואמון",
    footerTryDemo: "נסו את הדמו",
    footerTeacherLogin: "כניסת מורים",
    footerCefrVocab: "אוצר מילים CEFR A1",
    footerCefrExplained: "ההבדל בין A1 ל-A2",
    footerBestEsl: "האפליקציה הטובה ביותר לאנגלית — כיתות א-יב",
    footerTerms: "תנאי שימוש",
    footerPrivacy: "מדיניות פרטיות",
    footerForParents: "להורים",
    footerSecurity: "אבטחה ואמון",
    footerAccessibility: "נגישות",
    footerFaq: "שאלות נפוצות",
    footerContact: "צור קשר",
    footerTeacherInquiry: "מורה פרטי? צרו איתנו קשר",
    footerFeatureRequest: "הצע פיצ'ר חדש",
    footerFreeResources: "משאבים בחינם",
    footerSchoolDeck: "מצגת מכירות לבתי ספר",
    footerSchoolPdfHe: "PDF עברית לבית הספר",
    footerSchoolPdfAr: "PDF ערבית לבית הספר",
    footerSchoolOnePagerAr: "סיכום עמוד אחד בערבית",
    footerSchoolPptxAr: "PowerPoint ערבית (לעריכה)",
    footerStatus: "סטטוס מערכת",
    footerCopyright: (year: number) =>
      `© ${year} Vocaband. נוצר עם 💙 ללומדים בכל העולם.`,
  },
  ar: {
    schools: {
      eyebrow: "لقادة المدارس",
      heading: "تدير مدرسة كاملة؟ شاهد كل شيء.",
      subtitle: "لوحة تحكم واحدة للمدير — لمتابعة كل معلم وصف وطالب، مع تحليلات على مستوى المدرسة تُظهر ما ينجح وما يحتاج إلى انتباه.",
      point1: "كل المعلمين والصفوف في مكان واحد",
      point2: "التفاعل وXP والدرجات على مستوى المدرسة",
      point3: "رصد الصفوف التي تحتاج إلى انتباه",
      cta: "تحدّث إلينا عن مدرستك",
      previewTitle: "لوحة المدير",
      previewBadge: "معاينة مباشرة",
      previewChart: "الطلاب النشِطون · آخر 14 يومًا",
      kpiTeachers: "المعلمون",
      kpiClasses: "الصفوف",
      kpiStudents: "الطلاب",
      kpiActive: "نشِطون (7 أيام)",
    },
    studentsSectionH2: "لماذا يحب الطلاب Vocaband",
    studentsSectionSubtitle: "كل ما تحتاجه لإتقان المفردات، بأسلوب لعبة.",
    gameModesTitle: "15 لعبة",
    gameModesDesc: "من الكلاسيكي إلى التعابير وسباق السرعة — كل وضع يعلّم بشكل مختلف. اعثر على المفضّل!",
    modeNames: {
      classic: "كلاسيكي",
      listen: "استماع",
      spell: "تهجئة",
      match: "تطابق",
      memory: "ذاكرة",
      tf: "ص/خ",
      flash: "بطاقات",
      scramble: "خلط",
      reverse: "عكسي",
      letters: "حروف",
      sentence: "جمل",
      fillBlank: "املأ الفراغ",
      idiom: "تعابير",
      speedRound: "سرعة",
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
    teachersSectionPill: "للمعلمين",
    teachersSectionH2: "أسهل أداة ستستخدمها طوال العام",
    teachersSectionSubtitle: "بلا تحضير، بلا أوراق، بلا منحنى تعلّم. علّم أكثر، انقر أقل.",
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
    curriculumSectionH2: "رحلتك نحو الإتقان",
    curriculumSectionSubtitle: "متوافق مع CEFR من A1 إلى B2 — ثلاث مجموعات شاملة من المفردات تغطي +6,500 كلمة.",
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
    summitTitle: "وصلت إلى القمة",
    summitDesc: "اصعد إلى القمة وكن بطل المفردات.",
    vocaFamilyPill: "قريباً",
    vocaFamilyH2: "عائلة Voca",
    vocaFamilySubtitle: "نبدأ بمفردات الإنجليزية — لكن المحرك نفسه يعلّم أي مادة. المواد المخططة، بحسب طلب المعلمين:",
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
    finalCtaH2Line1: "جاهزون لتحويل طلابكم",
    finalCtaH2Line2: "إلى أساطير مفردات؟",
    finalCtaSubtitle: "انضموا إلى آلاف المعلمين الذين يحوّلون دروس المفردات إلى لعبة يرغب الطلاب فعلاً بلعبها.",
    finalCtaStart: "جرّبوا العرض التوضيحي",
    finalCtaTeacher: "دخول المعلمين",
    aiSectionH2: "الذكاء الاصطناعي يقوم بكل العمل",
    aiSectionSubtitle: "أنت تركز على التدريس. الذكاء الاصطناعي يتولى الباقي.",
    aiZeroWork: "⚡ لا حاجة للتحضير",
    aiZeroWorkDesc: "فقط اختر الكلمات. الذكاء الاصطناعي ينشئ كل شيء تلقائياً — جمل وأسئلة وتمارين.",
    aiAutoSentences: "🤖 محتوى مدعوم بالذكاء الاصطناعي",
    aiAutoSentencesDesc: "جمل سياقية وتمارين ملء الفراغات والمزيد — تنشأ على الفور.",
    aiAutoGrading: "✅ تصحيح تلقائي",
    aiAutoGradingDesc: "ملاحظات فورية للطلاب. لا تصحيح عليك. تتبع التقدم بنقرة واحدة.",
    aiJustAssign: "فقط عيّن مهام. هذا كل شيء.",
    footerTagline: "منصة المفردات التي يريد الطلاب حول العالم لعبها فعلاً — وأسهل أداة صفية سيستخدمها المعلمون طوال العام.",
    footerSchoolPlans: "خطط المدارس",
    footerIndividualTeacher: "معلم فردي",
    footerProduct: "المنتج",
    footerResources: "الموارد",
    footerDownloads: "التحميلات",
    footerLegal: "قانوني والثقة",
    footerTryDemo: "جرّب العرض",
    footerTeacherLogin: "دخول المعلمين",
    footerCefrVocab: "مفردات CEFR A1",
    footerCefrExplained: "الفرق بين A1 و A2",
    footerBestEsl: "أفضل تطبيق ESL — الصفوف 1-12",
    footerTerms: "شروط الخدمة",
    footerPrivacy: "سياسة الخصوصية",
    footerForParents: "للأهل وأولياء الأمور",
    footerSecurity: "الأمان والثقة",
    footerAccessibility: "إمكانية الوصول",
    footerFaq: "الأسئلة الشائعة",
    footerContact: "تواصل مع الدعم",
    footerTeacherInquiry: "معلم فردي؟ تواصل معنا",
    footerFeatureRequest: "اقترح ميزة جديدة",
    footerFreeResources: "موارد مجانية",
    footerSchoolDeck: "عرض المبيعات للمدارس",
    footerSchoolPdfHe: "PDF بالعبرية للمدرسة",
    footerSchoolPdfAr: "PDF بالعربية للمدرسة",
    footerSchoolOnePagerAr: "ملخّص صفحة واحدة بالعربية",
    footerSchoolPptxAr: "PowerPoint بالعربية (للتعديل)",
    footerStatus: "حالة النظام",
    footerCopyright: (year: number) =>
      `© ${year} Vocaband. صُنع بحب 💙 للمتعلمين في كل مكان.`,
  },
  ru: {
    schools: {
      eyebrow: "For school leaders",
      heading: "Run a whole school? See all of it.",
      subtitle: "One principal dashboard to oversee every teacher, class, and student — with school-wide analytics that show what's working and what needs attention.",
      point1: "Every teacher & class in one place",
      point2: "School-wide engagement, XP & scores",
      point3: "Spot the classes that need attention",
      cta: "Talk to us about your school",
      previewTitle: "Principal console",
      previewBadge: "Live preview",
      previewChart: "Active students · last 14 days",
      kpiTeachers: "Teachers",
      kpiClasses: "Classes",
      kpiStudents: "Students",
      kpiActive: "Active 7d",
    },
    studentsSectionH2: "Why Students Love Vocaband",
    studentsSectionSubtitle: "Everything you need to master vocabulary, gamified.",
    gameModesTitle: "15 Game Modes",
    gameModesDesc: "From Classic to Idioms and Speed Round — every mode teaches differently. Find your favorite!",
    modeNames: {
      classic: "Classic",
      listen: "Listen",
      spell: "Spell",
      match: "Match",
      memory: "Memory",
      tf: "T/F",
      flash: "Flash",
      scramble: "Scramble",
      reverse: "Reverse",
      letters: "Letters",
      sentence: "Sentence",
      fillBlank: "Fill Blank",
      idiom: "Idioms",
      speedRound: "Speed",
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
    teachersSectionPill: "For Teachers",
    teachersSectionH2: "The Easiest Tool You'll Use All Year",
    teachersSectionSubtitle: "Zero prep, zero paperwork, zero learning curve. Teach more, click less.",
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
    curriculumSectionH2: "Your Journey to Mastery",
    curriculumSectionSubtitle: "Aligned with CEFR A1 to B2 — three comprehensive vocabulary sets covering 6,500+ words.",
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
    summitTitle: "Mastery Reached",
    summitDesc: "Climb to the summit. Become a vocabulary champion.",
    vocaFamilyPill: "Coming Soon",
    vocaFamilyH2: "The Voca Family",
    vocaFamilySubtitle: "We're starting with English vocabulary — but the same gameplay engine teaches anything. Subjects on the roadmap, by teacher demand:",
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
    finalCtaH2Line1: "Ready to Turn Students Into",
    finalCtaH2Line2: "Vocabulary Legends?",
    finalCtaSubtitle: "Join thousands of teachers turning vocabulary lessons into a game students actually want to play.",
    finalCtaStart: "Try the Demo",
    finalCtaTeacher: "Teacher Login",
    aiSectionH2: "AI Does All the Work",
    aiSectionSubtitle: "You focus on teaching. AI handles the rest.",
    aiZeroWork: "⚡ Zero Prep Work",
    aiZeroWorkDesc: "Just pick your words. AI generates everything automatically — sentences, questions, exercises.",
    aiAutoSentences: "🤖 AI-Generated Content",
    aiAutoSentencesDesc: "Contextual sentences, fill-in-the-blank exercises, and more — created instantly.",
    aiAutoGrading: "✅ Auto-Grading",
    aiAutoGradingDesc: "Instant feedback for students. Zero grading for you. Track progress with one click.",
    aiJustAssign: "Just Assign. That's It.",
    footerTagline: "The vocabulary platform students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    footerSchoolPlans: "School plans",
    footerIndividualTeacher: "Individual teacher",
    footerProduct: "Product",
    footerResources: "Resources",
    footerDownloads: "Downloads",
    footerLegal: "Legal & Trust",
    footerTryDemo: "Try the Demo",
    footerTeacherLogin: "Teacher Login",
    footerCefrVocab: "CEFR A1 vocabulary",
    footerCefrExplained: "A1 vs A2 explained",
    footerBestEsl: "Best ESL app — Grades 1-12",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    footerForParents: "Для родителей",
    footerSecurity: "Security & Trust",
    footerAccessibility: "Accessibility",
    footerFaq: "FAQ",
    footerContact: "Contact Support",
    footerTeacherInquiry: "Individual teacher? Get in touch",
    footerFeatureRequest: "Request a Feature",
    footerFreeResources: "Free Resources",
    footerSchoolDeck: "School Pitch Deck",
    footerSchoolPdfHe: "PDF Hebrew for School",
    footerSchoolPdfAr: "PDF Arabic for School",
    footerSchoolOnePagerAr: "Arabic 1-Page Summary",
    footerSchoolPptxAr: "Arabic Editable PowerPoint",
    footerStatus: "System Status",
    footerCopyright: (year: number) =>
      `© ${year} Vocaband. Made with 💙 for learners everywhere.`,
  },
};
