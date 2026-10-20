import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackButtonTrap } from '../hooks/useBackButtonTrap';
import { useBackLayer } from '../hooks/useBackLayer';
import type { AppUser } from '../core/supabase';
import type { View } from '../core/views';

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('../core/supabase', () => ({
  supabase: { auth },
  hasTeacherAccess: (user: { role: string } | null) => user?.role === 'teacher',
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(async () => ({ remove: vi.fn() })), exitApp: vi.fn(async () => {}) },
}));
vi.mock('../utils/urlRouting', () => ({ URL_ROUTING_PUSH: true }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/student?class=ABCD2345&assignment=task-1');
});
afterEach(() => cleanup());
const teacher = { uid: 'teacher-test', role: 'teacher' } as AppUser;
function params(view: View, user: AppUser | null = null) {
  return {
    view,
    user,
    setView: vi.fn(),
    showExitConfirmModal: false,
    setShowExitConfirmModal: vi.fn(),
    restoreInProgressRef: { current: false },
    onFloorExitHint: vi.fn(),
  };
}
function popped(view: string) {
  window.history.replaceState({ view }, '', '/');
  act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: { view } })));
}

describe('Back history and session safety', () => {
  it('seeds login above the actual home URL and preserves the whole invite', () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    renderHook(() => useBackButtonTrap(params('student-account-login')));
    expect(replace).toHaveBeenCalledWith({ view: 'public-landing' }, '', '/');
    expect(window.location.pathname + window.location.search).toBe(
      '/student?class=ABCD2345&assignment=task-1'
    );
    replace.mockRestore();
  });

  it('closing a dialog restores the visible URL and query, rather than the popped destination', () => {
    const p = params('student-account-login');
    const close = vi.fn();
    renderHook(() => {
      useBackButtonTrap(p);
      useBackLayer(close);
    });
    popped('public-landing');
    expect(close).toHaveBeenCalledOnce();
    expect(p.setView).not.toHaveBeenCalled();
    expect(window.location.pathname + window.location.search).toBe(
      '/student?class=ABCD2345&assignment=task-1'
    );
    expect(window.history.state.view).toBe('student-account-login');
  });

  it('second Back dismisses the teacher exit confirmation without signing out', () => {
    window.history.replaceState({}, '', '/teacher-dashboard');
    const p = params('teacher-dashboard', teacher);
    const { rerender } = renderHook(
      ({ show }) => useBackButtonTrap({ ...p, showExitConfirmModal: show }),
      { initialProps: { show: false } }
    );
    popped('public-landing');
    expect(p.setShowExitConfirmModal).toHaveBeenLastCalledWith(true);
    rerender({ show: true });
    popped('public-landing');
    expect(p.setShowExitConfirmModal).toHaveBeenLastCalledWith(false);
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(p.setView).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/teacher-dashboard');
  });

  it('a private direct link returns to the signed-in role home instead of getting stuck', () => {
    window.history.replaceState({}, '', '/vocabulary-library');
    const p = params('vocabulary-library', teacher);
    renderHook(() => useBackButtonTrap(p));
    const pushes = vi.spyOn(window.history, 'pushState');
    popped('public-landing');
    expect(p.setView).toHaveBeenCalledWith('teacher-dashboard');
    expect(window.location.pathname).toBe('/');
    expect(pushes.mock.calls.length).toBeGreaterThan(1);
    expect(window.history.state).toEqual({ view: 'teacher-dashboard' });
    pushes.mockRestore();
  });
});
