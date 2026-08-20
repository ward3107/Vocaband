/**
 * Strings for the teacher dashboard "Start here" experience:
 *
 *  - StartHerePanel — the intent-based launcher at the top of the
 *    English dashboard ("What do you want to do?") with four
 *    plain-language goals that expand into a short explainer + the
 *    buttons that take the teacher to the right tool.
 *  - HelpAskBox — the "ask me anything" box inside that same card. A
 *    typed / spoken question is answered by the Gemini-backed assistant
 *    (with an offline keyword fallback that also covers "how do students
 *    log in?" and "what's the difference between the games?").
 *
 * Answers are written as multi-line, step-by-step text (rendered with
 * `whitespace-pre-line`) so a teacher who isn't "techy" gets a concrete
 * walkthrough of the real app flow, not a vague sentence. Hebrew +
 * Arabic follow the same conventions as the rest of src/locales/teacher;
 * ru mirrors en (same fallback the other teacher locales use).
 */
import type { Language } from "../../hooks/useLanguage";

export interface StartHereStrings {
  /** Launcher panel chrome. */
  heading: string;
  sub: string;
  hide: string;
  show: string;

  /** Goal: play a game now. */
  playTitle: string;
  playBlurb: string;
  playExplainer: string;
  playLiveBtn: string;

  /** Goal: set up my class & students. */
  setupTitle: string;
  setupBlurb: string;
  setupExplainer: string;
  setupCreateBtn: string;
  setupClassesBtn: string;

  /** Goal: give homework or a worksheet. */
  homeworkTitle: string;
  homeworkBlurb: string;
  homeworkExplainer: string;
  homeworkClassesBtn: string;
  homeworkCreateBtn: string;

  /** Goal: see how students are doing. */
  progressTitle: string;
  progressBlurb: string;
  progressExplainer: string;
  progressClassroomBtn: string;
  progressApprovalsBtn: string;

  /** Guided helper chrome. */
  helperFab: string;
  helperTitle: string;
  helperSub: string;
  helperInputPlaceholder: string;
  helperMicLabel: string;
  helperMicLangLabel: string;
  helperListening: string;
  helperNoMatch: string;
  helperClose: string;
  helperBack: string;
  /** Tiny prompt shown above the question list. */
  helperPickPrompt: string;

  /** Short one/two-word labels for the shortcut chips (the long
   *  titles/questions above get truncated in the small chip grid). */
  chipPlay: string;
  chipGames: string;
  chipSetup: string;
  chipLogin: string;
  chipHomework: string;
  chipProgress: string;
  chipApprovals: string;

  /** Helper question labels. */
  qPlay: string;
  qSetup: string;
  qLogin: string;
  qHomework: string;
  qProgress: string;
  qGamesDiff: string;

  /** Helper answers that don't reuse a goal explainer. */
  aLogin: string;
  aGamesDiff: string;
}

