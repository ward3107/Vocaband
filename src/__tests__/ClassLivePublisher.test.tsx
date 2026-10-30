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
  it('starts collapsed and opening, dismissal and class selection do not publish a game', async () => {
    render(<ClassLivePublisher sessionId="session-1" classes={classes} subject="english" />);
    await act(async () => {});
    const trigger = screen.getByRole('button', { name: 'Choose a class' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'b' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    expect((screen.getByLabelText('Class') as HTMLSelectElement).value).toBe('b');
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('restores an open class as a compact status without opening the panel', async () => {
    mocks.restore.mockResolvedValue({ data: { class_id: 'b' }, error: null });
    render(<ClassLivePublisher sessionId="session-1" classes={classes} subject="english" />);
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Open for Class B' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Open for Class B');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('lets an English-dashboard teacher read the class-entry guide in Hebrew', async () => {
    render(<ClassLivePublisher sessionId="session-1" classes={[classes[0]]} subject="english" />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Choose a class' }));
    fireEvent.click(screen.getByRole('button', { name: 'עברית' }));
    expect(screen.getByRole('heading', { name: 'פתיחת המשחק לתלמידי הכיתה' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'פתיחה לכיתה הזו' })).toBeTruthy();
    expect(mocks.restore).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'פתיחה לכיתה הזו' })));
    expect(screen.queryByRole('heading')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'המשחק פתוח לכיתה Class A' }));
    expect(screen.getByText(/אומרים לתלמידים:.*היכנסו לכיתה שלכם/)).toBeTruthy();
  });
  it('requires the class choice, keeps subjects separate and waits for database confirmation', async () => {
    let confirm!: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(r => { confirm = r; }));
    render(<ClassLivePublisher sessionId="session-1" classes={classes} subject="english" />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Choose a class' }));
    expect(screen.queryByRole('option', { name: 'עברית' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Open for this class' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open for this class' }));
    expect(mocks.rpc).toHaveBeenCalledWith('set_class_live_session', { p_class_id: 'b', p_session_id: 'session-1' });
    expect(screen.queryByText('Open for Class B')).toBeNull();
    await act(async () => confirm({ error: null }));
    expect(screen.getByRole('button', { name: 'Open for Class B' })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open for Class B' }));
    mocks.close.mockResolvedValue({ data: [{ class_id: 'b' }], error: null });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Close class entry' })));
    expect(screen.queryByText('Open for Class B')).toBeNull();
  });
  it('does not report a rejected publication as open', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'permission denied' } });
    render(<ClassLivePublisher sessionId="session-1" classes={[classes[0]]} subject="english" />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Choose a class' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open for this class' })));
    expect(screen.getByRole('alert').textContent).toContain('could not be opened');
    expect(screen.queryByText('Open for Class A')).toBeNull();
  });
});
