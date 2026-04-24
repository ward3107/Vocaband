/**
 * useQuickPlaySocket — the client side of the v2 Quick Play protocol.
 *
 * One hook that serves both flows:
 *   - Student side: pick a nickname + avatar → joinAsStudent() → stream
 *     score updates, listen for kicked / sessionEnded events.
 *   - Teacher side: pass a Supabase access token → observeAsTeacher() →
 *     same leaderboard stream plus kick / end authority.
 *
 * Why one hook: student and teacher both want the same leaderboard, the
 * same connection lifecycle, and the same reconnect semantics. Splitting
 * into two hooks would mean two sockets on the teacher's device whenever
 * a teacher also pretends to be a student for testing (which the team
 * does all the time).
 *
 * Reconnection:
 *   - socket.io's built-in reconnection is enabled (infinite attempts
 *     with jitter, matching the existing Live-Challenge socket).
 *   - The hook caches the last successful join payload so that on
 *     reconnect the caller can opt to re-emit the join without the
 *     student having to retype their name.
 *   - clientId is persisted in localStorage so a full page refresh
 *     lands the same identity back on the leaderboard.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { loadSocketIO } from "../utils/lazyLoad";
import {
  QUICK_PLAY_NS,
  QP_EVENTS,
  QP_SERVER_EVENTS,
  type QpStudentEntry,
  type QpJoinedPayload,
  type QpLeaderboardPayload,
  type QpKickedPayload,
  type QpSessionEndedPayload,
  type QpErrorPayload,
  type QpErrorCode,
} from "../core/quickPlayProtocol";

const CLIENT_ID_STORAGE_KEY = "vocaband_qp_client_id";

// Generate a UUID that works on every browser we support (some older
// mobile Safari builds lack crypto.randomUUID).
function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
      return existing;
    }
    const fresh = generateUuid();
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode / disabled storage — fall back to an in-memory UUID
    // for the life of the tab.
    return generateUuid();
  }
}

export type QuickPlaySocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface QuickPlaySocketOptions {
  /** Current Quick Play session code. When undefined / empty, the hook
   *  stays idle and does not open a connection. */
  sessionCode: string | undefined | null;
  /** When false, the hook tears down any existing connection. Useful so
   *  consumers can gate the hook behind a feature flag or a view check
   *  without having to unmount the component that calls it. */
  enabled?: boolean;
}

export interface QuickPlaySocketApi {
  status: QuickPlaySocketStatus;
  /** Persistent per-browser UUID. Lives across sessions, refreshes,
   *  and reconnects. Same kid = same id. */
  clientId: string;
  /** Live leaderboard snapshot for the session. Empty array until the
   *  first LEADERBOARD broadcast arrives. */
  leaderboard: QpStudentEntry[];
  /** Last protocol-level error the server emitted to us (or null). */
  lastError: { code: QpErrorCode; message: string; event: string } | null;

  // ─── Student actions ────────────────────────────────────────────────
  joinAsStudent: (nickname: string, avatar?: string) => void;
  updateScore: (score: number) => void;
  leaveAsStudent: () => void;

  // ─── Teacher actions ────────────────────────────────────────────────
  /** Starts observing. Token = Supabase access token (verified server-side). */
  observeAsTeacher: (token: string) => void;
  kickStudent: (clientId: string, token: string) => void;
  endSession: (token: string) => void;

  // ─── Events ─────────────────────────────────────────────────────────
  /** Fires once when the server signals "you were kicked". Replaces
   *  itself if called multiple times (no accumulation). Return cleanup. */
  onKicked: (cb: (p: QpKickedPayload) => void) => () => void;
  /** Fires when the teacher ends the session (sent to everyone in the
   *  room, including the teacher themselves). */
  onSessionEnded: (cb: (p: QpSessionEndedPayload) => void) => () => void;
}

/**
 * Shared socket instance cache — socket.io has its own multiplexing per
 * namespace, but we keep one reference per (url, namespace) so a
 * component re-rendering doesn't churn connections.
 */
let cachedSocket: Socket | null = null;
let cachedSocketUrl: string | null = null;

async function getSocket(): Promise<Socket> {
  const url = (import.meta.env.VITE_SOCKET_URL as string | undefined) || "/";

  if (cachedSocket && cachedSocketUrl === url && cachedSocket.connected) {
    return cachedSocket;
  }
  if (cachedSocket && cachedSocketUrl === url) {
    // Exists but disconnected — reuse, socket.io will reconnect.
    cachedSocket.connect();
    return cachedSocket;
  }

  // New (or URL changed) — lazy-load and wire fresh.
  const mod = await loadSocketIO();
  const io = mod.default || mod;

  const socket = io(url + QUICK_PLAY_NS, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
    transports: ["websocket", "polling"],
  }) as Socket;

  cachedSocket = socket;
  cachedSocketUrl = url;
  return socket;
}

