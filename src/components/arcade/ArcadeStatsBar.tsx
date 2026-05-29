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
import { ARCADE_CARD, ARCADE_HERO_GRADIENT, ARCADE_STREAK_GRADIENT } from "./theme";

interface ArcadeStatsBarProps {
  xp: number;
  streak: number;
}

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
    <div className={`${ARCADE_CARD} flex items-center gap-3 p-3 sm:gap-4 sm:p-4 ${isRTL ? "flex-row-reverse" : ""}`}>
      {/* Title medallion */}
      <div
        className={`${ARCADE_HERO_GRADIENT} flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg shadow-violet-900/50 ring-2 ring-white/30 sm:h-16 sm:w-16 sm:text-3xl`}
        aria-hidden
      >
        {current.emoji}
      </div>

      {/* Title + XP progress */}
      <div className="min-w-0 flex-1">
        <div className={`flex items-baseline gap-2 text-white ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="truncate text-base font-bold sm:text-lg">{current.title}</span>
          <span className="shrink-0 text-xs font-semibold text-cyan-200 sm:text-sm">
            {next ? `${xpIntoTier} / ${span} XP` : "MAX"}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10">
          <div
            className={`${ARCADE_HERO_GRADIENT} h-full rounded-full transition-[width] duration-500 ease-out`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Streak chip */}
      <div
        className={`${ARCADE_STREAK_GRADIENT} flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-white shadow-lg shadow-rose-900/40 ring-2 ring-white/30 sm:px-4`}
        aria-label={`${streak} day streak`}
      >
        <Flame className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        <span className="text-sm font-extrabold tabular-nums sm:text-base">{streak}</span>
      </div>
    </div>
  );
}
