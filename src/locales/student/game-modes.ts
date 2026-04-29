/**
 * Locale file for GameModeSelectionView.
 *
 * All visible UI strings on the "Choose Your Mode" screen, in
 * English / Hebrew / Arabic.  No data lives in App.tsx or in the
 * view itself — the view imports `gameModesT[language]` and reads
 * strings off it.
 *
 * Pattern (see docs/I18N-MIGRATION.md):
 *   1. One file per student-facing screen, under src/locales/student/.
 *   2. Each file exports a single `Record<Language, T>` keyed by the
 *      three supported languages.
 *   3. Component imports the file directly, calls
 *      `const t = thisModuleT[language]` once, then reads strings
 *      off `t`.
 *   4. Adding a 4th language = add it to the `Language` union in
 *      `src/hooks/useLanguage.tsx` then drop a new key in this file.
 *      TypeScript surfaces every missing string at compile time.
 */
import type { Language } from "../../hooks/useLanguage";

export type GameModeId =
  | "flashcards"
  | "classic"
  | "fill-blank"
  | "listening"
  | "spelling"
  | "matching"
  | "true-false"
  | "scramble"
  | "reverse"
  | "letter-sounds"
  | "sentence-builder";

export interface GameModeStrings {
  name: string;
  desc: string;
  tooltip: [string, string, string];
}

export interface GameModesT {
  chooseYourMode: string;
  tagline: string;
  startHereBadge: string;
  thenPractiseWith: string;
  closeAria: string;
  modes: Record<GameModeId, GameModeStrings>;
}

