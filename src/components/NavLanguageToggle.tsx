import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe } from "lucide-react";
import { useLanguage, Language } from "../hooks/useLanguage";

interface NavLanguageToggleProps {
  className?: string;
}

const NavLanguageToggle: React.FC<NavLanguageToggleProps> = ({ className = "" }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "he", label: "עברית", flag: "🇮🇱" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 py-2 rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden min-w-[160px] z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-sm font-bold transition-all flex items-center gap-3 ${
                  language === lang.code
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                type="button"
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
                {language === lang.code && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto"
                  >
                    ✓
                  </motion.span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Globe button */}
      <motion.button
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        className="relative bg-white text-slate-700 px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 border-2 border-slate-200 hover:border-violet-400 transition-all cursor-pointer"
        type="button"
        aria-label="Change language"
      >
        <Globe size={18} className="text-violet-600" />
        <span className="text-sm font-bold">{currentLang.flag}</span>
      </motion.button>
    </div>
  );
};

export default NavLanguageToggle;
