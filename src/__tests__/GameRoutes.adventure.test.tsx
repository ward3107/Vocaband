import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GameRoutesDeps } from '../views/GameRouteContext';
import { GameRouteProvider } from '../views/GameRouteContext';
import { GameRoute } from '../views/GameRoutes';
import { LanguageProvider } from '../hooks/useLanguage';
import { PET_MILESTONES } from '../constants/game';

vi.mock('../utils/primeAudio', () => ({ primeAudio: vi.fn() }));
vi.mock('../components/dashboard/PetCompanion', () => ({ default: () => null }));

afterEach(cleanup);

describe('GameRoute adventure launch', () => {
  it('starts a selected English game directly and preserves audio/language setup', async () => {
    const setGameMode = vi.fn();
    const setShowModeSelection = vi.fn();
    const setShowModeIntro = vi.fn();
    const setTargetLanguage = vi.fn();
    const setHasChosenLanguage = vi.fn();
    const deps = {
      view: 'game', user: { role: 'student' }, language: 'he',
      showModeSelection: true, setShowModeSelection,
      activeAssignment: { id: 'asg', title: 'Animals', subject: 'english', allowedModes: ['classic'] },
      studentProgress: [], setGameMode, setShowModeIntro,
      handleExitGame: vi.fn(), quickPlayCompletedModes: new Set(),
      hasChosenLanguage: false, setHasChosenLanguage, setTargetLanguage,
      isFinished: false, showModeIntro: false, quickPlayActiveSession: null,
      petDisplayName: 'Nova', petXp: 0, petCurrentStage: PET_MILESTONES[0],
      petNextStage: PET_MILESTONES[1], petClaimableMilestone: null, onClaimPetMilestone: vi.fn(),
    } as unknown as GameRoutesDeps;

    render(<LanguageProvider><GameRouteProvider value={deps}><GameRoute /></GameRouteProvider></LanguageProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Classic Mode - recommended next/ }));
    const { primeAudio } = await import('../utils/primeAudio');
    expect(primeAudio).toHaveBeenCalled();
    expect(setTargetLanguage).toHaveBeenCalledWith('hebrew');
    expect(setHasChosenLanguage).toHaveBeenCalledWith(true);
    expect(setGameMode).toHaveBeenCalledWith('classic');
    expect(setShowModeSelection).toHaveBeenCalledWith(false);
    expect(setShowModeIntro).toHaveBeenCalledWith(false);
  });
});
