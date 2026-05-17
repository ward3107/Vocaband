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
    dismiss: 'Not now',
    bannerTitle: 'Get Vocaband on your home screen',
    bannerCta: 'Install',
    closeLabel: 'Close',
  },
};
