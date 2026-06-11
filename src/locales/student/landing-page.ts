/**
 * Cold-path locale for the public landing page — ONLY the strings the
 * eager hero + PublicNav render on first paint (vocaband.com root and the
 * public-nav chrome shared across logged-out surfaces).
 *
 * Below-the-fold section copy lives in ./landing-sections (landingSectionsT)
 * and rides the lazy section chunks so it never sits on the cold critical
 * path. Add a new key HERE only if the hero or nav reference it; otherwise
 * it belongs in landing-sections.ts.
 */
import type { Language } from "../../hooks/useLanguage";

export interface LandingPageT {
  navDemo: string;
  heroV2: {
    eyebrow: string;
    staffTitle: string;
    staffDesc: string;
    staffNote: string;
    studentDesc: string;
    studentCta: string;
    studentNote: string;
    demoCta: string;
    demoNote: string;
    or: string;
  };
  navTryDemo: string;
  navTryDemoShort: string;
  navCefrBadge: string;
  navStudents: string;
  navAi: string;
  navTeachers: string;
  navCurriculum: string;
  navVocas: string;
  navPricing: string;
  navForSchools: string;
  navResources: string;
  navGuides: string;
  navFaq: string;
  navSignIn: string;
  navStartFree: string;
  heroSignInForTeachers: string;
  navMenuOpen: string;
  navMenuClose: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroCtaStart: string;
  heroCtaStudent: string;
  heroPlayItWord: string;
  heroLearnItWord: string;
  heroTrustCurriculum: string;
  heroTrustTrilingual: string;
  heroTrustEu: string;
  heroTrustOrigin: string;
  floatingCardModes: string;
  floatingCardXp: string;
  floatingCardStreaks: string;
  floatingCardEggs: string;
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
  footerStartLearning: string;
}

