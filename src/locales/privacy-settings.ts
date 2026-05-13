/**
 * privacy-settings.ts — i18n strings for PrivacySettingsView (the
 * data-export / consent / account-delete page reachable from both
 * teacher and student dashboards).
 *
 * Lives at the top of src/locales/ because the view is available to
 * both roles — same screen, same copy.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../hooks/useLanguage";

export interface PrivacySettingsStrings {
  back: string;
  pageTitle: string;

  // Profile section
  profileTitle: string;
  role: string;
  name: string;
  email: string;
  classCode: string;
  edit: string;
  save: string;
  cancel: string;

  // Data sections
  whatDataTitle: string;
  fieldsPrefix: string;
  purposePrefix: string;
  required: string;
  optional: string;

  // Third-party section
  thirdPartyTitle: string;
  dataPrefix: string;

  // Consent section
  consentStatusTitle: string;
  currentPolicyVersion: string;
  yourAcceptedVersion: string;
  notYetAccepted: string;
  fullPrivacyPolicy: string;
  termsOfService: string;
  withdrawConsent: string;
  withdrawConfirm: string;

  // Rights section
  rightsTitle: string;
  rightsIntro: string;
  downloadMyData: string;
  deleteMyAccount: string;
  deleteConfirm: string;
  retentionNote: (email: string) => string;

  // Toasts
  toastDataExported: string;
  toastExportFailed: string;
  toastAccountDeleted: string;
  toastDeleteFailed: string;
  toastNameUpdated: string;
  toastNameFailed: string;
}

export const privacySettingsT: Record<Language, PrivacySettingsStrings> = {
  en: {
    back: "Back",
    pageTitle: "Privacy & Data Settings",
    profileTitle: "Your Profile",
    role: "Role:",
    name: "Name:",
    email: "Email:",
    classCode: "Class Code:",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    whatDataTitle: "What Data We Store",
    fieldsPrefix: "Fields: ",
    purposePrefix: "Purpose: ",
    required: "Required",
    optional: "Optional",
    thirdPartyTitle: "Third-Party Services",
    dataPrefix: "Data: ",
    consentStatusTitle: "Consent Status",
    currentPolicyVersion: "Current policy version:",
    yourAcceptedVersion: "Your accepted version:",
    notYetAccepted: "Not yet accepted",
    fullPrivacyPolicy: "Full Privacy Policy",
    termsOfService: "Terms of Service",
    withdrawConsent: "Withdraw Consent",
    withdrawConfirm: "Withdrawing consent will log you out. You can re-accept when you log in again. Continue?",
    rightsTitle: "Your Data Rights",
    rightsIntro: "Under Israeli privacy law (PPA Amendment 13), you have the right to access, correct, and delete your personal data.",
    downloadMyData: "Download My Data (JSON)",
    deleteMyAccount: "Delete My Account",
    deleteConfirm: "This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?",
    retentionNote: (email) => `Note: Data in encrypted backups may be retained for up to 30 days after deletion. Contact ${email} for questions.`,
    toastDataExported: "Data exported successfully!",
    toastExportFailed: "Failed to export data.",
    toastAccountDeleted: "Account deleted successfully.",
    toastDeleteFailed: "Failed to delete account.",
    toastNameUpdated: "Name updated!",
    toastNameFailed: "Failed to update name.",
  },
  he: {
    back: "חזרה",
    pageTitle: "פרטיות והגדרות נתונים",
    profileTitle: "הפרופיל שלכם",
    role: "תפקיד:",
    name: "שם:",
    email: "אימייל:",
    classCode: "קוד כיתה:",
    edit: "ערוך",
    save: "שמור",
    cancel: "ביטול",
    whatDataTitle: "אילו נתונים אנחנו שומרים",
    fieldsPrefix: "שדות: ",
    purposePrefix: "מטרה: ",
    required: "חובה",
    optional: "אופציונלי",
    thirdPartyTitle: "שירותי צד שלישי",
    dataPrefix: "נתונים: ",
    consentStatusTitle: "סטטוס הסכמה",
    currentPolicyVersion: "גרסת המדיניות הנוכחית:",
    yourAcceptedVersion: "הגרסה שאישרתם:",
    notYetAccepted: "עדיין לא אושר",
    fullPrivacyPolicy: "מדיניות פרטיות מלאה",
    termsOfService: "תנאי שימוש",
    withdrawConsent: "ביטול הסכמה",
    withdrawConfirm: "ביטול ההסכמה יחתום אתכם החוצה. תוכלו לאשר שוב בכניסה הבאה. להמשיך?",
    rightsTitle: "הזכויות שלכם על המידע",
    rightsIntro: "על פי חוק הגנת הפרטיות הישראלי (תיקון 13), יש לכם זכות לגשת, לתקן ולמחוק את המידע האישי שלכם.",
    downloadMyData: "הורד את המידע שלי (JSON)",
    deleteMyAccount: "מחיקת החשבון שלי",
    deleteConfirm: "זה ימחק לצמיתות את החשבון שלכם ואת כל הנתונים הקשורים. הפעולה אינה הפיכה. בטוחים?",
    retentionNote: (email) => `שימו לב: נתונים בגיבויים מוצפנים עשויים להישמר עד 30 ימים לאחר המחיקה. שאלות? כתבו ל-${email}.`,
    toastDataExported: "הנתונים יוצאו בהצלחה!",
    toastExportFailed: "ייצוא הנתונים נכשל.",
    toastAccountDeleted: "החשבון נמחק בהצלחה.",
    toastDeleteFailed: "מחיקת החשבון נכשלה.",
    toastNameUpdated: "השם עודכן!",
    toastNameFailed: "עדכון השם נכשל.",
  },
  ar: {
    back: "رجوع",
    pageTitle: "إعدادات الخصوصية والبيانات",
    profileTitle: "ملفك الشخصي",
    role: "الدور:",
    name: "الاسم:",
    email: "البريد الإلكتروني:",
    classCode: "رمز الصف:",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    whatDataTitle: "ما البيانات التي نخزّنها",
    fieldsPrefix: "الحقول: ",
    purposePrefix: "الغرض: ",
    required: "مطلوب",
    optional: "اختياري",
    thirdPartyTitle: "خدمات الطرف الثالث",
    dataPrefix: "البيانات: ",
    consentStatusTitle: "حالة الموافقة",
    currentPolicyVersion: "إصدار السياسة الحالي:",
    yourAcceptedVersion: "الإصدار الذي قبلتَه:",
    notYetAccepted: "لم تتم الموافقة بعد",
    fullPrivacyPolicy: "سياسة الخصوصية الكاملة",
    termsOfService: "شروط الخدمة",
    withdrawConsent: "سحب الموافقة",
    withdrawConfirm: "سحب الموافقة سيخرجك من الحساب. يمكنك القبول مرة أخرى عند تسجيل الدخول. متابعة؟",
    rightsTitle: "حقوقك في البيانات",
    rightsIntro: "بموجب قانون الخصوصية الإسرائيلي (تعديل PPA رقم 13)، يحقّ لك الوصول إلى بياناتك الشخصية وتصحيحها وحذفها.",
    downloadMyData: "تنزيل بياناتي (JSON)",
    deleteMyAccount: "حذف حسابي",
    deleteConfirm: "سيتم حذف حسابك وجميع بياناتك بشكل نهائي. لا يمكن التراجع. هل أنت متأكد؟",
    retentionNote: (email) => `ملاحظة: قد تُحتفظ النسخ الاحتياطية المشفّرة لمدة تصل إلى 30 يوماً بعد الحذف. للاستفسارات راسل ${email}.`,
    toastDataExported: "تم تصدير البيانات بنجاح!",
    toastExportFailed: "فشل تصدير البيانات.",
    toastAccountDeleted: "تم حذف الحساب بنجاح.",
    toastDeleteFailed: "فشل حذف الحساب.",
    toastNameUpdated: "تم تحديث الاسم!",
    toastNameFailed: "فشل تحديث الاسم.",
  },
};
