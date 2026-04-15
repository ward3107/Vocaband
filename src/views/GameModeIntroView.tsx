import { useState } from "react";
import { motion } from "motion/react";
import type { GameMode } from "../constants/game";

// Mode intro instructions with translations
const modeInstructionsAll: Record<string, Record<GameMode, { title: string; steps: string[]; icon: string }>> = {
  en: {
    classic: { title: "Classic Mode", icon: "📖", steps: ["See the English word", "Listen to pronunciation", "Pick the correct translation"] },
    listening: { title: "Listening Mode", icon: "🎧", steps: ["Listen carefully to the word", "The text is hidden!", "Choose the correct translation"] },
    spelling: { title: "Spelling Mode", icon: "✏️", steps: ["See the translation", "Type the English word", "Spelling must be exact!"] },
    matching: { title: "Matching Mode", icon: "⚡", steps: ["Find matching pairs", "Tap English then translation", "Match all pairs to finish!"] },
    "true-false": { title: "True / False", icon: "✅", steps: ["See a word and translation", "Decide if the pair is correct", "Think fast!"] },
    flashcards: { title: "Flashcards", icon: "🃏", steps: ["Review words at your pace", "Flip to see the answer", "No pressure — just learn!"] },
    scramble: { title: "Word Scramble", icon: "🔤", steps: ["Letters are scrambled", "Type the correct English word", "Unscramble them all!"] },
    reverse: { title: "Reverse Mode", icon: "🔄", steps: ["See the Hebrew/Arabic word", "Pick the English translation", "Reverse of classic!"] },
    "letter-sounds": { title: "Letter Sounds", icon: "🔡", steps: ["Each letter appears in a color", "Listen to each letter sound", "Type the full word when ready"] },
    "sentence-builder": { title: "Sentence Builder", icon: "🧩", steps: ["Words are shuffled below", "Tap words in the correct order", "Build the sentence to finish!"] },
  },
  ar: {
    classic: { title: "الوضع الكلاسيكي", icon: "📖", steps: ["شاهد الكلمة بالإنجليزية", "استمع إلى النطق", "اختر الترجمة الصحيحة"] },
    listening: { title: "وضع الاستماع", icon: "🎧", steps: ["استمع جيداً للكلمة", "النص مخفي!", "اختر الترجمة الصحيحة"] },
    spelling: { title: "وضع التهجئة", icon: "✏️", steps: ["شاهد الترجمة", "اكتب الكلمة بالإنجليزية", "التهجئة يجب أن تكون دقيقة!"] },
    matching: { title: "وضع المطابقة", icon: "⚡", steps: ["ابحث عن الأزواج المتطابقة", "اضغط الإنجليزية ثم الترجمة", "طابق كل الأزواج!"] },
    "true-false": { title: "صح أو خطأ", icon: "✅", steps: ["شاهد كلمة وترجمتها", "قرر إذا كانت صحيحة", "فكر بسرعة!"] },
    flashcards: { title: "البطاقات", icon: "🃏", steps: ["راجع الكلمات بسرعتك", "اقلب لترى الإجابة", "بدون ضغط - فقط تعلم!"] },
    scramble: { title: "خلط الحروف", icon: "🔤", steps: ["الحروف مخلوطة", "اكتب الكلمة الصحيحة", "رتب كل الكلمات!"] },
    reverse: { title: "الوضع العكسي", icon: "🔄", steps: ["شاهد الكلمة بالعربية/العبرية", "اختر الترجمة بالإنجليزية", "عكس الكلاسيكي!"] },
    "letter-sounds": { title: "أصوات الحروف", icon: "🔡", steps: ["كل حرف يظهر بلون", "استمع لصوت كل حرف", "اكتب الكلمة كاملة عندما تكون جاهزاً"] },
    "sentence-builder": { title: "بناء الجمل", icon: "🧩", steps: ["الكلمات مخلوطة في الأسفل", "اضغط الكلمات بالترتيب الصحيح", "ابنِ الجملة لتنتهي!"] },
  },
  he: {
    classic: { title: "מצב קלאסי", icon: "📖", steps: ["ראה את המילה באנגלית", "הקשב להגייה", "בחר את התרגום הנכון"] },
    listening: { title: "מצב הקשבה", icon: "🎧", steps: ["הקשב היטב למילה", "הטקסט מוסתר!", "בחר את התרגום הנכון"] },
    spelling: { title: "מצב איות", icon: "✏️", steps: ["ראה את התרגום", "הקלד את המילה באנגלית", "האיות חייב להיות מדויק!"] },
    matching: { title: "מצב התאמה", icon: "⚡", steps: ["מצא זוגות תואמים", "לחץ אנגלית ואז תרגום", "התאם את כל הזוגות!"] },
    "true-false": { title: "נכון / לא נכון", icon: "✅", steps: ["ראה מילה ותרגום", "החלט אם הזוג נכון", "חשוב מהר!"] },
    flashcards: { title: "כרטיסיות", icon: "🃏", steps: ["חזור על מילים בקצב שלך", "הפוך לראות תשובה", "בלי לחץ - רק ללמוד!"] },
    scramble: { title: "ערבוב מילים", icon: "🔤", steps: ["האותיות מעורבבות", "הקלד את המילה הנכונה", "פתור את כולן!"] },
    reverse: { title: "מצב הפוך", icon: "🔄", steps: ["ראה את המילה בעברית/ערבית", "בחר את התרגום באנגלית", "הפוך מקלאסי!"] },
    "letter-sounds": { title: "צלילי אותיות", icon: "🔡", steps: ["כל אות מופיעה בצבע", "הקשב לצליל כל אות", "הקלד את המילה כשמוכן"] },
    "sentence-builder": { title: "בניית משפטים", icon: "🧩", steps: ["המילים מעורבבות למטה", "לחץ על מילים בסדר הנכון", "בנה את המשפט!"] },
  },
};

