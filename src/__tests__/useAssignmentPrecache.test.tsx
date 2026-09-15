import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Word } from '../data/vocabulary';
import { useAssignmentPrecache } from '../hooks/useAssignmentPrecache';

vi.mock('../utils/audioUrl', () => ({ getWordAudioUrl: (id: number) => `/sound/${id}.mp3` }));
const network = vi.hoisted(() => ({ slow: false }));
vi.mock('../hooks/useEffectiveConnection', () => ({ isSlowConnection: () => network.slow }));
const words = (...ids: number[]) => ids.map(id => ({ id }) as Word);
const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  network.slow = false;
  fetchMock.mockReset().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('requestIdleCallback', undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('assignment audio precache', () => {
  it('cancels deferred downloads on unmount', async () => {
    const { unmount } = renderHook(() => useAssignmentPrecache(words(1)));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('survives StrictMode and deduplicates reordered assignment arrays', async () => {
    const { rerender } = renderHook(({ list }) => useAssignmentPrecache(list), {
      initialProps: { list: words(2, 1, 1, NaN, Infinity) }, wrapper: StrictMode,
    });
    rerender({ list: words(1, 2) });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/sound/1.mp3', '/sound/2.mp3']);
    rerender({ list: words(2, 1) });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits for bodies and aborts active downloads when disabled', async () => {
    let finish!: () => void;
    const body = new Promise<void>(resolve => { finish = resolve; });
    fetchMock.mockResolvedValue({ arrayBuffer: () => body });
    const { rerender } = renderHook(({ enabled }) => useAssignmentPrecache(
      words(1, 2, 3, 4, 5, 6, 7, 8, 9), { enabled },
    ), { initialProps: { enabled: true } });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetchMock).toHaveBeenCalledTimes(8);
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    rerender({ enabled: false });
    expect(signal.aborted).toBe(true);
    await act(async () => { finish(); await body; });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('rechecks data-saver when idle work starts', async () => {
    renderHook(() => useAssignmentPrecache(words(1)));
    network.slow = true;
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels an idle callback and ignores it even if the browser dispatches it late', () => {
    let callback!: () => void;
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', vi.fn((cb: () => void) => { callback = cb; return 7; }));
    vi.stubGlobal('cancelIdleCallback', cancel);
    const { unmount } = renderHook(() => useAssignmentPrecache(words(1)));
    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
    callback();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
