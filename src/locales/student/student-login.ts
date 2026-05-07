/**
 * student-login.ts — i18n strings for StudentAccountLoginView (the
 * class-code + Google-OAuth entry screen students hit when they tap
 * "Get Started" on the landing page).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface StudentLoginStrings {
  // Header
  back: string;
  student: string;

  // Hero
  /** Two-line hero h1 — kept as separate strings so the visible <br />
   *  doesn't have to be embedded in the locale text. */
  heroLine1: string;
  heroLine2: string;
  heroSubtitle: string;

  // Class-code entry
  classCodeLabel: string;
  classCodeAria: string;
  classCodeHint: string;

  // Microsoft OAuth button label (covers MoE @edu.gov.il accounts)
  signInWithMicrosoft: string;

  // Footer copy under the Google button
  signedInBefore: string;
  firstTime: string;

  // Feature chips
  features: { emoji: string; text: string }[];
}

export const studentLoginT: Record<Language, StudentLoginStrings> = {
  en: {
    back: "Back",
    student: "Student",
    heroLine1: "Join your",
    heroLine2: "class.",
    heroSubtitle: "Play to learn English.",
    classCodeLabel: "Class code from your teacher",
    classCodeAria: "Class code",
    classCodeHint: "Got a link from your teacher? Paste it — we'll pull out the code.",
    signInWithMicrosoft: "Sign in with Microsoft",
    signedInBefore: "Sign in with the same Google account every time to keep your XP and streak.",
    firstTime: "First time? Type your class code above, then sign in with Google. Your teacher approves new students from the dashboard.",
    features: [
      { emoji: "🏆", text: "Earn XP" },
      { emoji: "🎯", text: "Beat your friends" },
      { emoji: "🎨", text: "Unlock avatars" },
      { emoji: "⚡", text: "Live challenges" },
    ],
  },
  he: {
    back: "חזרה",
    student: "תלמיד",
    heroLine1: "הצטרפו",
    heroLine2: "לכיתה.",
    heroSubtitle: "שחקו ולמדו אנגלית.",
    classCodeLabel: "קוד הכיתה מהמורה",
    classCodeAria: "קוד הכיתה",
    classCodeHint: "קיבלתם קישור מהמורה? הדביקו אותו — נחלץ את הקוד אוטומטית.",
    signInWithMicrosoft: "התחבר עם Microsoft",
    signedInBefore: "התחברו תמיד עם אותו חשבון Google כדי לשמור על XP והרצף שלכם.",
    firstTime: "פעם ראשונה? הקלידו את קוד הכיתה למעלה, ואז התחברו עם Google. המורה מאשר תלמידים חדשים מהלוח.",
    features: [
      { emoji: "🏆", text: "צברו XP" },
      { emoji: "🎯", text: "נצחו את החברים" },
      { emoji: "🎨", text: "פתחו אווטרים" },
      { emoji: "⚡", text: "אתגרים חיים" },
    ],
  },
  ar: {
    back: "رجوع",
    student: "طالب",
    heroLine1: "انضم إلى",
    heroLine2: "صفك.",
    heroSubtitle: "العب لتتعلم الإنجليزية.",
    classCodeLabel: "رمز الصف من معلمك",
    classCodeAria: "رمز الصف",
    classCodeHint: "حصلت على رابط من معلمك؟ الصقه — سنستخرج الرمز تلقائياً.",
    signInWithMicrosoft: "تسجيل الدخول بحساب Microsoft",
    signedInBefore: "سجّل الدخول دائماً بنفس حساب Google للحفاظ على نقاط XP والسلسلة.",
    firstTime: "أول مرة؟ اكتب رمز الصف أعلاه ثم سجّل الدخول بـ Google. سيعتمد المعلم الطلاب الجدد من لوحة التحكم.",
    features: [
      { emoji: "🏆", text: "اكسب XP" },
      { emoji: "🎯", text: "تغلّب على أصدقائك" },
      { emoji: "🎨", text: "افتح الأفاتارات" },
      { emoji: "⚡", text: "تحديات مباشرة" },
    ],
  },
};
