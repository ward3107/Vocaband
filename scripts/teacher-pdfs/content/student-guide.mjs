/*
 * Student Guide — single-page handout. Written in simple, friendly
 * English (and translated). The teacher prints it and gives it out
 * in the first lesson.
 */

const en = {
  cover: {
    kind: 'Student Guide',
    code: 'SG · v1',
    title: 'Student Guide',
    strap: 'Welcome to Vocaband! Here is how it works.',
    sub: 'A short, friendly guide to help you start playing in your very first lesson.',
    pills: ['No password', 'On any device', 'Play in school or at home'],
    footerNote: 'Ask your teacher if you get stuck',
  },
  pages: [
    {
      heading: 'How to start',
      emoji: '🎮',
      intro: 'You only need three things: vocaband.com, the class code from your teacher, and your name.',
      blocks: [
        { type: 'steps', items: [
          { title: 'Open vocaband.com', body: 'On your phone, tablet or computer. Any browser works.' },
          { title: 'Type the class code', body: 'Your teacher will write it on the board (6 digits) or show a QR you can scan.' },
          { title: 'Pick your name', body: 'Tap your name from the class list. Choose your avatar — you can change it later.' },
        ]},
        { type: 'h3', text: 'What you can do' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'Choose the right English meaning.' },
          { name: 'Listening', desc: 'Listen, then pick the word you heard.' },
          { name: 'Spelling', desc: 'Listen, then type the word.' },
          { name: 'Matching', desc: 'Drag English to its translation.' },
          { name: 'Memory Flip', desc: 'Flip cards to find pairs.' },
          { name: 'Sentence Builder', desc: 'Drag words to make a sentence.' },
        ]},
        { type: 'h3', text: 'Why you earn things' },
        { type: 'stats', items: [
          { big: 'XP', label: 'every correct answer' },
          { big: '🔥', label: 'play every day' },
          { big: '🎁', label: 'daily chest' },
        ]},
        { type: 'p', text: 'XP grows as you practice. A **streak** is how many days in a row you played — even one short round counts. The **daily chest** gives you a free reward just for showing up.' },
        { type: 'callout', tag: 'tip', label: 'Tip', body: 'Practice for **5 minutes a day** instead of 30 minutes once a week. Your brain remembers small daily practice much better.' },
        { type: 'callout', tag: 'info', label: 'Stuck?', body: 'Ask your teacher. They can see what you are doing and help you on the spot.' },
      ],
    },
  ],
};

const he = {
  cover: {
    kind: 'מדריך לתלמיד',
    code: 'SG · v1',
    title: 'מדריך לתלמיד',
    strap: 'ברוכים הבאים ל-Vocaband! ככה זה עובד.',
    sub: 'מדריך קצר וחברותי שיעזור לכם להתחיל לשחק כבר בשיעור הראשון.',
    pills: ['בלי סיסמה', 'בכל מכשיר', 'בבית ובכיתה'],
    footerNote: 'אם נתקעתם — תשאלו את המורה',
  },
  pages: [
    {
      heading: 'איך מתחילים',
      emoji: '🎮',
      intro: 'צריך רק שלושה דברים: vocaband.com, קוד הכיתה מהמורה, והשם שלכם.',
      blocks: [
        { type: 'steps', items: [
          { title: 'פותחים vocaband.com', body: 'בנייד, בטאבלט או במחשב. כל דפדפן מתאים.' },
          { title: 'מקלידים את קוד הכיתה', body: 'המורה כותב/ת אותו על הלוח (6 ספרות) או מראה קוד QR לסריקה.' },
          { title: 'בוחרים את השם שלכם', body: 'לוחצים על השם ברשימה. בוחרים אוואטר — אפשר להחליף בהמשך.' },
        ]},
        { type: 'h3', text: 'מה אפשר לעשות' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'לבחור את המשמעות הנכונה באנגלית.' },
          { name: 'Listening', desc: 'להקשיב ולבחור את המילה ששמעתם.' },
          { name: 'Spelling', desc: 'להקשיב ולהקליד את המילה.' },
          { name: 'Matching', desc: 'לגרור מאנגלית לתרגום.' },
          { name: 'Memory Flip', desc: 'להפוך קלפים ולמצוא זוגות.' },
          { name: 'Sentence Builder', desc: 'לגרור מילים לבניית משפט.' },
        ]},
        { type: 'h3', text: 'למה צוברים נקודות' },
        { type: 'stats', items: [
          { big: 'XP', label: 'כל תשובה נכונה' },
          { big: '🔥', label: 'משחק כל יום' },
          { big: '🎁', label: 'שק יומי' },
        ]},
        { type: 'p', text: 'XP גדל עם כל תרגול. **רצף** זה כמה ימים ברצף שיחקתם — אפילו סיבוב קצר נחשב. **השק היומי** מעניק לכם פרס חינם רק על זה שהגעתם.' },
        { type: 'callout', tag: 'tip', label: 'טיפ', body: 'תתרגלו **5 דקות ביום** במקום 30 דקות פעם בשבוע. המוח זוכר הרבה יותר טוב תרגול קצר ויומיומי.' },
        { type: 'callout', tag: 'info', label: 'נתקעתם?', body: 'שאלו את המורה. הוא או היא רואים מה אתם עושים ויוכלו לעזור.' },
      ],
    },
  ],
};

