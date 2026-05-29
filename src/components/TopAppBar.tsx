import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, X, Crown, LogOut } from "lucide-react";
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
  /** Optional ReactNode rendered at the start of the right-side
   *  controls (before Exit/Scale/Language/User chip).  Used today by
   *  the teacher dashboard to host the Voca switcher button so it
   *  doesn't have to float over the header with fixed positioning. */
  extraTrailing?: React.ReactNode;
  /** Optional plan pill rendered next to the teacher name so every
   *  teacher sees their plan at a glance — Free / Trial · Nd / Pro /
   *  School.  Omit for non-teacher contexts (student dashboards etc). */
  planBadge?: {
    label: string;
    tone: "free" | "trial" | "pro" | "school";
  };
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
  extraTrailing,
  planBadge,
}) => {
  const { language } = useLanguage();
  // Localised back / exit fallbacks — parents can still pass an
  // explicit exitLabel ("End show", "Cancel", etc.) and it wins.
  const backAria = language === "he" ? "חזרה" : language === "ar" ? "رجوع" : "Go back";
  const defaultExit = language === "he" ? "יציאה" : language === "ar" ? "خروج" : "Exit";
  const effectiveExitLabel = exitLabel ?? defaultExit;
  // Mobile profile-menu localisation. Kept inline (3 strings × 3 langs)
  // rather than threading through the teacher-dashboard locale, because
  // the bar is used by every screen — student, teacher, setup wizards.
  const menuLabels = {
    profile: language === "he" ? "פרופיל" : language === "ar" ? "الملف الشخصي" : "Profile",
    welcome: language === "he" ? "שלום," : language === "ar" ? "مرحبًا،" : "Welcome back,",
    logout: language === "he" ? "התנתק" : language === "ar" ? "تسجيل الخروج" : "Logout",
  } as const;
  const safeAvatarUrl = sanitizeAvatarUrl(userAvatar);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the mobile profile menu on outside-tap or Escape.  Uses
  // pointerdown rather than click so the menu closes before the next
  // tap fires its own click handler (avoids the "tap-through" feel on
  // touch devices where two taps are needed to dismiss + select).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

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
      {/* ─── Desktop cluster (sm+) ──────────────────────────────────
          Unchanged from the original layout.  Mobile compresses to
          plan-badge + avatar-as-menu-button (see below) because the
          full row was clipping the teacher name to "V..." on phones
          (no room for Switch + globe + PRO + Logout + avatar in one
          line). */}
      <div className="hidden sm:flex items-center gap-2 sm:gap-3">
        {/* Parent-supplied trailing control(s).  Rendered first so a
            "switch Voca" pill sits to the left of Exit/Scale/Language/
            User chip rather than floating over the header. */}
        {extraTrailing}
        {/* Exit button — single-click escape from a multi-step flow.
            Sits before all other right-side controls so it's easy
            to find with a glance, no matter the step.  Renders only
            when the parent flow opts in via `onExit`. */}
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label={effectiveExitLabel}
            style={{
              backgroundColor: 'var(--vb-surface-alt)',
              color: 'var(--vb-text-secondary)',
              borderColor: 'var(--vb-border)',
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 transition-colors border-2"
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
        {/* Tablet-only LanguageSwitcher (between sm and md). Phones
            hit the in-dropdown copy below. */}
        <div className="md:hidden">
          <LanguageSwitcher variant="compact" className="scale-85 origin-right" />
        </div>
        {userName && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-on-surface-variant font-medium">Welcome back,</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface">{userName}</span>
              {planBadge && <PlanBadge {...planBadge} />}
            </div>
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-on-surface-variant font-bold hover:text-error text-xs px-3 py-2 bg-surface-container-lowest rounded-lg shadow-sm border-2 border-primary-container/30 hover:border-error transition-all"
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

      {/* ─── Mobile cluster (<sm) ───────────────────────────────────
          Just the plan badge + avatar-as-menu-button.  Tapping the
          avatar opens a dropdown sheet with Switch / Language / Exit /
          Logout so the header itself stays uncluttered and the page
          title gets enough room to render without truncating. */}
      <div className="sm:hidden flex items-center gap-2 relative" ref={menuRef}>
        {planBadge && <PlanBadge {...planBadge} />}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuLabels.profile}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="w-10 h-10 rounded-full signature-gradient border-2 border-white overflow-hidden shadow-sm active:scale-95 transition-transform"
        >
          {safeAvatarUrl ? (
            <img alt="" src={safeAvatarUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {userName ? userName.charAt(0).toUpperCase() : title.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        {menuOpen && (
          <div
            role="menu"
            style={{
              backgroundColor: 'var(--vb-surface)',
              borderColor: 'var(--vb-border)',
            }}
            className={`absolute top-12 ${language === 'he' || language === 'ar' ? 'left-0' : 'right-0'} w-60 rounded-2xl border-2 shadow-2xl p-3 z-50 flex flex-col gap-2`}
          >
            {userName && (
              <div className="px-2 pt-1 pb-2 border-b border-[var(--vb-border)]">
                <div className="text-[11px] text-on-surface-variant font-medium">{menuLabels.welcome}</div>
                <div className="text-sm font-bold text-on-surface truncate">{userName}</div>
              </div>
            )}
            {extraTrailing && (
              <div className="px-1" onClick={() => setMenuOpen(false)}>
                {extraTrailing}
              </div>
            )}
            <div className="px-1" onClick={() => setMenuOpen(false)}>
              <LanguageSwitcher variant="compact" />
            </div>
            {showScaleControl && (
              <div className="px-1">
                <UiScaleControl />
              </div>
            )}
            {onExit && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onExit(); }}
                style={{
                  backgroundColor: 'var(--vb-surface-alt)',
                  color: 'var(--vb-text-secondary)',
                  borderColor: 'var(--vb-border)',
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border-2"
              >
                <X size={14} />
                <span>{effectiveExitLabel}</span>
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onLogout(); }}
                className="inline-flex items-center justify-center gap-1.5 text-on-surface-variant font-bold hover:text-error text-sm px-3 py-2 bg-surface-container-lowest rounded-lg shadow-sm border-2 border-primary-container/30 hover:border-error transition-all"
              >
                <LogOut size={14} />
                <span>{menuLabels.logout}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PlanBadge — small uppercase pill rendered next to the teacher name.
   Four tones map 1:1 to the plan card colour palette so the brand
   language stays consistent across surfaces.
────────────────────────────────────────────────────────────────────────────────── */
const PLAN_BADGE_TONES: Record<
  NonNullable<TopAppBarProps["planBadge"]>["tone"],
  string
> = {
  free:   "bg-amber-100 text-amber-900 ring-amber-300",
  trial:  "bg-amber-200 text-amber-950 ring-amber-400",
  pro:    "bg-emerald-100 text-emerald-900 ring-emerald-300",
  school: "bg-indigo-100 text-indigo-900 ring-indigo-300",
};

const PlanBadge: React.FC<NonNullable<TopAppBarProps["planBadge"]>> = ({ label, tone }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider ring-1 whitespace-nowrap ${PLAN_BADGE_TONES[tone]}`}
    >
      <Crown size={10} className="shrink-0" />
      {label}
    </span>
  );
};

export default TopAppBar;
