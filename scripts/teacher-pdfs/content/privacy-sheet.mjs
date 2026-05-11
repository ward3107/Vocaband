/*
 * Privacy & Data sheet — DRAFT. Two pages. Carries a clear "DRAFT —
 * pending legal review" banner on page 1. Do NOT send to schools or
 * the MoE without the lawyer's sign-off (per docs/operator-tasks.md).
 *
 * Content kept factual and generic — describes what the app does and
 * the kinds of data involved, but avoids legal promises until the
 * lawyer locks the wording.
 */

const en = {
  cover: {
    kind: 'Privacy & Data Sheet',
    code: 'PR · DRAFT',
    title: 'Privacy & Data',
    strap: 'A short, plain-English summary for school administrators.',
    sub: 'What Vocaband collects, why, where it is stored, and how long it stays. A one-page version for the staff room is on the next page.',
    pills: ['DRAFT v1', 'Pending legal review', 'EU-hosted data', 'No ads to children'],
    footerNote: 'Lawyer review pending — do not distribute',
  },
  pages: [
    {
      heading: 'What we collect',
      emoji: '🛡️',
      intro: 'Vocaband is designed to collect the minimum needed to make a vocabulary classroom work. The list below is exhaustive.',
      blocks: [
        { type: 'draftBanner', tag: 'DRAFT', text: 'This document is a working draft awaiting legal review. The final, signed version is what should be shared with schools, the Ministry of Education, or parents.' },
        { type: 'h3', text: 'For teachers' },
        { type: 'ul', items: [
          'Email address — used only for sign-in (Google, Microsoft, or one-time email code).',
          'Display name — taken from the OAuth provider; editable.',
          'Class names, assignment configurations, and the word lists the teacher creates.',
        ]},
        { type: 'h3', text: 'For students' },
        { type: 'ul', items: [
          'Display name — chosen by the teacher when adding students. **No student email or phone number is required.**',
          'Per-word progress (correct / wrong / how many tries), XP, streak counter, avatar choice.',
          'Game session timestamps (so we can show the teacher who played today).',
        ]},
        { type: 'h3', text: 'What we do NOT collect' },
        { type: 'ul', items: [
          'No advertising identifiers, no third-party tracking pixels.',
          'No parent contact details, home address, phone number, or photographs.',
          'No microphone or camera data, except when the teacher voluntarily uses the camera to OCR a printed word list — the image is processed and discarded.',
        ]},
        { type: 'callout', tag: 'info', label: 'In plain English', body: 'A child can use Vocaband without ever giving the app their email, phone, or any personal contact information. The teacher is the only adult-identifiable account.' },
      ],
    },
    {
      heading: 'Where it lives & how long',
      emoji: '🌍',
      intro: 'Where data is stored, who can access it, and what happens at the end of the school year.',
      blocks: [
        { type: 'draftBanner', tag: 'DRAFT', text: 'Pending legal review.' },
        { type: 'h3', text: 'Storage location' },
        { type: 'p', text: 'All teacher and student records are stored in the **European Union** (Frankfurt, Germany) on Supabase\'s managed Postgres. Audio files and images are stored on Cloudflare R2 with EU residency.' },
        { type: 'h3', text: 'Who can access the data' },
        { type: 'table', headers: ['Who', 'What they can see'], rows: [
          ['The teacher who created the class', 'All progress, XP, and answers for the students in their class.'],
          ['Co-teachers added by the original teacher', 'The same view as the original teacher.'],
          ['The Vocaband engineering team', 'Aggregated metrics for product improvement. Access to per-student data is gated behind support-ticket workflows and is logged.'],
          ['Students', 'Their own progress only. They cannot see other students\' answers or names outside their own class.'],
        ]},
        { type: 'h3', text: 'How long we keep it' },
        { type: 'ul', items: [
          'Active classes — kept while the teacher\'s account is active.',
          'Closed classes — kept for up to **24 months** after the last activity, then anonymised.',
          'A teacher can delete their account at any time; this removes all classes and student records associated with that teacher.',
        ]},
        { type: 'h3', text: 'Security highlights' },
        { type: 'ul', items: [
          'All traffic is encrypted (TLS 1.3, **SSL Labs A+**).',
          'Per-row authorization in the database (RLS) — a teacher can technically only read the rows that belong to their own classes.',
          'Annual independent penetration test (planned for **summer 2026**).',
        ]},
        { type: 'callout', tag: 'tip', label: 'Contact', body: 'Privacy questions: **privacy@vocaband.com**. Subject-access or deletion requests are answered within 7 business days.' },
      ],
    },
  ],
};

