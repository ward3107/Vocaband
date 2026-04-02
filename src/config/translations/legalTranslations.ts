import { Language } from "../../shared/hooks/useLanguage";

// UI Translations (shared between Privacy and Terms)
export const uiTranslations: Record<Language, {
  forStudents: string;
  forTeachers: string;
  anonymous: string;
  googleOAuth: string;
  purpose: string;
  legalBasis: string;
  service: string;
  location: string;
  youAgreeTo: string;
  youMustNot: string;
  dataRetention: {
    studentProgress: string;
    orphanedAccounts: string;
    teacherAccounts: string;
    auditLogs: string;
  };
  rights: {
    access: string;
    accessDesc: string;
    deletion: string;
    deletionDesc: string;
    portability: string;
    portabilityDesc: string;
  };
  securityMeasures: string[];
  serviceDescription: string[];
  teacherAccountRules: string[];
  studentAccountRules: string[];
  schoolAuthorization: string;
  acceptableUse: string[];
  prohibitedUse: string[];
  teacherDuties: { title: string; desc: string }[];
}> = {
  en: {
    forStudents: "For Students",
    forTeachers: "For Teachers",
    anonymous: "Anonymous",
    googleOAuth: "Google OAuth",
    purpose: "Purpose",
    legalBasis: "Legal Basis",
    service: "Service",
    location: "Location",
    youAgreeTo: "You Agree To:",
    youMustNot: "You Must NOT:",
    dataRetention: {
      studentProgress: "Student progress data",
      orphanedAccounts: "Orphaned student accounts",
      teacherAccounts: "Teacher accounts",
      auditLogs: "Audit logs",
    },
    rights: {
      access: "Access",
      accessDesc: "Request a copy of your data",
      deletion: "Deletion",
      deletionDesc: "Request permanent removal",
      portability: "Portability",
      portabilityDesc: "Export your progress",
    },
    securityMeasures: [
      "Encryption in transit (HTTPS/TLS 1.3)",
      "Encryption at rest",
      "Row-Level Security (RLS)",
      "Secure Google OAuth",
      "Teacher pre-approval",
      "Rate limiting",
      "Audit logging",
    ],
    serviceDescription: [
      "Designed for use in Israeli schools under teacher supervision",
      "Aligned with the Israeli Ministry of Education English curriculum (Band 1, 2, 3)",
      "Built to support anonymous student accounts",
      "Intended for educational purposes only",
    ],
    teacherAccountRules: [
      "Sign in with pre-approved Google account",
      "Use official educational email address",
      "Responsible for account security",
      "Responsible for class management",
    ],
    studentAccountRules: [
      "Anonymous account with display name only",
      "Access via 6-digit class code",
      "No email or personal info required",
      "Should not use real full name",
    ],
    schoolAuthorization: "School Authorization: By providing class codes to students, teachers represent that they have authorization from their educational institution to use Vocaband for educational purposes.",
    acceptableUse: [
      "Use for educational purposes only",
      "Maintain academic integrity",
      "Keep interactions respectful",
      "Report bugs and issues",
    ],
    prohibitedUse: [
      "Use bots or automated scripts",
      "Access others' accounts or data",
      "Use offensive or impersonating names",
      "Harass or bully other users",
      "Share class codes inappropriately",
      "Reverse-engineer the Service",
    ],
    teacherDuties: [
      { title: "Class Code Management:", desc: "Keep codes confidential, share only with intended students" },
      { title: "Supervision:", desc: "Appropriately supervise student use" },
      { title: "Data Management:", desc: "Delete classes when no longer needed" },
      { title: "School Policies:", desc: "Comply with institutional data protection policies" },
    ],
  },
  he: {
    forStudents: "לתלמידים",
    forTeachers: "למורים",
    anonymous: "אנונימי",
    googleOAuth: "Google OAuth",
    purpose: "מטרה",
    legalBasis: "בסיס משפטי",
    service: "שירות",
    location: "מיקום",
    youAgreeTo: "אתה מסכים:",
    youMustNot: "אסור לך:",
    dataRetention: {
      studentProgress: "נתוני התקדמות תלמידים",
      orphanedAccounts: "חשבונות תלמידים יתומים",
      teacherAccounts: "חשבונות מורים",
      auditLogs: "יומני ביקורת",
    },
    rights: {
      access: "גישה",
      accessDesc: "בקש עותק של הנתונים שלך",
      deletion: "מחיקה",
      deletionDesc: "בקש הסרה קבועה",
      portability: "ניידות",
      portabilityDesc: "ייצוא ההתקדמות שלך",
    },
    securityMeasures: [
      "הצפנה במעבר (HTTPS/TLS 1.3)",
      "הצפנה במנוחה",
      "אבטחה ברמת שורה (RLS)",
      "Google OAuth מאובטח",
      "אישור מראש של מורים",
      "הגבלת קצב",
      "רישום ביקורת",
    ],
    serviceDescription: [
      "מתוכנן לשימוש בבתי ספר בישראל בפיקוח מורים",
      "מותאם לתכנית הלימודים לאנגלית של משרד החינוך (Band 1, 2, 3)",
      "בנוי לתמיכה בחשבונות תלמידים אנונימיים",
      "מיועד למטרות חינוכיות בלבד",
    ],
    teacherAccountRules: [
      "כניסה עם חשבון Google מאושר מראש",
      "שימוש בכתובת דוא\"ל חינוכית רשמית",
      "אחריות לאבטחת החשבון",
      "אחריות לניהול הכיתה",
    ],
    studentAccountRules: [
      "חשבון אנונימי עם שם תצוגה בלבד",
      "גישה דרך קוד כיתה בן 6 ספרות",
      "ללא דוא\"ל או מידע אישי נדרש",
      "אין להשתמש בשם מלא אמיתי",
    ],
    schoolAuthorization: "אישור בית ספר: על ידי מתן קודי כיתה לתלמידים, המורים מצהירים שיש להם אישור מהמוסד החינוכי שלהם להשתמש ב-Vocaband למטרות חינוכיות.",
    acceptableUse: [
      "שימוש למטרות חינוכיות בלבד",
      "שמירה על יושרה אקדמית",
      "שמירה על אינטראקציות מכבדות",
      "דיווח על באגים ובעיות",
    ],
    prohibitedUse: [
      "שימוש בבוטים או סקריפטים אוטומטיים",
      "גישה לחשבונות או נתונים של אחרים",
      "שימוש בשמות פוגעניים או מתחזים",
      "הטרדה או בריונות של משתמשים אחרים",
      "שיתוף קודי כיתה בצורה בלתי הולמת",
      "הנדסה לאחור של השירות",
    ],
    teacherDuties: [
      { title: "ניהול קוד כיתה:", desc: "שמור על קודים חסויים, שתף רק עם התלמידים המיועדים" },
      { title: "פיקוח:", desc: "פקח כראוי על שימוש התלמידים" },
      { title: "ניהול נתונים:", desc: "מחק כיתות כשאינן נחוצות עוד" },
      { title: "מדיניות בית ספר:", desc: "עמוד במדיניות הגנת הנתונים המוסדית" },
    ],
  },
  ar: {
    forStudents: "للطلاب",
    forTeachers: "للمعلمين",
    anonymous: "مجهول",
    googleOAuth: "Google OAuth",
    purpose: "الغرض",
    legalBasis: "الأساس القانوني",
    service: "الخدمة",
    location: "الموقع",
    youAgreeTo: "توافق على:",
    youMustNot: "يجب عليك ألا:",
    dataRetention: {
      studentProgress: "بيانات تقدم الطلاب",
      orphanedAccounts: "حسابات الطلاب اليتيمة",
      teacherAccounts: "حسابات المعلمين",
      auditLogs: "سجلات التدقيق",
    },
    rights: {
      access: "الوصول",
      accessDesc: "اطلب نسخة من بياناتك",
      deletion: "الحذف",
      deletionDesc: "اطلب الإزالة الدائمة",
      portability: "النقل",
      portabilityDesc: "تصدير تقدمك",
    },
    securityMeasures: [
      "التشفير أثناء النقل (HTTPS/TLS 1.3)",
      "التشفير في الراحة",
      "الأمان على مستوى الصف (RLS)",
      "Google OAuth آمن",
      "موافقة المعلم المسبقة",
      "تحديد المعدل",
      "تسجيل التدقيق",
    ],
    serviceDescription: [
      "مصمم للاستخدام في المدارس الإسرائيلية تحت إشراف المعلم",
      "متوافق مع منهج اللغة الإنجليزية لوزارة التعليم الإسرائيلية (Band 1, 2, 3)",
      "مبني لدعم حسابات الطلاب المجهولة",
      "مخصص للأغراض التعليمية فقط",
    ],
    teacherAccountRules: [
      "تسجيل الدخول بحساب Google معتمد مسبقًا",
      "استخدام عنوان بريد إلكتروني تعليمي رسمي",
      "مسؤول عن أمان الحساب",
      "مسؤول عن إدارة الفصل",
    ],
    studentAccountRules: [
      "حساب مجهول مع اسم عرض فقط",
      "الوصول عبر رمز فصل مكون من 6 أرقام",
      "لا يلزم بريد إلكتروني أو معلومات شخصية",
      "يجب عدم استخدام الاسم الكامل الحقيقي",
    ],
    schoolAuthorization: "تفويض المدرسة: من خلال توفير رموز الفصل للطلاب، يمثل المعلمون أن لديهم تفويضًا من مؤسستهم التعليمية لاستخدام Vocaband للأغراض التعليمية.",
    acceptableUse: [
      "الاستخدام للأغراض التعليمية فقط",
      "الحفاظ على النزاهة الأكاديمية",
      "الحفاظ على التفاعلات المحترمة",
      "الإبلاغ عن الأخطاء والمشاكل",
    ],
    prohibitedUse: [
      "استخدام الروبوتات أو النصوص الآلية",
      "الوصول إلى حسابات أو بيانات الآخرين",
      "استخدام أسماء مسيئة أو انتحالية",
      "مضايقة أو تنمر المستخدمين الآخرين",
      "مشاركة رموز الفصل بشكل غير لائق",
      "الهندسة العكسية للخدمة",
    ],
    teacherDuties: [
      { title: "إدارة رمز الفصل:", desc: "حافظ على سرية الرموز، شاركها فقط مع الطلاب المقصودين" },
      { title: "الإشراف:", desc: "أشر بشكل مناسب على استخدام الطلاب" },
      { title: "إدارة البيانات:", desc: "احذف الفصول عندما لم تعد مطلوبة" },
      { title: "سياسات المدرسة:", desc: "الالتزام بسياسات حماية البيانات المؤسسية" },
    ],
  },
};

