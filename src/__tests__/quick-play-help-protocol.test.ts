import { describe, it, expect } from 'vitest';
import { QP_EVENTS, QP_SERVER_EVENTS } from '../core/quickPlayProtocol';

describe('quick-play help protocol constants', () => {
  it('exports the 2 student→server event names', () => {
    expect(QP_EVENTS.STUDENT_RAISE_HAND).toBe('qp:student:raise-hand');
    expect(QP_EVENTS.TEACHER_ACK_HELP).toBe('qp:teacher:ack-help');
  });

  it('exports the 2 server→client event names', () => {
    expect(QP_SERVER_EVENTS.HAND_RAISED).toBe('qp:hand:raised');
    expect(QP_SERVER_EVENTS.HAND_CLEARED).toBe('qp:hand:cleared');
  });
});
