/**
 * Shared type definitions for Vocaband
 * Consolidated from: core/supabase.ts, core/types.ts, data/vocabulary.ts
 */

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface Word {
  id: number;
  english: string;
  hebrew: string;
  arabic: string;
  imageUrl?: string;
  level?: "Band 1" | "Band 2" | "Band 3" | "Custom";
  core?: "Core I" | "Core II";
  pos?: string; // Part of Speech
  recProd?: "Rec" | "Prod" | "Rec/Prod"; // Receptive or Productive or Both
  sentences?: string[]; // Pre-written example sentences for Sentence Builder
}

export interface AppUser {
  uid: string;
  email?: string;
  role: 'teacher' | 'student' | 'admin' | 'guest';
  displayName: string;
  classCode?: string;
  avatar?: string;
  badges?: string[];
  xp?: number;
  streak?: number;
  unlockedAvatars?: string[];
  unlockedThemes?: string[];
  powerUps?: Record<string, number>;
  activeTheme?: string;
  isGuest?: boolean;
  createdAt?: string;
}

export interface ClassData {
  id: string;
  name: string;
  code: string;
  teacherUid: string;
}

export interface AssignmentData {
  id: string;
  classId: string;
  wordIds: number[];
  words?: Word[];
  title: string;
  deadline?: string | null;
  createdAt?: string;
  allowedModes?: string[];
  sentences?: string[];
  sentenceDifficulty?: number;
}

export interface ProgressData {
  id: string;
  studentName: string;
  studentUid?: string;
  assignmentId: string;
  classCode: string;
  score: number;
  mode: string;
  completedAt: string;
  mistakes?: number[];
  avatar?: string;
}

// ---------------------------------------------------------------------------
// Live challenge / Socket types
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  name: string;
  baseScore: number;
  currentGameScore: number;
  isGuest?: boolean;
}

export const SOCKET_EVENTS = {
  JOIN_CHALLENGE: "join-challenge",
  OBSERVE_CHALLENGE: "observe-challenge",
  UPDATE_SCORE: "update-score",
  LEADERBOARD_UPDATE: "leaderboard-update",
  CHALLENGE_ENDED: "challenge-ended",
} as const;

export interface JoinChallengePayload {
  classCode: string;
  name: string;
  uid: string;
  token?: string;
  isGuest?: boolean;
}

export interface ObserveChallengePayload {
  classCode: string;
  token: string;
}

export interface UpdateScorePayload {
  classCode: string;
  uid: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DbErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    isAnonymous: boolean | undefined;
  };
}
