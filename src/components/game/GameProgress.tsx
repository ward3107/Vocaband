/**
 * GameProgress — "Question 3 of 10" + slim progress bar, the shared
 * top-of-game chrome (open-issues §C: "No progress visibility" — some
 * modes had a bar, some a pill, matching/memory had nothing).
 *
 * Lives ABOVE the answer card so every orchestrated mode gets the same
 * placement regardless of what the mode renders inside the card.
 * Self-contained modes (Idiom / Speed Round / Review) own their full
 * UI including progress, so GameActiveView doesn't mount this for them.
 *
 * RTL: a block child with an explicit width sits at inline-start, so
 * the fill grows right-to-left under Hebrew/Arabic with no extra code —
 * matching the reading direction like the old <progress> element did.
 */
import { getThemeColors, type GameThemeColor } from "./GameShell";

interface GameProgressProps {
  /** Pre-localized label, e.g. t.questionOfTotal(3, 10). */
  label: string;
  current: number;
  total: number;
  /** Mode theme drives the fill colour; falls back to blue. */
  themeColor?: GameThemeColor;
}

export default function GameProgress({ label, current, total, themeColor }: GameProgressProps) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((current / total) * 100))) : 0;
  const fill = themeColor ? getThemeColors(themeColor).fill : "bg-blue-600";
  return (
    // role="status" + the visible label double as the screen-reader
    // announcement; the bar itself is decorative.
    <div className="flex-1 min-w-0" role="status">
      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 truncate">
        {label}
      </p>
      <div className="h-1.5 w-full rounded-full bg-stone-200/80 overflow-hidden" aria-hidden>
        <div
          className={`h-full rounded-full ${fill} motion-safe:transition-all motion-safe:duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
