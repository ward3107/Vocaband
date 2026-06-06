import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../hooks/useLanguage";
import type { AssignmentData, ProgressData } from "../core/supabase";
import { PET_MILESTONES } from "../constants/game";

vi.mock("../components/arcade/TravelingPet", () => ({
  default: () => <div data-testid="pet" />,
}));
vi.mock("../components/dashboard/PetCompanion", () => ({
  default: () => null,
}));

import GameModeSelectionView from "../views/GameModeSelectionView";

afterEach(cleanup);

const assignment = { id: "asg1", title: "Unit 3", allowedModes: ["flashcards", "classic", "fill-blank"] } as unknown as AssignmentData;

function renderView(progress: ProgressData[] = []) {
  return render(
    <LanguageProvider>
      <GameModeSelectionView
        activeAssignment={assignment}
        studentProgress={progress}
        isQuickPlayGuest={false}
        quickPlayCompletedModes={new Set()}
        setGameMode={vi.fn()}
        setShowModeSelection={vi.fn()}
        setShowModeIntro={vi.fn()}
        handleExitGame={vi.fn()}
        petDisplayName="Sam"
        petXp={150}
        petCurrentStage={PET_MILESTONES[0]}
        petNextStage={PET_MILESTONES[1]}
        petClaimableMilestone={null}
        onClaimPetMilestone={vi.fn()}
      />
    </LanguageProvider>,
  );
}

describe("GameModeSelectionView island world", () => {
  it("renders one island button per allowed mode plus the pet", () => {
    renderView();
    expect(screen.getByRole("button", { name: /Flashcards/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Classic/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fill/ })).toBeTruthy();
    expect(screen.getByTestId("pet")).toBeTruthy();
  });

  it("marks a completed mode's island as completed", () => {
    const progress = [{ assignmentId: "asg1", mode: "classic", score: 95 }] as unknown as ProgressData[];
    renderView(progress);
    // Locale name is "Classic Mode" (not bare "Classic"), so the completed
    // island's aria-label reads "Classic Mode — completed, …".
    expect(screen.getByRole("button", { name: /Classic Mode — completed/ })).toBeTruthy();
  });
});
