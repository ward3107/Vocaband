/*
 * Teacher Guide — full ~5-page walkthrough for first-time teachers.
 * Covers: sign-in, creating a class, picking words / custom lists,
 * assigning modes, running a Live Challenge, reading analytics, tips.
 */

const en = {
  cover: {
    kind: 'Teacher Guide',
    code: 'TG · v1',
    title: 'Teacher Guide',
    strap: 'Everything you need to run Vocaband in your classroom.',
    sub: 'A practical walk-through written for English teachers in Israeli schools. Designed to be read once, then kept open on a tab for the first week of class.',
    pills: ['Grades 4–9', 'Hebrew & Arabic support', 'Set 1 / Set 2 / Set 3 + custom lists', 'No app install required'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: '1 · Sign in and create your class',
      emoji: '🚪',
      intro: 'You only need to do this once. After your first sign-in everything is remembered for the next session.',
      blocks: [
        { type: 'steps', items: [
          { title: 'Open vocaband.com on any browser', body: 'No installation, no extension, no app store. Works on a school PC, Chromebook, tablet, or phone.' },
          { title: 'Click "Teacher Login" and sign in with Google', body: 'Most Israeli schools use Google Workspace, so this is one click. If your school uses Microsoft 365, choose Sign in with Microsoft. No password to remember.' },
          { title: 'Create your first class', body: 'Pick a name (e.g. "5B English"), grade level, and the curriculum set you teach from: Set 1, Set 2, Set 3, or your own custom list.' },
          { title: 'Share the 6-digit class code with your students', body: 'They join from the same vocaband.com on their device, type the code, pick their name from the class list, and they are in. No emails, no passwords.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'Tip', body: 'You can also let students join by **QR code** instead of typing. Click "Show QR" on your class card and point the projector at the wall — every student in the room joins in 5 seconds.' },
        { type: 'screenshot', tagLabel: 'Screenshot', caption: 'Teacher dashboard with the class card, code, and student list' },
      ],
    },
    {
      heading: '2 · Create assignments',
      emoji: '📚',
      intro: 'An **assignment** is a chosen list of words plus the game modes students are allowed to use. You can have several running at once.',
      blocks: [
        { type: 'h3', text: 'Three ways to pick words' },
        { type: 'ul', items: [
          '**From the MoE list** — choose Set 1, Set 2, or Set 3 and tick the words you want. Most teachers start here.',
          '**Custom list (type it in)** — paste 10–30 of your own words. Translations and audio are generated automatically.',
          '**Custom list (upload a photo)** — point your phone camera at a printed list and Vocaband reads the words for you (OCR).',
        ]},
        { type: 'h3', text: 'Choose the modes' },
        { type: 'p', text: 'Each assignment lets you tick which of the 10+ game modes students are allowed to play. Start small — 2 or 3 modes is plenty for week one. You can always add more later.' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'See the word in Hebrew/Arabic, pick the English meaning from four options.' },
          { name: 'Listening', desc: 'Hear the word spoken, pick the matching English.' },
          { name: 'Spelling', desc: 'Hear the word, type it letter by letter.' },
          { name: 'Matching', desc: 'Drag English to its Hebrew/Arabic translation.' },
          { name: 'Memory Flip', desc: 'Flip pairs of cards to match translations.' },
          { name: 'Sentence Builder', desc: 'Drag scrambled words to build a real sentence.' },
        ]},
        { type: 'callout', tag: 'info', label: 'How it scales', body: 'Vocaband ships with about **6,500 curriculum words**, each with audio in English, Hebrew, and Arabic. Custom words you add get audio automatically — no recording needed.' },
      ],
    },
    {
      heading: '3 · Live Challenge & analytics',
      emoji: '🏆',
      intro: 'Live Challenge turns your projector into a leaderboard while the class plays the same set of words at once. Use it for a 10-minute warm-up or a celebration at the end of a unit.',
      blocks: [
        { type: 'steps', items: [
          { title: 'Pick a word list', body: 'Use the current assignment or any list you have created.' },
          { title: 'Project the room code', body: 'Vocaband shows a big QR code and a 6-digit room code. Students scan or type to join.' },
          { title: 'Start the round', body: 'Everyone races through the same questions. The big-screen leaderboard updates after each word — top three get a podium animation.' },
        ]},
        { type: 'h3', text: 'What you see after class' },
        { type: 'stats', items: [
          { big: 'XP', label: 'per student' },
          { big: '🔥', label: 'streaks (daily play)' },
          { big: '%', label: 'accuracy per word' },
        ]},
        { type: 'p', text: 'The teacher dashboard shows you which **words are still tricky** for each student, who is **falling behind**, and who is **on a streak**. Use the per-word view to plan your next 5-minute drill.' },
        { type: 'callout', tag: 'tip', label: 'Tip', body: 'Sort the class by "words still wrong" once a week. The top 3–5 names are the students who need a quick one-on-one minute — not the whole class slowed down.' },
      ],
    },
    {
      heading: '4 · Tips, troubleshooting & support',
      emoji: '💡',
      intro: 'The little things that make week two smoother than week one.',
      blocks: [
        { type: 'h3', text: 'Classroom flow' },
        { type: 'ul', items: [
          'Start with **10 words** for the first assignment, not 30. Build confidence first.',
          'A **5-minute Live Challenge** at the start of the lesson is a brilliant warm-up — students arrive early to grab a seat.',
          'Let students **pick their avatar** in the first 2 minutes. Ownership matters.',
          'Stars, streaks, and the daily chest exist to make practice feel like a game — you do **not** need to track them for grades.',
        ]},
        { type: 'h3', text: 'Common questions' },
        { type: 'table', headers: ['Situation', 'What to do'], rows: [
          ['A student forgot which class they joined', 'Ask them for their name — you can see them under "Students" on the class card and resend the join link.'],
          ['Audio is not playing', 'Check the device volume and that the browser tab is not muted. On iPads, tap the screen once to allow audio.'],
          ['A student says the translation is wrong', 'Open the word in your dashboard and click "Suggest fix" — the team is alerted. Custom words can be edited directly.'],
          ['Two teachers share one class', 'Add the second teacher via Settings → Co-teachers. Both have full edit rights.'],
        ]},
        { type: 'callout', tag: 'info', label: 'Need help?', body: 'Email **contact@vocaband.com** or open the in-app chat from the teacher dashboard. We answer within one business day in English, Hebrew, or Arabic.' },
      ],
    },
  ],
};

const he = {
  cover: {
    kind: 'מדריך למורה',
    code: 'TG · v1',
    title: 'מדריך למורה',
    strap: 'כל מה שצריך כדי להפעיל את Vocaband בכיתה.',
    sub: 'מדריך מעשי שנכתב במיוחד למורות ומורים לאנגלית בישראל. מיועד לקריאה חד-פעמית, ואז להישאר פתוח בלשונית במהלך השבוע הראשון של הכיתה.',
    pills: ['כיתות ד׳–ט׳', 'תמיכה בעברית וערבית', 'Set 1 / 2 / 3 + רשימות מותאמות', 'ללא התקנה'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: '1 · התחברות ויצירת כיתה',
      emoji: '🚪',
      intro: 'את השלב הזה עושים פעם אחת בלבד. בכניסה הבאה הכול נשמר.',
      blocks: [
        { type: 'steps', items: [
          { title: 'נכנסים ל-vocaband.com מכל דפדפן', body: 'אין צורך בהתקנה או באפליקציה. עובד על מחשב בית-ספרי, Chromebook, טאבלט או נייד.' },
          { title: 'לוחצים "כניסת מורים" ומתחברים עם Google', body: 'רוב בתי הספר בישראל משתמשים ב-Google Workspace, אז זה לחיצה אחת. אם בית הספר עובד עם Microsoft 365, בחרו "התחברות עם Microsoft". אין סיסמה לזכור.' },
          { title: 'יוצרים את הכיתה הראשונה', body: 'בוחרים שם (למשל "ה1 אנגלית"), שכבת גיל, וסט אוצר המילים שאתם מלמדים: Set 1, 2, 3 או רשימה משלכם.' },
          { title: 'משתפים את קוד הכיתה (6 ספרות) עם התלמידים', body: 'הם נכנסים מאותו vocaband.com במכשיר שלהם, מקלידים את הקוד, בוחרים את שמם מרשימת הכיתה — וזהו. בלי מיילים ובלי סיסמאות.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'טיפ', body: 'אפשר גם לתת לתלמידים להצטרף דרך **קוד QR** במקום הקלדה. לחצו "הצג QR" בכרטיס הכיתה והפנו את המקרן לקיר — כל הכיתה מצטרפת בתוך 5 שניות.' },
        { type: 'screenshot', tagLabel: 'תמונת מסך', caption: 'לוח המורה עם כרטיס הכיתה, קוד הכניסה ורשימת התלמידים' },
      ],
    },
    {
      heading: '2 · יצירת מטלות',
      emoji: '📚',
      intro: '**מטלה** היא רשימת מילים שבחרתם בתוספת מצבי המשחק שהתלמידים יכולים להשתמש בהם. אפשר להריץ כמה מטלות במקביל.',
      blocks: [
        { type: 'h3', text: 'שלוש דרכים לבחור מילים' },
        { type: 'ul', items: [
          '**מתוך רשימת משרד החינוך** — בוחרים Set 1, 2 או 3 ומסמנים את המילים. רוב המורים מתחילים כאן.',
          '**רשימה מותאמת (הקלדה)** — מדביקים 10–30 מילים שלכם. תרגומים וקול נוצרים אוטומטית.',
          '**רשימה מותאמת (תמונה)** — מצלמים רשימה מודפסת ו-Vocaband קוראת את המילים (OCR).',
        ]},
        { type: 'h3', text: 'בוחרים מצבי משחק' },
        { type: 'p', text: 'בכל מטלה אפשר לסמן אילו ממעל 10 מצבי המשחק זמינים לתלמידים. כדאי להתחיל בקטן — שני מצבים מספיקים לשבוע הראשון. אפשר תמיד להוסיף.' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'רואים את המילה בעברית/ערבית ובוחרים את התרגום הנכון לאנגלית מתוך ארבע אפשרויות.' },
          { name: 'Listening', desc: 'שומעים את המילה ובוחרים את הכתיב הנכון.' },
          { name: 'Spelling', desc: 'שומעים את המילה ומקלידים אותה אות-אחר-אות.' },
          { name: 'Matching', desc: 'גוררים מאנגלית לתרגום בעברית/ערבית.' },
          { name: 'Memory Flip', desc: 'הופכים זוגות קלפים כדי להתאים תרגומים.' },
          { name: 'Sentence Builder', desc: 'גוררים מילים מעורבבות לבניית משפט אמיתי.' },
        ]},
        { type: 'callout', tag: 'info', label: 'גודל המאגר', body: 'ב-Vocaband יש כ-**6,500 מילות תכנית** עם הקראה באנגלית, עברית וערבית. גם למילים שאתם מוסיפים נוצר קול אוטומטית.' },
      ],
    },
    {
      heading: '3 · אתגר חי ונתונים',
      emoji: '🏆',
      intro: 'אתגר חי הופך את המקרן בכיתה ללוח-תוצאות בזמן שכל הכיתה משחקת על אותן מילים יחד. מעולה לחימום של 10 דקות או לחגיגה בסוף יחידה.',
      blocks: [
        { type: 'steps', items: [
          { title: 'בוחרים רשימת מילים', body: 'המטלה הנוכחית או כל רשימה אחרת שיצרתם.' },
          { title: 'מקרינים את קוד החדר', body: 'Vocaband מציגה קוד QR גדול וקוד בן 6 ספרות. התלמידים סורקים או מקלידים כדי להצטרף.' },
          { title: 'מתחילים', body: 'כולם רצים על אותן שאלות. הלוח על המקרן מתעדכן בכל מילה — שלושת המקומות הראשונים מקבלים פודיום.' },
        ]},
        { type: 'h3', text: 'מה רואים אחרי השיעור' },
        { type: 'stats', items: [
          { big: 'XP', label: 'לכל תלמיד' },
          { big: '🔥', label: 'רצף ימי-משחק' },
          { big: '%', label: 'דיוק לכל מילה' },
        ]},
        { type: 'p', text: 'לוח המורה מראה אילו **מילים עוד קשות** לכל תלמיד, מי **נשאר מאחור**, ומי **ברצף**. השתמשו בתצוגה לפי-מילה כדי לתכנן תרגול ממוקד של 5 דקות.' },
        { type: 'callout', tag: 'tip', label: 'טיפ', body: 'מיינו את הכיתה לפי "מילים עדיין שגויות" פעם בשבוע. 3–5 השמות העליונים הם התלמידים שזקוקים לדקה אישית — לא כל הכיתה.' },
      ],
    },
    {
      heading: '4 · טיפים, פתרון בעיות ותמיכה',
      emoji: '💡',
      intro: 'הדברים הקטנים שהופכים את השבוע השני לחלק יותר מהראשון.',
      blocks: [
        { type: 'h3', text: 'התנהלות בכיתה' },
        { type: 'ul', items: [
          'במטלה הראשונה תתחילו עם **10 מילים**, לא 30. ביטחון לפני כמות.',
          '**אתגר חי של 5 דקות** בתחילת השיעור הוא חימום מצוין — התלמידים מגיעים מוקדם כדי לתפוס מקום.',
          'תנו לתלמידים **לבחור אוואטר** בשתי הדקות הראשונות. תחושת בעלות חשובה.',
          'כוכבים, רצפים והשק היומי קיימים כדי שתרגול ירגיש כמו משחק — **לא** חייבים לשקלל אותם בציון.',
        ]},
        { type: 'h3', text: 'שאלות נפוצות' },
        { type: 'table', headers: ['מצב', 'מה לעשות'], rows: [
          ['תלמיד שכח לאיזו כיתה הצטרף', 'תשאלו לשמו — הוא יופיע ב"תלמידים" בכרטיס הכיתה ותוכלו לשלוח שוב את קישור הכניסה.'],
          ['אין הקראה', 'בדקו ווליום ושהלשונית לא במצב השתק. ב-iPad יש להקיש על המסך פעם אחת כדי לאפשר אודיו.'],
          ['תלמיד טוען שתרגום שגוי', 'פתחו את המילה בלוח שלכם ולחצו "הציעו תיקון" — הצוות מקבל התראה. מילים מותאמות אפשר לערוך ישירות.'],
          ['שני מורים חולקים כיתה', 'הוסיפו מורה שני דרך הגדרות → מורים נוספים. לשניכם הרשאות עריכה מלאות.'],
        ]},
        { type: 'callout', tag: 'info', label: 'צריכים עזרה?', body: 'מייל ל-**contact@vocaband.com** או צ׳אט מתוך לוח המורה. תשובה תוך יום עסקים אחד בעברית, ערבית או אנגלית.' },
      ],
    },
  ],
};

const ar = {
  cover: {
    kind: 'دليل المعلم',
    code: 'TG · v1',
    title: 'دليل المعلم',
    strap: 'كل ما تحتاجه لتشغيل Vocaband في صفك.',
    sub: 'دليل عملي كُتب خصيصاً لمعلمي ومعلمات اللغة الإنجليزية في المدارس الإسرائيلية. مصمم لتقرأه مرة واحدة، ثم تتركه مفتوحاً في تبويب خلال الأسبوع الأول.',
    pills: ['الصفوف الرابع–التاسع', 'دعم العبرية والعربية', 'Set 1 / 2 / 3 + قوائم خاصة', 'بدون تثبيت'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: '1 · تسجيل الدخول وإنشاء الصف',
      emoji: '🚪',
      intro: 'تقوم بهذه الخطوة مرة واحدة فقط. في الدخول التالي يتذكر كل شيء تلقائياً.',
      blocks: [
        { type: 'steps', items: [
          { title: 'افتح vocaband.com في أي متصفح', body: 'لا تثبيت ولا تطبيق. يعمل على كمبيوتر المدرسة، Chromebook، اللوحي أو الهاتف.' },
          { title: 'اضغط "دخول المعلمين" وسجّل بحساب Google', body: 'معظم المدارس في إسرائيل تستخدم Google Workspace، فالعملية ضغطة واحدة. إذا كانت مدرستك تستخدم Microsoft 365 اختر "تسجيل عبر Microsoft". لا كلمة سر للحفظ.' },
          { title: 'أنشئ صفك الأول', body: 'اختر اسماً (مثل "خامس ب إنجليزي")، المرحلة الدراسية، ومجموعة المفردات التي تدرّسها: Set 1, 2, 3 أو قائمتك الخاصة.' },
          { title: 'شارك رمز الصف (6 أرقام) مع طلابك', body: 'يدخلون من نفس vocaband.com على أجهزتهم، يكتبون الرمز، يختارون أسماءهم من قائمة الصف. بدون إيميل وبدون كلمة سر.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'نصيحة', body: 'يمكنك أيضاً السماح للطلاب بالانضمام عبر **رمز QR** بدلاً من كتابة الرمز. اضغط "عرض QR" على بطاقة الصف ووجّه العارض إلى الحائط — كل الصف يدخل خلال 5 ثوانٍ.' },
        { type: 'screenshot', tagLabel: 'لقطة شاشة', caption: 'لوحة المعلم تعرض بطاقة الصف، رمز الدخول وقائمة الطلاب' },
      ],
    },
    {
      heading: '2 · إنشاء المهام',
      emoji: '📚',
      intro: '**المهمة** هي قائمة كلمات اخترتها مع أنماط الألعاب المسموح للطلاب باستخدامها. يمكن تشغيل عدة مهام في وقت واحد.',
      blocks: [
        { type: 'h3', text: 'ثلاث طرق لاختيار الكلمات' },
        { type: 'ul', items: [
          '**من قائمة وزارة التربية** — اختر Set 1, 2 أو 3 وعلّم الكلمات. معظم المعلمين يبدأون من هنا.',
          '**قائمة خاصة (كتابة)** — الصق 10–30 كلمة من عندك. الترجمة والصوت يُنشآن تلقائياً.',
          '**قائمة خاصة (صورة)** — صوّر قائمة مطبوعة وسيقرأها Vocaband (OCR).',
        ]},
        { type: 'h3', text: 'اختر أنماط اللعب' },
        { type: 'p', text: 'في كل مهمة تختار أيّاً من الـ10+ أنماط متاح للطلاب. ابدأ بنمطين أو ثلاثة في الأسبوع الأول، يمكنك دائماً إضافة المزيد.' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'ترى الكلمة بالعبرية/العربية وتختار المعنى الإنجليزي من بين أربعة خيارات.' },
          { name: 'Listening', desc: 'تسمع الكلمة وتختار الكتابة الصحيحة.' },
          { name: 'Spelling', desc: 'تسمع الكلمة وتكتبها حرفاً بحرف.' },
          { name: 'Matching', desc: 'تسحب من الإنجليزية إلى الترجمة العبرية/العربية.' },
          { name: 'Memory Flip', desc: 'تقلب أزواج البطاقات لمطابقة الترجمات.' },
          { name: 'Sentence Builder', desc: 'تسحب كلمات مبعثرة لبناء جملة حقيقية.' },
        ]},
        { type: 'callout', tag: 'info', label: 'حجم المكتبة', body: 'يحتوي Vocaband على نحو **6,500 كلمة منهاج** مع تسجيل صوتي بالإنجليزية والعبرية والعربية. الكلمات التي تضيفها بنفسك يولَّد لها صوت تلقائياً.' },
      ],
    },
    {
      heading: '3 · التحدي المباشر والتحليلات',
      emoji: '🏆',
      intro: 'التحدي المباشر يحوّل عارض الصف إلى لوحة نتائج بينما يلعب الجميع على نفس الكلمات في وقت واحد. مثالي لإحماء 10 دقائق أو لإنهاء وحدة دراسية.',
      blocks: [
        { type: 'steps', items: [
          { title: 'اختر قائمة كلمات', body: 'المهمة الحالية أو أي قائمة أنشأتها.' },
          { title: 'اعرض رمز الغرفة', body: 'يعرض Vocaband رمز QR كبيراً ورمزاً من 6 أرقام. يدخل الطلاب بالمسح أو بالكتابة.' },
          { title: 'ابدأ الجولة', body: 'الجميع يتسابق على نفس الأسئلة. تتحدث لوحة النتائج بعد كل كلمة — الثلاثة الأوائل يحصلون على منصة تتويج.' },
        ]},
        { type: 'h3', text: 'ماذا ترى بعد الحصة' },
        { type: 'stats', items: [
          { big: 'XP', label: 'لكل طالب' },
          { big: '🔥', label: 'سلسلة الأيام' },
          { big: '%', label: 'دقة كل كلمة' },
        ]},
        { type: 'p', text: 'لوحة المعلم تُظهر أي **كلمات لا تزال صعبة** لكل طالب، ومن **يتأخر**، ومن **في سلسلة**. استخدم العرض حسب الكلمة لتخطيط تدريب مركز لخمس دقائق.' },
        { type: 'callout', tag: 'tip', label: 'نصيحة', body: 'رتّب الصف حسب "الكلمات الخاطئة" مرة في الأسبوع. الأسماء الـ3–5 الأولى هم الطلاب الذين يحتاجون دقيقة فردية — وليس الصف كاملاً.' },
      ],
    },
    {
      heading: '4 · نصائح، حل المشكلات والدعم',
      emoji: '💡',
      intro: 'تفاصيل صغيرة تجعل الأسبوع الثاني أسهل بكثير من الأول.',
      blocks: [
        { type: 'h3', text: 'إدارة الصف' },
        { type: 'ul', items: [
          'ابدأ المهمة الأولى بـ**10 كلمات** لا 30. الثقة قبل الكمية.',
          '**تحدٍّ مباشر لخمس دقائق** في بداية الحصة إحماء رائع — الطلاب يأتون مبكراً.',
          'دع الطلاب **يختارون شخصياتهم** في أول دقيقتين. الشعور بالملكية مهم.',
          'النجوم والسلاسل والصندوق اليومي موجودة لتجعل التدريب يشبه اللعبة — **ليس** عليك إدخالها في العلامات.',
        ]},
        { type: 'h3', text: 'أسئلة شائعة' },
        { type: 'table', headers: ['الحالة', 'ماذا تفعل'], rows: [
          ['طالب نسي إلى أي صف انضم', 'اسأل اسمه — يظهر تحت "الطلاب" في بطاقة الصف وأعد إرسال رابط الانضمام.'],
          ['الصوت لا يعمل', 'تحقق من مستوى الصوت ومن أن التبويب ليس صامتاً. على iPad اضغط الشاشة مرة للسماح بالصوت.'],
          ['طالب يقول إن الترجمة خاطئة', 'افتح الكلمة في لوحتك واضغط "اقتراح تعديل" — يصل التنبيه للفريق. الكلمات الخاصة قابلة للتعديل مباشرة.'],
          ['معلمان يشاركان صفاً واحداً', 'أضف المعلم الثاني عبر الإعدادات ← معلمون مشاركون. لكليكما صلاحيات تحرير كاملة.'],
        ]},
        { type: 'callout', tag: 'info', label: 'تحتاج مساعدة؟', body: 'راسلنا على **contact@vocaband.com** أو من الدردشة داخل لوحة المعلم. الرد خلال يوم عمل واحد بالإنجليزية أو العبرية أو العربية.' },
      ],
    },
  ],
};

const ru = {
  cover: {
    kind: 'Руководство для учителя',
    code: 'TG · v1',
    title: 'Руководство для учителя',
    strap: 'Всё, что нужно, чтобы вести Vocaband в вашем классе.',
    sub: 'Практический обзор, написанный специально для учителей английского в израильских школах. Рассчитан на одно прочтение, а затем держится открытым во вкладке всю первую учебную неделю.',
    pills: ['4–9 классы', 'Поддержка иврита и арабского', 'Set 1 / Set 2 / Set 3 + свои списки', 'Установка не нужна'],
    footerNote: 'vocaband.com/for-teachers',
  },
  pages: [
    {
      heading: '1 · Вход и создание класса',
      emoji: '🚪',
      intro: 'Это делается только один раз. После первого входа всё сохраняется для следующих сессий.',
      blocks: [
        { type: 'steps', items: [
          { title: 'Откройте vocaband.com в любом браузере', body: 'Никакой установки, расширений или магазина приложений. Работает на школьном ПК, Chromebook, планшете или телефоне.' },
          { title: 'Нажмите «Вход для учителей» и войдите через Google', body: 'Большинство израильских школ используют Google Workspace, поэтому это одно нажатие. Если ваша школа на Microsoft 365 — выберите вход через Microsoft. Пароль помнить не нужно.' },
          { title: 'Создайте первый класс', body: 'Выберите название (например, «5Б английский»), уровень и набор лексики, по которому преподаёте: Set 1, Set 2, Set 3 или собственный список.' },
          { title: 'Поделитесь с учениками 6-значным кодом класса', body: 'Они заходят с того же vocaband.com со своих устройств, вводят код, выбирают своё имя из списка класса — и готово. Никаких email и паролей.' },
        ]},
        { type: 'callout', tag: 'tip', label: 'Совет', body: 'Можно также позволить ученикам подключаться через **QR-код** вместо ввода кода. Нажмите «Показать QR» на карточке класса и направьте проектор на стену — весь класс заходит за 5 секунд.' },
        { type: 'screenshot', tagLabel: 'Скриншот', caption: 'Панель учителя с карточкой класса, кодом и списком учеников' },
      ],
    },
    {
      heading: '2 · Создание заданий',
      emoji: '📚',
      intro: '**Задание** — это выбранный список слов плюс игровые режимы, которые ученикам разрешено использовать. Одновременно можно держать несколько активных заданий.',
      blocks: [
        { type: 'h3', text: 'Три способа выбрать слова' },
        { type: 'ul', items: [
          '**Из списка Минобразования** — выберите Set 1, Set 2 или Set 3 и отметьте нужные слова. Большинство учителей начинают отсюда.',
          '**Свой список (ввод вручную)** — вставьте 10–30 своих слов. Переводы и аудио создаются автоматически.',
          '**Свой список (фото)** — сфотографируйте печатный список, и Vocaband распознает слова (OCR).',
        ]},
        { type: 'h3', text: 'Выберите режимы' },
        { type: 'p', text: 'В каждом задании можно отметить, какие из более чем 10 режимов доступны ученикам. Начните с малого — двух-трёх режимов хватит на первую неделю. Добавить ещё всегда можно позже.' },
        { type: 'modes', items: [
          { name: 'Classic', desc: 'Видишь слово на иврите/арабском, выбери правильный английский перевод из четырёх вариантов.' },
          { name: 'Listening', desc: 'Услышь слово и выбери его английское написание.' },
          { name: 'Spelling', desc: 'Услышь слово и напечатай его по буквам.' },
          { name: 'Matching', desc: 'Перетащи английское к переводу на иврит/арабский.' },
          { name: 'Memory Flip', desc: 'Переворачивай пары карточек, чтобы сопоставить переводы.' },
          { name: 'Sentence Builder', desc: 'Перетаскивай перемешанные слова, чтобы собрать настоящее предложение.' },
        ]},
        { type: 'callout', tag: 'info', label: 'Масштаб', body: 'В Vocaband около **6 500 слов учебной программы** с озвучкой на английском, иврите и арабском. К словам, которые добавляете вы, аудио генерируется автоматически — записывать ничего не нужно.' },
      ],
    },
    {
      heading: '3 · Live Challenge и аналитика',
      emoji: '🏆',
      intro: 'Live Challenge превращает ваш проектор в табло, пока класс одновременно играет с одним и тем же набором слов. Подходит для 10-минутной разминки или праздничного завершения темы.',
      blocks: [
        { type: 'steps', items: [
          { title: 'Выберите список слов', body: 'Текущее задание или любой ваш список.' },
          { title: 'Покажите код комнаты', body: 'Vocaband показывает большой QR-код и 6-значный код. Ученики сканируют или вводят его, чтобы войти.' },
          { title: 'Запустите раунд', body: 'Все мчатся по одним и тем же вопросам. Табло на большом экране обновляется после каждого слова — у тройки лидеров появляется анимация подиума.' },
        ]},
        { type: 'h3', text: 'Что вы видите после урока' },
        { type: 'stats', items: [
          { big: 'XP', label: 'на ученика' },
          { big: '🔥', label: 'серии (ежедневная игра)' },
          { big: '%', label: 'точность по слову' },
        ]},
        { type: 'p', text: 'Панель учителя показывает, какие **слова ещё трудные** для каждого ученика, кто **отстаёт**, а кто **в серии**. Используйте вид по словам, чтобы спланировать следующую 5-минутную отработку.' },
        { type: 'callout', tag: 'tip', label: 'Совет', body: 'Раз в неделю сортируйте класс по «всё ещё неправильным словам». Верхние 3–5 имён — это ученики, которым нужна минута внимания один на один, а не весь класс, замедленный ради них.' },
      ],
    },
    {
      heading: '4 · Советы, диагностика и поддержка',
      emoji: '💡',
      intro: 'Мелочи, которые делают вторую неделю заметно ровнее первой.',
      blocks: [
        { type: 'h3', text: 'Ход урока' },
        { type: 'ul', items: [
          'В первом задании начните с **10 слов**, а не с 30. Сначала уверенность.',
          '**5-минутный Live Challenge** в начале урока — отличная разминка: ученики приходят пораньше, чтобы успеть.',
          'Дайте ученикам **выбрать аватара** в первые 2 минуты. Ощущение собственности важно.',
          'Звёзды, серии и ежедневный сундук существуют, чтобы практика ощущалась как игра — учитывать их в оценках **не нужно**.',
        ]},
        { type: 'h3', text: 'Частые вопросы' },
        { type: 'table', headers: ['Ситуация', 'Что делать'], rows: [
          ['Ученик забыл, в какой класс зашёл', 'Спросите его имя — он есть в «Учениках» на карточке класса, и можно переслать ему ссылку для входа.'],
          ['Не воспроизводится звук', 'Проверьте громкость устройства и что вкладка браузера не на mute. На iPad нажмите по экрану один раз, чтобы разрешить аудио.'],
          ['Ученик говорит, что перевод неверный', 'Откройте слово в панели и нажмите «Предложить исправление» — команда получит уведомление. Свои слова можно править напрямую.'],
          ['Два учителя ведут один класс', 'Добавьте второго через Настройки → Соучителя. У обоих полные права редактирования.'],
        ]},
        { type: 'callout', tag: 'info', label: 'Нужна помощь?', body: 'Пишите на **contact@vocaband.com** или в чат прямо из панели учителя. Отвечаем в течение одного рабочего дня на английском, иврите или арабском.' },
      ],
    },
  ],
};

export const teacherGuide = { key: 'teacher-guide', emoji: '📘', en, he, ar, ru };
