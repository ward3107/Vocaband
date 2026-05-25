import React from "react";
import { Globe } from "lucide-react";
import { useLanguage, Language, ALL_LANGUAGES } from "../hooks/useLanguage";

interface LandingLanguageToggleProps {
  className?: string;
}

// Pure-CSS hover toggle (no motion/react). Keeping this off the animation
// library matters because it renders on the public landing page — pulling
// motion in here dragged the whole ~42 kB gz bundle onto the cold
// first-paint critical path for a purely decorative corner pill.
const LandingLanguageToggle: React.FC<LandingLanguageToggleProps> = ({ className = "" }) => {
  const { language, setLanguage } = useLanguage();
  const languages: Language[] = ALL_LANGUAGES;

  return (
    <div className={`group fixed bottom-4 right-4 z-40 w-11 h-11 ${className}`}>
      {/* Collapsed badge — visible by default, fades out on hover */}
      <button
        type="button"
        aria-label={language === 'he' ? 'החלף שפה' : language === 'ar' ? 'تغيير اللغة' : 'Change language'}
        className="absolute inset-0 w-11 h-11 rounded-lg bg-white/95 backdrop-blur-xl shadow-lg border border-white/50 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-90 group-hover:opacity-0 group-hover:pointer-events-none"
      >
        {/* Gradient shimmer */}
        <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" aria-hidden />
        <span className="relative z-10 text-violet-600" aria-hidden>
          <Globe size={22} strokeWidth={2.25} />
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="absolute bottom-1 right-1 text-slate-400 transition-transform duration-200 group-hover:rotate-180"
          aria-hidden
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expanded pill — hidden by default, springs in on hover */}
      <div className="absolute bottom-0 right-0 origin-bottom-right flex gap-1.5 p-1.5 rounded-lg bg-white/95 backdrop-blur-xl shadow-lg border border-white/50 opacity-0 scale-90 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            type="button"
            className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all active:scale-95 ${
              language === lang
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Globe size={14} strokeWidth={2.25} aria-hidden />
            <span className="text-xs">
              {lang === "en" ? "EN" : lang === "he" ? "עב" : "ع"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LandingLanguageToggle;
