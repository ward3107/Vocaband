/**
 * The mode-picker map: a night-ocean canvas of mode-islands with the
 * explorer pet sitting on the recommended-next island. Vertically
 * scrollable so it scales from a few islands to all 13. Layout is
 * deterministic (islandLayout); the pet's from→to walk is read once on
 * mount from sessionStorage (petTravel).
 */
import { useState, type ReactNode } from "react";
import type { PetMilestone } from "../../constants/game";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { computeIslandPositions, mapHeight } from "./islandLayout";
import { advancePetTravel } from "./petTravel";
import ModeIsland, { type IslandState } from "./ModeIsland";
import TravelingPet from "./TravelingPet";

export interface MapIsland {
  id: string;
  name: string;
  emoji: ReactNode;
  gradient: string;
  state: IslandState;
  mastery: number;
}

interface IslandMapProps {
  assignmentId: string;
  islands: MapIsland[];
  /** Index (into `islands`) of the recommended-next island. */
  recommendedIndex: number;
  pet: {
    currentStage: PetMilestone;
    nextStage: PetMilestone | null;
    xp: number;
    hasClaimable: boolean;
    displayName: string;
  };
  onTapIsland: (index: number) => void;
  onTapPet: () => void;
}

export default function IslandMap({
  assignmentId, islands, recommendedIndex, pet, onTapIsland, onTapPet,
}: IslandMapProps) {
  const reduced = useReducedMotion();
  const positions = computeIslandPositions(islands.length);

  // Read the from→to walk ONCE on mount so re-renders don't re-trigger it.
  // useState with a lazy initialiser runs exactly once per mount, which is
  // exactly the contract advancePetTravel requires (it writes to sessionStorage).
  const [travel] = useState<{ from: number | null; to: number } | null>(() =>
    recommendedIndex >= 0 ? advancePetTravel(assignmentId, recommendedIndex) : null
  );

  return (
    <div className="relative w-full" style={{ height: mapHeight(islands.length) }}>
      {islands.map((isl, i) => (
        <ModeIsland
          key={isl.id}
          name={isl.name}
          emoji={isl.emoji}
          gradient={isl.gradient}
          state={isl.state}
          mastery={isl.mastery}
          pos={positions[i]}
          reduced={reduced}
          onTap={() => onTapIsland(i)}
        />
      ))}

      {travel && positions[travel.to] && (
        <TravelingPet
          currentStage={pet.currentStage}
          nextStage={pet.nextStage}
          xp={pet.xp}
          hasClaimable={pet.hasClaimable}
          displayName={pet.displayName}
          to={positions[travel.to]}
          from={travel.from != null ? positions[travel.from] ?? null : null}
          reduced={reduced}
          onTap={onTapPet}
        />
      )}
    </div>
  );
}
