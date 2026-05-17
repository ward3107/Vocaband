/**
 * useQuickPlayEvents — companion to useQuickPlaySocket.
 *
 * Translates the v2-native KICKED / SESSION_ENDED events into the
 * caller's UI state handlers, but only when the local viewer is
 * actually a Quick Play guest student.  KICKED and SESSION_ENDED are
 * broadcast to EVERY socket in the room — including the teacher who
 * triggered them — so without this guard, ending a session from the
 * teacher's monitor would also flip the teacher into the student
 * QuickPlaySessionEndScreen and call setUser(null), which is wrong.
 *
 * Mirrors the useLiveChallengeEvents pattern: takes per-role
 * subscribers + handlers, owns the wiring.
 */
import { useEffect, useRef } from 'react';

type Unsubscribe = () => void;
type Subscribe = (handler: () => void) => Unsubscribe;

export interface UseQuickPlayEventsParams {
  enabled: boolean;
  isGuest: boolean;
  onKicked: Subscribe;
  onSessionEnded: Subscribe;
  handleGuestKicked: () => void;
  handleGuestSessionEnded: () => void;
}

export function useQuickPlayEvents(params: UseQuickPlayEventsParams): void {
  const { enabled, isGuest, onKicked, onSessionEnded, handleGuestKicked, handleGuestSessionEnded } = params;

  // Refs let the subscribe effect depend only on the (stable) on-*
  // subscribers — the handlers and isGuest can change every render
  // without re-subscribing.
  const isGuestRef = useRef(isGuest);
  const kickedHandlerRef = useRef(handleGuestKicked);
  const endedHandlerRef = useRef(handleGuestSessionEnded);

  useEffect(() => { isGuestRef.current = isGuest; }, [isGuest]);
  useEffect(() => { kickedHandlerRef.current = handleGuestKicked; }, [handleGuestKicked]);
  useEffect(() => { endedHandlerRef.current = handleGuestSessionEnded; }, [handleGuestSessionEnded]);

  useEffect(() => {
    if (!enabled) return;
    const offKicked = onKicked(() => {
      if (!isGuestRef.current) return;
      kickedHandlerRef.current();
    });
    const offEnded = onSessionEnded(() => {
      if (!isGuestRef.current) return;
      endedHandlerRef.current();
    });
    return () => { offKicked(); offEnded(); };
  }, [enabled, onKicked, onSessionEnded]);
}
