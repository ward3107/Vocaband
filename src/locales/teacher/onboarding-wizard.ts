/**
 * Locale file for TeacherOnboardingWizard — the first-sign-in flow
 * that walks a brand-new teacher through creating their first class
 * + assignment.
 *
 * Pattern matches src/locales/teacher/wizards.ts (see docs/I18N-MIGRATION.md).
 * All strings are interpolation-safe; helpers accept primitives and
 * return strings so the wizard can compose them inline.
 */
import type { Language } from "../../hooks/useLanguage";

export interface OnboardingWizardT {
  // ─── Header / chrome ────────────────────────────────────────────
  skip: string;

  // ─── Step 0 — Welcome + pack picker ────────────────────────────
  welcomeHeading: string;
  welcomeSubtitle: string;
  pickStarterPackLabel: string;

  pack1Label: string;
  pack1Subtitle: string;
  pack1Samples: string;

  pack2Label: string;
  pack2Subtitle: string;
  pack2Samples: string;

  pack3Label: string;
  pack3Subtitle: string;
  pack3Samples: string;

  packCustomLabel: string;
  packCustomSubtitle: string;
  packCustomSamples: string;

  // ─── Step 1 — Class name ───────────────────────────────────────
  nameClassHeading: string;
  nameClassSubtitle: string;
  classNamePlaceholder: string;
  classNameHelp: string;
  defaultClassName: (teacherName: string) => string;

  // ─── Step 2 — Mode picker ──────────────────────────────────────
  pickModesHeading: string;
  pickModesSubtitle: string;
  modeFlashcards: string;
  modeClassic: string;
  modeMatching: string;
  modeListening: string;
  modeTrueFalse: string;
  modeSpelling: string;
  modeScramble: string;
  modeReverse: string;
  modesSelectedCount: (n: number) => string;

  // ─── Step 3 — Success ──────────────────────────────────────────
  successHeading: string;
  successSubtitle: string;
  yourClassCodeLabel: string;
  whatNextHeading: string;
  whatNextStep1: string;
  whatNextStep2: string;
  whatNextStep3: string;
  copyCode: string;
  copied: string;
  shareWhatsApp: string;
  whatsAppMessage: (code: string) => string;

  // ─── Footer CTAs ──────────────────────────────────────────────
  next: string;
  back: string;
  creatingClass: string;
  createClass: string;
  openDashboard: string;
}

