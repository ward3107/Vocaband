import React from "react";

interface PublicNavProps {
  currentPage: "home" | "terms" | "privacy" | "playground";
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}const PublicNav: React.FC<PublicNavProps> = ({
  currentPage,
  onNavigate,
  onGetStarted,
}) => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-stone-100/80 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-stone-200/50">
      <button
        onClick={() => onNavigate("home")}
        className="flex items-center gap-2"
      >
        <span className="text-2xl font-black text-primary font-headline tracking-tight">
          Vocaband
        </span>
        <span className="hidden md:inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
          Israeli English Curriculum
        </span>
      </button>

      <div className="hidden md:flex items-center gap-8">
        <button
          onClick={() => onNavigate("playground")}
          className={`font-bold transition-colors ${
            currentPage === "playground"
              ? "text-primary"
              : "text-stone-500 hover:text-primary"
          }`}
        >
          Games
        </button>
        <button
          onClick={() => onNavigate("terms")}
          className={`font-bold transition-colors ${
            currentPage === "terms"
              ? "text-primary"
              : "text-stone-500 hover:text-primary"
          }`}
        >
          Terms
        </button>
        <button
          onClick={() => onNavigate("privacy")}
          className={`font-bold transition-colors ${
            currentPage === "privacy"
              ? "text-primary"
              : "text-stone-500 hover:text-primary"
          }`}
        >
          Privacy
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onGetStarted}
          className="text-stone-600 font-bold px-4 py-2 hover:bg-stone-200 rounded-full transition-all"
        >
          Login
        </button>
        <button
          onClick={onGetStarted}
          className="signature-gradient text-white font-black px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
        >
          Get Started
        </button>
      </div>
    </nav>
  );
};

export default PublicNav;
