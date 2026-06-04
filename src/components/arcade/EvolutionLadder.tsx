/**
 * EvolutionLadder — the full 8-stage pet journey (PET_MILESTONES), shown as
 * a connected track with the reward each stage grants. Replaces the generic
 * XP-titles TrophyRoadStrip on the arcade hub so the "journey" the student
 * sees is the pet's own egg → ascended climb.
 *
 *   reached  → gradient node, reward lit
 *   current  → amber ring + glow
 *   next     → dashed outline, emoji shown (the goal)
 *   locked   → 🔒, reward muted
 */
import { Fragment } from "react";
import { PET_MILESTONES, type PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_CARD, ARCADE_HERO_GRADIENT } from "./theme";

const HEADER: Record<Language, string> = {
  en: "Evolution ladder",
  he: "מסלול ההתפתחות",
  ar: "سلّم التطوّر",
  ru: "Лестница эволюции",
};
const START: Record<Language, string> = { en: "Start", he: "התחלה", ar: "البداية", ru: "Старт" };

/** A tiny reward chip per stage: "+50", an avatar/frame/title emoji, etc. */
function rewardBadge(m: PetMilestone, lang: Language): string {
  const r = m.reward;
  if (r.kind === "xp") return r.value === 0 ? (START[lang] ?? START.en) : `+${r.value}`;
  if (r.kind === "unlock_avatar") return String(r.value);
  if (r.kind === "unlock_title") return "👑";
  if (r.kind === "unlock_frame") return r.value === "gold" ? "🥇" : r.value === "holographic" ? "✨" : "🖼️";
  return "";
}

interface EvolutionLadderProps {
  xp: number;
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
}

export default function EvolutionLadder({ xp, currentStage, nextStage }: EvolutionLadderProps) {
  const { language, dir } = useLanguage();
  const lang = (HEADER[language] ? language : "en") as Language;
  const currentIdx = PET_MILESTONES.findIndex((m) => m.stage === currentStage.stage);

  return (
    <div dir={dir} className={`${ARCADE_CARD} w-full max-w-sm p-3`}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-200">{HEADER[lang]}</span>
        <span className="text-[11px] font-bold text-amber-300">
          {currentStage.emoji} {currentStage.stage} · {xp} XP
        </span>
      </div>

      <div className="flex items-start justify-between">
        {PET_MILESTONES.map((m, i) => {
          const reached = xp >= m.xpRequired;
          const isCurrent = m.stage === currentStage.stage;
          const isNext = !!nextStage && m.stage === nextStage.stage;
          return (
            <Fragment key={m.stage}>
              <div className="flex shrink-0 flex-col items-center" style={{ width: 34 }}>
                <div
                  className={[
                    "relative flex h-9 w-9 items-center justify-center rounded-xl text-base",
                    reached ? ARCADE_HERO_GRADIENT : "bg-white/10",
                    isCurrent ? "ring-2 ring-amber-300 shadow-lg shadow-amber-500/40" : "",
                  ].join(" ")}
                  style={isNext ? { outline: "2px dashed rgba(255,255,255,0.5)", outlineOffset: 1 } : undefined}
                >
                  {reached || isNext ? (
                    <span aria-hidden className={isNext ? "opacity-70" : undefined}>{m.emoji}</span>
                  ) : (
                    <span aria-hidden className="text-sm">🔒</span>
                  )}
                </div>
                <span className={`mt-1 text-center text-[9px] font-bold leading-none ${reached ? "text-white" : "text-white/45"}`}>
                  {rewardBadge(m, lang)}
                </span>
              </div>
              {i < PET_MILESTONES.length - 1 && (
                <div className={`mt-[18px] h-[3px] flex-1 rounded-full ${i < currentIdx ? ARCADE_HERO_GRADIENT : "bg-white/15"}`} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
