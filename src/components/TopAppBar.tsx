import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  userName?: string;
  showBack?: boolean;
  onBack?: () => void;
  userAvatar?: string;
  onLogout?: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  userName,
  showBack = false,
  onBack,
  userAvatar,
  onLogout,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Only show header when at the very top of the page
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else {
        // Hide when anywhere else on the page
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-stone-100 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:scale-105 transition-transform"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-2xl font-black font-headline tracking-tight signature-gradient-text">
            {title}
          </span>
          {subtitle && (
            <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {userName && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-on-surface-variant font-medium">Welcome back,</span>
            <span className="text-sm font-bold text-on-surface">{userName}</span>
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-on-surface-variant font-bold hover:text-error text-xs px-3 py-2 bg-surface-container-lowest rounded-xl shadow-sm border-2 border-primary-container/30 hover:border-error transition-all"
          >
            Logout
          </button>
        )}
        <div className="w-10 h-10 rounded-full signature-gradient border-2 border-white overflow-hidden shadow-sm">
          {userAvatar && /^https?:\/\//i.test(userAvatar) ? (
            <img alt="Profile" src={userAvatar} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {userName ? userName.charAt(0).toUpperCase() : title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;
