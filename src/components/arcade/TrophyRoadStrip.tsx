/**
 * TrophyRoadStrip — a slim "current → next tier" progress track. Shows
 * where the student is now, a thin fill toward the next XP_TITLES tier,
 * and the next tier as the goal (emoji + title) with the XP remaining.
 * Pure read; derives from `xp` + `XP_TITLES`. The tier crossing itself is
 * the reward (LevelUpModal handles the celebration) — this just keeps the
 * goal in view so the climb feels purposeful without eating vertical space.
 */
import { XP_TITLES, getXpTitle } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { ARCADE_CARD, ARCADE_HERO_GRADIENT, ARCADE_REWARD_GRADIENT } from "./theme";

interface TrophyRoadStripProps {
  xp: number;
}

import type { Language } from "../../hooks/useLanguage";

const STRINGS: Record<Language, { next: string; toGo: string; max: string }> = {
  en: { next: "NEXT", toGo: "XP to go", max: "MAX TIER" },
  he: { next: "הבא", toGo: "XP נותרו", max: "דרגת שיא" },
  ar: { next: "التالي", toGo: "XP متبقية", max: "أعلى رتبة" },
  ru: { next: "ДАЛЕЕ", toGo: "XP осталось", max: "МАКС." },
};

export default function TrophyRoadStrip({ xp }: TrophyRoadStripProps) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language];
  const current = getXpTitle(xp);
  const currentIdx = XP_TITLES.findIndex((tier) => tier.min === current.min);
  const next = XP_TITLES[currentIdx + 1];

  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.min(1, Math.max(0, (xp - current.min) / span)) : 1;
  const toGo = next ? next.min - xp : 0;

  return (
    <div className={`${ARCADE_CARD} flex items-center gap-3 p-2.5 sm:p-3 ${isRTL ? "flex-row-reverse" : ""}`}>
      {/* Current tier medallion */}
      <div
        className={`${ARCADE_HERO_GRADIENT} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-lg shadow-violet-900/40 ring-2 ring-white/30 sm:h-12 sm:w-12 sm:text-2xl`}
        aria-hidden
      >
        {current.emoji}
      </div>

      {/* Current → next, with the fill + remaining XP */}
      <div className="min-w-0 flex-1">
        <div className={`flex items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="truncate text-sm font-bold text-white sm:text-base">
            {current.title}
            {next && (
              <>
                <span className="px-1 text-white/40">→</span>
                <span className="font-semibold text-white/75">
                  {next.emoji} {next.title}
                </span>
              </>
            )}
          </span>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-amber-300 sm:text-xs">
            {next ? `${toGo} ${t.toGo}` : t.max}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10">
          <div
            className={`${ARCADE_REWARD_GRADIENT} h-full rounded-full transition-[width] duration-500 ease-out`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Next tier goal — the destination chip the fill is reaching toward. */}
      {next ? (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl ring-1 ring-dashed ring-white/25 sm:h-12 sm:w-12 sm:text-2xl"
          aria-hidden
        >
          {next.emoji}
        </div>
      ) : (
        <span aria-hidden className="shrink-0 text-2xl">👑</span>
      )}
    </div>
  );
}
