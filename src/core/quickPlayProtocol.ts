// ─────────────────────────────────────────────────────────────────────────
// Quick Play v2 protocol — the no-auth real-time contract.
//
// Shared between the browser client (useQuickPlaySocket) and the Node
// server (/quick-play namespace in server.ts). Keeping it in one file so
// the client and server can't drift out of shape silently — any mismatch
// becomes a TypeScript compile error.
//
// Design:
//   * Students join by session code + client-generated clientId + nickname.
//     No Supabase auth, no JWT, no anonymous user row. Just an opaque
//     browser-side UUID (persisted in localStorage so refresh = rejoin).
//   * Teachers observe via the same namespace, authenticated by their
//     own Supabase session token — validated server-side before they're
//     allowed to kick / end.
//   * Scoring state is in-memory on the server, broadcast to the
//     session's room. If the server restarts mid-class, live state
//     resets; the teacher's session record in quick_play_sessions stays
//     because that's the source of truth for "what words / modes".
//
// Every event name is string-typed here so both sides use the same
// literal and there's zero ad-hoc stringly typing anywhere else.
// ─────────────────────────────────────────────────────────────────────────

// ─── Namespace ──────────────────────────────────────────────────────────
/**
 * Dedicated socket.io namespace — kept separate from `/` so the
 * authenticated live-challenge path (which requires a JWT) never has to
 * reason about guest connections, and vice-versa.
 */
export const QUICK_PLAY_NS = "/quick-play";

// ─── Event names ────────────────────────────────────────────────────────
/** Client → server events. */
export const QP_EVENTS = {
  // A student joining the session's leaderboard.
  STUDENT_JOIN:   "qp:student:join",
  // A student updating their current game score.
  SCORE_UPDATE:   "qp:score:update",
  // A student tapping an emoji reaction in their game UI. Tier C —
  // broadcast to the session room so the teacher's monitor can render
  // a particle floating up from the projector.
  REACTION_SEND:  "qp:reaction:send",
  // A student explicitly leaving (tab close triggers disconnect, this
  // is for "Return to home" button which wants an immediate removal).
  STUDENT_LEAVE:  "qp:student:leave",

  // A teacher subscribing to the session's live state.
  TEACHER_OBSERVE: "qp:teacher:observe",
  // A teacher removing a specific student by clientId.
  TEACHER_KICK:    "qp:teacher:kick",
  // A teacher giving a manual bonus (e.g., "+5 for great answer") to
  // a specific student. Server-authoritative — bypasses the student
  // score-delta cap because the teacher is trusted.
  TEACHER_BONUS:   "qp:teacher:bonus",
  // A teacher ending the session — everyone in the room gets notified.
  TEACHER_END:     "qp:teacher:end",
} as const;

/** Server → client events. */
export const QP_SERVER_EVENTS = {
  // Successful join ack (sent only to the joining socket).
  JOINED:          "qp:joined",
  // Periodic / throttled leaderboard snapshot to everyone in the room.
  LEADERBOARD:     "qp:leaderboard",
  // Sent to one socket: "you were kicked by the teacher".
  KICKED:          "qp:kicked",
  // Sent to everyone: teacher ended the session.
  SESSION_ENDED:   "qp:session:ended",
  // Tier C: broadcast a single emoji reaction to everyone in the room.
  // Fire-and-forget — server holds no state for these, it just relays.
  REACTION:        "qp:reaction",
  // Error signal (rate limit, bad payload, session not found, etc.).
  ERROR:           "qp:error",
} as const;

// ─── Client → server payloads ───────────────────────────────────────────

export interface QpStudentJoinPayload {
  /** 6-char code from quick_play_sessions.session_code (A-Z, 2-9). */
  sessionCode: string;
  /** Browser-generated UUID, persisted in localStorage so refresh and
   *  reconnection land the same identity back on the leaderboard. */
  clientId: string;
  /** Display name the student typed. Trimmed client-side; server
   *  trims + length-caps again defensively. */
  nickname: string;
  /** Emoji chosen on the join screen. Falls back to the fox on the
   *  server if omitted. */
  avatar?: string;
  /** Supabase auth user id (anon or real).  Optional — older clients
   *  skip this — but when present the server stamps it onto the
   *  in-memory leaderboard row so TEACHER_END can persist a real
   *  progress row at session end (without it the leaderboard data
   *  vanishes when the in-memory state is torn down, which is what
   *  V2 teachers reported as "I ended the session and nothing landed
   *  in the database"). */
  authUid?: string;
}

