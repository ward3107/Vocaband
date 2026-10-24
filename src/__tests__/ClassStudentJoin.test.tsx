import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { AppUser } from '../core/supabase';
const mocks = vi.hoisted(() => ({ socket: {
  status: 'connected', joinedSessionCode: null as string | null, lastError: null as null | { code: string; message: string },
  joinAsStudent: vi.fn(), getScoreBaseline: vi.fn(() => 40),
  onKicked: vi.fn(() => vi.fn()), onSessionEnded: vi.fn(() => vi.fn()),
} }));
vi.mock('../hooks/useQuickPlaySocket', () => ({ useQuickPlaySocket: () => mocks.socket }));
vi.mock('../components/QPAvatarPicker', () => ({ default: () => null }));
vi.mock('../utils/primeAudio', () => ({ primeAudio: vi.fn() }));
import QuickPlayStudentView from '../views/QuickPlayStudentView';
const student = { uid: 'student-a', role: 'student', displayName: 'Dana', avatar: '🐨', classCode: 'CLASSAAA' } as AppUser;
function props(): ComponentProps<typeof QuickPlayStudentView> {
  return {
    classStudent: student, qpCumulativeScoreRef: { current: 0 },
    quickPlayActiveSession: { id: 'lesson', sessionCode: 'ABCD23', wordIds: [-1], words: [{ id: -1, english: 'book', hebrew: 'ספר', arabic: 'كتاب', level: 'Custom' }], allowedModes: ['classic'] },
    quickPlayStudentName: '', quickPlayAvatar: student.avatar!,
    setQuickPlayActiveSession: vi.fn(), setQuickPlayStudentName: vi.fn(), setQuickPlayAvatar: vi.fn(),
    setView: vi.fn(), setUser: vi.fn(), setAssignmentWords: vi.fn(), setActiveAssignment: vi.fn(),
    setCurrentIndex: vi.fn(), setScore: vi.fn(), setFeedback: vi.fn(), setIsFinished: vi.fn(),
    setMistakes: vi.fn(), setShowModeSelection: vi.fn(), createGuestUser: vi.fn(), cleanupSessionData: vi.fn(), showToast: vi.fn(), setQuickPlayKicked: vi.fn(),
  };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear();
  mocks.socket.joinedSessionCode = null; mocks.socket.lastError = null;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('roster student game entry', () => {
  it('uses the existing class identity, waits for ACK and keeps the authenticated user', async () => {
    const p = props();
    const view = render(<QuickPlayStudentView {...p} />);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(mocks.socket.joinAsStudent).toHaveBeenCalledWith('Dana', '🐨');
    expect(p.setView).not.toHaveBeenCalled();
    expect(screen.getByText(/Joining as Dana/)).toBeTruthy();
    mocks.socket.joinedSessionCode = 'ABCD23';
    view.rerender(<QuickPlayStudentView {...p} />);
    expect(p.setView).toHaveBeenCalledWith('game');
    expect(p.setShowModeSelection).toHaveBeenCalledWith(true);
    expect(p.setUser).not.toHaveBeenCalled();
    expect(p.createGuestUser).not.toHaveBeenCalled();
    expect(p.qpCumulativeScoreRef.current).toBe(40);
    expect(localStorage.getItem('vocaband_qp_guest')).toBeNull();
  });
  it('keeps a rejected join on the entry screen without changing the student identity', async () => {
    const p = props();
    const view = render(<QuickPlayStudentView {...p} />);
    await act(async () => { vi.advanceTimersByTime(1); });
    mocks.socket.lastError = { code: 'nickname_taken', message: 'taken' };
    view.rerender(<QuickPlayStudentView {...p} />);
    expect(p.setView).not.toHaveBeenCalled();
    expect(p.showToast).toHaveBeenCalled();
    expect(p.setUser).not.toHaveBeenCalled();
  });
});
