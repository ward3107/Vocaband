/**
 * Locale strings for the Library sentence-generation modal.
 * Distinct from the Build Wizard's locale file because this is a
 * separate surface — opened by tapping a saved set, not from the "+
 * New Set" flow.
 */
import type { Language } from "../../hooks/useLanguage";

export type SentenceLevelKey = "A1" | "A2" | "B1" | "B2";
export type SentenceKindKey = "sentence" | "fill_blank";

export interface SentenceGenerationStrings {
  // Modal chrome
  modalTitle: (setName: string) => string;
  modalCloseAria: string;
  back: string;
  cancel: string;
  saveSelected: string;
  saving: string;
  saved: (n: number) => string;

  // Step 1 — picker
  pickLevelHeading: string;
  pickLevelSubtitle: string;
  /** Level option labels — keep them grade-anchored for Israeli teachers. */
  levelA1Title: string;
  levelA1Sub: string;
  levelA2Title: string;
  levelA2Sub: string;
  levelB1Title: string;
  levelB1Sub: string;
  levelB2Title: string;
  levelB2Sub: string;

  outputTypeHeading: string;
  outputTypeSubtitle: string;
  outputFillBlank: string;
  outputSentence: string;

  generate: string;
  generating: string;

  // Step 2 — review
  reviewHeading: string;
  reviewSubtitle: (count: number, level: string) => string;
  candidatesLabel: (n: number) => string;
  noCandidates: string;
  regenerateThisWord: string;
  regenerating: string;
  /** "You've regenerated this 3 times — try editing manually." */
  regenerateCapReached: string;
  editAria: string;
  editPlaceholder: string;
  editSave: string;
  editCancel: string;
  removeAria: string;
  showFullSentenceToggle: string;
  fullSentenceLabel: string;
  fillBlankLabel: string;

  // Errors / toasts
  errorLoad: string;
  errorGenerate: string;
  errorQuota: string;
  errorSave: string;
  errorPickAtLeastOne: string;
}

