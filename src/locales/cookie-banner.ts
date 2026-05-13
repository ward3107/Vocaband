/**
 * cookie-banner.ts — i18n strings for the CookieBanner component
 * that appears on the bottom of every public page until accepted.
 *
 * Sits at the top of src/locales/ (not under /teacher or /student)
 * because the banner is visible to everyone — including unauthenticated
 * visitors who have no role yet.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../hooks/useLanguage";

export interface CookieBannerStrings {
  // Header copy
  heroMain: string;
  heroSub: string;

  // Expanded panel
  preferencesTitle: string;
  requiredBadge: string;

  // Categories
  essentialName: string;
  essentialDescription: string;
  analyticsName: string;
  analyticsDescription: string;
  functionalName: string;
  functionalDescription: string;

  // Action buttons
  less: string;
  customize: string;
  savePreferences: string;
  acceptAll: string;
}

export const cookieBannerT: Record<Language, CookieBannerStrings> = {
  en: {
    heroMain: "We use cookies to enhance your learning experience. By continuing to browse, you agree to our use of cookies.",
    heroSub: "EU-hosted • No third-party trackers • You can change this anytime in settings.",
    preferencesTitle: "Cookie Preferences",
    requiredBadge: "Required",
    essentialName: "Essential Cookies",
    essentialDescription: "Required for the website to function. Includes authentication and security.",
    analyticsName: "Analytics Cookies",
    analyticsDescription: "Help us understand how you use the site so we can improve your experience.",
    functionalName: "Functional Cookies",
    functionalDescription: "Remember your preferences like theme, language, and game settings.",
    less: "Less",
    customize: "Customize",
    savePreferences: "Save Preferences",
    acceptAll: "Accept All",
  },
  he: {
    heroMain: "אנו משתמשים בעוגיות כדי לשפר את חוויית הלמידה שלכם. המשך הגלישה מהווה הסכמה לשימוש בעוגיות.",
    heroSub: "אירוח באירופה • ללא מעקבי צד שלישי • אפשר לשנות בכל עת בהגדרות.",
    preferencesTitle: "העדפות עוגיות",
    requiredBadge: "נדרש",
    essentialName: "עוגיות חיוניות",
    essentialDescription: "נדרשות לתפקוד האתר. כוללות אימות ואבטחה.",
    analyticsName: "עוגיות אנליטיקה",
    analyticsDescription: "עוזרות לנו להבין איך אתם משתמשים באתר כדי שנוכל לשפר את החוויה.",
    functionalName: "עוגיות פונקציונליות",
    functionalDescription: "זוכרות את ההעדפות שלכם — ערכת נושא, שפה, והגדרות משחק.",
    less: "פחות",
    customize: "התאמה אישית",
    savePreferences: "שמירת העדפות",
    acceptAll: "אישור הכול",
  },
  ar: {
    heroMain: "نستخدم ملفات تعريف الارتباط لتحسين تجربة التعلّم. بمتابعة التصفّح فإنك توافق على استخدامنا لها.",
    heroSub: "مستضاف في أوروبا • لا متتبّعات طرف ثالث • يمكنك التغيير في أي وقت من الإعدادات.",
    preferencesTitle: "تفضيلات ملفات تعريف الارتباط",
    requiredBadge: "مطلوب",
    essentialName: "ملفات أساسية",
    essentialDescription: "مطلوبة لعمل الموقع. تشمل المصادقة والأمان.",
    analyticsName: "ملفات تحليلية",
    analyticsDescription: "تساعدنا على فهم كيفية استخدامك للموقع لتحسين تجربتك.",
    functionalName: "ملفات وظيفية",
    functionalDescription: "تتذكّر تفضيلاتك مثل المظهر واللغة وإعدادات اللعب.",
    less: "أقل",
    customize: "تخصيص",
    savePreferences: "حفظ التفضيلات",
    acceptAll: "قبول الكل",
  },
};
