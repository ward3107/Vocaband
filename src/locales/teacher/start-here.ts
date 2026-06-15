/**
 * Strings for the teacher dashboard "Start here" experience:
 *
 *  - StartHerePanel — the intent-based launcher at the top of the
 *    English dashboard ("What do you want to do?") with four
 *    plain-language goals that expand into a short explainer + the
 *    buttons that take the teacher to the right tool.
 *  - TeacherHelpAssistant — the floating "Need help?" guided helper
 *    that answers the same goals (plus "how do students log in?" and
 *    "what's the difference between the games?") by tapping a question
 *    or typing / speaking it. No AI backend — pure rule-based routing.
 *
 * Tone matches dashboard.ts: warm, direct, plain English a teacher who
 * doesn't think of themselves as "techy" can follow. Hebrew + Arabic
 * follow the same conventions as the rest of src/locales/teacher; ru
 * mirrors en (same fallback the other teacher locales use).
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
  playRoomBtn: string;

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
  helperListening: string;
  helperNoMatch: string;
  helperClose: string;
  helperBack: string;

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
  sub: "Tap a goal — we'll take you straight to the right tool.",
  hide: "Hide",
  show: "What do you want to do?",

  playTitle: "Play a game now",
  playBlurb: "Run a fun activity with your class",
  playExplainer:
    "There are two kinds. Live games: every student plays on their own phone and joins by scanning a QR code — no login needed. In-room tools: you run it on one screen or the projector and the whole class plays together.",
  playLiveBtn: "Show live games",
  playRoomBtn: "Show in-room tools",

  setupTitle: "Set up my class & students",
  setupBlurb: "Create a class and get students in",
  setupExplainer:
    "First create a class — you'll get a short class code. Students can join three ways: type the class code, scan the QR code or open the join link you share, or log in with the name and PIN you hand out. Anyone waiting to be let in shows up under Approvals.",
  setupCreateBtn: "Create a class",
  setupClassesBtn: "See my classes",

  homeworkTitle: "Give homework or a worksheet",
  homeworkBlurb: "Assign practice or print a sheet",
  homeworkExplainer:
    "Open one of your classes and tap New activity to set homework your students play on their phones. Prefer paper? Pick your words and choose Worksheet to print or save a PDF. No class yet? Create one first.",
  homeworkClassesBtn: "Go to my classes",
  homeworkCreateBtn: "Create a class first",

  progressTitle: "See how students are doing",
  progressBlurb: "Scores, progress and who needs help",
  progressExplainer:
    "Open Classroom to see who's active this week, average scores, each student's strengths and the words they struggle with — and to export reports. A red badge on Approvals means students are waiting for you to let them in.",
  progressClassroomBtn: "Open Classroom",
  progressApprovalsBtn: "Open Approvals",

  helperFab: "Need help?",
  helperTitle: "How can I help?",
  helperSub: "Tell me what you'd like to do, or pick a question.",
  helperInputPlaceholder: "Type your question…",
  helperMicLabel: "Speak",
  helperListening: "Listening…",
  helperNoMatch: "I'm not sure about that one yet. Try one of these:",
  helperClose: "Close",
  helperBack: "Back to questions",

  qPlay: "I want to play a game",
  qSetup: "How do I add my students?",
  qLogin: "How do students log in?",
  qHomework: "I want to give homework or a worksheet",
  qProgress: "How are my students doing?",
  qGamesDiff: "What's the difference between the games?",

  aLogin:
    "Students join your class in three ways. 1) Class code — they open Vocaband and type the short code shown on your class card. 2) QR code or link — tap Share on a class to show a QR code or copy a join link (great for WhatsApp). 3) Name + PIN — you create each student with a 4-digit PIN they type to log in. Pick whichever is easiest for your class.",
  aGamesDiff:
    "Live games (Quick Play, Category Race, Speed Round, Word Hunt Arena) are competitive — every student plays on their own phone and joins by QR code, no login. In-room tools (Class Show, Hot Seat, Vocab Wheel) run on one screen or projector, for lessons where students don't have phones.",
};

const he: StartHereStrings = {
  heading: "מה תרצו לעשות?",
  sub: "הקישו על מטרה — ניקח אתכם ישר לכלי הנכון.",
  hide: "הסתר",
  show: "מה תרצו לעשות?",

  playTitle: "לשחק משחק עכשיו",
  playBlurb: "הריצו פעילות כיפית עם הכיתה",
  playExplainer:
    "יש שני סוגים. משחקים חיים: כל תלמיד משחק מהטלפון שלו ומצטרף בסריקת קוד QR — בלי התחברות. כלים לכיתה: אתם מריצים על מסך אחד או על המקרן וכל הכיתה משחקת יחד.",
  playLiveBtn: "הצג משחקים חיים",
  playRoomBtn: "הצג כלים לכיתה",

  setupTitle: "להקים כיתה ותלמידים",
  setupBlurb: "צרו כיתה והכניסו את התלמידים",
  setupExplainer:
    "קודם צרו כיתה — תקבלו קוד כיתה קצר. התלמידים יכולים להצטרף בשלוש דרכים: להקליד את קוד הכיתה, לסרוק את קוד ה-QR או לפתוח את קישור ההצטרפות שתשתפו, או להתחבר עם השם וקוד ה-PIN שתחלקו. מי שממתין לאישור מופיע תחת 'אישורים'.",
  setupCreateBtn: "צור כיתה",
  setupClassesBtn: "הכיתות שלי",

  homeworkTitle: "לתת שיעורי בית או דף עבודה",
  homeworkBlurb: "שייכו תרגול או הדפיסו דף",
  homeworkExplainer:
    "פתחו אחת מהכיתות שלכם והקישו 'פעילות חדשה' כדי לקבוע שיעורי בית שהתלמידים משחקים בטלפון. מעדיפים נייר? בחרו מילים ובחרו 'דף עבודה' כדי להדפיס או לשמור PDF. אין עדיין כיתה? צרו אחת קודם.",
  homeworkClassesBtn: "לכיתות שלי",
  homeworkCreateBtn: "צרו כיתה קודם",

  progressTitle: "לראות איך התלמידים מתקדמים",
  progressBlurb: "ציונים, התקדמות ומי זקוק לעזרה",
  progressExplainer:
    "פתחו 'כיתה' כדי לראות מי פעיל השבוע, ציונים ממוצעים, חוזקות של כל תלמיד והמילים שמאתגרות אותו — ולייצא דוחות. תג אדום על 'אישורים' אומר שתלמידים ממתינים שתכניסו אותם.",
  progressClassroomBtn: "פתח כיתה",
  progressApprovalsBtn: "פתח אישורים",

  helperFab: "צריכים עזרה?",
  helperTitle: "איך אפשר לעזור?",
  helperSub: "ספרו לי מה תרצו לעשות, או בחרו שאלה.",
  helperInputPlaceholder: "הקלידו שאלה…",
  helperMicLabel: "דברו",
  helperListening: "מקשיב…",
  helperNoMatch: "עדיין לא בטוח לגבי זה. נסו אחת מאלה:",
  helperClose: "סגור",
  helperBack: "חזרה לשאלות",

  qPlay: "אני רוצה לשחק משחק",
  qSetup: "איך מוסיפים תלמידים?",
  qLogin: "איך התלמידים מתחברים?",
  qHomework: "אני רוצה לתת שיעורי בית או דף עבודה",
  qProgress: "איך התלמידים שלי מתקדמים?",
  qGamesDiff: "מה ההבדל בין המשחקים?",

  aLogin:
    "התלמידים מצטרפים לכיתה בשלוש דרכים. 1) קוד כיתה — פותחים את Vocaband ומקלידים את הקוד הקצר שמופיע על כרטיס הכיתה. 2) קוד QR או קישור — הקישו 'שתף' על כיתה כדי להציג קוד QR או להעתיק קישור הצטרפות (מצוין לוואטסאפ). 3) שם + PIN — אתם יוצרים כל תלמיד עם קוד בן 4 ספרות שהוא מקליד כדי להתחבר. בחרו מה שהכי קל לכיתה שלכם.",
  aGamesDiff:
    "משחקים חיים (משחק מהיר, מרוץ קטגוריות, סבב מהיר, זירת ציד מילים) הם תחרותיים — כל תלמיד משחק מהטלפון שלו ומצטרף בקוד QR, בלי התחברות. כלים לכיתה (Class Show, Hot Seat, גלגל המילים) רצים על מסך אחד או מקרן, לשיעורים שבהם לתלמידים אין טלפונים.",
};

const ar: StartHereStrings = {
  heading: "ماذا تريد أن تفعل؟",
  sub: "اضغط على هدف — سنأخذك مباشرة إلى الأداة المناسبة.",
  hide: "إخفاء",
  show: "ماذا تريد أن تفعل؟",

  playTitle: "العب لعبة الآن",
  playBlurb: "أدِر نشاطًا ممتعًا مع صفك",
  playExplainer:
    "هناك نوعان. ألعاب مباشرة: يلعب كل طالب على هاتفه وينضم بمسح رمز QR — دون تسجيل دخول. أدوات الصف: تُشغّلها على شاشة واحدة أو جهاز العرض ويلعب الصف كله معًا.",
  playLiveBtn: "اعرض الألعاب المباشرة",
  playRoomBtn: "اعرض أدوات الصف",

  setupTitle: "أنشئ صفك وطلابك",
  setupBlurb: "أنشئ صفًا وأدخِل طلابك",
  setupExplainer:
    "أنشئ صفًا أولًا — ستحصل على رمز فصل قصير. يمكن للطلاب الانضمام بثلاث طرق: كتابة رمز الفصل، أو مسح رمز QR أو فتح رابط الانضمام الذي تشاركه، أو تسجيل الدخول بالاسم ورمز PIN الذي توزّعه. من ينتظر الموافقة يظهر تحت 'الموافقات'.",
  setupCreateBtn: "أنشئ صفًا",
  setupClassesBtn: "صفوفي",

  homeworkTitle: "أعطِ واجبًا أو ورقة عمل",
  homeworkBlurb: "أسنِد تمارين أو اطبع ورقة",
  homeworkExplainer:
    "افتح أحد صفوفك واضغط 'نشاط جديد' لتعيين واجب يلعبه طلابك على هواتفهم. تفضّل الورق؟ اختر كلماتك ثم اختر 'ورقة عمل' للطباعة أو حفظ PDF. لا يوجد صف بعد؟ أنشئ واحدًا أولًا.",
  homeworkClassesBtn: "إلى صفوفي",
  homeworkCreateBtn: "أنشئ صفًا أولًا",

  progressTitle: "شاهد تقدّم الطلاب",
  progressBlurb: "الدرجات والتقدّم ومن يحتاج مساعدة",
  progressExplainer:
    "افتح 'الفصل' لترى من نشِط هذا الأسبوع، المعدّلات، نقاط قوة كل طالب والكلمات التي يجد صعوبة فيها — ولتصدير التقارير. شارة حمراء على 'الموافقات' تعني أن طلابًا ينتظرون موافقتك.",
  progressClassroomBtn: "افتح الفصل",
  progressApprovalsBtn: "افتح الموافقات",

  helperFab: "تحتاج مساعدة؟",
  helperTitle: "كيف أساعدك؟",
  helperSub: "أخبرني بما تريد فعله، أو اختر سؤالًا.",
  helperInputPlaceholder: "اكتب سؤالك…",
  helperMicLabel: "تحدّث",
  helperListening: "أستمع…",
  helperNoMatch: "لست متأكدًا من ذلك بعد. جرّب أحد هذه:",
  helperClose: "إغلاق",
  helperBack: "العودة إلى الأسئلة",

  qPlay: "أريد أن ألعب لعبة",
  qSetup: "كيف أضيف طلابي؟",
  qLogin: "كيف يسجّل الطلاب الدخول؟",
  qHomework: "أريد إعطاء واجب أو ورقة عمل",
  qProgress: "كيف هو أداء طلابي؟",
  qGamesDiff: "ما الفرق بين الألعاب؟",

  aLogin:
    "ينضم الطلاب إلى صفك بثلاث طرق. 1) رمز الفصل — يفتحون Vocaband ويكتبون الرمز القصير الظاهر على بطاقة الصف. 2) رمز QR أو رابط — اضغط 'مشاركة' على صف لعرض رمز QR أو نسخ رابط انضمام (ممتاز لواتساب). 3) الاسم + PIN — تنشئ كل طالب برمز من 4 أرقام يكتبه لتسجيل الدخول. اختر الأسهل لصفك.",
  aGamesDiff:
    "الألعاب المباشرة (لعب سريع، سباق الفئات، جولة سريعة، ساحة صيد الكلمات) تنافسية — يلعب كل طالب على هاتفه وينضم برمز QR دون تسجيل دخول. أدوات الصف (Class Show، Hot Seat، عجلة الكلمات) تعمل على شاشة واحدة أو جهاز عرض، للحصص التي لا يملك فيها الطلاب هواتف.",
};

export const startHereT: Record<Language, StartHereStrings> = {
  en,
  he,
  ar,
  ru: en,
};
