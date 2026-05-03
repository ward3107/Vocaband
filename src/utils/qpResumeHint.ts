/**
 * Shared helpers for the Quick Play resume hint living in
 * localStorage at `vocaband_qp_guest`.
 *
 * The hint is written by QuickPlayStudentView on first join + every
 * score-update tick (App.tsx emitScoreUpdate).  Two consumers read it:
 *   - QuickPlayResumeBanner — the "Welcome back!" landing-page card.
 *   - The resume restore path — App.tsx's qpCumulativeScoreRef
 *     initializer + QuickPlayStudentView's applyJoinedState helper —
 *     which lifts the prior cumulative score back into local state
 *     so a re-joined kid keeps playing forward instead of falling
 *     behind the server's monotonic-score gate.
 *
 * 90-min TTL: stale hints are reported as null + the storage entry
 * is wiped, so we never restore a score that the teacher has surely
 * already ended.
 */

const STORAGE_KEY = "vocaband_qp_guest";
const TTL_MS = 90 * 60 * 1000;

export interface QpResumeHint {
  sessionId?: string;
  sessionCode?: string;
  name?: string;
  avatar?: string;
  /** Most-recent cumulative score the client has emitted. */
  lastScore?: number;
  /** ms epoch — refreshed on every score update so an active player's
   *  TTL keeps rolling forward. */
  joinedAt?: number;
}

/** Read the resume hint, returning null if missing, malformed, or
 *  stale (older than 90 min).  Stale hints are wiped from storage so
 *  subsequent reads short-circuit. */
export function readQpResumeHint(): QpResumeHint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QpResumeHint;
    if (!parsed.sessionCode || !parsed.name) return null;
    if (typeof parsed.joinedAt !== "number") return null;
    if (Date.now() - parsed.joinedAt > TTL_MS) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Read just the score field, returning 0 if no valid hint exists.
 *  Caller can pass an optional sessionCode to require an exact match
 *  (so a resume hint from another session doesn't bleed in). */
export function readQpResumeScore(sessionCode?: string): number {
  const hint = readQpResumeHint();
  if (!hint) return 0;
  if (sessionCode && hint.sessionCode !== sessionCode) return 0;
  if (typeof hint.lastScore !== "number" || hint.lastScore < 0) return 0;
  return hint.lastScore;
}
