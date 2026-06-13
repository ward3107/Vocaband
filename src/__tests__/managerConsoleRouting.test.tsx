/**
 * School-manager (principal) console — frontend routing + formatting.
 *
 *   1. The `view === 'manager-dashboard'` branch in renderMiscViews
 *      mounts ManagerConsoleView (and only that view reaches it).
 *   2. useViewGuards' orphaned-`landing` guard routes managers to
 *      'manager-dashboard' — and only managers.
 *   3. formatAvgScore maps the raw 0–1000 game-score scale to the
 *      rounded percentage the console displays.
 *
 * ManagerConsoleView itself is mocked (its data fetching is covered by
 * managerRpcFetchers.test.ts); the real module is pulled in via
 * importActual only for the pure formatting helper.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, renderHook } from '@testing-library/react';
import type { AppUser } from '../core/supabase';

vi.mock('../views/ManagerConsoleView', () => ({
  default: () => <div data-testid="manager-console" />,
}));

import { renderMiscViews, type RenderMiscViewsDeps } from '../views/MiscViewSections';
import { useViewGuards, type UseViewGuardsParams } from '../hooks/useViewGuards';

const MANAGER: AppUser = { uid: 'm1', role: 'manager', displayName: 'Principal Levi', coins: 0 };
const TEACHER: AppUser = { uid: 't1', role: 'teacher', displayName: 'Ms. Cohen', coins: 0 };

function miscDeps(overrides: Partial<RenderMiscViewsDeps> = {}): RenderMiscViewsDeps {
  return {
    view: 'manager-dashboard',
    user: MANAGER,
    activeVoca: null,
    selectedClass: null,
    activityNavOrigin: null,
    setView: vi.fn(),
    setSelectedClass: vi.fn(),
    setIsLiveChallenge: vi.fn(),
    setActiveVoca: vi.fn(),
    xp: 0,
    setXp: vi.fn(),
    coins: 0,
    setCoins: vi.fn(),
    setUser: vi.fn(),
    showToast: vi.fn(),
    boostersActivate: vi.fn(),
    visibleClasses: [],
    visibleAssignments: [],
    speakWord: vi.fn(),
    topicPacks: [],
    globalLeaderboard: [],
    pendingStudents: [],
    toasts: [],
    consentModal: null,
    exitConfirmModal: null,
    loadPendingStudents: vi.fn(),
    handleApproveStudent: vi.fn(),
    handleRejectStudent: vi.fn(),
    allScores: [],
    classStudents: [],
    selectedWords: [],
    setSelectedWords: vi.fn(),
    expandedStudent: null,
    setExpandedStudent: vi.fn(),
    socket: null,
    ...overrides,
  };
}

afterEach(cleanup);

describe("renderMiscViews — 'manager-dashboard' branch", () => {
  it('mounts ManagerConsoleView for view === manager-dashboard', async () => {
    render(<>{renderMiscViews(miscDeps())}</>);
    expect(await screen.findByTestId('manager-console')).toBeTruthy();
  });

  it('still mounts with a null user — the view self-scopes via the RPCs', async () => {
    render(<>{renderMiscViews(miscDeps({ user: null }))}</>);
    expect(await screen.findByTestId('manager-console')).toBeTruthy();
  });

  it('does not match unrelated views (falls through to null)', () => {
    expect(renderMiscViews(miscDeps({ view: 'teacher-dashboard' }))).toBeNull();
  });
});

describe("useViewGuards — orphaned 'landing' redirect", () => {
  function runLandingGuard(user: AppUser | null, loading = false) {
    const setView = vi.fn();
    const params: UseViewGuardsParams = {
      view: 'landing',
      setView,
      user,
      loading,
      activeAssignment: null,
      quickPlayActiveSession: null,
      selectedClass: null,
    };
    renderHook(() => useViewGuards(params));
    return setView;
  }

  it('routes managers to the principal console', () => {
    const setView = runLandingGuard(MANAGER);
    expect(setView).toHaveBeenCalledWith('manager-dashboard');
  });

  it('routes teachers to their dashboard, never the console', () => {
    const setView = runLandingGuard(TEACHER);
    expect(setView).toHaveBeenCalledWith('teacher-dashboard');
    expect(setView).not.toHaveBeenCalledWith('manager-dashboard');
  });

  it('waits for auth to resolve before redirecting', () => {
    const setView = runLandingGuard(MANAGER, true);
    expect(setView).not.toHaveBeenCalled();
  });
});

describe('formatAvgScore — raw 0–1000 scale → percentage', () => {
  it('divides by 10, rounds, and suffixes %', async () => {
    const { formatAvgScore } =
      await vi.importActual<typeof import('../views/ManagerConsoleView')>('../views/ManagerConsoleView');
    expect(formatAvgScore(850)).toBe('85%');
    expect(formatAvgScore(846)).toBe('85%');
    expect(formatAvgScore(844)).toBe('84%');
    expect(formatAvgScore(0)).toBe('0%');
    expect(formatAvgScore(1000)).toBe('100%');
  });

  it('passes null through so callers can render their own placeholder', async () => {
    const { formatAvgScore } =
      await vi.importActual<typeof import('../views/ManagerConsoleView')>('../views/ManagerConsoleView');
    expect(formatAvgScore(null)).toBeNull();
  });
});
