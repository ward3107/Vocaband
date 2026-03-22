import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  userAvatar?: string;
  onLogout?: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
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

      // Show header when at top or scrolling up
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
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
          <span className="text-2xl font-black text-primary font-headline tracking-tight">
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
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-on-surface-variant font-bold hover:text-error text-xs px-3 py-2 bg-surface-container-lowest rounded-xl shadow-sm border-2 border-primary-container/30 hover:border-error transition-all"
          >
            Logout
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-surface-container-highest overflow-hidden shadow-sm">
          {userAvatar ? (
            <img alt="Profile" src={userAvatar} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-primary-container font-bold">
              {title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;
