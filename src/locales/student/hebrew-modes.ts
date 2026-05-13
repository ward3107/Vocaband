/**
 * hebrew-modes.ts — i18n strings for the 4 VocaHebrew game-mode views:
 *   - ListeningModeView
 *   - SynonymMatchView
 *   - ShoreshHuntView
 *   - NiqqudModeView
 *
 * These views render Hebrew vocabulary CONTENT (lemmas, niqqud,
 * shoresh letters, synonyms) — that stays in Hebrew regardless of
 * the teacher's UI language because it IS the educational material.
 *
 * The CHROME (back button, score header, instruction subtitle, final-
 * score modal, praise lines) follows useLanguage() so a teacher with
 * EN or AR UI can still guide their students through the flow.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface HebrewModesStrings {
  // Shared chrome (all 4 views)
  back: string;
  playAgain: string;
  done: string;
  noLemmasForBand: string;

  // ListeningModeView
  listenInstruction: string;
  listenPlayWordAria: string;
  listenPraiseHigh: string;
  listenPraiseMid: string;
  listenPraiseLow: string;

  // SynonymMatchView
  synonymChipLabel: string;
  antonymChipLabel: string;
  synonymPraiseHigh: string;
  synonymPraiseMid: string;
  synonymPraiseLow: string;

  // ShoreshHuntView
  shoreshInstruction: string;
  shoreshCorrect: string;
  shoreshShowAnswer: (letters: string) => string;
  shoreshPraiseHigh: string;
  shoreshPraiseMid: string;
  shoreshPraiseLow: string;

  // NiqqudModeView
  niqqudInstruction: string;
  niqqudPraiseHigh: string;
  niqqudPraiseMid: string;
  niqqudPraiseLow: string;
}

export const hebrewModesT: Record<Language, HebrewModesStrings> = {
  en: {
    back: "Back",
    playAgain: "Play again",
    done: "Done",
    noLemmasForBand: "No Hebrew lemmas available for this grade band.",
    listenInstruction: "Listen and pick the matching word",
    listenPlayWordAria: "Play word",
    listenPraiseHigh: "Excellent! Great Hebrew ear",
    listenPraiseMid: "Nice — your listening keeps improving",
    listenPraiseLow: "Keep listening — your ear will sharpen",
    synonymChipLabel: "נרדפת · synonym",
    antonymChipLabel: "הפך · antonym",
    synonymPraiseHigh: "Excellent! Strong vocabulary",
    synonymPraiseMid: "Nice — you're building real vocabulary",
    synonymPraiseLow: "Practice helps — try again",
    shoreshInstruction: "Find the 3 root letters",
    shoreshCorrect: "✓ Correct",
    shoreshShowAnswer: (letters) => `✗ Root: ${letters}`,
    shoreshPraiseHigh: "Excellent! You spotted the roots",
    shoreshPraiseMid: "Nice — keep hunting for roots",
    shoreshPraiseLow: "More practice will help — try again",
    niqqudInstruction: "Choose the correct niqqud",
    niqqudPraiseHigh: "Well done! Great niqqud",
    niqqudPraiseMid: "Very nice, keep practicing",
    niqqudPraiseLow: "Don't give up — one more round",
  },
  he: {
    back: "חזרה",
    playAgain: "שחקו שוב",
    done: "סיום",
    noLemmasForBand: "אין מילים בעברית זמינות לרמת כיתה זו.",
    listenInstruction: "האזינו ובחרו את המילה המתאימה",
    listenPlayWordAria: "השמע מילה",
    listenPraiseHigh: "מצוין! אוזן עברית מצוינת",
    listenPraiseMid: "יפה — האוזן משתפרת עם תרגול",
    listenPraiseLow: "נמשיך להאזין — האוזן תתחזק",
    synonymChipLabel: "נרדפת · synonym",
    antonymChipLabel: "הפך · antonym",
    synonymPraiseHigh: "מצוין! אוצר מילים חזק",
    synonymPraiseMid: "יפה — ממשיכים לבנות אוצר מילים",
    synonymPraiseLow: "התרגול עוזר — נסה שוב",
    shoreshInstruction: "מצאו את 3 אותיות השורש",
    shoreshCorrect: "✓ נכון",
    shoreshShowAnswer: (letters) => `✗ השורש: ${letters}`,
    shoreshPraiseHigh: "מצוין! זיהית את השורשים",
    shoreshPraiseMid: "יפה — ממשיכים לחפש שורשים",
    shoreshPraiseLow: "תרגול נוסף יעזור — נסה שוב",
    niqqudInstruction: "בחרו את הניקוד הנכון",
    niqqudPraiseHigh: "כל הכבוד! ניקוד מצוין",
    niqqudPraiseMid: "יפה מאוד, ממשיכים להתאמן",
    niqqudPraiseLow: "אל תוותר — עוד סיבוב",
  },
  ar: {
    back: "رجوع",
    playAgain: "العب مرة أخرى",
    done: "تم",
    noLemmasForBand: "لا توجد مفردات عبرية متاحة لهذه المرحلة الدراسية.",
    listenInstruction: "استمع واختر الكلمة المطابقة",
    listenPlayWordAria: "تشغيل الكلمة",
    listenPraiseHigh: "ممتاز! أذن عبرية رائعة",
    listenPraiseMid: "جيد — استماعك يتحسّن مع التدريب",
    listenPraiseLow: "تابع الاستماع — ستتحسّن أذنك",
    synonymChipLabel: "נרדפת · مرادف",
    antonymChipLabel: "הפך · ضد",
    synonymPraiseHigh: "ممتاز! مفردات قوية",
    synonymPraiseMid: "جيد — تبني مفرداتك خطوة بخطوة",
    synonymPraiseLow: "التدريب يساعد — حاول مرة أخرى",
    shoreshInstruction: "اعثر على حروف الجذر الثلاثة",
    shoreshCorrect: "✓ صحيح",
    shoreshShowAnswer: (letters) => `✗ الجذر: ${letters}`,
    shoreshPraiseHigh: "ممتاز! ميّزت الجذور",
    shoreshPraiseMid: "جيد — تابع البحث عن الجذور",
    shoreshPraiseLow: "مزيد من التدريب سيساعد — حاول مجدداً",
    niqqudInstruction: "اختر التنقيط الصحيح",
    niqqudPraiseHigh: "أحسنت! تنقيط ممتاز",
    niqqudPraiseMid: "جيد جداً، تابع التدريب",
    niqqudPraiseLow: "لا تستسلم — جولة أخرى",
  },
};
