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
  // A teacher toggling Red vs Blue team mode on/off for the session.
  // When enabled the server stamps each student a balanced team; off
  // clears them. In-memory only (like round config — never persisted).
  TEACHER_TEAM_MODE: "qp:teacher:teammode",
  // A student switching their team (the hybrid "Switch team" button).
  // Honoured only when the move keeps the two teams balanced (±1).
  TEAM_SWITCH:     "qp:student:team:switch",

  // ─── Category Race (synchronized live round) ──────────────────────
  // A teacher starting a round: the server rolls ONE letter for the
  // whole room with a shared deadline, then broadcasts RACE_ROUND.
  RACE_START:      "qp:teacher:race:start",
  // A student submitting their per-category answers for the active
  // round. Scored server-side against the answer bank — students send
  // text, never a number, so a client can't claim arbitrary points.
  RACE_SUBMIT:     "qp:student:race:submit",
  // A teacher ending the active round early (before the deadline / for
  // untimed rounds). Server closes the round and broadcasts RACE_ENDED.
  RACE_END_ROUND:  "qp:teacher:race:end-round",

  // ─── Speed Round (Kahoot-style synchronized buzzer) ───────────────
  // A teacher starting a Speed Round word: the question is BUILT on the
  // teacher's screen (prompt + options + correctIndex) because the
  // server has no vocabulary; the server stores correctIndex PRIVATELY
  // and broadcasts only the options. See docs/speed-round-design.md §3.
  SPEED_START:     "qp:teacher:speed:start",
  // A student tapping an option for the active word. They send the
  // INDEX they tapped (never text), so a tampered client can't claim
  // arbitrary points — it would have to guess the correct index.
  SPEED_SUBMIT:    "qp:student:speed:submit",
  // A teacher ending the active word early. Server closes the word and
  // broadcasts SPEED_ENDED (revealing the correct option + winner).
  SPEED_END_ROUND: "qp:teacher:speed:end-round",

  // ─── Word Hunt Arena (real-time multiplayer movement) ─────────────
  // A teacher starting the arena. The host pre-authors EVERY word's
  // question (buildSpeedQuestion in a loop) and ships the whole batch
  // here; the server stores each correctIndex PRIVATELY and grants
  // grabs instantly from memory — no host round-trip in the latency-
  // critical grab moment. See docs/word-hunt-arena-design.md §2.
  ARENA_START:     "qp:teacher:arena:start",
  // A student moving their avatar. Client-authoritative + rate-limited:
  // position cheating is low-harm because you still must answer the
  // word's question correctly to score. NEVER broadcast per-move — the
  // server batches positions into the ARENA_SNAPSHOT tick.
  ARENA_MOVE:      "qp:student:arena:move",
  // A student touching a word token. The server is the referee: first
  // grab to reach the owning VM locks the word (single-threaded event
  // loop ⇒ no double-grab race), range-checked against the server's
  // last-known position for that student.
  ARENA_GRAB:      "qp:student:arena:grab",
  // A teacher ending the arena round (back to the lobby).
  ARENA_END:       "qp:teacher:arena:end",
  // A student touching a scattered game element (Speed Boost, Bonus Star,
  // Double Points, or Hurricane). Same referee discipline as ARENA_GRAB: the
  // owning VM range-checks against its last-known position (payload x/y
  // fallback for cross-VM) and is the sole authority for the points/flag
  // effects, so a tampered client can't mint a star or stack double points.
  ARENA_PICKUP:    "qp:student:arena:pickup",
  // A dashing student colliding with another student (dash-tackle PvP). Only
  // honoured when rough mode is ON; the server range-checks the dasher against
  // the target and (in team mode) requires opposite teams. NEVER changes any
  // score — it only stuns the target. Same referee discipline as ARENA_PICKUP.
  ARENA_TACKLE:    "qp:student:arena:tackle",
  // A teacher toggling "rough mode" (dash-tackle PvP) on/off for the arena.
  // In-memory only, validated by the teacher token like TEACHER_TEAM_MODE.
  // Default OFF; students only see/use the Dash button while it's on.
  TEACHER_ROUGH_MODE: "qp:teacher:roughmode",

  // ─── VocabWheel (live, phone-answer mode) ─────────────────────────
  // A teacher pushing the current wheel question to the ONE student the
  // wheel landed on. The server relays it to that student's socket only;
  // the correct answer is NOT sent (the host scores the reply).
  WHEEL_ASK:       "qp:teacher:wheel:ask",
  // The picked student's chosen option index, relayed back to the
  // teacher's observer sockets so the host can score + drive the wheel.
  WHEEL_ANSWER:    "qp:student:wheel:answer",

  // ─── In-game 🆘 help button (mid-gameplay) ────────────────────────
  // A student tapping "🙋 Show my teacher" from the in-game help menu.
  // Server rate-limits (5/60s per student) and broadcasts to teacher only.
  STUDENT_RAISE_HAND: "qp:student:raise-hand",
  // A teacher acknowledging (clearing) a raised hand — either for a
  // specific student uid, or "all" to clear every raised hand at once.
  TEACHER_ACK_HELP:   "qp:teacher:ack-help",
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
  // Team mode turned on/off for the session. Just the on/off signal —
  // each student's actual team rides on their leaderboard entry, and the
  // host sums Red vs Blue from the (unioned) leaderboard itself.
  TEAM_MODE:       "qp:teammode",
  // Tier C: broadcast a single emoji reaction to everyone in the room.
  // Fire-and-forget — server holds no state for these, it just relays.
  REACTION:        "qp:reaction",
  // Error signal (rate limit, bad payload, session not found, etc.).
  ERROR:           "qp:error",

  // ─── Category Race (synchronized live round) ──────────────────────
  // A new round started — broadcast to the whole room with the letter,
  // active categories, and a shared deadline so every student's clock
  // counts down to the same instant.
  RACE_ROUND:      "qp:race:round",
  // The submitting student's per-cell scoring result (sent only to that
  // socket) so their focus card can show what scored.
  RACE_RESULT:     "qp:race:result",
  // The active round closed (deadline reached or teacher moved on) —
  // clients lock input and drop back to the lobby.
  RACE_ENDED:      "qp:race:ended",

  // ─── Speed Round (Kahoot-style synchronized buzzer) ───────────────
  // A new word started — broadcast to the whole room with the prompt +
  // answer options + shared deadline. NEVER carries correctIndex; the
  // server holds it privately so a tampered client can't read the
  // answer off the wire. See docs/speed-round-design.md §3.
  SPEED_ROUND:     "qp:speed:round",
  // The submitting student's per-word scoring (sent only to that socket):
  // correct/incorrect, points + speed bonus, "First!" flag, and the now-
  // safe-to-reveal correctIndex.
  SPEED_RESULT:    "qp:speed:result",
  // The active word closed (deadline reached or teacher moved on) — the
  // server reveals the correct option + the per-word winner.
  SPEED_ENDED:     "qp:speed:ended",

  // ─── Word Hunt Arena (real-time multiplayer movement) ──────────────
  // Full arena state — sent to the room on ARENA_START and to a socket
  // on (re)join so a refreshed student lands back on the live map.
  // Words are the PUBLIC shape only (never correctIndex).
  ARENA_STATE:        "qp:arena:state",
  // The 10/sec position tick — ONE compact room broadcast per tick
  // instead of a per-move relay, which is what keeps 30 moving students
  // inside the load-tested egress budget (design §3).
  ARENA_SNAPSHOT:     "qp:arena:snapshot",
  // One word's lifecycle change (locked / released / answered) — small
  // targeted patch so the room doesn't need a full ARENA_STATE re-send.
  ARENA_WORD:         "qp:arena:word",
  // Sent to the grabbing socket only: "you own this word — answer it."
  // Shaped like SPEED_ROUND (options, NO correctIndex) so the student
  // client reuses the Speed Round buzzer verbatim.
  ARENA_GRAB_GRANTED: "qp:arena:grab:granted",
  // Sent to the grabbing socket only: grab refused (someone beat you,
  // out of range, cooldown…). Client shows a small toast and plays on.
  ARENA_GRAB_DENIED:  "qp:arena:grab:denied",
  // The teacher closed the arena — clients drop to the podium.
  ARENA_ENDED:        "qp:arena:ended",
  // A pickup was collected — broadcast to the room so every client removes
  // the medallion. Carries the COLLECTING clientId + kind so the collector's
  // own client can apply the effect (speed boost, ×2 toast, star celebrate,
  // or hurricane self-stun); everyone else just drops the node.
  ARENA_PICKUP_GONE:  "qp:arena:pickup:gone",
  // A pickup respawned elsewhere on the map (recycle) — clients add the
  // medallion back, same pattern as ARENA_WORD appending a token.
  ARENA_PICKUP_SPAWN: "qp:arena:pickup:spawn",
  // A dash-tackle landed — broadcast to the room so EVERY client spins the
  // stunned target (byClientId = dasher, targetClientId = victim). The victim's
  // own client also applies the local stun + knockback. No score change.
  ARENA_TACKLED:      "qp:arena:tackled",
  // Rough mode (dash-tackle PvP) flipped on/off for the arena. Just the on/off
  // signal — students gate the Dash button on it.
  ROUGH_MODE:         "qp:arena:roughmode",

  // ─── VocabWheel (live, phone-answer mode) ─────────────────────────
  // Sent to ONE student: "the wheel landed on you — here's the question".
  WHEEL_QUESTION:     "qp:wheel:question",
  // Relayed to the teacher's observer sockets: the picked student's reply.
  WHEEL_ANSWER:       "qp:wheel:answer",

  // ─── In-game 🆘 help button (mid-gameplay) ────────────────────────
  // Sent to the teacher socket only: a student has raised their hand.
  // Server-broadcast, teacher-scoped (never sent to peer students).
  HAND_RAISED:        "qp:hand:raised",
  // Sent to the affected student socket(s): teacher acknowledged your
  // raised hand — the 🆘 button unfreezes back from ✓ state.
  HAND_CLEARED:       "qp:hand:cleared",
} as const;

