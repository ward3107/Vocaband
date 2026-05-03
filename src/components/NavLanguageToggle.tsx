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

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "he", label: "עב" },
    { code: "ar", label: "ع" },
  ];

  const currentLabel = languages.find(l => l.code === language)?.label || "EN";

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
            transition={{ duration: 0.1 }}
            className="absolute top-full right-0 mt-2 py-1.5 rounded-xl bg-white shadow-xl border border-stone-200 overflow-hidden min-w-[70px] z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`w-full px-4 py-2 text-sm font-bold transition-colors ${
                  language === lang.code
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                type="button"
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button - matches Try Demo gradient style */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative bg-gradient-to-r from-primary via-violet-600 to-fuchsia-600 text-white text-sm font-black px-4 py-2.5 rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 flex items-center gap-1.5 border-2 border-white/40 overflow-hidden cursor-pointer"
        type="button"
        aria-label="Change language"
      >
        {/* Animated shine sweep */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        {/* Inner shadow for depth */}
        <div className="absolute inset-0 bg-black/10 rounded-full" />

        {/* Globe icon — restored 2026-05.  Earlier UI polish swapped
            the globe for plain letters but teachers were missing the
            universal "language" affordance the icon provides.  Globe +
            current code keeps the language unambiguous in any locale. */}
        <Globe size={16} className="relative z-10" strokeWidth={2.5} aria-hidden />
        <span className="relative z-10">{currentLabel}</span>

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