export const onboardingWizardT: Record<Language, OnboardingWizardT> = {
  en: {
    skip: "Skip",

    welcomeHeading: "Welcome to Vocaband",
    welcomeSubtitle: "Let's set up your first class in under a minute.",
    pickStarterPackLabel: "Choose a starter word pack",

    pack1Label: "Foundation",
    pack1Subtitle: "Everyday English — best for grades 4–5",
    pack1Samples: "school · water · family · friend · happy",

    pack2Label: "Building blocks",
    pack2Subtitle: "Common school words — best for grades 6–7",
    pack2Samples: "weather · country · decide · special · finally",

    pack3Label: "Bridge to fluency",
    pack3Subtitle: "Advanced vocabulary — best for grades 8–9",
    pack3Samples: "economy · environment · achievement · recommend",

    packCustomLabel: "I'll add my own",
    packCustomSubtitle: "Skip the starter pack — type or upload later",
    packCustomSamples: "",

    nameClassHeading: "Name your class",
    nameClassSubtitle: "Students will see this when they join.",
    classNamePlaceholder: "e.g. 5th Grade English",
    classNameHelp: "You can rename this or add more classes anytime.",
    defaultClassName: (teacherName) =>
      teacherName ? `${teacherName}'s class` : "My first class",

    pickModesHeading: "Pick game modes",
    pickModesSubtitle: "We've pre-checked the popular ones. Change anytime.",
    modeFlashcards: "Flashcards",
    modeClassic: "Classic",
    modeMatching: "Matching",
    modeListening: "Listening",
    modeTrueFalse: "True / False",
    modeSpelling: "Spelling",
    modeScramble: "Scramble",
    modeReverse: "Reverse",
    modesSelectedCount: (n) =>
      n === 1 ? "1 mode selected" : `${n} modes selected`,

    successHeading: "You're all set!",
    successSubtitle: "Your class is ready. Here's what to do next.",
    yourClassCodeLabel: "Your class code",
    whatNextHeading: "Three quick steps",
    whatNextStep1: "Share the code below with your students.",
    whatNextStep2: "They go to vocaband.com and tap \"Join class\".",
    whatNextStep3: "Approve them on your dashboard and they're in.",
    copyCode: "Copy code",
    copied: "Copied!",
    shareWhatsApp: "Share via WhatsApp",
    whatsAppMessage: (code) =>
      `Join my Vocaband class!\n\nClass code: ${code}\n\nGo to https://vocaband.com and tap "Join class".`,

    next: "Next",
    back: "Back",
    creatingClass: "Setting things up…",
    createClass: "Create class",
    openDashboard: "Open my dashboard",
  },

  he: {
    skip: "דלג",

    welcomeHeading: "ברוכים הבאים ל-Vocaband",
    welcomeSubtitle: "בואו ניצור את הכיתה הראשונה שלך — פחות מדקה.",
    pickStarterPackLabel: "בחרו ערכת מילים להתחלה",

    pack1Label: "בסיס",
    pack1Subtitle: "אנגלית יומיומית — מומלץ לכיתות ד׳–ה׳",
    pack1Samples: "school · water · family · friend · happy",

    pack2Label: "אבני בניין",
    pack2Subtitle: "מילים נפוצות בבית הספר — מומלץ לכיתות ו׳–ז׳",
    pack2Samples: "weather · country · decide · special · finally",

    pack3Label: "גשר לשטף",
    pack3Subtitle: "אוצר מילים מתקדם — מומלץ לכיתות ח׳–ט׳",
    pack3Samples: "economy · environment · achievement · recommend",

    packCustomLabel: "אעלה רשימה משלי",
    packCustomSubtitle: "דלג על הערכה — אפשר להקליד או להעלות אחר כך",
    packCustomSamples: "",

    nameClassHeading: "תנו שם לכיתה",
    nameClassSubtitle: "התלמידים יראו את השם הזה כשהם מצטרפים.",
    classNamePlaceholder: "למשל: כיתה ה׳ אנגלית",
    classNameHelp: "אפשר לשנות את השם או להוסיף כיתות בכל זמן.",
    defaultClassName: (teacherName) =>
      teacherName ? `הכיתה של ${teacherName}` : "הכיתה הראשונה שלי",

    pickModesHeading: "בחרו מצבי משחק",
    pickModesSubtitle: "סימנו את הפופולריים מראש. אפשר לשנות בכל עת.",
    modeFlashcards: "כרטיסיות",
    modeClassic: "קלאסי",
    modeMatching: "התאמה",
    modeListening: "האזנה",
    modeTrueFalse: "נכון / לא נכון",
    modeSpelling: "איות",
    modeScramble: "ערבוב אותיות",
    modeReverse: "הפוך",
    modesSelectedCount: (n) => (n === 1 ? "מצב 1 נבחר" : `${n} מצבים נבחרו`),

    successHeading: "הכל מוכן! 🎉",
    successSubtitle: "הכיתה שלך פתוחה. הנה מה שעושים עכשיו.",
    yourClassCodeLabel: "קוד הכיתה שלך",
    whatNextHeading: "שלושה צעדים מהירים",
    whatNextStep1: "שתפו את הקוד עם התלמידים שלכם.",
    whatNextStep2: "הם נכנסים ל-vocaband.com ולוחצים על \"הצטרף לכיתה\".",
    whatNextStep3: "אשרו אותם בלוח הבקרה והם בתוך הכיתה.",
    copyCode: "העתק קוד",
    copied: "הועתק!",
    shareWhatsApp: "שתף בוואטסאפ",
    whatsAppMessage: (code) =>
      `הצטרפו לכיתה שלי ב-Vocaband!\n\nקוד הכיתה: ${code}\n\nכנסו ל-https://vocaband.com ולחצו על "הצטרף לכיתה".`,

    next: "הבא",
    back: "חזור",
    creatingClass: "מכין הכל…",
    createClass: "צור כיתה",
    openDashboard: "פתח את לוח הבקרה",
  },

  ar: {
    skip: "تخطي",

    welcomeHeading: "أهلًا بك في Vocaband",
    welcomeSubtitle: "لنُجهّز صفّك الأول في أقل من دقيقة.",
    pickStarterPackLabel: "اختر باقة كلمات للبدء",

    pack1Label: "الأساس",
    pack1Subtitle: "إنجليزية يومية — الأنسب للصفوف 4–5",
    pack1Samples: "school · water · family · friend · happy",

    pack2Label: "لبنات البناء",
    pack2Subtitle: "كلمات مدرسية شائعة — الأنسب للصفوف 6–7",
    pack2Samples: "weather · country · decide · special · finally",

    pack3Label: "جسر إلى الطلاقة",
    pack3Subtitle: "مفردات متقدمة — الأنسب للصفوف 8–9",
    pack3Samples: "economy · environment · achievement · recommend",

    packCustomLabel: "سأضيف قائمتي الخاصة",
    packCustomSubtitle: "تخطّ الباقة — يمكنك الكتابة أو الرفع لاحقًا",
    packCustomSamples: "",

    nameClassHeading: "سمِّ صفّك",
    nameClassSubtitle: "سيرى الطلاب هذا الاسم عند الانضمام.",
    classNamePlaceholder: "مثلًا: الصف الخامس إنجليزي",
    classNameHelp: "يمكنك إعادة التسمية أو إضافة صفوف في أي وقت.",
    defaultClassName: (teacherName) =>
      teacherName ? `صفّ ${teacherName}` : "صفّي الأول",

    pickModesHeading: "اختر أنماط اللعب",
    pickModesSubtitle: "حددنا الشائعة مسبقًا. يمكنك التعديل لاحقًا.",
    modeFlashcards: "بطاقات",
    modeClassic: "كلاسيكي",
    modeMatching: "مطابقة",
    modeListening: "استماع",
    modeTrueFalse: "صح / خطأ",
    modeSpelling: "إملاء",
    modeScramble: "تركيب الحروف",
    modeReverse: "عكسي",
    modesSelectedCount: (n) => (n === 1 ? "نمط واحد مختار" : `${n} أنماط مختارة`),

    successHeading: "كل شيء جاهز! 🎉",
    successSubtitle: "صفّك جاهز. إليك ما عليك فعله الآن.",
    yourClassCodeLabel: "رمز صفّك",
    whatNextHeading: "ثلاث خطوات سريعة",
    whatNextStep1: "شارك الرمز التالي مع طلابك.",
    whatNextStep2: "يدخلون إلى vocaband.com ويضغطون \"انضم للصف\".",
    whatNextStep3: "وافق عليهم من لوحة التحكم وسينضمّون.",
    copyCode: "نسخ الرمز",
    copied: "تم النسخ!",
    shareWhatsApp: "مشاركة عبر واتساب",
    whatsAppMessage: (code) =>
      `انضم إلى صفّي على Vocaband!\n\nرمز الصف: ${code}\n\nادخل إلى https://vocaband.com واضغط "انضم للصف".`,

    next: "التالي",
    back: "رجوع",
    creatingClass: "جارٍ الإعداد…",
    createClass: "إنشاء الصف",
    openDashboard: "افتح لوحة التحكم",
  },
};
