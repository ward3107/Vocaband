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
  retentionNote: (email: string, platformDays: number, offsiteDays: number) => string;

  // Toasts
  toastDataExported: string;
  toastExportFailed: string;
  toastAccountDeleted: string;
  toastDeleteFailed: string;
  toastNameUpdated: string;
  toastNameFailed: string;

  // Parent Weekly Digest opt-in (only rendered for students when the
  // VITE_PARENT_DIGEST flag is on — the worker + cron + email template
  // ship in later phases; this card just collects the email).
  parentDigestTitle: string;
  parentDigestSubtitle: string;
  parentDigestEmailLabel: string;
  parentDigestEmailPlaceholder: string;
  parentDigestSave: string;
  parentDigestRemove: string;
  parentDigestRemoveConfirm: string;
  parentDigestCurrentLabel: string;
  parentDigestSavedToast: string;
  parentDigestRemovedToast: string;
  parentDigestSaveFailed: string;
  parentDigestInvalidEmail: string;
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
    retentionNote: (email, platformDays, offsiteDays) =>
      `Note: Data in encrypted backups may persist after deletion — up to ${platformDays} days in our database provider's platform backups, and up to ${offsiteDays} days (about ${Math.round(offsiteDays / 30)} months) in our off-site disaster-recovery archive. After those windows, the backups are overwritten or deleted automatically. Contact ${email} for questions.`,
    toastDataExported: "Data exported successfully!",
    toastExportFailed: "Failed to export data.",
    toastAccountDeleted: "Account deleted successfully.",
    toastDeleteFailed: "Failed to delete account.",
    toastNameUpdated: "Name updated!",
    toastNameFailed: "Failed to update name.",
    parentDigestTitle: "Send my parent a weekly progress email",
    parentDigestSubtitle: "Every Friday afternoon, your parent gets a short email about what you learned that week.",
    parentDigestEmailLabel: "Parent's email",
    parentDigestEmailPlaceholder: "parent@example.com",
    parentDigestSave: "Save",
    parentDigestRemove: "Stop sending emails",
    parentDigestRemoveConfirm: "Stop sending the Friday update to this email?",
    parentDigestCurrentLabel: "Currently sending to:",
    parentDigestSavedToast: "Parent email saved. The next update sends Friday.",
    parentDigestRemovedToast: "Parent email removed.",
    parentDigestSaveFailed: "Couldn't save right now. Try again in a moment.",
    parentDigestInvalidEmail: "That doesn't look like an email address.",
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
    retentionNote: (email, platformDays, offsiteDays) =>
      `שימו לב: נתונים בגיבויים מוצפנים עשויים להישמר לאחר המחיקה — עד ${platformDays} ימים בגיבויי הפלטפורמה של ספק מסד הנתונים שלנו, ועד ${offsiteDays} ימים (כ-${Math.round(offsiteDays / 30)} חודשים) בארכיון השחזור החיצוני שלנו. לאחר תקופות אלו, הגיבויים נמחקים או נדרסים אוטומטית. שאלות? כתבו ל-${email}.`,
    toastDataExported: "הנתונים יוצאו בהצלחה!",
    toastExportFailed: "ייצוא הנתונים נכשל.",
    toastAccountDeleted: "החשבון נמחק בהצלחה.",
    toastDeleteFailed: "מחיקת החשבון נכשלה.",
    toastNameUpdated: "השם עודכן!",
    toastNameFailed: "עדכון השם נכשל.",
    parentDigestTitle: "שלחו להורה שלי מייל שבועי על ההתקדמות",
    parentDigestSubtitle: "כל יום שישי אחר הצהריים, ההורה שלכם מקבל מייל קצר על מה שלמדתם השבוע.",
    parentDigestEmailLabel: 'דוא"ל של הורה',
    parentDigestEmailPlaceholder: "parent@example.com",
    parentDigestSave: "שמירה",
    parentDigestRemove: "הפסקת שליחת מיילים",
    parentDigestRemoveConfirm: 'להפסיק לשלוח את העדכון של יום שישי לדוא"ל הזה?',
    parentDigestCurrentLabel: "שולח כרגע אל:",
    parentDigestSavedToast: 'דוא"ל הורה נשמר. העדכון הבא יישלח ביום שישי.',
    parentDigestRemovedToast: 'דוא"ל הורה הוסר.',
    parentDigestSaveFailed: "לא הצלחנו לשמור כרגע. נסו שוב בעוד רגע.",
    parentDigestInvalidEmail: 'זה לא נראה כמו כתובת דוא"ל.',
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
    retentionNote: (email, platformDays, offsiteDays) =>
      `ملاحظة: قد تستمر البيانات في النسخ الاحتياطية المشفّرة بعد الحذف — حتى ${platformDays} يوماً في النسخ الاحتياطية لمنصّة قاعدة البيانات لدينا، وحتى ${offsiteDays} يوماً (حوالي ${Math.round(offsiteDays / 30)} شهراً) في أرشيف التعافي من الكوارث خارج الموقع. بعد هذه الفترات، تُستبدل النسخ الاحتياطية أو تُحذف تلقائياً. للاستفسارات راسل ${email}.`,
    toastDataExported: "تم تصدير البيانات بنجاح!",
    toastExportFailed: "فشل تصدير البيانات.",
    toastAccountDeleted: "تم حذف الحساب بنجاح.",
    toastDeleteFailed: "فشل حذف الحساب.",
    toastNameUpdated: "تم تحديث الاسم!",
    toastNameFailed: "فشل تحديث الاسم.",
    parentDigestTitle: "أرسل لوالدي بريداً أسبوعياً عن تقدمي",
    parentDigestSubtitle: "كل يوم جمعة بعد الظهر، يحصل والدك على بريد قصير عما تعلمته هذا الأسبوع.",
    parentDigestEmailLabel: "بريد الوالد",
    parentDigestEmailPlaceholder: "parent@example.com",
    parentDigestSave: "حفظ",
    parentDigestRemove: "إيقاف إرسال البريد",
    parentDigestRemoveConfirm: "إيقاف إرسال تحديث الجمعة إلى هذا البريد؟",
    parentDigestCurrentLabel: "يُرسل حالياً إلى:",
    parentDigestSavedToast: "تم حفظ بريد الوالد. سيُرسل التحديث التالي يوم الجمعة.",
    parentDigestRemovedToast: "تم حذف بريد الوالد.",
    parentDigestSaveFailed: "تعذر الحفظ الآن. حاول مرة أخرى بعد لحظة.",
    parentDigestInvalidEmail: "هذا لا يبدو كعنوان بريد إلكتروني.",
  },
  ru: {
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
    retentionNote: (email, platformDays, offsiteDays) =>
      `Note: Data in encrypted backups may persist after deletion — up to ${platformDays} days in our database provider's platform backups, and up to ${offsiteDays} days (about ${Math.round(offsiteDays / 30)} months) in our off-site disaster-recovery archive. After those windows, the backups are overwritten or deleted automatically. Contact ${email} for questions.`,
    toastDataExported: "Data exported successfully!",
    toastExportFailed: "Failed to export data.",
    toastAccountDeleted: "Account deleted successfully.",
    toastDeleteFailed: "Failed to delete account.",
    toastNameUpdated: "Name updated!",
    toastNameFailed: "Failed to update name.",
    parentDigestTitle: "Send my parent a weekly progress email",
    parentDigestSubtitle: "Every Friday afternoon, your parent gets a short email about what you learned that week.",
    parentDigestEmailLabel: "Parent's email",
    parentDigestEmailPlaceholder: "parent@example.com",
    parentDigestSave: "Save",
    parentDigestRemove: "Stop sending emails",
    parentDigestRemoveConfirm: "Stop sending the Friday update to this email?",
    parentDigestCurrentLabel: "Currently sending to:",
    parentDigestSavedToast: "Parent email saved. The next update sends Friday.",
    parentDigestRemovedToast: "Parent email removed.",
    parentDigestSaveFailed: "Couldn't save right now. Try again in a moment.",
    parentDigestInvalidEmail: "That doesn't look like an email address.",
  },
};
