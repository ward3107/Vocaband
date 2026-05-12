/*
 * Parent Letter — template letter the teacher prints and hands home.
 * Friendly, parent-readable, no jargon. Mentions privacy briefly.
 */

const en = {
  cover: {
    kind: 'Letter for Parents',
    code: 'PL · v1',
    title: 'A note for parents',
    strap: 'Your child has started using Vocaband to learn English vocabulary.',
    sub: 'A short letter you can hand out at the start of the year — what the app does, how it stays safe, and how you can help at home.',
    pills: ['English vocabulary', 'Grades 4–9', 'No app to install', 'No password for your child'],
    footerNote: 'Print, sign, send home',
  },
  pages: [
    {
      heading: 'Dear parent or guardian',
      emoji: '✉️',
      blocks: [
        { type: 'p', text: 'This year, our English class is using **Vocaband** — a learning website that helps your child practice the English vocabulary on the Ministry of Education curriculum. I wanted to take a moment to explain what it is and how you can support your child at home.' },
        { type: 'h3', text: 'What it is' },
        { type: 'p', text: 'Vocaband is **a website, not an app**. There is nothing to install and your child does **not** need a password. They join my class with a short code I give them, and after that they can practice from any device — school computer, your phone, a tablet at home.' },
        { type: 'h3', text: 'What your child does' },
        { type: 'ul', items: [
          'Plays short, friendly games to learn the **English words** for this year.',
          'Hears every word **read out loud** so pronunciation gets better, not just spelling.',
          'Sees translations in **Hebrew and Arabic**, whichever helps them most.',
          'Earns points and a streak — small rewards for **practicing a little every day**.',
        ]},
        { type: 'callout', tag: 'info', label: 'How you can help', body: 'Ask your child to play **5 minutes a day** — at breakfast, on the bus, before bed. Daily short practice beats a long session once a week. They do not need your help with English; they need your help with the habit.' },
        { type: 'h3', text: 'Privacy' },
        { type: 'p', text: 'Vocaband does not show ads to children. It does not ask for an email, a phone number, or a parent address from your child. The team stores only what is needed to track classroom progress, on European servers. A full privacy summary is available at **vocaband.com** under "Privacy".' },
        { type: 'callout', tag: 'tip', label: 'Questions?', body: 'Talk to me directly, or write to **contact@vocaband.com** — they reply in English, Hebrew, or Arabic.' },
        { type: 'signoff', body: 'Thank you for supporting your child\'s English journey.', name: '— Your child\'s English teacher' },
      ],
    },
  ],
};

