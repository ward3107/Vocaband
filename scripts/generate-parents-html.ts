// =============================================================================
// generate-parents-html.ts
// =============================================================================
// Generates four self-contained HTML pages for parents and guardians:
//
//   public/parents.html       — English (default)
//   public/parents-he.html    — Hebrew (RTL)
//   public/parents-ar.html    — Arabic (RTL)
//   public/parents-ru.html    — Russian
//
// Each page is print-friendly (2–3 A4 pages), self-contained (no JS
// frameworks, one stylesheet block, no external assets), and ends
// with a rights-request form that submits via `mailto:` so the
// operator doesn't run an extra backend just to receive a parent
// inquiry.  DPO email + DPO name are pulled from
// `src/config/privacy-config.ts` so they stay in sync with the rest
// of the legal/compliance surface.
//
// Audit: C-1 + C-8 path B ("light touch") — see PR #888-followup.
// Wired into `prebuild` in package.json — runs on every build.
// =============================================================================

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DATA_CONTROLLER,
  DATA_PROTECTION_OFFICER,
} from "../src/config/privacy-config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public");

const escape = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// -----------------------------------------------------------------------------
// Language packs
// -----------------------------------------------------------------------------
//
// Each language pack is self-contained (no shared strings) so a
// translator can review one file at a time without cross-referencing
// the others.  The four packs follow the same section order so the
// 4 generated HTML files have parallel structure — schools that
// print all four can compare side-by-side.
//
// Authoritative language: English.  HE / AR / RU are draft
// translations intended to be reviewed by a native-speaking lawyer
// alongside the DPA + DPIA-executive-summary translations under
// `docs/legal/`.

interface LangPack {
  /** ISO code used in filename + html lang attribute. */
  code: "en" | "he" | "ar" | "ru";
  /** Reading direction. */
  dir: "ltr" | "rtl";
  /** Display name shown in the language-switcher chips at the top. */
  label: string;
  /** Title used both in <title> and as the H1. */
  pageTitle: string;
  /** Subtitle / one-sentence positioning under the H1. */
  subtitle: string;
  /** Pull-quote highlight box near the top. */
  highlight: string;
  /** Section bodies. Each section is title + ordered list of paragraphs / bullets. */
  sections: Section[];
  /** Form copy + button labels. */
  form: FormStrings;
  /** Footer microcopy. */
  footer: FooterStrings;
}

interface Section {
  title: string;
  /** Each entry can be a paragraph (string) or a list of bullets. */
  body: Array<string | { bullets: string[] }>;
}

interface FormStrings {
  heading: string;
  intro: string;
  fieldParentName: string;
  fieldParentEmail: string;
  fieldChildName: string;
  fieldClassCode: string;
  fieldSchoolName: string;
  fieldRequestTypeLegend: string;
  optionAccess: string;
  optionCorrection: string;
  optionErasure: string;
  optionWithdraw: string;
  optionObject: string;
  optionQuestion: string;
  fieldDetails: string;
  submitLabel: string;
  /** Pre-filled email subject line, e.g. "Vocaband privacy request" */
  emailSubject: string;
  /** Label headers used inside the mailto body. */
  bodyLabels: {
    parentName: string;
    parentEmail: string;
    childName: string;
    classCode: string;
    schoolName: string;
    requestType: string;
    details: string;
  };
}

interface FooterStrings {
  /** "Back to Vocaband" etc. */
  back: string;
  privacyLink: string;
  termsLink: string;
  generatedNote: string;
}

const LANG_LABELS = ["English", "עברית", "العربية", "Русский"] as const;

