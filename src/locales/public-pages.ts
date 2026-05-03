/**
 * Public pages locale file
 * Translations for Privacy, Terms, and Security pages
 */
import type { Language } from "../hooks/useLanguage";

export interface PublicPagesT {
  // ─── Privacy Page ────────────────────────────────────────────────
  privacy: {
    title: string;
    titleHighlight: string;
    legalBasisLabel: string;
    summary: {
      badge: string;
      text: string;
    };
    section1: {
      title: string;
      intro: string;
      entityLabel: string;
      addressLabel: string;
      privacyContactLabel: string;
      entity: string;
      address: string;
      contactEmail: string;
      contactNote: string;
    };
    section2: {
      title: string;
      studentData: {
        displayName: string;
        avatar: string;
        classCode: string;
        progress: string;
        badges: string;
      };
      notCollect: string;
      teacherData: {
        email: string;
        displayName: string;
        classes: string;
        assignments: string;
      };
    };
    section3: {
      title: string;
      tablePurpose: string;
      tableLegalBasis: string;
      rows: {
        row1: { purpose: string; basis: string };
        row2: { purpose: string; basis: string };
        row3: { purpose: string; basis: string };
        row4: { purpose: string; basis: string };
      };
      notDo: string;
    };
    section4: {
      title: string;
      tableService: string;
      tablePurpose: string;
      tableLocation: string;
      supabase: { service: string; purpose: string; location: string };
      google: { service: string; purpose: string; location: string };
      fly: { service: string; purpose: string; location: string };
      cloudflare: { service: string; purpose: string; location: string };
    };
    section5: {
      title: string;
      days365: string;
      days90: string;
      active2years: string;
      years2: string;
    };
    section6: {
      title: string;
      intro: string;
      rightsTitle: string;
    };
    section7: {
      title: string;
      intro: string;
      minimize: string;
    };
    section8: {
      title: string;
      securityDetails: string;
    };
    section9: {
      title: string;
      intro: string;
      contactStep: string;
      complaintStep: string;
    };
    footer: {
      haveQuestions: string;
      responseTime: string;
      backButton: string;
      related: string;
      termsLink: string;
    };
  };

  // ─── Terms Page ───────────────────────────────────────────────────
  terms: {
    title: string;
    titleHighlight: string;
    intro: string;
    section1: {
      title: string;
      para1: string;
      para2: string;
    };
    section2: {
      title: string;
      intro: string;
      bullet1: string;
      bullet2: string;
      bullet3: string;
      bullet4: string;
    };
    section3: {
      title: string;
      intro: string;
      changesLabel: string;
      changesNote: string;
    };
    section4: {
      title: string;
      intro: string;
      student: {
        anonymous: string;
        classCode: string;
        educationalOnly: string;
      };
      teacher: {
        preApproved: string;
        officialEmail: string;
        responsible: string;
        schoolAuth: string;
      };
    };
    section5: {
      title: string;
      intro: string;
      item1: string;
      item2: string;
      item3: string;
      item4: string;
    };
    section6: {
      title: string;
      intro: string;
      item1: string;
      item2: string;
      item3: string;
      item4: string;
      item5: string;
      item6: string;
    };
    section7: {
      title: string;
      intro: string;
      duty1: { title: string; desc: string };
      duty2: { title: string; desc: string };
      duty3: { title: string; desc: string };
      duty4: { title: string; desc: string };
    };
    section8: {
      title: string;
      para1: string;
      para2: string;
    };
    section9: {
      title: string;
      para1: string;
      contactLabel: string;
      contact: string;
    };
    footer: {
      backButton: string;
      related: string;
      privacyLink: string;
    };
  };

  // ─── Security Page ────────────────────────────────────────────────
  security: {
    title: string;
    titleHighlight: string;
    badge: string;
    intro: string;
    sslLabsBadge: string;
    sslLabsLink: string;
    encrypted: string;
    eu: string;
    section1: { title: string; body: string };
    section2: { title: string; body: string };
    section3: { title: string; body: string };
    section4: { title: string; body: string };
    section5: { title: string; body: string };
    contact: {
      title: string;
      body: string;
      cta: string;
    };
    bottomLinks: {
      privacy: string;
      terms: string;
    };
  };
}

