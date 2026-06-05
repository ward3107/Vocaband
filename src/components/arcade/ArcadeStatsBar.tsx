/**
 * ArcadeStatsBar — top strip showing the student's current title, XP
 * progress to next tier, and streak.  Reads from the existing XP_TITLES
 * tier table so there's a single source of truth for level naming.
 *
 * Layout (LTR):  [TITLE+EMOJI]  [XP / NEXT bar]   [🔥 streak chip]
 *
 * Replaces the visual weight of `StudentGreetingCard` for the arcade
 * variant — the greeting is moved to a smaller, secondary slot since the
 * "where am I in the game" stats outrank the greeting in Brawl-Stars
 * grammar.
 */
import { Flame } from "lucide-react";
import { XP_TITLES, getXpTitle } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { ARCADE_HERO_GRADIENT, ARCADE_STREAK_GRADIENT } from "./theme";

interface ArcadeStatsBarProps {
  xp: number;
  streak: number;
}

/**
 * ArcadeStatsBar — a single slim pill at the top of the hub: tier emoji,
 * title, a thin inline XP-to-next bar, the XP count, and a streak chip,
 * all on one line.  Deliberately low-profile (a "status line", not a
 * card) so the orbital pet below stays the visual hero.
 */
export default function ArcadeStatsBar({ xp, streak }: ArcadeStatsBarProps) {
  const { isRTL } = useLanguage();
  const current = getXpTitle(xp);
  const currentIdx = XP_TITLES.findIndex((t) => t.min === current.min);
  const next = XP_TITLES[currentIdx + 1];
  // Span = XP between current tier floor and next tier floor.  At the
  // top tier (Ascended), there's no next; we display "MAX" and a
  // full bar so the student feels the cap as a flex, not a wall.
  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.min(1, Math.max(0, (xp - current.min) / span)) : 1;
  const xpIntoTier = xp - current.min;

  return (
    <div className="flex justify-center">
      <div
        className={`flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-md shadow-lg shadow-violet-900/30 sm:gap-3 sm:px-4 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <span aria-hidden className="text-lg leading-none sm:text-xl">{current.emoji}</span>
        <span className="shrink-0 truncate text-sm font-bold text-white sm:text-base">{current.title}</span>

        {/* Thin inline XP-to-next bar */}
        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10 sm:w-28">
          <div
            className={`${ARCADE_HERO_GRADIENT} h-full rounded-full transition-[width] duration-500 ease-out`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-cyan-200 sm:text-sm">
          {next ? `${xpIntoTier}/${span}` : "MAX"}
        </span>

        {/* Streak chip */}
        <span
          className={`${ARCADE_STREAK_GRADIENT} flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-white ring-1 ring-white/30`}
          aria-label={`${streak} day streak`}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden />
          <span className="text-xs font-extrabold tabular-nums sm:text-sm">{streak}</span>
        </span>
      </div>
    </div>
  );
}
