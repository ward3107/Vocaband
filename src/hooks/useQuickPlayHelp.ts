import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  QP_EVENTS,
  QP_SERVER_EVENTS,
  type HandClearedPayload,
  type StudentRaiseHandPayload,
} from '../core/quickPlayProtocol';

const AUTO_EXPIRE_MS = 60_000;

/**
 * Owns raised-hand state on the student side. Deliberately narrow — the
 * three self-service action callbacks (replay audio, force reconnect,
 * toggle translation) live in the caller's scope and are passed straight
 * to the button as props; this hook only handles the socket half.
 */
export function useQuickPlayHelp(
  socket: Socket | null,
  session: { sessionCode: string; studentUid: string } | null,
) {
  const [handRaised, setHandRaised] = useState(false);
  const [handAckExpiresAt, setHandAckExpiresAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHandRaised(false);
    setHandAckExpiresAt(null);
  }, []);

  const onRaiseHand = useCallback(() => {
    if (!socket || !session || handRaised) return;
    const payload: StudentRaiseHandPayload = {
      sessionCode: session.sessionCode,
      studentUid: session.studentUid,
    };
    socket.emit(QP_EVENTS.STUDENT_RAISE_HAND, payload);
    const expiresAt = Date.now() + AUTO_EXPIRE_MS;
    setHandRaised(true);
    setHandAckExpiresAt(expiresAt);
    timerRef.current = setTimeout(clear, AUTO_EXPIRE_MS);
  }, [socket, session, handRaised, clear]);

  useEffect(() => {
    if (!socket || !session) return;
    const onCleared = (payload: HandClearedPayload) => {
      if (payload?.studentUid !== session.studentUid) return;
      clear();
    };
    socket.on(QP_SERVER_EVENTS.HAND_CLEARED, onCleared);
    return () => { socket.off(QP_SERVER_EVENTS.HAND_CLEARED, onCleared); };
  }, [socket, session, clear]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { handRaised, handAckExpiresAt, onRaiseHand };
}
