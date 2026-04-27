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
import { useCallback, useEffect, useRef, useState } from "react";
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
const CLIENT_ID_NICK_STORAGE_KEY = "vocaband_qp_client_id_nickname";

// clientId persistence uses sessionStorage instead of localStorage.
// Reasoning: localStorage is shared across every tab of the same origin,
// so two students on the same device (shared phone, sibling at home,
// classroom Chromebook) — or a teacher opening multiple "test" tabs —
// would all read back the same cached clientId, the server's
// `state.students.set(clientId, …)` would collapse them into one row,
// and the teacher's podium would silently show "one student" no matter
// how many tabs joined.  sessionStorage is per-tab: same tab keeps the
// id across refreshes (so reconnect/replay still works), but a fresh
// tab gets a fresh id and joins as its own row.  A real student playing
// on one device sees no behaviour change.

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

function readStoredClientId(): string | null {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
      return existing;
    }
  } catch { /* private mode etc. */ }
  return null;
}

function writeStoredClientId(id: string, nickname: string | null) {
  try {
    sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
    if (nickname) sessionStorage.setItem(CLIENT_ID_NICK_STORAGE_KEY, nickname.toLowerCase());
  } catch { /* fall through — in-memory still works for the tab */ }
}

function getOrCreateClientId(): string {
  const existing = readStoredClientId();
  if (existing) return existing;
  const fresh = generateUuid();
  writeStoredClientId(fresh, null);
  return fresh;
}

/** Returns the clientId to use for THIS join attempt.  If a previous
 *  student on the same browser/device cached a clientId tied to a
 *  different nickname (shared phone, sibling at home, classroom
 *  Chromebook), generate a fresh UUID so the server-side leaderboard
 *  entry doesn't get overwritten — the JOIN handler does
 *  `state.students.set(clientId, …)`, so identical clientIds across
 *  different students collapse into one row.  Same nickname keeps the
 *  previous id (refresh / reconnect should not zero the score). */
function clientIdForJoin(nickname: string): string {
  let lastNick: string | null = null;
  // Read lastNick from sessionStorage (per-tab) to match where
  // writeStoredClientId persists it.  Reading from localStorage here
  // (the previous behaviour) meant a fresh tab's sessionStorage value
  // didn't pair with the localStorage name, so the cached-id path
  // never short-circuited and we burned a fresh UUID on every join.
  try { lastNick = sessionStorage.getItem(CLIENT_ID_NICK_STORAGE_KEY); } catch { /* ignore */ }
  const cached = readStoredClientId();
  const norm = nickname.trim().toLowerCase();
  if (cached && lastNick === norm) return cached;
  const fresh = generateUuid();
  writeStoredClientId(fresh, nickname);
  return fresh;
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
  /** Session code we've been confirmed in via the server's JOINED reply,
   *  or null if we haven't joined (or were kicked / session ended).
   *  Useful for gating UI advance until the server actually accepts the
   *  join — without it, optimistic UIs render game state while the
   *  server is silently rejecting (e.g. nickname_taken) and scoring
   *  appears broken. */
  joinedSessionCode: string | null;

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
  // VITE_SOCKET_URL is "" in production (post-Render→Fly migration) so
  // socket.io connects to the same origin (vocaband.com) and the
  // Cloudflare Worker proxies /socket.io/* through to Fly.  When url
  // is "" or "/", we MUST pass just the namespace (e.g. "/quick-play")
  // — concatenating "/" + "/quick-play" yields "//quick-play" which
  // the browser interprets as a protocol-relative URL with "quick-play"
  // as the hostname → ERR_NAME_NOT_RESOLVED.
  const rawUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? "";
  const url = rawUrl && rawUrl !== "/" ? rawUrl : "";
  const target = url ? url + QUICK_PLAY_NS : QUICK_PLAY_NS;

  if (cachedSocket && cachedSocketUrl === target && cachedSocket.connected) {
    return cachedSocket;
  }
  if (cachedSocket && cachedSocketUrl === target) {
    // Exists but disconnected — reuse, socket.io will reconnect.
    cachedSocket.connect();
    return cachedSocket;
  }

  // New (or URL changed) — lazy-load and wire fresh.
  const mod = await loadSocketIO();
  const io = mod.default || mod;

  const socket = io(target, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
    // polling first so iOS Safari 15 + corporate proxies that fail the
    // WebSocket upgrade don't get stuck — socket.io upgrades to WS
    // automatically once polling is established.
    transports: ["polling", "websocket"],
  }) as Socket;

  cachedSocket = socket;
  cachedSocketUrl = target;
  return socket;
}

