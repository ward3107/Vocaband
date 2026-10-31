import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "../hooks/useLanguage";
import type { ComponentProps } from "react";
import type { AssignmentData, ProgressData } from "../core/supabase";
import { PET_MILESTONES } from "../constants/game";

vi.mock("../components/arcade/EvolutionRing", () => ({
  default: () => <div data-testid="pet" />,
}));
vi.mock("../components/dashboard/PetCompanion", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => open
    ? <div role="dialog" aria-label="Companion"><button onClick={onClose}>Close companion</button></div>
    : null,
}));

vi.mock("../components/arcade/IslandDetailSheet", () => ({
  default: ({ open, mode, onPlay }: { open: boolean; mode: { name: string } | null; onPlay: () => void }) => open && mode
    ? <div role="dialog" aria-label={mode.name}><button onClick={onPlay}>Play</button></div>
    : null,
}));

import GameModeSelectionView from "../views/GameModeSelectionView";

afterEach(cleanup);

const assignment = { id: "asg1", title: "Unit 3", allowedModes: ["flashcards", "classic", "fill-blank"] } as unknown as AssignmentData;

function renderView(progress: ProgressData[] = [], overrides: Partial<ComponentProps<typeof GameModeSelectionView>> = {}) {
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
        {...overrides}
      />
    </LanguageProvider>,
  );
}

describe("GameModeSelectionView activity cards", () => {
  it("opens the chosen game details and preserves the game launch callbacks", () => {
    const setGameMode = vi.fn();
    const setShowModeSelection = vi.fn();
    const setShowModeIntro = vi.fn();
    renderView([], { setGameMode, setShowModeSelection, setShowModeIntro });
    fireEvent.click(screen.getByRole("button", { name: /Classic Mode — to play/ }));
    expect(screen.getByRole("dialog", { name: "Classic Mode" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(setGameMode).toHaveBeenCalledWith("classic");
    expect(setShowModeSelection).toHaveBeenCalledWith(false);
    expect(setShowModeIntro).toHaveBeenCalledWith(true);
  });

  it("explains session-completed games, counts their progress and prevents relaunch", () => {
    const setGameMode = vi.fn();
    renderView([], { isQuickPlayGuest: true, quickPlayCompletedModes: new Set(["flashcards", "classic"]), setGameMode });
    const card = screen.getByRole("button", { name: /Classic Mode — locked/ });
    expect((card as HTMLButtonElement).disabled).toBe(true);
    expect(card.textContent).toContain("Played this session");
    expect(card.textContent).toContain("Choose another game");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    fireEvent.click(card);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(setGameMode).not.toHaveBeenCalled();
  });

  it("keeps companion progress reachable from the compact header", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: /My companion & progress/ }));
    expect(screen.getByRole("dialog", { name: "Companion" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close companion" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("switches the redesigned game view to Hebrew and back", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "עברית" }));
    expect(screen.getByRole("progressbar", { name: "משחקי תרגול שהושלמו" })).toBeTruthy();
    expect(document.documentElement.dir).toBe("rtl");
    fireEvent.click(screen.getByRole("button", { name: "החלף שפה" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));
    expect(document.documentElement.dir).toBe("ltr");
  });
  it("renders one activity button per allowed mode plus the pet", () => {
    renderView();
    expect(screen.getByRole("button", { name: /Flashcards/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Classic/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fill/ })).toBeTruthy();
    expect(screen.getByTestId("pet")).toBeTruthy();
  });

  it("marks a completed mode's card as completed", () => {
    const progress = [{ assignmentId: "asg1", mode: "classic", score: 95 }] as unknown as ProgressData[];
    renderView(progress);
    // Locale name is "Classic Mode" (not bare "Classic"), so the completed
    // island's aria-label reads "Classic Mode — completed, …".
    expect(screen.getByRole("button", { name: /Classic Mode — completed/ })).toBeTruthy();
  });
});
