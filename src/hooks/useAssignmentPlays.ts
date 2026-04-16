/**
 * Assignment replay counter — tracks how many games a student has
 * completed per assignment.
 *
 * Storage strategy (cross-device safe as of migration 20260425):
 *   1. Server-side: each progress row has a `play_count` column that
 *      the save_student_progress RPC bumps on every replay.  The total
 *      plays for an assignment = SUM(play_count) across its mode rows.
 *      This is the authoritative source and follows the student across
 *      devices.
 *   2. localStorage: kept as an optimistic cache for immediate dashboard
 *      updates after a game finishes (DB write takes 100-300ms).
 *      `sumPlayCountFromProgress(progress, assignmentId)` reads the DB
 *      total; `readAssignmentPlays` reads the LS cache.  The card
 *      prefers whichever is larger (so a stale LS cache can't hide DB
 *      progress from another device, and a new local play isn't lost
 *      waiting for the server).
 *
 * Semantics (user-approved):
 *   - One "round" = completed every allowed mode once.
 *   - MAX_ASSIGNMENT_ROUNDS (3) rounds = assignment locked.
 *   - Total allowed plays = MAX_ASSIGNMENT_ROUNDS × allowedModes.length.
 *   - After the lock, subsequent games grant ZERO XP.
 */
import { MAX_ASSIGNMENT_ROUNDS } from '../constants/game';
import type { ProgressData } from '../core/supabase';

const k = (uid: string, assignmentId: string) =>
  `vocaband_asn_plays_${uid}_${assignmentId}`;

/** Number of games this student has completed on this assignment. */
export function readAssignmentPlays(uid: string | undefined, assignmentId: string): number {
  if (!uid) return 0;
  try {
    const raw = localStorage.getItem(k(uid, assignmentId));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}

/** Record a finished game for this assignment — returns the new total. */
export function incrementAssignmentPlays(uid: string | undefined, assignmentId: string): number {
  if (!uid) return 0;
  const next = readAssignmentPlays(uid, assignmentId) + 1;
  try { localStorage.setItem(k(uid, assignmentId), String(next)); } catch {}
  return next;
}

/** How many rounds has the student completed so far? */
export function computeRoundsCompleted(plays: number, allowedModesCount: number): number {
  if (allowedModesCount <= 0) return 0;
  return Math.floor(plays / allowedModesCount);
}

/** Is this assignment locked (3 full rounds done)? */
export function isAssignmentLocked(plays: number, allowedModesCount: number): boolean {
  if (allowedModesCount <= 0) return false;
  return computeRoundsCompleted(plays, allowedModesCount) >= MAX_ASSIGNMENT_ROUNDS;
}

/** Sum play_count for every progress row of this assignment (excludes
 * flashcards since those don't count toward the cap).  Rows older than
 * migration 20260425 lack play_count and are treated as 1. */
export function sumPlayCountFromProgress(
  progress: ProgressData[],
  assignmentId: string,
): number {
  return progress
    .filter(p => p.assignmentId === assignmentId && p.mode !== 'flashcards')
    .reduce((sum, p) => sum + (p.playCount ?? 1), 0);
}

/** Authoritative play count: the larger of the DB sum and the local
 * cache, so neither source can hide progress from the other. */
export function resolveAssignmentPlays(
  uid: string | undefined,
  assignmentId: string,
  progress: ProgressData[],
): number {
  const fromDb = sumPlayCountFromProgress(progress, assignmentId);
  const fromLs = readAssignmentPlays(uid, assignmentId);
  return Math.max(fromDb, fromLs);
}