interface GameModeIntroViewProps {
  gameMode: GameMode;
  hasChosenLanguage: boolean;
  setHasChosenLanguage: (v: boolean) => void;
  targetLanguage: "hebrew" | "arabic";
  setTargetLanguage: (lang: "hebrew" | "arabic") => void;
  setShowModeIntro: (v: boolean) => void;
  setShowModeSelection: (v: boolean) => void;
  /** Optional — caller can provide custom handler for the "Let's Go!" button
   * (e.g. to add game debug tracking). Defaults to setShowModeIntro(false). */
  onLetsGo?: () => void;
}

export default function GameModeIntroView({
  gameMode,
  hasChosenLanguage,
  setHasChosenLanguage,
  targetLanguage,
  setTargetLanguage,
  setShowModeIntro,
  setShowModeSelection,
  onLetsGo,
}: GameModeIntroViewProps) {
  // Local picker state — only used here, so it stays in the view
  const [introLang, setIntroLang] = useState<"en" | "ar" | "he">("en");
  const modeInstructions = modeInstructionsAll[introLang];
  const info = modeInstructions[gameMode];

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] shadow-2xl p-8 sm:p-12 max-w-md w-full text-center"
      >
        {/* Language toggle */}
        <div className="flex justify-center gap-2 mb-4">
          {([["en", "EN"], ["ar", "عربي"], ["he", "עברית"]] as const).map(([code, label]) => (
            <button key={code} onClick={() => setIntroLang(code as "en" | "ar" | "he")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${introLang === code ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="text-5xl mb-4">{info.icon}</div>
        <h2 className={`text-2xl sm:text-3xl font-black text-stone-900 mb-6 ${introLang !== "en" ? "dir-rtl" : ""}`} dir={introLang !== "en" ? "rtl" : "ltr"}>{info.title}</h2>
        <div className="space-y-3 mb-8">
          {info.steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 text-left bg-stone-50 p-3 rounded-xl"
            >
              <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</span>
              <span className="text-stone-700 font-medium text-sm sm:text-base" dir={introLang !== "en" ? "rtl" : "ltr"}>{step}</span>
            </motion.div>
          ))}
        </div>
        {/* Language selection — shown once, then remembered */}
        {!hasChosenLanguage && (
          <div className="mb-6 bg-blue-50 rounded-2xl p-4">
            <p className="text-sm font-bold text-blue-900 mb-3">Choose your translation language:</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setTargetLanguage("hebrew"); try { localStorage.setItem('vocaband_target_lang', 'hebrew'); } catch {} setHasChosenLanguage(true); }}
                className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${targetLanguage === "hebrew" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-stone-700 border-2 border-stone-200 hover:border-blue-300"}`}
              >
                עברית
              </button>
              <button
                onClick={() => { setTargetLanguage("arabic"); try { localStorage.setItem('vocaband_target_lang', 'arabic'); } catch {} setHasChosenLanguage(true); }}
                className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${targetLanguage === "arabic" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-stone-700 border-2 border-stone-200 hover:border-blue-300"}`}
              >
                عربي
              </button>
            </div>
          </div>
        )}
        <button
          onClick={onLetsGo ?? (() => setShowModeIntro(false))}
          className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors"
        >
          Let's Go!
        </button>
        <button
          onClick={() => { setShowModeIntro(false); setShowModeSelection(true); }}
          className="w-full mt-2 py-2 text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors"
        >
          ← Back to Modes
        </button>
      </motion.div>
    </div>
  );
}
