import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, AssignmentData } from '../core/supabase';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn() }));
vi.mock('../core/supabase', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.session } }, hasTeacherAccess: () => false }));
import { useGameFinish, type UseGameFinishParams } from '../hooks/useGameFinish';
import { persistHebrewScore } from '../handlers/hebrewScore';
const user = { uid: 'registered-student', role: 'student', displayName: 'Dana', classCode: 'CLASSAAA' } as AppUser;
const assignment = { id: 'quickplay-lesson', wordIds: [1] } as AssignmentData;
beforeEach(() => { vi.clearAllMocks(); });
describe('registered live-game scoring', () => {
  it('sends English live-game results to the live podium without writing a synthetic assignment to the gradebook', async () => {
    const emit = vi.fn();
    const p = {
      user, score: 20, gameMode: 'classic', gameWords: [{ id: 1 }], mistakes: [],
      activeAssignment: assignment, quickPlayActiveSession: { id: 'lesson', sessionCode: 'ABCD23' },
      setIsSaving: vi.fn(), setSaveError: vi.fn(), setQuickPlayCompletedModes: vi.fn(),
      quickPlaySocketUpdateScore: emit,
    } as unknown as UseGameFinishParams;
    await useGameFinish(p).saveScore();
    expect(emit).toHaveBeenCalledWith(20, { perfectRound: true, roundProgress: { done: 1, total: 1 } });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(p.setIsSaving).toHaveBeenLastCalledWith(false);
  });
  it('keeps Hebrew live-game results on the same podium without making an invalid progress write', async () => {
    const emit = vi.fn(); const cumulative = { current: 30 };
    await persistHebrewScore('niqqud', 8, 10, { user, activeAssignment: assignment,
      quickPlayActiveSession: { id: 'lesson' }, qpCumulativeScoreRef: cumulative, quickPlaySocketUpdateScore: emit });
    expect(emit).toHaveBeenCalledWith(38);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
