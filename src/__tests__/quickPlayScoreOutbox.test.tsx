import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuickPlayScoreOutbox, readQuickPlayScoreCursor } from '../utils/quickPlayScoreOutbox';

type Box = ReturnType<typeof createQuickPlayScoreOutbox>;
let boxes: Box[] = [];
const box = () => { const b = createQuickPlayScoreOutbox(); boxes.push(b); return b; };
beforeEach(() => { sessionStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { boxes.forEach(b => b.suspend()); boxes = []; vi.useRealTimers(); });
describe('durable score outbox', () => {
  it('waits for JOINED, survives refresh and splits a large offline target', () => {
    const first = box(); first.enqueue('ABC234', 'id', 3800); first.suspend();
    const restored = box(), send = vi.fn();
    restored.confirm('ABC234', 'id', 0, send);
    expect(send.mock.calls[0][0].score).toBe(1500);
    send.mock.calls[0][1]({ ok: true, score: 1500 }); vi.advanceTimersByTime(200);
    expect(send.mock.calls[1][0].score).toBe(3000);
    send.mock.calls[1][1]({ ok: true, score: 3000 }); vi.advanceTimersByTime(200);
    expect(send.mock.calls[2][0].score).toBe(3800);
    send.mock.calls[2][1]({ ok: true, score: 3800 }); vi.advanceTimersByTime(200);
    restored.suspend();
    const afterAck = box(), next = vi.fn(); afterAck.confirm('ABC234', 'id', 3800, next);
    expect(next).not.toHaveBeenCalled();
    expect(readQuickPlayScoreCursor('ABC234', 'id')).toBe(3800);
  });
  it('retries a lost ACK and preserves a newer score when an older ACK arrives', () => {
    const b = box(), send = vi.fn(); b.confirm('ABC234', 'id', 0, send); b.enqueue('ABC234', 'id', 20);
    const oldAck = send.mock.calls[0][1];
    vi.advanceTimersByTime(6000); expect(send).toHaveBeenCalledTimes(2);
    b.enqueue('ABC234', 'id', 40);
    oldAck({ ok: true, score: 20 }); // already timed out, cannot settle another flight
    send.mock.calls[1][1]({ ok: true, score: 20 }); vi.advanceTimersByTime(200);
    expect(send.mock.calls[2][0].score).toBe(40);
    send.mock.calls[2][1]({ ok: false }); vi.advanceTimersByTime(1000);
    expect(send.mock.calls[3][0].score).toBe(40);
  });
  it('suspends on disconnect and ignores stale ACKs after a different player joins', () => {
    const b = box(), send = vi.fn(); b.confirm('ABC234', 'first', 0, send); b.enqueue('ABC234', 'first', 30);
    const oldAck = send.mock.calls[0][1]; b.suspend(); vi.advanceTimersByTime(20000);
    expect(send).toHaveBeenCalledTimes(1);
    b.confirm('ABC234', 'second', 0, send); b.enqueue('ABC234', 'second', 15);
    oldAck({ ok: true, score: 30 });
    expect(readQuickPlayScoreCursor('ABC234', 'second')).toBe(15);
    b.clear('ABC234'); vi.advanceTimersByTime(20000);
    expect(readQuickPlayScoreCursor('ABC234', 'second')).toBeUndefined();
  });
  it('restores the accepted cumulative baseline for a fresh join and resets it for a new player', () => {
    const b = box(), send = vi.fn();
    b.confirm('ABC234', 'first', 80, send);
    expect(b.cursor('ABC234', 'first')).toBe(80);
    b.enqueue('ABC234', 'first', b.cursor('ABC234', 'first') + 10);
    expect(send.mock.calls[0][0].score).toBe(90);
    b.confirm('ABC234', 'second', 0, send);
    expect(b.cursor('ABC234', 'second')).toBe(0);
  });
  it('never adopts another tab or player cursor and expires stale data', () => {
    const b = box(); b.enqueue('ABC234', 'first', 99);
    expect(readQuickPlayScoreCursor('ABC234', 'second')).toBeUndefined();
    vi.advanceTimersByTime(24 * 3600 * 1000 + 1);
    expect(readQuickPlayScoreCursor('ABC234', 'first')).toBeUndefined();
  });
});
