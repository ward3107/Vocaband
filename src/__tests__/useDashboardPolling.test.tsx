import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardPolling, type UseDashboardPollingParams } from '../hooks/useDashboardPolling';

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), rpc: vi.fn(), channel: vi.fn(), remove: vi.fn() }));
vi.mock('../core/supabase', () => ({
  mapAssignment: (row: unknown) => row,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ limit: mocks.lookup }) }) }),
    rpc: mocks.rpc, channel: mocks.channel, removeChannel: mocks.remove,
  },
}));
vi.mock('../core/readCache', () => ({ cachedRead: async (_key: string, fetcher: () => Promise<unknown>) => fetcher() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function params(): UseDashboardPollingParams {
  return {
    user: { uid: 'student-a', role: 'student', classCode: 'CLASS1' } as UseDashboardPollingParams['user'],
    view: 'student-dashboard', classes: [], allScores: [], pendingStudentsCount: 0,
    setStudentAssignments: vi.fn(), loadPendingStudents: vi.fn(), fetchScores: vi.fn(),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue({ data: [{ id: 'class-id' }], error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.channel.mockImplementation(() => {
    const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
    return channel;
  });
});
afterEach(cleanup);

describe('student dashboard lifecycle', () => {
  it('shares the initial class lookup between loading and subscribing', async () => {
    const p = params();
    renderHook(() => useDashboardPolling(p));
    await act(async () => {});
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.channel).toHaveBeenCalledTimes(1);
  });

  it('recovers the assignment subscription after the initial class lookup fails', async () => {
    mocks.lookup
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValue({ data: [{ id: 'class-id' }], error: null });
    const p = params();
    renderHook(() => useDashboardPolling(p));
    await act(async () => {});
    expect(mocks.channel).not.toHaveBeenCalled();

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

    expect(mocks.lookup).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.channel).toHaveBeenCalledTimes(1);
  });

  it('does not create an orphan subscription after leaving during lookup', async () => {
    const lookup = deferred<{ data: { id: string }[]; error: null }>();
    mocks.lookup.mockReturnValue(lookup.promise);
    const p = params();
    const { unmount } = renderHook(() => useDashboardPolling(p));
    unmount();
    await act(async () => { lookup.resolve({ data: [{ id: 'old-class' }], error: null }); });
    expect(mocks.channel).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(p.setStudentAssignments).not.toHaveBeenCalled();
  });

  it('ignores an old response after the student leaves the dashboard', async () => {
    const rpc = deferred<{ data: { id: string }[]; error: null }>();
    mocks.rpc.mockReturnValue(rpc.promise);
    const p = params();
    const { unmount } = renderHook(() => useDashboardPolling(p));
    await act(async () => {});
    unmount();
    await act(async () => { rpc.resolve({ data: [{ id: 'old-assignment' }], error: null }); });
    expect(p.setStudentAssignments).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });

  it('refreshes on returning to the tab and leaves teacher/demo views alone', async () => {
    const p = params();
    const { rerender } = renderHook(({ view }) => useDashboardPolling({ ...p, view }), {
      initialProps: { view: p.view },
    });
    await act(async () => {});
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    rerender({ view: 'public-landing' });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