const he = {
  cover: {
    kind: 'דף פרטיות וסיכום נתונים',
    code: 'PR · טיוטה',
    title: 'פרטיות ונתונים',
    strap: 'סיכום קצר ובהיר עבור הנהלת בית הספר.',
    sub: 'מה Vocaband אוסף, למה, איפה זה שמור וכמה זמן. בעמוד הבא יש גרסה מקוצרת לחדר המורים.',
    pills: ['טיוטה v1', 'בהמתנה לבדיקה משפטית', 'אחסון באירופה', 'בלי פרסומות לילדים'],
    footerNote: 'טיוטה בהמתנה לאישור משפטי — לא להפצה',
  },
  pages: [
    {
      heading: 'מה אנחנו אוספים',
      emoji: '🛡️',
      intro: 'Vocaband מתוכנן לאסוף את המינימום הנדרש להפעלת כיתת אוצר מילים. הרשימה הבאה היא ממצה.',
      blocks: [
        { type: 'draftBanner', tag: 'טיוטה', text: 'מסמך זה הוא טיוטת עבודה הממתינה לבדיקה משפטית. הגרסה הסופית והחתומה היא זו שיש לשתף עם בתי ספר, משרד החינוך או הורים.' },
        { type: 'h3', text: 'למורים' },
        { type: 'ul', items: [
          'כתובת מייל — לכניסה בלבד (Google, Microsoft, או קוד חד-פעמי).',
          'שם תצוגה — מגיע מהספק (OAuth); ניתן לעריכה.',
          'שמות הכיתות, הגדרות המטלות והרשימות שהמורה יוצר/ת.',
        ]},
        { type: 'h3', text: 'לתלמידים' },
        { type: 'ul', items: [
          'שם תצוגה — נבחר על ידי המורה. **אין צורך במייל או טלפון של תלמיד.**',
          'התקדמות פר-מילה (נכון/שגוי/כמה ניסיונות), XP, מונה רצף, בחירת אוואטר.',
          'חותמות זמן של משחקים (כדי שהמורה תראה מי שיחק היום).',
        ]},
        { type: 'h3', text: 'מה אנחנו לא אוספים' },
        { type: 'ul', items: [
          'אין מזהי פרסומת, אין פיקסלים של צד שלישי.',
          'אין פרטי הורה, כתובת בית, טלפון או תמונות.',
          'אין הקלטות מיקרופון או מצלמה — אלא כשהמורה בוחר/ת לצלם רשימה מודפסת לזיהוי OCR. התמונה מעובדת ונמחקת.',
        ]},
        { type: 'callout', tag: 'info', label: 'בעברית פשוטה', body: 'תלמיד/ה יכול/ה להשתמש ב-Vocaband מבלי לתת לאפליקציה אי-פעם מייל, טלפון או פרטי קשר. המורה היא החשבון היחיד עם זהות של מבוגר.' },
      ],
    },
    {
      heading: 'איפה זה נשמר וכמה זמן',
      emoji: '🌍',
      intro: 'איפה הנתונים נשמרים, מי יכול לגשת אליהם ומה קורה בסוף השנה.',
      blocks: [
        { type: 'draftBanner', tag: 'טיוטה', text: 'בהמתנה לבדיקה משפטית.' },
        { type: 'h3', text: 'מיקום האחסון' },
        { type: 'p', text: 'כל רשומות המורים והתלמידים נשמרות ב-**האיחוד האירופי** (פרנקפורט, גרמניה) על Supabase Postgres מנוהל. קבצי אודיו ותמונות נשמרים ב-Cloudflare R2 עם תושבות אירופית.' },
        { type: 'h3', text: 'מי יכול לראות את הנתונים' },
        { type: 'table', headers: ['מי', 'מה רואים'], rows: [
          ['המורה שיצרה את הכיתה', 'את כל ההתקדמות, ה-XP והתשובות של התלמידים בכיתתה.'],
          ['מורים שותפים שצורפו', 'אותה תצוגה כמו המורה המקורית.'],
          ['צוות ההנדסה של Vocaband', 'מדדים מצטברים לשיפור המוצר. גישה לנתון פר-תלמיד מותנית בתהליך תמיכה ומתועדת.'],
          ['תלמידים', 'רק את ההתקדמות האישית שלהם, ולא של תלמידים אחרים מחוץ לכיתתם.'],
        ]},
        { type: 'h3', text: 'כמה זמן זה נשמר' },
        { type: 'ul', items: [
          'כיתות פעילות — נשמרות כל עוד חשבון המורה פעיל.',
          'כיתות סגורות — עד **24 חודשים** מהפעילות האחרונה, ואז עוברות אנונימיזציה.',
          'מורה רשאית למחוק את חשבונה בכל עת; הפעולה מסירה את כל הכיתות והרשומות שלה.',
        ]},
        { type: 'h3', text: 'אבטחה' },
        { type: 'ul', items: [
          'כל התעבורה מוצפנת (TLS 1.3, **SSL Labs A+**).',
          'הרשאות פר-שורה במסד הנתונים (RLS) — מורה יכולה מבחינה טכנית לגשת רק לשורות של כיתותיה.',
          'בדיקת חדירה עצמאית שנתית (מתוכננת ל-**קיץ 2026**).',
        ]},
        { type: 'callout', tag: 'tip', label: 'יצירת קשר', body: 'שאלות פרטיות: **privacy@vocaband.com**. בקשות גישה או מחיקה — תשובה תוך 7 ימי עסקים.' },
      ],
    },
  ],
};