const en: LangPack = {
  code: "en",
  dir: "ltr",
  label: "English",
  pageTitle: "Information for parents and guardians",
  subtitle: "Vocaband — English vocabulary platform for Israeli schools",
  highlight:
    "Your child's school has chosen Vocaband as part of their English class. This page explains, in plain language, what data we collect, what we never collect, who can see it, and how you can exercise your rights as a parent.",
  sections: [
    {
      title: "1. What Vocaband is",
      body: [
        "Vocaband is an educational platform for learning English vocabulary, used by teachers in Israeli schools (primarily grades 4–9, supported range 1–12). Students play short word-games and the teacher sees a gradebook of progress.",
        "The school — not Vocaband — decides who uses the platform. Your child's teacher invites students by sharing a 6-digit class code.",
      ],
    },
    {
      title: "2. What data we collect about your child",
      body: [
        {
          bullets: [
            "A display name — chosen by your child or assigned by the teacher. Does NOT have to be a real name; first names or nicknames are encouraged.",
            "A 6-digit class code (the join credential).",
            "An avatar — an emoji your child picks.",
            "Game scores, per-word mistake data, and completion timestamps.",
            "Gamification metrics: XP, streaks, badges.",
          ],
        },
      ],
    },
    {
      title: "3. What we do NOT collect about your child",
      body: [
        {
          bullets: [
            "No email address (your child has no email account with Vocaband).",
            "No real name, unless the display name happens to be one.",
            "No phone number, no postal address, no government ID, no photograph.",
            "No location tracking.",
            "No browsing history beyond the Vocaband site itself.",
            "No advertising profile. We show no advertising of any kind.",
            "No AI training on your child's data.",
          ],
        },
      ],
    },
    {
      title: "4. Where the data lives",
      body: [
        {
          bullets: [
            "All persistent data: Frankfurt, Germany (Supabase, encrypted at rest with AES-256).",
            "Application server: Amsterdam, Netherlands (Fly.io).",
            "Error monitoring: Germany (Sentry, EU region — personal data is stripped before sending).",
            "All connections use TLS 1.3 encryption.",
            "Israel is recognised by the EU as providing an adequate level of data protection, so no extra safeguards are needed for Israel-EU transfers.",
          ],
        },
      ],
    },
    {
      title: "5. Who can see your child's data",
      body: [
        {
          bullets: [
            "Your child themselves.",
            "Your child's class teacher.",
            "The school's administrator if one is appointed.",
          ],
        },
        "Nobody else. We do not sell, rent, or share data with marketers, advertisers, or data brokers.",
      ],
    },
    {
      title: "6. Your rights as a parent or guardian",
      body: [
        "You can act on behalf of your child to:",
        {
          bullets: [
            "See all the data we have about your child (right of access).",
            "Correct any inaccurate data.",
            "Delete your child's account and all data linked to it (right of erasure).",
            "Withdraw consent for processing.",
            "Object to specific kinds of processing.",
          ],
        },
        "These rights come from the Israeli Privacy Protection Law (חוק הגנת הפרטיות, תשמ\"א-1981, as amended by Amendment 13) and the EU General Data Protection Regulation (GDPR).",
      ],
    },
    {
      title: "7. How to exercise these rights",
      body: [
        "Easiest path: contact your child's teacher or the school's office. The school is the data controller for your child's information and can usually resolve requests fastest.",
        `Direct contact: use the form below, or email ${DATA_PROTECTION_OFFICER.email} directly. We respond within ${DATA_PROTECTION_OFFICER.responseSlaHours} hours for urgent matters and within 30 days for formal requests.`,
        "When contacting us please include: your name, your child's display name, the class code if you know it, and what you would like to know or change.",
      ],
    },
    {
      title: "8. Concerns or complaints",
      body: [
        "If you are not satisfied with how we respond, you can complain to the Israeli Privacy Protection Authority (הרשות להגנת הפרטיות) at ppa@justice.gov.il, or to your school's data protection contact.",
      ],
    },
    {
      title: "9. Want more detail?",
      body: [
        {
          bullets: [
            "Full privacy policy: /privacy.html",
            "Terms of service: /terms.html",
            "Sub-processor list (every third-party service we use, with hosting region and DPA): see the GitHub repository.",
            "Data processing agreement signed between Vocaband and the school: ask the school for a copy.",
          ],
        },
      ],
    },
  ],
  form: {
    heading: "Submit a request",
    intro:
      "This form opens your email client with a pre-filled message to our Data Protection Officer. Nothing is sent until you press send in your email app.",
    fieldParentName: "Your name (parent or guardian)",
    fieldParentEmail: "Your email (so we can reply)",
    fieldChildName: "Your child's display name on Vocaband",
    fieldClassCode: "Class code (if you know it)",
    fieldSchoolName: "School name",
    fieldRequestTypeLegend: "What would you like us to do?",
    optionAccess: "Send me a copy of all data about my child (access)",
    optionCorrection: "Correct something about my child's account",
    optionErasure: "Delete my child's account and all data",
    optionWithdraw: "Withdraw consent for my child's participation",
    optionObject: "Object to a specific kind of processing",
    optionQuestion: "I have a question — please reply",
    fieldDetails: "Anything else you'd like us to know (optional)",
    submitLabel: "Open my email app",
    emailSubject: "Vocaband — Parent / Guardian request",
    bodyLabels: {
      parentName: "Parent / guardian name",
      parentEmail: "Parent / guardian email",
      childName: "Child's display name",
      classCode: "Class code",
      schoolName: "School",
      requestType: "Request type",
      details: "Additional details",
    },
  },
  footer: {
    back: "← Back to Vocaband",
    privacyLink: "Full privacy policy",
    termsLink: "Terms of service",
    generatedNote:
      "This page is auto-generated from src/config/privacy-config.ts via scripts/generate-parents-html.ts.",
  },
};

