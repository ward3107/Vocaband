import type { Language } from '../hooks/useLanguage';

export interface PwaInstallStrings {
  modalTitle: string;
  modalSubtitle: string;
  benefitOffline: string;
  benefitFaster: string;
  benefitHomeScreen: string;
  androidInstallCta: string;
  iosHeading: string;
  iosStep1Before: string;
  iosStep1ShareLabel: string;
  iosStep2: string;
  iosStep3: string;
  // Non-Safari iOS browsers (Chrome / Firefox / Edge on iPhone or iPad)
  // can't create a real PWA — Apple restricts that to Safari.
  iosNonSafariHeading: string;
  iosNonSafariBody: string;
  // Chrome / Edge / Brave / Opera / Vivaldi / Huawei browser on Android.
  androidHeading: string;
  androidStep1Before: string;
  androidStep1MenuLabel: string;
  androidStep2: string;
  // Samsung Internet uses a hamburger menu and a slightly different flow.
  samsungHeading: string;
  samsungStep1Before: string;
  samsungStep1MenuLabel: string;
  samsungStep2: string;
  samsungStep3: string;
  // Firefox on Android.
  firefoxAndroidHeading: string;
  firefoxAndroidStep1Before: string;
  firefoxAndroidStep1MenuLabel: string;
  firefoxAndroidStep2: string;
  dismiss: string;
  bannerTitle: string;
  bannerCta: string;
  closeLabel: string;
}

