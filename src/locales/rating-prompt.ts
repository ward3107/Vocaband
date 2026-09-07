/**
 * rating-prompt.ts — i18n strings for RatingPrompt (the in-app
 * NPS-style rating modal shown to teachers after enough class
 * activity, and to Quick Play students at the end of a session).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../hooks/useLanguage";

export interface RatingPromptStrings {
  closeAria: string;

  // Teacher path
  teacherHeading: string;
  teacherSubheading: string;
  starsAria: string;
  /** "{n} star" / "{n} stars" — used for the per-star ARIA. */
  starAria: (n: number) => string;
  tapToRate: string;
  oneStar: string;
  twoStars: string;
  threeStars: string;
  fourStars: string;
  fiveStars: string;
  sending: string;
  sendRating: string;

  // Student path
  studentHeading: string;
  studentSubheading: string;
  studentRatingGroupAria: string;
  studentRatingAria: (n: number) => string;
}

export const ratingPromptT: Record<Language, RatingPromptStrings> = {
  en: {
    closeAria: "Close",
    teacherHeading: "How's Vocaband working for your class?",
    teacherSubheading: "Quick rating — helps us know what to build next.",
    starsAria: "Rating, 1 to 5 stars",
    starAria: (n) => `${n} star${n === 1 ? "" : "s"}`,
    tapToRate: "Tap a star to rate",
    oneStar: "1 star · Needs work",
    twoStars: "2 stars · Could be better",
    threeStars: "3 stars · It's okay",
    fourStars: "4 stars · Pretty good",
    fiveStars: "5 stars · Love it",
    sending: "Sending…",
    sendRating: "Send rating",
    studentHeading: "How was that game?",
    studentSubheading: "Tap a face — your teacher will see the average for the class.",
    studentRatingGroupAria: "Rating",
    studentRatingAria: (n) => `Rating ${n} of 5`,
  },
  he: {
    closeAria: "סגירה",
    teacherHeading: "איך Vocaband עובד עבור הכיתה שלכם?",
    teacherSubheading: "דירוג מהיר — עוזר לנו לדעת מה לבנות הלאה.",
    starsAria: "דירוג, 1 עד 5 כוכבים",
    starAria: (n) => `${n} כוכבים`,
    tapToRate: "הקישו על כוכב כדי לדרג",
    oneStar: "כוכב 1 · צריך עבודה",
    twoStars: "2 כוכבים · יכול להיות טוב יותר",
    threeStars: "3 כוכבים · בסדר",
    fourStars: "4 כוכבים · די טוב",
    fiveStars: "5 כוכבים · אוהבים",
    sending: "שולח…",
    sendRating: "שלח דירוג",
    studentHeading: "איך הייתה המשחק?",
    studentSubheading: "הקישו על פרצוף — המורה יראה את הממוצע של הכיתה.",
    studentRatingGroupAria: "דירוג",
    studentRatingAria: (n) => `דירוג ${n} מתוך 5`,
  },
  ar: {
    closeAria: "إغلاق",
    teacherHeading: "كيف يعمل Vocaband مع صفّك؟",
    teacherSubheading: "تقييم سريع — يساعدنا على معرفة ما يجب بناؤه لاحقاً.",
    starsAria: "التقييم، من 1 إلى 5 نجوم",
    starAria: (n) => `${n} نجوم`,
    tapToRate: "اضغط على نجمة للتقييم",
    oneStar: "نجمة 1 · يحتاج إلى عمل",
    twoStars: "نجمتان · يمكن أن يكون أفضل",
    threeStars: "3 نجوم · لا بأس",
    fourStars: "4 نجوم · جيد",
    fiveStars: "5 نجوم · أحبه",
    sending: "جارٍ الإرسال…",
    sendRating: "إرسال التقييم",
    studentHeading: "كيف كانت اللعبة؟",
    studentSubheading: "اضغط على وجه — سيرى معلّمك متوسّط الصف.",
    studentRatingGroupAria: "التقييم",
    studentRatingAria: (n) => `التقييم ${n} من 5`,
  },
};