const ar = {
  cover: {
    kind: 'ورقة الخصوصية والبيانات',
    code: 'PR · مسودة',
    title: 'الخصوصية والبيانات',
    strap: 'ملخّص قصير وواضح لإدارة المدرسة.',
    sub: 'ماذا يجمع Vocaband، ولِم، وأين يُخزَّن، وكم يبقى. في الصفحة التالية نسخة قصيرة لغرفة المعلمين.',
    pills: ['مسودة v1', 'بانتظار مراجعة قانونية', 'استضافة في أوروبا', 'بدون إعلانات للأطفال'],
    footerNote: 'مسودة بانتظار التوقيع القانوني — لا توزَّع',
  },
  pages: [
    {
      heading: 'ما الذي نجمعه',
      emoji: '🛡️',
      intro: 'صُمّم Vocaband ليجمع الحدّ الأدنى اللازم لتشغيل صف مفردات. القائمة التالية شاملة.',
      blocks: [
        { type: 'draftBanner', tag: 'مسودة', text: 'هذا المستند مسودة عمل بانتظار مراجعة قانونية. النسخة النهائية الموقّعة هي ما يجب مشاركته مع المدارس أو وزارة التربية أو الأهالي.' },
        { type: 'h3', text: 'للمعلمين' },
        { type: 'ul', items: [
          'البريد الإلكتروني — لتسجيل الدخول فقط (Google أو Microsoft أو رمز لمرة واحدة).',
          'الاسم المعروض — يُجلب من المزوّد (OAuth) وقابل للتعديل.',
          'أسماء الصفوف، إعدادات المهام، وقوائم الكلمات التي ينشئها المعلم.',
        ]},
        { type: 'h3', text: 'للطلاب' },
        { type: 'ul', items: [
          'الاسم المعروض — يختاره المعلم. **لا يُطلب بريد أو هاتف من الطالب.**',
          'التقدم لكل كلمة (صحيح/خطأ/عدد المحاولات)، XP، عداد السلسلة، اختيار الشخصية.',
          'طوابع زمنية للجلسات (لكي يرى المعلم من لعب اليوم).',
        ]},
        { type: 'h3', text: 'ما لا نجمعه' },
        { type: 'ul', items: [
          'لا معرّفات إعلانية ولا بكسلات تتبّع لطرف ثالث.',
          'لا تفاصيل ولي أمر ولا عنوان منزل ولا هاتف ولا صور.',
          'لا تسجيلات ميكروفون أو كاميرا، إلا إذا اختار المعلم تصوير قائمة كلمات لـOCR. تُعالَج الصورة ثم تُحذف.',
        ]},
        { type: 'callout', tag: 'info', label: 'بإيجاز', body: 'يستطيع الطفل استخدام Vocaband دون أن يعطي التطبيق إطلاقاً أي بريد أو هاتف أو معلومة شخصية. المعلم هو الحساب الوحيد الذي يحمل هوية بالغ.' },
      ],
    },
    {
      heading: 'أين تُخزَّن وكم تبقى',
      emoji: '🌍',
      intro: 'أين تُحفظ البيانات، ومن يصل إليها، وماذا يحدث في نهاية السنة الدراسية.',
      blocks: [
        { type: 'draftBanner', tag: 'مسودة', text: 'بانتظار مراجعة قانونية.' },
        { type: 'h3', text: 'موقع التخزين' },
        { type: 'p', text: 'جميع سجلات المعلمين والطلاب مخزّنة في **الاتحاد الأوروبي** (فرانكفورت، ألمانيا) على Supabase Postgres مُدار. ملفات الصوت والصور على Cloudflare R2 ضمن نطاق إقامة أوروبي.' },
        { type: 'h3', text: 'من يصل إلى البيانات' },
        { type: 'table', headers: ['من', 'ماذا يرى'], rows: [
          ['المعلم الذي أنشأ الصف', 'كل التقدم وXP والإجابات لطلابه.'],
          ['معلمون مشاركون مضافون', 'نفس عرض المعلم الأصلي.'],
          ['فريق هندسة Vocaband', 'مؤشرات إجمالية لتحسين المنتج. الوصول للبيانات الفردية ضمن تذاكر دعم ومُسجَّل.'],
          ['الطلاب', 'تقدّمهم الشخصي فقط، ولا يرون طلاباً من خارج صفهم.'],
        ]},
        { type: 'h3', text: 'مدة الاحتفاظ' },
        { type: 'ul', items: [
          'الصفوف الفعّالة — تُحفظ ما دام حساب المعلم نشطاً.',
          'الصفوف المغلقة — حتى **24 شهراً** من آخر نشاط ثم تُجَهَّل (anonymisation).',
          'يستطيع المعلم حذف حسابه في أي وقت؛ هذا يزيل كل الصفوف والسجلات المرتبطة.',
        ]},
        { type: 'h3', text: 'مزايا الأمن' },
        { type: 'ul', items: [
          'كل حركة البيانات مشفّرة (TLS 1.3، **SSL Labs A+**).',
          'صلاحيات على مستوى الصف في قاعدة البيانات (RLS) — يستطيع المعلم تقنياً قراءة سجلات صفوفه فقط.',
          'اختبار اختراق مستقلّ سنوي (مخطَّط له **صيف 2026**).',
        ]},
        { type: 'callout', tag: 'tip', label: 'تواصل', body: 'أسئلة خصوصية: **privacy@vocaband.com**. طلبات الوصول أو الحذف يُرد عليها خلال 7 أيام عمل.' },
      ],
    },
  ],
};

export const privacySheet = { key: 'privacy-sheet', emoji: '🛡️', en, he, ar };
