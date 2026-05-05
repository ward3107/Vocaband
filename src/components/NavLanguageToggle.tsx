import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe } from "lucide-react";
import { useLanguage, Language } from "../hooks/useLanguage";

interface NavLanguageToggleProps {
  className?: string;
}

const NavLanguageToggle: React.FC<NavLanguageToggleProps> = ({ className = "" }) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "he", label: "עברית" },
    { code: "ar", label: "العربية" },
  ];

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Position dropdown based on direction: LTR aligns right, RTL aligns left
  const dropdownPosition = isRTL ? "left-0" : "right-0";

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 py-2 rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden min-w-[160px] z-[200] ${dropdownPosition}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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
                <Globe size={18} strokeWidth={2.25} aria-hidden />
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
        className="relative bg-white text-slate-700 px-3 py-2.5 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 border-2 border-slate-200 hover:border-violet-400 transition-all cursor-pointer"
        type="button"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        {/* Animated shine sweep */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        {/* Inner shadow for depth */}
        <div className="absolute inset-0 bg-black/10 rounded-full" />

        {/* Globe icon */}
        <Globe size={18} className="relative z-10" strokeWidth={2.5} aria-hidden />

        {/* Dropdown arrow */}
        <motion.svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className="relative z-10"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <path
            d="M1.5 2.5L4 5L6.5 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.button>
    </div>
  );
};

export default NavLanguageToggle;
