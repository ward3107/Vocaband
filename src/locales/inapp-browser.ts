import type { Language } from '../hooks/useLanguage';

export interface InAppBrowserStrings {
  title: string;
  subtitle: string;
  iosStep1: string;
  iosStep2: string;
  androidStep1: string;
  androidStep2: string;
  copyUrl: string;
  copyUrlSuccess: string;
  openInChrome: string;
  dismiss: string;
}

export const inAppBrowserT: Record<Language, InAppBrowserStrings> = {
  en: {
    title: 'Open Vocaband in your browser',
    subtitle:
      "You're inside an in-app browser. Vocaband needs your real browser (Safari or Chrome) to save offline progress.",
    iosStep1: 'Tap the "•••" menu',
    iosStep2: 'Choose "Open in Safari"',
    androidStep1: 'Tap the "⋮" menu',
    androidStep2: 'Choose "Open in browser" or "Open in Chrome"',
    copyUrl: 'Copy link',
    copyUrlSuccess: 'Link copied — paste it in your browser',
    openInChrome: 'Open in Chrome',
    dismiss: 'Continue anyway',
  },
  he: {
    title: 'פתח את Vocaband בדפדפן שלך',
    subtitle:
      'אתה בתוך דפדפן פנימי של אפליקציה. Vocaband צריך את הדפדפן האמיתי שלך (Safari או Chrome) כדי לשמור התקדמות לא מקוונת.',
    iosStep1: 'הקש על תפריט "•••"',
    iosStep2: 'בחר "פתח ב-Safari"',
    androidStep1: 'הקש על תפריט "⋮"',
    androidStep2: 'בחר "פתח בדפדפן" או "פתח ב-Chrome"',
    copyUrl: 'העתק קישור',
    copyUrlSuccess: 'הקישור הועתק — הדבק אותו בדפדפן שלך',
    openInChrome: 'פתח ב-Chrome',
    dismiss: 'המשך בכל זאת',
  },
  ar: {
    title: 'افتح Vocaband في متصفحك',
    subtitle:
      'أنت داخل متصفح تطبيق داخلي. يحتاج Vocaband إلى متصفحك الحقيقي (Safari أو Chrome) لحفظ التقدم دون اتصال.',
    iosStep1: 'انقر على قائمة "•••"',
    iosStep2: 'اختر "فتح في Safari"',
    androidStep1: 'انقر على قائمة "⋮"',
    androidStep2: 'اختر "فتح في المتصفح" أو "فتح في Chrome"',
    copyUrl: 'انسخ الرابط',
    copyUrlSuccess: 'تم نسخ الرابط — الصقه في متصفحك',
    openInChrome: 'افتح في Chrome',
    dismiss: 'متابعة على أي حال',
  },
  ru: {
    title: 'Open Vocaband in your browser',
    subtitle:
      "You're inside an in-app browser. Vocaband needs your real browser (Safari or Chrome) to save offline progress.",
    iosStep1: 'Tap the "•••" menu',
    iosStep2: 'Choose "Open in Safari"',
    androidStep1: 'Tap the "⋮" menu',
    androidStep2: 'Choose "Open in browser" or "Open in Chrome"',
    copyUrl: 'Copy link',
    copyUrlSuccess: 'Link copied — paste it in your browser',
    openInChrome: 'Open in Chrome',
    dismiss: 'Continue anyway',
  },
};
