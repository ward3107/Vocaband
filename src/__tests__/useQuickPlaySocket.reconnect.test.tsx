import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QP_EVENTS, QP_SERVER_EVENTS } from '../core/quickPlayProtocol';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const socket = {
    connected: true,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    }),
    off: vi.fn((event: string, cb: (...args: unknown[]) => void) => listeners.get(event)?.delete(cb)),
    emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn(),
  };
  return { socket, listeners, io: vi.fn(() => socket), load: vi.fn() };
});
vi.mock('../utils/lazyLoad', () => ({ loadSocketIO: mocks.load }));
import { disconnectQuickPlaySocket, useQuickPlaySocket } from '../hooks/useQuickPlaySocket';
import { readStoredClientId } from '../utils/quickPlayClientId';

const clientId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
function receive(event: string, payload?: unknown) {
  for (const cb of [...(mocks.listeners.get(event) ?? [])]) cb(payload);
}
beforeEach(() => {
  disconnectQuickPlaySocket();
  mocks.listeners.clear();
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.socket.connected = true;
  mocks.load.mockImplementation(async () => ({ default: mocks.io }));
});
afterEach(() => { cleanup(); disconnectQuickPlaySocket(); });

describe('classroom reconnect', () => {
  it('creates one socket when the app and join screen mount together', async () => {
    const app = renderHook(() => useQuickPlaySocket({ sessionCode: 'ABC234' }));
    const join = renderHook(() => useQuickPlaySocket({ sessionCode: 'ABC234' }));
    await waitFor(() => expect(app.result.current.status).toBe('connected'));
    expect(join.result.current.status).toBe('connected');
    expect(mocks.io).toHaveBeenCalledTimes(1);
  });
  it('adopts the accepted ID, keeps rejoin intent after join-screen unmount and queues scores until rejoined', async () => {
    const app = renderHook(() => useQuickPlaySocket({ sessionCode: 'ABC234' }));
    const join = renderHook(() => useQuickPlaySocket({ sessionCode: 'ABC234' }));
    await waitFor(() => expect(join.result.current.status).toBe('connected'));
    await act(async () => join.result.current.joinAsStudent('Alex', '🦊'));
    act(() => receive(QP_SERVER_EVENTS.JOINED, { sessionCode: 'ABC234', clientId, rejoinToken: 'private-proof', leaderboard: [] }));
    expect(readStoredClientId()).toBe(clientId);
    join.unmount();
    act(() => { mocks.socket.connected = false; receive('disconnect'); });
    expect(app.result.current.joinedSessionCode).toBeNull();
    mocks.socket.emit.mockClear();
    act(() => app.result.current.updateScore(40));
    expect(mocks.socket.emit).not.toHaveBeenCalled();
    act(() => { mocks.socket.connected = true; receive('connect'); });
    expect(mocks.socket.emit).toHaveBeenCalledWith(QP_EVENTS.STUDENT_JOIN, expect.objectContaining({ clientId, rejoinToken: 'private-proof' }));
    expect(mocks.socket.emit.mock.calls.some(([event]) => event === QP_EVENTS.SCORE_UPDATE)).toBe(false);
    act(() => receive(QP_SERVER_EVENTS.JOINED, { sessionCode: 'ABC234', clientId, rejoinToken: 'renewed-proof', leaderboard: [] }));
    expect(mocks.socket.emit).toHaveBeenCalledWith(QP_EVENTS.SCORE_UPDATE, expect.objectContaining({ clientId, score: 40 }));
    expect(app.result.current.joinedSessionCode).toBe('ABC234');
  });
  it('never rejoins a session after it has ended', async () => {
    const hook = renderHook(() => useQuickPlaySocket({ sessionCode: 'ABC234' }));
    await waitFor(() => expect(hook.result.current.status).toBe('connected'));
    await act(async () => hook.result.current.joinAsStudent('Alex'));
    act(() => receive(QP_SERVER_EVENTS.SESSION_ENDED, { sessionCode: 'ABC234' }));
    mocks.socket.emit.mockClear();
    act(() => receive('connect'));
    expect(mocks.socket.emit).not.toHaveBeenCalled();
  });
});