/** Teacher → server: push the wheel question to one student. The correct
 *  answer is intentionally omitted — the host scores the reply. */
export interface QpWheelAskPayload {
  sessionCode: string;
  /** Supabase access token — verified server-side (teacher action). */
  token: string;
  /** clientId of the student the wheel landed on. */
  clientId: string;
  /** Correlates the reply to this specific ask (ignore stale answers). */
  askId: string;
  prompt: string;
  /** "audio" → the student sees a 🔊 prompt instead of text. */
  promptKind?: "text" | "audio";
  options: string[];
}

/** server → the whole room (WHEEL_QUESTION); each student renders it only
 *  if `targetClientId` is theirs. Broadcasting + self-filtering keeps the
 *  targeting cross-VM-safe (no per-VM socket lookup) and the question has no
 *  correct-answer marker, so a non-target client seeing it is harmless. */
export interface QpWheelQuestionPayload {
  targetClientId: string;
  askId: string;
  prompt: string;
  promptKind?: "text" | "audio";
  options: string[];
}
export interface QpWheelAnswerPayload {
  sessionCode: string;
  askId: string;
  /** Index into options the student tapped (-1 = timed out / no answer). */
  choiceIndex: number;
  /** Filled server-side when relaying to the teacher. */
  clientId?: string;
}

