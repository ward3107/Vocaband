/*
 * Quick Start — single-page cheat sheet. The 5 steps to a first lesson.
 * Designed to be printable on one A4 sheet, taped to the staffroom wall.
 */

const en = {
  cover: {
    kind: 'Quick Start',
    code: 'QS · v1',
    title: 'Quick Start',
    strap: 'From zero to your first lesson in 10 minutes.',
    sub: 'A single-page cheat sheet for new teachers. Hand it to a colleague or stick it on the wall.',
    pills: ['10 minutes', 'No install', 'Works on any device'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: 'The 5 steps',
      emoji: '⚡',
      intro: 'Follow these once. Future lessons take 30 seconds to set up.',
      blocks: [
        { type: 'steps', items: [
          { title: 'Sign in', body: 'Go to **vocaband.com**, click **Teacher Login**, sign in with Google (or Microsoft).' },
          { title: 'Make a class', body: 'Pick a name and grade level. Choose **Set 1, 2, 3** or **Custom list**.' },
          { title: 'Add words', body: 'Tick words from the list, paste your own, or snap a photo of a printed list (OCR).' },
          { title: 'Share the code', body: 'Show the **6-digit class code** or a **QR code** on the projector. Students join from vocaband.com.' },
          { title: 'Play together', body: 'Start a **Live Challenge** for the whole class, or let students self-pace from their dashboard.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'Tip', body: 'Aim for **10 words and 2 modes** in the first lesson. Less is more. Add complexity in week two.' },
        { type: 'h3', text: 'What students see' },
        { type: 'ul', items: [
          'Their **avatar**, **XP** and **🔥 streak** — earned for playing daily, not for being fast.',
          '**Daily chest** that rewards just showing up.',
          '**Per-word progress** so they know what to revise.',
        ]},
        { type: 'callout', tag: 'info', label: 'Need the full picture?', body: 'Read the **Teacher Guide** PDF — same site, footer, same place you got this one from.' },
      ],
    },
  ],
};

const he = {
  cover: {
    kind: 'מדריך מהיר',
    code: 'QS · v1',
    title: 'מדריך מהיר',
    strap: 'מאפס לשיעור הראשון תוך 10 דקות.',
    sub: 'דף יחיד למורות ומורים חדשים. תנו לקולגה או הדביקו על הקיר.',
    pills: ['10 דקות', 'בלי התקנה', 'עובד מכל מכשיר'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: '5 השלבים',
      emoji: '⚡',
      intro: 'עוקבים אחרי השלבים פעם אחת. כל שיעור הבא לוקח 30 שניות להכין.',
      blocks: [
        { type: 'steps', items: [
          { title: 'מתחברים', body: 'נכנסים ל-**vocaband.com**, לוחצים על **כניסת מורים** ומתחברים עם Google (או Microsoft).' },
          { title: 'יוצרים כיתה', body: 'בוחרים שם ושכבת גיל. בוחרים **Set 1, 2, 3** או **רשימה מותאמת**.' },
          { title: 'מוסיפים מילים', body: 'מסמנים מילים מהרשימה, מדביקים שלכם, או מצלמים רשימה מודפסת (OCR).' },
          { title: 'משתפים את הקוד', body: 'מציגים את **קוד הכיתה (6 ספרות)** או **קוד QR** במקרן. התלמידים מצטרפים מ-vocaband.com.' },
          { title: 'משחקים יחד', body: 'מפעילים **אתגר חי** לכל הכיתה, או שהתלמידים מתקדמים בקצב שלהם דרך הלוח שלהם.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'טיפ', body: 'בשיעור הראשון תכוונו ל-**10 מילים ושני מצבים**. פחות זה יותר. הוסיפו מורכבות בשבוע הבא.' },
        { type: 'h3', text: 'מה התלמידים רואים' },
        { type: 'ul', items: [
          '**אוואטר**, **XP** ו-**🔥 רצף** — מקבלים על משחק יומי, לא על מהירות.',
          '**שק יומי** שמתגמל על עצם ההגעה.',
          '**התקדמות פר מילה** כדי שיידעו מה לחזור עליו.',
        ]},
        { type: 'callout', tag: 'info', label: 'רוצים את הסקירה המלאה?', body: 'קראו את ה-PDF **מדריך למורה** — אותו אתר, אותו מקום שמצאתם בו את הקובץ הזה.' },
      ],
    },
  ],
};

const ar = {
  cover: {
    kind: 'بداية سريعة',
    code: 'QS · v1',
    title: 'بداية سريعة',
    strap: 'من الصفر إلى أول حصة في 10 دقائق.',
    sub: 'صفحة واحدة للمعلمين الجدد. أعطها لزميل أو علّقها على الحائط.',
    pills: ['10 دقائق', 'بدون تثبيت', 'يعمل على أي جهاز'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: 'الخطوات الخمس',
      emoji: '⚡',
      intro: 'اتبع هذه الخطوات مرة. كل حصة لاحقة تستغرق 30 ثانية للإعداد.',
      blocks: [
        { type: 'steps', items: [
          { title: 'سجّل الدخول', body: 'افتح **vocaband.com**، اضغط **دخول المعلمين** وسجّل بحساب Google (أو Microsoft).' },
          { title: 'أنشئ صفاً', body: 'اختر اسماً ومرحلة دراسية. اختر **Set 1, 2, 3** أو **قائمة خاصة**.' },
          { title: 'أضف الكلمات', body: 'علّم الكلمات من القائمة، الصق كلماتك، أو صوّر قائمة مطبوعة (OCR).' },
          { title: 'شارك الرمز', body: 'اعرض **رمز الصف (6 أرقام)** أو **رمز QR** على العارض. ينضم الطلاب من vocaband.com.' },
          { title: 'العبوا معاً', body: 'ابدأ **تحدياً مباشراً** للصف كله، أو دع الطلاب يتقدمون بإيقاعهم من لوحتهم.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'نصيحة', body: 'استهدف **10 كلمات ونمطين** في الحصة الأولى. القليل أفضل. أضف التعقيد في الأسبوع الثاني.' },
        { type: 'h3', text: 'ماذا يرى الطلاب' },
        { type: 'ul', items: [
          '**الشخصية**، **XP** و**🔥 السلسلة** — يحصلون عليها للعب اليومي، لا للسرعة.',
          '**صندوق يومي** يكافئ مجرد الحضور.',
          '**تقدّم لكل كلمة** ليعرفوا ماذا يراجعون.',
        ]},
        { type: 'callout', tag: 'info', label: 'تريد الصورة الكاملة؟', body: 'اقرأ **دليل المعلم** PDF — نفس الموقع، نفس المكان الذي وجدت فيه هذا.' },
      ],
    },
  ],
};

export const quickStart = { key: 'quick-start', emoji: '⚡', en, he, ar };
