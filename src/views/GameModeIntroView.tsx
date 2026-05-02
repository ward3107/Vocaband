import { useState } from "react";
import { motion } from "motion/react";
import type { GameMode } from "../constants/game";
import { modeIntroT } from "../locales/student/mode-intro";

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
  "memory-flip":     { gradient: "from-pink-50 via-white to-rose-50",          card: "from-pink-400 to-rose-500",          stepBg: "bg-pink-50 border-pink-100",          stepNum: "bg-pink-500",         cta: "from-pink-500 to-rose-500",           accent: "text-pink-700" },
  "word-chains":     { gradient: "from-orange-50 via-white to-amber-50",       card: "from-orange-400 to-amber-500",       stepBg: "bg-orange-50 border-orange-100",      stepNum: "bg-orange-500",       cta: "from-orange-500 to-amber-500",        accent: "text-orange-700" },
  idiom:             { gradient: "from-sky-50 via-white to-blue-50",            card: "from-sky-400 to-blue-500",           stepBg: "bg-sky-50 border-sky-100",            stepNum: "bg-sky-500",          cta: "from-sky-500 to-blue-500",            accent: "text-sky-700" },
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
  const t = modeIntroT[introLang];
  const info = t.modes[gameMode];
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
          {t.letsGo}
        </motion.button>

        {/* Back link */}
        <button
          onClick={() => { setShowModeIntro(false); setShowModeSelection(true); }}
          style={{ touchAction: 'manipulation' }}
          className="w-full mt-3 py-2 text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors"
        >
          {t.backToModes}
        </button>
      </motion.div>
    </div>
  );
}