// Privacy Policy simple translations
export const privacyTranslations: Record<Language, {
  title: string;
  titleHighlight: string;
  effective: string;
  version: string;
  legalBasis: string;
  summary: {
    badge: string;
    text: string;
  };
  footer: {
    haveQuestions: string;
    responseTime: string;
    related: string;
    termsLink: string;
    acceptButton: string;
    backButton: string;
  };
}> = {
  en: {
    title: "Privacy",
    titleHighlight: "Policy",
    effective: "Effective: March 2024",
    version: "Version 2.0",
    legalBasis: "Legal Basis: Privacy Protection Law, 5741-1981 (Israel), Amendment 13",
    summary: {
      badge: "Summary",
      text: "Vocaband is designed for Israeli schools. Student accounts are anonymous—no email or personal identification required. Teachers sign in with Google. We don't sell data, show ads, or track users for marketing.",
    },
    footer: {
      haveQuestions: "Have Questions?",
      responseTime: "Our privacy team responds within 30 days.",
      related: "Related:",
      termsLink: "Terms of Service",
      acceptButton: "Accept & Continue",
      backButton: "Back",
    },
  },
  he: {
    title: "מדיניות",
    titleHighlight: "פרטיות",
    effective: "תוקף: מרץ 2024",
    version: "גרסה 2.0",
    legalBasis: "בסיס חוקי: חוק הגנת הפרטיות, התשמ\"א-1981 (ישראל), תיקון 13",
    summary: {
      badge: "תקציר",
      text: "Vocaband מתוכנן לבתי ספר בישראל. חשבונות תלמידים הם אנונימיים - ללא דוא\"ל או זיהוי אישי. מורים נכנסים עם Google. איננו מוכרים מידע, מציגים פרסומות, או עוקבים אחר משתמשים לצורכי שיווק.",
    },
    footer: {
      haveQuestions: "יש לך שאלות?",
      responseTime: "צוות הפרטיות שלנו משיב תוך 30 יום.",
      related: "קשור:",
      termsLink: "תנאי שימוש",
      acceptButton: "קבל והמשך",
      backButton: "חזור",
    },
  },
  ar: {
    title: "سياسة",
    titleHighlight: "الخصوصية",
    effective: "ساري المفعول: مارس 2024",
    version: "الإصدار 2.0",
    legalBasis: "الأساس القانوني: قانون حماية الخصوصية، 5741-1981 (إسرائيل)، التعديل 13",
    summary: {
      badge: "ملخص",
      text: "تم تصميم Vocaband للمدارس الإسرائيلية. حسابات الطلاب مجهولة - لا حاجة للبريد الإلكتروني أو الهوية الشخصية. يسجل المعلمون عبر Google. نحن لا نبيع البيانات أو نعرض الإعلانات أو نتتبع المستخدمين للتسويق.",
    },
    footer: {
      haveQuestions: "هل لديك أسئلة؟",
      responseTime: "فريق الخصوصية لدينا يرد خلال 30 يومًا.",
      related: "ذات صلة:",
      termsLink: "شروط الخدمة",
      acceptButton: "قبول ومتابعة",
      backButton: "رجوع",
    },
  },
};

