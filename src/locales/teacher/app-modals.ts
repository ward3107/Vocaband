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
  /** Title used when the modal is shown as an informational reminder
   *  (i.e. the user has already accepted the current policy but hasn't
   *  dismissed the per-login summary). */
  consentReminderTitle: string;
  consentIntro: (version: string) => string;
  /** Intro text for reminder mode — no "please accept" framing. */
  consentReminderIntro: string;
  consentCollectLabel: string;
  consentCollectBody: string;
  consentTeachersLabel: string;
  consentTeachersBody: string;
  consentUseLabel: string;
  consentUseBody: string;
  /** Where the data is stored + log-scrubbing disclosure (added v2.3). */
  consentStorageLabel: string;
  consentStorageBody: string;
  consentRightsLabel: string;
  consentRightsBody: string;
  consentFullPolicyLink: string;
  consentTermsLink: string;
  consentCheckboxPrefix: string;
  consentCheckboxAnd: string;
  consentCheckboxSuffix: string;
  consentAccept: string;
  /** Reminder-mode toggle: "Don't show this again". */
  consentDontShowAgain: string;
  /** Reminder-mode dismiss button. */
  consentReminderOk: string;

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
    consentReminderTitle: "How we handle your data",
    consentIntro: (v) => `We've updated our Privacy Policy (v${v}). Please review and accept to continue using Vocaband.`,
    consentReminderIntro: "A quick reminder of what we collect and how we keep it safe.",
    consentCollectLabel: "What we collect:",
    consentCollectBody: " Display name, class code, game scores & progress. Student accounts are anonymous — no emails or personal info required.",
    consentTeachersLabel: "For teachers:",
    consentTeachersBody: " Email (via Google) and display name, used only for authentication.",
    consentUseLabel: "How we use it:",
    consentUseBody: " To run the app — games, progress tracking, leaderboards. No ads, no profiling, no third-party trackers.",
    consentStorageLabel: "Where it's stored:",
    consentStorageBody: " All data is hosted in the EU (Germany & Netherlands). Server logs are automatically scrubbed of personal info. GDPR + Israel Amendment 13 compliant.",
    consentRightsLabel: "Your rights:",
    consentRightsBody: " You can export or delete your data anytime from Privacy Settings.",
    consentFullPolicyLink: "Full Privacy Policy",
    consentTermsLink: "Terms of Service",
    consentCheckboxPrefix: "I have read and agree to the ",
    consentCheckboxAnd: " and ",
    consentCheckboxSuffix: ".",
    consentAccept: "Accept & Continue",
    consentDontShowAgain: "Don't show this again",
    consentReminderOk: "Got it",
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
    consentReminderTitle: "איך אנחנו מטפלים בנתונים שלכם",
    consentIntro: (v) => `עדכנו את מדיניות הפרטיות שלנו (גרסה ${v}). אנא קראו ואשרו כדי להמשיך להשתמש ב-Vocaband.`,
    consentReminderIntro: "תזכורת קצרה על מה אנחנו אוספים ואיך אנחנו שומרים על המידע.",
    consentCollectLabel: "מה אנחנו אוספים:",
    consentCollectBody: " שם תצוגה, קוד כיתה, ציוני משחק והתקדמות. חשבונות תלמידים אנונימיים — לא נדרשים אימייל או פרטים אישיים.",
    consentTeachersLabel: "עבור מורים:",
    consentTeachersBody: " אימייל (דרך Google) ושם תצוגה, לצורך אימות בלבד.",
    consentUseLabel: "איך אנחנו משתמשים בזה:",
    consentUseBody: " להפעלת האפליקציה — משחקים, מעקב התקדמות, טבלאות מובילים. אין פרסומות, אין פרופיילינג, אין מעקב צד שלישי.",
    consentStorageLabel: "איפה זה נשמר:",
    consentStorageBody: " כל המידע מאוחסן באיחוד האירופי (גרמניה והולנד). לוגים בשרת מנוקים אוטומטית מפרטים אישיים. תואם GDPR ותיקון 13 לחוק הגנת הפרטיות.",
    consentRightsLabel: "הזכויות שלכם:",
    consentRightsBody: " אפשר לייצא או למחוק את הנתונים שלכם בכל עת מהגדרות פרטיות.",
    consentFullPolicyLink: "מדיניות פרטיות מלאה",
    consentTermsLink: "תנאי שימוש",
    consentCheckboxPrefix: "קראתי ואני מסכים/ה ל-",
    consentCheckboxAnd: " ול-",
    consentCheckboxSuffix: ".",
    consentAccept: "אשר והמשך",
    consentDontShowAgain: "אל תציגו את זה שוב",
    consentReminderOk: "הבנתי",
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
    consentReminderTitle: "كيف نتعامل مع بياناتك",
    consentIntro: (v) => `حدّثنا سياسة الخصوصية (الإصدار ${v}). الرجاء المراجعة والقبول لمتابعة استخدام Vocaband.`,
    consentReminderIntro: "تذكير سريع بما نجمعه وكيف نحافظ على أمانه.",
    consentCollectLabel: "ما الذي نجمعه:",
    consentCollectBody: " اسم العرض، رمز الصف، نقاط الألعاب والتقدّم. حسابات الطلاب مجهولة الهوية — لا حاجة لبريد إلكتروني أو معلومات شخصية.",
    consentTeachersLabel: "للمعلمين:",
    consentTeachersBody: " البريد الإلكتروني (عبر Google) واسم العرض، يُستخدمان فقط للمصادقة.",
    consentUseLabel: "كيف نستخدمها:",
    consentUseBody: " لتشغيل التطبيق — ألعاب، تتبّع التقدّم، لوحات المتصدّرين. لا إعلانات، لا تنميط، لا متتبّعات طرف ثالث.",
    consentStorageLabel: "أين تُخزَّن:",
    consentStorageBody: " جميع البيانات مُستضافة في الاتحاد الأوروبي (ألمانيا وهولندا). سجلّات الخادم تُنقّى تلقائيًا من المعلومات الشخصية. متوافق مع GDPR والتعديل 13 لقانون حماية الخصوصية الإسرائيلي.",
    consentRightsLabel: "حقوقك:",
    consentRightsBody: " يمكنك تصدير بياناتك أو حذفها في أي وقت من إعدادات الخصوصية.",
    consentFullPolicyLink: "سياسة الخصوصية الكاملة",
    consentTermsLink: "شروط الخدمة",
    consentCheckboxPrefix: "قرأت وأوافق على ",
    consentCheckboxAnd: " و",
    consentCheckboxSuffix: ".",
    consentAccept: "قبول ومتابعة",
    consentDontShowAgain: "لا تعرض هذا مرة أخرى",
    consentReminderOk: "حسناً",
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
  ru: {
    consentTitle: "Privacy Policy Update",
    consentReminderTitle: "How we handle your data",
    consentIntro: (v) => `We've updated our Privacy Policy (v${v}). Please review and accept to continue using Vocaband.`,
    consentReminderIntro: "A quick reminder of what we collect and how we keep it safe.",
    consentCollectLabel: "What we collect:",
    consentCollectBody: " Display name, class code, game scores & progress. Student accounts are anonymous — no emails or personal info required.",
    consentTeachersLabel: "For teachers:",
    consentTeachersBody: " Email (via Google) and display name, used only for authentication.",
    consentUseLabel: "How we use it:",
    consentUseBody: " To run the app — games, progress tracking, leaderboards. No ads, no profiling, no third-party trackers.",
    consentStorageLabel: "Where it's stored:",
    consentStorageBody: " All data is hosted in the EU (Germany & Netherlands). Server logs are automatically scrubbed of personal info. GDPR + Israel Amendment 13 compliant.",
    consentRightsLabel: "Your rights:",
    consentRightsBody: " You can export or delete your data anytime from Privacy Settings.",
    consentFullPolicyLink: "Full Privacy Policy",
    consentTermsLink: "Terms of Service",
    consentCheckboxPrefix: "I have read and agree to the ",
    consentCheckboxAnd: " and ",
    consentCheckboxSuffix: ".",
    consentAccept: "Accept & Continue",
    consentDontShowAgain: "Don't show this again",
    consentReminderOk: "Got it",
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
};
