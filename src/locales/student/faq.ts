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
    a1: "Sign in as a teacher, create a class and use Add students to share its link or code.",
    q2: "Is Vocaband free?",
    a2: "The free plan includes one class and up to 30 students. See the current plans for more classes and teaching features.",
    q3: "What vocabulary sets are available?",
    a3: "We offer three CEFR-aligned sets: Set 1 (Foundation, ~2000 words), Set 2 (Intermediate, ~2500 words), and Set 3 (Academic, ~3000 words). You can also upload custom word lists.",
    q4: "Can I add my own vocabulary words?",
    a4: "You can type or paste a word list. The plan details show which plans include photo scanning and AI-generated examples.",
    q5: "How does auto-grading work?",
    a5: "Every practice session is graded instantly. Students get immediate feedback, and you see a summary of class performance in your dashboard. No worksheets to collect!",
    q6: "Does Vocaband work offline?",
    a6: "Some activities can work offline after they have loaded. Sign-in, new assignments and live games require a connection.",
    studentSection: "For Students",
    q7: "How do I join a class?",
    a7: "Open your teacher’s link or choose Enter my class and type the class code. Then use your personal PIN.",
    q8: "What are XP and streaks?",
    a8: "XP points show your progress — earn them by playing games and getting answers right. Streaks reward daily practice — keep the flame burning for bonus rewards!",
    q9: "What game modes can I play?",
    a9: "Your teacher chooses the modes available for each assignment. You may see modes such as Classic, Listen, Spell, Match and Flashcards.",
    q10: "Can I play alone without a class?",
    a10: "Try the public demo or use a game code from your teacher to join a live game.",
    generalSection: "General",
    q11: "What devices work with Vocaband?",
    a11: "Any device with a web browser — phones, tablets, laptops, or desktops. Works on iOS, Android, Mac, Windows, and Chromebook.",
    q12: "Is Vocaband available in Hebrew and Arabic?",
    a12: "You can choose English, Hebrew or Arabic in the language menu. Available translations vary by activity.",
    q13: "How much does it cost?",
    a13: "Vocaband offers a free plan, individual teacher plans and a school team license. The current prices and limits are in Plans and pricing.",
    cta: "Still have questions?",
    ctaButton: "Contact Support",
  },

  he: {
    backButton: "חזרה",
    title: "שאלות נפוצות",
    subtitle: "הכל שצריך לדעת על Vocaband",

    teacherSection: "למורים",
    q1: "איך יוצרים כיתה?",
    a1: "היכנסו לחשבון המורה, צרו כיתה ושתפו קישור או קוד דרך «הוספת תלמידים».",
    q2: "האם Vocaband בחינם?",
    a2: "המסלול החינמי כולל כיתה אחת ועד 30 תלמידים. במסלולים בתשלום יש אפשרות להוסיף כיתות וכלי הוראה.",
    q3: "אילו סטים של אוצר מילים זמינים?",
    a3: "אנחנו מציעים שלושה סטים מותאמים ל-CEFR: סט 1 (יסודות, ~2000 מילים), סט 2 (בינוני, ~2500 מילים), וסט 3 (אקדמי, ~3000 מילים). אפשר גם להעלות רשימות מילים מותאמות אישית.",
    q4: "אפשר להוסיף מילים משלי?",
    a4: "אפשר להקליד או להדביק רשימת מילים. במחירון מופיע באילו מסלולים יש סריקת תמונות ויצירת דוגמאות ב־AI.",
    q5: "איך הדירוג האוטומטי עובד?",
    a5: "כל אימון מדורג באופן מיידי. תלמידים מקבלים משוב מיידי, ואתם רואים סיכום של ביצועי הכיתה בלוח הבקרה שלכם. בלי דפי עבודה לאסוף!",
    q6: "האם Vocaband עובד בלי אינטרנט?",
    a6: "חלק מהפעילויות שכבר נטענו זמינות גם בלי אינטרנט. לכניסה, לטעינת משימות חדשות ולמשחק חי נדרש חיבור.",
    studentSection: "לתלמידים",
    q7: "איך מצטרפים לכיתה?",
    a7: "פתחו את הקישור מהמורה, או בחרו «כניסה לכיתה שלי» והזינו את קוד הכיתה. לאחר מכן הזינו את הקוד האישי.",
    q8: "מה זה XP ורצפים?",
    a8: "נקודות XP מראות את ההתקדמות שלכם — מרוויחים אותן על ידי משחק ותשובות נכונות. רצפים נותנים פרס על אימון יומי — שומרים על ההשפעה בוערת ומקבלים פרסים!",
    q9: "אילו מצבי משחק אפשר לשחק?",
    a9: "המורה בוחר את מצבי המשחק לכל משימה. בין המצבים יש קלאסי, הקשבה, איות, התאמה וכרטיסיות.",
    q10: "אפשר לשחק לבד בלי כיתה?",
    a10: "אפשר לנסות את ההדגמה או להצטרף למשחק חי באמצעות קוד משחק מהמורה.",
    generalSection: "כללי",
    q11: "אילו מכשירים עובדים עם Vocaband?",
    a11: "כל מכשיר עם דפדפן — טלפונים, טאבלטים, מחשבים ניידים, או מחשבים שולחניים. עובד על iOS, Android, Mac, Windows, ו-Chromebook.",
    q12: "האם Vocaband זמין בעברית וערבית?",
    a12: "אפשר לבחור אנגלית, עברית או ערבית בתפריט השפה. התרגומים הזמינים תלויים בפעילות.",
    q13: "כמה זה עולה?",
    a13: "יש מסלול חינמי, מסלולים אישיים למורים ורישיון לצוות בית ספר. המחירים והמכסות מופיעים ב«מסלולים ומחירים».",
    cta: "עדיין יש לכם שאלות?",
    ctaButton: "צרו קשר",
  },

  ar: {
    backButton: "رجوع",
    title: "الأسئلة الشائعة",
    subtitle: "كل ما تحتاج معرفته عن Vocaband",

    teacherSection: "للمعلمين",
    q1: "كيف أنشئ فصلاً؟",
    a1: "سجّل الدخول كمعلّم، وأنشئ صفًا، ثم شارك رابطه أو رمزه عبر إضافة الطلاب.",
    q2: "هل Vocaband مجاني؟",
    a2: "تشمل الخطة المجانية صفًا واحدًا وحتى 30 طالبًا. تتيح الخطط المدفوعة إضافة صفوف وأدوات تعليمية.",
    q3: "ما هي مجموعات المفردات المتاحة؟",
    a3: "نقدم ثلاث مجموعات متوافقة مع CEFR: المجموعة 1 (الأساسيات، ~2000 كلمة)، والمجموعة 2 (المتوسط، ~2500 كلمة)، والمجموعة 3 (الأكاديمي، ~3000 كلمة). يمكنك أيضًا رفع قوائم كلمات مخصصة.",
    q4: "هل يمكنني إضافة كلماتي الخاصة؟",
    a4: "يمكنك كتابة قائمة الكلمات أو لصقها. تبيّن صفحة الخطط أين يتوفّر مسح الصور وإنشاء أمثلة بالذكاء الاصطناعي.",
    q5: "كيف يعمل التصحيح التلقائي؟",
    a5: "كل جلسة ممارسة تُصحَّح فورًا. الطلاب يحصلون على ملاحظات فورية، وأنت ترى ملخص أداء الفصل في لوحة التحكم. لا أوراق عمل لجمعها!",
    q6: "هل يعمل Vocaband بدون إنترنت؟",
    a6: "تعمل بعض الأنشطة المحمّلة مسبقًا دون اتصال. يتطلّب تسجيل الدخول وتحميل الواجبات الجديدة واللعب المباشر اتصالًا.",
    studentSection: "للطلاب",
    q7: "كيف أنضم إلى فصل؟",
    a7: "افتح رابط المعلّم، أو اختر دخول صفي وأدخل رمز الصف، ثم استخدم رمز PIN الشخصي.",
    q8: "ما هي النقاط والسلاسل؟",
    a8: "نقاط XP تُظهر تقدمك — اربحها باللعب والإجابة الصحيحة. السلاسل تكافئ الممارسة اليومية — أبقِ الشعلة مشتعلة للحصول على جوائز إضافية!",
    q9: "ما هي الألعاب المتاحة؟",
    a9: "يختار المعلّم أوضاع اللعب لكل واجب. منها الوضع الكلاسيكي والاستماع والتهجئة والمطابقة والبطاقات.",
    q10: "هل يمكنني اللعب وحدي بدون فصل؟",
    a10: "جرّب العرض العام أو استخدم رمز لعبة من المعلّم للانضمام إلى لعبة مباشرة.",
    generalSection: "عام",
    q11: "ما الأجهزة التي تعمل مع Vocaband؟",
    a11: "أي جهاز مع متصفح — هواتف، أجهزة لوحية، أجهزة كمبيوتر محمولة، أو أجهزة كمبيوتر سطح المكتب. يعمل على iOS وAndroid وMac وWindows وChromebook.",
    q12: "هل Vocaband متوفر بالعبرية والعربية؟",
    a12: "يمكنك اختيار الإنجليزية أو العبرية أو العربية من قائمة اللغة. تختلف الترجمات بحسب النشاط.",
    q13: "كم يكلف؟",
    a13: "توجد خطة مجانية وخطط فردية للمعلّمين وترخيص لطاقم المدرسة. تعرض صفحة الخطط الأسعار والسعات.",
    cta: "لا تزال لديك أسئلة؟",
    ctaButton: "اتصل بالدعم",
  },

};
