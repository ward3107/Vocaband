import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import {
  useLanguage,
  ALL_LANGUAGES,
  languageNames,
  languageShortLabels,
} from "../hooks/useLanguage";

/**
 * StudentLangButton — the one language switcher students see on every
 * in-app screen (dashboard, mode picker, practice/daily, shop, global
 * leaderboard, game-finished).
 *
 * The dashboard used to lock the UI language after login, so mid-flow
 * screens had no way to change it — a HE/AR student who landed on English
 * (or vice-versa) was stuck.  Teachers asked for a switcher that is always
 * reachable, so this compact globe pill drops into each screen's header.
 *
 * Touch-first: click toggles the menu on every device (no hover
 * dependency), outside-tap + Escape close it, and every tap target carries
 * `touch-action: manipulation`.  The dropdown surface is white so it stays
 * legible on both the light iOS screens and the darker game backgrounds.
 */
interface StudentLangButtonProps {
  className?: string;
  /** Visual tone of the trigger pill.  "light" (default) suits the light
   *  iOS-grouped student screens; "onDark" suits dark celebration / game
   *  backgrounds where a translucent white pill reads better. */
  tone?: "light" | "onDark";
}

export default function StudentLangButton({
  className = "",
  tone = "light",
}: StudentLangButtonProps) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Outside-tap + Escape dismissal.  Touch never fires mouseleave, so the
  // menu is click-to-toggle and this is the only close path.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Localized so a student who can't read English still recognises the
  // control as "change language".
  const ariaLabel =
    language === "he" ? "החלף שפה" : language === "ar" ? "تغيير اللغة" : "Change language";

  const triggerCls =
    tone === "onDark"
      ? "bg-white/15 text-white border border-white/25 hover:bg-white/25"
      : "bg-[var(--ios-fill-tertiary)] text-[color:var(--ios-label)] border border-[color:var(--ios-separator)] hover:bg-[var(--ios-fill-secondary)]";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition-colors ${triggerCls}`}
      >
        <Globe size={15} strokeWidth={2.25} aria-hidden />
        {/* Active language code so the pill reads as a switcher (and shows
            which language is on), not a bare globe. */}
        <span className="tracking-wide">{languageShortLabels[language]}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M1.5 2.5L4 5L6.5 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full end-0 mt-2 py-1.5 rounded-xl bg-white shadow-2xl border border-stone-200 overflow-hidden min-w-[168px] z-[200]"
        >
          {ALL_LANGUAGES.map((lng) => {
            const active = language === lng;
            return (
              <button
                key={lng}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(lng);
                  setOpen(false);
                }}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-bold transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Globe size={16} strokeWidth={2.25} aria-hidden />
                <span className="flex-1 text-start">{languageNames[lng]}</span>
                {active && <Check size={14} strokeWidth={2.5} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
