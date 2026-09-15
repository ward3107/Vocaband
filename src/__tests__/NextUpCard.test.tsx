import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NextUpCard from '../components/dashboard/NextUpCard';
import type { AssignmentData } from '../core/supabase';
import { studentDashboardT } from '../locales/student/student-dashboard';

const mocks = vi.hoisted(() => ({ pick: vi.fn(), resolve: vi.fn(), language: 'en', error: vi.fn() }));
vi.mock('../utils/pickNextAssignment', () => ({ pickNextAssignment: mocks.pick }));
vi.mock('../utils/resolveAssignmentWords', () => ({ resolveAssignmentWords: mocks.resolve }));
vi.mock('../errorTracking', () => ({ trackAutoError: mocks.error }));
vi.mock('../hooks/useLanguage', () => ({ useLanguage: () => ({ language: mocks.language, isRTL: mocks.language !== 'en' }) }));

const assignment = { id: 'assigned-only', title: 'My teacher’s words', wordIds: [91] } as AssignmentData;
const props = () => ({
  studentAssignments: [assignment], studentProgress: [], userUid: 'student',
  setActiveAssignment: vi.fn(), setAssignmentWords: vi.fn(), setView: vi.fn(), setShowModeSelection: vi.fn(),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.language = 'en';
  mocks.pick.mockReturnValue({ assignment, percent: 40, state: 'continue' });
});
afterEach(cleanup);

describe('direct student assignment action', () => {
  it.each(['en', 'he', 'ar'] as const)('shows an explicit localized action in %s', language => {
    mocks.language = language;
    render(<NextUpCard {...props()} />);
    const label = studentDashboardT[language].continueAction;
    expect(screen.getByRole('button', { name: `${label}: ${assignment.title}` })).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('launches only resolved assignment words and opens the mode picker', async () => {
    const p = props();
    const words = [{ id: 91, english: 'assigned' }];
    mocks.resolve.mockResolvedValue(words);
    render(<NextUpCard {...p} />);
    await act(async () => { fireEvent.click(screen.getByRole('button')); });
    expect(mocks.resolve).toHaveBeenCalledWith(assignment);
    expect(p.setActiveAssignment).toHaveBeenCalledWith(assignment);
    expect(p.setAssignmentWords).toHaveBeenCalledWith(words);
    expect(p.setView).toHaveBeenCalledWith('game');
    expect(p.setShowModeSelection).toHaveBeenCalledWith(true);
  });

  it('does not substitute demo words when an assignment cannot resolve', async () => {
    const p = props();
    mocks.resolve.mockResolvedValue([]);
    render(<NextUpCard {...p} />);
    await act(async () => { fireEvent.click(screen.getByRole('button')); });
    expect(p.setView).not.toHaveBeenCalled();
    expect(p.setAssignmentWords).not.toHaveBeenCalled();
  });

  it('renders no action when all assignments are unavailable or locked', () => {
    mocks.pick.mockReturnValue(null);
    render(<NextUpCard {...props()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
