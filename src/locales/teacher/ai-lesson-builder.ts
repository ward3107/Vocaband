/**
 * ai-lesson-builder.ts — i18n strings for AiLessonBuilder (the unified
 * AI lesson generator modal in the assignment Review step).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface AiLessonBuilderStrings {
  // Header / chrome
  headerTitle: string;
  selectedWordsCount: (n: number) => string;
  closeAria: string;

  // Reading-text section
  readingTextHeading: string;
  studentLevelLabel: string;
  studentLevelDefault: string;
  studentLevelPlaceholder: string;
  studentLevelHelper: string;
  textTypeLabel: string;
  textTypePlaceholder: string;
  textTypeHelper: string;
  textLengthLabel: (n: number) => string;

  // Questions section
  questionsHeading: string;
  autoBalance: string;
  comprehensionHeading: string;
  exerciseHeading: string;
  includeAnswerKey: string;
  includeAnswerKeyHelper: string;

  // Question type labels
  qYesNo: string;
  qWh: string;
  qLiteral: string;
  qInferential: string;
  qFillBlank: string;
  qTrueFalse: string;
  qMatching: string;
  qMultipleChoice: string;
  qSentenceComplete: string;

  // Generate / preview
  generatingLesson: string;
  generateLesson: string;
  lessonGenerated: string;
  wordsAndQuestionsSummary: (words: number, questions: number) => string;
  regenerate: string;
  questionsCountHeading: (n: number) => string;
  questionNumber: (i: number, q: string) => string;
  answerLabel: string;

  // Footer actions
  printOrSavePdf: string;
  save: string;
  done: string;

  // Toasts
  selectWordsFirst: string;
  selectAtLeastOneType: string;
  failedToGenerate: string;
  balancedToast: (total: number, types: number) => string;

  // Default text-type prompt to AI (used in body)
  defaultTextTypePrompt: (n: number) => string;

  // Print stack
  printDocTitle: string;
  printDateLabel: string;
  printNameLabel: string;
  printReadingHeading: string;
  printAnswerKey: string;
}

export const aiLessonBuilderT: Record<Language, AiLessonBuilderStrings> = {
  en: {
    headerTitle: "🤖 AI Lesson Builder",
    selectedWordsCount: (n) => `(${n} words)`,
    closeAria: "Close",
    readingTextHeading: "Reading Text",
    studentLevelLabel: "Student Level / Difficulty",
    studentLevelDefault: "A2 (Grade 6-7, comfortable with everyday topics)",
    studentLevelPlaceholder: "e.g., Grade 7, mixed abilities, ESL learners...",
    studentLevelHelper: "Describe your students — no need for CEFR codes",
    textTypeLabel: "What kind of text do you want?",
    textTypePlaceholder: "e.g., A story about friendship that uses these words in context, or An informational text about environmental issues...",
    textTypeHelper: "Leave empty for AI to decide based on the vocabulary",
    textLengthLabel: (n) => `Text Length: ${n} words`,
    questionsHeading: "Questions",
    autoBalance: "Auto-balance",
    comprehensionHeading: "Comprehension Questions",
    exerciseHeading: "Exercise Types",
    includeAnswerKey: "Include answer key",
    includeAnswerKeyHelper: "Add answers to all generated questions",
    qYesNo: "Yes/No",
    qWh: "WH- Questions",
    qLiteral: "Literal (Facts)",
    qInferential: "Thinking",
    qFillBlank: "Fill-in-blank",
    qTrueFalse: "True/False",
    qMatching: "Matching",
    qMultipleChoice: "Multiple Choice",
    qSentenceComplete: "Sentence Complete",
    generatingLesson: "Generating lesson...",
    generateLesson: "✨ Generate Lesson",
    lessonGenerated: "Lesson Generated!",
    wordsAndQuestionsSummary: (w, q) => `${w} words • ${q} questions`,
    regenerate: "Regenerate",
    questionsCountHeading: (n) => `Questions (${n})`,
    questionNumber: (i, q) => `Q${i}: ${q}`,
    answerLabel: "Answer:",
    printOrSavePdf: "Print / Save as PDF",
    save: "Save",
    done: "Done",
    selectWordsFirst: "Please select some words first",
    selectAtLeastOneType: "Please select at least one question type",
    failedToGenerate: "Failed to generate lesson",
    balancedToast: (total, types) => `Balanced ${total} questions across ${types} types`,
    defaultTextTypePrompt: (n) => `Create a coherent text using these ${n} vocabulary words`,
    printDocTitle: "Reading Comprehension Lesson",
    printDateLabel: "Date:",
    printNameLabel: "Name:",
    printReadingHeading: "Reading",
    printAnswerKey: "Answer Key",
  },
  he: {
    headerTitle: "🤖 בונה שיעורים AI",
    selectedWordsCount: (n) => `(${n} מילים)`,
    closeAria: "סגירה",
    readingTextHeading: "טקסט לקריאה",
    studentLevelLabel: "רמת תלמיד / קושי",
    studentLevelDefault: "A2 (כיתות ו'-ז', מתמודדים בנוחות עם נושאי יומיום)",
    studentLevelPlaceholder: "למשל: כיתה ז', יכולות מעורבות, לומדי אנגלית כשפה שנייה...",
    studentLevelHelper: "תארו את התלמידים שלכם — אין צורך בקודי CEFR",
    textTypeLabel: "איזה סוג טקסט אתם רוצים?",
    textTypePlaceholder: "למשל: סיפור על חברות שמשתמש במילים בהקשר, או טקסט מידע על נושאים סביבתיים...",
    textTypeHelper: "השאירו ריק וה-AI יחליט על פי אוצר המילים",
    textLengthLabel: (n) => `אורך הטקסט: ${n} מילים`,
    questionsHeading: "שאלות",
    autoBalance: "איזון אוטומטי",
    comprehensionHeading: "שאלות הבנת הנקרא",
    exerciseHeading: "סוגי תרגול",
    includeAnswerKey: "כלול דף תשובות",
    includeAnswerKeyHelper: "הוסף תשובות לכל השאלות שנוצרו",
    qYesNo: "כן/לא",
    qWh: "שאלות WH",
    qLiteral: "ליטרליות (עובדות)",
    qInferential: "חשיבה",
    qFillBlank: "השלמת חסר",
    qTrueFalse: "נכון/לא נכון",
    qMatching: "התאמה",
    qMultipleChoice: "רב-ברירה",
    qSentenceComplete: "השלמת משפט",
    generatingLesson: "יוצר שיעור...",
    generateLesson: "✨ צור שיעור",
    lessonGenerated: "השיעור נוצר!",
    wordsAndQuestionsSummary: (w, q) => `${w} מילים • ${q} שאלות`,
    regenerate: "צור מחדש",
    questionsCountHeading: (n) => `שאלות (${n})`,
    questionNumber: (i, q) => `ש${i}: ${q}`,
    answerLabel: "תשובה:",
    printOrSavePdf: "הדפסה / שמירה כ-PDF",
    save: "שמירה",
    done: "סיום",
    selectWordsFirst: "אנא בחרו תחילה כמה מילים",
    selectAtLeastOneType: "אנא בחרו לפחות סוג שאלה אחד",
    failedToGenerate: "יצירת השיעור נכשלה",
    balancedToast: (total, types) => `${total} שאלות אוזנו על פני ${types} סוגים`,
    defaultTextTypePrompt: (n) => `צרו טקסט קוהרנטי המשתמש ב-${n} מילי האוצר האלה`,
    printDocTitle: "שיעור הבנת הנקרא",
    printDateLabel: "תאריך:",
    printNameLabel: "שם:",
    printReadingHeading: "קריאה",
    printAnswerKey: "מפתח תשובות",
  },
  ar: {
    headerTitle: "🤖 منشئ الدروس الذكي",
    selectedWordsCount: (n) => `(${n} كلمة)`,
    closeAria: "إغلاق",
    readingTextHeading: "نص القراءة",
    studentLevelLabel: "مستوى الطالب / الصعوبة",
    studentLevelDefault: "A2 (الصفان السادس والسابع، يتعاملون مع مواضيع يومية)",
    studentLevelPlaceholder: "مثال: الصف السابع، قدرات متنوعة، متعلمو الإنجليزية كلغة ثانية...",
    studentLevelHelper: "صف طلابك — لا حاجة لرموز CEFR",
    textTypeLabel: "أي نوع من النصوص تريد؟",
    textTypePlaceholder: "مثال: قصة عن الصداقة تستخدم هذه الكلمات في سياق، أو نص معلوماتي عن قضايا البيئة...",
    textTypeHelper: "اتركه فارغًا ليقرر الذكاء الاصطناعي حسب المفردات",
    textLengthLabel: (n) => `طول النص: ${n} كلمة`,
    questionsHeading: "الأسئلة",
    autoBalance: "موازنة تلقائية",
    comprehensionHeading: "أسئلة الفهم القرائي",
    exerciseHeading: "أنواع التمارين",
    includeAnswerKey: "تضمين مفتاح الإجابات",
    includeAnswerKeyHelper: "أضف إجابات لكل الأسئلة المولّدة",
    qYesNo: "نعم/لا",
    qWh: "أسئلة WH",
    qLiteral: "حرفية (حقائق)",
    qInferential: "تفكير",
    qFillBlank: "ملء الفراغ",
    qTrueFalse: "صح/خطأ",
    qMatching: "مطابقة",
    qMultipleChoice: "اختيار من متعدد",
    qSentenceComplete: "إكمال الجملة",
    generatingLesson: "جارٍ إنشاء الدرس...",
    generateLesson: "✨ إنشاء الدرس",
    lessonGenerated: "تم إنشاء الدرس!",
    wordsAndQuestionsSummary: (w, q) => `${w} كلمة • ${q} سؤال`,
    regenerate: "أعد التوليد",
    questionsCountHeading: (n) => `الأسئلة (${n})`,
    questionNumber: (i, q) => `س${i}: ${q}`,
    answerLabel: "الإجابة:",
    printOrSavePdf: "طباعة / حفظ كـ PDF",
    save: "حفظ",
    done: "تم",
    selectWordsFirst: "يرجى اختيار بعض الكلمات أولاً",
    selectAtLeastOneType: "يرجى اختيار نوع سؤال واحد على الأقل",
    failedToGenerate: "فشل إنشاء الدرس",
    balancedToast: (total, types) => `تم توزيع ${total} سؤالاً على ${types} أنواع`,
    defaultTextTypePrompt: (n) => `أنشئ نصًا متماسكًا يستخدم كلمات المفردات الـ${n} هذه`,
    printDocTitle: "درس فهم القراءة",
    printDateLabel: "التاريخ:",
    printNameLabel: "الاسم:",
    printReadingHeading: "القراءة",
    printAnswerKey: "مفتاح الإجابات",
  },
};
