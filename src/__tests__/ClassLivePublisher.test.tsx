import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassData } from '../core/supabase';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), restore: vi.fn(), close: vi.fn() }));
vi.mock('../hooks/useLanguage', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('../core/supabase', () => ({ supabase: {
  rpc: (...args: unknown[]) => ({ abortSignal: () => mocks.rpc(...args) }),
  from: () => {
    const query = { select: () => query, eq: () => query, gt: () => query, abortSignal: () => query, maybeSingle: mocks.restore };
    return { ...query, update: () => ({ eq: () => ({ select: () => ({ abortSignal: mocks.close }) }) }) };
  },
} }));
import ClassLivePublisher from '../components/ClassLivePublisher';
const classes = [{ id: 'a', name: 'Class A', subject: 'english' }, { id: 'b', name: 'Class B', subject: 'english' }, { id: 'h', name: 'עברית', subject: 'hebrew' }] as ClassData[];
beforeEach(() => { vi.clearAllMocks(); mocks.restore.mockResolvedValue({ data: null, error: null }); mocks.rpc.mockResolvedValue({ error: null }); });
afterEach(cleanup);
describe('teacher class publication', () => {
  it('requires the class choice, keeps subjects separate and waits for database confirmation', async () => {
    let confirm!: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(r => { confirm = r; }));
    render(<ClassLivePublisher sessionId="session-1" classes={classes} subject="english" />);
    await act(async () => {});
    expect(screen.queryByRole('option', { name: 'עברית' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Open for this class' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open for this class' }));
    expect(mocks.rpc).toHaveBeenCalledWith('set_class_live_session', { p_class_id: 'b', p_session_id: 'session-1' });
    expect(screen.queryByText('Open for Class B')).toBeNull();
    await act(async () => confirm({ error: null }));
    expect(screen.getByText('Open for Class B')).toBeTruthy();
    mocks.close.mockResolvedValue({ data: [{ class_id: 'b' }], error: null });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Close class entry' })));
    expect(screen.queryByText('Open for Class B')).toBeNull();
  });
  it('does not report a rejected publication as open', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'permission denied' } });
    render(<ClassLivePublisher sessionId="session-1" classes={[classes[0]]} subject="english" />);
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open for this class' })));
    expect(screen.getByRole('alert').textContent).toContain('could not be opened');
    expect(screen.queryByText('Open for Class A')).toBeNull();
  });
});
