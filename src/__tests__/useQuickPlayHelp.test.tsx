import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickPlayHelp } from '../hooks/useQuickPlayHelp';
import { QP_EVENTS, QP_SERVER_EVENTS } from '../core/quickPlayProtocol';

function makeMockSocket() {
  const listeners = new Map<string, ((p: unknown) => void)[]>();
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (p: unknown) => void) => {
      const arr = listeners.get(event) ?? [];
      arr.push(cb);
      listeners.set(event, arr);
    }),
    off: vi.fn((event: string, cb: (p: unknown) => void) => {
      const arr = (listeners.get(event) ?? []).filter((c) => c !== cb);
      listeners.set(event, arr);
    }),
    __fire(event: string, payload: unknown) {
      (listeners.get(event) ?? []).forEach((cb) => cb(payload));
    },
  };
}

describe('useQuickPlayHelp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts un-raised', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    expect(result.current.handRaised).toBe(false);
    expect(result.current.handAckExpiresAt).toBeNull();
  });

  it('emits the raise event and sets state', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    expect(socket.emit).toHaveBeenCalledWith(QP_EVENTS.STUDENT_RAISE_HAND, {
      sessionCode: 'ABC',
      studentUid: 'u1',
    });
    expect(result.current.handRaised).toBe(true);
    expect(result.current.handAckExpiresAt).not.toBeNull();
  });

  it('is a no-op when already raised', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => result.current.onRaiseHand());
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });

  it('auto-clears after 60s', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => { vi.advanceTimersByTime(60_100); });
    expect(result.current.handRaised).toBe(false);
  });

  it('clears when server emits HAND_CLEARED for this student', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => socket.__fire(QP_SERVER_EVENTS.HAND_CLEARED, { studentUid: 'u1' }));
    expect(result.current.handRaised).toBe(false);
  });

  it('ignores clears for other students', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => socket.__fire(QP_SERVER_EVENTS.HAND_CLEARED, { studentUid: 'other' }));
    expect(result.current.handRaised).toBe(true);
  });
});