export interface QpScoreUpdatePayload {
  sessionCode: string;
  clientId: string;
  /** Current running score for the game the student is playing. Server
   *  validates it can only increase (and by a bounded delta) to guard
   *  against a pasted 999 999. */
  score: number;
  /** Tier B: live signals so the teacher monitor can show streak fire +
   *  per-round progress bars without polling. Both optional so older
   *  clients (or the live-challenge path that funnels through here)
   *  still work — the server treats missing fields as "no update."
   *
   *  streak        — consecutive correct answers since the last miss in
   *                  the current game mode. Resets on a wrong answer
   *                  and on mode start.
   *  roundProgress — words attempted / total in the current mode. Used
   *                  to draw the under-name progress bar.
   *  perfectRound  — one-shot flag set by the mode-finish emit when the
   *                  student completed the round without a single
   *                  mistake. Server forwards it on the next leaderboard
   *                  broadcast and then clears it so the monitor only
   *                  fires the toast once per perfect round. */
  streak?: number;
  roundProgress?: { done: number; total: number };
  perfectRound?: boolean;
}

export interface QpStudentLeavePayload {
  sessionCode: string;
  clientId: string;
}

/**
 * Tier C — student emoji reaction. Allow-listed set of positive
 * emojis only; anything outside QP_REACTION_EMOJIS gets dropped
 * server-side so a custom client can't spam arbitrary glyphs (or
 * worse, payload-as-text) onto the projector.
 */
export interface QpReactionSendPayload {
  sessionCode: string;
  clientId: string;
  emoji: string;
}

export interface QpTeacherObservePayload {
  sessionCode: string;
  /** Supabase session access token — verified server-side. The
   *  teacher must own the session row in quick_play_sessions. */
  token: string;
}

export interface QpTeacherKickPayload {
  sessionCode: string;
  clientId: string;
  token: string;
}

/**
 * Teacher-issued manual bonus points — for the "good answer!"
 * recognition lever during play. amount is bounded server-side
 * (QP_MAX_BONUS_AMOUNT) to keep accidental long-press spam from
 * skewing the leaderboard.
 */
export interface QpTeacherBonusPayload {
  sessionCode: string;
  clientId: string;
  amount: number;
  token: string;
}

export interface QpTeacherEndPayload {
  sessionCode: string;
  token: string;
}

// ─── Server → client payloads ───────────────────────────────────────────

export interface QpStudentEntry {
  clientId: string;
  nickname: string;
  avatar: string;
  score: number;
  /** Epoch ms of the last message from this client. Useful for the
   *  teacher UI to grey-out idle students without waiting for a
   *  disconnect event. */
  lastSeen: number;
  /** Tier B fields — see QpScoreUpdatePayload. Re-broadcast verbatim so
   *  the teacher monitor can render flames + progress bars + achievement
   *  toasts from the leaderboard snapshot alone. */
  streak?: number;
  roundProgress?: { done: number; total: number };
  /** True for exactly one leaderboard tick — set when the last score
   *  update was a mode-finish with zero mistakes, cleared by the server
   *  immediately after the next broadcast. */
  perfectRound?: boolean;
  /** Supabase auth user id when known.  Server-private — never
   *  broadcast back to other clients (the LEADERBOARD payload omits
   *  it).  Used only for the persist-on-end progress writes. */
  authUid?: string;
}

export interface QpJoinedPayload {
  /** Echoes back the clientId the caller asked to register — lets the
   *  client confirm the server accepted the payload without having to
   *  diff the leaderboard. */
  clientId: string;
  leaderboard: QpStudentEntry[];
}

export interface QpLeaderboardPayload {
  sessionCode: string;
  students: QpStudentEntry[];
}

export interface QpKickedPayload {
  sessionCode: string;
  /** Optional human-readable reason. Shown to the kicked student in a
   *  toast / card. */
  reason?: string;
}

export interface QpSessionEndedPayload {
  sessionCode: string;
}

/**
 * Server → room broadcast of a single emoji reaction. The server adds
 * the nickname so the teacher monitor can show "Ahmed sent a 🔥" if it
 * wants to, and a serverTs so receivers can dedupe / order if a burst
 * arrives within the same frame.
 */
export interface QpReactionPayload {
  sessionCode: string;
  clientId: string;
  nickname: string;
  emoji: string;
  serverTs: number;
}

/** Error codes the server emits. Client maps to friendly copy. */
export type QpErrorCode =
  | "invalid_payload"
  | "rate_limited"
  | "session_not_found"
  | "session_inactive"
  | "session_full"
  | "nickname_taken"
  | "unauthorized"
  | "internal_error"
  // Sticky for the lifetime of an in-memory session: the teacher
  // kicked this clientId, so reject any subsequent STUDENT_JOIN
  // even if the client auto-reconnects.
  | "kicked";

export interface QpErrorPayload {
  event: string;
  code: QpErrorCode;
  message: string;
}

// ─── Shared constants ───────────────────────────────────────────────────

/**
 * Max students allowed to concurrently join one Quick Play session.
 * Generous enough for a full class; keeps the in-memory state bounded.
 */
export const QP_MAX_STUDENTS_PER_SESSION = 60;

/**
 * Max length of a nickname after server-side trim. Matches the `name`
 * column limits in other parts of the app so Quick Play and Classroom
 * nicknames look consistent.
 */
export const QP_MAX_NICKNAME = 30;

