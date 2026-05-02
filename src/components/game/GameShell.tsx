/**
 * GameShell — shared layout wrapper for every game-mode component.
 *
 * Standardizes the per-mode visual language:
 *   - small theme-coloured "MODE NAME" pill at the top
 *   - vertically-centred body via flex (the parent GameActiveView
 *     already provides the min-h flex wrapper, but GameShell tightens
 *     the inner column so the body doesn't drift to one edge)
 *   - optional theme-coloured background gradient
 *   - optional sticky bottom action area (bigger tap zone for the
 *     primary action, kept above the iOS safe-area)
 *
 * Phase-3 mode redesigns adopt this so each mode commit is small —
 * the per-mode component focuses on its mechanic, this wrapper
 * carries the consistent chrome.
 *
 * Theme color is a Tailwind colour name (e.g. "emerald", "rose",
 * "violet").  Tailwind 3 needs the literal class strings to be
 * present in source for JIT to find them, so we map the theme name
 * to a small set of pre-resolved Tailwind class strings instead of
 * doing string-template interpolation.
 */
import type { ReactNode } from "react";

export type GameThemeColor =
  | "emerald" // classic / listening / reverse
  | "rose"    // true-false (paired with emerald)
  | "violet"  // spelling, letter-sounds
  | "cyan"    // flashcards
  | "amber"   // matching
  | "indigo"  // scramble
  | "teal"    // sentence-builder
  | "lime"    // fill-blank
  | "pink"    // memory-flip
  | "orange"  // word-chains
  | "sky"     // idiom — chosen for "blue sky thinking" / abstract figurative meaning
  | "fuchsia"; // relations — synonyms + antonyms

interface ThemeColors {
  /** Page background gradient — applied ONLY if `gradient` prop is true. */
  gradient: string;
  /** "MODE NAME" pill background + text. */
  pillBg: string;
  pillText: string;
  /** Border colour for option-card resting state.  Pre-resolved as a
   *  full Tailwind class string so JIT can see it. */
  border: string;
  /** Hover background for themed answer cards.  Pre-resolved literal. */
  hoverBg: string;
  /** Solid fill for sticky bottom bar / progress bar. */
  fill: string;
  /** Soft fill for the hero card behind the prompt word. */
  cardBg: string;
}

// Each entry must use literal Tailwind class strings — JIT scans
// source for class names, so values built via string concatenation
// won't be picked up.  When adding a new theme, append a row
// verbatim.
const THEME_TABLE: Record<GameThemeColor, ThemeColors> = {
  emerald: { gradient: "from-emerald-50 via-white to-emerald-50",  pillBg: "bg-emerald-100", pillText: "text-emerald-700", border: "border-emerald-200", hoverBg: "hover:bg-emerald-50", fill: "bg-emerald-500", cardBg: "bg-emerald-50" },
  rose:    { gradient: "from-rose-50 via-white to-pink-50",        pillBg: "bg-rose-100",    pillText: "text-rose-700",    border: "border-rose-200",    hoverBg: "hover:bg-rose-50",    fill: "bg-rose-500",    cardBg: "bg-rose-50"    },
  violet:  { gradient: "from-violet-50 via-white to-purple-50",    pillBg: "bg-violet-100",  pillText: "text-violet-700",  border: "border-violet-200",  hoverBg: "hover:bg-violet-50",  fill: "bg-violet-500",  cardBg: "bg-violet-50"  },
  cyan:    { gradient: "from-cyan-50 via-white to-teal-50",        pillBg: "bg-cyan-100",    pillText: "text-cyan-700",    border: "border-cyan-200",    hoverBg: "hover:bg-cyan-50",    fill: "bg-cyan-500",    cardBg: "bg-cyan-50"    },
  amber:   { gradient: "from-amber-50 via-white to-orange-50",     pillBg: "bg-amber-100",   pillText: "text-amber-700",   border: "border-amber-200",   hoverBg: "hover:bg-amber-50",   fill: "bg-amber-500",   cardBg: "bg-amber-50"   },
  indigo:  { gradient: "from-indigo-50 via-white to-violet-50",    pillBg: "bg-indigo-100",  pillText: "text-indigo-700",  border: "border-indigo-200",  hoverBg: "hover:bg-indigo-50",  fill: "bg-indigo-500",  cardBg: "bg-indigo-50"  },
  teal:    { gradient: "from-teal-50 via-white to-emerald-50",     pillBg: "bg-teal-100",    pillText: "text-teal-700",    border: "border-teal-200",    hoverBg: "hover:bg-teal-50",    fill: "bg-teal-500",    cardBg: "bg-teal-50"    },
  lime:    { gradient: "from-lime-50 via-white to-emerald-50",     pillBg: "bg-lime-100",    pillText: "text-lime-700",    border: "border-lime-200",    hoverBg: "hover:bg-lime-50",    fill: "bg-lime-500",    cardBg: "bg-lime-50"    },
  pink:    { gradient: "from-pink-50 via-white to-rose-50",        pillBg: "bg-pink-100",    pillText: "text-pink-700",    border: "border-pink-200",    hoverBg: "hover:bg-pink-50",    fill: "bg-pink-500",    cardBg: "bg-pink-50"    },
  orange:  { gradient: "from-orange-50 via-white to-amber-50",     pillBg: "bg-orange-100",  pillText: "text-orange-700",  border: "border-orange-200",  hoverBg: "hover:bg-orange-50",  fill: "bg-orange-500",  cardBg: "bg-orange-50"  },
  sky:     { gradient: "from-sky-50 via-white to-blue-50",         pillBg: "bg-sky-100",     pillText: "text-sky-700",     border: "border-sky-200",     hoverBg: "hover:bg-sky-50",     fill: "bg-sky-500",     cardBg: "bg-sky-50"     },
  fuchsia: { gradient: "from-fuchsia-50 via-white to-pink-50",     pillBg: "bg-fuchsia-100", pillText: "text-fuchsia-700", border: "border-fuchsia-200", hoverBg: "hover:bg-fuchsia-50", fill: "bg-fuchsia-500", cardBg: "bg-fuchsia-50" },
};

export function getThemeColors(color: GameThemeColor): ThemeColors {
  return THEME_TABLE[color];
}

interface GameShellProps {
  /** Theme key — drives pill colour, ring colour, optional gradient. */
  theme: GameThemeColor;
  /** Short uppercase label printed in the top pill (e.g. "CLASSIC"). */
  modeLabel: string;
  /** Body content — the mode-specific UI. */
  children: ReactNode;
  /** Optional sticky bottom bar (e.g. progress + score).  Stays above
   *  the iOS safe-area inset.  When omitted, no bottom bar renders. */
  bottomBar?: ReactNode;
  /** When true, applies the theme's soft background gradient to the
   *  shell.  Default false — many modes already sit inside a parent
   *  that paints its own background, and we don't want double-stacked
   *  gradients. */
  gradient?: boolean;
}

export default function GameShell({ theme, modeLabel, children, bottomBar, gradient = false }: GameShellProps) {
  const colors = getThemeColors(theme);
  return (
    <div
      className={`w-full flex flex-col items-center gap-3 sm:gap-5 ${
        gradient ? `bg-gradient-to-b ${colors.gradient} rounded-2xl p-3 sm:p-5` : ""
      }`}
    >
      <span
        className={`inline-block ${colors.pillBg} ${colors.pillText} font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}
      >
        {modeLabel}
      </span>
      <div className="w-full">{children}</div>
      {bottomBar && (
        <div className="w-full pb-[env(safe-area-inset-bottom)]">{bottomBar}</div>
      )}
    </div>
  );
}
