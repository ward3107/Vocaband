import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Check } from "lucide-react";
import { useLanguage, languageNames, languageFlags, Language } from "../hooks/useLanguage";

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "" }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages: Language[] = ["en", "he", "ar"];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-surface-container-high"
      >
        <Globe size={18} className="text-primary" />
        <span className="font-medium text-on-surface">
          {languageFlags[language]} {languageNames[language]}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-on-surface-variant"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 z-50 bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container-high overflow-hidden min-w-[160px]"
            >
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-all ${
                    language === lang ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="text-xl">{languageFlags[lang]}</span>
                  <span className={`flex-1 text-left font-medium ${
                    language === lang ? "text-primary" : "text-on-surface"
                  }`}>
                    {languageNames[lang]}
                  </span>
                  {language === lang && (
                    <Check size={16} className="text-primary" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
