import React from "react";
import { ChevronLeft } from "lucide-react";

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  userAvatar?: string;
  onLogout?: () => void;
  onPrivacy?: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  userAvatar,
  onLogout,
  onPrivacy,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-stone-200/50">
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
        {onPrivacy && (
          <button
            onClick={onPrivacy}
            className="text-on-surface-variant hover:text-on-surface font-bold text-xs px-3 py-2 bg-surface-container-lowest rounded-xl shadow-sm border-2 border-surface-container-high hover:border-outline-variant transition-all"
          >
            Privacy
          </button>
        )}
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
