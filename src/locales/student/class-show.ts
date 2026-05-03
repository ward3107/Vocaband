/**
 * Class Show — i18n strings for the projector teaching view.  Used by
 * teachers in classrooms where students DON'T have devices.  Strings
 * appear on the projection / TV screen so they need to be readable
 * from the back of the room — short and punchy.
 */
import type { Language } from '../../hooks/useLanguage';

export interface ClassShowStrings {
  classShow: string;
  projectToClass: string;
  printWorksheet: string;
  pickMode: string;
  pickWordSource: string;
  questionCount: string;
  questionCountAll: string;
  startShow: string;
  questionOf: (n: number, total: number) => string;
  reveal: string;
  correctAnswer: string;
  skip: string;
  next: string;
  endShow: string;
  showComplete: string;
  showCompleteSubtitle: (n: number) => string;
  playAnother: string;
  backToDashboard: string;
  // Mode names (also used by Setup)
  modeClassic: string;
  modeListening: string;
  modeReverse: string;
  modeFillBlank: string;
  modeTrueFalse: string;
  modeFlashcards: string;
  modeSpelling: string;
  modeScramble: string;
  modeLetterSounds: string;
  modeMatching: string;
  modeMemoryFlip: string;
  modeSentenceBuilder: string;
  modeIdiom: string;
  modeSpeedRound: string;
  modeWordChains: string;
  // Adapted-mode hints
  spellingHint: string;
  scrambleHint: string;
  matchingHint: string;
  memoryFlipHint: string;
  sentenceBuilderHint: string;
  letterSoundsHint: string;
  reset: string;
  // Word source labels
  set1: string;
  set2: string;
  set3: string;
  fromAssignment: string;
  // True/false labels
  trueLabel: string;
  falseLabel: string;
  // Flashcards reveal hint
  flipCard: string;
  tapPlayAudio: string;
}