const en: StartHereStrings = {
  heading: "What do you want to do?",
  sub: "Ask me anything, or tap a goal — I'll take you straight to the right tool.",
  hide: "Hide",
  show: "What do you want to do?",

  playTitle: "Play a game now",
  playBlurb: "Run a fun activity with your class",
  playExplainer:
    "There are two kinds of game:\n\n🟣 Live games (Quick Play, Category Race, Speed Round, Word Hunt Arena) — every student plays on their own phone and joins by scanning a QR code. No login. Great for a fun, competitive class activity.\n\n🟢 In-room tools (Class Show, Hot Seat, Vocab Wheel) — you run it on one screen or the projector and the whole class plays together. Best when students don't have phones.\n\nTap a button below and I'll jump you to the right row.",
  playLiveBtn: "Show live games",

  setupTitle: "Set up my class & students",
  setupBlurb: "Create a class and get students in",
  setupExplainer:
    "Two quick steps to get your students playing:\n\n1. Create a class — tap “Create a class”, give it a name, and you'll get a short class code.\n\n2. Get students in — share the class code, show the QR code / send the join link (tap Share on the class card), or hand each student a name + PIN.\n\nAnyone who signs up with your code waits under “Approvals” until you let them in.",
  setupCreateBtn: "Create a class",
  setupClassesBtn: "See my classes",

  homeworkTitle: "Give homework or a worksheet",
  homeworkBlurb: "Assign practice or print a sheet",
  homeworkExplainer:
    "Two ways to set work:\n\n1. On phones — open a class, tap “New activity”, pick your words and game modes, add an optional due date, and assign. Students play it on their phones.\n\n2. On paper — pick your words and choose “Worksheet” to print or save a PDF (word lists, scrambles, fill-in-the-blank, matching…).\n\nNo class yet? Create one first.",
  homeworkClassesBtn: "Go to my classes",
  homeworkCreateBtn: "Create a class first",

  progressTitle: "See how students are doing",
  progressBlurb: "Scores, progress and who needs help",
  progressExplainer:
    "Open “Classroom” to see everything about a class:\n\n• Today — who's active this week, average score, recent plays.\n• Students — tap a student for their strengths and the words they struggle with.\n• Reports — weekly trends plus CSV / PDF export.\n\nA red badge on “Approvals” means students are waiting for you to let them in.",
  progressClassroomBtn: "Open Classroom",
  progressApprovalsBtn: "Open Approvals",

  helperFab: "Need help?",
  helperTitle: "How can I help?",
  helperSub: "Ask me anything, or pick a question below.",
  helperInputPlaceholder: "Type your question…",
  helperMicLabel: "Speak",
  helperMicLangLabel: "Choose the language you'll speak",
  helperListening: "Listening…",
  helperNoMatch: "I didn't quite catch that. Here's what I can help with:",
  helperClose: "Close",
  helperBack: "Back to questions",
  helperPickPrompt: "Popular questions",

  chipPlay: "Play a game",
  chipGames: "Compare games",
  chipSetup: "Set up class",
  chipLogin: "Student login",
  chipHomework: "Homework",
  chipProgress: "Student progress",
  chipApprovals: "Approvals",

  qPlay: "I want to play a game",
  qSetup: "How do I add my students?",
  qLogin: "How do students log in?",
  qHomework: "I want to give homework or a worksheet",
  qProgress: "How are my students doing?",
  qGamesDiff: "What's the difference between the games?",

  aLogin:
    "Students join your class in three ways — pick whatever's easiest:\n\n1. Class code — they open Vocaband and type the short code on your class card.\n2. QR code or link — tap Share on a class to show a QR code or copy a join link (great for WhatsApp).\n3. Name + PIN — you create each student with a 4-digit PIN they type to log in.\n\nNew students who use your code appear under “Approvals” until you approve them.",
  aGamesDiff:
    "🟣 Live games — Quick Play, Category Race, Speed Round, Word Hunt Arena. Competitive, every student on their own phone, join by QR code, no login. Use these for energy and friendly competition.\n\n🟢 In-room tools — Class Show, Hot Seat, Vocab Wheel. You run them on one screen or the projector and the class plays together. Use these when students don't have phones.\n\nNot sure? Quick Play is the easiest place to start.",
};

