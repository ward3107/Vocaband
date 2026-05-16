/**
 * useLiveChallengeEvents — the four short-lived effects that emit
 * JOIN_CHALLENGE / OBSERVE_CHALLENGE and listen for `challenge_error`
 * on the Live Challenge socket.
 *
 * Extracted from App.tsx as a companion to useLiveChallengeSocket.
 * The socket hook owns connection lifecycle; this one owns the
 * per-role emit behaviour that triggers off view/class state.
 *
 * Four concerns:
 *
 * 1. Student JOIN_CHALLENGE emit.  Fires whenever (student + socket
 *    + classCode) are all present, exactly once per unique
 *    (socketId, uid) tuple.  Covers every login path (traditional,
 *    click-name, restore).  CRITICAL detail: the uid in the payload
 *    MUST be the Supabase session's user.id, not user.uid from app
 *    state.  The server middleware authenticates the socket with
 *    the session's JWT and stores the verified uid in
 *    socket.data.uid.  The JOIN_CHALLENGE handler rejects (silently!)
 *    if payload uid !== socket.data.uid.  On the click-name student
 *    login path, user.uid = profile.auth_uid which can differ from
 *    the current session's user.id — that mismatch was dropping
 *    join events on the floor.  We read the session uid on every
 *    run so whatever we send matches the JWT.
 *
 * 2. Teacher OBSERVE_CHALLENGE re-emit.  LiveChallengeClassSelectView
 *    emits OBSERVE_CHALLENGE once when the teacher picks a class,
 *    but if the socket drops + reconnects mid-challenge the teacher
 *    ends up in a live-challenge room without being subscribed to
 *    its leaderboard updates.  Re-emit on every reconnect while
 *    the teacher is inside the live-challenge view.
 *
 * 3. `challenge_error` listener — surfaces the rejection reason in
 *    the console instead of the silent-drop behaviour that made
 *    podium bugs invisible.
 *
 * 4. Reset the JOIN dedupe key on disconnect so the next connect
 *    can re-emit (socket gets a new id on reconnect).
 */
import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { supabase, hasTeacherAccess, type AppUser, type ClassData } from '../core/supabase';
import { SOCKET_EVENTS } from '../core/types';

export interface UseLiveChallengeEventsParams {
  user: AppUser | null;
  socket: Socket | null;
  socketConnected: boolean;
  selectedClass: ClassData | null;
  isLiveChallenge: boolean;
}

export function useLiveChallengeEvents(params: UseLiveChallengeEventsParams): void {
  const { user, socket, socketConnected, selectedClass, isLiveChallenge } = params;

  // Tracks which (socketId:classCode:uid) combo has already emitted
  // JOIN_CHALLENGE — prevents duplicate emits when effects re-run.
  // Cleared whenever the socket reconnects (new socket id) so the
  // next join goes through.
  const joinChallengeEmittedRef = useRef<string>('');

  // ─── Student JOIN_CHALLENGE emit ───────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'student' || !user.classCode) return;
    if (!socket || !socketConnected) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUid = session?.user?.id;
      if (cancelled) return;
      if (!sessionUid) {
        console.warn(
          '[Live] JOIN_CHALLENGE skipped — no Supabase session yet. ' +
          'Students without an anonymous session cannot appear on the podium.',
        );
        return;
      }
      const joinKey = `${socket.id}:${user.classCode}:${sessionUid}`;
      if (joinChallengeEmittedRef.current === joinKey) return;
      joinChallengeEmittedRef.current = joinKey;
      socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, {
        classCode: user.classCode!,
        name: user.displayName,
        uid: sessionUid,
      });
      console.log('[Live] JOIN_CHALLENGE emitted', {
        classCode: user.classCode,
        name: user.displayName,
        sessionUid,
        userUid: user.uid,
        match: sessionUid === user.uid,
      });
    })();
    return () => { cancelled = true; };
  }, [user, socket, socketConnected]);

  // ─── Teacher OBSERVE_CHALLENGE re-emit on reconnect ───────────────
  useEffect(() => {
    if (!hasTeacherAccess(user)) return;
    if (!socket || !socketConnected) return;
    if (!selectedClass || !isLiveChallenge) return;
    socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: selectedClass.code });
    console.log('[Live] OBSERVE_CHALLENGE re-emitted for teacher', {
      classCode: selectedClass.code,
    });
  }, [user, socket, socketConnected, selectedClass, isLiveChallenge]);

  // ─── challenge_error console surfacer ─────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onError = (payload: { event?: string; reason?: string }) => {
      console.error('[Live] Server rejected event:', payload);
    };
    socket.on('challenge_error', onError);
    return () => { socket.off('challenge_error', onError); };
  }, [socket]);

  // ─── Reset dedupe on disconnect ───────────────────────────────────
  useEffect(() => {
    if (!socketConnected) {
      joinChallengeEmittedRef.current = '';
    }
  }, [socketConnected]);
}