export const classShowStrings: Record<Language, ClassShowStrings> = {
  en: {
    classShow: 'Class Show',
    projectToClass: 'Project to class',
    printWorksheet: 'Print worksheet',
    pickMode: 'Pick a mode',
    pickWordSource: 'Word source',
    questionCount: 'Number of words',
    questionCountAll: 'All words',
    startShow: 'Start show',
    questionOf: (n, total) => `Question ${n} of ${total}`,
    reveal: 'Reveal answer',
    correctAnswer: 'Correct answer:',
    skip: 'Skip',
    next: 'Next',
    endShow: 'End show',
    showComplete: 'Show complete!',
    showCompleteSubtitle: (n) => `${n} word${n === 1 ? '' : 's'} covered. Great class!`,
    playAnother: 'Play another round',
    backToDashboard: 'Back to dashboard',
    modeClassic: 'Classic',
    modeListening: 'Listening',
    modeReverse: 'Reverse',
    modeFillBlank: 'Fill the blank',
    modeTrueFalse: 'True or False',
    modeFlashcards: 'Flashcards',
    modeSpelling: 'Spelling',
    modeScramble: 'Scramble',
    modeLetterSounds: 'Letter Sounds',
    modeMatching: 'Matching',
    modeMemoryFlip: 'Memory Flip',
    modeSentenceBuilder: 'Sentence Builder',
    modeIdiom: 'Idioms',
    modeSpeedRound: 'Speed Round',
    modeWordChains: 'Word Chains',
    spellingHint: 'Type each letter as the class calls it out',
    scrambleHint: 'Class shouts the answer · tap reveal',
    matchingHint: 'Tap an English word, then its translation',
    memoryFlipHint: 'Tap two cards · class remembers locations',
    sentenceBuilderHint: 'Tap tiles in order as the class calls them',
    letterSoundsHint: 'Tap the speaker to play the sound',
    reset: 'Reset',
    set1: 'Set 1',
    set2: 'Set 2',
    set3: 'Set 3',
    fromAssignment: 'From assignment',
    trueLabel: 'TRUE',
    falseLabel: 'FALSE',
    flipCard: 'Tap card to flip',
    tapPlayAudio: 'Tap speaker to play',
  },
  he: {
    classShow: 'מצב כיתה',
    projectToClass: 'הקרן לכיתה',
    printWorksheet: 'הדפס דף עבודה',
    pickMode: 'בחר מצב',
    pickWordSource: 'מקור המילים',
    questionCount: 'מספר מילים',
    questionCountAll: 'כל המילים',
    startShow: 'התחל',
    questionOf: (n, total) => `שאלה ${n} מתוך ${total}`,
    reveal: 'הצג תשובה',
    correctAnswer: 'תשובה נכונה:',
    skip: 'דלג',
    next: 'הבא',
    endShow: 'סיים',
    showComplete: 'סיימנו!',
    showCompleteSubtitle: (n) => `כיסינו ${n} מילים. כיתה מצוינת!`,
    playAnother: 'סבב נוסף',
    backToDashboard: 'חזרה ללוח',
    modeClassic: 'קלאסי',
    modeListening: 'הקשבה',
    modeReverse: 'הפוך',
    modeFillBlank: 'השלם את החסר',
    modeTrueFalse: 'נכון או לא נכון',
    modeFlashcards: 'כרטיסיות',
    modeSpelling: 'איות',
    modeScramble: 'ערבוב',
    modeLetterSounds: 'צלילי אותיות',
    modeMatching: 'התאמה',
    modeMemoryFlip: 'משחק זיכרון',
    modeSentenceBuilder: 'בנה משפט',
    modeIdiom: 'ביטויים',
    modeSpeedRound: 'סבב מהיר',
    modeWordChains: 'שרשרת מילים',
    spellingHint: 'הקלד כל אות שהכיתה קוראת',
    scrambleHint: 'הכיתה אומרת את התשובה · לחץ הצג',
    matchingHint: 'לחץ מילה באנגלית ואז את התרגום',
    memoryFlipHint: 'לחץ שני כרטיסים · הכיתה זוכרת מיקומים',
    sentenceBuilderHint: 'לחץ אריחים לפי הסדר שהכיתה קוראת',
    letterSoundsHint: 'לחץ על הרמקול להשמעת הצליל',
    reset: 'אפס',
    set1: 'סט 1',
    set2: 'סט 2',
    set3: 'סט 3',
    fromAssignment: 'מהמשימה',
    trueLabel: 'נכון',
    falseLabel: 'לא נכון',
    flipCard: 'לחץ על הכרטיס',
    tapPlayAudio: 'לחץ על הרמקול',
  },
  ar: {
    classShow: 'وضع الصف',
    projectToClass: 'اعرض على الصف',
    printWorksheet: 'اطبع ورقة عمل',
    pickMode: 'اختر الوضع',
    pickWordSource: 'مصدر الكلمات',
    questionCount: 'عدد الكلمات',
    questionCountAll: 'كل الكلمات',
    startShow: 'ابدأ',
    questionOf: (n, total) => `السؤال ${n} من ${total}`,
    reveal: 'اكشف الإجابة',
    correctAnswer: 'الإجابة الصحيحة:',
    skip: 'تخطى',
    next: 'التالي',
    endShow: 'إنهاء',
    showComplete: 'انتهينا!',
    showCompleteSubtitle: (n) => `غطّينا ${n} كلمة. صف ممتاز!`,
    playAnother: 'جولة أخرى',
    backToDashboard: 'العودة للوحة',
    modeClassic: 'كلاسيكي',
    modeListening: 'استماع',
    modeReverse: 'عكسي',
    modeFillBlank: 'املأ الفراغ',
    modeTrueFalse: 'صح أم خطأ',
    modeFlashcards: 'بطاقات',
    modeSpelling: 'تهجئة',
    modeScramble: 'خلط',
    modeLetterSounds: 'أصوات الحروف',
    modeMatching: 'مطابقة',
    modeMemoryFlip: 'لعبة الذاكرة',
    modeSentenceBuilder: 'ابن جملة',
    modeIdiom: 'التعابير',
    modeSpeedRound: 'جولة سريعة',
    modeWordChains: 'سلاسل الكلمات',
    spellingHint: 'اكتب كل حرف كما يقوله الصف',
    scrambleHint: 'الصف يقول الإجابة · اضغط اكشف',
    matchingHint: 'اضغط كلمة إنجليزية ثم ترجمتها',
    memoryFlipHint: 'اضغط بطاقتين · الصف يتذكر المواقع',
    sentenceBuilderHint: 'اضغط البلاط بالترتيب الذي يقوله الصف',
    letterSoundsHint: 'اضغط السماعة لتشغيل الصوت',
    reset: 'إعادة',
    set1: 'مجموعة 1',
    set2: 'مجموعة 2',
    set3: 'مجموعة 3',
    fromAssignment: 'من المهمة',
    trueLabel: 'صح',
    falseLabel: 'خطأ',
    flipCard: 'اضغط على البطاقة',
    tapPlayAudio: 'اضغط على السماعة',
  },
};