const he: StartHereStrings = {
  heading: "מה תרצו לעשות?",
  sub: "שאלו אותי כל דבר, או הקישו על מטרה — ניקח אתכם ישר לכלי הנכון.",
  hide: "הסתר",
  show: "מה תרצו לעשות?",

  playTitle: "לשחק משחק עכשיו",
  playBlurb: "הריצו פעילות כיפית עם הכיתה",
  playExplainer:
    "יש שני סוגים של משחק:\n\n🟣 משחקים חיים (משחק מהיר, מרוץ קטגוריות, סבב מהיר, זירת ציד מילים) — כל תלמיד משחק מהטלפון שלו ומצטרף בסריקת קוד QR. בלי התחברות. מצוין לפעילות כיתתית תחרותית וכיפית.\n\n🟢 כלים לכיתה (Class Show, Hot Seat, גלגל המילים) — אתם מריצים על מסך אחד או על המקרן וכל הכיתה משחקת יחד. הכי טוב כשלתלמידים אין טלפונים.\n\nהקישו על כפתור למטה ואקפיץ אתכם לשורה הנכונה.",
  playLiveBtn: "הצג משחקים חיים",

  setupTitle: "להקים כיתה ותלמידים",
  setupBlurb: "צרו כיתה והכניסו את התלמידים",
  setupExplainer:
    "שני צעדים קצרים כדי שהתלמידים יתחילו לשחק:\n\n1. צרו כיתה — הקישו “צור כיתה”, תנו לה שם, ותקבלו קוד כיתה קצר.\n\n2. הכניסו את התלמידים — שתפו את קוד הכיתה, הציגו את קוד ה-QR / שלחו את קישור ההצטרפות (הקישו “שתף” על כרטיס הכיתה), או חלקו לכל תלמיד שם + קוד PIN.\n\nכל מי שנרשם עם הקוד שלכם ממתין תחת “אישורים” עד שתכניסו אותו.",
  setupCreateBtn: "צור כיתה",
  setupClassesBtn: "הכיתות שלי",

  homeworkTitle: "לתת שיעורי בית או דף עבודה",
  homeworkBlurb: "שייכו תרגול או הדפיסו דף",
  homeworkExplainer:
    "שתי דרכים לתת עבודה:\n\n1. בטלפון — פתחו כיתה, הקישו “פעילות חדשה”, בחרו מילים ומצבי משחק, הוסיפו תאריך יעד (אופציונלי) ושייכו. התלמידים משחקים מהטלפון.\n\n2. על נייר — בחרו מילים ובחרו “דף עבודה” כדי להדפיס או לשמור PDF (רשימות מילים, ערבובים, השלמת חסר, התאמה…).\n\nאין עדיין כיתה? צרו אחת קודם.",
  homeworkClassesBtn: "לכיתות שלי",
  homeworkCreateBtn: "צרו כיתה קודם",

  progressTitle: "לראות איך התלמידים מתקדמים",
  progressBlurb: "ציונים, התקדמות ומי זקוק לעזרה",
  progressExplainer:
    "פתחו “כיתה” כדי לראות הכול על הכיתה:\n\n• היום — מי פעיל השבוע, ציון ממוצע, משחקים אחרונים.\n• תלמידים — הקישו על תלמיד כדי לראות חוזקות ומילים שמאתגרות אותו.\n• דוחות — מגמות שבועיות וייצוא CSV / PDF.\n\nתג אדום על “אישורים” אומר שתלמידים ממתינים שתכניסו אותם.",
  progressClassroomBtn: "פתח כיתה",
  progressApprovalsBtn: "פתח אישורים",

  helperFab: "צריכים עזרה?",
  helperTitle: "איך אפשר לעזור?",
  helperSub: "שאלו אותי כל דבר, או בחרו שאלה למטה.",
  helperInputPlaceholder: "הקלידו שאלה…",
  helperMicLabel: "דברו",
  helperMicLangLabel: "בחרו את השפה שתדברו",
  helperListening: "מקשיב…",
  helperNoMatch: "לא הבנתי בדיוק. הנה במה אני יכול לעזור:",
  helperClose: "סגור",
  helperBack: "חזרה לשאלות",
  helperPickPrompt: "שאלות נפוצות",

  chipPlay: "לשחק משחק",
  chipGames: "השוואת משחקים",
  chipSetup: "הקמת כיתה",
  chipLogin: "התחברות תלמידים",
  chipHomework: "שיעורי בית",
  chipProgress: "התקדמות תלמידים",
  chipApprovals: "אישורים",

  qPlay: "אני רוצה לשחק משחק",
  qSetup: "איך מוסיפים תלמידים?",
  qLogin: "איך התלמידים מתחברים?",
  qHomework: "אני רוצה לתת שיעורי בית או דף עבודה",
  qProgress: "איך התלמידים שלי מתקדמים?",
  qGamesDiff: "מה ההבדל בין המשחקים?",

  aLogin:
    "התלמידים מצטרפים לכיתה בשלוש דרכים — בחרו את הקלה ביותר:\n\n1. קוד כיתה — פותחים את Vocaband ומקלידים את הקוד הקצר שעל כרטיס הכיתה.\n2. קוד QR או קישור — הקישו “שתף” על כיתה כדי להציג קוד QR או להעתיק קישור הצטרפות (מצוין לוואטסאפ).\n3. שם + PIN — אתם יוצרים כל תלמיד עם קוד בן 4 ספרות שהוא מקליד כדי להתחבר.\n\nתלמידים חדשים שמשתמשים בקוד שלכם מופיעים תחת “אישורים” עד שתאשרו אותם.",
  aGamesDiff:
    "🟣 משחקים חיים — משחק מהיר, מרוץ קטגוריות, סבב מהיר, זירת ציד מילים. תחרותיים, כל תלמיד מהטלפון שלו, הצטרפות בקוד QR, בלי התחברות. מתאים לאנרגיה ולתחרות ידידותית.\n\n🟢 כלים לכיתה — Class Show, Hot Seat, גלגל המילים. אתם מריצים על מסך אחד או מקרן וכל הכיתה משחקת יחד. מתאים כשלתלמידים אין טלפונים.\n\nלא בטוחים? משחק מהיר הוא המקום הכי קל להתחיל בו.",
};

