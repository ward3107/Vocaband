import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RaisedHandBadge, handRaisedCount } from '../components/QuickPlayMonitor';

afterEach(cleanup);

describe('QuickPlayMonitor raise-hand pieces', () => {
  describe('handRaisedCount', () => {
    it('counts only students whose handRaisedAt is a number', () => {
      const students = [
        { handRaisedAt: null },
        { handRaisedAt: 1000 },
        { handRaisedAt: null },
        { handRaisedAt: 2000 },
      ];
      expect(handRaisedCount(students as never)).toBe(2);
    });

    it('returns 0 for an empty list', () => {
      expect(handRaisedCount([])).toBe(0);
    });
  });

  describe('RaisedHandBadge', () => {
    it('renders the emoji and count when count > 0', () => {
      render(<RaisedHandBadge count={3} onClear={() => {}} />);
      expect(screen.getByText(/3/)).toBeTruthy();
      expect(screen.getByText(/🙋/)).toBeTruthy();
    });

    it('renders nothing when count is 0', () => {
      const { container } = render(<RaisedHandBadge count={0} onClear={() => {}} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
