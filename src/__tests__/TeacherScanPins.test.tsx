import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TeacherScanPins from '../components/TeacherScanPins';
import { buildPinVerificationQr } from '../utils/classJoin';

const { rpc, proof } = vi.hoisted(() => ({ rpc: vi.fn(), proof: { raw: '' } }));
vi.mock('../core/supabase', () => ({ supabase: { rpc } }));
vi.mock('../components/QrScannerModal', () => ({
  default: ({ onDetect }: { onDetect: (raw: string) => void }) => (
    <button onClick={() => onDetect(proof.raw)}>Read fixture QR</button>
  ),
}));

afterEach(cleanup);

it('uses a matching verification QR only after the teacher confirms the student', async () => {
  const requestId = '00000000-0000-4000-8000-000000000013';
  rpc.mockImplementation(async (name: string) => {
    if (name === 'teacher_open_pin_window') {
      return {
        data: { id: 'fixture-window', ends_at: new Date(Date.now() + 60000).toISOString() },
      };
    }
    if (name === 'teacher_pending_pin_requests') {
      return { data: [{ id: requestId, display_name: 'Blue Owl', is_new: false }] };
    }
    return { data: null };
  });
  render(<TeacherScanPins code="TEST01" language="en" onActive={vi.fn()} />);
  const scan = await screen.findByRole('button', { name: /Scan the QR/ });
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(scan);
  proof.raw = buildPinVerificationQr('00000000-0000-4000-8000-000000000014', '304528');
  fireEvent.click(screen.getByRole('button', { name: 'Read fixture QR' }));
  expect(screen.getByRole('alert').textContent).toMatch(/different request/);
  expect(screen.queryByRole('button', { name: 'Approve and send PIN' })).toBeNull();
  fireEvent.click(scan);
  proof.raw = buildPinVerificationQr(requestId, '304528');
  fireEvent.click(screen.getByRole('button', { name: 'Read fixture QR' }));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(rpc).not.toHaveBeenCalledWith('teacher_decide_pin_request', expect.anything());
  fireEvent.click(screen.getByRole('button', { name: 'Approve and send PIN' }));
  await waitFor(() => expect(screen.queryByText('Blue Owl')).toBeNull());
  expect(rpc).toHaveBeenCalledWith('teacher_decide_pin_request', {
    p_id: requestId,
    p_approve: true,
    p_challenge: '304528',
  });
});
