/**
 * Worksheet — i18n strings for the worksheet builder and print view.
 * Used by teachers to create printable vocabulary worksheets.
 */
import type { Language } from '../../hooks/useLanguage';

export interface WorksheetStrings {
  // Main header
  heading: string;
  subtitle: string;
  backButton: string;

  // Word source section
  wordSource: string;
  customSelection: string;
  customSelectionDesc: string;
  builtWithPasteOcr: string;
  wordsCount: (n: number) => string;

  // Sheet types section
  sheetTypes: string;
  selectedCount: (n: number) => string;

  // Worksheet type labels and descriptions
  wordListLabel: string;
  wordListDesc: string;
  scrambleLabel: string;
  scrambleDesc: string;
  fillBlankLabel: string;
  fillBlankDesc: string;
  matchUpLabel: string;
  matchUpDesc: string;
  multipleChoiceLabel: string;
  multipleChoiceDesc: string;
  reverseTranslationLabel: string;
  reverseTranslationDesc: string;
  trueFalseLabel: string;
  trueFalseDesc: string;
  flashcardsLabel: string;
  flashcardsDesc: string;
  matchingLabel: string;
  matchingDesc: string;
  sentenceBuilderLabel: string;
  sentenceBuilderDesc: string;
  idiomLabel: string;
  idiomDesc: string;
  wordChainsLabel: string;
  wordChainsDesc: string;

  // AI Sentence Generation
  aiSentenceGeneration: string;
  generatingSentences: string;
  sentencesGenerated: (n: number) => string;
  generateSentencesDesc: string;
  generateSentences: string;
  regenerate: string;
  generating: string;
  aiNotAvailable: string;

  // Title and options
  worksheetTitle: string;
  includeAnswerKey: string;
  eachSheetOnItsOwnPage: string;
  eachSheetOnItsOwnPageHint: string;
  answerKeyOnNewPage: string;
  answerKeyOnNewPageHint: string;

  // Preview and print
  preview: string;
  print: string;

  // Print-only strings (for the actual worksheet)
  classLabel: string;
  dateLabel: string;
  nameLabel: string;
  answerKey: string;
  tableNumber: string;
  tableWord: string;
  tableAnswer: string;
  vocabandFooter: string;

  // Sheet type indicator (for multi-sheet prints)
  answerOptionA: string;
  answerTrue: string;
  answerTrueWithHint: string;
  answerCompleteSentence: string;
}

