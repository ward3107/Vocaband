import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RosterModalV2 from '../components/roster/v2/RosterModalV2';
import { classEntryT } from '../locales/class-entry';
import { classRosterT } from '../locales/teacher/roster';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), print: vi.fn() }));
vi.mock('../core/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mocks.rpc(...args) },
}));
vi.mock('../hooks/useLanguage', () => ({ useLanguage: () => ({ language: 'en', dir: 'ltr' }) }));
vi.mock('../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../hooks/useFeatureFlags', () => ({ useFeatureFlag: () => ({ isOn: () => true }) }));
vi.mock('../utils/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../utils/studentEntryCards', () => ({
  printStudentEntryCards: (...args: unknown[]) => mocks.print(...args),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('bulk-generated personal entry cards', () => {
  it.each([false, true])(
    'waits for real student IDs and can recover from a failed sync (%s)',
    async (failSync) => {
      const id = '5f7b1234-1111-2222-3333-123456789abc';
      const synced = {
        data: [{ id, display_name: '07-7-1-1', roster_pin: 'PQRS78' }],
        error: null,
      };
      let reads = 0;
      let finishSync!: (value: unknown) => void;
      const resync = new Promise((resolve) => {
        finishSync = resolve;
      });
      mocks.rpc.mockImplementation((name: string) => {
        if (name === 'teacher_bulk_create_roster')
          return Promise.resolve({
            data: [{ structured_id: '07-7-1-1', pin: 'PQRS78' }],
            error: null,
          });
        if (name === 'teacher_view_roster') {
          reads += 1;
          return reads === 1
            ? Promise.resolve({ data: [], error: null })
            : reads === 2
              ? resync
              : Promise.resolve(synced);
        }
        throw new Error(`Unexpected RPC ${name}`);
      });
      render(<RosterModalV2 open onClose={vi.fn()} classCode="ABCD2345" className="Year 7" />);
      await screen.findByText(classRosterT.en.emptyTitle);
      for (const [label, value] of [
        [classRosterT.en.bulkGradeLabel, '7'],
        [classRosterT.en.bulkBranchLabel, '1'],
        [classRosterT.en.bulkCountLabel, '1'],
      ]) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      }
      fireEvent.click(screen.getByRole('button', { name: classRosterT.en.bulkGenerate }));
      await waitFor(() => expect(reads).toBe(2));
      const print = screen.getByRole('button', {
        name: classEntryT.en.printCards,
      }) as HTMLButtonElement;
      expect(print.disabled).toBe(true);
      fireEvent.click(print);
      expect(mocks.print).not.toHaveBeenCalled();
      await act(async () =>
        finishSync(failSync ? { data: null, error: new Error('Network unavailable') } : synced)
      );
      if (failSync) {
        expect(print.disabled).toBe(true);
        expect(screen.getByText(classEntryT.en.cardsPending)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: classEntryT.en.retry }));
      }
      await waitFor(() => expect(print.disabled).toBe(false));
      fireEvent.click(print);
      expect(mocks.print).toHaveBeenCalledWith(
        expect.objectContaining({ students: [{ id, displayName: '07-7-1-1', pin: 'PQRS78' }] }),
        expect.any(Function)
      );
    }
  );
});