export function useQuickPlaySocket(opts: QuickPlaySocketOptions): QuickPlaySocketApi {
  const { sessionCode, enabled = true } = opts;
  const shouldConnect = !!sessionCode && enabled;

  const [status, setStatus] = useState<QuickPlaySocketStatus>("idle");
  const [leaderboard, setLeaderboard] = useState<QpStudentEntry[]>([]);
  const [lastError, setLastError] = useState<QuickPlaySocketApi["lastError"]>(null);
  const [joinedSessionCode, setJoinedSessionCode] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  // clientId starts as whatever's cached (or a fresh UUID if nothing is).
  // It's MUTABLE — `joinAsStudent` may swap it out when a different
  // student joins on the same device, to avoid clobbering the previous
  // student's leaderboard entry server-side.
  const [clientId, setClientId] = useState<string>(() => getOrCreateClientId());

  // Mirror of `clientId` in a ref so emitters always read the LATEST id
  // even when their useCallback closure was built one render earlier.
  // Without this, a SCORE_UPDATE that fires in the same render as
  // joinAsStudent's setClientId(...) sends the stale id, the server logs
  // [QP SCORE owner-mismatch] and DROPS the score — student shows 0 pts
  // on the teacher's podium. See server.ts:872 + commit abe8970.
  const clientIdRef = useRef(clientId);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);

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

      const onConnect = async () => {
        setStatus("connected");
        // If we had a pending student join when the socket dropped, replay it.
        if (lastJoinRef.current && sessionCode) {
          // Refetch the auth uid each reconnect — anon sessions can
          // get refreshed during the gap.  Falls through silently if
          // it can't (older clients / private mode).
          let authUid: string | undefined;
          try {
            const { supabase: sb } = await import("../core/supabase");
            const { data: { session: s } } = await sb.auth.getSession();
            authUid = s?.user?.id;
          } catch { /* best-effort */ }
          socket.emit(QP_EVENTS.STUDENT_JOIN, {
            sessionCode,
            clientId,
            nickname: lastJoinRef.current.nickname,
            avatar: lastJoinRef.current.avatar,
            authUid,
          });
        }
      };
      const onDisconnect = () => setStatus("disconnected");
      const onConnectError = () => setStatus("error");

      const onJoined = (p: QpJoinedPayload) => {
        if (p?.leaderboard) setLeaderboard(p.leaderboard);
        // Mark the session as confirmed-joined so the UI can advance.
        // Without this signal, optimistic UIs render game state while
        // the server is silently rejecting (nickname_taken etc.) and
        // scoring appears broken.
        if (sessionCode) setJoinedSessionCode(sessionCode);
      };
      const onLeaderboard = (p: QpLeaderboardPayload) => {
        if (p?.students && p.sessionCode === sessionCode) {
          setLeaderboard(p.students);
        }
      };
      const onKicked = (p: QpKickedPayload) => {
        // Once the server tells this client they've been kicked, drop
        // the cached lastJoin so socket.io's auto-reconnect doesn't
        // immediately replay STUDENT_JOIN and put the kicked student
        // straight back on the leaderboard.  Server now also blocks
        // re-joins from kicked clientIds (kickedClientIds set on the
        // session state), but belt-and-suspenders here keeps the UI
        // tab from oscillating between "kicked" and "rejoined" if the
        // server-side block ever drifts.
        lastJoinRef.current = null;
        setJoinedSessionCode(null);
        kickedRef.current?.(p);
      };
      const onSessionEnded = (p: QpSessionEndedPayload) => {
        setJoinedSessionCode(null);
        sessionEndedRef.current?.(p);
      };
      const onErr = (p: QpErrorPayload) => {
        setLastError({ code: p.code, message: p.message, event: p.event });
        // STUDENT_JOIN errors mean the server refused to add us to the
        // session — clear any prior joined-state so the UI knows we're
        // NOT in.  Errors on other events leave joinedSessionCode alone.
        if (p.event === QP_EVENTS.STUDENT_JOIN) setJoinedSessionCode(null);
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

  const joinAsStudent = useCallback(async (nickname: string, avatar: string = "🦊") => {
    if (!sessionCode || !socketRef.current) return;
    lastJoinRef.current = { nickname, avatar };
    // Pick a clientId scoped to this nickname.  If a different student
    // (shared phone / Chromebook / family iPad) is joining with a new
    // name, this returns a FRESH uuid so the server-side
    // `state.students.set(clientId, …)` doesn't overwrite the previous
    // student's entry — that was the "only one student is visible at a
    // time" report.  Same nickname returns the cached uuid so refresh
    // and reconnect keep the existing score.
    const idForThisJoin = clientIdForJoin(nickname);
    // Write the ref BEFORE the React state update so any score emit
    // that fires in this same tick (or before the next render) reads
    // the fresh id — never the previous student's cached value.
    clientIdRef.current = idForThisJoin;
    if (idForThisJoin !== clientId) setClientId(idForThisJoin);

    // Include the Supabase auth uid so the server can persist a real
    // progress row on TEACHER_END.  Optional — older server builds
    // simply ignore the field and the leaderboard still works in
    // memory; newer ones use it to write the post-session gradebook
    // entry that V2 was previously dropping on the floor.
    const { supabase } = await import("../core/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    const authUid = session?.user?.id;
    socketRef.current.emit(QP_EVENTS.STUDENT_JOIN, {
      sessionCode, clientId: idForThisJoin, nickname, avatar, authUid,
    });
  }, [sessionCode, clientId]);

  const updateScore = useCallback((score: number) => {
    if (!sessionCode || !socketRef.current) {
      console.warn('[QP updateScore] bail', {
        score,
        hasSessionCode: !!sessionCode,
        hasSocketRef: !!socketRef.current,
      });
      return;
    }
    // Read the clientId from sessionStorage (the source of truth) every
    // time, NOT from this hook instance's clientIdRef.  The app calls
    // useQuickPlaySocket() in two places — App.tsx and
    // QuickPlayStudentView.tsx — so there are two ref copies.  When the
    // student joins via QuickPlayStudentView's hook instance,
    // clientIdForJoin() updates sessionStorage AND that instance's ref,
    // but App.tsx's instance still holds the stale pre-join id.  When
    // scores are then emitted through App.tsx's hook (which is the path
    // emitScoreUpdate uses), the stale id reaches the server and the
    // socket-owns-vs-claimed check rejects every update.  Reading from
    // sessionStorage here closes the gap — both instances see the same
    // current value because there's only one tab-scoped storage.
    const id = readStoredClientId() ?? clientIdRef.current;
    console.log('[QP updateScore] emit', { sessionCode, clientId: id, score });
    socketRef.current.emit(QP_EVENTS.SCORE_UPDATE, {
      sessionCode, clientId: id, score,
    });
  }, [sessionCode]);

  const leaveAsStudent = useCallback(() => {
    if (!sessionCode || !socketRef.current) return;
    socketRef.current.emit(QP_EVENTS.STUDENT_LEAVE, {
      sessionCode, clientId: clientIdRef.current,
    });
    lastJoinRef.current = null;
  }, [sessionCode]);

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
    joinedSessionCode,
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
