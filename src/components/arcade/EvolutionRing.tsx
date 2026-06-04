/**
 * EvolutionRing — the pet centerpiece wrapped in a circular XP-progress
 * ring. The ring fills toward the next evolution; the pet itself (with all
 * its appearance/animation logic) is still rendered by CharacterStage, so
 * the evolution burst + idle motion are untouched. Three decorations sit on
 * the ring, all non-interactive:
 *   - mood face (bottom): the ONLY daily-activity-driven element
 *   - next-evolution medallion (top): the locked stage the student is
 *     climbing toward — the "almost there" pull
 *   - percent pill (bottom): how far through the current tier they are
 */
import { motion } from "motion/react";
import type { PetMilestone } from "../../constants/game";
import type { PetMood } from "../../hooks/usePetEvolution";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import CharacterStage from "./CharacterStage";

const MOOD_FACE: Record<PetMood, string> = {
  happy: "😊",
  neutral: "😐",
  sad: "😟",
  "very-sad": "😢",
};

const SIZE = 232;
const R = 104;
const STROKE = 10;
const C = 2 * Math.PI * R;

interface EvolutionRingProps {
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  xp: number;
  evolutionPending: boolean;
  mood: PetMood;
  /** 0–100, progress through the current XP tier. */
  pct: number;
}

export default function EvolutionRing({
  currentStage,
  nextStage,
  xp,
  evolutionPending,
  mood,
  pct,
}: EvolutionRingProps) {
  const reduced = useReducedMotion();
  const { isRTL } = useLanguage();
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * C;

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
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={STROKE} />
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

      {/* Pet — no displayName, so its "Hi, name" line stays out of the ring;
          the stage name is rendered by EvolutionCore below. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <CharacterStage currentStage={currentStage} nextStage={nextStage} xp={xp} evolutionPending={evolutionPending} />
      </div>

      {/* Mood face (daily activity) */}
      <div className={`absolute bottom-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-lg ${isRTL ? "left-6" : "right-6"}`}>
        <span aria-hidden>{MOOD_FACE[mood]}</span>
      </div>

      {/* Next-evolution preview — dashed + locked */}
      {nextStage && (
        <div
          className={`absolute top-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/45 bg-white/10 text-2xl ${isRTL ? "left-2" : "right-2"}`}
        >
          <span aria-hidden className="opacity-80">{nextStage.emoji}</span>
          <span aria-hidden className="absolute -bottom-1 -end-1 text-xs">🔒</span>
        </div>
      )}

      {/* Percent through the current tier */}
      {nextStage && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-2.5 py-0.5 text-xs font-extrabold text-white">
          {Math.round(pct)}%
        </div>
      )}
    </div>
  );
}
