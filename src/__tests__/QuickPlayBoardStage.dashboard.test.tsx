import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import QuickPlayBoardStage from '../components/QuickPlayBoardStage';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Quick Play teacher board', () => {
  it('shows live round progress and keeps player actions available', () => {
    const onBonus = vi.fn();
    const onHelp = vi.fn();
    const onRemove = vi.fn();
    render(<QuickPlayBoardStage
      language="en"
      students={[{ studentUid: 'student-1', name: 'Ari', score: 25, avatar: '🦊', handRaisedAt: 123, roundProgress: { done: 3, total: 5 } }]}
      onBonus={onBonus} onHelp={onHelp} onRemove={onRemove}
    />);

    expect(screen.getByLabelText('3 / 5')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /acknowledge help from Ari/i }));
    fireEvent.click(screen.getByRole('button', { name: /give 5 points to Ari/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove Ari/i }));
    expect(onHelp).toHaveBeenCalledWith('student-1');
    expect(onBonus).toHaveBeenCalledWith('student-1');
    expect(onRemove).toHaveBeenCalledWith('student-1');
  });
});