const ar = {
  cover: {
    kind: 'دليل الطالب',
    code: 'SG · v1',
    title: 'دليل الطالب',
    strap: 'أهلاً بك في Vocaband! إليك طريقة العمل.',
    sub: 'دليل قصير وودود يساعدك على البدء باللعب من الحصة الأولى.',
    pills: ['بدون كلمة سر', 'على أي جهاز', 'في المدرسة وفي البيت'],
    footerNote: 'إذا توقفت — اسأل معلمك',
  },
  pages: [
    {
      heading: 'كيف تبدأ',
      emoji: '🎮',
      intro: 'تحتاج ثلاثة أشياء فقط: vocaband.com، رمز الصف من المعلم، واسمك.',
      blocks: [
        { type: 'steps', items: [
          { title: 'افتح vocaband.com', body: 'على هاتفك، لوحك أو حاسوبك. يعمل أي متصفح.' },
          { title: 'اكتب رمز الصف', body: 'يكتبه معلمك على اللوح (6 أرقام) أو يعرض رمز QR للمسح.' },
          { title: 'اختر اسمك', body: 'اضغط اسمك من قائمة الصف. اختر شخصيتك — يمكن تغييرها لاحقاً.' },
        ]},
        { type: 'h3', text: 'ما الذي يمكنك فعله' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'تختار المعنى الإنجليزي الصحيح.' },
          { name: 'Listening', desc: 'اسمع ثم اختر الكلمة التي سمعتها.' },
          { name: 'Spelling', desc: 'اسمع ثم اكتب الكلمة.' },
          { name: 'Matching', desc: 'اسحب من الإنجليزية إلى الترجمة.' },
          { name: 'Memory Flip', desc: 'اقلب البطاقات لتجد الأزواج.' },
          { name: 'Sentence Builder', desc: 'اسحب الكلمات لتكوين جملة.' },
        ]},
        { type: 'h3', text: 'لماذا تربح كل هذه الأشياء' },
        { type: 'stats', items: [
          { big: 'XP', label: 'كل إجابة صحيحة' },
          { big: '🔥', label: 'العب كل يوم' },
          { big: '🎁', label: 'الصندوق اليومي' },
        ]},
        { type: 'p', text: 'تكبر نقاط XP مع التدريب. **السلسلة** هي عدد الأيام المتتالية التي لعبت فيها — حتى جولة قصيرة تُحسب. **الصندوق اليومي** يمنحك جائزة مجانية لمجرد حضورك.' },
        { type: 'callout', tag: 'tip', label: 'نصيحة', body: 'تدرب **5 دقائق يومياً** بدلاً من 30 دقيقة مرة في الأسبوع. الدماغ يتذكر التدريب اليومي القصير بشكل أفضل بكثير.' },
        { type: 'callout', tag: 'info', label: 'توقفت؟', body: 'اسأل معلمك. يرى ماذا تفعل ويستطيع مساعدتك في الحال.' },
      ],
    },
  ],
};

export const studentGuide = { key: 'student-guide', emoji: '🎮', en, he, ar };
