/**
 * Shared type definitions for Vocaband
 */

/**
 * Leaderboard entry for live challenges
 * Combines base score (from all past assignments) with current game score
 */
export interface LeaderboardEntry {
  name: string;
  baseScore: number;
  currentGameScore: number;
  isGuest?: boolean;
}

/**
 * Socket event names - centralized to prevent typos and enable refactoring
 */
export const SOCKET_EVENTS = {
  JOIN_CHALLENGE: "join-challenge",
  OBSERVE_CHALLENGE: "observe-challenge",
  UPDATE_SCORE: "update-score",
  LEADERBOARD_UPDATE: "leaderboard-update",
  CHALLENGE_ENDED: "challenge-ended",
  // --- Dreidel (live blitz) ---
  // Teacher creates a session with config + starts the first spin.
  // Server owns the round state machine; clients only receive state snapshots.
  DREIDEL_CREATE: "dreidel-create",
  DREIDEL_JOIN: "dreidel-join",
  DREIDEL_SPIN: "dreidel-spin",
  DREIDEL_ANSWER: "dreidel-answer",
  DREIDEL_POWERUP: "dreidel-powerup",
  DREIDEL_STATE: "dreidel-state",
  DREIDEL_RESULT: "dreidel-result",
  DREIDEL_END: "dreidel-end",
} as const;

/**
 * Socket event payload types
 */
export interface JoinChallengePayload {
  classCode: string;
  name: string;
  uid: string;
  isGuest?: boolean;
}

export interface ObserveChallengePayload {
  classCode: string;
}

export interface UpdateScorePayload {
  classCode: string;
  uid: string;
  score: number;
}

// ─── Dreidel ─────────────────────────────────────────────────────────────
// One Dreidel session is keyed by classCode like Live Challenge.  The
// teacher creates with config, students join, server spins on a timer.

export interface DreidelConfig {
  /** Starting lives per player. Teacher picks 3 or 5. */
  startingLives: number;
  /** Round timer in seconds (4-15). Drops over time when scaling enabled. */
  timerSeconds: number;
  /** Enable category constraint (e.g., "F + animals"). */
  topicMode: boolean;
  /** Allow students to spend XP on Skip/Peek/+Time during the round. */
  powerUpsEnabled: boolean;
  /** Drop timer + restrict letters when only 2 players remain. */
  suddenDeath: boolean;
  /** Steal a life from a random opponent on fast (<2s) answers. */
  stealOnFast: boolean;
}

export interface DreidelPlayer {
  uid: string;
  name: string;
  lives: number;
  score: number;          // points earned this game
  correctStreak: number;  // for +1 life bonus per 10 correct
  totalCorrect: number;
  eliminated: boolean;
  isGuest?: boolean;
}

export type DreidelPhase =
  | "lobby"        // teacher created, waiting for students
  | "spinning"    // dreidel animation, no input yet
  | "answering"   // letter shown, timer counting down
  | "roundEnd"    // result revealed before next spin
  | "finished";   // game over, winner declared

export type DreidelPowerUpId = "skip" | "peek" | "extraTime";

export interface DreidelState {
  classCode: string;
  phase: DreidelPhase;
  config: DreidelConfig;
  players: Record<string, DreidelPlayer>;
  /** Current round number (1-indexed). */
  roundNumber: number;
  /** Letter the dreidel landed on (A-Z) — null while spinning/lobby. */
  currentLetter: string | null;
  /** Topic for this round when topicMode is on. */
  currentTopic: string | null;
  /** Epoch ms when the answering window expires. */
  deadlineMs: number | null;
  /** Result of the most recent round (for the brief "X won with APPLE" overlay). */
  lastResult: DreidelRoundResult | null;
  /** True when only 2 players remain and suddenDeath was enabled. */
  inSuddenDeath: boolean;
}

export interface DreidelRoundResult {
  letter: string;
  topic: string | null;
  /** Winner uid, or null if everyone timed out. */
  winnerUid: string | null;
  winnerName: string | null;
  winningWord: string | null;
  /** Per-player outcome — lives lost, bonus earned, etc. */
  outcomes: Record<string, {
    livesLost: number;
    livesGained: number;
    pointsEarned: number;
    stoleFromUid?: string;
  }>;
}

export interface DreidelCreatePayload {
  classCode: string;
  config: DreidelConfig;
}

export interface DreidelJoinPayload {
  classCode: string;
  uid: string;
  name: string;
  isGuest?: boolean;
}

export interface DreidelSpinPayload {
  classCode: string;
}

export interface DreidelAnswerPayload {
  classCode: string;
  word: string;
}

export interface DreidelPowerUpPayload {
  classCode: string;
  powerUp: DreidelPowerUpId;
}

export interface DreidelEndPayload {
  classCode: string;
}