const he: LangPack = {
  code: "he",
  dir: "rtl",
  label: "עברית",
  pageTitle: "מידע להורים ולאפוטרופוסים",
  subtitle: "Vocaband — פלטפורמת אוצר מילים באנגלית לבתי ספר בישראל",
  highlight:
    "בית הספר של ילדכם בחר להשתמש ב-Vocaband כחלק משיעורי האנגלית. הדף הזה מסביר בשפה פשוטה איזה מידע אנו אוספים, מה לעולם אינו נאסף, מי יכול לראות אותו, ואיך תוכלו לממש את זכויותיכם כהורים.",
  sections: [
    {
      title: "1. מהו Vocaband",
      body: [
        "Vocaband היא פלטפורמה חינוכית ללימוד אוצר מילים באנגלית, המשמשת מורים בבתי ספר בישראל (בעיקר כיתות ד'–ט', עם תמיכה בטווח א'–י\"ב). תלמידים משחקים משחקי מילים קצרים והמורה רואה גיליון ציונים של ההתקדמות.",
        "בית הספר — לא Vocaband — מחליט מי משתמש בפלטפורמה. המורה של ילדכם מזמין/מזמינה תלמידים על-ידי שיתוף קוד כיתה בן 6 ספרות.",
      ],
    },
    {
      title: "2. איזה מידע אנו אוספים על ילדכם",
      body: [
        {
          bullets: [
            "שם תצוגה — נבחר על-ידי ילדכם או נקבע על-ידי המורה. אינו חייב להיות שם אמיתי; מומלצים שמות פרטיים או כינויים.",
            "קוד כיתה בן 6 ספרות (אמצעי ההצטרפות).",
            "אווטאר — אימוג'י שילדכם בוחר.",
            "ניקוד משחק, נתוני טעויות לפי מילה, וחותמות זמן השלמה.",
            "מדדי משחק: XP, רצפים, תגים.",
          ],
        },
      ],
    },
    {
      title: "3. מה אנו אינם אוספים על ילדכם",
      body: [
        {
          bullets: [
            "אין כתובת דוא\"ל (לילדכם אין חשבון דוא\"ל אצל Vocaband).",
            "אין שם אמיתי, אלא אם שם התצוגה במקרה הוא כזה.",
            "אין מספר טלפון, אין כתובת מגורים, אין תעודת זהות, אין תצלום.",
            "אין מעקב מיקום.",
            "אין היסטוריית גלישה מעבר לאתר Vocaband עצמו.",
            "אין פרופיל פרסום. אנו לא מציגים פרסומות מסוג כלשהו.",
            "אין אימון מודלי AI על נתוני ילדכם.",
          ],
        },
      ],
    },
    {
      title: "4. היכן המידע מאוחסן",
      body: [
        {
          bullets: [
            "כל המידע הקבוע: פרנקפורט, גרמניה (Supabase, מוצפן במנוחה ב-AES-256).",
            "שרת היישום: אמסטרדם, הולנד (Fly.io).",
            "מעקב שגיאות: גרמניה (Sentry, אזור EU — מידע אישי מוסר לפני שליחה).",
            "כל הקישורים משתמשים בהצפנת TLS 1.3.",
            "ישראל מוכרת על-ידי האיחוד האירופי כמספקת רמת הגנה הולמת, ולכן אין צורך באמצעי הגנה נוספים להעברות ישראל–EU.",
          ],
        },
      ],
    },
    {
      title: "5. מי יכול לראות את המידע של ילדכם",
      body: [
        {
          bullets: [
            "ילדכם בעצמו/ה.",
            "מורה הכיתה של ילדכם.",
            "מנהל בית הספר, אם מונה.",
          ],
        },
        "אף אחד אחר. אנו לא מוכרים, משכירים או משתפים מידע עם משווקים, מפרסמים או סוחרי נתונים.",
      ],
    },
    {
      title: "6. זכויותיכם כהורים או אפוטרופוסים",
      body: [
        "אתם רשאים לפעול בשם ילדכם כדי:",
        {
          bullets: [
            "לראות את כל המידע שיש לנו על ילדכם (זכות הגישה).",
            "לתקן מידע שגוי.",
            "למחוק את חשבון ילדכם ואת כל המידע המקושר אליו (זכות המחיקה).",
            "לבטל הסכמה לעיבוד.",
            "להתנגד לסוגי עיבוד מסוימים.",
          ],
        },
        'זכויות אלה נובעות מחוק הגנת הפרטיות, תשמ"א-1981 (כפי שתוקן בתיקון 13) ומתקנת ההגנה הכללית על מידע של האיחוד האירופי (GDPR).',
      ],
    },
    {
      title: "7. איך לממש את הזכויות הללו",
      body: [
        "הדרך הקלה ביותר: פנו למורה של ילדכם או למזכירות בית הספר. בית הספר הוא בעל המאגר עבור המידע של ילדכם ולרוב יכול לטפל בבקשות הכי מהר.",
        `יצירת קשר ישירה: השתמשו בטופס למטה, או שלחו דוא"ל ישירות ל-${DATA_PROTECTION_OFFICER.email}. אנו עונים בתוך ${DATA_PROTECTION_OFFICER.responseSlaHours} שעות לעניינים דחופים ובתוך 30 יום לבקשות פורמליות.`,
        'בעת פנייה אלינו אנא כללו: את שמכם, את שם התצוגה של ילדכם, את קוד הכיתה אם ידוע לכם, ואת מה שאתם רוצים לדעת או לשנות.',
      ],
    },
    {
      title: "8. תלונות או חשש",
      body: [
        "אם אינכם מרוצים מהאופן שבו השבנו, תוכלו להתלונן בפני הרשות להגנת הפרטיות בכתובת ppa@justice.gov.il, או בפני איש הקשר להגנת המידע של בית הספר.",
      ],
    },
    {
      title: "9. רוצים פירוט נוסף?",
      body: [
        {
          bullets: [
            "מדיניות פרטיות מלאה: /privacy.html",
            "תנאי שימוש: /terms.html",
            "רשימת ספקי משנה (כל שירות צד שלישי שאנו משתמשים בו, עם אזור אירוח ו-DPA): ראו במאגר GitHub.",
            "הסכם עיבוד מידע חתום בין Vocaband ובית הספר: בקשו עותק מבית הספר.",
          ],
        },
      ],
    },
  ],
  form: {
    heading: "שליחת בקשה",
    intro:
      "הטופס פותח את אפליקציית הדוא\"ל שלכם עם הודעה ממולאת מראש לממונה הגנת הפרטיות שלנו. שום דבר לא נשלח עד שתלחצו על שלח באפליקציית הדוא\"ל שלכם.",
    fieldParentName: "השם שלכם (הורה או אפוטרופוס)",
    fieldParentEmail: 'הדוא"ל שלכם (כדי שנוכל להשיב)',
    fieldChildName: "שם התצוגה של ילדכם ב-Vocaband",
    fieldClassCode: "קוד כיתה (אם ידוע לכם)",
    fieldSchoolName: "שם בית הספר",
    fieldRequestTypeLegend: "מה תרצו שנעשה?",
    optionAccess: "שלחו לי עותק של כל המידע על ילדי (גישה)",
    optionCorrection: "תקנו משהו בחשבון של ילדי",
    optionErasure: "מחקו את חשבון ילדי ואת כל המידע",
    optionWithdraw: "בטלו את ההסכמה להשתתפות של ילדי",
    optionObject: "התנגדו לסוג מסוים של עיבוד",
    optionQuestion: "יש לי שאלה — אנא השיבו",
    fieldDetails: "משהו נוסף שתרצו שנדע (אופציונלי)",
    submitLabel: 'פתחו את אפליקציית הדוא"ל שלי',
    emailSubject: "Vocaband — בקשת הורה / אפוטרופוס",
    bodyLabels: {
      parentName: "שם הורה / אפוטרופוס",
      parentEmail: 'דוא"ל הורה / אפוטרופוס',
      childName: "שם תצוגה של הילד",
      classCode: "קוד כיתה",
      schoolName: "בית ספר",
      requestType: "סוג בקשה",
      details: "פרטים נוספים",
    },
  },
  footer: {
    back: "← חזרה ל-Vocaband",
    privacyLink: "מדיניות פרטיות מלאה",
    termsLink: "תנאי שימוש",
    generatedNote:
      "דף זה נוצר אוטומטית מ-src/config/privacy-config.ts באמצעות scripts/generate-parents-html.ts.",
  },
};