/** Red vs Blue team mode. A student's team rides on their leaderboard
 *  entry; the host sums each side from the unioned leaderboard. */
export type QpTeam = "red" | "blue";

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
  /** Team mode: the team this client wants (carried across reconnects so
   *  a refresh keeps a switched team). Ignored when team mode is off. */
  team?: QpTeam;
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

/** Teacher toggles Red vs Blue team mode for the whole session. */
export interface QpTeacherTeamModePayload {
  sessionCode: string;
  token: string;
  enabled: boolean;
}

/** Student taps "Switch team" — honoured only if it keeps teams balanced. */
export interface QpTeamSwitchPayload {
  sessionCode: string;
  clientId: string;
  team: QpTeam;
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
  /** Red vs Blue team mode: which team this student is on, or undefined
   *  when team mode is off. Broadcast so the host can sum each side and
   *  tint medallions; the host computes totals from the unioned roster. */
  team?: QpTeam;
  /** Supabase auth user id when known.  Server-private — never
   *  broadcast back to other clients (the LEADERBOARD payload omits
   *  it).  Used only for the persist-on-end progress writes. */
  authUid?: string;
}

/** Server → room: team mode flipped on/off. The on/off signal only —
 *  each student's team travels on their leaderboard entry. */
export interface QpTeamModePayload {
  sessionCode: string;
  enabled: boolean;
}

export interface QpJoinedPayload {
  /** Echoes back the clientId the caller asked to register — lets the
   *  client confirm the server accepted the payload without having to
   *  diff the leaderboard. */
  clientId: string;
  leaderboard: QpStudentEntry[];
  /** Opaque id of the Fly VM that produced this snapshot — see
   *  QpLeaderboardPayload.serverId. */
  serverId?: string;
}

