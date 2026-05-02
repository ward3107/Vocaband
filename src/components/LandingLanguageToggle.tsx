import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage, languageFlags, Language } from "../hooks/useLanguage";

interface LandingLanguageToggleProps {
  className?: string;
}

const LandingLanguageToggle: React.FC<LandingLanguageToggleProps> = ({ className = "" }) => {
  const { language, setLanguage } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const languages: Language[] = ["en", "he", "ar"];

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          // Expanded pill - shows all options
          <motion.div
            key="expanded"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className="flex gap-1.5 p-1.5 rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-white/50"
          >
            {languages.map((lang) => (
              <motion.button
                key={lang}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: lang === language ? 0.05 : 0.1,
                }}
                onClick={() => setLanguage(lang)}
                className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all ${
                  language === lang
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                whileTap={{ scale: 0.92 }}
                type="button"
              >
                <span className="text-base">{languageFlags[lang]}</span>
                <span className="text-xs">
                  {lang === "en" ? "EN" : lang === "he" ? "עב" : "ع"}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          // Collapsed badge - shows current flag only (smaller)
          <motion.button
            key="collapsed"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
            className="relative w-11 h-11 rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-white/50 flex items-center justify-center overflow-hidden group"
            type="button"
            aria-label="Change language"
          >
            {/* Animated gradient shimmer on hover */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent"
            />

            {/* Current flag */}
            <motion.span
              key={language}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              className="text-xl relative z-10"
            >
              {languageFlags[language]}
            </motion.span>

            {/* Small chevron indicator */}
            <motion.svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className="absolute bottom-1 right-1 text-slate-400"
              animate={{ rotate: isHovered ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingLanguageToggle;
