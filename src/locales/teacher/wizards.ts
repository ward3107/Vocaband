/**
 * Locale file for the assignment + Quick Play setup wizards.
 *
 * Covers:
 *  - SetupWizard shell (TopAppBar titles, Stepper "Optional" label)
 *  - ConfigureStep (Step 2 of 3 — modes, title, instructions, sentences, schedule)
 *  - ReviewStep (Step 3 of 3 — summary, Edit, Save as template, Launch)
 *  - CreateAssignmentWizard success screen + toasts
 *  - QuickPlaySetupView wrapper-level copy
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherWizardsT {
  // ─── SetupWizard shell ──────────────────────────────────────────
  qpSetupTitle: string;
  qpSetupSubtitle: string;
  editAssignmentTitle: string;
  createAssignmentTitle: string;
  assignmentSubtitle: string;
  optional: string;
  stepLabelWords: string;
  stepLabelChooseModesOptional: string;
  stepLabelConfigure: string;
  stepLabelReview: string;
  authRequired: string;

  // ─── ConfigureStep — header ─────────────────────────────────────
  back: string;
  step2Of3: string;
  configureAssignmentHeading: string;
  configureQpHeading: string;
  configureAssignmentSubheading: string;
  configureQpSubheading: string;

  // ─── Game modes section ─────────────────────────────────────────
  gameModesLabel: string;
  resetDefault: string;
  selectAll: string;
  diffBeginner: string;
  diffIntermediate: string;
  diffAdvanced: string;
  diffMastery: string;
  nextNameIt: string;

  // ─── Title + instructions ──────────────────────────────────────
  detailsLabelAssignment: string;
  detailsLabelQp: string;
  pickModesNudge: string;
  assignmentTitleLabel: string;
  sessionTitleLabel: string;
  optionalParen: string;
  titlePlaceholderAssignment: string;
  titlePlaceholderQp: string;
  instructionsLabelAssignment: string;
  instructionsLabelQp: string;
  instructionsPlaceholderAssignment: string;
  instructionsPlaceholderQp: string;

  // ─── Sentence config ───────────────────────────────────────────
  sentenceBuilderHeading: string;
  fillBlankHeading: string;
  difficultyLevelLabel: string;
  generateAi: string;
  generatingAi: string;
  addOwnSentencesLabel: string;
  sentencePlaceholder: string;
  addBtn: string;
  generatedSentencesLabel: (n: number) => string;
  removeSentenceTitle: string;
  editSentenceTitle: (n: number) => string;
  cancel: string;
  done: string;

  // ─── Schedule ──────────────────────────────────────────────────
  scheduleOptional: string;
  deadlineLabel: string;
  deadlinePickerPlaceholder: string;

  // ─── Navigation buttons ────────────────────────────────────────
  reviewCta: string;
  skipToQr: string;

  // ─── ReviewStep ────────────────────────────────────────────────
  step3Of3: string;
  reviewAssignmentHeading: string;
  reviewQpHeading: string;
  reviewAssignmentSubheading: string;
  reviewQpSubheading: string;
  editWordsFull: string;
  editWordsShort: string;
  editModesFull: string;
  editModesShort: string;
  readyToPlay: string;
  /** "{w} words • {m} game modes loaded". */
  loadedSummary: (w: number, m: number) => string;
  wordsPill: (n: number) => string;
  modesPill: (n: number) => string;
  wordsCountLabel: (n: number) => string;
  modesCountLabel: (n: number) => string;
  reviewAssignmentTitleLabel: string;
  untitledAssignment: string;
  reviewClassLabel: string;
  reviewDeadlineLabel: string;
  reviewInstructionsLabel: string;
  selectedWordsHeading: string;
  customWordsBadge: (n: number) => string;
  gameModesHeading: string;
  saveAsTemplateLabel: string;
  saveAsTemplateBlurb: string;
  updateAssignment: string;
  assignToClass: string;
  generateQrCode: string;

  // ─── CreateAssignmentWizard success screen ─────────────────────
  classCodeCopied: string;
  joinMessage: (code: string) => string;
  assignmentUpdatedTitle: string;
  assignmentCreatedTitle: string;
  assignmentUpdatedSubtitle: string;
  assignmentCreatedSubtitle: string;
  /** "{n} words". */
  successWordsCount: (n: number) => string;
  /** "{n} modes". */
  successModesCount: (n: number) => string;
  shareWithStudents: string;
  copyCode: string;
  copiedShort: string;
  whatsAppLabel: string;
  createAnother: string;
  backToDashboard: string;
}

