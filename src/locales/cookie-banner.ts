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
  rejectAll: string;
}

export const cookieBannerT: Record<Language, CookieBannerStrings> = {
  en: {
    heroMain: "We use cookies to enhance your learning experience. Choose how you'd like us to use them — analytics and functional cookies are off by default until you accept.",
    heroSub: "EU-hosted • No third-party trackers • You can change this anytime in Privacy Settings.",
    preferencesTitle: "Cookie Preferences",
    requiredBadge: "Required",
    essentialName: "Essential Cookies",
    essentialDescription: "Required for the website to function. Includes authentication and security.",
    analyticsName: "Analytics Cookies",
    analyticsDescription: "Help us understand how you use the site so we can improve your experience. Includes error reporting (Sentry).",
    functionalName: "Functional Cookies",
    functionalDescription: "Remember your preferences like theme, language, and game settings.",
    less: "Less",
    customize: "Customize",
    savePreferences: "Save Preferences",
    acceptAll: "Accept All",
    rejectAll: "Reject All",
  },
  he: {
    heroMain: "אנו משתמשים בעוגיות כדי לשפר את חוויית הלמידה. בחרו איך תרצו שנשתמש בהן — עוגיות אנליטיקה ופונקציונליות כבויות כברירת מחדל עד שתאשרו.",
    heroSub: "אירוח באירופה • ללא מעקבי צד שלישי • אפשר לשנות בכל עת בהגדרות הפרטיות.",
    preferencesTitle: "העדפות עוגיות",
    requiredBadge: "נדרש",
    essentialName: "עוגיות חיוניות",
    essentialDescription: "נדרשות לתפקוד האתר. כוללות אימות ואבטחה.",
    analyticsName: "עוגיות אנליטיקה",
    analyticsDescription: "עוזרות לנו להבין איך אתם משתמשים באתר כדי שנוכל לשפר את החוויה. כולל דיווח שגיאות (Sentry).",
    functionalName: "עוגיות פונקציונליות",
    functionalDescription: "זוכרות את ההעדפות שלכם — ערכת נושא, שפה, והגדרות משחק.",
    less: "פחות",
    customize: "התאמה אישית",
    savePreferences: "שמירת העדפות",
    acceptAll: "אישור הכול",
    rejectAll: "דחיית הכול",
  },
  ar: {
    heroMain: "نستخدم ملفات تعريف الارتباط لتحسين تجربة التعلّم. اختر كيف نستخدمها — ملفات التحليلات والملفات الوظيفية مُعطّلة افتراضيًا حتى توافق عليها.",
    heroSub: "مستضاف في أوروبا • لا متتبّعات طرف ثالث • يمكنك التغيير في أي وقت من إعدادات الخصوصية.",
    preferencesTitle: "تفضيلات ملفات تعريف الارتباط",
    requiredBadge: "مطلوب",
    essentialName: "ملفات أساسية",
    essentialDescription: "مطلوبة لعمل الموقع. تشمل المصادقة والأمان.",
    analyticsName: "ملفات تحليلية",
    analyticsDescription: "تساعدنا على فهم كيفية استخدامك للموقع لتحسين تجربتك. تشمل تتبّع الأخطاء (Sentry).",
    functionalName: "ملفات وظيفية",
    functionalDescription: "تتذكّر تفضيلاتك مثل المظهر واللغة وإعدادات اللعب.",
    less: "أقل",
    customize: "تخصيص",
    savePreferences: "حفظ التفضيلات",
    acceptAll: "قبول الكل",
    rejectAll: "رفض الكل",
  },
  ru: {
    heroMain: "Мы используем куки, чтобы улучшить ваш опыт обучения. Выберите, как мы будем их использовать — аналитические и функциональные куки отключены по умолчанию, пока вы не согласитесь.",
    heroSub: "Хостинг в ЕС • Без сторонних трекеров • Это можно изменить в настройках конфиденциальности в любой момент.",
    preferencesTitle: "Настройки куки",
    requiredBadge: "Обязательно",
    essentialName: "Необходимые куки",
    essentialDescription: "Требуются для работы сайта. Включают аутентификацию и безопасность.",
    analyticsName: "Аналитические куки",
    analyticsDescription: "Помогают нам понять, как вы используете сайт, чтобы улучшить его. Включают отчёты об ошибках (Sentry).",
    functionalName: "Функциональные куки",
    functionalDescription: "Запоминают ваши настройки: тему, язык и параметры игры.",
    less: "Меньше",
    customize: "Настроить",
    savePreferences: "Сохранить настройки",
    acceptAll: "Принять все",
    rejectAll: "Отклонить все",
  },
};
