import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuickPlayEndgameBack } from '../hooks/useQuickPlayEndgameBack';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useQuickPlayEndgameBack', () => {
  it('returns a Quick Play guest from results to the mode picker on browser Back', () => {
    const onBackToModes = vi.fn();
    renderHook(() => useQuickPlayEndgameBack(true, onBackToModes));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', {
        state: { view: 'game' },
      }));
    });

    expect(onBackToModes).toHaveBeenCalledOnce();
    expect(window.history.state).toEqual({ view: 'game', quickPlayStage: 'modes' });
  });

  it('does not intercept Back for signed-in students', () => {
    const onBackToModes = vi.fn();
    renderHook(() => useQuickPlayEndgameBack(false, onBackToModes));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', {
        state: { view: 'student-dashboard' },
      }));
    });

    expect(onBackToModes).not.toHaveBeenCalled();
  });
});
