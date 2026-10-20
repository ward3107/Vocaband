import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentPinLoginCard from '../components/StudentPinLoginCard';
import { modalBackStack } from '../utils/modalBackStack';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signIn: vi.fn() }));
vi.mock('../core/supabase', () => ({
  supabase: { rpc: mocks.rpc, auth: { signInWithPassword: mocks.signIn } },
}));
vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', isRTL: false }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({
    data: [{ id: 'maya', display_name: 'Maya', email: 'maya@example.test', avatar: '🦊' }],
    error: null,
  });
  mocks.signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  expect(modalBackStack.size).toBe(0);
});

describe('personal PIN Back and recovery', () => {
  it('returns to the name list and clears a personal PIN before selecting again', async () => {
    render(<StudentPinLoginCard classCode="ABCD2345" onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Maya' }));
    const pin = screen.getByLabelText('Type your PIN');
    expect(pin.getAttribute('dir')).toBe('ltr');
    fireEvent.change(pin, { target: { value: 'PQRS78' } });
    act(() => {
      modalBackStack.closeTop();
    });
    expect(screen.queryByLabelText('Type your PIN')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Maya' }));
    expect((screen.getByLabelText('Type your PIN') as HTMLInputElement).value).toBe('');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('keeps the selected student during an in-flight sign-in and allows retry afterward', async () => {
    let finish!: (value: { error: { message: string } }) => void;
    mocks.signIn.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(
      <StudentPinLoginCard classCode="ABCD2345" prefilledStudentId="maya" onSuccess={vi.fn()} />
    );
    fireEvent.change(await screen.findByLabelText('Type your PIN'), {
      target: { value: 'PQRS78' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
    act(() => {
      modalBackStack.closeTop();
    });
    expect(screen.getByLabelText('Type your PIN')).toBeTruthy();
    expect(modalBackStack.size).toBe(1);
    await act(async () => finish({ error: { message: 'Invalid login credentials' } }));
    expect(screen.getByRole('alert').textContent).toContain("That PIN doesn't match");
    act(() => {
      modalBackStack.closeTop();
    });
    expect(screen.getByRole('button', { name: 'Maya' })).toBeTruthy();
  });

  it('retries a failed roster load without leaving the selected class', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Connection lost') });
    render(<StudentPinLoginCard classCode="ABCD2345" onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Maya' })).toBeTruthy());
    expect(mocks.rpc).toHaveBeenLastCalledWith('class_roster_for_login', {
      p_class_code: 'ABCD2345',
    });
  });
});