const ar: LangPack = {
  code: "ar",
  dir: "rtl",
  label: "العربية",
  pageTitle: "معلومات للأهل وأولياء الأمور",
  subtitle: "Vocaband — منصّة مفردات الإنجليزية للمدارس في إسرائيل",
  highlight:
    "اختارت مدرسة طفلكم استخدام Vocaband ضمن دروس الإنجليزية. تَشرح هذه الصفحة بلغة مبسَّطة أيّ البيانات نجمعها، وما الذي لا نجمعه أبداً، ومن يستطيع رؤيتها، وكيف تمارسون حقوقكم كأولياء أمور.",
  sections: [
    {
      title: "1. ما هو Vocaband",
      body: [
        "Vocaband منصّة تعليمية لتعلُّم مفردات اللغة الإنجليزية، يستخدمها المعلمون في المدارس الإسرائيلية (الصفوف 4–9 بشكل رئيسي، والنطاق المدعوم 1–12). يلعب الطلاب ألعاب كلمات قصيرة ويرى المعلِّم دفتر علامات يُظهر التقدُّم.",
        "المدرسة — وليس Vocaband — هي من يقرِّر مَن يستخدم المنصّة. يدعو معلِّم طفلكم الطلاب بمشاركة رمز صف من 6 خانات.",
      ],
    },
    {
      title: "2. أيّ البيانات نجمعها عن طفلكم",
      body: [
        {
          bullets: [
            "اسم عرض — يختاره طفلكم أو يحدِّده المعلِّم. ليس بالضرورة اسماً حقيقياً؛ يُشجَّع استخدام الأسماء الأولى أو الألقاب.",
            "رمز صف من 6 خانات (وسيلة الانضمام).",
            "أفاتار — رمز تعبيري يختاره طفلكم.",
            "درجات الألعاب، بيانات الأخطاء لكل كلمة، وتوقيتات الإكمال.",
            "مؤشرات الألعاب: XP، السلاسل، الشارات.",
          ],
        },
      ],
    },
    {
      title: "3. ما الذي لا نجمعه عن طفلكم",
      body: [
        {
          bullets: [
            "لا عنوان بريد إلكتروني (طفلكم ليس لديه حساب بريد إلكتروني لدى Vocaband).",
            "لا اسم حقيقي، إلا إذا صادف أن يكون اسم العرض كذلك.",
            "لا رقم هاتف، ولا عنوان بريدي، ولا هوية حكومية، ولا صورة.",
            "لا تتبُّع للموقع.",
            "لا سجلّ تصفُّح خارج موقع Vocaband نفسه.",
            "لا ملف إعلاني. لا نَعرض أيّ إعلانات على الإطلاق.",
            "لا تدريب لنماذج AI على بيانات طفلكم.",
          ],
        },
      ],
    },
    {
      title: "4. أين تُخزَّن البيانات",
      body: [
        {
          bullets: [
            "كل البيانات الدائمة: فرانكفورت، ألمانيا (Supabase، مُشفَّرة في حالة السكون بـ AES-256).",
            "خادم التطبيق: أمستردام، هولندا (Fly.io).",
            "مراقبة الأخطاء: ألمانيا (Sentry، منطقة EU — تُزال البيانات الشخصية قبل الإرسال).",
            "كل الاتصالات تستخدم تشفير TLS 1.3.",
            "تَعترف المفوضية الأوروبية بإسرائيل كدولة توفِّر مستوى مناسباً من حماية البيانات، فلا حاجة لضمانات إضافية للنقل إسرائيل–EU.",
          ],
        },
      ],
    },
    {
      title: "5. مَن يستطيع رؤية بيانات طفلكم",
      body: [
        {
          bullets: [
            "طفلكم نفسه/نفسها.",
            "معلِّم صف طفلكم.",
            "إداريّ المدرسة إذا كان مُعيَّناً.",
          ],
        },
        "لا أحد آخر. لا نَبيع البيانات ولا نُؤجِّرها ولا نُشاركها مع المسوِّقين أو المُعلِنين أو وسطاء البيانات.",
      ],
    },
    {
      title: "6. حقوقكم كأولياء أمور",
      body: [
        "يحقُّ لكم التصرُّف نيابةً عن طفلكم لـ:",
        {
          bullets: [
            "رؤية جميع البيانات التي لدينا عن طفلكم (حق الوصول).",
            "تصحيح أيّ بيانات غير دقيقة.",
            "حذف حساب طفلكم وجميع البيانات المرتبطة به (حق المحو).",
            "سحب الموافقة على المعالجة.",
            "الاعتراض على أنواع معالجة محدَّدة.",
          ],
        },
        "تَستند هذه الحقوق إلى قانون حماية الخصوصية الإسرائيلي (חוק הגנת הפרטיות, תשמ\"א-1981، بصيغته المعدَّلة بالتعديل 13) واللائحة العامة لحماية البيانات للاتحاد الأوروبي (GDPR).",
      ],
    },
    {
      title: "7. كيف تمارسون هذه الحقوق",
      body: [
        "أسهل طريق: تواصلوا مع معلِّم طفلكم أو إدارة المدرسة. المدرسة هي المتحكِّم بمعلومات طفلكم وعادةً ما تستطيع التعامل مع الطلبات بأسرع شكل.",
        `التواصل المباشر: استخدموا النموذج أدناه، أو راسلونا مباشرةً على ${DATA_PROTECTION_OFFICER.email}. نَردّ خلال ${DATA_PROTECTION_OFFICER.responseSlaHours} ساعة للأمور العاجلة وخلال 30 يوماً للطلبات الرسمية.`,
        "عند التواصل معنا يُرجى تضمين: اسمكم، اسم العرض لطفلكم، رمز الصف إن عرفتموه، وما الذي ترغبون في معرفته أو تغييره.",
      ],
    },
    {
      title: "8. الشكاوى والمخاوف",
      body: [
        "إذا لم تكونوا راضين عن ردّنا، يمكنكم تقديم شكوى إلى السلطة الإسرائيلية لحماية الخصوصية على ppa@justice.gov.il، أو إلى جهة اتصال حماية البيانات في مدرستكم.",
      ],
    },
    {
      title: "9. تريدون مزيداً من التفاصيل؟",
      body: [
        {
          bullets: [
            "سياسة الخصوصية الكاملة: /privacy.html",
            "شروط الاستخدام: /terms.html",
            "قائمة المُعالِجين الفرعيين (كل خدمة طرف ثالث نستخدمها، مع منطقة الاستضافة و DPA): راجعوا مستودع GitHub.",
            "اتفاقية معالجة البيانات الموقَّعة بين Vocaband والمدرسة: اطلبوا نسخة من المدرسة.",
          ],
        },
      ],
    },
  ],
  form: {
    heading: "تقديم طلب",
    intro:
      "يَفتح هذا النموذج تطبيق البريد الإلكتروني لديكم برسالة مُعدَّة مسبقاً لمسؤول حماية البيانات لدينا. لا يُرسَل شيء حتى تَضغطوا «إرسال» في تطبيق البريد.",
    fieldParentName: "اسمكم (الوالد أو ولي الأمر)",
    fieldParentEmail: "بريدكم الإلكتروني (لكي نَردّ عليكم)",
    fieldChildName: "اسم العرض لطفلكم في Vocaband",
    fieldClassCode: "رمز الصف (إن عرفتموه)",
    fieldSchoolName: "اسم المدرسة",
    fieldRequestTypeLegend: "ماذا تريدون منّا أن نفعل؟",
    optionAccess: "أرسِلوا لي نسخةً من جميع بيانات طفلي (الوصول)",
    optionCorrection: "صحِّحوا شيئاً في حساب طفلي",
    optionErasure: "احذفوا حساب طفلي وجميع البيانات",
    optionWithdraw: "اسحبوا الموافقة على مشاركة طفلي",
    optionObject: "أعترض على نوع معالجة محدَّد",
    optionQuestion: "لديّ سؤال — يُرجى الردّ",
    fieldDetails: "أيّ شيء آخر تودّون إخبارنا به (اختياري)",
    submitLabel: "افتحوا تطبيق بريدي الإلكتروني",
    emailSubject: "Vocaband — طلب من ولي الأمر / الوالد",
    bodyLabels: {
      parentName: "اسم الوالد / ولي الأمر",
      parentEmail: "بريد الوالد / ولي الأمر",
      childName: "اسم عرض الطفل",
      classCode: "رمز الصف",
      schoolName: "المدرسة",
      requestType: "نوع الطلب",
      details: "تفاصيل إضافية",
    },
  },
  footer: {
    back: "← العودة إلى Vocaband",
    privacyLink: "سياسة الخصوصية الكاملة",
    termsLink: "شروط الاستخدام",
    generatedNote:
      "تُولَّد هذه الصفحة تلقائياً من src/config/privacy-config.ts عبر scripts/generate-parents-html.ts.",
  },
};

