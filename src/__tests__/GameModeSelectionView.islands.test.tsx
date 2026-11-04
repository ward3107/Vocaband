import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { LanguageProvider } from '../hooks/useLanguage';
import type { ComponentProps } from 'react';
import type { AssignmentData, ProgressData } from '../core/supabase';
import { PET_MILESTONES } from '../constants/game';

vi.mock('../components/dashboard/PetCompanion', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => open
    ? <div role="dialog" aria-label="Companion"><button onClick={onClose}>Close companion</button></div>
    : null,
}));

import GameModeSelectionView from '../views/GameModeSelectionView';

afterEach(cleanup);

const assignment = { id: 'asg1', title: 'Unit 3', allowedModes: ['flashcards', 'classic', 'fill-blank'] } as unknown as AssignmentData;

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

describe('student adventure', () => {
  it('launches any teacher-approved stop in one tap without the old intro screen', () => {
    const setGameMode = vi.fn();
    const setShowModeSelection = vi.fn();
    const setShowModeIntro = vi.fn();
    renderView([], { setGameMode, setShowModeSelection, setShowModeIntro });
    fireEvent.click(screen.getByRole('button', { name: /Classic Mode - ready to play/ }));
    expect(setGameMode).toHaveBeenCalledWith('classic');
    expect(setShowModeSelection).toHaveBeenCalledWith(false);
    expect(setShowModeIntro).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog', { name: 'Classic Mode' })).toBeNull();
  });

  it('uses the route launch handler when wired to GameRoutes', () => {
    const onLaunchMode = vi.fn();
    renderView([], { onLaunchMode });
    fireEvent.click(screen.getByRole('button', { name: /Play next: Flashcards/ }));
    expect(onLaunchMode).toHaveBeenCalledWith('flashcards');
  });

  it('shows only approved games and their world', () => {
    renderView();
    expect(screen.getByRole('region', { name: 'Jungle Trail' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Ocean Depths' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Star Voyage' })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Jungle Trail' })).getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Spelling -/ })).toBeNull();
  });

  it('locks games already played in a Quick Play session and recommends another', () => {
    const onLaunchMode = vi.fn();
    renderView([], { isQuickPlayGuest: true, quickPlayCompletedModes: new Set(['flashcards', 'classic']), onLaunchMode });
    const locked = screen.getByRole('button', { name: /Classic Mode - locked/ });
    expect((locked as HTMLButtonElement).disabled).toBe(true);
    expect(locked.textContent).toContain('Played this session');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: /Play next: Fill in the Blank/ }));
    expect(onLaunchMode).toHaveBeenCalledWith('fill-blank');
  });

  it('keeps the companion reachable from the header', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /My companion & progress: Sam/ }));
    expect(screen.getByRole('dialog', { name: 'Companion' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close companion' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches to Hebrew RTL and back', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'עברית' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('heading', { name: 'שביל הג׳ונגל' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'החלף שפה' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('marks completed stops and shows mastery without locking assignment replay', () => {
    const progress = [{ assignmentId: 'asg1', mode: 'classic', score: 95 }] as unknown as ProgressData[];
    renderView(progress);
    const stop = screen.getByRole('button', { name: /Classic Mode - completed/ });
    expect((stop as HTMLButtonElement).disabled).toBe(false);
    expect(within(stop).getByLabelText('3 / 3')).toBeTruthy();
  });
});