export const gameModesT: Record<Language, GameModesT> = {
  en: {
    chooseYourMode: "Choose Your Mode",
    tagline: "Start with Flashcards to learn — then practise with the other modes.",
    startHereBadge: "Start here · Learn first",
    thenPractiseWith: "Then practise with",
    closeAria: "Close mode selection",
    modes: {
      flashcards: {
        name: "Flashcards",
        desc: "Learn the words first — flip, listen, and earn XP at your own pace.",
        tooltip: ["Learn before you practice", "Flip cards to see answers", "No pressure — still earns XP"],
      },
      classic: {
        name: "Classic Mode",
        desc: "See the word, hear the word, pick translation.",
        tooltip: ["See the word in your language", "Hear the pronunciation", "Choose the correct English translation"],
      },
      "fill-blank": {
        name: "Fill in the Blank",
        desc: "Pick the word that completes the sentence.",
        tooltip: ["Read the sentence with a missing word", "Tap the word that fits", "No audio — read carefully!"],
      },
      listening: {
        name: "Listening Mode",
        desc: "Only hear the word. No English text!",
        tooltip: ["Listen to the word pronunciation", "No text shown — audio only!", "Great for training your ear"],
      },
      spelling: {
        name: "Spelling Mode",
        desc: "Type the English word. Hardest mode!",
        tooltip: ["Hear the word", "Type it correctly in English", "Best for mastering spelling"],
      },
      matching: {
        name: "Matching Mode",
        desc: "Match translations. Fun & fast!",
        tooltip: ["Match pairs together", "Connect your language to English", "Fast-paced and fun!"],
      },
      "true-false": {
        name: "True / False",
        desc: "Is the translation correct? Quick thinking!",
        tooltip: ["See a word and translation", "Decide if it's correct", "Quick reflexes game"],
      },
      scramble: {
        name: "Word Scramble",
        desc: "Unscramble the letters to find the word.",
        tooltip: ["Letters are mixed up", "Rearrange to form the word", "Tests your spelling skills"],
      },
      reverse: {
        name: "Reverse Mode",
        desc: "See your language, pick the English word.",
        tooltip: ["See the word in your language", "Choose matching English word", "Reverse of classic mode"],
      },
      "letter-sounds": {
        name: "Letter Sounds",
        desc: "Watch each letter light up and hear its sound.",
        tooltip: ["Each letter lights up in colour", "Listen to each letter sound", "Type the full word you heard"],
      },
      "sentence-builder": {
        name: "Sentence Builder",
        desc: "Tap words in the right order to build the sentence.",
        tooltip: ["Words are shuffled", "Tap them in the correct order", "Build the sentence correctly!"],
      },
    },
  },

  he: {
    chooseYourMode: "בחר מצב משחק",
    tagline: "התחל עם כרטיסיות כדי ללמוד — ואז תרגל עם המצבים האחרים.",
    startHereBadge: "התחל כאן · קודם לומדים",
    thenPractiseWith: "ואז תרגל עם",
    closeAria: "סגור בחירת מצב",
    modes: {
      flashcards: {
        name: "כרטיסיות",
        desc: "תחילה לומדים את המילים — הפוך, האזן וצבור XP בקצב שלך.",
        tooltip: ["ללמוד לפני שמתרגלים", "הפוך כרטיסים כדי לראות תשובות", "ללא לחץ — עדיין מרוויחים XP"],
      },
      classic: {
        name: "מצב קלאסי",
        desc: "ראה את המילה, האזן לה, בחר תרגום.",
        tooltip: ["ראה את המילה בשפה שלך", "שמע את ההגייה", "בחר את התרגום הנכון לאנגלית"],
      },
      "fill-blank": {
        name: "השלם את החסר",
        desc: "בחר את המילה שמשלימה את המשפט.",
        tooltip: ["קרא את המשפט עם המילה החסרה", "הקש על המילה המתאימה", "ללא שמע — קרא בעיון!"],
      },
      listening: {
        name: "מצב האזנה",
        desc: "רק שומעים את המילה. ללא טקסט באנגלית!",
        tooltip: ["שמע את הגיית המילה", "ללא טקסט מוצג — שמע בלבד!", "מצוין לאימון האוזן"],
      },
      spelling: {
        name: "מצב איות",
        desc: "הקלד את המילה באנגלית. המצב הקשה ביותר!",
        tooltip: ["שמע את המילה", "הקלד אותה נכון באנגלית", "הטוב ביותר לשליטה באיות"],
      },
      matching: {
        name: "מצב התאמה",
        desc: "התאם בין תרגומים. כיף ומהיר!",
        tooltip: ["התאם זוגות יחד", "חבר בין השפה שלך לאנגלית", "מהיר וכיפי!"],
      },
      "true-false": {
        name: "נכון / לא נכון",
        desc: "האם התרגום נכון? חשיבה מהירה!",
        tooltip: ["ראה מילה ותרגום", "החלט אם זה נכון", "משחק רפלקסים מהיר"],
      },
      scramble: {
        name: "ערבוב מילים",
        desc: "סדר את האותיות כדי למצוא את המילה.",
        tooltip: ["האותיות מעורבבות", "סדר אותן ליצירת המילה", "בודק את כישורי האיות שלך"],
      },
      reverse: {
        name: "מצב הפוך",
        desc: "ראה את השפה שלך, בחר את המילה באנגלית.",
        tooltip: ["ראה את המילה בשפה שלך", "בחר את המילה המתאימה באנגלית", "הפוך מהמצב הקלאסי"],
      },
      "letter-sounds": {
        name: "צלילי אותיות",
        desc: "צפה בכל אות נדלקת ושמע את הצליל שלה.",
        tooltip: ["כל אות נדלקת בצבע", "האזן לצליל של כל אות", "הקלד את המילה המלאה ששמעת"],
      },
      "sentence-builder": {
        name: "בונה משפטים",
        desc: "הקש על המילים בסדר הנכון לבניית המשפט.",
        tooltip: ["המילים מעורבבות", "הקש עליהן בסדר הנכון", "בנה את המשפט נכון!"],
      },
    },
  },

  ar: {
    chooseYourMode: "اختر وضع اللعب",
    tagline: "ابدأ بالبطاقات لتتعلم — ثم تدرب مع الأوضاع الأخرى.",
    startHereBadge: "ابدأ هنا · تعلم أولاً",
    thenPractiseWith: "ثم تدرب مع",
    closeAria: "إغلاق اختيار الوضع",
    modes: {
      flashcards: {
        name: "البطاقات",
        desc: "تعلم الكلمات أولاً — اقلب، استمع، واكسب نقاط الخبرة بإيقاعك.",
        tooltip: ["تعلم قبل أن تتدرب", "اقلب البطاقات لرؤية الإجابات", "بدون ضغط — لا تزال تكسب XP"],
      },
      classic: {
        name: "الوضع الكلاسيكي",
        desc: "انظر إلى الكلمة، استمع إليها، واختر الترجمة.",
        tooltip: ["انظر إلى الكلمة بلغتك", "استمع إلى النطق", "اختر الترجمة الإنجليزية الصحيحة"],
      },
      "fill-blank": {
        name: "املأ الفراغ",
        desc: "اختر الكلمة التي تكمل الجملة.",
        tooltip: ["اقرأ الجملة مع الكلمة المفقودة", "اضغط على الكلمة المناسبة", "بدون صوت — اقرأ بعناية!"],
      },
      listening: {
        name: "وضع الاستماع",
        desc: "تسمع الكلمة فقط. بدون نص إنجليزي!",
        tooltip: ["استمع إلى نطق الكلمة", "لا نص ظاهر — صوت فقط!", "رائع لتدريب أذنك"],
      },
      spelling: {
        name: "وضع التهجئة",
        desc: "اكتب الكلمة بالإنجليزية. الوضع الأصعب!",
        tooltip: ["استمع إلى الكلمة", "اكتبها بشكل صحيح بالإنجليزية", "الأفضل لإتقان التهجئة"],
      },
      matching: {
        name: "وضع المطابقة",
        desc: "طابق الترجمات. ممتع وسريع!",
        tooltip: ["طابق الأزواج معاً", "اربط بين لغتك والإنجليزية", "سريع ومرح!"],
      },
      "true-false": {
        name: "صحيح / خطأ",
        desc: "هل الترجمة صحيحة؟ تفكير سريع!",
        tooltip: ["انظر إلى كلمة وترجمتها", "قرر إذا كانت صحيحة", "لعبة ردود فعل سريعة"],
      },
      scramble: {
        name: "ترتيب الكلمات",
        desc: "رتب الحروف لإيجاد الكلمة.",
        tooltip: ["الحروف مختلطة", "رتبها لتكوين الكلمة", "يختبر مهاراتك في التهجئة"],
      },
      reverse: {
        name: "الوضع العكسي",
        desc: "انظر إلى لغتك، اختر الكلمة الإنجليزية.",
        tooltip: ["انظر إلى الكلمة بلغتك", "اختر الكلمة الإنجليزية المطابقة", "عكس الوضع الكلاسيكي"],
      },
      "letter-sounds": {
        name: "أصوات الحروف",
        desc: "شاهد كل حرف يضيء واسمع صوته.",
        tooltip: ["كل حرف يضيء بلون", "استمع إلى صوت كل حرف", "اكتب الكلمة الكاملة التي سمعتها"],
      },
      "sentence-builder": {
        name: "بناء الجمل",
        desc: "اضغط على الكلمات بالترتيب الصحيح لبناء الجملة.",
        tooltip: ["الكلمات مختلطة", "اضغط عليها بالترتيب الصحيح", "ابن الجملة بشكل صحيح!"],
      },
    },
  },
};
