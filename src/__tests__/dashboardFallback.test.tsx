import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDashboardFallback } from '../utils/dashboardFallback';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('teacher dashboard fallback', () => {
  it('keeps polling if one class fails even when another subscribes', () => {
    const refresh = vi.fn();
    const fallback = createDashboardFallback(['A', 'B'], refresh, 1000);
    fallback.status('A', 'CHANNEL_ERROR');
    fallback.status('B', 'SUBSCRIBED');
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    fallback.status('A', 'SUBSCRIBED');
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    fallback.status('B', 'CLOSED');
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
    fallback.dispose();
  });

  it('polls classes beyond the subscription cap', () => {
    const refresh = vi.fn();
    const codes = ['A', 'B', 'C', 'D', 'E', 'F'];
    const fallback = createDashboardFallback(codes, refresh, 1000);
    codes.slice(0, 5).forEach(code => fallback.status(code, 'SUBSCRIBED'));
    vi.advanceTimersByTime(2000);
    expect(refresh).toHaveBeenCalledTimes(2);
    fallback.dispose();
    fallback.status('A', 'CLOSED');
    vi.advanceTimersByTime(2000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does no background polling while the tab is hidden', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const refresh = vi.fn();
    const fallback = createDashboardFallback(['A'], refresh, 1000);
    vi.advanceTimersByTime(2000);
    expect(refresh).not.toHaveBeenCalled();
    fallback.dispose();
  });
});