export function useQuickPlaySocket(opts: QuickPlaySocketOptions): QuickPlaySocketApi {
  const { sessionCode, enabled = true } = opts;
  const shouldConnect = !!sessionCode && enabled;

  const [status, setStatus] = useState<QuickPlaySocketStatus>("idle");
  const [leaderboard, setLeaderboard] = useState<QpStudentEntry[]>([]);
  const [lastError, setLastError] = useState<QuickPlaySocketApi["lastError"]>(null);

  const socketRef = useRef<Socket | null>(null);
  const clientId = useMemo(() => getOrCreateClientId(), []);

  // Callback refs for one-shot events — set via the `on*` helpers.
  const kickedRef = useRef<((p: QpKickedPayload) => void) | null>(null);
  const sessionEndedRef = useRef<((p: QpSessionEndedPayload) => void) | null>(null);

  // Last known student-side join payload — replayed on reconnect so a
  // dropped connection doesn't kick the kid off the board.
  const lastJoinRef = useRef<{ nickname: string; avatar: string } | null>(null);

  // Connect / tear down when the gating inputs change.
  useEffect(() => {
    if (!shouldConnect) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("connecting");

    getSocket().then(socket => {
      if (cancelled) return;
      socketRef.current = socket;

      const onConnect = () => {
        setStatus("connected");
        // If we had a pending student join when the socket dropped, replay it.
        if (lastJoinRef.current && sessionCode) {
          socket.emit(QP_EVENTS.STUDENT_JOIN, {
            sessionCode,
            clientId,
            nickname: lastJoinRef.current.nickname,
            avatar: lastJoinRef.current.avatar,
          });
        }
      };
      const onDisconnect = () => setStatus("disconnected");
      const onConnectError = () => setStatus("error");

      const onJoined = (p: QpJoinedPayload) => {
        if (p?.leaderboard) setLeaderboard(p.leaderboard);
      };
      const onLeaderboard = (p: QpLeaderboardPayload) => {
        if (p?.students && p.sessionCode === sessionCode) {
          setLeaderboard(p.students);
        }
      };
      const onKicked = (p: QpKickedPayload) => {
        kickedRef.current?.(p);
      };
      const onSessionEnded = (p: QpSessionEndedPayload) => {
        sessionEndedRef.current?.(p);
      };
      const onErr = (p: QpErrorPayload) => {
        setLastError({ code: p.code, message: p.message, event: p.event });
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("connect_error", onConnectError);
      socket.on(QP_SERVER_EVENTS.JOINED,        onJoined);
      socket.on(QP_SERVER_EVENTS.LEADERBOARD,   onLeaderboard);
      socket.on(QP_SERVER_EVENTS.KICKED,        onKicked);
      socket.on(QP_SERVER_EVENTS.SESSION_ENDED, onSessionEnded);
      socket.on(QP_SERVER_EVENTS.ERROR,         onErr);

      if (socket.connected) onConnect();

      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);
        socket.off(QP_SERVER_EVENTS.JOINED,        onJoined);
        socket.off(QP_SERVER_EVENTS.LEADERBOARD,   onLeaderboard);
        socket.off(QP_SERVER_EVENTS.KICKED,        onKicked);
        socket.off(QP_SERVER_EVENTS.SESSION_ENDED, onSessionEnded);
        socket.off(QP_SERVER_EVENTS.ERROR,         onErr);
      };
    });

    return () => { cancelled = true; };
  }, [shouldConnect, sessionCode, clientId]);

  // ─── Imperative actions ────────────────────────────────────────────

  const joinAsStudent = useCallback((nickname: string, avatar: string = "🦊") => {
    if (!sessionCode || !socketRef.current) return;
    lastJoinRef.current = { nickname, avatar };
    socketRef.current.emit(QP_EVENTS.STUDENT_JOIN, {
      sessionCode, clientId, nickname, avatar,
    });
  }, [sessionCode, clientId]);

  const updateScore = useCallback((score: number) => {
    if (!sessionCode || !socketRef.current) return;
    socketRef.current.emit(QP_EVENTS.SCORE_UPDATE, {
      sessionCode, clientId, score,
    });
  }, [sessionCode, clientId]);

  const leaveAsStudent = useCallback(() => {
    if (!sessionCode || !socketRef.current) return;
    socketRef.current.emit(QP_EVENTS.STUDENT_LEAVE, { sessionCode, clientId });
    lastJoinRef.current = null;
  }, [sessionCode, clientId]);

  const observeAsTeacher = useCallback((token: string) => {
    if (!sessionCode || !socketRef.current) return;
    socketRef.current.emit(QP_EVENTS.TEACHER_OBSERVE, { sessionCode, token });
  }, [sessionCode]);

  const kickStudent = useCallback((targetClientId: string, token: string) => {
    if (!sessionCode || !socketRef.current) return;
    socketRef.current.emit(QP_EVENTS.TEACHER_KICK, {
      sessionCode, clientId: targetClientId, token,
    });
  }, [sessionCode]);

  const endSession = useCallback((token: string) => {
    if (!sessionCode || !socketRef.current) return;
    socketRef.current.emit(QP_EVENTS.TEACHER_END, { sessionCode, token });
  }, [sessionCode]);

  const onKicked = useCallback((cb: (p: QpKickedPayload) => void) => {
    kickedRef.current = cb;
    return () => { kickedRef.current = null; };
  }, []);

  const onSessionEnded = useCallback((cb: (p: QpSessionEndedPayload) => void) => {
    sessionEndedRef.current = cb;
    return () => { sessionEndedRef.current = null; };
  }, []);

  return {
    status,
    clientId,
    leaderboard,
    lastError,
    joinAsStudent,
    updateScore,
    leaveAsStudent,
    observeAsTeacher,
    kickStudent,
    endSession,
    onKicked,
    onSessionEnded,
  };
}
