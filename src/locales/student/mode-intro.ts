/**
 * mode-intro.ts — i18n strings for GameModeIntroView (the "Here's how
 * to play X" screen shown right before each round).
 *
 * Owns:
 *   - per-mode title + step list (translated)
 *   - per-mode emoji icon (language-agnostic, shared)
 *   - CTA + back-link strings ("Let's Go!", "Back to Modes")
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";
import type { GameMode } from "../../constants/game";

export interface ModeIntroEntry {
  title: string;
  /** 3 short imperative steps, max ~6-8 words each so they don't wrap
   *  awkwardly inside the rounded step cards on mobile. */
  steps: string[];
  /** Emoji shown in the hero circle.  Same across languages. */
  icon: string;
}

export interface ModeIntroStrings {
  /** Per-game-mode title + steps. */
  modes: Record<GameMode, ModeIntroEntry>;
  /** Primary "Let's Go!" CTA at the bottom of the card. */
  letsGo: string;
  /** Secondary "Back to Modes" link below the CTA. */
  backToModes: string;
}

// Icon emoji — same across all languages, hoisted so each language
// table doesn't have to repeat them.
const ICONS: Record<GameMode, string> = {
  classic: "📖",
  listening: "🎧",
  spelling: "✏️",
  matching: "⚡",
  "memory-flip": "🧠",
  "true-false": "✅",
  flashcards: "🃏",
  scramble: "🔤",
  reverse: "🔄",
  "letter-sounds": "🔡",
  "sentence-builder": "🧩",
  "fill-blank": "✏️",
  "word-chains": "🔗",
  idiom: "💭",
};

const withIcons = (m: Record<GameMode, { title: string; steps: string[] }>): Record<GameMode, ModeIntroEntry> => {
  const out = {} as Record<GameMode, ModeIntroEntry>;
  (Object.keys(m) as GameMode[]).forEach(k => {
    out[k] = { ...m[k], icon: ICONS[k] };
  });
  return out;
};

