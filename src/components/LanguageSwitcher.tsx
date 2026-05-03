import React from "react";
import { motion } from "motion/react";
import { Globe } from "lucide-react";
import { useLanguage, languageNames, Language } from "../hooks/useLanguage";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "pill" | "compact";
}

// Short codes shown next to the globe icon when the full language
// name doesn't fit (compact variant + pill on mobile).  Active
// button reads as "🌐 EN" / "🌐 עב" / "🌐 ع" — globe is the
// universal "language" affordance, the code disambiguates.
const SHORT_CODE: Record<Language, string> = {
  en: "EN",
  he: "עב",
  ar: "ع",
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "", variant = "pill" }) => {
  const { language, setLanguage } = useLanguage();
  const languages: Language[] = ["en", "he", "ar"];

  // Compact dropdown variant (for tight spaces like mobile nav)
  if (variant === "compact") {
    return (
      <div className={`relative inline-flex ${className}`}>
        {languages.map((lang, idx) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`relative inline-flex items-center gap-1 px-2.5 py-2 text-sm font-bold transition-all ${
              idx === 0 ? "rounded-s-lg" : ""
            } ${idx === languages.length - 1 ? "rounded-e-lg" : ""}
            ${language === lang
              ? "bg-primary text-on-primary"
              : "bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
            type="button"
            aria-label={languageNames[lang]}
            title={languageNames[lang]}
          >
            <Globe size={14} strokeWidth={2.25} aria-hidden />
            <span>{SHORT_CODE[lang]}</span>
          </button>
        ))}
      </div>
    );
  }

  // Modern pill variant (default)
  return (
    <div className={`inline-flex ${className}`}>
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-container-low/80 backdrop-blur-sm border border-surface-container-high/50">
        {languages.map((lang) => (
          <motion.button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
              language === lang
                ? "bg-gradient-to-br from-primary to-primary/90 text-on-primary shadow-lg shadow-primary/20"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50"
            }`}
            whileHover={{ scale: language === lang ? 1.02 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            aria-label={languageNames[lang]}
          >
            {/* Globe icon with subtle bounce on selection — replaces
                the country-flag emoji that previously sat here.
                Globe = universal "language" affordance, doesn't
                conflate the language with a single country (Arabic
                isn't only Saudi Arabia, English isn't only the UK). */}
            <motion.span
              className="inline-flex"
              animate={{
                scale: language === lang ? [1, 1.15, 1] : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              <Globe size={16} strokeWidth={2.25} aria-hidden />
            </motion.span>

            {/* Full language name on desktop, 2-letter code on mobile
                so the active button is still distinct at the smallest
                size. */}
            <span className="text-sm">
              <span className="hidden sm:inline">{languageNames[lang]}</span>
              <span className="sm:hidden">{SHORT_CODE[lang]}</span>
            </span>

            {/* Active dot — kept from previous design. */}
            {language === lang && (
              <motion.span
                className="w-1 h-1 rounded-full bg-white/90"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
