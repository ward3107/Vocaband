import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Check } from "lucide-react";
import { useLanguage, languageNames, Language } from "../hooks/useLanguage";

interface LanguageSwitcherProps {
  className?: string;
  /** Visual size of the trigger.  "pill" is the relaxed legal-page
   *  size, "compact" fits inside the TopAppBar without overpowering
   *  the action chips next to it. */
  variant?: "pill" | "compact";
}

const SHORT_CODE: Record<Language, string> = { en: "EN", he: "עב", ar: "ع" };

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "", variant = "pill" }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const languages: Language[] = ["en", "he", "ar"];

  // Close on outside click / Esc.  Hover-driven open + click-toggle on
  // touch devices both route through the same isOpen state, so this
  // single dismiss path covers all triggers.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleEnter = () => {
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setIsOpen(true);
  };
  // Brief grace window on leave so the user can travel from the
  // trigger to the dropdown without it slamming shut.
  const handleLeave = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), 150);
  };

  // Compact and pill share the same "single Globe button + dropdown"
  // shape — only the trigger sizing differs.  Keeps the API stable
  // for legacy callers (TopAppBar uses variant="compact").
  const triggerSize = variant === "compact"
    ? "px-2.5 py-2 text-xs"
    : "px-3.5 py-2.5 text-sm";

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-label={languageNames[language]}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`relative inline-flex items-center gap-1.5 ${triggerSize} rounded-xl bg-surface-container-low text-on-surface font-bold border border-surface-container-high/60 hover:bg-surface-container transition-colors`}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
      >
        <Globe size={variant === "compact" ? 14 : 16} strokeWidth={2.25} aria-hidden />
        <span>{SHORT_CODE[language]}</span>
        {/* Tiny caret so the affordance reads as "this opens" */}
        <motion.svg
          width="8" height="8" viewBox="0 0 8 8"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          aria-hidden
        >
          <path d="M1.5 2.5L4 5L6.5 2.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 mt-2 py-1.5 rounded-xl bg-surface-container-lowest shadow-2xl border border-surface-container-highest overflow-hidden min-w-[170px] z-50"
          >
            {languages.map(lang => {
              const isActive = language === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => { setLanguage(lang); setIsOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface hover:bg-surface-container"
                  }`}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                >
                  <Globe size={16} strokeWidth={2.25} aria-hidden />
                  <span className="flex-1 text-left">{languageNames[lang]}</span>
                  {isActive && <Check size={14} strokeWidth={2.5} aria-hidden />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
