import React from "react";
import { useLanguage } from "../hooks/useLanguage";
import { landingPageT } from "../locales/student/landing-page";
import NavLanguageToggle from "./NavLanguageToggle";

interface PublicNavProps {
  currentPage: "home" | "terms" | "privacy";
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
}

const PublicNav: React.FC<PublicNavProps> = ({
  currentPage,
  onNavigate,
  onGetStarted,
}) => {
  const { language } = useLanguage();
  const t = landingPageT[language];
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-stone-100/80 backdrop-blur-md flex justify-between items-center px-4 md:px-6 py-2 border-b border-stone-200/50">
      <button
        onClick={() => onNavigate("home")}
        className="flex items-center gap-2"
      >
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg signature-gradient flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-white text-base md:text-lg font-black font-headline italic">V</span>
        </div>
        <span className="text-lg md:text-xl font-black text-primary font-headline tracking-tight">
          Vocaband
        </span>
        <span className="hidden md:inline-block px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
          {t.navCefrBadge}
        </span>
      </button>

      <div className="flex items-center gap-2 md:gap-3">
        <NavLanguageToggle />
      </div>
    </nav>
  );
};

export default PublicNav;