/**
 * Max single-update score delta.  Any `SCORE_UPDATE` that jumps by
 * more than this from the previous value is rejected.
 *
 * Tuned twice on 2026-04-25:
 *   * Original 100 dropped every legitimate mode-finish emit, leaving
 *     the live leaderboard stuck at 0.
 *   * Bumped to 5_000 to unstick that — but a teacher reporting a
 *     900→3000 jump (a 2_100 delta) on two answers flagged it as
 *     too generous.  A genuine paste-bomb would hit thousands too.
 *
 * Realistic per-emit upper bound:
 *   * Per-answer score is +10 / +15 / +20 across modes (see
 *     useGameModeActions).
 *   * 2× XP booster doubles that to ~40 per question.
 *   * 10 questions × 40 = 400 max per mode finish under booster.
 *   * The client emits every ≥ 2 s OR on isFinished, so the worst-case
 *     single emit is roughly one full mode's accumulated score.
 *
 * 1_500 leaves a comfortable 3× headroom over the realistic ceiling
 * for booster + streak interactions we haven't thought of, while
 * still rejecting an obvious paste-9999 attempt.  QP_MAX_SESSION_SCORE
 * (100k absolute total) is the secondary safety net.
 */
export const QP_MAX_SCORE_DELTA = 1_500;

/**
 * Max absolute score in a single session (caps pathological cases).
 */
export const QP_MAX_SESSION_SCORE = 100_000;

/**
 * Tier B clamps. Both fields are optional in QpScoreUpdatePayload so a
 * malformed value just makes the server drop the field rather than reject
 * the whole emit — kids keep scoring even if their client ships nonsense.
 */
export const QP_MAX_STREAK = 100;          // Realistic ceiling — modes top out around 20 questions
export const QP_MAX_ROUND_TOTAL = 200;     // Custom assignments can be long; 200 is plenty

/**
 * Tier C — allow-listed reactions. Positive set only so the projector
 * doesn't surface anything a teacher would have to moderate mid-class.
 * Order here is the order they appear in the student's reaction bar.
 */
export const QP_REACTION_EMOJIS = ["👏", "🔥", "⭐", "❤️", "😂", "👍"] as const;
export type QpReactionEmoji = typeof QP_REACTION_EMOJIS[number];

/**
 * Per-student rate limit on reaction sends — minimum gap (ms) between
 * accepted reactions from the same clientId. A burst inside this window
 * is silently dropped rather than rejected with an error, so a tap-happy
 * kid doesn't see error toasts.
 */
export const QP_REACTION_MIN_INTERVAL_MS = 750;

/**
 * Tier-B-ish: teacher manual bonus. Max per single bonus emit so a
 * stuck-key or runaway client can't write 9999. Real teachers will
 * grant +5 / +10; we allow up to 50 for the rare "wow, that was
 * incredible" case.
 */
export const QP_MAX_BONUS_AMOUNT = 50;

export function isValidReactionEmoji(v: unknown): v is QpReactionEmoji {
  return typeof v === "string" && (QP_REACTION_EMOJIS as readonly string[]).includes(v);
}


/**
 * Throttle window (ms) between leaderboard broadcasts per session.
 * Matches the existing live-challenge broadcaster.
 */
export const QP_BROADCAST_INTERVAL_MS = 1500;

/**
 * Idle sweep: a session with no teacher connection for this long gets
 * cleaned up server-side, so a teacher who closes the laptop mid-class
 * doesn't leave orphaned in-memory state hanging around forever.
 */
export const QP_IDLE_SWEEP_MS = 10 * 60 * 1000;  // 10 minutes

// ─── Validators (server + client safe, no Node deps) ────────────────────

/** Session code: exactly 6 chars from the curated alphabet (no ambiguous
 *  I / O / 0 / 1). Mirrors the DB `generate_session_code()` function. */
export function isValidSessionCode(v: unknown): v is string {
  return typeof v === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(v);
}

/** Client IDs are UUIDs (v4-ish — we don't enforce version bits). */
export function isValidClientId(v: unknown): v is string {
  return typeof v === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Nickname: 1-30 chars, no control characters, no bidirectional
 *  formatting overrides. Whitespace is allowed inside but the caller
 *  should trim before sending.
 *
 *  The bidi block (U+202A-U+202E and U+2066-U+2069) is rejected because
 *  a single U+202E (RIGHT-TO-LEFT OVERRIDE) in a nickname flips the
 *  display order of every character that follows it, so a student can
 *  type "Alice" + U+202E + "evil" and have "evilecilA" appear on the
 *  classroom projector while the server-side string still looks
 *  innocuous. Same vector that defeated a thousand filename-spoof
 *  defenses. Strip rather than escape — there's no legitimate reason
 *  for a kid's display name to need a bidi override mark. */
export function isValidNickname(v: unknown): v is string {
  return typeof v === "string"
    && v.length >= 1
    && v.length <= QP_MAX_NICKNAME
    && !/[\x00-\x1f]/.test(v)
    && !/[\u202A-\u202E\u2066-\u2069]/.test(v);
}
