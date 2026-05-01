/**
 * Locale file for the public landing page (vocaband.com root) and
 * the public-nav chrome shared across all logged-out surfaces.
 *
 * Coverage in this initial commit (the high-impact above-the-fold
 * surface a first-time visitor sees and judges):
 *   - Hero headline + subtitle + primary CTAs
 *   - Floating-card labels in the hero
 *   - Social proof line
 *   - Section H2 headings + section subtitles
 *   - Final CTA + its supporting copy
 *   - PublicNav chrome (Try Demo button + CEFR badge)
 *   - Footer copyright line
 *
 * Out-of-scope follow-up (still hardcoded English in LandingPage):
 *   - Feature card BODY copy (game-mode descriptions, teacher-feature
 *     blurbs, curriculum-set descriptions, Voca-family roadmap tags)
 *   - Section pills ("For Teachers", "Coming Soon")
 *   - Detailed footer link labels
 *
 * Those are scoped per-card and will be added in a follow-up commit
 * once we've shipped + tested the hero translation end-to-end with
 * a real teacher.
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
  heroSocialProofCount: string;
  heroSocialProofTagline: string;

  // ─── Floating hero cards ────────────────────────────────────────
  floatingCardModes: string;
  floatingCardXp: string;
  floatingCardStreaks: string;
  floatingCardEggs: string;

  // ─── Section: Why Students Love Vocaband ───────────────────────
  studentsSectionH2: string;
  studentsSectionSubtitle: string;

  // ─── Section: The Easiest Tool You'll Use All Year (teachers) ──
  teachersSectionPill: string;
  teachersSectionH2: string;
  teachersSectionSubtitle: string;

  // ─── Section: Curriculum (Sets 1/2/3) ──────────────────────────
  curriculumSectionH2: string;
  curriculumSectionSubtitle: string;

  // ─── Section: The Voca Family (roadmap) ────────────────────────
  vocaFamilyPill: string;
  vocaFamilyH2: string;
  vocaFamilySubtitle: string;
  vocaFamilyComingSoon: string;
  vocaFamilyRequestLine: string;
  vocaFamilyRequestCta: string;

  // ─── Final CTA section ─────────────────────────────────────────
  finalCtaH2Line1: string;
  finalCtaH2Line2: string;
  finalCtaSubtitle: string;
  finalCtaStart: string;
  finalCtaTeacher: string;

  // ─── Footer ─────────────────────────────────────────────────────
  footerCopyright: (year: number) => string;
}

export const landingPageT: Record<Language, LandingPageT> = {
  en: {
    navTryDemo: "TRY DEMO",
    navTryDemoShort: "DEMO",
    navCefrBadge: "CEFR A1–B2",

    heroTitleLine1: "Level Up",
    heroTitleLine2: "Your Vocabulary",
    heroSubtitle:
      "The vocabulary game students worldwide actually want to play — and the easiest classroom tool teachers will use all year.",
    heroCtaStart: "Start Learning",
    heroCtaTeacher: "Teacher Login",
    heroSocialProofCount: "10,000+ Students",
    heroSocialProofTagline: "Learning English worldwide",

    floatingCardModes: "11 Game Modes",
    floatingCardXp: "Earn XP",
    floatingCardStreaks: "Daily Streaks",
    floatingCardEggs: "Mystery Eggs",

    studentsSectionH2: "Why Students Love Vocaband",
    studentsSectionSubtitle: "Everything you need to master vocabulary, gamified.",

    teachersSectionPill: "For Teachers",
    teachersSectionH2: "The Easiest Tool You'll Use All Year",
    teachersSectionSubtitle:
      "Zero prep, zero paperwork, zero learning curve. Teach more, click less.",

    curriculumSectionH2: "Your Journey to Mastery",
    curriculumSectionSubtitle:
      "Aligned with CEFR A1 to B2 — three comprehensive vocabulary sets covering 6,500+ words.",

    vocaFamilyPill: "Coming Soon",
    vocaFamilyH2: "The Voca Family",
    vocaFamilySubtitle:
      "We're starting with English vocabulary — but the same gameplay engine teaches anything. Subjects on the roadmap, by teacher demand:",
    vocaFamilyComingSoon: "Soon",
    vocaFamilyRequestLine: "Teach a different subject? Tell us which Voca to build next:",
    vocaFamilyRequestCta: "Request a subject",

    finalCtaH2Line1: "Ready to Become a",
    finalCtaH2Line2: "Vocabulary Legend?",
    finalCtaSubtitle:
      "Join thousands of students leveling up their English — one word at a time.",
    finalCtaStart: "Start Learning Free",
    finalCtaTeacher: "Teacher Login",

    footerCopyright: (year) =>
      `© ${year} Vocaband. Made with 💙 for learners everywhere.`,
  },

  he: {
    navTryDemo: "נסה דמו",
    navTryDemoShort: "דמו",
    navCefrBadge: "CEFR A1–B2",

    heroTitleLine1: "שדרגו",
    heroTitleLine2: "את אוצר המילים",
    heroSubtitle:
      "משחק אוצר מילים שתלמידים בכל העולם באמת רוצים לשחק — וכלי הכיתה הקל ביותר שמורים ישתמשו בו לאורך כל השנה.",
    heroCtaStart: "התחילו ללמוד",
    heroCtaTeacher: "כניסת מורים",
    heroSocialProofCount: "+10,000 תלמידים",
    heroSocialProofTagline: "לומדים אנגלית בכל העולם",

    floatingCardModes: "11 מצבי משחק",
    floatingCardXp: "צברו XP",
    floatingCardStreaks: "רצפים יומיים",
    floatingCardEggs: "ביצי הפתעה",

    studentsSectionH2: "למה תלמידים אוהבים את Vocaband",
    studentsSectionSubtitle: "כל מה שצריך כדי לשלוט באוצר מילים — בצורה משחקית.",

    teachersSectionPill: "למורים",
    teachersSectionH2: "הכלי הכי קל שתשתמשו בו השנה",
    teachersSectionSubtitle:
      "אפס הכנה, אפס ניירת, אפס עקומת למידה. ללמד יותר, ללחוץ פחות.",

    curriculumSectionH2: "המסע שלך לשליטה",
    curriculumSectionSubtitle:
      "מותאם ל-CEFR מ-A1 עד B2 — שלוש סטים מקיפים של אוצר מילים עם +6,500 מילים.",

    vocaFamilyPill: "בקרוב",
    vocaFamilyH2: "משפחת Voca",
    vocaFamilySubtitle:
      "אנחנו מתחילים עם אוצר מילים באנגלית — אבל אותו מנוע משחק מלמד כל נושא. המקצועות על המפה, לפי בקשת המורים:",
    vocaFamilyComingSoon: "בקרוב",
    vocaFamilyRequestLine: "מלמדים מקצוע אחר? ספרו לנו איזה Voca לבנות הבא:",
    vocaFamilyRequestCta: "בקשו מקצוע",

    finalCtaH2Line1: "מוכנים להפוך ל",
    finalCtaH2Line2: "אגדת אוצר מילים?",
    finalCtaSubtitle:
      "הצטרפו לאלפי תלמידים שמשדרגים את האנגלית שלהם — מילה אחת בכל פעם.",
    finalCtaStart: "התחילו ללמוד חינם",
    finalCtaTeacher: "כניסת מורים",

    footerCopyright: (year) =>
      `© ${year} Vocaband. נוצר עם 💙 ללומדים בכל העולם.`,
  },

  ar: {
    navTryDemo: "جرّب العرض",
    navTryDemoShort: "عرض",
    navCefrBadge: "CEFR A1–B2",

    heroTitleLine1: "ارتقِ",
    heroTitleLine2: "بمفرداتك",
    heroSubtitle:
      "لعبة المفردات التي يريد الطلاب حول العالم أن يلعبوها فعلاً — وأسهل أداة صفية سيستخدمها المعلمون طوال العام.",
    heroCtaStart: "ابدأ التعلم",
    heroCtaTeacher: "دخول المعلمين",
    heroSocialProofCount: "+10,000 طالب",
    heroSocialProofTagline: "يتعلمون الإنجليزية حول العالم",

    floatingCardModes: "11 وضع لعب",
    floatingCardXp: "اكسب XP",
    floatingCardStreaks: "سلاسل يومية",
    floatingCardEggs: "بيوض المفاجآت",

    studentsSectionH2: "لماذا يحب الطلاب Vocaband",
    studentsSectionSubtitle: "كل ما تحتاجه لإتقان المفردات، بأسلوب لعبة.",

    teachersSectionPill: "للمعلمين",
    teachersSectionH2: "أسهل أداة ستستخدمها طوال العام",
    teachersSectionSubtitle:
      "بلا تحضير، بلا أوراق، بلا منحنى تعلّم. علّم أكثر، انقر أقل.",

    curriculumSectionH2: "رحلتك نحو الإتقان",
    curriculumSectionSubtitle:
      "متوافق مع CEFR من A1 إلى B2 — ثلاث مجموعات شاملة من المفردات تغطي +6,500 كلمة.",

    vocaFamilyPill: "قريباً",
    vocaFamilyH2: "عائلة Voca",
    vocaFamilySubtitle:
      "نبدأ بالمفردات الإنجليزية — لكن المحرك نفسه يعلّم أي مادة. المواد المخططة، بحسب طلب المعلمين:",
    vocaFamilyComingSoon: "قريباً",
    vocaFamilyRequestLine: "تعلّم مادة مختلفة؟ أخبرنا أيّ Voca نبني تالياً:",
    vocaFamilyRequestCta: "اطلب مادة",

    finalCtaH2Line1: "جاهز لتصبح",
    finalCtaH2Line2: "أسطورة مفردات؟",
    finalCtaSubtitle:
      "انضم إلى آلاف الطلاب الذين يطورون إنجليزيتهم — كلمة واحدة في كل مرة.",
    finalCtaStart: "ابدأ التعلم مجاناً",
    finalCtaTeacher: "دخول المعلمين",

    footerCopyright: (year) =>
      `© ${year} Vocaband. صُنع بحب 💙 للمتعلمين في كل مكان.`,
  },
};