export const pwaInstallT: Record<Language, PwaInstallStrings> = {
  en: {
    modalTitle: 'Install Vocaband for offline play',
    modalSubtitle:
      'Add Vocaband to your home screen — works even when the Wi-Fi drops in class.',
    benefitOffline: 'Keep playing when the school Wi-Fi cuts out',
    benefitFaster: 'Opens 3× faster from the home screen',
    benefitHomeScreen: 'Full-screen, no browser bars in the way',
    androidInstallCta: 'Install Vocaband',
    iosHeading: 'Install on iPhone or iPad',
    iosStep1Before: 'Tap',
    iosStep1ShareLabel: 'Share',
    iosStep2: 'Scroll and tap "Add to Home Screen"',
    iosStep3: 'Tap "Add" — you\'re done',
    iosNonSafariHeading: 'Open in Safari to install',
    iosNonSafariBody:
      'iOS only lets Safari install web apps. Copy the link, open Safari, paste it, then tap Share → Add to Home Screen.',
    androidHeading: 'Install on Android',
    androidStep1Before: 'Tap',
    androidStep1MenuLabel: 'Menu',
    androidStep2: 'Choose "Install app" or "Add to Home screen"',
    samsungHeading: 'Install in Samsung Internet',
    samsungStep1Before: 'Tap',
    samsungStep1MenuLabel: 'Menu',
    samsungStep2: 'Tap "Add page to"',
    samsungStep3: 'Choose "Home screen"',
    firefoxAndroidHeading: 'Install in Firefox',
    firefoxAndroidStep1Before: 'Tap',
    firefoxAndroidStep1MenuLabel: 'Menu',
    firefoxAndroidStep2: 'Choose "Install" or "Add to Home screen"',
    dismiss: 'Not now',
    bannerTitle: 'Get Vocaband on your home screen',
    bannerCta: 'Install',
    closeLabel: 'Close',
  },
  he: {
    modalTitle: 'התקן את Vocaband למשחק לא מקוון',
    modalSubtitle:
      'הוסף את Vocaband למסך הבית — פועל גם כשהוויי-פיי בכיתה נופל.',
    benefitOffline: 'המשך לשחק כשהוויי-פיי של בית הספר מתנתק',
    benefitFaster: 'נפתח מהר פי 3 ממסך הבית',
    benefitHomeScreen: 'מסך מלא, ללא סרגלי דפדפן בדרך',
    androidInstallCta: 'התקן את Vocaband',
    iosHeading: 'התקנה ב-iPhone או iPad',
    iosStep1Before: 'הקש על',
    iosStep1ShareLabel: 'שיתוף',
    iosStep2: 'גלול והקש על "הוסף למסך הבית"',
    iosStep3: 'הקש "הוסף" — סיימת',
    iosNonSafariHeading: 'פתח ב-Safari כדי להתקין',
    iosNonSafariBody:
      'iOS מאפשר רק ל-Safari להתקין אפליקציות אינטרנט. העתק את הקישור, פתח את Safari, הדבק, ואז הקש שיתוף → הוסף למסך הבית.',
    androidHeading: 'התקנה ב-Android',
    androidStep1Before: 'הקש על',
    androidStep1MenuLabel: 'תפריט',
    androidStep2: 'בחר "התקן אפליקציה" או "הוסף למסך הבית"',
    samsungHeading: 'התקנה ב-Samsung Internet',
    samsungStep1Before: 'הקש על',
    samsungStep1MenuLabel: 'תפריט',
    samsungStep2: 'הקש "הוסף עמוד אל"',
    samsungStep3: 'בחר "מסך הבית"',
    firefoxAndroidHeading: 'התקנה ב-Firefox',
    firefoxAndroidStep1Before: 'הקש על',
    firefoxAndroidStep1MenuLabel: 'תפריט',
    firefoxAndroidStep2: 'בחר "התקן" או "הוסף למסך הבית"',
    dismiss: 'לא עכשיו',
    bannerTitle: 'הוסף את Vocaband למסך הבית',
    bannerCta: 'התקן',
    closeLabel: 'סגור',
  },
  ar: {
    modalTitle: 'ثبّت Vocaband للعب دون اتصال',
    modalSubtitle:
      'أضف Vocaband إلى الشاشة الرئيسية — يعمل حتى عند انقطاع شبكة Wi-Fi في الصف.',
    benefitOffline: 'تابع اللعب عند انقطاع شبكة Wi-Fi في المدرسة',
    benefitFaster: 'يفتح أسرع 3 مرات من الشاشة الرئيسية',
    benefitHomeScreen: 'شاشة كاملة، بدون أشرطة المتصفح',
    androidInstallCta: 'ثبّت Vocaband',
    iosHeading: 'التثبيت على iPhone أو iPad',
    iosStep1Before: 'انقر على',
    iosStep1ShareLabel: 'مشاركة',
    iosStep2: 'مرّر وانقر على "إضافة إلى الشاشة الرئيسية"',
    iosStep3: 'انقر "إضافة" — انتهيت',
    iosNonSafariHeading: 'افتح في Safari للتثبيت',
    iosNonSafariBody:
      'يسمح iOS فقط لـ Safari بتثبيت تطبيقات الويب. انسخ الرابط، افتح Safari، الصق، ثم انقر مشاركة → إضافة إلى الشاشة الرئيسية.',
    androidHeading: 'التثبيت على Android',
    androidStep1Before: 'انقر على',
    androidStep1MenuLabel: 'القائمة',
    androidStep2: 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"',
    samsungHeading: 'التثبيت في Samsung Internet',
    samsungStep1Before: 'انقر على',
    samsungStep1MenuLabel: 'القائمة',
    samsungStep2: 'انقر "إضافة الصفحة إلى"',
    samsungStep3: 'اختر "الشاشة الرئيسية"',
    firefoxAndroidHeading: 'التثبيت في Firefox',
    firefoxAndroidStep1Before: 'انقر على',
    firefoxAndroidStep1MenuLabel: 'القائمة',
    firefoxAndroidStep2: 'اختر "تثبيت" أو "إضافة إلى الشاشة الرئيسية"',
    dismiss: 'ليس الآن',
    bannerTitle: 'احصل على Vocaband على شاشتك الرئيسية',
    bannerCta: 'ثبّت',
    closeLabel: 'إغلاق',
  },
  ru: {
    modalTitle: 'Install Vocaband for offline play',
    modalSubtitle:
      'Add Vocaband to your home screen — works even when the Wi-Fi drops in class.',
    benefitOffline: 'Keep playing when the school Wi-Fi cuts out',
    benefitFaster: 'Opens 3× faster from the home screen',
    benefitHomeScreen: 'Full-screen, no browser bars in the way',
    androidInstallCta: 'Install Vocaband',
    iosHeading: 'Install on iPhone or iPad',
    iosStep1Before: 'Tap',
    iosStep1ShareLabel: 'Share',
    iosStep2: 'Scroll and tap "Add to Home Screen"',
    iosStep3: 'Tap "Add" — you\'re done',
    iosNonSafariHeading: 'Open in Safari to install',
    iosNonSafariBody:
      'iOS only lets Safari install web apps. Copy the link, open Safari, paste it, then tap Share → Add to Home Screen.',
    androidHeading: 'Install on Android',
    androidStep1Before: 'Tap',
    androidStep1MenuLabel: 'Menu',
    androidStep2: 'Choose "Install app" or "Add to Home screen"',
    samsungHeading: 'Install in Samsung Internet',
    samsungStep1Before: 'Tap',
    samsungStep1MenuLabel: 'Menu',
    samsungStep2: 'Tap "Add page to"',
    samsungStep3: 'Choose "Home screen"',
    firefoxAndroidHeading: 'Install in Firefox',
    firefoxAndroidStep1Before: 'Tap',
    firefoxAndroidStep1MenuLabel: 'Menu',
    firefoxAndroidStep2: 'Choose "Install" or "Add to Home screen"',
    dismiss: 'Not now',
    bannerTitle: 'Get Vocaband on your home screen',
    bannerCta: 'Install',
    closeLabel: 'Close',
  },
};
