import type { Language } from "../../hooks/useLanguage";

export interface FaqT {
  backButton: string;
  title: string;
  subtitle: string;

  // Teacher questions
  teacherSection: string;
  q1: string;
  a1: string;
  q2: string;
  a2: string;
  q3: string;
  a3: string;
  q4: string;
  a4: string;
  q5: string;
  a5: string;
  q6: string;
  a6: string;

  // Student questions
  studentSection: string;
  q7: string;
  a7: string;
  q8: string;
  a8: string;
  q9: string;
  a9: string;
  q10: string;
  a10: string;

  // General questions
  generalSection: string;
  q11: string;
  a11: string;
  q12: string;
  a12: string;
  q13: string;
  a13: string;

  cta: string;
  ctaButton: string;
}

export const faqT: Record<Language, FaqT> = {
  en: {
    backButton: "Back",
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about Vocaband",

    teacherSection: "For Teachers",
    q1: "How do I create a class?",
    a1: "Click 'Teacher Login', sign in with Google, then click 'Create Class'. Share the 6-digit code with your students — they're in!",
    q2: "Is Vocaband free?",
    a2: "Yes! Teachers can create unlimited classes and assignments for free. Premium features coming soon for schools wanting advanced analytics.",
    q3: "What vocabulary sets are available?",
    a3: "We offer three CEFR-aligned sets: Set 1 (Foundation, ~2000 words), Set 2 (Intermediate, ~2500 words), and Set 3 (Academic, ~3000 words). You can also upload custom word lists.",
    q4: "Can I add my own vocabulary words?",
    a4: "Absolutely! Type your list, snap a photo of any wordlist, or paste content — we'll extract the words automatically. AI generates example sentences for each word.",
    q5: "How does auto-grading work?",
    a5: "Every practice session is graded instantly. Students get immediate feedback, and you see a summary of class performance in your dashboard. No worksheets to collect!",
    q6: "Does Vocaband work offline?",
    a6: "Students can practice in offline mode — progress syncs when they reconnect. Great for classrooms with unreliable internet!",

    studentSection: "For Students",
    q7: "How do I join a class?",
    a7: "Get your class code from your teacher, open Vocaband, click 'Start Learning', and enter the 6-digit code. You're in!",
    q8: "What are XP and streaks?",
    a8: "XP points show your progress — earn them by playing games and getting answers right. Streaks reward daily practice — keep the flame burning for bonus rewards!",
    q9: "What game modes can I play?",
    a9: "We have 11 different game modes: Classic, Listen, Spell, Match, True/False, Flashcards, Scramble, Reverse, Letters, Sentence Builder, and Fill-in-the-Blank. Find your favorite!",
    q10: "Can I play alone without a class?",
    a10: "Yes! Use Quick Play to join live games without signing up, or create your own account to practice solo and track your progress.",

    generalSection: "General",
    q11: "What devices work with Vocaband?",
    a11: "Any device with a web browser — phones, tablets, laptops, or desktops. Works on iOS, Android, Mac, Windows, and Chromebook.",
    q12: "Is Vocaband available in Hebrew and Arabic?",
    a12: "Yes! The entire app is translated into Hebrew and Arabic. Every word includes native translations, and RTL layouts work perfectly.",
    q13: "How much does it cost?",
    a13: "For individual teachers: completely free. School plans with advanced features and priority support are coming soon. Contact us for details!",

    cta: "Still have questions?",
    ctaButton: "Contact Support",
  },

  he: {
    backButton: "חזרה",
    title: "שאלות נפוצות",
    subtitle: "הכל שצריך לדעת על Vocaband",

    teacherSection: "למורים",
    q1: "איך יוצרים כיתה?",
    a1: "לוחצים על 'כניסת מורים', נכנסים עם Google, ואז לוחצים 'צור כיתה'. משתפים את הקוד בן 6 הספרות עם התלמידים — והם בפנים!",
    q2: "האם Vocaband בחינם?",
    a2: "כן! מורים יכולים ליצור כיתות ומטלות בלי הגבלה — בחינם. פיצ'רים פרימיום יגיעו בקרוב לבתי ספר שרוצים ניתוחים מתקדמים.",
    q3: "אילו סטים של אוצר מילים זמינים?",
    a3: "אנחנו מציעים שלושה סטים מותאמים ל-CEFR: סט 1 (יסודות, ~2000 מילים), סט 2 (בינוני, ~2500 מילים), וסט 3 (אקדמי, ~3000 מילים). אפשר גם להעלות רשימות מילים מותאמות אישית.",
    q4: "אפשר להוסיף מילים משלי?",
    a4: "בטח! מקלידים רשימה, מצלמים תמונה של כל רשימת מילים, או מדביקים תוכן — אנחנו חולצים את המילים אוטומטית. בינה מלאכותית יוצרת משפטים לדוגמה לכל מילה.",
    q5: "איך הדירוג האוטומטי עובד?",
    a5: "כל אימון מדורג באופן מיידי. תלמידים מקבלים משוב מיידי, ואתם רואים סיכום של ביצועי הכיתה בלוח הבקרה שלכם. בלי דפי עבודה לאסוף!",
    q6: "האם Vocaband עובד בלי אינטרנט?",
    a6: "תלמידים יכולים להתאמן במצב לא מקוון — ההתקדמות מסונכרנת כשחוזרים להתחבר. מצוין לכיתות עם אינטרנט לא יציב!",

    studentSection: "לתלמידים",
    q7: "איך מצטרפים לכיתה?",
    a7: "מקבלים את קוד הכיתה מהמורה, פותחים את Vocaband, לוחצים על 'התחילו ללמוד', ומקלידים את הקוד בן 6 הספרות. יאללה!",
    q8: "מה זה XP ורצפים?",
    a8: "נקודות XP מראות את ההתקדמות שלכם — מרוויחים אותן על ידי משחק ותשובות נכונות. רצפים נותנים פרס על אימון יומי — שומרים על ההשפעה בוערת ומקבלים פרסים!",
    q9: "אילו מצבי משחק אפשר לשחק?",
    a9: "יש לנו 11 מצבי משחק שונים: קלאסי, הקשבה, איות, התאמה, נכון/לא נכון, כרטיסיות, ערבוב, הפוך, אותיות, בונה משפטים, ומלא חסר. מצאו את המועדף!",
    q10: "אפשר לשחק לבד בלי כיתה?",
    a10: "כן! משתמשים במשחק מהיר כדי להצטרף למשחקים חיים בלי הרשמה, או יוצרים חשבון כדי להתאמן לבד ולעקוב אחר ההתקדמות.",

    generalSection: "כללי",
    q11: "אילו מכשירים עובדים עם Vocaband?",
    a11: "כל מכשיר עם דפדפן — טלפונים, טאבלטים, מחשבים ניידים, או מחשבים שולחניים. עובד על iOS, Android, Mac, Windows, ו-Chromebook.",
    q12: "האם Vocaband זמין בעברית וערבית?",
    a12: "כן! כל האפליקציה מתורגמת לעברית וערבית. כל מילה כוללת תרגומים מקוריים, ופריסות RTL עובדות בצורה מושלמת.",
    q13: "כמה זה עולה?",
    a13: "למורים פרטיים: לגמרי בחינם. תכניות בתי ספר עם פיצ'רים מתקדמים ותמיכה בעדיפות מגיעות בקרוב. צרו קשר לפרטים!",

    cta: "עדיין יש לכם שאלות?",
    ctaButton: "צרו קשר",
  },

  ar: {
    backButton: "رجوع",
    title: "الأسئلة الشائعة",
    subtitle: "كل ما تحتاج معرفته عن Vocaband",

    teacherSection: "للمعلمين",
    q1: "كيف أنشئ فصلاً؟",
    a1: "اضغط 'دخول المعلمين', سجّل الدخول بحساب Google، ثم اضغط 'إنشاء فصل'. شارك الرمز المكون من 6 أرقام مع طلابك — وهم بالداخل!",
    q2: "هل Vocaband مجاني؟",
    a2: "نعم! يمكن للمعلمين إنشاء فصول دراسية ومهام غير محدودة مجانًا. ميزات Premium قريبة للمدارس التي تريد تحليلات متقدمة.",
    q3: "ما هي مجموعات المفردات المتاحة؟",
    a3: "نقدم ثلاث مجموعات متوافقة مع CEFR: المجموعة 1 (الأساسيات، ~2000 كلمة)، والمجموعة 2 (المتوسط، ~2500 كلمة)، والمجموعة 3 (الأكاديمي، ~3000 كلمة). يمكنك أيضًا رفع قوائم كلمات مخصصة.",
    q4: "هل يمكنني إضافة كلماتي الخاصة؟",
    a4: "بالتأكيد! اكتب قائمتك، التقط صورة لأي قائمة كلمات، أو الصق المحتوى — سنستخرج الكلمات تلقائيًا. الذكاء الاصطناعي يُنشئ جملًا مثالًا لكل كلمة.",
    q5: "كيف يعمل التصحيح التلقائي؟",
    a5: "كل جلسة ممارسة تُصحَّح فورًا. الطلاب يحصلون على ملاحظات فورية، وأنت ترى ملخص أداء الفصل في لوحة التحكم. لا أوراق عمل لجمعها!",
    q6: "هل يعمل Vocaband بدون إنترنت؟",
    a6: "الطلاب يمكنهم الممارسة في وضع عدم الاتصال — التقدم يُزامن عند إعادة الاتصال. رائع للفصول ذات الإنترنت غير المستقر!",

    studentSection: "للطلاب",
    q7: "كيف أنضم إلى فصل؟",
    a7: "احصل على رمز فصلك من معلمك، افتح Vocaband، اضغط 'ابدأ التعلم'، وأدخل الرمز المكون من 6 أرقام. أنت بالداخل!",
    q8: "ما هي النقاط والسلاسل؟",
    a8: "نقاط XP تُظهر تقدمك — اربحها باللعب والإجابة الصحيحة. السلاسل تكافئ الممارسة اليومية — أبقِ الشعلة مشتعلة للحصول على جوائز إضافية!",
    q9: "ما هي الألعاب المتاحة؟",
    a9: "لدينا 11 وضع لعب مختلف: كلاسيكي، استماع، تهجئة، تطابق، صحيح/خطأ، بطاقات، خلط، عكسي، حروف، بناء الجمل، واملأ الفراغ. اعثر على المفضل!",
    q10: "هل يمكنني اللعب وحدي بدون فصل؟",
    a10: "نعم! استخدم اللعب السريع للانضمام إلى ألعاب مباشرة بدون تسجيل، أو أنشئ حسابًا للتدريب وحيد ومتابعة تقدمك.",

    generalSection: "عام",
    q11: "ما الأجهزة التي تعمل مع Vocaband؟",
    a11: "أي جهاز مع متصفح — هواتف، أجهزة لوحية، أجهزة كمبيوتر محمولة، أو أجهزة كمبيوتر سطح المكتب. يعمل على iOS وAndroid وMac وWindows وChromebook.",
    q12: "هل Vocaband متوفر بالعبرية والعربية؟",
    a12: "نعم! التطبيق بالكامل مُترجم إلى العبرية والعربية. كل كلمة تتضمن ترجمات أصلية، وتخطيطات RTL تعمل بشكل مثالي.",
    q13: "كم يكلف؟",
    a13: "للمعلمين الأفراد: مجاني تمامًا. خطط المدارس بميزات متقدمة ودعم أولوي قريبة. اتصل بنا للتفاصيل!",

    cta: "لا تزال لديك أسئلة؟",
    ctaButton: "اتصل بالدعم",
  },
};
