import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), channel: vi.fn(), remove: vi.fn() }));
vi.mock('../utils/classLiveSession', () => ({ getMyLiveClassEntry: mocks.get }));
vi.mock('../core/supabase', () => ({ supabase: { channel: mocks.channel, removeChannel: mocks.remove } }));
import { useClassLiveSession } from '../hooks/useClassLiveSession';
const live = { class_id: 'a', class_name: 'Year 7', session_id: 's1', session_code: 'ABCD23', expires_at: new Date(Date.now() + 3600000).toISOString() };
const entry = (game: typeof live | null, classId = 'a') => ({ classId, className: 'Year 7', live: game });
let changed: () => void;
let subscription: (state: string) => void;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(entry(null));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  mocks.channel.mockImplementation(() => {
    const channel = { on: vi.fn((_event, _filter, callback) => { changed = callback; return channel; }), subscribe: vi.fn(callback => { subscription = callback; return channel; }) };
    return channel;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('class live discovery', () => {
  it('reacts to a class publication without polling and expires old invitations', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useClassLiveSession('student'));
    await act(async () => {});
    expect(hook.result.current.live).toBeNull();
    expect(hook.result.current.className).toBe('Year 7');
    expect(mocks.channel).toHaveBeenCalledWith('class-live:student:a');
    const calls = mocks.get.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(mocks.get).toHaveBeenCalledTimes(calls);
    mocks.get.mockResolvedValue(entry(live));
    await act(async () => changed());
    expect(hook.result.current.live).toEqual(live);
    mocks.get.mockResolvedValue(entry(null));
    await act(async () => { vi.advanceTimersByTime(3600000); });
    expect(hook.result.current.live).toBeNull();
  });
  it('closes its subscription while hidden and rechecks after returning or reconnecting', async () => {
    const hook = renderHook(() => useClassLiveSession('student'));
    await act(async () => {});
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    const before = mocks.get.mock.calls.length;
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(mocks.get).toHaveBeenCalledTimes(before);
    mocks.get.mockResolvedValue(entry(live));
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hook.result.current.live).toEqual(live);
    mocks.get.mockRejectedValue(new Error('offline'));
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(hook.result.current.status).toBe('error');
    mocks.get.mockResolvedValue(entry(live));
    await act(async () => hook.result.current.refresh());
    expect(hook.result.current.status).toBe('ready');
  });
  it('discards delayed responses from the previous account or class', async () => {
    let resolve!: (value: ReturnType<typeof entry>) => void;
    mocks.get.mockReturnValueOnce(new Promise(r => { resolve = r; })).mockResolvedValue(entry(null, 'b'));
    const hook = renderHook(({ uid }) => useClassLiveSession(uid), { initialProps: { uid: 'old' } });
    hook.rerender({ uid: 'new' });
    await act(async () => resolve(entry(live)));
    expect(hook.result.current.live).toBeNull();
    expect(hook.result.current.status).toBe('ready');
  });
  it('surfaces a subscription failure and revalidates when subscribed again', async () => {
    mocks.get.mockResolvedValue(entry(live));
    const hook = renderHook(() => useClassLiveSession('student'));
    await act(async () => {});
    act(() => subscription('CHANNEL_ERROR'));
    expect(hook.result.current.status).toBe('error');
    expect(hook.result.current.live).toBeNull();
    await act(async () => subscription('SUBSCRIBED'));
    expect(hook.result.current.live).toEqual(live);
  });
});