const ru: LangPack = {
  code: "ru",
  dir: "ltr",
  label: "Русский",
  pageTitle: "Информация для родителей и опекунов",
  subtitle: "Vocaband — платформа изучения английской лексики для школ в Израиле",
  highlight:
    "Школа вашего ребёнка выбрала Vocaband как часть уроков английского. На этой странице простым языком объясняется, какие данные мы собираем, что мы никогда не собираем, кто может их видеть, и как вы можете реализовать свои права как родитель.",
  sections: [
    {
      title: "1. Что такое Vocaband",
      body: [
        "Vocaband — это образовательная платформа для изучения английской лексики, используемая учителями в израильских школах (преимущественно 4–9 классы, поддерживается диапазон 1–12). Учащиеся играют в короткие словесные игры, а учитель видит электронный журнал с прогрессом.",
        "Школа — не Vocaband — решает, кто использует платформу. Учитель вашего ребёнка приглашает учеников, делясь 6-значным кодом класса.",
      ],
    },
    {
      title: "2. Какие данные о вашем ребёнке мы собираем",
      body: [
        {
          bullets: [
            "Отображаемое имя — выбирается вашим ребёнком или назначается учителем. НЕ обязательно должно быть настоящим именем; приветствуются имена или прозвища.",
            "6-значный код класса (учётные данные для присоединения).",
            "Аватар — эмодзи, который выбирает ваш ребёнок.",
            "Игровые баллы, данные по ошибкам по словам и временные метки завершения.",
            "Игровые показатели: XP, серии, значки.",
          ],
        },
      ],
    },
    {
      title: "3. Что мы НЕ собираем о вашем ребёнке",
      body: [
        {
          bullets: [
            "Никакого адреса электронной почты (у вашего ребёнка нет учётной записи электронной почты в Vocaband).",
            "Никакого реального имени, если только отображаемое имя случайно не совпадает.",
            "Никакого номера телефона, почтового адреса, государственного удостоверения личности, фотографии.",
            "Никакого отслеживания местоположения.",
            "Никакой истории просмотров за пределами самого сайта Vocaband.",
            "Никакого рекламного профиля. Мы не показываем никакой рекламы.",
            "Никакого обучения моделей ИИ на данных вашего ребёнка.",
          ],
        },
      ],
    },
    {
      title: "4. Где хранятся данные",
      body: [
        {
          bullets: [
            "Все постоянные данные: Франкфурт, Германия (Supabase, шифрование при хранении AES-256).",
            "Сервер приложения: Амстердам, Нидерланды (Fly.io).",
            "Мониторинг ошибок: Германия (Sentry, регион EU — персональные данные удаляются перед отправкой).",
            "Все соединения используют шифрование TLS 1.3.",
            "Израиль признан ЕС как страна, обеспечивающая надлежащий уровень защиты данных, поэтому для передач Израиль–ЕС не требуются дополнительные гарантии.",
          ],
        },
      ],
    },
    {
      title: "5. Кто может видеть данные вашего ребёнка",
      body: [
        {
          bullets: [
            "Сам ваш ребёнок.",
            "Классный руководитель вашего ребёнка.",
            "Школьный администратор, если назначен.",
          ],
        },
        "Больше никто. Мы не продаём, не сдаём в аренду и не передаём данные маркетологам, рекламодателям или брокерам данных.",
      ],
    },
    {
      title: "6. Ваши права как родителя или опекуна",
      body: [
        "Вы можете действовать от имени вашего ребёнка, чтобы:",
        {
          bullets: [
            "Увидеть все данные, которые у нас есть о вашем ребёнке (право доступа).",
            "Исправить любые неточные данные.",
            "Удалить учётную запись вашего ребёнка и все связанные с ней данные (право на стирание).",
            "Отозвать согласие на обработку.",
            "Возразить против определённых видов обработки.",
          ],
        },
        'Эти права вытекают из израильского Закона о защите частной жизни (חוק הגנת הפרטיות, תשמ"א-1981, с изменениями, внесёнными Поправкой 13) и Общего регламента ЕС по защите данных (GDPR).',
      ],
    },
    {
      title: "7. Как реализовать эти права",
      body: [
        "Самый простой путь: свяжитесь с учителем вашего ребёнка или с офисом школы. Школа является Контролером данных вашего ребёнка и обычно может обработать запросы быстрее всего.",
        `Прямой контакт: используйте форму ниже или напишите напрямую на ${DATA_PROTECTION_OFFICER.email}. Мы отвечаем в течение ${DATA_PROTECTION_OFFICER.responseSlaHours} часов по срочным вопросам и в течение 30 дней по формальным запросам.`,
        "При обращении к нам, пожалуйста, укажите: ваше имя, отображаемое имя вашего ребёнка, код класса, если знаете, и что вы хотели бы узнать или изменить.",
      ],
    },
    {
      title: "8. Жалобы или обеспокоенности",
      body: [
        "Если вы не удовлетворены нашим ответом, вы можете подать жалобу в Израильское управление по защите частной жизни на адрес ppa@justice.gov.il или в контакт по защите данных вашей школы.",
      ],
    },
    {
      title: "9. Хотите больше деталей?",
      body: [
        {
          bullets: [
            "Полная политика конфиденциальности: /privacy.html",
            "Условия использования: /terms.html",
            "Список субпроцессоров (каждый сторонний сервис, который мы используем, с регионом хостинга и DPA): см. репозиторий GitHub.",
            "Соглашение об обработке данных, подписанное между Vocaband и школой: запросите копию у школы.",
          ],
        },
      ],
    },
  ],
  form: {
    heading: "Подать запрос",
    intro:
      "Эта форма открывает ваш почтовый клиент с предварительно заполненным сообщением для нашего Сотрудника по защите данных. Ничего не отправляется, пока вы не нажмёте «Отправить» в вашем почтовом приложении.",
    fieldParentName: "Ваше имя (родитель или опекун)",
    fieldParentEmail: "Ваш email (чтобы мы могли ответить)",
    fieldChildName: "Отображаемое имя вашего ребёнка в Vocaband",
    fieldClassCode: "Код класса (если знаете)",
    fieldSchoolName: "Название школы",
    fieldRequestTypeLegend: "Что вы хотели бы, чтобы мы сделали?",
    optionAccess: "Отправьте мне копию всех данных о моём ребёнке (доступ)",
    optionCorrection: "Исправьте что-то в учётной записи моего ребёнка",
    optionErasure: "Удалите учётную запись моего ребёнка и все данные",
    optionWithdraw: "Отзовите согласие на участие моего ребёнка",
    optionObject: "Возразить против определённого вида обработки",
    optionQuestion: "У меня вопрос — пожалуйста, ответьте",
    fieldDetails: "Что-нибудь ещё, что вы хотели бы нам сообщить (необязательно)",
    submitLabel: "Открыть моё почтовое приложение",
    emailSubject: "Vocaband — Запрос родителя / опекуна",
    bodyLabels: {
      parentName: "Имя родителя / опекуна",
      parentEmail: "Email родителя / опекуна",
      childName: "Отображаемое имя ребёнка",
      classCode: "Код класса",
      schoolName: "Школа",
      requestType: "Тип запроса",
      details: "Дополнительные сведения",
    },
  },
  footer: {
    back: "← Вернуться в Vocaband",
    privacyLink: "Полная политика конфиденциальности",
    termsLink: "Условия использования",
    generatedNote:
      "Эта страница автоматически генерируется из src/config/privacy-config.ts через scripts/generate-parents-html.ts.",
  },
};

