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
    "fill-blank": { title: "Fill in the Blank", icon: "✏️", steps: ["A sentence appears with one word missing", "Read it carefully — there's no audio in this mode", "Tap the word that fills the blank"] },
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
    "fill-blank": { title: "املأ الفراغ", icon: "✏️", steps: ["تظهر جملة بكلمة مفقودة", "اقرأها بعناية — لا يوجد صوت في هذا الوضع", "اضغط على الكلمة التي تملأ الفراغ"] },
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
    "fill-blank": { title: "השלם את החסר", icon: "✏️", steps: ["מופיע משפט עם מילה חסרה", "קרא בעיון — אין שמע במצב זה", "לחץ על המילה שמשלימה את החסר"] },
  },
};

// Per-mode theme colors — each game feels distinctive instead of a uniform look
const modeThemes: Record<GameMode, {
  gradient: string;        // page background
  card: string;            // hero icon circle bg
  stepBg: string;          // step card background
  stepNum: string;         // step number circle
  cta: string;             // primary button
  accent: string;          // heading accent text
}> = {
  classic:           { gradient: "from-emerald-50 via-white to-emerald-50",    card: "from-emerald-400 to-emerald-600",    stepBg: "bg-emerald-50 border-emerald-100",    stepNum: "bg-emerald-500",     cta: "from-emerald-500 to-emerald-600",     accent: "text-emerald-700" },
  listening:         { gradient: "from-blue-50 via-white to-indigo-50",        card: "from-blue-400 to-indigo-600",        stepBg: "bg-blue-50 border-blue-100",          stepNum: "bg-blue-500",         cta: "from-blue-500 to-indigo-600",         accent: "text-blue-700" },
  spelling:          { gradient: "from-purple-50 via-white to-fuchsia-50",     card: "from-purple-400 to-fuchsia-600",     stepBg: "bg-purple-50 border-purple-100",      stepNum: "bg-purple-500",       cta: "from-purple-500 to-fuchsia-600",      accent: "text-purple-700" },
  matching:          { gradient: "from-amber-50 via-white to-orange-50",       card: "from-amber-400 to-orange-500",       stepBg: "bg-amber-50 border-amber-100",        stepNum: "bg-amber-500",        cta: "from-amber-500 to-orange-500",        accent: "text-amber-700" },
  "true-false":      { gradient: "from-rose-50 via-white to-pink-50",          card: "from-rose-400 to-pink-500",          stepBg: "bg-rose-50 border-rose-100",          stepNum: "bg-rose-500",         cta: "from-rose-500 to-pink-500",           accent: "text-rose-700" },
  flashcards:        { gradient: "from-cyan-50 via-white to-teal-50",          card: "from-cyan-400 to-teal-500",          stepBg: "bg-cyan-50 border-cyan-100",          stepNum: "bg-cyan-500",         cta: "from-cyan-500 to-teal-500",           accent: "text-cyan-700" },
  scramble:          { gradient: "from-indigo-50 via-white to-violet-50",      card: "from-indigo-400 to-violet-600",      stepBg: "bg-indigo-50 border-indigo-100",      stepNum: "bg-indigo-500",       cta: "from-indigo-500 to-violet-600",       accent: "text-indigo-700" },
  reverse:           { gradient: "from-fuchsia-50 via-white to-purple-50",     card: "from-fuchsia-400 to-purple-600",     stepBg: "bg-fuchsia-50 border-fuchsia-100",    stepNum: "bg-fuchsia-500",      cta: "from-fuchsia-500 to-purple-600",      accent: "text-fuchsia-700" },
  "letter-sounds":   { gradient: "from-violet-50 via-white to-purple-50",      card: "from-violet-400 to-purple-500",      stepBg: "bg-violet-50 border-violet-100",      stepNum: "bg-violet-500",       cta: "from-violet-500 to-purple-500",       accent: "text-violet-700" },
  "sentence-builder":{ gradient: "from-teal-50 via-white to-emerald-50",       card: "from-teal-400 to-emerald-500",       stepBg: "bg-teal-50 border-teal-100",          stepNum: "bg-teal-500",         cta: "from-teal-500 to-emerald-500",        accent: "text-teal-700" },
  "fill-blank":      { gradient: "from-lime-50 via-white to-emerald-50",       card: "from-lime-400 to-emerald-500",       stepBg: "bg-lime-50 border-lime-100",          stepNum: "bg-lime-500",         cta: "from-lime-500 to-emerald-500",        accent: "text-lime-700" },
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
  const theme = modeThemes[gameMode];
  const isRtl = introLang !== "en";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center p-4 sm:p-6`}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white rounded-[28px] sm:rounded-[36px] shadow-xl ring-1 ring-stone-100 p-6 sm:p-10 max-w-md sm:max-w-xl w-full"
      >
        {/* Language toggle — drives BOTH the instruction language here AND
            the student's game translation target language. Picking "عربي"
            or "עברית" also commits the matching targetLanguage so the
            duplicate "Choose your translation language" card below isn't
            needed. "EN" doesn't set a target (Arabic/Hebrew are the only
            valid translation targets for this app). */}
        <div className="flex justify-center gap-1.5 mb-6 bg-stone-100 rounded-full p-1 w-fit mx-auto">
          {([["en", "EN"], ["ar", "عربي"], ["he", "עברית"]] as const).map(([code, label]) => (
            <button
              key={code}
              onClick={() => {
                setIntroLang(code as "en" | "ar" | "he");
                if (code === 'ar' || code === 'he') {
                  const target = code === 'ar' ? 'arabic' : 'hebrew';
                  setTargetLanguage(target);
                  try { localStorage.setItem('vocaband_target_lang', target); } catch {}
                  setHasChosenLanguage(true);
                }
              }}
              style={{ touchAction: 'manipulation' }}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${introLang === code ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Hero icon with gradient circle */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-[22px] sm:rounded-[28px] bg-gradient-to-br ${theme.card} flex items-center justify-center text-4xl sm:text-5xl shadow-lg`}
        >
          {info.icon}
        </motion.div>

        {/* Title */}
        <h2
          className={`text-2xl sm:text-4xl font-black ${theme.accent} mb-6 sm:mb-8 text-center`}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {info.title}
        </h2>

        {/* Steps */}
        <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
          {info.steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`flex items-center gap-3 sm:gap-4 ${theme.stepBg} border p-3 sm:p-4 rounded-2xl`}
              dir={isRtl ? "rtl" : "ltr"}
            >
              <span className={`w-8 h-8 sm:w-10 sm:h-10 ${theme.stepNum} text-white rounded-full flex items-center justify-center text-sm sm:text-base font-black flex-shrink-0 shadow-sm`}>
                {i + 1}
              </span>
              <span className="text-stone-700 font-semibold text-sm sm:text-base leading-snug">
                {step}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Primary CTA */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 + info.steps.length * 0.1 }}
          onClick={onLetsGo ?? (() => setShowModeIntro(false))}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className={`w-full py-4 sm:py-5 bg-gradient-to-br ${theme.cta} text-white rounded-2xl font-black text-lg sm:text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-transform`}
        >
          Let's Go! →
        </motion.button>

        {/* Back link */}
        <button
          onClick={() => { setShowModeIntro(false); setShowModeSelection(true); }}
          style={{ touchAction: 'manipulation' }}
          className="w-full mt-3 py-2 text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors"
        >
          ← Back to Modes
        </button>
      </motion.div>
    </div>
  );
}
