import React from "react";
import { motion } from "motion/react";
import { useLanguage, languageNames, languageFlags, Language } from "../hooks/useLanguage";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "pill" | "compact";
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "", variant = "pill" }) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const languages: Language[] = ["en", "he", "ar"];
  const currentIndex = languages.indexOf(language);

  // Compact dropdown variant (for tight spaces like mobile nav)
  if (variant === "compact") {
    return (
      <div className={`relative inline-flex ${className}`}>
        {languages.map((lang, idx) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`relative px-3 py-2 text-sm font-medium transition-all ${
              idx === 0 ? "rounded-s-lg" : ""
            } ${idx === languages.length - 1 ? "rounded-e-lg" : ""}
            } ${language === lang
              ? "bg-primary text-on-primary"
              : "bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
            type="button"
          >
            {languageFlags[lang]}
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
          >
            {/* Flag with bounce on selection */}
            <motion.span
              className="text-lg"
              animate={{
                scale: language === lang ? [1, 1.15, 1] : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              {languageFlags[lang]}
            </motion.span>

            {/* Language name - hide on mobile */}
            <span className="hidden sm:inline text-sm">
              {languageNames[lang]}
            </span>

            {/* Active checkmark */}
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
