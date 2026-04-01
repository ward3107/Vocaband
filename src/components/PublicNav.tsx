import React from "react";
import { Gamepad2 } from "lucide-react";

interface PublicNavProps {
  currentPage: "home" | "terms" | "privacy";
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
  onTryDemo?: () => void;
}

const PublicNav: React.FC<PublicNavProps> = ({
  currentPage,
  onNavigate,
  onGetStarted,
  onTryDemo,
}) => {
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
          Israeli English Curriculum
        </span>
      </button>

      <div className="flex items-center gap-2 md:gap-3">
        {onTryDemo ? (
          <button
            onClick={onTryDemo}
            className="bg-surface-container-lowest/20 border-2 border-surface-container-lowest/40 backdrop-blur-sm text-primary text-sm font-black px-4 py-1.5 md:px-5 md:py-2 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1"
          >
            <Gamepad2 size={14} />
            <span className="hidden sm:inline">Try Demo</span>
            <span className="sm:hidden">Demo</span>
          </button>
        ) : (
          <button
            onClick={onGetStarted}
            className="signature-gradient text-white text-sm font-black px-4 py-1.5 md:px-5 md:py-2 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md shadow-blue-500/20"
          >
            Get Started
          </button>
        )}
      </div>
    </nav>
  );
};

export default PublicNav;
