import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLiveChallengeSocket } from '../hooks/useLiveChallengeSocket';

const mocks = vi.hoisted(() => ({ session: vi.fn(), auth: vi.fn(), load: vi.fn() }));
vi.mock('../core/supabase', () => ({ supabase: { auth: {
  getSession: mocks.session, onAuthStateChange: mocks.auth,
} } }));
vi.mock('../utils/lazyLoad', () => ({ loadSocketIO: mocks.load }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('live socket interrupted startup', () => {
  it('releases the auth listener when leaving before sign-in', async () => {
    const unsubscribe = vi.fn();
    mocks.session.mockResolvedValue({ data: { session: null } });
    mocks.auth.mockReturnValue({ data: { subscription: { unsubscribe } } });
    const { unmount } = renderHook(() => useLiveChallengeSocket({ user: null, isLiveChallenge: false }));
    await act(async () => {});
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not open an orphan socket when its download finishes after leaving', async () => {
    let finish!: (module: unknown) => void;
    mocks.session.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    mocks.load.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const socket = { on: vi.fn(), disconnect: vi.fn() };
    const io = vi.fn(() => socket);
    const { unmount } = renderHook(() => useLiveChallengeSocket({ user: null, isLiveChallenge: false }));
    await act(async () => {});
    unmount();
    await act(async () => { finish({ default: io }); });
    expect(io).not.toHaveBeenCalled();
  });
});