export const publicPagesT: Record<Language, PublicPagesT> = {
  en: {
    privacy: {
      title: "Privacy",
      titleHighlight: "Policy",
      legalBasisLabel: "Legal Basis:",
      summary: {
        badge: "Privacy in a nutshell",
        text: "Vocaband collects minimal student data: anonymous display names, game progress, and class associations. No email, no real names, no location tracking. Teachers use Google OAuth for secure sign-in.",
      },
      section1: {
        title: "Data Controller",
        intro: "Under the Israeli Privacy Protection Law (Amendment 13), the data controller for Vocaband is:",
        entityLabel: "Entity:",
        addressLabel: "Address:",
        privacyContactLabel: "Privacy Contact:",
        entity: "Vocaband Educational Technologies",
        address: "Israel",
        contactEmail: "contact@vocaband.com",
        contactNote: "For privacy inquiries, data access requests, or complaints, contact us at the email above. We will respond within 30 days as required by law.",
      },
      section2: {
        title: "Data We Collect",
        studentData: {
          displayName: "Display name",
          avatar: "Avatar",
          classCode: "Class code",
          progress: "Progress",
          badges: "Badges",
        },
        notCollect: "We do NOT collect: email, phone, address, photos, IDs",
        teacherData: {
          email: "Email",
          displayName: "Display name",
          classes: "Classes",
          assignments: "Assignments",
        },
      },
      section3: {
        title: "How We Use Your Data",
        tablePurpose: "Purpose",
        tableLegalBasis: "Legal Basis",
        rows: {
          row1: { purpose: "Provide vocabulary games", basis: "Contract performance" },
          row2: { purpose: "Show teachers student progress", basis: "Contract performance" },
          row3: { purpose: "Authenticate teachers", basis: "Contract + Security" },
          row4: { purpose: "Prevent abuse", basis: "Legitimate interest" },
        },
        notDo: "We do NOT: Sell data • Show ads • Create profiles • Share with brokers • Use tracking cookies",
      },
      section4: {
        title: "Third-Party Processors",
        tableService: "Service",
        tablePurpose: "Purpose",
        tableLocation: "Location",
        supabase: { service: "Supabase", purpose: "Database, authentication", location: "EU (Frankfurt) / US" },
        google: { service: "Google OAuth", purpose: "Teacher sign-in only", location: "US" },
        fly: { service: "Fly.io", purpose: "Application server hosting", location: "EU / US" },
        cloudflare: { service: "Cloudflare", purpose: "Static asset delivery + CDN", location: "Global edge" },
      },
      section5: {
        title: "Data Retention",
        days365: "365 days",
        days90: "90 days",
        active2years: "Active + 2 years",
        years2: "2 years",
      },
      section6: {
        title: "Your Rights",
        intro: "Under Israeli Privacy Protection Law (Amendment 13), you have the right to:",
        rightsTitle: "Data Subject Rights",
      },
      section7: {
        title: "Children's Privacy",
        intro: "Vocaband is designed for students in schools worldwide. The educational institution (school) authorizes student use. By providing a class code, the teacher (on behalf of the school) authorizes student access.",
        minimize: "We minimize data collection from students: No email required • No real name required • No location tracking • No behavioral advertising",
      },
      section8: {
        title: "Security Measures",
        securityDetails: "See full Security & Trust details →",
      },
      section9: {
        title: "Complaints",
        intro: "If you believe your privacy rights have been violated, you may:",
        contactStep: "Contact us at ",
        complaintStep: "File a complaint with the Israeli Privacy Protection Authority",
      },
      footer: {
        haveQuestions: "Have Questions?",
        responseTime: "We respond within 30 days",
        backButton: "Back",
        related: "Related:",
        termsLink: "Terms of Service",
      },
    },

    terms: {
      title: "Terms",
      titleHighlight: "of Service",
      intro: "Welcome to Vocaband — the gamified English vocabulary platform for students and teachers. These Terms govern your use of our Service.",
      section1: {
        title: "Acceptance of Terms",
        para1: "By accessing or using Vocaband, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. These Terms constitute a legally binding agreement between you and Vocaband Educational Technologies.",
        para2: "We may modify these Terms at any time. Material changes will be communicated through the Service, and your continued use after such changes constitutes acceptance.",
      },
      section2: {
        title: "Description of Service",
        intro: "Vocaband is an educational technology platform that helps students practice English vocabulary through interactive games. The Service is:",
        bullet1: "Designed for use in ESL classrooms under teacher supervision",
        bullet2: "Vocabulary levels aligned with CEFR A1–B2 (three comprehensive sets)",
        bullet3: "Built to support anonymous student accounts",
        bullet4: "Intended for educational purposes only",
      },
      section3: {
        title: "Modifications",
        intro: "We reserve the right to modify or discontinue the Service at any time.",
        changesLabel: "Changes to Terms:",
        changesNote: "Significant changes will require your explicit consent. Minor updates will be posted on this page.",
      },
      section4: {
        title: "User Accounts",
        intro: "Vocaband offers two types of accounts:",
        student: {
          anonymous: "Anonymous account with display name only",
          classCode: "Access via 6-digit class code",
          educationalOnly: "For educational purposes only",
        },
        teacher: {
          preApproved: "Sign in with pre-approved Google account",
          officialEmail: "Use official educational email address",
          responsible: "Responsible for account security",
          schoolAuth: "Authorized by educational institution",
        },
      },
      section5: {
        title: "Acceptable Use",
        intro: "You agree to use the Service only for lawful purposes.",
        item1: "Use for educational purposes only",
        item2: "Maintain academic integrity",
        item3: "Keep interactions respectful",
        item4: "Report bugs and issues",
      },
      section6: {
        title: "Prohibited Use",
        intro: "You must NOT:",
        item1: "Use bots or automated scripts",
        item2: "Access others' accounts or data",
        item3: "Use offensive or impersonating names",
        item4: "Harass or bully other users",
        item5: "Share class codes inappropriately",
        item6: "Reverse-engineer the Service",
      },
      section7: {
        title: "Teacher Responsibilities",
        intro: "Teachers using Vocaband agree to:",
        duty1: { title: "Class Code Management:", desc: "Keep codes confidential, share only with intended students" },
        duty2: { title: "Supervision:", desc: "Appropriately supervise student use" },
        duty3: { title: "Data Management:", desc: "Delete classes when no longer needed" },
        duty4: { title: "School Policies:", desc: "Comply with institutional data protection policies" },
      },
      section8: {
        title: "Privacy & Data",
        para1: "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.",
        para2: "By creating an account, you consent to the collection and use of your information as described in the Privacy Policy.",
      },
      section9: {
        title: "Contact & Termination",
        para1: "We reserve the right to suspend or terminate accounts that violate these Terms.",
        contactLabel: "Questions? Contact us at",
        contact: "contact@vocaband.com",
      },
      footer: {
        backButton: "Back",
        related: "Related:",
        privacyLink: "Privacy Policy",
      },
    },

    security: {
      title: "Security",
      titleHighlight: "& Trust",
      badge: "Independently verified",
      intro: "How we protect your students' data, written in plain English. For the full technical detail, see our open-source security docs in the codebase.",
      sslLabsBadge: "SSL Labs A+",
      sslLabsLink: "View live report",
      encrypted: "Encrypted with TLS 1.3",
      eu: "Data hosted in the EU (Frankfurt)",
      section1: {
        title: "Encrypted in transit",
        body: "Every connection between your device and Vocaband uses TLS 1.2 or TLS 1.3 — the same encryption banks use. Older insecure versions (TLS 1.0, TLS 1.1) are blocked. Verified A+ by SSL Labs.",
      },
      section2: {
        title: "Encrypted at rest",
        body: "Your data lives on Supabase's PostgreSQL servers in the EU (Frankfurt region). Disks are encrypted at the storage layer; backups are encrypted automatically.",
      },
      section3: {
        title: "Strict access rules",
        body: "Every database table has Row-Level Security policies — students can only read their own progress, teachers can only read their own classes, no cross-account access is possible. Verified by automated tests + manual penetration tests.",
      },
      section4: {
        title: "Secure sign-in",
        body: "Teachers sign in with Google OAuth — Vocaband never sees or stores teacher passwords. Students join classes via a 6-character code; their accounts are scoped to that class only.",
      },
      section5: {
        title: "Regular audits",
        body: "We run a full security review every quarter: dependency vulnerabilities, RLS policy drift, TLS configuration, and penetration tests. Our most recent audit (April 2026) closed 3 HIGH + 3 MED findings, plus a CodeQL alert; SSL Labs grade improved from B to A+.",
      },
      contact: {
        title: "Found a vulnerability?",
        body: "We welcome responsible disclosure. Email",
        cta: "View security.txt",
      },
      bottomLinks: {
        privacy: "Privacy Policy",
        terms: "Terms of Service",
      },
    },
  },

  he: {
    privacy: {
      title: "פרטיות",
      titleHighlight: "ואבטחת מידע",
      legalBasisLabel: "בסיס חוקי:",
      summary: {
        badge: "הפרטיות במשפט אחד",
        text: "Vocaband אוסף מינימום נתונים על תלמידים: שמות תצוגה אנונימיים, התקדמות במשחק, ושיוך לכיתה. ללא דוא\"ל, ללא שמות אמיתיים, ללא מעקב מיקום. מורים משתמשים ב-Google OAuth לכניסה מאובטחת.",
      },
      section1: {
        title: "בעל מאגר הנתונים",
        intro: "לפי חוק הגנת הפרטיות (תיקון 13), בעל מאגר הנתונים של Vocaband הוא:",
        entityLabel: "גוף:",
        addressLabel: "כתובת:",
        privacyContactLabel: "יצירת קשר לפרטיות:",
        entity: "Vocaband טכנולוגיות חינוכיות",
        address: "ישראל",
        contactEmail: "contact@vocaband.com",
        contactNote: "לפניות פרטיות, בקשות גישה לנתונים או תלונות, צרו איתנו קשר בכתובת למעלה. נשיב תוך 30 יום כנדרש על פי חוק.",
      },
      section2: {
        title: "נתונים שאנו אוספים",
        studentData: {
          displayName: "שם תצוגה",
          avatar: "אווטר",
          classCode: "קוד כיתה",
          progress: "התקדמות",
          badges: "תגים",
        },
        notCollect: "איננו אוספים: דוא\"ל, טלפון, כתובת, תמונות, תעודות זהות",
        teacherData: {
          email: "דוא\"ל",
          displayName: "שם תצוגה",
          classes: "כיתות",
          assignments: "מטלות",
        },
      },
      section3: {
        title: "כיצד אנו משתמשים בנתונים שלך",
        tablePurpose: "מטרה",
        tableLegalBasis: "בסיס משפטי",
        rows: {
          row1: { purpose: "ספק משחקי אוצר מילים", basis: "ביצוע חוזה" },
          row2: { purpose: "הצגת התקדמות תלמידים למורים", basis: "ביצוע חוזה" },
          row3: { purpose: "אימות מורים", basis: "חוזה + אבטחה" },
          row4: { purpose: "מניעת שימוש לרעה", basis: "אינטרס לגיטימי" },
        },
        notDo: "איננו: מוכרים נתונים • מציגים פרסומות • יוצרים פרופילים • משתפים עם מתווכים • משתמשים בעוגיות מעקב",
      },
      section4: {
        title: "מעבדי צד שלישי",
        tableService: "שירות",
        tablePurpose: "מטרה",
        tableLocation: "מיקום",
        supabase: { service: "Supabase", purpose: "מסד נתונים, אימות", location: "איחוד האירופי (פרנקפורט) / ארה\"ב" },
        google: { service: "Google OAuth", purpose: "כניסת מורים בלבד", location: "ארה\"ב" },
        fly: { service: "Fly.io", purpose: "אירוח שרת היישום", location: "איחוד האירופי / ארה\"ב" },
        cloudflare: { service: "Cloudflare", purpose: "אספקת נכסים סטטיים + CDN", location: "קצה גלובלי" },
      },
      section5: {
        title: "שמירת נתונים",
        days365: "365 יום",
        days90: "90 יום",
        active2years: "פעיל + 2 שנים",
        years2: "2 שנים",
      },
      section6: {
        title: "הזכויות שלך",
        intro: "לפי חוק הגנת הפרטיות (תיקון 13), יש לך את הזכות:",
        rightsTitle: "זכויות נושא הנתונים",
      },
      section7: {
        title: "פרטיות ילדים",
        intro: "Vocaband מיועד לתלמידים בבתי ספר ברחבי העולם. המוסד החינוכי (בית הספר) מאשר שימוש תלמידים. על ידי מתן קוד כיתה, המורה (מטעם בית הספר) מאשר גישת תלמידים.",
        minimize: "אנו ממזערים איסוף נתונים מתלמידים: ללא דוא\"ל • ללא שם אמיתי • ללא מעקב מיקום • ללא פרסום התנהגותית",
      },
      section8: {
        title: "אמצעי אבטחה",
        securityDetails: "ראו פרטי אבטחה ואמון מלאים ←",
      },
      section9: {
        title: "תלונות",
        intro: "אם אתה סבור שזכויות הפרטיות שלך הופרו, אתה רשאי:",
        contactStep: "לפנות אלינו בכתובת ",
        complaintStep: "להגיש תלונה לרשות להגנת הפרטיות",
      },
      footer: {
        haveQuestions: "יש לכם שאלות?",
        responseTime: "נשיב תוך 30 יום",
        backButton: "חזרה",
        related: "קשורים:",
        termsLink: "תנאי שימוש",
      },
    },

    terms: {
      title: "תנאי",
      titleHighlight: "השימוש",
      intro: "ברוכים ל-Vocaband — פלטפורמת אוצר מילים באנגלית משוחקת לתלמידים ומורים. תנאים אלה מסדירים את השימוש שלכם בשירות.",
      section1: {
        title: "קבלת התנאים",
        para1: "על ידי גישה או שימוש ב-Vocaband, אתה מאשר שקראת, הבנת ומסכים להיות מחויב על פי תנאי שירות אלה ומדיניות הפרטיות שלנו. תנאים אלה מהווים הסכם מחייב מבחינה משפטית בינך לבין Vocaband טכנולוגיות חינוכיות.",
        para2: "אנו רשאים לשנות תנאים אלה בכל עת. שינויים מהותיים יתקשרו דרך השירות, והמשך השימוש שלך לאחר שינויים כאלה מהווה הסכמה.",
      },
      section2: {
        title: "תיאור השירות",
        intro: "Vocaband היא פלטפורמה טכנולוגית חינוכית שעוזרת לתלמידים לתרגל אוצר מילים באנגלית דרך משחקים אינטראקטיביים. השירות הוא:",
        bullet1: "מתוכנן לשימוש בכיתות ESL בפיקוח מורים",
        bullet2: "רמות אוצר מילים מותאמות ל-CEFR A1–B2 (שלוש סטים מקיפים)",
        bullet3: "בנוי לתמיכה בחשבונות תלמידים אנונימיים",
        bullet4: "מיועד למטרות חינוכיות בלבד",
      },
      section3: {
        title: "שינויים",
        intro: "אנו שומרים את הזכות לשנות או להפסיק את השירות בכל עת.",
        changesLabel: "שינויים בתנאים:",
        changesNote: "שינויים משמעותיים ידרשו את הסכמתך המפורשת. עדכונים מינוריים יפורסמו בעמוד זה.",
      },
      section4: {
        title: "חשבונות משתמשים",
        intro: "Vocaband מציע שני סוגי חשבונות:",
        student: {
          anonymous: "חשבון אנונימי עם שם תצוגה בלבד",
          classCode: "גישה דרך קוד כיתה בן 6 ספרות",
          educationalOnly: "למטרות חינוכיות בלבד",
        },
        teacher: {
          preApproved: "כניסה עם חשבון Google מאושר מראש",
          officialEmail: "שימוש בכתובת דוא\"ל חינוכית רשמית",
          responsible: "אחראי לאבטחת החשבון",
          schoolAuth: "מאושר על ידי המוסד החינוכי",
        },
      },
      section5: {
        title: "שימוש מותר",
        intro: "אתה מסכים להשתמש בשירות רק למטרות חוקיות.",
        item1: "שימוש למטרות חינוכיות בלבד",
        item2: "שמירה על יושר אקדמי",
        item3: "לשמור אינטראקציות מכבדות",
        item4: "לדווח על באגים ובעיות",
      },
      section6: {
        title: "שימוש אסור",
        intro: "אסור לך:",
        item1: "להשתמש בבוטים או סקריפטים אוטומטיים",
        item2: "לגשת לחשבונות או נתונים של אחרים",
        item3: "להשתמש בשמות פוגעניים או מתחזים",
        item4: "להטריד או להציק על משתמשים אחרים",
        item5: "לשתף קודי כיתה בצורה לא נכונה",
        item6: "להנדס את השירות לאחור",
      },
      section7: {
        title: "אחריות מורים",
        intro: "מורים המשתמשים ב-Vocaband מסכימים:",
        duty1: { title: "ניהול קודי כיתה:", desc: "לשמור קודים חסויים, לשתף רק עם תלמידים מיועדים" },
        duty2: { title: "פיקוח:", desc: "לפקח כראוי על שימוש התלמידים" },
        duty3: { title: "ניהול נתונים:", desc: "למחוק כיתות כאשר לא נדרשות עוד" },
        duty4: { title: "מדיניות בית ספר:", desc: "לציית על פי מדיניות הגנת המידע של המוסד" },
      },
      section8: {
        title: "פרטיות ונתונים",
        para1: "הפרטיות שלך חשובה לנו. אנא עיין את מדיניות הפרטיות שלנו, המסדירה גם היא את השימוש שלך בשירות.",
        para2: "על ידי יצירת חשבון, אתה מסכים לאיסוף ושימוש במידע שלך כמתואר במדיניות הפרטיות.",
      },
      section9: {
        title: "יצירת קשר וסיום",
        para1: "אנו שומרים את הזכות להשעות או לבטל חשבונות המפרים תנאים אלה.",
        contactLabel: "יש לכם שאלות? צרו קשר בכתובת",
        contact: "contact@vocaband.com",
      },
      footer: {
        backButton: "חזרה",
        related: "קשורים:",
        privacyLink: "מדיניות פרטיות",
      },
    },

    security: {
      title: "אבטחה",
      titleHighlight: "ואמון",
      badge: "מאומת באופן עצמאי",
      intro: "כיצד אנו מגנים על נתוני התלמידים שלכם, בשפה פשוטה. לפרטים טכניים מלאים, ראו את מסמכי האבטחה במאגר הקוד הפתוח שלנו.",
      sslLabsBadge: "SSL Labs A+",
      sslLabsLink: "צפה בדוח חי",
      encrypted: "מוצפן עם TLS 1.3",
      eu: "הנתונים מאוחסנים באיחוד האירופי (פרנקפורט)",
      section1: {
        title: "מוצפן במהלך התעבורה",
        body: "כל חיבור בין המכשיר שלכם ל-Vocaband משתמש ב-TLS 1.2 או TLS 1.3 — אותה הצפנה שבנקים משתמשים בה. גרסאות ישנות ולא מאובטחות (TLS 1.0, TLS 1.1) חסומות. מאומת A+ על ידי SSL Labs (תקן תעשייה ציבורי).",
      },
      section2: {
        title: "מוצפן במנוחה",
        body: "הנתונים שלכם נמצאים על שרתי PostgreSQL של Supabase באיחוד האירופי (אזור פרנקפורט). הדיסקים מוצפנים ברמת האחסון; גיבויים מוצפנים אוטומטית.",
      },
      section3: {
        title: "כללי גישה קפדניים",
        body: "לכל טבלה במסד הנתונים יש מדיניות Row-Level Security — תלמידים יכולים לקרוא רק את ההתקדמות שלהם, מורים יכולים לקרוא רק את הכיתות שלהם, ואין אפשרות לגישה בין חשבונות. מאומת על ידי בדיקות אוטומטיות + בדיקות חדירה ידניות.",
      },
      section4: {
        title: "כניסה מאובטחת",
        body: "מורים נכנסים עם Google OAuth — Vocaband לעולם לא רואה או שומרת סיסמאות של מורים. תלמידים מצטרפים לכיתות באמצעות קוד בן 6 תווים; החשבונות שלהם מוגבלים לכיתה זו בלבד.",
      },
      section5: {
        title: "ביקורות סדירות",
        body: "אנו עורכים סקירת אבטחה מלאה כל רבעון: פגיעויות תלויות, סחיפת מדיניות RLS, תצורת TLS, ובדיקות חדירה. הביקורת האחרונה שלנו (אפריל 2026) סגרה 3 ממצאים בחומרה גבוהה ועוד 3 בחומרה בינונית, וכן התראת CodeQL; דירוג SSL Labs עלה מ-B ל-A+.",
      },
      contact: {
        title: "מצאתם פגיעות?",
        body: "אנו מקדמים בברכה גילוי אחראי. אימייל",
        cta: "צפה ב-security.txt",
      },
      bottomLinks: {
        privacy: "מדיניות פרטיות",
        terms: "תנאי שימוש",
      },
    },
  },

  ar: {
    privacy: {
      title: "الخصوصية",
      titleHighlight: "وسياسة البيانات",
      legalBasisLabel: "الأساس القانوني:",
      summary: {
        badge: "الخصوصية باختصار",
        text: "يجمع Vocaband بيانات طالبية محدودة: أسماء عرض مجهولة، التقدم في اللعبة، وارتباطات الفصل. لا بريد إلكتروني، لا أسماء حقيقية، لا تتبع للموقع. يستخدم المعلمون Google OAuth لتسجيل الدخول الآمن.",
      },
      section1: {
        title: "مراقب البيانات",
        intro: "بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، مراقب بيانات Vocaband هو:",
        entityLabel: "الكيان:",
        addressLabel: "العنوان:",
        privacyContactLabel: "جهة اتصال الخصوصية:",
        entity: "Vocaband للتقنيات التعليمية",
        address: "إسرائيل",
        contactEmail: "contact@vocaband.com",
        contactNote: "لاستفسارات الخصوصية أو طلبات الوصول إلى البيانات أو الشكاوى، تواصل معنا عبر البريد أعلاه. سنرد خلال 30 يومًا كما يقتضي القانون.",
      },
      section2: {
        title: "البيانات التي نجمعها",
        studentData: {
          displayName: "اسم العرض",
          avatar: "الصورة الرمزية",
          classCode: "رمز الفصل",
          progress: "التقدم",
          badges: "الشارات",
        },
        notCollect: "لا نجمع: البريد الإلكتروني، الهاتف، العنوان، الصور، الهويات",
        teacherData: {
          email: "البريد الإلكتروني",
          displayName: "اسم العرض",
          classes: "الفصول",
          assignments: "المهام",
        },
      },
      section3: {
        title: "كيف نستخدم بياناتك",
        tablePurpose: "الغرض",
        tableLegalBasis: "الأساس القانوني",
        rows: {
          row1: { purpose: "توفير ألعاب المفردات", basis: "تنفيذ العقد" },
          row2: { purpose: "عرض تقدم الطلاب للمعلمين", basis: "تنفيذ العقد" },
          row3: { purpose: "مصادقة المعلمين", basis: "العقد + الأمان" },
          row4: { purpose: "منع الإساءة", basis: "المصلحة المشروعة" },
        },
        notDo: "نحن لا: نبيع البيانات • نعرض الإعلانات • ننشئ ملفات تعريف • نشارك مع الوسطاء • نستخدم ملفات تعريف الارتباط للتتبع",
      },
      section4: {
        title: "معالجات الطرف الثالث",
        tableService: "الخدمة",
        tablePurpose: "الغرض",
        tableLocation: "الموقع",
        supabase: { service: "Supabase", purpose: "قاعدة البيانات، المصادقة", location: "الاتحاد الأوروبي (فرانكفورت) / أمريكا" },
        google: { service: "Google OAuth", purpose: "تسجيل دخول المعلمين فقط", location: "أمريكا" },
        fly: { service: "Fly.io", purpose: "استضافة خادم التطبيق", location: "الاتحاد الأوروبي / أمريكا" },
        cloudflare: { service: "Cloudflare", purpose: "تسليم الأصول الثابتة + CDN", location: "الحافة العالمية" },
      },
      section5: {
        title: "الاحتفاظ بالبيانات",
        days365: "365 يوم",
        days90: "90 يوم",
        active2years: "نشط + 2 سنة",
        years2: "2 سنة",
      },
      section6: {
        title: "حقوقك",
        intro: "بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، لديك الحق في:",
        rightsTitle: "حقوق موضوع البيانات",
      },
      section7: {
        title: "خصوصية الأطفال",
        intro: "Vocaband مصمم للطلاب في المدارس حول العالم. المؤسسة التعليمية (المدرسة) تصرح باستخدام الطلاب. من خلال تقديم رمز الفصل، يصرح المعلم (نيابة عن المدرسة) بوصول الطلاب.",
        minimize: "نحن نقلل من جمع البيانات من الطلاب: لا بريد إلكتروني • لا اسم حقيقي • لا تتبع للموقع • لا إعلانات سلوكية",
      },
      section8: {
        title: "تدابير الأمان",
        securityDetails: "اطلع على تفاصيل الأمان والثقة ←",
      },
      section9: {
        title: "الشكاوى",
        intro: "إذا كنت تعتقد أن حقوق خصوصيتك قد انتهكت، يمكنك:",
        contactStep: "الاتصال بنا على ",
        complaintStep: "تقديم شكوى إلى سلطة حماية الخصوصية الإسرائيلية",
      },
      footer: {
        haveQuestions: "لديكم أسئلة؟",
        responseTime: "نرد خلال 30 يومًا",
        backButton: "رجوع",
        related: "ذات صلة:",
        termsLink: "شروط الخدمة",
      },
    },

    terms: {
      title: "شروط",
      titleHighlight: "الخدمة",
      intro: "مرحبًا بكم في Vocaband — منصة المفردات الإنجليزية المبينة للطلاب والمعلمين. تنظم هذه الشروط استخدامك للخدمة.",
      section1: {
        title: "قبول الشروط",
        para1: "بالدخول أو استخدام Vocaband، فإنك تقر بأنك قد قرأت وفهمت ووافقت على الالتزام بشروط الخدمة هذه وسياسة الخصوصية الخاصة بنا. تشكل هذه الشروط اتفاقية ملزمة قانونًا بينك وبين Vocaband للتقنيات التعليمية.",
        para2: "يجوز لنا تعديل هذه الشروط في أي وقت. سيتم إبلاغ التغييرات الجوهرية عبر الخدمة، واستمرارك في الاستخدام بعد هذه التغييرات يشكل قبولاً.",
      },
      section2: {
        title: "وصف الخدمة",
        intro: "Vocaband هي منصة تكنولوجيا تعليمية تساعد الطلاب على ممارسة المفردات الإنجليزية من خلال ألعاب تفاعلية. الخدمة هي:",
        bullet1: "مصممة للاستخدام في فصول ESL تحت إشراف المعلمين",
        bullet2: "مستويات مفردات متوافقة مع CEFR A1–B2 (ثلاث مجموعات شاملة)",
        bullet3: "مبنية لدعم حسابات الطلاب المجهولة",
        bullet4: "مخصصة للأغراض التعليمية فقط",
      },
      section3: {
        title: "التعديلات",
        intro: "نحتفظ بالحق في تعديل أو إيقاف الخدمة في أي وقت.",
        changesLabel: "التغييرات في الشروط:",
        changesNote: "التغييرات المهمة ستتطلب موافقتك الصريحة. التحديثات الطفيفة ستُنشر في هذه الصفحة.",
      },
      section4: {
        title: "حسابات المستخدمين",
        intro: "Vocaband يوفر نوعين من الحسابات:",
        student: {
          anonymous: "حساب مجهول باسم عرض فقط",
          classCode: "الوصول عبر رمز فصل من 6 أرقام",
          educationalOnly: "للأغراض التعليمية فقط",
        },
        teacher: {
          preApproved: "تسجيل الدخول بحساب Google مُسبق الموافقة",
          officialEmail: "استخدام بريد إلكتروني تعليمي رسمي",
          responsible: "مسؤول عن أمان الحساب",
          schoolAuth: "مصرح من المؤسسة التعليمية",
        },
      },
      section5: {
        title: "الاستخدام المقبول",
        intro: "توافق على استخدام الخدمة للأغراض القانونية فقط.",
        item1: "الاستخدام للأغراض التعليمية فقط",
        item2: "الحفاظ على النزاهة الأكاديمية",
        item3: "الحفاظ على التفاعلات المحترمة",
        item4: "الإبلاغ عن الأخطاء والمشاكل",
      },
      section6: {
        title: "الاستخدام المحظور",
        intro: "يجب عليك عدم:",
        item1: "استخدام البوتات أو السكريبتات الآلية",
        item2: "الوصول إلى حسابات أو بيانات الآخرين",
        item3: "استخدام أسماء مسيئة أو منتحلة",
        item4: "مضايقة أو تنمر المستخدمين الآخرين",
        item5: "مشاركة رموز الفصل بشكل غير مناسب",
        item6: "هندسة الخدمة عكسيًا",
      },
      section7: {
        title: "مسؤوليات المعلم",
        intro: "المعلمون الذين يستخدمون Vocaband يوافقون على:",
        duty1: { title: "إدارة رموز الفصل:", desc: "الاحتفاظ بالرموز سري، مشاركتها فقط مع الطلاب المستهدفين" },
        duty2: { title: "الإشراف:", desc: "الإشراف بشكل مناسب على استخدام الطلاب" },
        duty3: { title: "إدارة البيانات:", desc: "حذف الفصول عندما لم تعد هناك حاجة" },
        duty4: { title: "سياسات المدرسة:", desc: "الامتثال لسياسات حماية البيانات المؤسسية" },
      },
      section8: {
        title: "الخصوصية والبيانات",
        para1: "خصوصيتك مهمة بالنسبة لنا. يرجى مراجعة سياسة الخصوصية الخاصة بنا، التي تنظم أيضًا استخدامك للخدمة.",
        para2: "من خلال إنشاء حساب، فإنك توافق على جمع واستخدام معلوماتك كما هو موضح في سياسة الخصوصية.",
      },
      section9: {
        title: "التوافق والإنهاء",
        para1: "نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط.",
        contactLabel: "لديكم أسئلة؟ تواصل معنا على",
        contact: "contact@vocaband.com",
      },
      footer: {
        backButton: "رجوع",
        related: "ذات صلة:",
        privacyLink: "سياسة الخصوصية",
      },
    },

    security: {
      title: "الأمان",
      titleHighlight: "والثقة",
      badge: "مُتحقق منه بشكل مستقل",
      intro: "كيف نحمي بيانات طلابكم، مكتوبة بلغة إنجليزية بسيطة. للتفاصيل التقنية الكاملة، راجع مستندات الأمان مفتوحة المصدر في قاعدة الكود.",
      sslLabsBadge: "SSL Labs A+",
      sslLabsLink: "عرض التقرير المباشر",
      encrypted: "مُشفّر بتشفير TLS 1.3",
      eu: "البيانات مُستضافة في الاتحاد الأوروبي (فرانكفورت)",
      section1: {
        title: "مُشفّر أثناء النقل",
        body: "كل اتصال بين جهازك وVocaband يستخدم TLS 1.2 أو TLS 1.3 — نفس التشفير الذي تستخدمه البنوك. الإصدارات القديمة غير الآمنة (TLS 1.0، TLS 1.1) محظورة. تم التحقق منه A+ من SSL Labs.",
      },
      section2: {
        title: "مُشفّر عند الراحة",
        body: "توجد بياناتك على خوادم PostgreSQL التابعة لـ Supabase في الاتحاد الأوروبي (منطقة فرانكفورت). الأقراص مُشفّرة على مستوى التخزين؛ النسخ الاحتياطية مُشفّرة تلقائيًا.",
      },
      section3: {
        title: "قواعد وصول صارمة",
        body: "لكل جدول في قاعدة البيانات سياسات أمان على مستوى الصف — يمكن للطلاب قراءة تقدمهم فقط، ويمكن للمعلمين قراءة فصولهم فقط، ولا توجد إمكانية الوصول بين الحسابات. تم التحقق منه عبر اختبارات آلية + اختبارات اختراق يدوية.",
      },
      section4: {
        title: "تسجيل دخول آمن",
        body: "يسجل المعلمون الدخول عبر Google OAuth — Vocaband لا يرى أبدًا أو يخزن كلمات مرور المعلمين. ينضم الطلاب إلى الفصول عبر رمز مكون من 6 أحرف؛ حساباتهم مقتصرة على تلك الفئة فقط.",
      },
      section5: {
        title: "تدقيقات دورية",
        body: "نجري مراجعة أمنية شاملة كل ربع سنة: ثغرات التبعيات، انجراف سياسات RLS، تكوين TLS، واختبارات الاختراق. آخر تدقيق لنا (أبريل 2026) أغلق 3 نتائج عالية الأولوية + 3 متوسطة، بالإضافة إلى تنبيه CodeQL؛ تحسنت درجة SSL Labs من B إلى A+.",
      },
      contact: {
        title: "وجدت ثغرة أمنية؟",
        body: "نرحب بالإفصاح المسؤول. أرسل بريد إلكتروني إلى",
        cta: "عرض security.txt",
      },
      bottomLinks: {
        privacy: "سياسة الخصوصية",
        terms: "شروط الخدمة",
      },
    },
  },
};
