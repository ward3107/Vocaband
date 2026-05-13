/**
 * useLiveChallengeSocket — lifecycle for the Live Challenge socket.io
 * connection + its leaderboard stream.
 *
 * Single responsibility: open one authenticated socket, keep it alive
 * across drops, and surface `socket`, `socketConnected`, and
 * `leaderboard` to the rest of the app.  Downstream effects
 * (JOIN_CHALLENGE emit, teacher OBSERVE_CHALLENGE re-emit, disconnect
 * dedupe reset) intentionally live in App.tsx — they read the socket
 * from this hook but their triggers belong to other state machines.
 *
 * Why the socket is deferred until a session exists: connecting on
 * mount (before the OAuth exchange completes) always failed with
 * "Authentication required" on the first attempt, producing the
 * console error teachers saw before the retry succeeded.  We wait for
 * `getSession()` to return a token, falling back to a one-shot
 * `onAuthStateChange` subscription when it's empty.
 *
 * Reconnection policy:
 *  - `reconnectionAttempts: Infinity` — a Live Challenge can run 20+
 *    minutes and classroom Wi-Fi is flaky.  Giving up after 10 tries
 *    (the default) used to leave a student permanently offline after
 *    a brief outage.
 *  - `reconnectionDelay: 1000` with `Max: 10_000` + jitter — a Render
 *    restart flushes 30 sockets; the jittered back-off prevents a
 *    thundering herd at the same millisecond.
 *  - The `auth` callback is async and refetches the session token on
 *    every reconnect so the handshake never carries a stale JWT.
 */
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { supabase, type AppUser } from '../core/supabase';
import { SOCKET_EVENTS, type LeaderboardEntry } from '../core/types';
import { loadSocketIO } from '../utils/lazyLoad';

export interface UseLiveChallengeSocketParams {
  user: AppUser | null;
  isLiveChallenge: boolean;
}

export interface UseLiveChallengeSocketApi {
  socket: Socket | null;
  socketConnected: boolean;
  leaderboard: Record<string, LeaderboardEntry>;
}

export function useLiveChallengeSocket(
  params: UseLiveChallengeSocketParams,
): UseLiveChallengeSocketApi {
  const { user, isLiveChallenge } = params;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry>>({});

  // Mirror the inputs so the one-shot `reconnect` handler (registered
  // exactly once during socket setup) always reads the latest user /
  // live-challenge state without re-registering on every change.
  const userRef = useRef(user);
  const isLiveChallengeRef = useRef(isLiveChallenge);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isLiveChallengeRef.current = isLiveChallenge; }, [isLiveChallenge]);

  useEffect(() => {
    let s: Socket | undefined;
    let cancelled = false;

    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? '';
    };

    const connectSocket = async () => {
      // Wait for a valid session before opening the socket.
      const token = await getToken();
      if (cancelled) return;
      if (!token) {
        // No session yet — listen for auth changes and retry.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
          if (cancelled) { subscription.unsubscribe(); return; }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            subscription.unsubscribe();
            connectSocket();
          }
        });
        return;
      }

      const socketIO = await loadSocketIO();
      const io = socketIO.default || socketIO;

      const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
      const sock = io(socketUrl || '/', {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        randomizationFactor: 0.5,
        // WebSocket-only — engine.io polling needs sticky sessions, and our
        // Cloudflare Worker → Fly.io edge has no sticky routing. Once
        // multiple Fly machines wake (or the single machine cold-restarts
        // after auto_stop) the polling sid → owner mapping breaks and every
        // poll returns 400. A WebSocket pins the TCP socket to one VM for
        // its lifetime, so the sticky-session problem cannot occur.
        transports: ['websocket'],
        // Async callback ensures a fresh token is fetched on every reconnect.
        auth: (cb: (data: { token: string }) => void) => {
          getToken().then(t => cb({ token: t }));
        },
      }) as Socket;
      s = sock;

      setSocket(sock);

      sock.on('connect', () => {
        setSocketConnected(true);
      });
      sock.on('disconnect', () => {
        setSocketConnected(false);
      });
      sock.on('reconnect', () => {
        setSocketConnected(true);
        const currentUser = userRef.current;
        // Allow students to rejoin live challenge on reconnect.
        // Token is provided via the socket auth callback above, not in the payload.
        if (currentUser?.classCode && isLiveChallengeRef.current) {
          if (currentUser.role === 'student') {
            sock.emit('join-challenge', {
              classCode: currentUser.classCode,
              name: currentUser.displayName,
              uid: currentUser.uid,
            });
          }
        }
      });
      sock.on('connect_error', (err: { message?: string }) => {
        // The default-namespace socket requires a Supabase JWT and the
        // server rejects connections with empty/invalid tokens.  During
        // brief auth-state transitions (token refresh, signed-out
        // student returning to the dashboard, Quick Play guest who has
        // no Supabase session at all) the server emits
        // "Authentication required" / "Invalid token" — expected and
        // harmless because the socket auto-retries with the next valid
        // token from the auth callback.  Surfacing them as
        // console.error spammed the DevTools tab and made real errors
        // hard to spot.  Demote the known-benign messages to
        // console.debug; leave anything else (network, CORS, server
        // crash) at console.error so it still shows up for triage.
        const benign = err.message === 'Authentication required'
          || err.message === 'Invalid token';
        if (benign) {
          console.debug('[Live] socket auth not ready — will retry:', err.message);
        } else {
          console.error('Socket connection error:', err.message);
        }
      });
      sock.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data: unknown) => {
        if (typeof data === 'object' && data !== null) {
          setLeaderboard(data as Record<string, LeaderboardEntry>);
        } else {
          setLeaderboard({});
        }
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (s) s.disconnect();
    };
  }, []);

  return { socket, socketConnected, leaderboard };
}