export const worksheetStrings: Record<Language, WorksheetStrings> = {
  en: {
    heading: 'Print worksheet',
    subtitle: 'Pick words, choose a sheet type, hit Print.',
    backButton: 'Back',
    wordSource: 'Word source',
    customSelection: 'My custom selection',
    customSelectionDesc: 'Built with paste / OCR / packs',
    builtWithPasteOcr: 'Built with paste / OCR / packs',
    wordsCount: (n) => `${n} words`,
    sheetTypes: 'Sheet types',
    selectedCount: (n) => `${n} selected`,
    wordListLabel: 'Word List',
    wordListDesc: 'Bilingual reference sheet',
    scrambleLabel: 'Scramble',
    scrambleDesc: 'Unscramble each word',
    fillBlankLabel: 'Fill in the Blank',
    fillBlankDesc: 'Sentences with missing words',
    matchUpLabel: 'Match-up',
    matchUpDesc: 'Connect word to translation',
    multipleChoiceLabel: 'Multiple Choice',
    multipleChoiceDesc: 'Choose the correct answer',
    reverseTranslationLabel: 'Reverse Translation',
    reverseTranslationDesc: 'Write English from translation',
    trueFalseLabel: 'True/False',
    trueFalseDesc: 'Is the translation correct?',
    flashcardsLabel: 'Flashcards',
    flashcardsDesc: 'Cut and fold study cards',
    matchingLabel: 'Matching',
    matchingDesc: 'Draw lines to match pairs',
    sentenceBuilderLabel: 'Sentence Builder',
    sentenceBuilderDesc: 'Unscramble sentences',
    idiomLabel: 'Idioms',
    idiomDesc: 'Match each idiom with its meaning',
    wordChainsLabel: 'Word Chains',
    wordChainsDesc: 'Connect each pair of words',
    aiSentenceGeneration: 'AI Sentence Generation',
    generatingSentences: 'Generating sentences...',
    sentencesGenerated: (n) => `${n} sentences generated`,
    generateSentencesDesc: 'Generate example sentences for your worksheet',
    generateSentences: 'Generate Sentences',
    regenerate: 'Regenerate',
    generating: 'Generating...',
    aiNotAvailable: 'AI features are not available. Please contact support to enable.',
    worksheetTitle: 'Worksheet title',
    includeAnswerKey: 'Include answer key',
    eachSheetOnItsOwnPage: 'Each sheet on its own page',
    eachSheetOnItsOwnPageHint: 'Off (default) packs sheets together to save paper.',
    answerKeyOnNewPage: 'Put answer key on a separate page',
    answerKeyOnNewPageHint: 'Hand out the worksheet without revealing the answers.',
    preview: 'Preview',
    print: 'Print',
    classLabel: 'Class:',
    dateLabel: 'Date:',
    nameLabel: 'Name:',
    answerKey: 'Answer Key',
    tableNumber: '#',
    tableWord: 'Word',
    tableAnswer: 'Answer',
    vocabandFooter: 'Vocaband · vocaband.com',
    answerOptionA: 'A',
    answerTrue: 'True',
    answerTrueWithHint: 'True (when shown with correct translation)',
    answerCompleteSentence: 'Complete sentence',
  },
  he: {
    heading: 'הדפס דף עבודה',
    subtitle: 'בחר מילים, בחר סוג דף, לחץ הדפס.',
    backButton: 'חזור',
    wordSource: 'מקור המילים',
    customSelection: 'הבחירה המותאמת שלי',
    customSelectionDesc: 'נבנה עם הדבקה / זיהוי תמונה / חבילות',
    builtWithPasteOcr: 'נבנה עם הדבקה / זיהוי תמונה / חבילות',
    wordsCount: (n) => `${n} מילים`,
    sheetTypes: 'סוגי דפים',
    selectedCount: (n) => `${n} נבחרו`,
    wordListLabel: 'רשימת מילים',
    wordListDesc: 'גיליון עזר דו-לשוני',
    scrambleLabel: 'ערבוב',
    scrambleDesc: 'סדר מחדש את המילים',
    fillBlankLabel: 'השלם את החסר',
    fillBlankDesc: 'משפטים עם מילים חסרות',
    matchUpLabel: 'התאמה',
    matchUpDesc: 'חבר מילה לתרגום',
    multipleChoiceLabel: 'בחירה מרובה',
    multipleChoiceDesc: 'בחר את התשובה הנכונה',
    reverseTranslationLabel: 'תרגום הפוך',
    reverseTranslationDesc: 'כתוב באנגלית לפי התרגום',
    trueFalseLabel: 'נכון/לא נכון',
    trueFalseDesc: 'האם התרגום נכון?',
    flashcardsLabel: 'כרטיסיות',
    flashcardsDesc: 'כרטיסיות לימוד לחיתוך וקיפול',
    matchingLabel: 'התאמה',
    matchingDesc: 'צייר קווים להתאמת זוגות',
    sentenceBuilderLabel: 'בניית משפטים',
    sentenceBuilderDesc: 'סדר מחדש את המשפטים',
    idiomLabel: 'ביטויים',
    idiomDesc: 'התאם כל ביטוי למשמעותו',
    wordChainsLabel: 'שרשרת מילים',
    wordChainsDesc: 'חבר כל זוג מילים',
    aiSentenceGeneration: 'יצירת משפטים בבינה מלאכותית',
    generatingSentences: 'יוצר משפטים...',
    sentencesGenerated: (n) => `${n} משפטים נוצרו`,
    generateSentencesDesc: 'צור משפטים לדוגמה לדף העבודה שלך',
    generateSentences: 'צור משפטים',
    regenerate: 'צור שוב',
    generating: 'יוצר...',
    aiNotAvailable: 'תכונות הבינה המלאכותית אינן זמינות. פנה לתמיכה להפעלה.',
    worksheetTitle: 'כותרת דף עבודה',
    includeAnswerKey: 'כלול מפתח תשובות',
    eachSheetOnItsOwnPage: 'כל דף בעמוד נפרד',
    eachSheetOnItsOwnPageHint: 'כבוי (ברירת מחדל) דוחס מספר דפים יחד כדי לחסוך בנייר.',
    answerKeyOnNewPage: 'הצב את מפתח התשובות בעמוד נפרד',
    answerKeyOnNewPageHint: 'חלק את דף העבודה מבלי לחשוף את התשובות.',
    preview: 'תצוגה מקדימה',
    print: 'הדפס',
    classLabel: 'כיתה:',
    dateLabel: 'תאריך:',
    nameLabel: 'שם:',
    answerKey: 'מפתח תשובות',
    tableNumber: '#',
    tableWord: 'מילה',
    tableAnswer: 'תשובה',
    vocabandFooter: 'ווקאבנד · vocaband.com',
    answerOptionA: 'א',
    answerTrue: 'נכון',
    answerTrueWithHint: 'נכון (כאשר מוצג עם התרגום הנכון)',
    answerCompleteSentence: 'משפט שלם',
  },
  ar: {
    heading: 'اطبع ورقة عمل',
    subtitle: 'اختر الكلمات، اختر نوع الورقة، اضغط طباعة.',
    backButton: 'رجوع',
    wordSource: 'مصدر الكلمات',
    customSelection: 'اختياري المخصص',
    customSelectionDesc: 'تم الإنشاء باللصق / التعرف الضوئي / الحزم',
    builtWithPasteOcr: 'تم الإنشاء باللصق / التعرف الضوئي / الحزم',
    wordsCount: (n) => `${n} كلمات`,
    sheetTypes: 'أنواع الأوراق',
    selectedCount: (n) => `${n} محدد`,
    wordListLabel: 'قائمة الكلمات',
    wordListDesc: 'ورقة مرجعية ثنائية اللغة',
    scrambleLabel: 'خلط',
    scrambleDesc: 'رتب الكلمات من جديد',
    fillBlankLabel: 'املأ الفراغ',
    fillBlankDesc: 'جمل بكلمات ناقصة',
    matchUpLabel: 'وصّل',
    matchUpDesc: 'صل الكلمة بالترجمة',
    multipleChoiceLabel: 'اختيار من متعدد',
    multipleChoiceDesc: 'اختر الإجابة الصحيحة',
    reverseTranslationLabel: 'ترجمة عكسية',
    reverseTranslationDesc: 'اكتب بالإنجليزية من الترجمة',
    trueFalseLabel: 'صح أم خطأ',
    trueFalseDesc: 'هل الترجمة صحيحة؟',
    flashcardsLabel: 'بطاقات',
    flashcardsDesc: 'بطاقات دراسية للقص والطي',
    matchingLabel: 'تطابق',
    matchingDesc: 'ارسم خطوطًا لمطابقة الأزواج',
    sentenceBuilderLabel: 'بناء الجمل',
    sentenceBuilderDesc: 'رتب الجمل من جديد',
    idiomLabel: 'التعابير',
    idiomDesc: 'طابق كل تعبير مع معناه',
    wordChainsLabel: 'سلاسل الكلمات',
    wordChainsDesc: 'اربط كل زوج من الكلمات',
    aiSentenceGeneration: 'إنشاء الجمل بالذكاء الاصطناعي',
    generatingSentences: 'جارٍ إنشاء الجمل...',
    sentencesGenerated: (n) => `${n} جمل تم إنشاؤها`,
    generateSentencesDesc: 'أنشئ جملًا مثالية لورقة العمل الخاصة بك',
    generateSentences: 'أنشئ جملًا',
    regenerate: 'إعادة الإنشاء',
    generating: 'جارٍ الإنشاء...',
    aiNotAvailable: 'ميزات الذكاء الاصطناعي غير متاحة. اتصل بالدعم لتفعيلها.',
    worksheetTitle: 'عنوان ورقة العمل',
    includeAnswerKey: 'تضمين مفتاح الإجابة',
    eachSheetOnItsOwnPage: 'كل ورقة في صفحة منفصلة',
    eachSheetOnItsOwnPageHint: 'إيقاف (افتراضي) يضغط الأوراق معًا لتوفير الورق.',
    answerKeyOnNewPage: 'ضع مفتاح الإجابة في صفحة منفصلة',
    answerKeyOnNewPageHint: 'وزّع ورقة العمل دون كشف الإجابات.',
    preview: 'معاينة',
    print: 'طباعة',
    classLabel: 'الصف:',
    dateLabel: 'التاريخ:',
    nameLabel: 'الاسم:',
    answerKey: 'مفتاح الإجابة',
    tableNumber: '#',
    tableWord: 'كلمة',
    tableAnswer: 'إجابة',
    vocabandFooter: 'فوكاباند · vocaband.com',
    answerOptionA: 'أ',
    answerTrue: 'صح',
    answerTrueWithHint: 'صح (عند عرضه مع الترجمة الصحيحة)',
    answerCompleteSentence: 'جملة كاملة',
  },
};