const ALL_LANGS: LangPack[] = [en, he, ar, ru];

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

function renderSection(s: Section): string {
  const body = s.body
    .map((entry) => {
      if (typeof entry === "string") {
        return `<p>${escape(entry)}</p>`;
      }
      const items = entry.bullets.map((b) => `<li>${escape(b)}</li>`).join("");
      return `<ul>${items}</ul>`;
    })
    .join("\n      ");
  return `<section>
      <h2>${escape(s.title)}</h2>
      ${body}
    </section>`;
}

function renderLangSwitcher(currentCode: string): string {
  return ALL_LANGS.map((l) => {
    const href = l.code === "en" ? "/parents.html" : `/parents-${l.code}.html`;
    const active = l.code === currentCode ? ' aria-current="page" class="active"' : "";
    return `<a href="${href}"${active}>${escape(l.label)}</a>`;
  }).join(" · ");
}

function renderForm(lang: LangPack): string {
  const f = lang.form;
  // The submit handler builds a mailto: URL on the fly so no backend is
  // required.  Body is RFC 5322-encoded by encodeURIComponent.  We
  // deliberately keep the form short — adding more fields would just
  // inflate the URL past common email-client limits (~2000 chars).
  const dpoEmail = escape(DATA_PROTECTION_OFFICER.email);
  return `<section class="form-section">
      <h2>${escape(f.heading)}</h2>
      <p class="form-intro">${escape(f.intro)}</p>
      <form id="parents-form" onsubmit="return submitParentsForm(event)">
        <label>${escape(f.fieldParentName)}<input type="text" name="parentName" required></label>
        <label>${escape(f.fieldParentEmail)}<input type="email" name="parentEmail" required></label>
        <label>${escape(f.fieldChildName)}<input type="text" name="childName" required></label>
        <label>${escape(f.fieldClassCode)}<input type="text" name="classCode"></label>
        <label>${escape(f.fieldSchoolName)}<input type="text" name="schoolName"></label>
        <fieldset>
          <legend>${escape(f.fieldRequestTypeLegend)}</legend>
          <label><input type="radio" name="requestType" value="access" required> ${escape(f.optionAccess)}</label>
          <label><input type="radio" name="requestType" value="correction"> ${escape(f.optionCorrection)}</label>
          <label><input type="radio" name="requestType" value="erasure"> ${escape(f.optionErasure)}</label>
          <label><input type="radio" name="requestType" value="withdraw"> ${escape(f.optionWithdraw)}</label>
          <label><input type="radio" name="requestType" value="object"> ${escape(f.optionObject)}</label>
          <label><input type="radio" name="requestType" value="question"> ${escape(f.optionQuestion)}</label>
        </fieldset>
        <label>${escape(f.fieldDetails)}<textarea name="details" rows="4"></textarea></label>
        <button type="submit">${escape(f.submitLabel)}</button>
      </form>
      <script>
        function submitParentsForm(e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          var lines = [
            ${JSON.stringify(f.bodyLabels.parentName)} + ": " + (fd.get("parentName") || ""),
            ${JSON.stringify(f.bodyLabels.parentEmail)} + ": " + (fd.get("parentEmail") || ""),
            ${JSON.stringify(f.bodyLabels.childName)} + ": " + (fd.get("childName") || ""),
            ${JSON.stringify(f.bodyLabels.classCode)} + ": " + (fd.get("classCode") || ""),
            ${JSON.stringify(f.bodyLabels.schoolName)} + ": " + (fd.get("schoolName") || ""),
            ${JSON.stringify(f.bodyLabels.requestType)} + ": " + (fd.get("requestType") || ""),
            "",
            ${JSON.stringify(f.bodyLabels.details)} + ":",
            (fd.get("details") || "")
          ];
          var body = lines.join("\\n");
          var url = "mailto:${dpoEmail}?subject=" + encodeURIComponent(${JSON.stringify(f.emailSubject)})
            + "&body=" + encodeURIComponent(body);
          window.location.href = url;
          return false;
        }
      </script>
    </section>`;
}