const ar: StartHereStrings = {
  heading: "ماذا تريد أن تفعل؟",
  sub: "اسألني أي شيء، أو اضغط على هدف — سنأخذك مباشرة إلى الأداة المناسبة.",
  hide: "إخفاء",
  show: "ماذا تريد أن تفعل؟",

  playTitle: "العب لعبة الآن",
  playBlurb: "أدِر نشاطًا ممتعًا مع صفك",
  playExplainer:
    "هناك نوعان من الألعاب:\n\n🟣 ألعاب مباشرة (لعب سريع، سباق الفئات، جولة سريعة، ساحة صيد الكلمات) — يلعب كل طالب على هاتفه وينضم بمسح رمز QR. دون تسجيل دخول. ممتازة لنشاط صفّي تنافسي وممتع.\n\n🟢 أدوات الصف (Class Show، Hot Seat، عجلة الكلمات) — تُشغّلها على شاشة واحدة أو جهاز العرض ويلعب الصف كله معًا. الأفضل عندما لا يملك الطلاب هواتف.\n\nاضغط زرًا بالأسفل وسآخذك إلى الصف المناسب.",
  playLiveBtn: "اعرض الألعاب المباشرة",

  setupTitle: "أنشئ صفك وطلابك",
  setupBlurb: "أنشئ صفًا وأدخِل طلابك",
  setupExplainer:
    "خطوتان سريعتان ليبدأ طلابك اللعب:\n\n1. أنشئ صفًا — اضغط “أنشئ صفًا”، أعطه اسمًا، وستحصل على رمز فصل قصير.\n\n2. أدخِل الطلاب — شارك رمز الفصل، أو اعرض رمز QR / أرسل رابط الانضمام (اضغط “مشاركة” على بطاقة الصف)، أو امنح كل طالب اسمًا ورمز PIN.\n\nمن يسجّل برمزك ينتظر تحت “الموافقات” حتى تسمح له بالدخول.",
  setupCreateBtn: "أنشئ صفًا",
  setupClassesBtn: "صفوفي",

  homeworkTitle: "أعطِ واجبًا أو ورقة عمل",
  homeworkBlurb: "أسنِد تمارين أو اطبع ورقة",
  homeworkExplainer:
    "طريقتان لإعطاء العمل:\n\n1. على الهواتف — افتح صفًا، اضغط “نشاط جديد”، اختر الكلمات وأوضاع اللعب، أضِف موعدًا نهائيًا (اختياري) وأسنِد. يلعبه الطلاب على هواتفهم.\n\n2. على الورق — اختر كلماتك واختر “ورقة عمل” للطباعة أو حفظ PDF (قوائم كلمات، خلط حروف، ملء الفراغ، مطابقة…).\n\nلا يوجد صف بعد؟ أنشئ واحدًا أولًا.",
  homeworkClassesBtn: "إلى صفوفي",
  homeworkCreateBtn: "أنشئ صفًا أولًا",

  progressTitle: "شاهد تقدّم الطلاب",
  progressBlurb: "الدرجات والتقدّم ومن يحتاج مساعدة",
  progressExplainer:
    "افتح “الفصل” لترى كل شيء عن الصف:\n\n• اليوم — من نشِط هذا الأسبوع، المعدّل، وآخر اللعبات.\n• الطلاب — اضغط على طالب لرؤية نقاط قوّته والكلمات التي يجد صعوبة فيها.\n• التقارير — اتجاهات أسبوعية وتصدير CSV / PDF.\n\nشارة حمراء على “الموافقات” تعني أن طلابًا ينتظرون موافقتك.",
  progressClassroomBtn: "افتح الفصل",
  progressApprovalsBtn: "افتح الموافقات",

  helperFab: "تحتاج مساعدة؟",
  helperTitle: "كيف أساعدك؟",
  helperSub: "اسألني أي شيء، أو اختر سؤالًا بالأسفل.",
  helperInputPlaceholder: "اكتب سؤالك…",
  helperMicLabel: "تحدّث",
  helperMicLangLabel: "اختر اللغة التي ستتحدّث بها",
  helperListening: "أستمع…",
  helperNoMatch: "لم أفهم ذلك تمامًا. إليك ما يمكنني المساعدة فيه:",
  helperClose: "إغلاق",
  helperBack: "العودة إلى الأسئلة",
  helperPickPrompt: "أسئلة شائعة",

  chipPlay: "العب لعبة",
  chipGames: "قارن الألعاب",
  chipSetup: "إعداد الصف",
  chipLogin: "دخول الطلاب",
  chipHomework: "الواجبات",
  chipProgress: "تقدّم الطلاب",
  chipApprovals: "الموافقات",

  qPlay: "أريد أن ألعب لعبة",
  qSetup: "كيف أضيف طلابي؟",
  qLogin: "كيف يسجّل الطلاب الدخول؟",
  qHomework: "أريد إعطاء واجب أو ورقة عمل",
  qProgress: "كيف هو أداء طلابي؟",
  qGamesDiff: "ما الفرق بين الألعاب؟",

  aLogin:
    "ينضم الطلاب إلى صفك بثلاث طرق — اختر الأسهل:\n\n1. رمز الفصل — يفتحون Vocaband ويكتبون الرمز القصير على بطاقة الصف.\n2. رمز QR أو رابط — اضغط “مشاركة” على صف لعرض رمز QR أو نسخ رابط انضمام (ممتاز لواتساب).\n3. الاسم + PIN — تنشئ كل طالب برمز من 4 أرقام يكتبه لتسجيل الدخول.\n\nالطلاب الجدد الذين يستخدمون رمزك يظهرون تحت “الموافقات” حتى توافق عليهم.",
  aGamesDiff:
    "🟣 ألعاب مباشرة — لعب سريع، سباق الفئات، جولة سريعة، ساحة صيد الكلمات. تنافسية، كل طالب على هاتفه، الانضمام برمز QR، دون تسجيل دخول. استخدمها للحماس والمنافسة الودّية.\n\n🟢 أدوات الصف — Class Show، Hot Seat، عجلة الكلمات. تُشغّلها على شاشة واحدة أو جهاز عرض ويلعب الصف معًا. استخدمها عندما لا يملك الطلاب هواتف.\n\nلست متأكدًا؟ اللعب السريع هو أسهل بداية.",
};

export const startHereT: Record<Language, StartHereStrings> = {
  en,
  he,
  ar,
  ru: en,
};