const he = {
  cover: {
    kind: 'מכתב להורים',
    code: 'PL · v1',
    title: 'מכתב להורים',
    strap: 'ילדכם התחיל/ה להשתמש ב-Vocaband ללמידת אוצר מילים באנגלית.',
    sub: 'מכתב קצר לחלוקה בתחילת השנה — מה האפליקציה עושה, איך היא בטוחה ואיך אפשר לעזור בבית.',
    pills: ['אוצר מילים באנגלית', 'כיתות ד׳–ט׳', 'בלי התקנה', 'בלי סיסמה לילד'],
    footerNote: 'להדפסה, חתימה ושליחה הביתה',
  },
  pages: [
    {
      heading: 'להורה היקר/ה',
      emoji: '✉️',
      blocks: [
        { type: 'p', text: 'השנה אנחנו משתמשים בכיתת האנגלית ב-**Vocaband** — אתר למידה שעוזר לילד או לילדה שלכם לתרגל את אוצר המילים באנגלית לפי תכנית הלימודים של משרד החינוך. הקדשתי דקה להסביר במה מדובר ואיך תוכלו לעזור בבית.' },
        { type: 'h3', text: 'מה זה' },
        { type: 'p', text: 'Vocaband הוא **אתר, לא אפליקציה**. אין מה להתקין, והילד/ה **לא צריך/ה** סיסמה. הם נכנסים לכיתה שלי עם קוד קצר שאתן להם, ומשם יכולים לתרגל מכל מכשיר — מחשב בבית הספר, הנייד שלכם, או טאבלט בבית.' },
        { type: 'h3', text: 'מה הילד/ה עושה' },
        { type: 'ul', items: [
          'משחק/ת במשחקים קצרים וידידותיים כדי ללמוד את **מילות האנגלית** של השנה.',
          'שומע/ת כל מילה **בהקראה** כדי שהגייה תשתפר, לא רק כתיב.',
          'רואה תרגום ל-**עברית ולערבית** — מה שיעזור יותר.',
          'צובר/ת נקודות ורצף — תמריצים קטנים על **תרגול קצר וקבוע**.',
        ]},
        { type: 'callout', tag: 'info', label: 'איך אפשר לעזור', body: 'בקשו מהילד/ה לשחק **5 דקות ביום** — בארוחת בוקר, באוטובוס, לפני השינה. תרגול יומי קצר עדיף על מפגש ארוך פעם בשבוע. אין צורך לעזור באנגלית — צריך לעזור עם ההרגל.' },
        { type: 'h3', text: 'פרטיות' },
        { type: 'p', text: 'Vocaband לא מציגה פרסומות לילדים. היא לא מבקשת מהילד/ה מייל, טלפון או כתובת הורה. הצוות שומר רק את מה שנדרש למעקב כיתתי, על שרתים באירופה. סיכום פרטיות מלא נמצא ב-**vocaband.com** תחת "פרטיות".' },
        { type: 'callout', tag: 'tip', label: 'שאלות?', body: 'דברו איתי ישירות, או כתבו ל-**contact@vocaband.com** — הם עונים בעברית, ערבית או אנגלית.' },
        { type: 'signoff', body: 'תודה על התמיכה במסע האנגלית של הילד/ה שלכם.', name: '— מורה האנגלית של ילדכם' },
      ],
    },
  ],
};

const ar = {
  cover: {
    kind: 'رسالة للأهل',
    code: 'PL · v1',
    title: 'رسالة لذويّ الطالب',
    strap: 'بدأ ابنكم/ابنتكم باستخدام Vocaband لتعلّم مفردات الإنجليزية.',
    sub: 'رسالة قصيرة توزَّع في بداية السنة — ما الذي يفعله التطبيق، وكيف يحافظ على السلامة، وكيف يمكنكم المساعدة في البيت.',
    pills: ['مفردات إنجليزية', 'الصفوف الرابع–التاسع', 'بدون تثبيت', 'بدون كلمة سر للطفل'],
    footerNote: 'للطباعة والتوقيع وإرساله',
  },
  pages: [
    {
      heading: 'إلى ولي الأمر',
      emoji: '✉️',
      blocks: [
        { type: 'p', text: 'في هذه السنة، نستخدم في حصة الإنجليزية تطبيق **Vocaband** — موقع تعليمي يساعد ابنكم/ابنتكم على تدريب مفردات الإنجليزية ضمن منهاج وزارة التربية. أردتُ أن أوضّح بإيجاز ما الذي يعمله البرنامج وكيف يمكنكم دعم طفلكم في البيت.' },
        { type: 'h3', text: 'ما هو' },
        { type: 'p', text: 'Vocaband **موقع وليس تطبيقاً**. لا شيء يحتاج تثبيتاً، وابنكم/ابنتكم **لا** يحتاج/تحتاج إلى كلمة سر. ينضمّ إلى صفي عبر رمز قصير أعطيه له، وبعد ذلك يستطيع التدرّب من أي جهاز — حاسوب المدرسة، هاتفكم أو لوح في البيت.' },
        { type: 'h3', text: 'ماذا يفعل الطفل' },
        { type: 'ul', items: [
          'يلعب ألعاباً قصيرة وودودة لتعلّم **كلمات الإنجليزية** لهذه السنة.',
          'يسمع كل كلمة **بصوت واضح** ليتحسّن النطق، لا الكتابة فقط.',
          'يرى الترجمة إلى **العبرية والعربية** — أيهما يساعد أكثر.',
          'يجمع نقاطاً وسلسلة — مكافآت صغيرة على **تدريب يومي قصير**.',
        ]},
        { type: 'callout', tag: 'info', label: 'كيف تساعدون', body: 'اطلبوا من طفلكم اللعب **5 دقائق يومياً** — في الإفطار، في الباص، قبل النوم. التدريب اليومي القصير أفضل من جلسة طويلة مرة في الأسبوع. لا حاجة لمساعدته في الإنجليزية — ساعدوه في العادة.' },
        { type: 'h3', text: 'الخصوصية' },
        { type: 'p', text: 'Vocaband لا يعرض إعلانات على الأطفال. لا يطلب من الطفل بريداً إلكترونياً ولا رقم هاتف ولا عنوان ولي الأمر. يحفظ الفريق فقط ما يلزم لمتابعة التقدم الصفي، على خوادم في أوروبا. ملخص خصوصية كامل متاح في **vocaband.com** تحت "الخصوصية".' },
        { type: 'callout', tag: 'tip', label: 'أسئلة؟', body: 'تحدّثوا معي مباشرة، أو راسلوا **contact@vocaband.com** — يجيبون بالعربية أو العبرية أو الإنجليزية.' },
        { type: 'signoff', body: 'شكراً لدعمكم لرحلة طفلكم في اللغة الإنجليزية.', name: '— معلم/ة الإنجليزية لطفلكم' },
      ],
    },
  ],
};

