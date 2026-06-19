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
  /** Student's chosen emoji avatar (from CLASS_AVATARS), shown on the podium. */
  avatar?: string;
}

/**
 * Socket event names - centralized to prevent typos and enable refactoring
 */
export const SOCKET_EVENTS = {
  JOIN_CHALLENGE: "join-challenge",
  OBSERVE_CHALLENGE: "observe-challenge",
  UPDATE_SCORE: "update-score",
  LEADERBOARD_UPDATE: "leaderboard-update",
  /**
   * Multi-VM-aware leaderboard broadcast. Same data as LEADERBOARD_UPDATE but
   * wrapped with the emitting VM's `serverId` so a teacher behind a
   * multi-machine Fly deployment (min_machines_running >= 2) can union every
   * VM's snapshot instead of rendering whichever VM's subset arrived last.
   * The server emits BOTH events during the rollout: legacy clients keep
   * reading LEADERBOARD_UPDATE unchanged; upgraded clients switch to this one.
   */
  LEADERBOARD_UPDATE_V2: "leaderboard-update-v2",
  CHALLENGE_ENDED: "challenge-ended",
  /**
   * Tier C — a student tapping an emoji reaction during a live challenge.
   * Mirrors the Quick Play reaction event so the two live flows share the
   * same student affordance. Fire-and-forget: the server validates against
   * the shared allow-list, rate-limits per socket, and broadcasts REACTION
   * to the class room (teacher podium + other students). No persistence,
   * no leaderboard side-effect — purely ephemeral atmosphere.
   */
  REACTION_SEND: "reaction-send",
  /** Server → room: an ephemeral reaction to float up on the podium. */
  REACTION: "reaction",
} as const;

/**
 * Socket event payload types
 */
export interface JoinChallengePayload {
  classCode: string;
  name: string;
  uid: string;
  isGuest?: boolean;
  /** Student's chosen emoji avatar, forwarded to the live leaderboard. */
  avatar?: string;
}

export interface ObserveChallengePayload {
  classCode: string;
}

export interface UpdateScorePayload {
  classCode: string;
  uid: string;
  score: number;
}

/** Client → server: a student tapping an emoji during a live challenge. */
export interface ReactionSendPayload {
  classCode: string;
  emoji: string;
}

/**
 * Server → room: an ephemeral reaction broadcast. Shaped to match the
 * Quick Play reaction payload (`clientId`/`serverTs`) so the same podium
 * particle layer can render reactions from either live flow unchanged —
 * here `clientId` carries the student's Supabase uid.
 */
export interface LiveReactionPayload {
  classCode: string;
  clientId: string;
  name?: string;
  emoji: string;
  serverTs: number;
}
