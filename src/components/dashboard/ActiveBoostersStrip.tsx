import { Zap, Snowflake, Clover, Eye, Calendar } from "lucide-react";

interface ActiveBoostersStripProps {
  isXpBoosterActive: boolean;
  isFocusModeActive: boolean;
  isWeekendWarriorActive: boolean;
  streakFreezes: number;
  luckyCharms: number;
}

/**
 * Small horizontal strip that shows which boosters are actively
 * affecting the student's gameplay right now.  Only renders when at
 * least one is active so the dashboard stays clean.  Mirrors the chips
 * the student sees at game-start in the future, so they always know why
 * an XP number looks bigger than usual.
 */
export default function ActiveBoostersStrip({
  isXpBoosterActive, isFocusModeActive, isWeekendWarriorActive,
  streakFreezes, luckyCharms,
}: ActiveBoostersStripProps) {
  const chips: { icon: React.ReactNode; label: string; bg: string }[] = [];
  if (isXpBoosterActive)        chips.push({ icon: <Zap size={11} className="fill-amber-500 text-amber-500" />,    label: '2× XP', bg: 'bg-amber-100 text-amber-800 border-amber-200' });
  if (isWeekendWarriorActive)   chips.push({ icon: <Calendar size={11} />,                                          label: 'Weekend 2× XP', bg: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' });
  if (isFocusModeActive)        chips.push({ icon: <Eye size={11} />,                                              label: 'Focus mode', bg: 'bg-violet-100 text-violet-800 border-violet-200' });
  if (streakFreezes > 0)        chips.push({ icon: <Snowflake size={11} />,                                        label: `Streak Freeze ×${streakFreezes}`, bg: 'bg-sky-100 text-sky-800 border-sky-200' });
  if (luckyCharms > 0)          chips.push({ icon: <Clover size={11} />,                                           label: `Lucky Charm ×${luckyCharms}`, bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' });

  if (chips.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${c.bg}`}>
          {c.icon} {c.label}
        </span>
      ))}
    </div>
  );
}
