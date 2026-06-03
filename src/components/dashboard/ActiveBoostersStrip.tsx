import type { ReactNode } from "react";
import { Zap, Snowflake, Clover, Eye, Calendar } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { ARCADE_CARD, ARCADE_HERO_GRADIENT, ARCADE_REWARD_GRADIENT, ARCADE_STREAK_GRADIENT } from "../arcade/theme";
import { studentDashboardT } from "../../locales/student/student-dashboard";

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
  const { language, dir } = useLanguage();
  const t = studentDashboardT[language];
  // Arcade theme: frosted "power-ups" card with gradient chips (white
  // icons so they read on the gradients) + an explicit empty state.
  // Falls back to the compact pastel chip row when off.
  const arcade = useFeatureFlag('arcade_hub', false);
  const chips: {
    icon: ReactNode; arcadeIcon: ReactNode; label: string; name: string;
    meta?: string; bg: string; grad: string;
  }[] = [];
  if (isXpBoosterActive)        chips.push({ icon: <Zap size={11} className="fill-amber-500 text-amber-500" />, arcadeIcon: <Zap size={11} className="fill-white text-white" />, label: t.boosterXpDouble, name: t.boosterXpDouble, bg: 'bg-amber-100 text-amber-800 border-amber-200', grad: ARCADE_REWARD_GRADIENT });
  if (isWeekendWarriorActive)   chips.push({ icon: <Calendar size={11} />, arcadeIcon: <Calendar size={11} className="text-white" />, label: t.boosterWeekendXp, name: t.boosterWeekendXp, bg: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', grad: ARCADE_STREAK_GRADIENT });
  if (isFocusModeActive)        chips.push({ icon: <Eye size={11} />, arcadeIcon: <Eye size={11} className="text-white" />, label: t.boosterFocusMode, name: t.boosterFocusMode, bg: 'bg-violet-100 text-violet-800 border-violet-200', grad: ARCADE_HERO_GRADIENT });
  if (streakFreezes > 0)        chips.push({ icon: <Snowflake size={11} />, arcadeIcon: <Snowflake size={11} className="text-white" />, label: t.boosterStreakFreeze(streakFreezes), name: t.boosterStreakFreezeName, meta: `×${streakFreezes}`, bg: 'bg-sky-100 text-sky-800 border-sky-200', grad: ARCADE_HERO_GRADIENT });
  if (luckyCharms > 0)          chips.push({ icon: <Clover size={11} />, arcadeIcon: <Clover size={11} className="text-white" />, label: t.boosterLuckyCharm(luckyCharms), name: t.boosterLuckyCharmName, meta: `×${luckyCharms}`, bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', grad: ARCADE_HERO_GRADIENT });

  if (arcade) {
    return (
      <div className={`mb-3 ${ARCADE_CARD} p-3 sm:p-4`} dir={dir}>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-cyan-200">
          {t.powerUps}
        </div>
        {chips.length === 0 ? (
          <div className="bg-white/10 rounded-2xl px-3 py-2 text-white/60 italic text-sm">
            {t.noActiveBoosters}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold text-white ${c.grad}`}>
                {c.arcadeIcon} {c.name}
                {c.meta && (
                  <span className="ms-0.5 rounded-full bg-white/30 backdrop-blur px-1.5 py-0.5 text-[10px] font-black tabular-nums">
                    {c.meta}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (chips.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5" dir={dir}>
      {chips.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${c.bg}`}>
          {c.icon} {c.label}
        </span>
      ))}
    </div>
  );
}