export const sentenceGenerationT: Record<Language, SentenceGenerationStrings> = {
  en: {
    modalTitle: (setName) => `Generate sentences · ${setName}`,
    modalCloseAria: "Close",
    back: "Back",
    cancel: "Cancel",
    saveSelected: "Save selected",
    saving: "Saving…",
    saved: (n) => `Saved ${n} ${n === 1 ? "sentence" : "sentences"} 📚`,

    pickLevelHeading: "Pick a level",
    pickLevelSubtitle: "We'll write sentences that match your class — short and concrete for younger students, richer for older ones.",
    levelA1Title: "Beginner",
    levelA1Sub: "Grade 4-5 · 5-8 word sentences, present tense",
    levelA2Title: "Elementary",
    levelA2Sub: "Grade 6-7 · 7-10 word sentences, past + present",
    levelB1Title: "Intermediate",
    levelB1Sub: "Grade 8-9 · 9-14 word sentences, mixed tenses",
    levelB2Title: "Advanced / Bagrut",
    levelB2Sub: "Bagrut prep · 12-18 word sentences, complex grammar",

    outputTypeHeading: "What should we generate?",
    outputTypeSubtitle: "Fill-in-the-blank is the default — it's what most teachers print or use in Sentence Builder.",
    outputFillBlank: "Fill-in-the-blank",
    outputSentence: "Also keep the full sentence",

    generate: "Generate 3 candidates per word",
    generating: "Generating…",

    reviewHeading: "Pick the best one for each word",
    reviewSubtitle: (count, level) => `${count} ${count === 1 ? "word" : "words"} · level ${level} · 3 candidates each. Edit any sentence inline; ✓ what you want to keep.`,
    candidatesLabel: (n) => `${n} ${n === 1 ? "candidate" : "candidates"}`,
    noCandidates: "AI couldn't find a good sentence for this word. Try regenerating or edit manually.",
    regenerateThisWord: "Regenerate this word",
    regenerating: "Regenerating…",
    regenerateCapReached: "Regenerated 3 times — try editing manually instead.",
    editAria: "Edit sentence",
    editPlaceholder: "Write your own sentence — use ______ to mark the blank.",
    editSave: "Save edit",
    editCancel: "Cancel",
    removeAria: "Skip this word",
    showFullSentenceToggle: "Show full sentence",
    fullSentenceLabel: "Full",
    fillBlankLabel: "Fill",

    errorLoad: "Couldn't load this set's words. Please try again.",
    errorGenerate: "Couldn't generate sentences. Please try again.",
    errorQuota: "You've hit today's sentence-generation quota. Try again tomorrow.",
    errorSave: "Couldn't save sentences. Please try again.",
    errorPickAtLeastOne: "Pick at least one candidate per word, or skip words you don't want.",
  },
  he: {
    modalTitle: (setName) => `יצירת משפטים · ${setName}`,
    modalCloseAria: "סגור",
    back: "חזרה",
    cancel: "ביטול",
    saveSelected: "שמור נבחרים",
    saving: "שומר…",
    saved: (n) => `נשמרו ${n} ${n === 1 ? "משפט" : "משפטים"} 📚`,

    pickLevelHeading: "בחרו רמה",
    pickLevelSubtitle: "נכתוב משפטים שמתאימים לכיתה שלכם — קצרים וקונקרטיים לתלמידים צעירים יותר, עשירים יותר למבוגרים.",
    levelA1Title: "מתחילים",
    levelA1Sub: "כיתות ד-ה · משפטים בני 5-8 מילים, הווה",
    levelA2Title: "יסודי",
    levelA2Sub: "כיתות ו-ז · משפטים בני 7-10 מילים, עבר + הווה",
    levelB1Title: "בינוני",
    levelB1Sub: "כיתות ח-ט · משפטים בני 9-14 מילים, זמנים מעורבים",
    levelB2Title: "מתקדמים / בגרות",
    levelB2Sub: "הכנה לבגרות · משפטים בני 12-18 מילים, דקדוק מורכב",

    outputTypeHeading: "מה ליצור?",
    outputTypeSubtitle: "השלמת החסר היא ברירת המחדל — זה מה שמורות בדרך כלל מדפיסות או משתמשות בו ב־Sentence Builder.",
    outputFillBlank: "השלמת החסר",
    outputSentence: "שמרו גם את המשפט המלא",

    generate: "צור 3 הצעות לכל מילה",
    generating: "יוצר…",

    reviewHeading: "בחרו את ההצעה הטובה ביותר לכל מילה",
    reviewSubtitle: (count, level) => `${count} ${count === 1 ? "מילה" : "מילים"} · רמה ${level} · 3 הצעות לכל אחת. ניתן לערוך כל משפט; סמנו ✓ את מה שתרצו לשמור.`,
    candidatesLabel: (n) => `${n} ${n === 1 ? "הצעה" : "הצעות"}`,
    noCandidates: "ה־AI לא הצליח למצוא משפט טוב למילה הזו. נסו ליצור מחדש או לערוך ידנית.",
    regenerateThisWord: "צור מחדש למילה זו",
    regenerating: "יוצר מחדש…",
    regenerateCapReached: "כבר נוצרו מחדש 3 פעמים — נסו לערוך ידנית.",
    editAria: "ערוך משפט",
    editPlaceholder: "כתבו משפט משלכם — השתמשו ב־______ לציון החסר.",
    editSave: "שמור עריכה",
    editCancel: "ביטול",
    removeAria: "דלג על מילה זו",
    showFullSentenceToggle: "הצג משפט מלא",
    fullSentenceLabel: "מלא",
    fillBlankLabel: "השלמה",

    errorLoad: "לא הצלחנו לטעון את המילים. נסו שוב.",
    errorGenerate: "יצירת המשפטים נכשלה. נסו שוב.",
    errorQuota: "הגעתם למכסת יצירת המשפטים היומית. נסו שוב מחר.",
    errorSave: "שמירת המשפטים נכשלה. נסו שוב.",
    errorPickAtLeastOne: "בחרו לפחות הצעה אחת לכל מילה, או דלגו על מילים שלא תרצו.",
  },
  ar: {
    modalTitle: (setName) => `توليد الجمل · ${setName}`,
    modalCloseAria: "إغلاق",
    back: "رجوع",
    cancel: "إلغاء",
    saveSelected: "احفظ المختار",
    saving: "جارٍ الحفظ…",
    saved: (n) => `تم حفظ ${n} ${n === 1 ? "جملة" : "جمل"} 📚`,

    pickLevelHeading: "اختر المستوى",
    pickLevelSubtitle: "سنكتب جملًا تناسب صفّك — قصيرة وملموسة للطلاب الأصغر، أغنى للأكبر.",
    levelA1Title: "مبتدئ",
    levelA1Sub: "الصف 4-5 · جمل من 5-8 كلمات، زمن المضارع",
    levelA2Title: "أساسي",
    levelA2Sub: "الصف 6-7 · جمل من 7-10 كلمات، مضارع + ماضٍ",
    levelB1Title: "متوسط",
    levelB1Sub: "الصف 8-9 · جمل من 9-14 كلمة، أزمنة مختلطة",
    levelB2Title: "متقدّم / Bagrut",
    levelB2Sub: "تحضير Bagrut · جمل من 12-18 كلمة، قواعد معقّدة",

    outputTypeHeading: "ماذا نولّد؟",
    outputTypeSubtitle: "املأ الفراغ هو الافتراضي — هو ما يطبعه معظم المعلّمين أو يستخدمونه في Sentence Builder.",
    outputFillBlank: "املأ الفراغ",
    outputSentence: "احتفظ أيضًا بالجملة الكاملة",

    generate: "ولّد 3 اقتراحات لكل كلمة",
    generating: "جارٍ التوليد…",

    reviewHeading: "اختر الأفضل لكل كلمة",
    reviewSubtitle: (count, level) => `${count} ${count === 1 ? "كلمة" : "كلمات"} · المستوى ${level} · 3 اقتراحات لكل كلمة. عدّل أي جملة؛ علّم ✓ ما تريد الإبقاء عليه.`,
    candidatesLabel: (n) => `${n} ${n === 1 ? "اقتراح" : "اقتراحات"}`,
    noCandidates: "لم يجد الذكاء الاصطناعي جملة مناسبة لهذه الكلمة. حاول التوليد مجددًا أو حرّر يدويًا.",
    regenerateThisWord: "ولّد مجددًا لهذه الكلمة",
    regenerating: "جارٍ التوليد مجددًا…",
    regenerateCapReached: "وُلِّد 3 مرات بالفعل — حاول التحرير اليدوي.",
    editAria: "تحرير الجملة",
    editPlaceholder: "اكتب جملتك — استخدم ______ لتحديد الفراغ.",
    editSave: "احفظ التحرير",
    editCancel: "إلغاء",
    removeAria: "تخطّ هذه الكلمة",
    showFullSentenceToggle: "إظهار الجملة الكاملة",
    fullSentenceLabel: "كاملة",
    fillBlankLabel: "فراغ",

    errorLoad: "تعذّر تحميل كلمات هذه القائمة. حاول مرة أخرى.",
    errorGenerate: "تعذّر توليد الجمل. حاول مرة أخرى.",
    errorQuota: "وصلت إلى حصّتك اليومية لتوليد الجمل. حاول غدًا.",
    errorSave: "تعذّر حفظ الجمل. حاول مرة أخرى.",
    errorPickAtLeastOne: "اختر اقتراحًا واحدًا على الأقل لكل كلمة، أو تخطَّ الكلمات التي لا تريدها.",
  },
  ru: {
    modalTitle: (setName) => `Generate sentences · ${setName}`,
    modalCloseAria: "Close",
    back: "Back",
    cancel: "Cancel",
    saveSelected: "Save selected",
    saving: "Saving…",
    saved: (n) => `Saved ${n} ${n === 1 ? "sentence" : "sentences"} 📚`,

    pickLevelHeading: "Pick a level",
    pickLevelSubtitle: "We'll write sentences that match your class — short and concrete for younger students, richer for older ones.",
    levelA1Title: "Beginner",
    levelA1Sub: "Grade 4-5 · 5-8 word sentences, present tense",
    levelA2Title: "Elementary",
    levelA2Sub: "Grade 6-7 · 7-10 word sentences, past + present",
    levelB1Title: "Intermediate",
    levelB1Sub: "Grade 8-9 · 9-14 word sentences, mixed tenses",
    levelB2Title: "Advanced / Bagrut",
    levelB2Sub: "Bagrut prep · 12-18 word sentences, complex grammar",

    outputTypeHeading: "What should we generate?",
    outputTypeSubtitle: "Fill-in-the-blank is the default — it's what most teachers print or use in Sentence Builder.",
    outputFillBlank: "Fill-in-the-blank",
    outputSentence: "Also keep the full sentence",

    generate: "Generate 3 candidates per word",
    generating: "Generating…",

    reviewHeading: "Pick the best one for each word",
    reviewSubtitle: (count, level) => `${count} ${count === 1 ? "word" : "words"} · level ${level} · 3 candidates each. Edit any sentence inline; ✓ what you want to keep.`,
    candidatesLabel: (n) => `${n} ${n === 1 ? "candidate" : "candidates"}`,
    noCandidates: "AI couldn't find a good sentence for this word. Try regenerating or edit manually.",
    regenerateThisWord: "Regenerate this word",
    regenerating: "Regenerating…",
    regenerateCapReached: "Regenerated 3 times — try editing manually instead.",
    editAria: "Edit sentence",
    editPlaceholder: "Write your own sentence — use ______ to mark the blank.",
    editSave: "Save edit",
    editCancel: "Cancel",
    removeAria: "Skip this word",
    showFullSentenceToggle: "Show full sentence",
    fullSentenceLabel: "Full",
    fillBlankLabel: "Fill",

    errorLoad: "Couldn't load this set's words. Please try again.",
    errorGenerate: "Couldn't generate sentences. Please try again.",
    errorQuota: "You've hit today's sentence-generation quota. Try again tomorrow.",
    errorSave: "Couldn't save sentences. Please try again.",
    errorPickAtLeastOne: "Pick at least one candidate per word, or skip words you don't want.",
  },
};