// Terms of Service simple translations
export const termsTranslations: Record<Language, {
  title: string;
  titleHighlight: string;
  effective: string;
  version: string;
  intro: string;
  footer: {
    questions: string;
    contact: string;
    print: string;
    privacyLink: string;
    acceptButton: string;
    backButton: string;
  };
}> = {
  en: {
    title: "Terms of",
    titleHighlight: "Service",
    effective: "Effective: March 2024",
    version: "Version 2.0",
    intro: "Vocaband is an educational vocabulary platform for Israeli schools. Students use anonymous accounts; teachers sign in with Google.",
    footer: {
      questions: "Questions?",
      contact: "Contact us about these Terms.",
      print: "Print",
      privacyLink: "Privacy Policy",
      acceptButton: "Accept & Continue",
      backButton: "Back",
    },
  },
  he: {
    title: "תנאי",
    titleHighlight: "שימוש",
    effective: "תוקף: מרץ 2024",
    version: "גרסה 2.0",
    intro: "Vocaband היא פלטפורמה חינוכית לאוצר מילים לבתי ספר בישראל. תלמידים משתמשים בחשבונות אנונימיים; מורים נכנסים עם Google.",
    footer: {
      questions: "שאלות?",
      contact: "צור איתנו קשר לגבי תנאים אלה.",
      print: "הדפס",
      privacyLink: "מדיניות פרטיות",
      acceptButton: "קבל והמשך",
      backButton: "חזור",
    },
  },
  ar: {
    title: "شروط",
    titleHighlight: "الخدمة",
    effective: "ساري المفعول: مارس 2024",
    version: "الإصدار 2.0",
    intro: "Vocaband هي منصة تعليمية للمفردات للمدارس الإسرائيلية. يستخدم الطلاب حسابات مجهولة؛ يسجل المعلمون عبر Google.",
    footer: {
      questions: "أسئلة؟",
      contact: "تواصل معنا بشأن هذه الشروط.",
      print: "طباعة",
      privacyLink: "سياسة الخصوصية",
      acceptButton: "قبول ومتابعة",
      backButton: "رجوع",
    },
  },
};
