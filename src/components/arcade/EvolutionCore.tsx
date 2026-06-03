/**
 * EvolutionCore — the arcade hub's hero. Makes pet EVOLUTION the focal
 * point by combining the app's two pet systems:
 *
 *   - Appearance + rewards = the XP ladder (PET_MILESTONES via
 *     useRetention), passed in as currentStage / nextStage / xp /
 *     claimableMilestone. This is the ONLY source of how the pet looks.
 *   - Mood = daily activity (usePetEvolution → petMoodFor), used ONLY
 *     for the little mood face — never for appearance.
 *
 * The pet itself is rendered by CharacterStage (size-scale, aura halo,
 * idle motion, evolution burst, Lottie/emoji). EvolutionCore frames it
 * with tier progress, the mood face, the claimable reward, and an
 * 8-stage ladder. Arcade-only: it mounts solely inside the flagged hub,
 * so usePetEvolution runs there and nowhere else.
 */
import { motion } from "motion/react";
import CharacterStage from "./CharacterStage";
import { usePetEvolution, petMoodFor, type PetMood } from "../../hooks/usePetEvolution";
import { PET_MILESTONES, type PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  ARCADE_CARD,
  ARCADE_HERO_GRADIENT,
  ARCADE_REWARD_GRADIENT,
  ARCADE_PLAY_RING,
  ARCADE_BUTTON_TOUCH,
} from "./theme";

const MOOD_FACE: Record<PetMood, string> = {
  happy: "😊",
  neutral: "😐",
  sad: "😟",
  "very-sad": "😢",
};

const STRINGS: Record<Language, {
  eyebrow: string;
  toNext: (n: number, stage: string) => string;
  maxStage: string;
  claim: string;
  mood: Record<PetMood, string>;
}> = {
  en: {
    eyebrow: "Evolution Core",
    toNext: (n, s) => `${n} XP → ${s}`,
    maxStage: "Top form! ✨",
    claim: "Claim",
    mood: { happy: "Thriving", neutral: "Doing OK", sad: "Missing you", "very-sad": "Lonely" },
  },
  he: {
    eyebrow: "ליבת האבולוציה",
    toNext: (n, s) => `${n} XP ← ${s}`,
    maxStage: "בשיא! ✨",
    claim: "אסוף",
    mood: { happy: "פורח", neutral: "בסדר", sad: "מתגעגע", "very-sad": "בודד" },
  },
  ar: {
    eyebrow: "نواة التطور",
    toNext: (n, s) => `${n} XP ← ${s}`,
    maxStage: "في القمة! ✨",
    claim: "استلم",
    mood: { happy: "مزدهر", neutral: "بخير", sad: "يشتاق إليك", "very-sad": "وحيد" },
  },
  ru: {
    eyebrow: "Ядро эволюции",
    toNext: (n, s) => `${n} XP → ${s}`,
    maxStage: "На пике! ✨",
    claim: "Забрать",
    mood: { happy: "Процветает", neutral: "Нормально", sad: "Скучает", "very-sad": "Одинок" },
  },
};

interface EvolutionCoreProps {
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  xp: number;
  evolutionPending: boolean;
  claimableMilestone: PetMilestone | null;
  onClaim: (milestone: PetMilestone) => void;
  displayName?: string;
}

export default function EvolutionCore({
  currentStage,
  nextStage,
  xp,
  evolutionPending,
  claimableMilestone,
  onClaim,
  displayName,
}: EvolutionCoreProps) {
  const { language, dir } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language] || STRINGS.en;

  // Mood is daily-activity ONLY (drives just the face). The hook lives
  // here because EvolutionCore mounts solely inside the arcade hub.
  const { state } = usePetEvolution({ enabled: true });
  const mood = petMoodFor(state?.daysSinceLastActive ?? 0);

  // Progress within the current XP tier (this stage's floor → next
  // stage's floor). Mirrors CharacterStage's size math.
  const floor = currentStage.xpRequired;
  const ceil = nextStage ? nextStage.xpRequired : floor + 1;
  const pct = Math.min(100, Math.max(0, ((xp - floor) / (ceil - floor)) * 100));
  const remaining = nextStage ? Math.max(0, nextStage.xpRequired - xp) : 0;

  return (
    <section dir={dir} className="flex w-full flex-col items-center gap-3">
      {/* The pet — appearance + all animations come from the XP ladder. */}
      <CharacterStage
        currentStage={currentStage}
        nextStage={nextStage}
        xp={xp}
        evolutionPending={evolutionPending}
        hasClaimable={!!claimableMilestone}
        displayName={displayName}
      />

      <div className={`${ARCADE_CARD} w-full max-w-sm p-4`}>
        {/* Eyebrow + mood face (the only activity-driven element). */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">
            {t.eyebrow}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold text-cyan-100">
            <span aria-hidden className="text-sm leading-none">{MOOD_FACE[mood]}</span>
            {t.mood[mood]}
          </span>
        </div>

        {/* Current stage name (from the XP ladder). */}
        <div className="mt-1 flex items-center gap-2 text-lg font-extrabold text-white">
          <span aria-hidden>{currentStage.emoji}</span>
          {currentStage.stage}
        </div>

        {/* Progress to the next stage, or a max-stage flourish. */}
        {nextStage ? (
          <>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <motion.div
                className={`h-full rounded-full ${ARCADE_HERO_GRADIENT}`}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1 text-xs font-bold tabular-nums text-cyan-100">
              {t.toNext(remaining, nextStage.stage)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs font-bold text-cyan-100">{t.maxStage}</p>
        )}

        {/* Claimable evolution reward — the hero's call to action. */}
        {claimableMilestone && (
          <button
            type="button"
            onClick={() => onClaim(claimableMilestone)}
            className={`${ARCADE_REWARD_GRADIENT} ${ARCADE_PLAY_RING} ${ARCADE_BUTTON_TOUCH} mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-extrabold text-amber-950`}
          >
            🎁 {t.claim}: {claimableMilestone.reward.label}
          </button>
        )}

        {/* 8-stage ladder — reached stages lit, current one emphasised. */}
        <div className="mt-3 flex items-center justify-between">
          {PET_MILESTONES.map((m) => {
            const reached = xp >= m.xpRequired;
            const current = m.stage === currentStage.stage;
            return (
              <span
                key={m.stage}
                title={m.stage}
                aria-hidden
                className={`text-base transition-transform ${current ? "scale-125" : ""} ${
                  reached ? "opacity-100" : "opacity-30 grayscale"
                }`}
              >
                {m.emoji}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