export const landingPageT: Record<Language, LandingPageT> = {
  en: {
    navDemo: "Demo",
    heroV2: {
      eyebrow: "The vocabulary game students actually want to play",
      staffTitle: "Teachers & Principals",
      staffDesc: "Build classes, track every student, and oversee your whole school from one place.",
      staffNote: "Google or email · free to start",
      studentDesc: "Got a class code from your teacher? Jump in and start playing right away.",
      studentCta: "Enter class code",
      studentNote: "No account needed",
      demoCta: "Try the live demo",
      demoNote: "no sign-up",
      or: "or",
    },
    navTryDemo: "PLAY NOW",
    navTryDemoShort: "PLAY",
    navCefrBadge: "CEFR A1–B2",
    navStudents: "Students",
    navAi: "AI",
    navTeachers: "Teachers",
    navCurriculum: "Curriculum",
    navVocas: "Vocas",
    navPricing: "Pricing",
    navForSchools: "For Schools",
    navResources: "Resources",
    navGuides: "Guides",
    navFaq: "FAQ",
    navSignIn: "Sign in",
    navStartFree: "Start free",
    heroSignInForTeachers: "for teachers",
    navMenuOpen: "Open menu",
    navMenuClose: "Close menu",
    heroTitleLine1: "Level Up",
    heroTitleLine2: "Your Vocabulary",
    heroSubtitle: "The vocabulary game students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    heroCtaStart: "Get Started Free",
    heroCtaStudent: "I'm a student → enter class code",
    heroPlayItWord: "Play it",
    heroLearnItWord: "Learn it",
    heroTrustCurriculum: "MoE-Aligned Curriculum",
    heroTrustTrilingual: "Hebrew · Arabic · English",
    heroTrustEu: "EU-Hosted · GDPR",
    heroTrustOrigin: "Built in Israel",
    floatingCardModes: "🎮 15 Game Modes",
    floatingCardXp: "⭐ Earn XP",
    floatingCardStreaks: "🔥 Daily Streaks",
    floatingCardEggs: "🎁 Daily Chests",
    pricingTitle: "Simple pricing for teachers",
    pricingSubtitle: "Start with 14 days of Pro free — no credit card required.",
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
    pricingProTrialNote: "14-day free trial — no card required",
    pricingProFeature1: "Everything in Free, plus:",
    pricingProFeature2: "Unlimited classes",
    pricingProFeature3: "Unlimited students",
    pricingProFeature4: "AI Sentence Builder",
    pricingProFeature5: "Camera OCR for custom word lists",
    pricingProFeature6: "Advanced analytics",
    pricingProFeature7: "Priority support",
    pricingProCta: "Start 14-day free trial",
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
    footerStartLearning: "Start Learning",
  },
  he: {
    navDemo: "הדגמה",
    heroV2: {
      eyebrow: "משחק אוצר המילים שתלמידים באמת אוהבים לשחק",
      staffTitle: "מורים ומנהלים",
      staffDesc: "בנו כיתות, עקבו אחרי כל תלמיד, ונהלו את כל בית הספר ממקום אחד.",
      staffNote: "Google או אימייל · התחלה חינם",
      studentDesc: "קיבלתם קוד כיתה מהמורה? הצטרפו והתחילו לשחק מיד.",
      studentCta: "הזינו קוד כיתה",
      studentNote: "לא נדרש חשבון",
      demoCta: "נסו את ההדגמה",
      demoNote: "ללא הרשמה",
      or: "או",
    },
    navTryDemo: "שחקו עכשיו",
    navTryDemoShort: "שחקו",
    navCefrBadge: "CEFR A1–B2",
    navStudents: "תלמידים",
    navAi: "בינה מלאכותית",
    navTeachers: "מורים",
    navCurriculum: "תכנית לימודים",
    navVocas: "ווקות",
    navPricing: "מחירים",
    navForSchools: "לבתי ספר",
    navResources: "משאבים",
    navGuides: "מדריכים",
    navFaq: "שאלות נפוצות",
    navSignIn: "התחברות",
    navStartFree: "התחילו בחינם",
    heroSignInForTeachers: "למורות ומורים",
    navMenuOpen: "פתיחת תפריט",
    navMenuClose: "סגירת תפריט",
    heroTitleLine1: "שדרגו",
    heroTitleLine2: "את אוצר המילים",
    heroSubtitle: "משחק אוצר מילים שתלמידים בכל העולם באמת רוצים לשחק — וכלי הכיתה הקל ביותר שמורים ישתמשו בו לאורך כל השנה.",
    heroCtaStart: "התחילו בחינם",
    heroCtaStudent: "אני תלמיד ← הזינו קוד כיתה",
    heroPlayItWord: "שחקו אותה",
    heroLearnItWord: "למדו אותה",
    heroTrustCurriculum: "מותאם לתוכנית משרד החינוך",
    heroTrustTrilingual: "עברית · ערבית · אנגלית",
    heroTrustEu: "מאוחסן באירופה · GDPR",
    heroTrustOrigin: "פותח בישראל",
    floatingCardModes: "🎮 15 מצבי משחק",
    floatingCardXp: "⭐ צבור נקודות",
    floatingCardStreaks: "🔥 רצף יומי",
    floatingCardEggs: "🎁 תיבות יומיות",
    pricingTitle: "מחירים פשוטים למורים",
    pricingSubtitle: "התחילו עם 14 ימי Pro חינם — בלי כרטיס אשראי.",
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
    pricingProTrialNote: "14 ימי ניסיון חינם — בלי כרטיס אשראי",
    pricingProFeature1: "כל מה שבחינם, ובנוסף:",
    pricingProFeature2: "כיתות ללא הגבלה",
    pricingProFeature3: "תלמידים ללא הגבלה",
    pricingProFeature4: "בונה משפטים AI",
    pricingProFeature5: "סריקת מצלמה לרשימות מילים",
    pricingProFeature6: "אנליטיקה מתקדמת",
    pricingProFeature7: "תמיכה מועדפת",
    pricingProCta: "התחילו ניסיון חינם של 14 יום",
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
    footerStartLearning: "התחילו ללמוד",
  },
  ar: {
    navDemo: "تجربة",
    heroV2: {
      eyebrow: "لعبة المفردات التي يحب الطلاب لعبها فعلاً",
      staffTitle: "المعلمون والمديرون",
      staffDesc: "أنشئ الصفوف، وتابع كل طالب، وأشرف على مدرستك بالكامل من مكان واحد.",
      staffNote: "Google أو البريد الإلكتروني · ابدأ مجانًا",
      studentDesc: "هل لديك رمز صف من معلمك؟ انضم وابدأ اللعب على الفور.",
      studentCta: "أدخل رمز الصف",
      studentNote: "لا حاجة إلى حساب",
      demoCta: "جرّب العرض التجريبي",
      demoNote: "بدون تسجيل",
      or: "أو",
    },
    navTryDemo: "العب الآن",
    navTryDemoShort: "العب",
    navCefrBadge: "CEFR A1–B2",
    navStudents: "الطلاب",
    navAi: "الذكاء الاصطناعي",
    navTeachers: "المعلمون",
    navCurriculum: "المنهاج",
    navVocas: "Vocas",
    navPricing: "الأسعار",
    navForSchools: "للمدارس",
    navResources: "المصادر",
    navGuides: "أدلة",
    navFaq: "الأسئلة الشائعة",
    navSignIn: "تسجيل الدخول",
    navStartFree: "ابدأ مجانًا",
    heroSignInForTeachers: "للمعلمين والمعلمات",
    navMenuOpen: "فتح القائمة",
    navMenuClose: "إغلاق القائمة",
    heroTitleLine1: "ارتقِ",
    heroTitleLine2: "بمفرداتك",
    heroSubtitle: "لعبة المفردات التي يريد الطلاب حول العالم أن يلعبوها فعلاً — وأسهل أداة صفية سيستخدمها المعلمون طوال العام.",
    heroCtaStart: "ابدأ مجانًا",
    heroCtaStudent: "أنا طالب ← أدخل رمز الفصل",
    heroPlayItWord: "العبها",
    heroLearnItWord: "تعلمها",
    heroTrustCurriculum: "متوافق مع منهج وزارة التربية",
    heroTrustTrilingual: "العربية · العبرية · الإنجليزية",
    heroTrustEu: "مستضاف في أوروبا · GDPR",
    heroTrustOrigin: "صُنع في إسرائيل",
    floatingCardModes: "🎮 15 لعبة",
    floatingCardXp: "⭐ اكسب النقاط",
    floatingCardStreaks: "🔥 سلسلة أيام",
    floatingCardEggs: "🎁 صناديق يومية",
    pricingTitle: "أسعار بسيطة للمعلمين",
    pricingSubtitle: "ابدأ بـ 14 يومًا من Pro مجانًا — بدون بطاقة ائتمان.",
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
    pricingProTrialNote: "تجربة مجانية لـ 14 يومًا — بدون بطاقة",
    pricingProFeature1: "كل ما في المجاني، بالإضافة إلى:",
    pricingProFeature2: "صفوف بلا حدود",
    pricingProFeature3: "طلاب بلا حدود",
    pricingProFeature4: "منشئ الجمل بالذكاء الاصطناعي",
    pricingProFeature5: "مسح ضوئي لقوائم الكلمات المخصصة",
    pricingProFeature6: "تحليلات متقدمة",
    pricingProFeature7: "دعم ذو أولوية",
    pricingProCta: "ابدأ تجربة 14 يومًا مجانًا",
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
    footerStartLearning: "ابدأ التعلم",
  },
  ru: {
    navDemo: "Demo",
    heroV2: {
      eyebrow: "The vocabulary game students actually want to play",
      staffTitle: "Teachers & Principals",
      staffDesc: "Build classes, track every student, and oversee your whole school from one place.",
      staffNote: "Google or email · free to start",
      studentDesc: "Got a class code from your teacher? Jump in and start playing right away.",
      studentCta: "Enter class code",
      studentNote: "No account needed",
      demoCta: "Try the live demo",
      demoNote: "no sign-up",
      or: "or",
    },
    navTryDemo: "PLAY NOW",
    navTryDemoShort: "PLAY",
    navCefrBadge: "CEFR A1–B2",
    navStudents: "Students",
    navAi: "AI",
    navTeachers: "Teachers",
    navCurriculum: "Curriculum",
    navVocas: "Vocas",
    navPricing: "Pricing",
    navForSchools: "For Schools",
    navResources: "Resources",
    navGuides: "Guides",
    navFaq: "FAQ",
    navSignIn: "Sign in",
    navStartFree: "Start free",
    heroSignInForTeachers: "for teachers",
    navMenuOpen: "Open menu",
    navMenuClose: "Close menu",
    heroTitleLine1: "Level Up",
    heroTitleLine2: "Your Vocabulary",
    heroSubtitle: "The vocabulary game students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    heroCtaStart: "Get Started Free",
    heroCtaStudent: "I'm a student → enter class code",
    heroPlayItWord: "Play it",
    heroLearnItWord: "Learn it",
    heroTrustCurriculum: "MoE-Aligned Curriculum",
    heroTrustTrilingual: "Hebrew · Arabic · English",
    heroTrustEu: "EU-Hosted · GDPR",
    heroTrustOrigin: "Built in Israel",
    floatingCardModes: "🎮 15 Game Modes",
    floatingCardXp: "⭐ Earn XP",
    floatingCardStreaks: "🔥 Daily Streaks",
    floatingCardEggs: "🎁 Daily Chests",
    pricingTitle: "Simple pricing for teachers",
    pricingSubtitle: "Start with 14 days of Pro free — no credit card required.",
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
    pricingProTrialNote: "14-day free trial — no card required",
    pricingProFeature1: "Everything in Free, plus:",
    pricingProFeature2: "Unlimited classes",
    pricingProFeature3: "Unlimited students",
    pricingProFeature4: "AI Sentence Builder",
    pricingProFeature5: "Camera OCR for custom word lists",
    pricingProFeature6: "Advanced analytics",
    pricingProFeature7: "Priority support",
    pricingProCta: "Start 14-day free trial",
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
    footerStartLearning: "Start Learning",
  },
};
