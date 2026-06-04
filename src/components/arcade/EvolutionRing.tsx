/**
 * EvolutionRing — wraps the orbital hub's centre pet in a circular XP
 * progress ring (fills toward the next evolution) plus a small dashed,
 * locked "next evolution" preview medallion and a % pill. The pet itself
 * is still CharacterStage, so its appearance / scaling / evolution burst
 * are untouched — this only adds the ring + preview around it.
 *
 * Sizing is deliberately COMPACT (≈132px): it sits in the orbital hub's
 * centre, which the orbiting medallions clear only by a small margin on a
 * narrow phone. Keeping the footprint within the pet's own size envelope
 * (CharacterStage scales up to ~+40% near a tier) means the ring never
 * collides with the orbit. No usePetEvolution here — the mood lives on the
 * EvolutionCore status card, so the ring stays a pure XP-progress visual.
 */
import { motion } from "motion/react";
import type { PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import CharacterStage from "./CharacterStage";

const SIZE = 132;
const R = 60;
const STROKE = 6;
const C = 2 * Math.PI * R;

interface EvolutionRingProps {
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  xp: number;
  evolutionPending: boolean;
  hasClaimable?: boolean;
}

export default function EvolutionRing({
  currentStage,
  nextStage,
  xp,
  evolutionPending,
  hasClaimable,
}: EvolutionRingProps) {
  const reduced = useReducedMotion();
  const { isRTL } = useLanguage();

  const floor = currentStage.xpRequired;
  const ceil = nextStage ? nextStage.xpRequired : floor + 1;
  const pct = Math.min(100, Math.max(0, ((xp - floor) / (ceil - floor)) * 100));
  const dash = (pct / 100) * C;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg aria-hidden className="absolute inset-0" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id="evo-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.55" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#f0abfc" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={STROKE} />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="url(#evo-ring)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          initial={reduced ? false : { strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${dash} ${C - dash}` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          strokeDasharray={`${dash} ${C - dash}`}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <CharacterStage
          currentStage={currentStage}
          nextStage={nextStage}
          xp={xp}
          evolutionPending={evolutionPending}
          hasClaimable={hasClaimable}
        />
      </div>

      {/* Next-evolution preview — dashed + locked, kept inside the footprint. */}
      {nextStage && (
        <div className={`absolute top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-white/45 bg-violet-950/70 text-sm ${isRTL ? "left-2" : "right-2"}`}>
          <span aria-hidden className="opacity-85">{nextStage.emoji}</span>
          <span aria-hidden className="absolute -bottom-1 -end-1 text-[9px]">🔒</span>
        </div>
      )}

      {nextStage && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-extrabold text-white">
          {Math.round(pct)}%
        </div>
      )}
    </div>
  );
}
