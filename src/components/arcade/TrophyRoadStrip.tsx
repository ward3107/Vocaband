/**
 * TrophyRoadStrip — horizontal scrollable strip of the next ~5 XP_TITLES
 * tiers, with the student's current position highlighted and a glowing
 * progress segment connecting current → next.  Pure read; derives from
 * `xp` + `XP_TITLES`.  No backend, no claim flow (the tier crossing
 * itself is the reward — surfacing it is what the LevelUpModal does
 * in Phase 4).
 *
 * Scroll behaviour: horizontal overflow with snap.  In RTL the
 * container `dir="rtl"` so the native scroll axis mirrors and the
 * student's current tier still appears on the leading edge.
 *
 * Idle animation: NONE.  Five nodes each running a `motion.div` infinite
 * loop = five concurrent RAFs on a budget Android.  The strip earns its
 * delight from the gradient + ring + checkmark, not motion.
 */
import { Check, Lock } from "lucide-react";
import { XP_TITLES, getXpTitle } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { ARCADE_CARD, ARCADE_HERO_GRADIENT, ARCADE_REWARD_GRADIENT } from "./theme";

interface TrophyRoadStripProps {
  xp: number;
}

import type { Language } from "../../hooks/useLanguage";

const STRINGS: Record<Language, { title: string; current: string; max: string }> = {
  en: { title: "TROPHY ROAD", current: "NOW", max: "MAX" },
  he: { title: "מסלול הגביעים", current: "עכשיו", max: "מקס" },
  ar: { title: "طريق الكأس", current: "الآن", max: "أقصى" },
  ru: { title: "ПУТЬ ТРОФЕЕВ", current: "СЕЙЧАС", max: "МАКС" },
};

export default function TrophyRoadStrip({ xp }: TrophyRoadStripProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = STRINGS[language];
  const current = getXpTitle(xp);
  const currentIdx = XP_TITLES.findIndex((t) => t.min === current.min);

  return (
    <section className={`${ARCADE_CARD} p-3 sm:p-4`}>
      <header className={`mb-2 flex items-center justify-between text-xs font-bold tracking-widest text-cyan-200 ${isRTL ? "flex-row-reverse" : ""}`}>
        <span>{t.title}</span>
        <span className="text-amber-300">{xp} XP</span>
      </header>

      <div
        dir={dir}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {XP_TITLES.map((tier, idx) => {
          const reached = xp >= tier.min;
          const isCurrent = idx === currentIdx;
          const next = XP_TITLES[idx + 1];
          const nodeProgress = next && isCurrent
            ? Math.min(1, Math.max(0, (xp - tier.min) / (next.min - tier.min)))
            : reached ? 1 : 0;

          return (
            <div
              key={tier.min}
              className="flex shrink-0 snap-start flex-col items-center"
              style={{ minWidth: "84px" }}
            >
              <div
                className={[
                  "relative flex h-16 w-16 items-center justify-center rounded-2xl text-2xl",
                  reached ? ARCADE_HERO_GRADIENT : "bg-white/10",
                  isCurrent ? "ring-2 ring-amber-300 shadow-lg shadow-amber-500/40" : "ring-1 ring-white/15",
                ].join(" ")}
              >
                <span aria-hidden>{tier.emoji}</span>
                {reached && !isCurrent && (
                  <Check className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 p-0.5 text-white ring-2 ring-violet-900" aria-hidden />
                )}
                {!reached && (
                  <Lock className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white/30 p-0.5 text-white/70 ring-2 ring-violet-900" aria-hidden />
                )}
              </div>
              <span className={`mt-1.5 text-center text-[11px] font-bold ${reached ? "text-white" : "text-white/55"}`}>
                {tier.title}
              </span>
              <span className="text-[10px] font-semibold text-amber-200/80">
                {tier.min} XP
              </span>
              {isCurrent && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className={`${ARCADE_REWARD_GRADIENT} h-full rounded-full`}
                    style={{ width: `${Math.round(nodeProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {/* MAX cap chip — surfaces the ceiling so the road feels finite. */}
        <div
          className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-white/5 px-3 ring-1 ring-white/10"
          style={{ minWidth: "60px" }}
        >
          <span className="text-xs font-extrabold text-white/50">{t.max}</span>
        </div>
      </div>
    </section>
  );
}
