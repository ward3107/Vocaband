/**
 * PowerUpsStrip — shows how many of each consumable power-up the
 * student owns (Skip, 50/50, Reveal Letter).  Fills a gap in the
 * dashboard: students were buying power-ups in the shop and had no
 * way to tell how many they had without opening the in-game UI
 * mid-round.
 *
 * Power-up inventory lives under `user.powerUps` as
 * `{ skip: 3, fifty_fifty: 1, reveal_letter: 2 }` (any id the shop
 * ships).  Strip hides itself when every count is zero so a new
 * student doesn't see empty clutter.
 */
import { FastForward, Scissors, Lightbulb } from 'lucide-react';

export interface PowerUpsStripProps {
  powerUps?: Record<string, number>;
}

/**
 * Power-up id → display config.  Keeps the visual style consistent
 * with ActiveBoostersStrip (small rounded chip with coloured bg).
 * Only ids that the shop actually sells are listed here — if a new
 * power-up ships, add it once here and it's rendered.
 */
const POWERUP_CHIPS: Array<{ id: string; label: string; icon: React.ReactNode; bg: string }> = [
  { id: 'skip',          label: 'Skip',          icon: <FastForward size={11} />,  bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'fifty_fifty',   label: '50/50',         icon: <Scissors size={11} />,     bg: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'reveal_letter', label: 'Reveal Letter', icon: <Lightbulb size={11} />,    bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
];

export default function PowerUpsStrip({ powerUps }: PowerUpsStripProps) {
  const chips = POWERUP_CHIPS
    .map(c => ({ ...c, count: powerUps?.[c.id] ?? 0 }))
    .filter(c => c.count > 0);

  if (chips.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Your power-ups">
      {chips.map(c => (
        <span
          key={c.id}
          className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${c.bg}`}
        >
          {c.icon} {c.label} ×{c.count}
        </span>
      ))}
    </div>
  );
}
