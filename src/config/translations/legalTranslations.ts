import { Language } from "../../hooks/useLanguage";

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
      "Designed for use in ESL classrooms under teacher supervision",
      "Vocabulary levels aligned with CEFR A1–B2 (three comprehensive sets)",
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
      "מתוכנן לשימוש בכיתות ESL בפיקוח מורים",
      "רמות אוצר מילים מותאמות ל-CEFR A1–B2 (שלוש סטים מקיפים)",
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
      "مصمم للاستخدام في فصول ESL تحت إشراف المعلم",
      "مستويات المفردات متوافقة مع CEFR A1–B2 (ثلاث مجموعات شاملة)",
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
    effective: "Effective: April 2026",
    version: "Version 2.1",
    legalBasis: "Legal Basis: Privacy Protection Law, 5741-1981 (Israel), Amendment 13",
    summary: {
      badge: "Summary",
      text: "Vocaband is designed for ESL classrooms worldwide. Student accounts are anonymous—no email or personal identification required. Teachers sign in with Google. We don't sell data, show ads, or track users for marketing.",
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
    effective: "תוקף: אפריל 2026",
    version: "גרסה 2.1",
    legalBasis: "בסיס חוקי: חוק הגנת הפרטיות, התשמ\"א-1981 (ישראל), תיקון 13",
    summary: {
      badge: "תקציר",
      text: "Vocaband מתוכנן לכיתות ESL ברחבי העולם. חשבונות תלמידים הם אנונימיים - ללא דוא\"ל או זיהוי אישי. מורים נכנסים עם Google. איננו מוכרים מידע, מציגים פרסומות, או עוקבים אחר משתמשים לצורכי שיווק.",
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
    effective: "ساري المفعول: أبريل 2026",
    version: "الإصدار 2.1",
    legalBasis: "الأساس القانوني: قانون حماية الخصوصية، 5741-1981 (إسرائيل)، التعديل 13",
    summary: {
      badge: "ملخص",
      text: "تم تصميم Vocaband لفصول ESL في جميع أنحاء العالم. حسابات الطلاب مجهولة - لا حاجة للبريد الإلكتروني أو الهوية الشخصية. يسجل المعلمون عبر Google. نحن لا نبيع البيانات أو نعرض الإعلانات أو نتتبع المستخدمين للتسويق.",
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
    effective: "Effective: April 2026",
    version: "Version 2.1",
    intro: "Vocaband is an educational vocabulary platform for ESL classrooms worldwide. Students use anonymous accounts; teachers sign in with Google.",
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
    effective: "תוקף: אפריל 2026",
    version: "גרסה 2.1",
    intro: "Vocaband היא פלטפורמה חינוכית לאוצר מילים לכיתות ESL ברחבי העולם. תלמידים משתמשים בחשבונות אנונימיים; מורים נכנסים עם Google.",
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
    effective: "ساري المفعول: أبريل 2026",
    version: "الإصدار 2.1",
    intro: "Vocaband هي منصة تعليمية للمفردات لفصول ESL في جميع أنحاء العالم. يستخدم الطلاب حسابات مجهولة؛ يسجل المعلمون عبر Google.",
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

// Accessibility Statement Translations
export const accessibilityTranslations: Record<Language, {
  title: string; lastUpdated: string; back: string;
  commitment: { title: string; text: string };
  features: { title: string;
    toolbar: { title: string; intro: string; items: string[] };
    keyboard: { title: string; items: string[] };
    screenReader: { title: string; items: string[] };
    rtl: { title: string; items: string[] };
    visual: { title: string; items: string[] };
    audio: { title: string; items: string[] };
  };
  standards: { title: string; items: string[] };
  limitations: { title: string; items: string[] };
  testing: { title: string; intro: string; items: string[] };
  contact: { title: string; intro: string; email: string; response: string };
}> = {
  en: {
    title: "Accessibility Statement", lastUpdated: "Last updated: April 2026", back: "Back",
    commitment: { title: "Our Commitment", text: "Vocaband is committed to ensuring digital accessibility for all users, including students, teachers, and parents with disabilities. We strive to meet WCAG 2.0 Level AA and the Israeli Standard IS 5568 for web accessibility. Our goal is to provide an inclusive learning experience where every student can practice English vocabulary effectively." },
    features: { title: "Accessibility Features",
      toolbar: { title: "Accessibility Toolbar", intro: "A floating accessibility button (bottom-right corner) provides 10 adjustable settings:", items: ["Font Size — Scale text from 88% to 200%", "High Contrast — Black background with gold text and cyan links", "Dyslexia Font — Switch to OpenDyslexic or Comic Sans MS", "Readable Font — Switch to Open Sans / Helvetica Neue", "Reduce Motion — Minimize all animations and transitions", "Highlight Links — Underline and add borders to all links", "Large Cursor — 32px custom cursor with 44px minimum touch targets", "Line Height — Adjust spacing between lines (1.5 to 2.0)", "Letter Spacing — Adjust spacing between letters (normal to extra-wide)", "Focus Indicators — Enhanced focus outlines on all interactive elements"] },
      keyboard: { title: "Keyboard Navigation", items: ["Skip links at the top of every page", "All interactive elements reachable by Tab key", "Buttons respond to Enter and Space keys", "Modals trap focus and close with Escape key", "Visible focus indicators with blue outline"] },
      screenReader: { title: "Screen Readers", items: ["ARIA landmarks for page structure", "Descriptive labels on buttons, icons, and controls", "Live regions for dynamic content updates", "Form fields with associated labels and error announcements"] },
      rtl: { title: "Language & RTL Support", items: ["Full support for English, Hebrew, and Arabic", "Automatic right-to-left layout for Hebrew and Arabic", "Bidirectional text handling in vocabulary displays and games"] },
      visual: { title: "Visual Design", items: ["Color contrast ratios meet WCAG AA requirements", "Information is not conveyed by color alone", "Respects prefers-reduced-motion system setting", "Text can be resized up to 200% without loss of content", "Responsive design from 320px to desktop"] },
      audio: { title: "Audio & Pronunciation", items: ["Word pronunciation triggered by user action, not automatically", "All audio content has visual equivalents", "Volume controls available in Quick Play sessions"] },
    },
    standards: { title: "Standards Compliance", items: ["WCAG 2.0 Level AA — Web Content Accessibility Guidelines", "IS 5568 — Israeli Standard for Web Accessibility", "Section 508 — US federal accessibility requirements"] },
    limitations: { title: "Known Limitations", items: ["Some game modes involve quick responses which may be challenging for users needing extra time. Flashcard mode has no time pressure.", "Quick Play join via QR code requires a camera. Students can also enter the session code manually.", "Google OAuth login and Google Fonts are loaded from external services with their own accessibility policies."] },
    testing: { title: "Testing", intro: "We test accessibility using automated tools and manual testing:", items: ["Chrome Lighthouse accessibility audit", "Keyboard-only navigation testing", "Screen reader testing with NVDA and VoiceOver", "High contrast and reduced motion mode testing", "Mobile device testing on iOS and Android"] },
    contact: { title: "Feedback & Contact", intro: "If you encounter any accessibility barriers, please contact us:", email: "accessibility@vocaband.com", response: "We aim to respond within 5 business days and resolve issues within 30 days." },
  },
  he: {
    title: "הצהרת נגישות", lastUpdated: "עדכון אחרון: אפריל 2026", back: "חזרה",
    commitment: { title: "המחויבות שלנו", text: "Vocaband מחויבת להבטיח נגישות דיגיטלית לכל המשתמשים, כולל תלמידים, מורים והורים עם מוגבלויות. אנו שואפים לעמוד בתקן WCAG 2.0 רמה AA ובתקן הישראלי ת\"י 5568 לנגישות אתרי אינטרנט. המטרה שלנו היא לספק חוויית למידה מכלילה שבה כל תלמיד יכול לתרגל אוצר מילים באנגלית בצורה יעילה." },
    features: { title: "תכונות נגישות",
      toolbar: { title: "סרגל נגישות", intro: "כפתור נגישות צף (בפינה הימנית התחתונה) מספק 10 הגדרות מתכווננות:", items: ["גודל גופן — שינוי גודל טקסט מ-88% עד 200%", "ניגודיות גבוהה — רקע שחור עם טקסט זהב וקישורים בצבע ציאן", "גופן לדיסלקציה — מעבר לגופן OpenDyslexic או Comic Sans MS", "גופן קריא — מעבר לגופן Open Sans / Helvetica Neue", "הפחתת תנועה — מזעור כל האנימציות והמעברים", "הדגשת קישורים — קו תחתון וגבולות לכל הקישורים", "סמן גדול — סמן מותאם בגודל 32px עם יעדי מגע מינימליים של 44px", "גובה שורה — כוונון ריווח בין שורות (1.5 עד 2.0)", "ריווח אותיות — כוונון ריווח בין אותיות (רגיל עד רחב במיוחד)", "מחווני מיקוד — מסגרות מיקוד משופרות על כל האלמנטים האינטראקטיביים"] },
      keyboard: { title: "ניווט מקלדת", items: ["קישורי דילוג בראש כל עמוד", "כל האלמנטים האינטראקטיביים נגישים באמצעות מקש Tab", "כפתורים מגיבים למקשי Enter ו-Space", "חלונות קופצים לוכדים מיקוד ונסגרים עם Escape", "מחווני מיקוד גלויים עם מסגרת כחולה"] },
      screenReader: { title: "קוראי מסך", items: ["סימוני ARIA למבנה העמוד", "תיאורים על כפתורים, סמלים ופקדים", "אזורים חיים לעדכוני תוכן דינמיים", "שדות טופס עם תוויות משויכות והודעות שגיאה"] },
      rtl: { title: "תמיכה בשפות ו-RTL", items: ["תמיכה מלאה באנגלית, עברית וערבית", "פריסה אוטומטית מימין לשמאל לעברית ולערבית", "טיפול בטקסט דו-כיווני בתצוגות אוצר מילים ומשחקים"] },
      visual: { title: "עיצוב חזותי", items: ["יחסי ניגודיות צבע עומדים בדרישות WCAG AA", "מידע לא מועבר באמצעות צבע בלבד", "מכבד הגדרת מערכת להפחתת תנועה", "ניתן להגדיל טקסט עד 200% ללא אובדן תוכן", "עיצוב רספונסיבי מ-320px ועד שולחן עבודה"] },
      audio: { title: "שמע והגייה", items: ["הגיית מילים מופעלת על ידי פעולת משתמש, לא אוטומטית", "לכל תוכן שמע יש מקבילה חזותית", "פקדי עוצמת קול זמינים בסשנים של Quick Play"] },
    },
    standards: { title: "עמידה בתקנים", items: ["WCAG 2.0 רמה AA — הנחיות נגישות תוכן אינטרנט", "ת\"י 5568 — התקן הישראלי לנגישות אתרי אינטרנט", "Section 508 — דרישות נגישות פדרליות של ארה\"ב"] },
    limitations: { title: "מגבלות ידועות", items: ["חלק ממצבי המשחק כוללים תגובות מהירות שעלולות להיות מאתגרות למשתמשים שזקוקים לזמן נוסף. מצב כרטיסיות ללא לחץ זמן.", "הצטרפות ל-Quick Play דרך QR דורשת מצלמה. תלמידים יכולים גם להזין קוד סשן ידנית.", "התחברות Google OAuth וגופני Google נטענים משירותים חיצוניים עם מדיניות נגישות משלהם."] },
    testing: { title: "בדיקות", intro: "אנו בודקים נגישות באמצעות כלים אוטומטיים ובדיקות ידניות:", items: ["ביקורת נגישות Chrome Lighthouse", "בדיקת ניווט מקלדת בלבד", "בדיקת קורא מסך עם NVDA ו-VoiceOver", "בדיקת ניגודיות גבוהה ומצב הפחתת תנועה", "בדיקת מכשירים ניידים ב-iOS ו-Android"] },
    contact: { title: "משוב ויצירת קשר", intro: "אם נתקלתם בחסמי נגישות, אנא צרו קשר:", email: "accessibility@vocaband.com", response: "אנו שואפים להגיב תוך 5 ימי עסקים ולפתור בעיות תוך 30 יום." },
  },
  ar: {
    title: "بيان إمكانية الوصول", lastUpdated: "آخر تحديث: أبريل 2026", back: "رجوع",
    commitment: { title: "التزامنا", text: "تلتزم Vocaband بضمان إمكانية الوصول الرقمي لجميع المستخدمين، بما في ذلك الطلاب والمعلمين وأولياء الأمور ذوي الإعاقة. نسعى لتلبية معيار WCAG 2.0 المستوى AA والمعيار الإسرائيلي IS 5568 لإمكانية الوصول إلى الويب. هدفنا توفير تجربة تعلم شاملة حيث يمكن لكل طالب ممارسة مفردات اللغة الإنجليزية بفعالية." },
    features: { title: "ميزات إمكانية الوصول",
      toolbar: { title: "شريط أدوات إمكانية الوصول", intro: "زر إمكانية الوصول العائم (في الزاوية اليمنى السفلية) يوفر 10 إعدادات قابلة للتعديل:", items: ["حجم الخط — تغيير حجم النص من 88% إلى 200%", "تباين عالٍ — خلفية سوداء مع نص ذهبي وروابط سماوية", "خط عسر القراءة — التبديل إلى OpenDyslexic أو Comic Sans MS", "خط مقروء — التبديل إلى Open Sans / Helvetica Neue", "تقليل الحركة — تقليل جميع الرسوم المتحركة والانتقالات", "تمييز الروابط — خط سفلي وحدود لجميع الروابط", "مؤشر كبير — مؤشر 32px مع أهداف لمس بحد أدنى 44px", "ارتفاع السطر — ضبط المسافة بين الأسطر (1.5 إلى 2.0)", "تباعد الأحرف — ضبط المسافة بين الأحرف (عادي إلى واسع جداً)", "مؤشرات التركيز — إطارات تركيز محسنة على جميع العناصر التفاعلية"] },
      keyboard: { title: "التنقل بلوحة المفاتيح", items: ["روابط تخطي في أعلى كل صفحة", "جميع العناصر التفاعلية قابلة للوصول بمفتاح Tab", "الأزرار تستجيب لمفاتيح Enter و Space", "النوافذ المنبثقة تحبس التركيز وتُغلق بمفتاح Escape", "مؤشرات تركيز مرئية بإطار أزرق"] },
      screenReader: { title: "قارئات الشاشة", items: ["علامات ARIA لهيكل الصفحة", "أوصاف على الأزرار والأيقونات وعناصر التحكم", "مناطق حية لتحديثات المحتوى الديناميكي", "حقول النموذج مع تسميات مرتبطة وإعلانات الأخطاء"] },
      rtl: { title: "دعم اللغات و RTL", items: ["دعم كامل للإنجليزية والعبرية والعربية", "تخطيط تلقائي من اليمين لليسار للعبرية والعربية", "معالجة النص ثنائي الاتجاه في عروض المفردات والألعاب"] },
      visual: { title: "التصميم المرئي", items: ["نسب تباين الألوان تلبي متطلبات WCAG AA", "المعلومات لا تُنقل باللون وحده", "يحترم إعداد النظام لتقليل الحركة", "يمكن تكبير النص حتى 200% دون فقدان المحتوى", "تصميم متجاوب من 320px إلى سطح المكتب"] },
      audio: { title: "الصوت والنطق", items: ["نطق الكلمات يتم بإجراء المستخدم، وليس تلقائياً", "جميع المحتويات الصوتية لها مكافئات مرئية", "عناصر التحكم في الصوت متاحة في جلسات Quick Play"] },
    },
    standards: { title: "الامتثال للمعايير", items: ["WCAG 2.0 المستوى AA — إرشادات إمكانية الوصول لمحتوى الويب", "IS 5568 — المعيار الإسرائيلي لإمكانية الوصول", "القسم 508 — متطلبات إمكانية الوصول الفيدرالية الأمريكية"] },
    limitations: { title: "القيود المعروفة", items: ["بعض أوضاع اللعبة تتضمن استجابات سريعة قد تكون صعبة لمن يحتاجون وقتاً إضافياً. وضع البطاقات بدون ضغط وقت.", "الانضمام عبر QR يتطلب كاميرا. يمكن للطلاب إدخال رمز الجلسة يدوياً.", "تسجيل الدخول عبر Google وخطوط Google تُحمّل من خدمات خارجية لها سياسات وصول خاصة."] },
    testing: { title: "الاختبار", intro: "نختبر إمكانية الوصول باستخدام أدوات آلية واختبار يدوي:", items: ["تدقيق إمكانية الوصول من Chrome Lighthouse", "اختبار التنقل بلوحة المفاتيح فقط", "اختبار قارئ الشاشة مع NVDA و VoiceOver", "اختبار التباين العالي ووضع تقليل الحركة", "اختبار الأجهزة المحمولة على iOS و Android"] },
    contact: { title: "الملاحظات والتواصل", intro: "إذا واجهت عوائق في إمكانية الوصول، يرجى الاتصال بنا:", email: "accessibility@vocaband.com", response: "نهدف للرد خلال 5 أيام عمل وحل المشكلات خلال 30 يوماً." },
  },
};