function renderPage(lang: LangPack): string {
  return `<!DOCTYPE html>
<!--
  AUTO-GENERATED by scripts/generate-parents-html.ts.
  Do not edit by hand. Edit the language packs in that script and
  re-run \`npm run gen:parents-html\` (also runs on \`npm run build\`).
-->
<html lang="${lang.code}" dir="${lang.dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(lang.pageTitle)} — Vocaband</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem 4rem; color: #1c1917; line-height: 1.65; }
    h1 { font-size: 2rem; margin-bottom: 0.3rem; }
    h2 { font-size: 1.2rem; margin-top: 2.2rem; border-bottom: 1px solid #e7e5e4; padding-bottom: 0.4rem; color: #1e40af; }
    .subtitle { color: #78716c; font-size: 1rem; margin: 0 0 1.5rem; }
    .lang-switch { font-size: 0.85rem; color: #78716c; margin-bottom: 1.25rem; }
    .lang-switch a { color: #2563eb; text-decoration: none; padding: 0.15rem 0.35rem; }
    .lang-switch a.active { color: #1c1917; font-weight: 600; }
    .highlight { background: #f0f9ff; padding: 1rem 1.25rem; border-radius: 0.5rem; border-${lang.dir === "rtl" ? "right" : "left"}: 4px solid #2563eb; margin: 1.25rem 0 1.5rem; }
    ul { padding-${lang.dir === "rtl" ? "right" : "left"}: 1.4rem; }
    li { margin-bottom: 0.35rem; }
    a { color: #2563eb; }
    .form-section { background: #fafaf9; padding: 1.25rem 1.5rem; border-radius: 0.6rem; border: 1px solid #e7e5e4; margin-top: 2.2rem; }
    .form-intro { color: #57534e; font-size: 0.9rem; margin-bottom: 1rem; }
    form label { display: block; margin-bottom: 0.85rem; font-weight: 500; font-size: 0.92rem; }
    form input[type="text"], form input[type="email"], form textarea { width: 100%; box-sizing: border-box; padding: 0.5rem 0.65rem; margin-top: 0.25rem; border: 1px solid #d6d3d1; border-radius: 0.35rem; font: inherit; }
    form fieldset { border: 1px solid #e7e5e4; border-radius: 0.4rem; padding: 0.6rem 1rem 0.8rem; margin: 0.8rem 0; }
    form fieldset legend { font-size: 0.9rem; font-weight: 500; padding: 0 0.3rem; }
    form fieldset label { font-weight: 400; margin-bottom: 0.4rem; }
    form button { background: #2563eb; color: white; border: 0; padding: 0.7rem 1.2rem; border-radius: 0.4rem; font: inherit; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
    form button:hover { background: #1d4ed8; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e7e5e4; font-size: 0.85rem; color: #78716c; }
    .footer a { color: #2563eb; }
    .back { display: inline-block; margin-bottom: 1.5rem; color: #78716c; text-decoration: none; font-size: 0.85rem; }
    .back:hover { color: #1c1917; }
    @media print {
      .lang-switch, .form-section, .back { display: none; }
      body { max-width: none; padding: 1rem; }
    }
  </style>
</head>
<body>
  <a href="/" class="back">${escape(lang.footer.back)}</a>
  <nav class="lang-switch" aria-label="Language">${renderLangSwitcher(lang.code)}</nav>

  <h1>${escape(lang.pageTitle)}</h1>
  <p class="subtitle">${escape(lang.subtitle)}</p>

  <div class="highlight">${escape(lang.highlight)}</div>

    ${lang.sections.map(renderSection).join("\n    ")}

    ${renderForm(lang)}

  <div class="footer">
    <p>
      <a href="/privacy.html">${escape(lang.footer.privacyLink)}</a> · <a href="/terms.html">${escape(lang.footer.termsLink)}</a>
    </p>
    <p>${escape(DATA_CONTROLLER.name)} · ${escape(DATA_CONTROLLER.country)} · <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a></p>
    <p style="font-size: 0.75rem; color: #a8a29e;">${escape(lang.footer.generatedNote)}</p>
  </div>
</body>
</html>
`;
}

// -----------------------------------------------------------------------------
// Write
// -----------------------------------------------------------------------------

for (const lang of ALL_LANGS) {
  const filename = lang.code === "en" ? "parents.html" : `parents-${lang.code}.html`;
  const out = resolve(OUT_DIR, filename);
  writeFileSync(out, renderPage(lang), "utf8");
  console.log(`✓ Generated ${out}`);
}
console.log(`Done — ${ALL_LANGS.length} parent-info pages, all referencing ${DATA_PROTECTION_OFFICER.email} (${LANG_LABELS.join(" / ")}).`);