export const modeIntroT: Record<Language, ModeIntroStrings> = {
  en: {
    modes: withIcons({
      classic: { title: "Classic Mode", steps: ["See the English word", "Listen to pronunciation", "Pick the correct translation"] },
      listening: { title: "Listening Mode", steps: ["Listen carefully to the word", "The text is hidden!", "Choose the correct translation"] },
      spelling: { title: "Spelling Mode", steps: ["See the translation", "Type the English word", "Spelling must be exact!"] },
      matching: { title: "Matching Mode", steps: ["Find matching pairs", "Tap English then translation", "Match all pairs to finish!"] },
      "memory-flip": { title: "Memory Flip", steps: ["Cards start face-down", "Tap two to peek — find the pair", "Match all pairs to finish!"] },
      "true-false": { title: "True / False", steps: ["See a word and translation", "Decide if the pair is correct", "Think fast!"] },
      flashcards: { title: "Flashcards", steps: ["Review words at your pace", "Flip to see the answer", "No pressure — just learn!"] },
      scramble: { title: "Word Scramble", steps: ["Letters are scrambled", "Type the correct English word", "Unscramble them all!"] },
      reverse: { title: "Reverse Mode", steps: ["See the Hebrew/Arabic word", "Pick the English translation", "Reverse of classic!"] },
      "letter-sounds": { title: "Letter Sounds", steps: ["Each letter appears in a color", "Listen to each letter sound", "Type the full word when ready"] },
      "sentence-builder": { title: "Sentence Builder", steps: ["Words are shuffled below", "Tap words in the correct order", "Build the sentence to finish!"] },
      "fill-blank": { title: "Fill in the Blank", steps: ["A sentence appears with one word missing", "Read it carefully — there's no audio in this mode", "Tap the word that fills the blank"] },
      "word-chains": { title: "Word Chains", steps: ["See the highlighted last letter", "Type a word that starts with that letter", "Keep the chain going as long as you can!"] },
      idiom: { title: "Idiom Mode", steps: ["See an English idiom in big letters", "Pick the meaning that matches", "Read the example to learn how to use it!"] },
    }),
    letsGo: "Let's Go! →",
    backToModes: "← Back to Modes",
  },
  he: {
    modes: withIcons({
      classic: { title: "מצב קלאסי", steps: ["ראה את המילה באנגלית", "הקשב להגייה", "בחר את התרגום הנכון"] },
      listening: { title: "מצב הקשבה", steps: ["הקשב היטב למילה", "הטקסט מוסתר!", "בחר את התרגום הנכון"] },
      spelling: { title: "מצב איות", steps: ["ראה את התרגום", "הקלד את המילה באנגלית", "האיות חייב להיות מדויק!"] },
      matching: { title: "מצב התאמה", steps: ["מצא זוגות תואמים", "לחץ אנגלית ואז תרגום", "התאם את כל הזוגות!"] },
      "memory-flip": { title: "זיכרון", steps: ["הכרטיסיות הפוכות בהתחלה", "הפוך שתיים — מצא את הזוג", "התאם את כל הזוגות!"] },
      "true-false": { title: "נכון / לא נכון", steps: ["ראה מילה ותרגום", "החלט אם הזוג נכון", "חשוב מהר!"] },
      flashcards: { title: "כרטיסיות", steps: ["חזור על מילים בקצב שלך", "הפוך לראות תשובה", "בלי לחץ - רק ללמוד!"] },
      scramble: { title: "ערבוב מילים", steps: ["האותיות מעורבבות", "הקלד את המילה הנכונה", "פתור את כולן!"] },
      reverse: { title: "מצב הפוך", steps: ["ראה את המילה בעברית/ערבית", "בחר את התרגום באנגלית", "הפוך מקלאסי!"] },
      "letter-sounds": { title: "צלילי אותיות", steps: ["כל אות מופיעה בצבע", "הקשב לצליל כל אות", "הקלד את המילה כשמוכן"] },
      "sentence-builder": { title: "בניית משפטים", steps: ["המילים מעורבבות למטה", "לחץ על מילים בסדר הנכון", "בנה את המשפט!"] },
      "fill-blank": { title: "השלם את החסר", steps: ["מופיע משפט עם מילה חסרה", "קרא בעיון — אין שמע במצב זה", "לחץ על המילה שמשלימה את החסר"] },
      "word-chains": { title: "שרשרת מילים", steps: ["שים לב לאות האחרונה המודגשת", "הקלד מילה שמתחילה באות הזו", "המשך את השרשרת כמה שיותר!"] },
      idiom: { title: "מצב ביטויים", steps: ["ראה ביטוי באנגלית באותיות גדולות", "בחר את המשמעות המתאימה", "קרא את הדוגמה ולמד איך להשתמש בו!"] },
    }),
    letsGo: "קדימה! →",
    backToModes: "← חזרה למצבים",
  },
  ar: {
    modes: withIcons({
      classic: { title: "الوضع الكلاسيكي", steps: ["شاهد الكلمة بالإنجليزية", "استمع إلى النطق", "اختر الترجمة الصحيحة"] },
      listening: { title: "وضع الاستماع", steps: ["استمع جيداً للكلمة", "النص مخفي!", "اختر الترجمة الصحيحة"] },
      spelling: { title: "وضع التهجئة", steps: ["شاهد الترجمة", "اكتب الكلمة بالإنجليزية", "التهجئة يجب أن تكون دقيقة!"] },
      matching: { title: "وضع المطابقة", steps: ["ابحث عن الأزواج المتطابقة", "اضغط الإنجليزية ثم الترجمة", "طابق كل الأزواج!"] },
      "memory-flip": { title: "الذاكرة", steps: ["البطاقات تبدأ مقلوبة", "اقلب اثنتين — ابحث عن الزوج", "طابق كل الأزواج!"] },
      "true-false": { title: "صح أو خطأ", steps: ["شاهد كلمة وترجمتها", "قرر إذا كانت صحيحة", "فكر بسرعة!"] },
      flashcards: { title: "البطاقات", steps: ["راجع الكلمات بسرعتك", "اقلب لترى الإجابة", "بدون ضغط - فقط تعلم!"] },
      scramble: { title: "خلط الحروف", steps: ["الحروف مخلوطة", "اكتب الكلمة الصحيحة", "رتب كل الكلمات!"] },
      reverse: { title: "الوضع العكسي", steps: ["شاهد الكلمة بالعربية/العبرية", "اختر الترجمة بالإنجليزية", "عكس الكلاسيكي!"] },
      "letter-sounds": { title: "أصوات الحروف", steps: ["كل حرف يظهر بلون", "استمع لصوت كل حرف", "اكتب الكلمة كاملة عندما تكون جاهزاً"] },
      "sentence-builder": { title: "بناء الجمل", steps: ["الكلمات مخلوطة في الأسفل", "اضغط الكلمات بالترتيب الصحيح", "ابنِ الجملة لتنتهي!"] },
      "fill-blank": { title: "املأ الفراغ", steps: ["تظهر جملة بكلمة مفقودة", "اقرأها بعناية — لا يوجد صوت في هذا الوضع", "اضغط على الكلمة التي تملأ الفراغ"] },
      "word-chains": { title: "سلسلة الكلمات", steps: ["انظر إلى الحرف الأخير المميز", "اكتب كلمة تبدأ بهذا الحرف", "أكمل السلسلة لأطول وقت ممكن!"] },
      idiom: { title: "وضع التعابير", steps: ["شاهد تعبيرًا إنجليزيًا بحروف كبيرة", "اختر المعنى المطابق", "اقرأ المثال لتتعلم كيفية استخدامه!"] },
    }),
    letsGo: "هيا بنا! →",
    backToModes: "← العودة إلى الأوضاع",
  },
};