const ru = {
  cover: {
    kind: 'Письмо родителям',
    code: 'PL · v1',
    title: 'Письмо родителям',
    strap: 'Ваш ребёнок начал заниматься английским словарным запасом в Vocaband.',
    sub: 'Короткое письмо для рассылки в начале года — что делает приложение, как обеспечивается безопасность и как можно помочь дома.',
    pills: ['Английский словарь', '4–9 классы', 'Без установки', 'Без пароля для ребёнка'],
    footerNote: 'Распечатать, подписать, отправить домой',
  },
  pages: [
    {
      heading: 'Уважаемые родители',
      emoji: '✉️',
      blocks: [
        { type: 'p', text: 'В этом учебном году на уроках английского мы используем **Vocaband** — учебный сайт, который помогает вашему ребёнку отрабатывать английскую лексику в соответствии с программой Министерства образования. Хочу коротко рассказать, что это такое и как вы можете поддержать ребёнка дома.' },
        { type: 'h3', text: 'Что это такое' },
        { type: 'p', text: 'Vocaband — это **сайт, а не приложение**. Ничего не нужно устанавливать, и вашему ребёнку **не нужен** пароль. Он заходит в мой класс по короткому коду, который я ему дам, и после этого может заниматься с любого устройства — школьного компьютера, вашего телефона или планшета дома.' },
        { type: 'h3', text: 'Что делает ребёнок' },
        { type: 'ul', items: [
          'Играет в короткие, дружелюбные игры, чтобы выучить **английские слова** этого года.',
          'Слышит каждое слово **вслух**, чтобы улучшалось произношение, а не только написание.',
          'Видит перевод на **иврит и арабский** — то, что ему понятнее.',
          'Зарабатывает очки и серии — небольшие награды за **короткие ежедневные занятия**.',
        ]},
        { type: 'callout', tag: 'info', label: 'Как вы можете помочь', body: 'Попросите ребёнка играть **5 минут в день** — за завтраком, в автобусе, перед сном. Короткая ежедневная практика лучше одного длинного занятия в неделю. Помогать с английским не нужно — нужно помочь с привычкой.' },
        { type: 'h3', text: 'Конфиденциальность' },
        { type: 'p', text: 'Vocaband не показывает детям рекламу. Не запрашивает у ребёнка электронную почту, номер телефона или адрес родителей. Команда хранит только то, что нужно для отслеживания успеваемости класса, на серверах в Европе. Полный обзор конфиденциальности — на **vocaband.com** в разделе "Конфиденциальность".' },
        { type: 'callout', tag: 'tip', label: 'Вопросы?', body: 'Обратитесь ко мне напрямую или напишите на **contact@vocaband.com** — ответят на английском, иврите или арабском.' },
        { type: 'signoff', body: 'Спасибо, что поддерживаете ребёнка в изучении английского.', name: '— Учитель английского языка вашего ребёнка' },
      ],
    },
  ],
};

export const parentLetter = { key: 'parent-letter', emoji: '✉️', en, he, ar, ru };