export const teacherWizardsT: Record<Language, TeacherWizardsT> = {
  en: {
    qpSetupTitle: "Quick Play Setup",
    qpSetupSubtitle: "SELECT WORDS • GENERATE QR CODE",
    editAssignmentTitle: "Edit Assignment",
    createAssignmentTitle: "Create Assignment",
    assignmentSubtitle: "SELECT WORDS • ASSIGN TO CLASS",
    optional: "Optional",
    stepLabelWords: "Select Words",
    stepLabelChooseModesOptional: "Choose Modes (Optional)",
    stepLabelConfigure: "Configure",
    stepLabelReview: "Review",
    authRequired: "Authentication required",

    back: "Back",
    step2Of3: "Step 2 of 3",
    configureAssignmentHeading: "Configure assignment",
    configureQpHeading: "Configure Quick Play",
    configureAssignmentSubheading: "Pick game modes first — we’ll suggest the rest",
    configureQpSubheading: "Pick modes, then add an optional title",

    gameModesLabel: "Game modes",
    resetDefault: "Reset default",
    selectAll: "Select all",
    diffBeginner: "Beginner",
    diffIntermediate: "Intermediate",
    diffAdvanced: "Advanced",
    diffMastery: "Mastery",
    nextNameIt: "next: name it",

    detailsLabelAssignment: "Name and instruct",
    detailsLabelQp: "Label this session",
    pickModesNudge: "Pick one or more game modes above and we'll suggest a title automatically. You can always edit it.",
    assignmentTitleLabel: "Assignment title",
    sessionTitleLabel: "Session title",
    optionalParen: "(optional)",
    titlePlaceholderAssignment: "e.g., Fruits Vocabulary - Unit 5",
    titlePlaceholderQp: "e.g., Period 3 warm-up",
    instructionsLabelAssignment: "Instructions for students",
    instructionsLabelQp: "Notes (optional)",
    instructionsPlaceholderAssignment: "Add a note for your students...",
    instructionsPlaceholderQp: "e.g., Remember to use headphones",

    sentenceBuilderHeading: "Sentence Builder Setup",
    fillBlankHeading: "Fill-in-the-Blank Setup",
    difficultyLevelLabel: "Sentence Difficulty Level",
    generateAi: "Generate with AI",
    generatingAi: "Generating AI sentences...",
    addOwnSentencesLabel: "Add Your Own Sentences",
    sentencePlaceholder: "Write or paste your sentence here...",
    addBtn: "Add",
    generatedSentencesLabel: (n) => `Generated Sentences (${n}) — hover to preview, click to edit`,
    removeSentenceTitle: "Remove sentence",
    editSentenceTitle: (n) => `Edit Sentence #${n}`,
    cancel: "Cancel",
    done: "Done",

    scheduleOptional: "Schedule (optional)",
    deadlineLabel: "Deadline",
    deadlinePickerPlaceholder: "Pick deadline date and time",

    reviewCta: "Review",
    skipToQr: "Skip to QR",

    step3Of3: "Step 3 of 3",
    reviewAssignmentHeading: "Review assignment",
    reviewQpHeading: "Review your selection",
    reviewAssignmentSubheading: "Check everything before assigning",
    reviewQpSubheading: "Verify your selection",
    editWordsFull: "Edit Words",
    editWordsShort: "Words",
    editModesFull: "Edit Modes",
    editModesShort: "Modes",
    readyToPlay: "Ready to Play! 🎮",
    loadedSummary: (w, m) => `${w} word${w === 1 ? '' : 's'} • ${m} game mode${m === 1 ? '' : 's'} loaded`,
    wordsPill: (n) => `📚 ${n} word${n === 1 ? '' : 's'}`,
    modesPill: (n) => `🎯 ${n} mode${n === 1 ? '' : 's'}`,
    wordsCountLabel: (n) => `Word${n === 1 ? '' : 's'}`,
    modesCountLabel: (n) => `Mode${n === 1 ? '' : 's'}`,
    reviewAssignmentTitleLabel: "Assignment Title",
    untitledAssignment: "Untitled Assignment",
    reviewClassLabel: "Class",
    reviewDeadlineLabel: "Deadline",
    reviewInstructionsLabel: "Instructions",
    selectedWordsHeading: "Selected Words",
    customWordsBadge: (n) => `✨ ${n} custom word${n === 1 ? '' : 's'} (session-only)`,
    gameModesHeading: "Game Modes",
    saveAsTemplateLabel: "Save as template + word group",
    saveAsTemplateBlurb: "Reuse this exact task in one tap, AND save these words under \"Saved Groups\" so future assignments can pick them up.",
    updateAssignment: "Update Assignment",
    assignToClass: "Assign to Class",
    generateQrCode: "Generate QR Code",

    classCodeCopied: "Class code copied!",
    joinMessage: (code) => `Join my class on VocabAnd! Class code: ${code}`,
    assignmentUpdatedTitle: "Assignment Updated!",
    assignmentCreatedTitle: "Assignment Created!",
    assignmentUpdatedSubtitle: "Your changes have been saved successfully",
    assignmentCreatedSubtitle: "Your students can now access this assignment",
    successWordsCount: (n) => `${n} word${n === 1 ? '' : 's'}`,
    successModesCount: (n) => `${n} mode${n === 1 ? '' : 's'}`,
    shareWithStudents: "Share with students",
    copyCode: "Copy code",
    copiedShort: "Copied!",
    whatsAppLabel: "WhatsApp",
    createAnother: "Create another",
    backToDashboard: "Back to dashboard",
  },

  he: {
    qpSetupTitle: "הגדרת משחק מהיר",
    qpSetupSubtitle: "בחר מילים • צור קוד QR",
    editAssignmentTitle: "עריכת משימה",
    createAssignmentTitle: "יצירת משימה",
    assignmentSubtitle: "בחר מילים • שייך לכיתה",
    optional: "אופציונלי",
    stepLabelWords: "בחר מילים",
    stepLabelChooseModesOptional: "בחר מצבים (אופציונלי)",
    stepLabelConfigure: "הגדרות",
    stepLabelReview: "סקירה",
    authRequired: "נדרשת התחברות",

    back: "חזור",
    step2Of3: "שלב 2 מתוך 3",
    configureAssignmentHeading: "הגדרת משימה",
    configureQpHeading: "הגדרת משחק מהיר",
    configureAssignmentSubheading: "בחר תחילה את מצבי המשחק — נציע את השאר",
    configureQpSubheading: "בחר מצבים, ולאחר מכן הוסף כותרת אופציונלית",

    gameModesLabel: "מצבי משחק",
    resetDefault: "שחזר ברירת מחדל",
    selectAll: "בחר הכול",
    diffBeginner: "מתחיל",
    diffIntermediate: "בינוני",
    diffAdvanced: "מתקדם",
    diffMastery: "שליטה",
    nextNameIt: "הבא: תן שם",

    detailsLabelAssignment: "שם והוראות",
    detailsLabelQp: "תווית למפגש",
    pickModesNudge: "בחר מצב משחק אחד או יותר למעלה ונציע כותרת אוטומטית. תמיד ניתן לערוך.",
    assignmentTitleLabel: "כותרת המשימה",
    sessionTitleLabel: "כותרת המפגש",
    optionalParen: "(אופציונלי)",
    titlePlaceholderAssignment: "לדוגמה: אוצר מילים - יחידה 5",
    titlePlaceholderQp: "לדוגמה: חימום שיעור 3",
    instructionsLabelAssignment: "הוראות לתלמידים",
    instructionsLabelQp: "הערות (אופציונלי)",
    instructionsPlaceholderAssignment: "הוסף הערה עבור התלמידים שלך...",
    instructionsPlaceholderQp: "לדוגמה: זכרו להשתמש באוזניות",

    sentenceBuilderHeading: "הגדרת בונה משפטים",
    fillBlankHeading: "הגדרת השלם את החסר",
    difficultyLevelLabel: "רמת קושי המשפטים",
    generateAi: "צור באמצעות AI",
    generatingAi: "יוצר משפטים עם AI...",
    addOwnSentencesLabel: "הוסף משפטים משלך",
    sentencePlaceholder: "כתוב או הדבק את המשפט שלך כאן...",
    addBtn: "הוסף",
    generatedSentencesLabel: (n) => `משפטים (${n}) — רחף לתצוגה מקדימה, לחץ לעריכה`,
    removeSentenceTitle: "הסר משפט",
    editSentenceTitle: (n) => `עריכת משפט #${n}`,
    cancel: "ביטול",
    done: "סיום",

    scheduleOptional: "תזמון (אופציונלי)",
    deadlineLabel: "מועד אחרון",
    deadlinePickerPlaceholder: "בחר תאריך ושעה",

    reviewCta: "סקירה",
    skipToQr: "דלג ל-QR",

    step3Of3: "שלב 3 מתוך 3",
    reviewAssignmentHeading: "סקירת המשימה",
    reviewQpHeading: "סקירת הבחירה שלך",
    reviewAssignmentSubheading: "בדוק הכל לפני שיוך",
    reviewQpSubheading: "אמת את הבחירה",
    editWordsFull: "ערוך מילים",
    editWordsShort: "מילים",
    editModesFull: "ערוך מצבים",
    editModesShort: "מצבים",
    readyToPlay: "מוכנים לשחק! 🎮",
    loadedSummary: (w, m) => `${w} ${w === 1 ? "מילה" : "מילים"} • ${m} ${m === 1 ? "מצב משחק" : "מצבי משחק"} נטענו`,
    wordsPill: (n) => `📚 ${n} ${n === 1 ? "מילה" : "מילים"}`,
    modesPill: (n) => `🎯 ${n} ${n === 1 ? "מצב" : "מצבים"}`,
    wordsCountLabel: (n) => (n === 1 ? "מילה" : "מילים"),
    modesCountLabel: (n) => (n === 1 ? "מצב" : "מצבים"),
    reviewAssignmentTitleLabel: "כותרת המשימה",
    untitledAssignment: "משימה ללא שם",
    reviewClassLabel: "כיתה",
    reviewDeadlineLabel: "מועד אחרון",
    reviewInstructionsLabel: "הוראות",
    selectedWordsHeading: "מילים נבחרות",
    customWordsBadge: (n) => `✨ ${n} ${n === 1 ? "מילה מותאמת" : "מילים מותאמות"} (למפגש זה בלבד)`,
    gameModesHeading: "מצבי משחק",
    saveAsTemplateLabel: "שמור כתבנית + קבוצת מילים",
    saveAsTemplateBlurb: "השתמש שוב במשימה זו בלחיצה אחת ושמור את המילים תחת \"קבוצות שמורות\" לשימוש במשימות עתידיות.",
    updateAssignment: "עדכן משימה",
    assignToClass: "שייך לכיתה",
    generateQrCode: "צור קוד QR",

    classCodeCopied: "קוד הכיתה הועתק!",
    joinMessage: (code) => `הצטרף לכיתה שלי ב-Vocaband! קוד כיתה: ${code}`,
    assignmentUpdatedTitle: "המשימה עודכנה!",
    assignmentCreatedTitle: "המשימה נוצרה!",
    assignmentUpdatedSubtitle: "השינויים נשמרו בהצלחה",
    assignmentCreatedSubtitle: "התלמידים שלך יכולים כעת לגשת למשימה",
    successWordsCount: (n) => `${n} ${n === 1 ? "מילה" : "מילים"}`,
    successModesCount: (n) => `${n} ${n === 1 ? "מצב" : "מצבים"}`,
    shareWithStudents: "שתף עם התלמידים",
    copyCode: "העתק קוד",
    copiedShort: "הועתק!",
    whatsAppLabel: "וואטסאפ",
    createAnother: "צור עוד",
    backToDashboard: "חזרה ללוח הבקרה",
  },

  ar: {
    qpSetupTitle: "إعداد اللعب السريع",
    qpSetupSubtitle: "اختر الكلمات • أنشئ رمز QR",
    editAssignmentTitle: "تعديل الواجب",
    createAssignmentTitle: "إنشاء واجب",
    assignmentSubtitle: "اختر الكلمات • عيّن للفصل",
    optional: "اختياري",
    stepLabelWords: "اختر الكلمات",
    stepLabelChooseModesOptional: "اختر الأنماط (اختياري)",
    stepLabelConfigure: "الإعدادات",
    stepLabelReview: "المراجعة",
    authRequired: "تسجيل الدخول مطلوب",

    back: "رجوع",
    step2Of3: "الخطوة 2 من 3",
    configureAssignmentHeading: "إعداد الواجب",
    configureQpHeading: "إعداد اللعب السريع",
    configureAssignmentSubheading: "اختر أنماط اللعب أولاً — وسنقترح الباقي",
    configureQpSubheading: "اختر الأنماط، ثم أضف عنوانًا اختياريًا",

    gameModesLabel: "أنماط اللعب",
    resetDefault: "إعادة الافتراضي",
    selectAll: "اختر الكل",
    diffBeginner: "مبتدئ",
    diffIntermediate: "متوسط",
    diffAdvanced: "متقدم",
    diffMastery: "إتقان",
    nextNameIt: "التالي: سمِّه",

    detailsLabelAssignment: "الاسم والإرشادات",
    detailsLabelQp: "تسمية الجلسة",
    pickModesNudge: "اختر نمط لعب واحدًا أو أكثر بالأعلى وسنقترح عنوانًا تلقائيًا. يمكنك دائمًا تعديله.",
    assignmentTitleLabel: "عنوان الواجب",
    sessionTitleLabel: "عنوان الجلسة",
    optionalParen: "(اختياري)",
    titlePlaceholderAssignment: "مثلاً: مفردات الفواكه - الوحدة 5",
    titlePlaceholderQp: "مثلاً: تسخين الحصة 3",
    instructionsLabelAssignment: "تعليمات للطلاب",
    instructionsLabelQp: "ملاحظات (اختياري)",
    instructionsPlaceholderAssignment: "أضف ملاحظة لطلابك...",
    instructionsPlaceholderQp: "مثلاً: تذكروا استخدام السماعات",

    sentenceBuilderHeading: "إعداد بناء الجمل",
    fillBlankHeading: "إعداد ملء الفراغ",
    difficultyLevelLabel: "مستوى صعوبة الجمل",
    generateAi: "أنشئ عبر AI",
    generatingAi: "جارٍ إنشاء جمل بالذكاء الاصطناعي...",
    addOwnSentencesLabel: "أضف جملك الخاصة",
    sentencePlaceholder: "اكتب أو الصق جملتك هنا...",
    addBtn: "إضافة",
    generatedSentencesLabel: (n) => `الجمل (${n}) — مرر للمعاينة، انقر للتعديل`,
    removeSentenceTitle: "إزالة الجملة",
    editSentenceTitle: (n) => `تعديل الجملة #${n}`,
    cancel: "إلغاء",
    done: "تم",

    scheduleOptional: "الجدولة (اختياري)",
    deadlineLabel: "الموعد النهائي",
    deadlinePickerPlaceholder: "اختر تاريخ ووقت الموعد",

    reviewCta: "مراجعة",
    skipToQr: "تخطّي إلى QR",

    step3Of3: "الخطوة 3 من 3",
    reviewAssignmentHeading: "مراجعة الواجب",
    reviewQpHeading: "مراجعة اختيارك",
    reviewAssignmentSubheading: "تحقق من كل شيء قبل التعيين",
    reviewQpSubheading: "تحقق من اختيارك",
    editWordsFull: "تعديل الكلمات",
    editWordsShort: "كلمات",
    editModesFull: "تعديل الأنماط",
    editModesShort: "أنماط",
    readyToPlay: "جاهز للعب! 🎮",
    loadedSummary: (w, m) => `${w} ${w === 1 ? "كلمة" : "كلمات"} • ${m} ${m === 1 ? "نمط لعب" : "أنماط لعب"} محمّلة`,
    wordsPill: (n) => `📚 ${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    modesPill: (n) => `🎯 ${n} ${n === 1 ? "نمط" : "أنماط"}`,
    wordsCountLabel: (n) => (n === 1 ? "كلمة" : "كلمات"),
    modesCountLabel: (n) => (n === 1 ? "نمط" : "أنماط"),
    reviewAssignmentTitleLabel: "عنوان الواجب",
    untitledAssignment: "واجب بدون عنوان",
    reviewClassLabel: "الفصل",
    reviewDeadlineLabel: "الموعد النهائي",
    reviewInstructionsLabel: "التعليمات",
    selectedWordsHeading: "الكلمات المختارة",
    customWordsBadge: (n) => `✨ ${n} ${n === 1 ? "كلمة مخصصة" : "كلمات مخصصة"} (لهذه الجلسة فقط)`,
    gameModesHeading: "أنماط اللعب",
    saveAsTemplateLabel: "حفظ كقالب + مجموعة كلمات",
    saveAsTemplateBlurb: "أعد استخدام هذه المهمة بنقرة واحدة، واحفظ هذه الكلمات تحت \"المجموعات المحفوظة\" للاستخدام في الواجبات القادمة.",
    updateAssignment: "تحديث الواجب",
    assignToClass: "عيّن للفصل",
    generateQrCode: "أنشئ رمز QR",

    classCodeCopied: "تم نسخ رمز الفصل!",
    joinMessage: (code) => `انضم إلى صفي على Vocaband! رمز الصف: ${code}`,
    assignmentUpdatedTitle: "تم تحديث الواجب!",
    assignmentCreatedTitle: "تم إنشاء الواجب!",
    assignmentUpdatedSubtitle: "تم حفظ تغييراتك بنجاح",
    assignmentCreatedSubtitle: "يمكن لطلابك الآن الوصول إلى هذا الواجب",
    successWordsCount: (n) => `${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    successModesCount: (n) => `${n} ${n === 1 ? "نمط" : "أنماط"}`,
    shareWithStudents: "شارك مع الطلاب",
    copyCode: "انسخ الرمز",
    copiedShort: "تم النسخ!",
    whatsAppLabel: "واتساب",
    createAnother: "أنشئ آخر",
    backToDashboard: "العودة إلى لوحة التحكم",
  },
};
