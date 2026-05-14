import React, { useState, useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import UiScaleControl from "./dashboard/UiScaleControl";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../hooks/useLanguage";

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  userName?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** When provided, render a single-click "Exit" pill on the right
   *  side of the bar.  Use in multi-step flows (assignment wizard,
   *  Quick Play setup, Class Show, worksheet builder, etc.) so a
   *  teacher on step 3 can bail in one tap instead of clicking Back
   *  three times.  Distinct from `onBack`, which steps backward.
   *  Default label is "Exit"; pass `exitLabel` to override (e.g.
   *  "Cancel" inside a setup wizard, "End show" for Class Show). */
  onExit?: () => void;
  exitLabel?: string;
  userAvatar?: string;
  onLogout?: () => void;
  /** When true, surface the A/A/A display-size picker next to the
   *  user chip.  Currently teacher-only — students don't need it on
   *  their own dashboards (they can use browser zoom). */
  showScaleControl?: boolean;
}

/**
 * Sanitize a URL to only allow safe http/https URLs for use in img src.
 * Returns the URL if safe, or undefined if potentially malicious.
 */
function sanitizeAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  userName,
  showBack = false,
  onBack,
  onExit,
  exitLabel,
  userAvatar,
  onLogout,
  showScaleControl = false,
}) => {
  const { language } = useLanguage();
  // Localised back / exit fallbacks — parents can still pass an
  // explicit exitLabel ("End show", "Cancel", etc.) and it wins.
  const backAria = language === "he" ? "חזרה" : language === "ar" ? "رجوع" : "Go back";
  const defaultExit = language === "he" ? "יציאה" : language === "ar" ? "خروج" : "Exit";
  const effectiveExitLabel = exitLabel ?? defaultExit;
  const safeAvatarUrl = sanitizeAvatarUrl(userAvatar);
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
      style={{ backgroundColor: 'color-mix(in srgb, var(--vb-surface) 90%, transparent)' }}
      className={`fixed top-0 left-0 w-full z-50 backdrop-blur-md flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--vb-border)] transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {showBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full signature-gradient shadow-lg shadow-blue-500/20 text-white hover:scale-105 active:scale-95 transition-transform"
            aria-label={backAria}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-lg sm:text-2xl font-black font-headline tracking-tight signature-gradient-text truncate">
            {title}
          </span>
          {subtitle && (
            <span className="hidden sm:inline-block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Exit button — single-click escape from a multi-step flow.
            Sits before all other right-side controls so it's easy
            to find with a glance, no matter the step.  Renders only
            when the parent flow opts in via `onExit`. */}
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label={effectiveExitLabel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95 transition-colors border-2 border-stone-200"
          >
            <X size={14} />
            <span>{effectiveExitLabel}</span>
          </button>
        )}
        {showScaleControl && <UiScaleControl />}
        {/* Language switcher - compact variant for tight header space */}
        <div className="hidden md:block">
          <LanguageSwitcher variant="compact" className="scale-90 origin-right" />
        </div>
        {/* Mobile language dropdown - simpler button */}
        <div className="md:hidden">
          <LanguageSwitcher variant="compact" className="scale-85 origin-right" />
        </div>
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
          {safeAvatarUrl ? (
            <img alt="Profile" src={safeAvatarUrl} className="w-full h-full object-cover" />
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
