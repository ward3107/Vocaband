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
