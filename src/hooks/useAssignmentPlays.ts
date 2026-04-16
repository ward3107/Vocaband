/**
 * Assignment replay counter — tracks how many games a student has
 * completed per assignment, scoped per-user in localStorage.
 *
 * Why localStorage?  The progress table upserts one row per (assignment,
 * mode, student) — it stores the best score per mode but not how many
 * times that mode was played.  Rather than add a schema migration just
 * for the anti-farm cap, we track totals on the client.  The cap is a
 * UX feature (stops students farming easy modes for XP), not a security
 * one, so losing state on a device switch is acceptable.
 *
 * Semantics (user-approved):
 *   - One "round" = completed every allowed mode once.
 *   - MAX_ASSIGNMENT_ROUNDS (3) rounds = assignment locked.
 *   - So total allowed plays = MAX_ASSIGNMENT_ROUNDS × allowedModes.length.
 *   - After the lock, subsequent games grant ZERO XP.
 */
import { MAX_ASSIGNMENT_ROUNDS } from '../constants/game';

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
