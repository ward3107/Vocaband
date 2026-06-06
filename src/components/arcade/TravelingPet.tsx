/**
 * The explorer pet on the mode-island map. Renders the shared
 * CharacterStage (so it looks exactly like the home pet at its current
 * evolution stage) inside a wrapper that sits on — and animates between —
 * island coordinates. `evolutionPending` is forced off here so the
 * evolution confetti only ever fires once, on the home screen.
 */
import { motion } from "motion/react";
import type { PetMilestone } from "../../constants/game";
import type { IslandPos } from "./islandLayout";
import CharacterStage from "./CharacterStage";

interface TravelingPetProps {
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  xp: number;
  hasClaimable: boolean;
  displayName: string;
  /** Where the pet is walking to (the recommended island). */
  to: IslandPos;
  /** Where it walked from, or null on first visit (place, don't walk). */
  from: IslandPos | null;
  onTap: () => void;
  reduced: boolean;
}

export default function TravelingPet({
  currentStage, nextStage, xp, hasClaimable, displayName, to, from, onTap, reduced,
}: TravelingPetProps) {
  // Pet sits just above its island; scaled down so CharacterStage's large
  // hub footprint fits the map without colliding with neighbours.
  const target = { left: `${to.xPct}%`, top: `${to.y - 30}px` };
  const start = from ? { left: `${from.xPct}%`, top: `${from.y - 30}px` } : target;

  return (
    <motion.div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      initial={reduced ? target : start}
      animate={target}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 16 }}
      style={{ left: target.left, top: target.top }}
    >
      <div className="pointer-events-auto origin-center scale-[0.55]">
        <CharacterStage
          currentStage={currentStage}
          nextStage={nextStage}
          xp={xp}
          evolutionPending={false}
          hasClaimable={hasClaimable}
          onTap={onTap}
          displayName={displayName}
        />
      </div>
    </motion.div>
  );
}
