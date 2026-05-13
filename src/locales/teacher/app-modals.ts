/**
 * app-modals.ts — i18n strings for AppModals (top-level confirmation
 * modals rendered from App.tsx):
 *   - ConsentModal (privacy-policy acceptance)
 *   - ExitConfirmModal ("Leave Vocaband?")
 *   - ClassSwitchModal ("Switch class?")
 *
 * Used by both teachers and students, so it lives under the shared
 * tree but keyed alphabetically inside the teacher locale folder
 * because that's where the import lives in CLAUDE.md's surface map.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface AppModalsStrings {
  // ConsentModal
  consentTitle: string;
  consentIntro: (version: string) => string;
  consentCollectLabel: string;
  consentCollectBody: string;
  consentTeachersLabel: string;
  consentTeachersBody: string;
  consentUseLabel: string;
  consentUseBody: string;
  consentRightsLabel: string;
  consentRightsBody: string;
  consentFullPolicyLink: string;
  consentTermsLink: string;
  consentCheckboxPrefix: string;
  consentCheckboxAnd: string;
  consentCheckboxSuffix: string;
  consentAccept: string;

  // ExitConfirmModal
  exitTitle: string;
  exitBody: string;
  exitStay: string;
  exitLeave: string;

  // ClassSwitchModal
  switchTitle: string;
  /** First half of the sentence: "You're currently in {from}. Do you want to switch to {to}?" */
  switchSentenceLead: string;
  switchSentenceMiddle: string;
  switchSentenceTail: string;
  switchStayBtn: (code: string) => string;
  switchConfirmBtn: (code: string) => string;
}

export const appModalsT: Record<Language, AppModalsStrings> = {
  en: {
    consentTitle: "Privacy Policy Update",
    consentIntro: (v) => `We've updated our Privacy Policy (v${v}). Please review and accept to continue using Vocaband.`,
    consentCollectLabel: "What we collect:",
    consentCollectBody: " Display name, class code, game scores & progress. Student accounts are anonymous — no emails or personal info required.",
    consentTeachersLabel: "For teachers:",
    consentTeachersBody: " Email (via Google) and display name, used only for authentication.",
    consentUseLabel: "How we use it:",
    consentUseBody: " To run the app — games, progress tracking, leaderboards. No ads, no profiling, no third-party trackers.",
    consentRightsLabel: "Your rights:",
    consentRightsBody: " You can export or delete your data anytime from Privacy Settings.",
    consentFullPolicyLink: "Full Privacy Policy",
    consentTermsLink: "Terms of Service",
    consentCheckboxPrefix: "I have read and agree to the ",
    consentCheckboxAnd: " and ",
    consentCheckboxSuffix: ".",
    consentAccept: "Accept & Continue",
    exitTitle: "Leave Vocaband?",
    exitBody: "You'll need to sign in again next time.",
    exitStay: "Stay",
    exitLeave: "Leave",
    switchTitle: "Switch class?",
    switchSentenceLead: "You're currently in ",
    switchSentenceMiddle: ". Do you want to switch to ",
    switchSentenceTail: "?",
    switchStayBtn: (code) => `Stay in ${code}`,
    switchConfirmBtn: (code) => `Switch to ${code}`,
  },
  he: {
    consentTitle: "עדכון מדיניות פרטיות",
    consentIntro: (v) => `עדכנו את מדיניות הפרטיות שלנו (גרסה ${v}). אנא קראו ואשרו כדי להמשיך להשתמש ב-Vocaband.`,
    consentCollectLabel: "מה אנחנו אוספים:",
    consentCollectBody: " שם תצוגה, קוד כיתה, ציוני משחק והתקדמות. חשבונות תלמידים אנונימיים — לא נדרשים אימייל או פרטים אישיים.",
    consentTeachersLabel: "עבור מורים:",
    consentTeachersBody: " אימייל (דרך Google) ושם תצוגה, לצורך אימות בלבד.",
    consentUseLabel: "איך אנחנו משתמשים בזה:",
    consentUseBody: " להפעלת האפליקציה — משחקים, מעקב התקדמות, טבלאות מובילים. אין פרסומות, אין פרופיילינג, אין מעקב צד שלישי.",
    consentRightsLabel: "הזכויות שלכם:",
    consentRightsBody: " אפשר לייצא או למחוק את הנתונים שלכם בכל עת מהגדרות פרטיות.",
    consentFullPolicyLink: "מדיניות פרטיות מלאה",
    consentTermsLink: "תנאי שימוש",
    consentCheckboxPrefix: "קראתי ואני מסכים/ה ל-",
    consentCheckboxAnd: " ול-",
    consentCheckboxSuffix: ".",
    consentAccept: "אשר והמשך",
    exitTitle: "לעזוב את Vocaband?",
    exitBody: "תצטרכו להתחבר שוב בפעם הבאה.",
    exitStay: "להישאר",
    exitLeave: "לעזוב",
    switchTitle: "להחליף כיתה?",
    switchSentenceLead: "אתם כרגע ב-",
    switchSentenceMiddle: ". האם תרצו לעבור ל-",
    switchSentenceTail: "?",
    switchStayBtn: (code) => `להישאר ב-${code}`,
    switchConfirmBtn: (code) => `לעבור ל-${code}`,
  },
  ar: {
    consentTitle: "تحديث سياسة الخصوصية",
    consentIntro: (v) => `حدّثنا سياسة الخصوصية (الإصدار ${v}). الرجاء المراجعة والقبول لمتابعة استخدام Vocaband.`,
    consentCollectLabel: "ما الذي نجمعه:",
    consentCollectBody: " اسم العرض، رمز الصف، نقاط الألعاب والتقدّم. حسابات الطلاب مجهولة الهوية — لا حاجة لبريد إلكتروني أو معلومات شخصية.",
    consentTeachersLabel: "للمعلمين:",
    consentTeachersBody: " البريد الإلكتروني (عبر Google) واسم العرض، يُستخدمان فقط للمصادقة.",
    consentUseLabel: "كيف نستخدمها:",
    consentUseBody: " لتشغيل التطبيق — ألعاب، تتبّع التقدّم، لوحات المتصدّرين. لا إعلانات، لا تنميط، لا متتبّعات طرف ثالث.",
    consentRightsLabel: "حقوقك:",
    consentRightsBody: " يمكنك تصدير بياناتك أو حذفها في أي وقت من إعدادات الخصوصية.",
    consentFullPolicyLink: "سياسة الخصوصية الكاملة",
    consentTermsLink: "شروط الخدمة",
    consentCheckboxPrefix: "قرأت وأوافق على ",
    consentCheckboxAnd: " و",
    consentCheckboxSuffix: ".",
    consentAccept: "قبول ومتابعة",
    exitTitle: "مغادرة Vocaband؟",
    exitBody: "ستحتاج إلى تسجيل الدخول مرة أخرى في المرة القادمة.",
    exitStay: "البقاء",
    exitLeave: "المغادرة",
    switchTitle: "تبديل الصف؟",
    switchSentenceLead: "أنت حالياً في ",
    switchSentenceMiddle: ". هل تريد التبديل إلى ",
    switchSentenceTail: "؟",
    switchStayBtn: (code) => `البقاء في ${code}`,
    switchConfirmBtn: (code) => `التبديل إلى ${code}`,
  },
};