export interface QpLeaderboardPayload {
  sessionCode: string;
  students: QpStudentEntry[];
  /** Opaque id of the Fly VM that produced this snapshot.
   *
   *  In-memory session state (`qpSessions`) is per-process, so once the
   *  app runs on more than one VM a single session's students are split
   *  across machines: each VM only knows the students whose sockets
   *  landed on it, and the Redis adapter forwards every VM's broadcast
   *  to the whole room.  If the client just replaced its leaderboard on
   *  each broadcast it would flip-flop between per-VM subsets (and, for
   *  Category Race, show a remote student's stale score=0 from their own
   *  VM clobbering the authoritative score the round-owner VM computed).
   *
   *  The client keeps the LATEST snapshot per serverId and renders their
   *  union (max score wins per clientId).  Per-VM replacement preserves
   *  removals (a kicked / departed student drops out of their VM's next
   *  snapshot), while the union aggregates the whole class.  Single-VM
   *  deployments send one serverId, so behaviour is unchanged there. */
  serverId?: string;
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

// ─── Category Race payloads ─────────────────────────────────────────────
//
// A Category Race session is a normal quick_play_sessions row whose
// allowed_modes is exactly [QP_CATEGORY_RACE_MODE] and whose word list is
// empty — the discriminator the student client branches on to show the
// race lobby instead of the regular game. The round config (categories,
// timer) is NOT persisted; the teacher sends it live with each round.

/** Client → server: teacher starts a round. */
export interface QpRaceStartPayload {
  sessionCode: string;
  /** Supabase access token — verified against the session's teacher_uid. */
  token: string;
  /** Category ids the round runs over. Validated + clamped server-side
   *  against the answer bank; unknown ids are dropped. */
  categories: string[];
  /** Seconds students get to answer. Clamped to QP_RACE_ROUND_SECONDS. */
  roundSeconds: number;
  /** Relaxed mode — no countdown shown; the round ends when every
   *  connected student has submitted or the teacher ends it. roundSeconds
   *  still rides along but is only used as a server-side safety cap. */
  untimed?: boolean;
}

/** Client → server: teacher ends the active round early. */
export interface QpRaceEndRoundPayload {
  sessionCode: string;
  token: string;
  roundId: string;
}

/** Client → server: student submits answers for the active round. */
export interface QpRaceSubmitPayload {
  sessionCode: string;
  clientId: string;
  /** Must match the server's active round; stale submits are dropped. */
  roundId: string;
  /** categoryId → typed answer. Scored server-side via the bank. */
  answers: Record<string, string>;
  /** Category ids where the student used a hint / suggestion. Those cells
   *  score at the reduced (L1) rate even when answered in English — fair
   *  scaffolding for weaker students without giving full points for help. */
  helped?: string[];
}

/** Server → room: a new round began. */
export interface QpRaceRoundPayload {
  sessionCode: string;
  roundId: string;
  /** The single letter every answer must start with this round. */
  letter: string;
  categories: string[];
  roundSeconds: number;
  /** Epoch ms the round closes — clients count down to this so every
   *  device shares one clock regardless of when the packet lands. */
  deadlineTs: number;
  /** Server's clock at broadcast — lets clients correct for offset. */
  serverTs: number;
  /** Relaxed mode — clients hide the countdown and never auto-submit. */
  untimed?: boolean;
}

/** One scored cell in a student's round result. */
export interface QpRaceCellResult {
  categoryId: string;
  typed: string;
  valid: boolean;
  /** Canonical English answer the input matched (for L1-fallback copy). */
  matchedEn: string | null;
  matchedLanguage: "en" | "he" | "ar" | null;
  points: number;
}

/** Server → submitting socket: that student's per-cell scoring. */
export interface QpRaceResultPayload {
  sessionCode: string;
  roundId: string;
  cells: QpRaceCellResult[];
  /** Base points from scored cells (English + L1). */
  roundPoints: number;
  /** Extra points for answering fast — 0 in untimed mode or a 0-point
   *  round. Already folded into totalScore; surfaced so the client can
   *  celebrate "⚡ +N speed". */
  speedBonus: number;
  /** The student's running session total after this round. */
  totalScore: number;
}

/** Server → room: the active round closed. */
export interface QpRaceEndedPayload {
  sessionCode: string;
  roundId: string;
}

// ─── Speed Round payloads ───────────────────────────────────────────────
//
// A Speed Round session is a quick_play_sessions row whose allowed_modes is
// exactly [QP_SPEED_MODE] and whose word list is empty — the discriminator
// the student client branches on. Unlike Category Race, the question is
// authored CLIENT-SIDE on the teacher's screen (the server has no
// vocabulary): the teacher builds {prompt, options, correctIndex} and the
// server scores by INDEX only, never seeing the words. See §3 of the design.

/** How the prompt should be presented on the student's device. `text` is
 *  the default (show the word); `audio` tells the listening-mode student to
 *  speak the prompt via TTS instead of showing it. */
export type QpSpeedPromptKind = "text" | "audio";

/** Client → server: teacher starts a Speed Round word. The correctIndex is
 *  stored PRIVATELY server-side and stripped from the room broadcast. */
export interface QpSpeedStartPayload {
  sessionCode: string;
  /** Supabase access token — verified against the session's teacher_uid. */
  token: string;
  /** Which fast mode this word runs (true-false, classic, …). Validated
   *  against QP_SPEED_MODES. */
  mode: QpSpeedMode;
  /** The question prompt (a translation, the English word, "True/False?"…).
   *  Length-clamped server-side. */
  prompt: string;
  /** How the student should render the prompt. Defaults to "text". */
  promptKind?: QpSpeedPromptKind;
  /** 2–4 answer options the student taps. Length-clamped server-side. */
  options: string[];
  /** Index into `options` of the correct answer. Stored privately. */
  correctIndex: number;
  /** Seconds students get to tap. Clamped to QP_SPEED_ROUND_SECONDS. */
  roundSeconds: number;
}

/** Server → room: a new word began. Note: NO correctIndex — students get
 *  only the options and must tap (then the server scores by index). */
export interface QpSpeedRoundPayload {
  sessionCode: string;
  roundId: string;
  mode: QpSpeedMode;
  prompt: string;
  promptKind: QpSpeedPromptKind;
  options: string[];
  roundSeconds: number;
  /** Epoch ms the word closes — clients count down to this so every device
   *  shares one clock regardless of when the packet lands. */
  deadlineTs: number;
  /** Server's clock at broadcast — lets clients correct for offset. */
  serverTs: number;
}

/** Client → server: student taps an option for the active word. They send
 *  the INDEX they tapped, never text — a tampered client would have to guess
 *  the correct index, i.e. just guess the answer. */
export interface QpSpeedSubmitPayload {
  sessionCode: string;
  clientId: string;
  /** Must match the server's active word; stale taps are dropped. */
  roundId: string;
  choiceIndex: number;
}

/** Server → submitting socket: that student's per-word scoring. */
export interface QpSpeedResultPayload {
  sessionCode: string;
  roundId: string;
  correct: boolean;
  /** Now safe to reveal to the student who answered. */
  correctIndex: number;
  /** Base points for a correct answer (0 if wrong). */
  roundPoints: number;
  /** Extra points for answering fast — 0 when wrong or expired. Already
   *  folded into totalScore; surfaced so the client can celebrate "⚡ +N". */
  speedBonus: number;
  /** True when this student was the FIRST to answer correctly this word. */
  firstCorrect: boolean;
  /** The student's running session total after this word. */
  totalScore: number;
}

/** Server → room: the active word closed — reveals the answer + winner. */
export interface QpSpeedEndedPayload {
  sessionCode: string;
  roundId: string;
  /** The correct option index, now safe to reveal to the whole room. */
  correctIndex: number;
  /** clientId of the first student to answer correctly, or null if nobody
   *  did. The host highlights this on the podium. */
  winnerClientId: string | null;
}

/** Client → server: teacher ends the active word early. */
export interface QpSpeedEndRoundPayload {
  sessionCode: string;
  token: string;
  roundId: string;
}

// ─── Word Hunt Arena payloads ───────────────────────────────────────────
//
// An arena session is a quick_play_sessions row whose allowed_modes is
// exactly [QP_ARENA_MODE] and whose word list is empty — the discriminator
// the student bootstrap branches on. Like Speed Round, every question is
// authored CLIENT-SIDE on the teacher's screen (the server has no
// vocabulary) — but here the host ships the WHOLE batch at arena start so
// the server can grant grabs instantly from memory. The server stores each
// correctIndex privately; answering reuses SPEED_SUBMIT / SPEED_RESULT.
// See docs/word-hunt-arena-design.md.

/** A point in arena LOGICAL units (0..QP_ARENA_WIDTH / HEIGHT) — never
 *  pixels; each client maps logical → its own canvas size. */
export interface QpArenaPos {
  x: number;
  y: number;
}

/** The four scattered game elements. All FOUR are now COLLECTIBLE (collected
 *  once, then gone + respawn): speed/star/double grant a reward, while the
 *  hurricane "mud" 🌀 STUNS the collector (spins them in place for a few
 *  seconds) instead of paying out. Kept as a closed union so the server
 *  validator and the client renderer can't drift. */
export const QP_ARENA_PICKUP_KINDS = ["speed", "star", "double", "mud"] as const;
export type QpArenaPickupKind = (typeof QP_ARENA_PICKUP_KINDS)[number];

/** A game element as the ROOM sees it — server-minted id + kind + position.
 *  All kinds drop out on collect (ARENA_PICKUP_GONE) and reappear on respawn
 *  (ARENA_PICKUP_SPAWN) — including the hurricane, which now stuns rather than
 *  sitting as a passive patch. */
export interface QpArenaPickup {
  /** Server-minted UUID — the collect handle (mirrors QpArenaWordPublic.wordId). */
  pickupId: string;
  kind: QpArenaPickupKind;
  pos: QpArenaPos;
}

/** One avatar on the map, as carried in the full ARENA_STATE send. The
 *  10/sec position stream uses the compact QpArenaSnapshotPayload instead. */
export interface QpArenaPlayer {
  clientId: string;
  nickname: string;
  avatar: string;
  x: number;
  y: number;
}

/** Client → server: one word in the host's pre-authored batch. correctIndex
 *  is stored PRIVATELY server-side — it never appears in any room payload. */
export interface QpArenaWordSeed {
  /** The English word shown on the floating token. */
  label: string;
  mode: QpSpeedMode;
  prompt: string;
  promptKind: QpSpeedPromptKind;
  /** 2–4 answer options, same discipline as QpSpeedStartPayload. */
  options: string[];
  /** Index into `options` of the correct answer. Stored privately. */
  correctIndex: number;
  /** Optional fixed spawn position; the server scatters when omitted. */
  pos?: QpArenaPos;
}

/** A word token as the ROOM sees it. NEVER carries correctIndex (or the
 *  prompt/options — those go only to the grabber via ARENA_GRAB_GRANTED),
 *  so a tampered client can't pre-read any answer off the wire. */
export interface QpArenaWordPublic {
  /** Server-minted UUID — the grab/answer handle. */
  wordId: string;
  label: string;
  pos: QpArenaPos;
  state: "available" | "locked" | "answered";
  /** clientId currently holding the lock (state === "locked"). */
  lockedBy?: string;
}

/** Client → server: teacher starts the arena with the full question batch. */
export interface QpArenaStartPayload {
  sessionCode: string;
  /** Supabase access token — verified against the session's teacher_uid. */
  token: string;
  /** The pre-authored batch — capped at QP_ARENA_MAX_WORDS server-side;
   *  malformed entries are skipped (not fatal) so one bad word can't
   *  cancel the whole arena. */
  words: QpArenaWordSeed[];
  config?: {
    /** How many tokens float on the map at once. Clamped 3..15. */
    visibleWords?: number;
    /** Grab distance in logical units. Clamped 30..150. */
    grabRadius?: number;
    /** Seconds a grabber gets to answer. Same choices as Speed Round. */
    roundSeconds?: number;
    /** Themed board background (QP_ARENA_MAP_IDS). Validated server-side and
     *  echoed in ARENA_STATE so every student sees the teacher's pick. */
    mapId?: QpArenaMapId;
  };
}

/** Client → server: a student's avatar position (client-authoritative —
 *  position cheating is low-harm, the question still gates the points).
 *  Sent at QP_ARENA_CLIENT_TICK_MS while moving; never relayed per-move. */
export interface QpArenaMovePayload {
  sessionCode: string;
  clientId: string;
  x: number;
  y: number;
}

/** Client → server: a student touches a word token and asks for the lock. */
export interface QpArenaGrabPayload {
  sessionCode: string;
  clientId: string;
  wordId: string;
  /** Client-reported position — the RANGE-CHECK FALLBACK for the cross-VM
   *  path, where the word-owning VM may never have seen this student's
   *  ARENA_MOVE stream. The owner prefers its own last-known position. */
  x?: number;
  y?: number;
}

/** Client → server: a student touches a scattered game element and asks to
 *  collect it. Same shape as QpArenaGrabPayload — x/y is the cross-VM
 *  range-check fallback for when the owner VM never saw this student's moves. */
export interface QpArenaPickupPayload {
  sessionCode: string;
  clientId: string;
  pickupId: string;
  /** Client-reported position — the range-check fallback for the cross-VM
   *  path (the owner prefers its own last-known position). */
  x?: number;
  y?: number;
}

/** Client → server: teacher closes the arena. */
export interface QpArenaEndPayload {
  sessionCode: string;
  token: string;
}

/** Server → room (and to a re-joining socket): the full arena picture. */
export interface QpArenaStatePayload {
  sessionCode: string;
  width: number;
  height: number;
  grabRadius: number;
  roundSeconds: number;
  words: QpArenaWordPublic[];
  positions: QpArenaPlayer[];
  /** Scattered game elements currently on the map — available consumables
   *  plus every mud patch (mud is permanent). Empty array on older servers
   *  that don't scatter pickups, so the client just renders nothing. */
  pickups: QpArenaPickup[];
  /** Teacher-chosen themed background (QP_ARENA_MAP_IDS). Absent ⇒ the
   *  canvas falls back to its plain gradient. */
  mapId?: QpArenaMapId;
  /** Opaque id of the Fly VM that owns this arena — same multi-VM union
   *  rationale as QpLeaderboardPayload.serverId. */
  serverId?: string;
}

/** Server → room: the 10/sec position tick. Index-aligned arrays of
 *  rounded ints instead of an object per player — the payload repeats
 *  10×/sec to the whole room, so every byte is multiplied by
 *  (tick rate × room size); arrays roughly halve it vs. keyed objects.
 *  `ids` carries clientIds for simplicity — swapping them for per-session
 *  small slot ints (slot compaction) is the next egress lever if these
 *  snapshots ever show up in the bandwidth budget. */
export interface QpArenaSnapshotPayload {
  sessionCode: string;
  serverTs: number;
  ids: string[];
  xs: number[];
  ys: number[];
  /** Per-VM source id — clients union snapshots across serverIds, keeping
   *  the latest serverTs per clientId (multi-VM splits the room). */
  serverId?: string;
}

/** Server → room: one word's lifecycle changed (locked/released/answered). */
export interface QpArenaWordPayload {
  sessionCode: string;
  word: QpArenaWordPublic;
}

/** Server → grabbing socket only: you won the lock — answer this. Shaped
 *  like QpSpeedRoundPayload minus correctIndex so the Speed Round buzzer
 *  renders it verbatim; the answer goes back via the existing SPEED_SUBMIT
 *  (matched by roundId) and scores through the same private-index core. */
export interface QpArenaGrabGrantedPayload {
  sessionCode: string;
  wordId: string;
  roundId: string;
  mode: QpSpeedMode;
  prompt: string;
  promptKind: QpSpeedPromptKind;
  options: string[];
  roundSeconds: number;
  /** Epoch ms the answer window closes — shared-clock countdown. */
  deadlineTs: number;
  /** Server's clock at grant — lets clients correct for offset. */
  serverTs: number;
}

/** Server → grabbing socket only: grab refused. */
export interface QpArenaGrabDeniedPayload {
  sessionCode: string;
  wordId: string;
  reason: "already_locked" | "out_of_range" | "answered" | "cooldown" | "not_active";
}

/** Server → room: a pickup was collected. Every client removes the medallion;
 *  the COLLECTOR's client (byClientId === own clientId) also applies the
 *  effect — speed boost, "×2 next answer" toast, star celebrate, or the
 *  hurricane self-stun (spin in place, can't move). The star's actual points
 *  arrive separately on the leaderboard (server-authoritative), so this
 *  payload carries no score. */
export interface QpArenaPickupGonePayload {
  sessionCode: string;
  pickupId: string;
  /** clientId of the student who collected it. */
  byClientId: string;
  kind: QpArenaPickupKind;
}

/** Server → room: a consumable pickup respawned at a fresh position. Clients
 *  add the medallion back (mirrors ARENA_WORD appending a recycled token). */
export interface QpArenaPickupSpawnPayload {
  sessionCode: string;
  pickup: QpArenaPickup;
}

/** Server → room: the teacher closed the arena. */
export interface QpArenaEndedPayload {
  sessionCode: string;
}

/** Client → server: a dashing student collides with another student. The
 *  server refereed everything else (rough-mode on, range, team, cooldown) —
 *  the client only reports who it hit. NEVER carries any score. */
export interface QpArenaTacklePayload {
  sessionCode: string;
  clientId: string;
  targetClientId: string;
  /** Client-reported dasher position — the cross-VM range-check fallback
   *  (the owner VM may never have seen this student's move stream). */
  x?: number;
  y?: number;
}

/** Server → room: a tackle landed. Every client spins the stunned target;
 *  the target's own client also shoves itself away from the dasher. */
export interface QpArenaTackledPayload {
  sessionCode: string;
  /** The dasher who landed the tackle (for the knockback direction). */
  byClientId: string;
  /** The stunned student. */
  targetClientId: string;
}

/** Client → server: teacher toggles rough mode (dash-tackle PvP) on/off. */
export interface QpTeacherRoughModePayload {
  sessionCode: string;
  token: string;
  enabled: boolean;
}

/** Server → room: rough mode flipped on/off. The on/off signal only —
 *  students gate the Dash button on it. */
export interface QpRoughModePayload {
  sessionCode: string;
  enabled: boolean;
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

// \u2500\u2500\u2500 Category Race constants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** allowed_modes sentinel that marks a quick_play_sessions row as a
 *  Category Race session (vs. a regular vocab session). Reuses the
 *  existing GameMode string so it isn't a foreign value elsewhere. */
export const QP_CATEGORY_RACE_MODE = "category-race";

/** Round-timer choices the teacher can pick (seconds). */
export const QP_RACE_ROUND_SECONDS = [15, 30, 45, 60, 90, 120, 150, 180] as const;

/** Max bonus points for an instant correct answer; scales linearly to 0
 *  as the round clock runs out. Rewards decisive answers over stalling. */
export const QP_RACE_SPEED_BONUS_MAX = 10;

/** Safety auto-close (seconds) for untimed rounds, so a forgotten relaxed
 *  round can't hang the room forever. */
export const QP_RACE_UNTIMED_SAFETY_SECONDS = 600;

/** Max categories a single round can run over (the bank ships 12). */
export const QP_RACE_MAX_CATEGORIES = 12;

/** Points per scored cell \u2014 full credit for English, partial for an
 *  accepted Hebrew/Arabic answer. Mirrors the retired solo mode so the
 *  scoring feel is unchanged. */
export const QP_RACE_PTS_EN = 10;
export const QP_RACE_PTS_L1 = 3;

/** Grace window (ms) after the deadline within which a late submit is
 *  still accepted, to tolerate clock skew + network latency. */
export const QP_RACE_SUBMIT_GRACE_MS = 3_000;

export function isValidRaceRoundSeconds(v: unknown): v is number {
  return typeof v === "number" && (QP_RACE_ROUND_SECONDS as readonly number[]).includes(v);
}

// ─── Speed Round constants ──────────────────────────────────────────────

/** The fast question modes a Speed Round word can run. Each builds a
 *  prompt + 2–4 tap options client-side from the session's words. */
export const QP_SPEED_MODES = [
  "true-false",
  "classic",
  "reverse",
  "listening",
  "idiom",
  "letter-sounds",
] as const;
export type QpSpeedMode = typeof QP_SPEED_MODES[number];

/** allowed_modes sentinel that marks a quick_play_sessions row as a Speed
 *  Round session (vs. a regular vocab / Category Race session). The student
 *  bootstrap branches on this to show the Speed Round lobby. */
export const QP_SPEED_MODE = "speed-round";

/** Round-timer choices the teacher can pick (seconds). Tighter than Category
 *  Race — Speed Round is about quick taps, not building answers. Includes a
 *  3s/7s rung for fast recall drills on short, familiar word lists. */
export const QP_SPEED_ROUND_SECONDS = [3, 5, 7, 10, 15, 20, 30] as const;

/** Base points for a correct answer, before the speed bonus. */
export const QP_SPEED_BASE_POINTS = 10;

/** Max bonus points for an instant correct answer; scales linearly to 0 as
 *  the word clock runs out. Bigger than Category Race's bonus because speed
 *  is the whole point of this mode. */
export const QP_SPEED_BONUS_MAX = 50;

export function isValidSpeedMode(v: unknown): v is QpSpeedMode {
  return typeof v === "string" && (QP_SPEED_MODES as readonly string[]).includes(v);
}

export function isValidSpeedRoundSeconds(v: unknown): v is number {
  return typeof v === "number" && (QP_SPEED_ROUND_SECONDS as readonly number[]).includes(v);
}

// ─── Word Hunt Arena constants ──────────────────────────────────────────

/** allowed_modes sentinel that marks a quick_play_sessions row as a Word
 *  Hunt Arena session. The student bootstrap branches on this to show the
 *  arena instead of the regular game — same pattern as QP_SPEED_MODE. */
export const QP_ARENA_MODE = "word-hunt-arena";

/** allowed_modes sentinel that marks a quick_play_sessions row as a
 *  VocabWheel "live" session. Students join only to register their name +
 *  avatar (the wheel runs on the teacher's board); the student bootstrap
 *  branches on this to show the lightweight "you're in, watch the board"
 *  screen — same wordless pattern as QP_ARENA_MODE. */
export const QP_WHEEL_MODE = "vocab-wheel";

/** Themed board backgrounds a teacher can pick for the arena. The teacher
 *  chooses one (or "random") at start; the id rides ARENA_START → ARENA_STATE
 *  so every student's phone paints the SAME map as the projector. This is the
 *  shared source of truth (server validates against it; the client registry
 *  in components/game/arenaMaps.ts hangs art + names off these ids). */
export const QP_ARENA_MAP_IDS = [
  "islands", "forest", "frozen", "volcano", "space", "candy",
  "underwater", "desert", "jungle", "kingdom", "city",
] as const;
export type QpArenaMapId = (typeof QP_ARENA_MAP_IDS)[number];

/** Arena dimensions in LOGICAL units (not pixels) — every client maps
 *  logical → its own canvas size, so phones and the projector agree on
 *  where everything is regardless of screen. 10:7 fits both a landscape
 *  projector and a portrait phone with letterboxing. Enlarged from
 *  1000×700 so a full class has real room to spread out and roam (the
 *  student follow-camera shows a slice, so a bigger world reads as a
 *  bigger map). The aspect stays 10:7; SELF_SPEED (client) scales off
 *  QP_ARENA_WIDTH so the bigger world still crosses in roughly the same
 *  feel-time. Enlarged again (was 1600×1120) so a full class spreads out
 *  and every word can be on the board at once without crowding. */
export const QP_ARENA_WIDTH = 2800;
export const QP_ARENA_HEIGHT = 1960;

/** Server snapshot tick (ms) — one room broadcast per tick, never
 *  per-move. ⚠️ Don't lower this (raise the rate) without re-running the
 *  socket load harness; snapshot egress scales with tick × room size. */
export const QP_ARENA_TICK_MS = 100;

/** Client position-send tick (ms) — matched to the server tick; sending
 *  faster than the server samples is pure wasted uplink. */
export const QP_ARENA_CLIENT_TICK_MS = 100;

/** Hard cap on tracked avatars per arena. Tighter than the 60-student
 *  session cap because every extra mover multiplies snapshot bytes. */
export const QP_ARENA_MAX_PLAYERS = 30;

/** Default number of word tokens floating on the map at once. No longer a
 *  "visible vs reserve" split — EVERY picked word (up to QP_ARENA_MAX_WORDS)
 *  is placed on the bigger map at once and an answered word simply stays
 *  answered (no respawn cycling). This value is only the fallback the server
 *  clamps the optional config to; the real on-map count = the whole batch. */
export const QP_ARENA_DEFAULT_VISIBLE = 60;

/** Default grab distance (logical units). Tightened so a student must visually
 *  STAND ON the word token (overlap) before it auto-opens, not merely be near
 *  it — "walk onto the word → it opens". A word pill renders ~60–90 logical
 *  units wide on the big map, so ~55 means the avatar medallion must be over
 *  the pill. Server clamps the optional config to 30..150. */
export const QP_ARENA_DEFAULT_GRAB_RADIUS = 55;

/** Cap on the pre-authored question batch a host can ship. */
export const QP_ARENA_MAX_WORDS = 60;

/** Per-student cooldown (ms) after a grab resolves (answered OR fumbled)
 *  before they may grab again — stops one fast kid from chain-locking
 *  every token on the map. */
export const QP_ARENA_GRAB_COOLDOWN_MS = 1_500;

/** Arena scoring — deliberately SEPARATE from the Speed Round constants
 *  so the two modes can be balanced independently: an arena player grabs
 *  many words per game, so per-word points must be smaller or a fast
 *  runner out-earns a whole Speed Round (design §8.5). */
export const QP_ARENA_BASE_POINTS = 10;
export const QP_ARENA_BONUS_MAX = 30;

// ─── Word Hunt Arena pickups (scattered game elements) ──────────────────

/** Bonus Star payout — instant points the server adds to the collector's
 *  leaderboard score (server-authoritative, like TEACHER_BONUS). Small so a
 *  lucky runner can't out-earn answering words, which is the real game. */
export const QP_ARENA_PICKUP_BONUS_POINTS = 5;

/** Speed Boost duration (ms) — how long the collector's avatar moves faster
 *  after grabbing a ⚡. Pure client effect (the server only arbitrates the
 *  collect); short enough to feel like a burst, not a permanent advantage. */
export const QP_ARENA_SPEED_BOOST_MS = 5000;

/** Speed Boost multiplier on the local avatar's movement speed. */
export const QP_ARENA_SPEED_BOOST_MULT = 1.7;

/** Hurricane 🌀 stun duration (ms) — how long the collector is frozen +
 *  visibly spinning after grabbing one. A pure client effect (the server only
 *  arbitrates the collect, like a consumable); short enough to be a setback,
 *  not a rage-quit. */
export const QP_ARENA_HURRICANE_STUN_MS = 3000;

/** Default count of each element scattered on the map at arena start. All four
 *  are now collectible (the hurricane stuns instead of paying out) and respawn
 *  after collect. Tuned so the map feels alive without crowding the words. */
export const QP_ARENA_PICKUP_DEFAULTS: Record<QpArenaPickupKind, number> = {
  speed: 2,
  star: 3,
  double: 1,
  mud: 3,
};

// ─── Word Hunt Arena dash-tackle PvP (rough mode) ───────────────────────

/** Dash burst duration (ms) — how long the local avatar moves faster after a
 *  Dash press. Short — a lunge, not sustained flight. */
export const QP_ARENA_DASH_MS = 500;

/** Dash speed multiplier on the local avatar's movement. */
export const QP_ARENA_DASH_SPEED_MULT = 2.2;

/** Dash cooldown (ms) — minimum gap between dashes (client shows the timer;
 *  the server sanity-checks it too so a tampered client can't chain-tackle). */
export const QP_ARENA_DASH_COOLDOWN_MS = 5000;

/** Tackle contact range (logical units) — the dasher must be within this of
 *  the target for a tackle to land. Checked client-side to decide WHO to
 *  report, and re-checked server-side as the authority. */
export const QP_ARENA_TACKLE_RANGE = 90;

/** Tackle stun duration (ms) — how long the tackled student is frozen +
 *  spinning. Reuses the same stun mechanism as the hurricane. */
export const QP_ARENA_TACKLE_STUN_MS = 2000;

export function isValidArenaPickupKind(v: unknown): v is QpArenaPickupKind {
  return typeof v === "string" && (QP_ARENA_PICKUP_KINDS as readonly string[]).includes(v);
}

// ─── In-game 🆘 help button (mid-gameplay) — payload types ─────────────
// Companion to QP_EVENTS.STUDENT_RAISE_HAND / TEACHER_ACK_HELP and
// QP_SERVER_EVENTS.HAND_RAISED / HAND_CLEARED. See docs/superpowers/specs/
// 2026-08-07-quick-play-help-button-design.md for the full flow.

/** Student → server: "I raised my hand for teacher help." Server
 *  rate-limits (5/60s per studentUid, excess silently dropped) and
 *  broadcasts HAND_RAISED to the session's teacher socket only. */
export interface StudentRaiseHandPayload {
  sessionCode: string;
  studentUid: string;
}

/** Server → teacher socket only: a student in the session has raised
 *  their hand. Never broadcast to peer students. */
export interface HandRaisedPayload {
  studentUid: string;
  name: string;
  raisedAt: number;
}

/** Teacher → server: clear a specific student's raised hand, OR "all"
 *  to clear every raised hand in the session at once. */
export interface TeacherAckHelpPayload {
  sessionCode: string;
  studentUid: string | "all";
}

/** Server → affected student socket(s): the raised hand was cleared;
 *  student's 🆘 button unfreezes from its ✓ state. */
export interface HandClearedPayload {
  studentUid: string;
}
