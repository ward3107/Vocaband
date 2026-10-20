import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { View } from '../core/views';
import { usePublicBackNavigation } from '../hooks/usePublicBackNavigation';
import { useBackLayer } from '../hooks/useBackLayer';
import { modalBackStack } from '../utils/modalBackStack';

beforeEach(() => window.history.replaceState({}, '', '/'));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  expect(modalBackStack.size).toBe(0);
});
const pop = (view: View, path = '/') =>
  act(() => {
    window.history.replaceState({ view }, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { view } }));
  });

describe('public-shell Back navigation', () => {
  it('gives a dialog on a fresh home page an in-document Back entry', () => {
    const setView = vi.fn();
    const close = vi.fn();
    renderHook(() => usePublicBackNavigation('public-landing', setView, true));
    renderHook(() => useBackLayer(close));
    expect(window.history.state._publicLayer).toBe(true);
    pop('public-landing');
    expect(close).toHaveBeenCalledOnce();
    expect(setView).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
  });
  it('skips an inert entry after an X close instead of requiring two Back gestures', () => {
    renderHook(() => usePublicBackNavigation('public-landing', vi.fn(), true));
    const dialog = renderHook(() => useBackLayer(vi.fn()));
    dialog.unmount();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    pop('public-landing');
    expect(back).toHaveBeenCalledOnce();
  });
  it('walks real public page history without re-pushing the destination', () => {
    const setView = vi.fn();
    const { rerender } = renderHook(
      ({ view }: { view: View }) => usePublicBackNavigation(view, setView, true),
      { initialProps: { view: 'public-landing' as View } }
    );
    rerender({ view: 'public-privacy' });
    expect(window.location.pathname).toBe('/privacy');
    const push = vi.spyOn(window.history, 'pushState');
    pop('public-landing');
    expect(setView).toHaveBeenCalledWith('public-landing');
    rerender({ view: 'public-landing' });
    expect(push).not.toHaveBeenCalled();
  });
  it('seeds a direct legal link above home and preserves its original query', () => {
    window.history.replaceState({}, '', '/privacy?lang=he');
    const replace = vi.spyOn(window.history, 'replaceState');
    renderHook(() => usePublicBackNavigation('public-privacy', vi.fn(), true));
    expect(replace).toHaveBeenCalledWith({ view: 'public-landing' }, '', '/');
    expect(window.location.pathname + window.location.search).toBe('/privacy?lang=he');
  });
  it('releases the listener when handing navigation to the authenticated app', () => {
    const close = vi.fn();
    const setView = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => usePublicBackNavigation('public-landing', setView, enabled),
      { initialProps: { enabled: true } }
    );
    renderHook(() => useBackLayer(close));
    rerender({ enabled: false });
    pop('public-landing');
    expect(close).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();
  });
});
