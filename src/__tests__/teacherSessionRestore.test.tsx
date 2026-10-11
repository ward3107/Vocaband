import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { View } from '../core/views';
import { shouldPreserveView } from '../utils/authViews';
import { useAuthRestore, type UseAuthRestoreDeps } from '../hooks/useAuthRestore';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  fetchUserProfile: vi.fn(),
}));

vi.mock('../core/supabase', async (importOriginal) => ({
  ...await importOriginal<typeof import('../core/supabase')>(),
  isSupabaseConfigured: true,
  supabase: { from: mocks.from, auth: mocks },
  fetchUserProfile: mocks.fetchUserProfile,
}));
vi.mock('../hooks/useQuickPlaySocket', () => ({ disconnectQuickPlaySocket: vi.fn() }));
vi.mock('../hooks/useVocabularyLazy', () => ({
  getCachedVocabulary: () => ({ ALL_WORDS: [{ id: 1, english: 'apple' }] }),
}));

const savedSession = { id: 'old-live-session', sessionCode: 'ABC123', words: [] };
const liveSession = {
  id: savedSession.id, session_code: 'ABC123', word_ids: [1],
  allowed_modes: ['classic'], is_active: true,
};

// The hook's unrelated game setters are spies; the real view-preservation
// rules and asynchronous session-restore effect are exercised together.
function restoreDeps(view: View): UseAuthRestoreDeps {
  const values: Record<string, unknown> = {
    restoreInProgress: { current: false }, restoreRetried: { current: false },
    manualLoginInProgress: { current: false }, fromShareLinkRef: { current: false },
    currentViewRef: { current: view }, lastUserRoleRef: { current: 'teacher' },
    qpCumulativeScoreRef: { current: 0 }, quickPlaySessionParam: null,
    shouldPreserveView, appToasts: {},
    fetchTeacherData: vi.fn().mockResolvedValue([]),
  };
  return new Proxy(values, {
    get(target, key: string) {
      if (!(key in target)) target[key] = vi.fn();
      return target[key];
    },
  }) as unknown as UseAuthRestoreDeps;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('vocaband_quick_play_session', JSON.stringify(savedSession));
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'teacher-1' } } } });
  mocks.fetchUserProfile.mockResolvedValue({ uid: 'teacher-1', role: 'teacher', displayName: 'Teacher' });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.from.mockImplementation((table: string) => {
    const result = { data: table === 'quick_play_sessions' ? liveSession : [] };
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
  });
});

afterEach(cleanup);

describe('teacher entry with a saved Live session', () => {
  it.each<View>(['public-landing', 'teacher-login', 'teacher-dashboard'])(
    'opens the dashboard from %s without reopening the saved game', async (view) => {
      const deps = restoreDeps(view);
      renderHook(() => useAuthRestore(deps));
      await waitFor(() => expect(deps.setLoading).toHaveBeenCalledWith(false));
      expect(deps.setView).toHaveBeenCalledWith('teacher-dashboard');
      expect(deps.setView).not.toHaveBeenCalledWith('quick-play-teacher-monitor');
      expect(deps.setQuickPlayActiveSession).toHaveBeenCalledWith(expect.objectContaining({ id: savedSession.id }));
      expect(localStorage.getItem('vocaband_quick_play_session')).not.toBeNull();
    },
  );

  it.each<View>(['vocabulary-library', 'create-assignment', 'quick-play-teacher-monitor'])(
    'keeps deliberate navigation to %s while restoring the saved game data', async (view) => {
      const deps = restoreDeps(view);
      renderHook(() => useAuthRestore(deps));
      await waitFor(() => expect(deps.setLoading).toHaveBeenCalledWith(false));
      expect(deps.setQuickPlayActiveSession).toHaveBeenCalled();
      expect(deps.setView).not.toHaveBeenCalled();
    },
  );

  it('still opens the dashboard when no Live session was saved', async () => {
    localStorage.removeItem('vocaband_quick_play_session');
    const deps = restoreDeps('teacher-login');
    renderHook(() => useAuthRestore(deps));
    await waitFor(() => expect(deps.setLoading).toHaveBeenCalledWith(false));
    expect(deps.setView).toHaveBeenCalledWith('teacher-dashboard');
    expect(deps.setQuickPlayActiveSession).not.toHaveBeenCalled();
  });

  it('does not move a running monitor when the same user refreshes their token', async () => {
    const deps = restoreDeps('teacher-login');
    renderHook(() => useAuthRestore(deps));
    await waitFor(() => expect(deps.setLoading).toHaveBeenCalledWith(false));
    vi.mocked(deps.setView).mockClear();
    deps.currentViewRef.current = 'quick-play-teacher-monitor';
    await act(async () => {
      mocks.onAuthStateChange.mock.calls[0][0]('TOKEN_REFRESHED', { user: { id: 'teacher-1' } });
    });
    expect(deps.setView).not.toHaveBeenCalled();
    expect(mocks.fetchUserProfile).toHaveBeenCalledTimes(1);
  });
});
