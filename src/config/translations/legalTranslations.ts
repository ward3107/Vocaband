import type { Language } from "../../hooks/useLanguage";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "../privacy-config";

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
    anonymous: "Class code and PIN",
    googleOAuth: "Google or email code",
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
      "An account with a display name or student code",
      "Access through a class link or code and a personal PIN",
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
    anonymous: "קוד כיתה וקוד אישי",
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
      "בנוי לתמיכה בחשבונות תלמידים ללא דוא״ל אישי",
      "מיועד למטרות חינוכיות בלבד",
    ],
    teacherAccountRules: [
      "כניסה עם חשבון Google מאושר מראש",
      "שימוש בכתובת דוא\"ל חינוכית רשמית",
      "אחריות לאבטחת החשבון",
      "אחריות לניהול הכיתה",
    ],
    studentAccountRules: [
      "חשבון עם שם תצוגה או קוד תלמיד",
      "כניסה דרך קישור או קוד כיתה וקוד אישי",
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
    anonymous: "رمز الصف ورمز PIN",
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
      "يدعم حسابات الطلاب دون بريد إلكتروني شخصي",
      "مخصص للأغراض التعليمية فقط",
    ],
    teacherAccountRules: [
      "تسجيل الدخول بحساب Google معتمد مسبقًا",
      "استخدام عنوان بريد إلكتروني تعليمي رسمي",
      "مسؤول عن أمان الحساب",
      "مسؤول عن إدارة الفصل",
    ],
    studentAccountRules: [
      "حساب باسم عرض أو رمز طالب",
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
    effective: `Updated ${PRIVACY_POLICY_VERSION}`,
    version: "Version 3.0",
    legalBasis: "Legal Basis: Privacy Protection Law, 5741-1981 (Israel), Amendment 13",
    summary: {
      badge: "Summary",
      text: "Students enter a class with a code or link and a personal PIN. We store a display name or student code, class membership and practice results for learning and feedback. Teachers can sign in with Google or a one-time email code. The service contains no advertising.",
    },
    footer: {
      haveQuestions: "Have Questions?",
      responseTime: "Contact us to discuss your request.",
      related: "Related:",
      termsLink: "Terms of Service",
      acceptButton: "Accept & Continue",
      backButton: "Back",
    },
  },
  he: {
    title: "מדיניות",
    titleHighlight: "פרטיות",
    effective: `עדכון ${PRIVACY_POLICY_VERSION}`,
    version: "גרסה 3.0",
    legalBasis: "בסיס חוקי: חוק הגנת הפרטיות, התשמ\"א-1981 (ישראל), תיקון 13",
    summary: {
      badge: "תקציר",
      text: "תלמידים נכנסים לכיתה דרך קוד או קישור וקוד אישי. אנחנו שומרים שם תצוגה או קוד תלמיד, שיוך לכיתה ותוצאות תרגול לצורך הלמידה והמשוב. מורים נכנסים דרך Google או בקוד חד־פעמי בדוא״ל. השירות פועל ללא פרסומות.",
    },
    footer: {
      haveQuestions: "יש לך שאלות?",
      responseTime: "אפשר לפנות אלינו עם בקשה בנושא פרטיות.",
      related: "קשור:",
      termsLink: "תנאי שימוש",
      acceptButton: "קבל והמשך",
      backButton: "חזור",
    },
  },
  ar: {
    title: "سياسة",
    titleHighlight: "الخصوصية",
    effective: `آخر تحديث ${PRIVACY_POLICY_VERSION}`,
    version: "الإصدار 3.0",
    legalBasis: "الأساس القانوني: قانون حماية الخصوصية، 5741-1981 (إسرائيل)، التعديل 13",
    summary: {
      badge: "ملخص",
      text: "يدخل الطلاب عبر رابط الصف أو رمزه ورمز PIN شخصي. نحفظ اسم العرض أو رمز الطالب والانتماء إلى الصف ونتائج التدريب للتعلّم وتقديم الملاحظات. يدخل المعلّمون عبر Google أو رمز لمرة واحدة بالبريد الإلكتروني. الخدمة خالية من الإعلانات.",
    },
    footer: {
      haveQuestions: "هل لديك أسئلة؟",
      responseTime: "تواصل معنا بشأن طلب الخصوصية.",
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
    effective: `Updated ${TERMS_VERSION}`,
    version: "Version 3.0",
    intro: "Vocaband is an educational vocabulary platform. Students use a class link or code and a personal PIN. Teachers can sign in with Google or a one-time email code.",
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
    effective: `עדכון ${TERMS_VERSION}`,
    version: "גרסה 3.0",
    intro: "Vocaband היא פלטפורמה ללימוד אוצר מילים. תלמידים נכנסים באמצעות קישור או קוד כיתה וקוד אישי. מורים נכנסים דרך Google או בקוד חד־פעמי בדוא״ל.",
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
    effective: `آخر تحديث ${TERMS_VERSION}`,
    version: "الإصدار 3.0",
    intro: "Vocaband منصة لتعلّم المفردات. يدخل الطلاب عبر رابط الصف أو رمزه ورمز PIN شخصي، ويدخل المعلّمون عبر Google أو رمز لمرة واحدة بالبريد الإلكتروني.",
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
    title: "Accessibility Statement", lastUpdated: "Updated 2026-11-19", back: "Back",
    commitment: { title: "Our Commitment", text: "We are improving access for students, teachers and parents. We apply the standards below as we revise and test the service." },
    features: { title: "Accessibility Features",
      toolbar: { title: "Accessibility Toolbar", intro: "A floating accessibility button (bottom-right corner) provides 10 adjustable settings:", items: ["Font Size — Scale text from 88% to 200%", "High Contrast — Black background with gold text and cyan links", "Dyslexia Font — Switch to OpenDyslexic or Comic Sans MS", "Readable Font — Switch to Open Sans / Helvetica Neue", "Reduce Motion — Minimize all animations and transitions", "Highlight Links — Underline and add borders to all links", "Large Cursor — 32px custom cursor with 44px minimum touch targets", "Line Height — Adjust spacing between lines (1.5 to 2.0)", "Letter Spacing — Adjust spacing between letters (normal to extra-wide)", "Focus Indicators — Enhanced focus outlines on all interactive elements"] },
      keyboard: { title: "Keyboard Navigation", items: ["Skip to the main content on supported pages", "Tab navigation and visible focus in the class entry form", "The public demo can be closed with Escape"] },
      screenReader: { title: "Screen Readers", items: ["ARIA landmarks for page structure", "Descriptive labels on buttons, icons, and controls", "Live regions for dynamic content updates", "Form fields with associated labels and error announcements"] },
      rtl: { title: "Language & RTL Support", items: ["Full support for English, Hebrew, and Arabic", "Automatic right-to-left layout for Hebrew and Arabic", "Bidirectional text handling in vocabulary displays and games"] },
      visual: { title: "Visual Design", items: ["A contrast control is available in the accessibility menu", "The app provides layouts for small screens and an option to reduce visual motion"] },
      audio: { title: "Audio & Pronunciation", items: ["Word pronunciation triggered by user action, not automatically", "All audio content has visual equivalents", "Volume controls available in Quick Play sessions"] },
    },
    standards: { title: "Standards used for review", items: ["Israeli Standard 5568, as applicable to the service.", "WCAG 2.2 AA is our engineering target for new and updated web interfaces."] },
    limitations: { title: "Known Limitations", items: ["Some timed games can be difficult if you need extra time. Flashcards offer an untimed option.", "Some downloadable PDFs still need accessibility review. Contact us for an alternative format.", "Class and game codes can be entered by hand."] },
    testing: { title: "Testing", intro: "We check key journeys by keyboard and continue testing mobile layouts, assistive technologies and downloads.", items: [] },
    contact: { title: "Feedback & Contact", intro: "If you encounter any accessibility barriers, please contact us:", email: "accessibility@vocaband.com", response: "We aim to respond within 5 business days and resolve issues within 30 days." },
  },
  he: {
    title: "הצהרת נגישות", lastUpdated: "עודכן ב־19.11.2026", back: "חזרה",
    commitment: { title: "המחויבות שלנו", text: "אנחנו משפרים את הנגישות לתלמידים, למורים ולהורים. בבדיקות ובעדכוני השירות אנחנו משתמשים בתקנים המפורטים בהמשך." },
    features: { title: "תכונות נגישות",
      toolbar: { title: "סרגל נגישות", intro: "כפתור נגישות צף (בפינה הימנית התחתונה) מספק 10 הגדרות מתכווננות:", items: ["גודל גופן — שינוי גודל טקסט מ-88% עד 200%", "ניגודיות גבוהה — רקע שחור עם טקסט זהב וקישורים בצבע ציאן", "גופן לדיסלקציה — מעבר לגופן OpenDyslexic או Comic Sans MS", "גופן קריא — מעבר לגופן Open Sans / Helvetica Neue", "הפחתת תנועה — מזעור כל האנימציות והמעברים", "הדגשת קישורים — קו תחתון וגבולות לכל הקישורים", "סמן גדול — סמן מותאם בגודל 32px עם יעדי מגע מינימליים של 44px", "גובה שורה — כוונון ריווח בין שורות (1.5 עד 2.0)", "ריווח אותיות — כוונון ריווח בין אותיות (רגיל עד רחב במיוחד)", "מחווני מיקוד — מסגרות מיקוד משופרות על כל האלמנטים האינטראקטיביים"] },
      keyboard: { title: "ניווט מקלדת", items: ["דילוג לתוכן הראשי בעמודים התומכים בכך", "ניווט עם Tab ומיקוד גלוי בטופס הכניסה לכיתה", "אפשר לסגור את ההדגמה באמצעות Escape"] },
      screenReader: { title: "קוראי מסך", items: ["סימוני ARIA למבנה העמוד", "תיאורים על כפתורים, סמלים ופקדים", "אזורים חיים לעדכוני תוכן דינמיים", "שדות טופס עם תוויות משויכות והודעות שגיאה"] },
      rtl: { title: "תמיכה בשפות ו-RTL", items: ["תמיכה מלאה באנגלית, עברית וערבית", "פריסה אוטומטית מימין לשמאל לעברית ולערבית", "טיפול בטקסט דו-כיווני בתצוגות אוצר מילים ומשחקים"] },
      visual: { title: "עיצוב חזותי", items: ["אפשר לשנות ניגודיות דרך תפריט הנגישות", "השירות כולל פריסה למסכים קטנים ואפשרות להפחתת תנועה"] },
      audio: { title: "שמע והגייה", items: ["הגיית מילים מופעלת על ידי פעולת משתמש, לא אוטומטית", "לכל תוכן שמע יש מקבילה חזותית", "פקדי עוצמת קול זמינים בסשנים של Quick Play"] },
    },
    standards: { title: "תקנים המשמשים לבדיקה", items: ["תקן ישראלי 5568, בהתאם לתחולתו על השירות.", "WCAG 2.2 AA הוא יעד ההנדסה שלנו לממשקים חדשים ומעודכנים."] },
    limitations: { title: "מגבלות ידועות", items: ["חלק מהמשחקים מוגבלים בזמן. כרטיסיות זמינות ללא מגבלת זמן.", "חלק מקובצי ה־PDF עדיין דורשים בדיקת נגישות. אפשר לפנות אלינו לקבלת פורמט חלופי.", "אפשר להקליד קוד כיתה או משחק במקלדת."] },
    testing: { title: "בדיקות", intro: "אנחנו בודקים מסלולים מרכזיים במקלדת וממשיכים לבדוק תצוגה בנייד, טכנולוגיות מסייעות וקבצים להורדה.", items: [] },
    contact: { title: "משוב ויצירת קשר", intro: "אם נתקלתם בחסמי נגישות, אנא צרו קשר:", email: "accessibility@vocaband.com", response: "אנו שואפים להגיב תוך 5 ימי עסקים ולפתור בעיות תוך 30 יום." },
  },
  ar: {
    title: "بيان إمكانية الوصول", lastUpdated: "آخر تحديث 2026-11-19", back: "رجوع",
    commitment: { title: "التزامنا", text: "نعمل على تحسين إمكانية الوصول للطلاب والمعلمين والأهل. نستخدم المعايير أدناه عند مراجعة الخدمة واختبارها." },
    features: { title: "ميزات إمكانية الوصول",
      toolbar: { title: "شريط أدوات إمكانية الوصول", intro: "زر إمكانية الوصول العائم (في الزاوية اليمنى السفلية) يوفر 10 إعدادات قابلة للتعديل:", items: ["حجم الخط — تغيير حجم النص من 88% إلى 200%", "تباين عالٍ — خلفية سوداء مع نص ذهبي وروابط سماوية", "خط عسر القراءة — التبديل إلى OpenDyslexic أو Comic Sans MS", "خط مقروء — التبديل إلى Open Sans / Helvetica Neue", "تقليل الحركة — تقليل جميع الرسوم المتحركة والانتقالات", "تمييز الروابط — خط سفلي وحدود لجميع الروابط", "مؤشر كبير — مؤشر 32px مع أهداف لمس بحد أدنى 44px", "ارتفاع السطر — ضبط المسافة بين الأسطر (1.5 إلى 2.0)", "تباعد الأحرف — ضبط المسافة بين الأحرف (عادي إلى واسع جداً)", "مؤشرات التركيز — إطارات تركيز محسنة على جميع العناصر التفاعلية"] },
      keyboard: { title: "التنقل بلوحة المفاتيح", items: ["تخطي إلى المحتوى الرئيسي في الصفحات المدعومة", "التنقّل بزر Tab والتركيز المرئي في نموذج دخول الصف", "يمكن إغلاق العرض التجريبي بزر Escape"] },
      screenReader: { title: "قارئات الشاشة", items: ["علامات ARIA لهيكل الصفحة", "أوصاف على الأزرار والأيقونات وعناصر التحكم", "مناطق حية لتحديثات المحتوى الديناميكي", "حقول النموذج مع تسميات مرتبطة وإعلانات الأخطاء"] },
      rtl: { title: "دعم اللغات و RTL", items: ["دعم كامل للإنجليزية والعبرية والعربية", "تخطيط تلقائي من اليمين لليسار للعبرية والعربية", "معالجة النص ثنائي الاتجاه في عروض المفردات والألعاب"] },
      visual: { title: "التصميم المرئي", items: ["يمكن تعديل التباين من قائمة إمكانية الوصول", "تتوفّر واجهة للشاشات الصغيرة وخيار تقليل الحركة"] },
      audio: { title: "الصوت والنطق", items: ["نطق الكلمات يتم بإجراء المستخدم، وليس تلقائياً", "جميع المحتويات الصوتية لها مكافئات مرئية", "عناصر التحكم في الصوت متاحة في جلسات Quick Play"] },
    },
    standards: { title: "المعايير التي نستخدمها للمراجعة", items: ["المعيار الإسرائيلي 5568 وفق نطاق انطباقه على الخدمة.", "نعتمد WCAG 2.2 AA هدفًا هندسيًا للواجهات الجديدة والمحدّثة."] },
    limitations: { title: "القيود المعروفة", items: ["بعض الألعاب محدودة بوقت. تتوفّر البطاقات دون حدّ زمني.", "تحتاج بعض ملفات PDF إلى مراجعة إمكانية الوصول. تواصل معنا لطلب نسخة بديلة.", "يمكن إدخال رموز الصف واللعبة يدويًا."] },
    testing: { title: "الاختبار", intro: "نختبر المسارات الأساسية بلوحة المفاتيح ونواصل مراجعة الهواتف والتقنيات المساعدة والملفات القابلة للتنزيل.", items: [] },
    contact: { title: "الملاحظات والتواصل", intro: "إذا واجهت عوائق في إمكانية الوصول، يرجى الاتصال بنا:", email: "accessibility@vocaband.com", response: "نهدف للرد خلال 5 أيام عمل وحل المشكلات خلال 30 يوماً." },
  },
};
