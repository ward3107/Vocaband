/**
 * oauthIntent — persistent storage helpers for the two "intent"
 * flags the app stamps before redirecting to Google OAuth:
 *
 *   - `oauth_intended_class_code` — the class code a student typed
 *     on the login screen.  We need it back after the Google round-
 *     trip so returning students can switch classes without retyping
 *     and first-timers can be routed through the pending-approval
 *     flow for the right class.  Written by StudentAccountLoginView,
 *     read + cleared by App.tsx's auth restoreSession.
 *
 *   - `oauth_intended_role` — set when the teacher pressed "Log in
 *     as Teacher".  Without this, a Google account that happens to
 *     have a student profile would silently drop the user into the
 *     student dashboard even though they pressed the teacher
 *     button.  The guard in restoreSession reads the intent and
 *     refuses the login when the DB profile doesn't match.  Stale
 *     flags older than TEN_MINUTES_MS are treated as not-set.
 *
 * Both flags are mirrored to BOTH sessionStorage and localStorage:
 * Google OAuth has been observed to wipe sessionStorage on some
 * mobile browsers, so the localStorage copy is a fallback that
 * survives the redirect.
 *
 * All functions are try/catch-wrapped — if storage is unavailable
 * (private mode / ITP / quota) we silently no-op rather than
 * breaking the auth flow.
 */

const CLASS_CODE_KEY = 'oauth_intended_class_code';
const ROLE_KEY = 'oauth_intended_role';
const ROLE_AT_KEY = 'oauth_intended_role_at';
const ROLE_FRESHNESS_MS = 10 * 60 * 1000;

// ─── Class-code intent ────────────────────────────────────────────────

/** Read the stashed intended class code.  Prefers sessionStorage,
 *  falls back to localStorage if sessionStorage was wiped.  Returns
 *  null if neither has a value or storage is unavailable. */
export function readIntendedClassCode(): string | null {
  try {
    const s = sessionStorage.getItem(CLASS_CODE_KEY);
    if (s) return s;
  } catch { /* sessionStorage unavailable */ }
  try {
    return localStorage.getItem(CLASS_CODE_KEY);
  } catch { /* localStorage unavailable */ }
  return null;
}

/** Stash the student's typed class code before the Google redirect.
 *  Writes to both storages.  Passing an empty/blank string clears
 *  any existing value. */
export function writeIntendedClassCode(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) {
    clearIntendedClassCode();
    return;
  }
  try { sessionStorage.setItem(CLASS_CODE_KEY, trimmed); } catch {}
  try { localStorage.setItem(CLASS_CODE_KEY, trimmed); } catch {}
}

/** Clear the intended class code from both storages.  Call after the
 *  class-switch flow has consumed it so subsequent logins don't
 *  re-trigger. */
export function clearIntendedClassCode(): void {
  try { sessionStorage.removeItem(CLASS_CODE_KEY); } catch {}
  try { localStorage.removeItem(CLASS_CODE_KEY); } catch {}
}

// ─── Role intent ──────────────────────────────────────────────────────

export interface IntendedRole {
  /** The role the user clicked on the landing page. */
  role: string;
  /** True if the intent is still within the freshness window. */
  fresh: boolean;
}

/** Read the intended role flag + freshness.  Returns null if the
 *  flag is absent or storage is unavailable. */
export function readIntendedRole(): IntendedRole | null {
  try {
    const role = sessionStorage.getItem(ROLE_KEY);
    if (!role) return null;
    const at = Number(sessionStorage.getItem(ROLE_AT_KEY) || 0);
    const fresh = at > 0 && (Date.now() - at) < ROLE_FRESHNESS_MS;
    return { role, fresh };
  } catch {
    return null;
  }
}

/** Stash the intended role (only the teacher button uses this today)
 *  along with a timestamp used for freshness gating. */
export function writeIntendedRole(role: string): void {
  try {
    sessionStorage.setItem(ROLE_KEY, role);
    sessionStorage.setItem(ROLE_AT_KEY, String(Date.now()));
  } catch { /* storage unavailable — absent flag falls back to legacy behavior */ }
}

/** Clear the intended role from sessionStorage.  Call after the
 *  guard has used it so the next login starts fresh. */
export function clearIntendedRole(): void {
  try {
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(ROLE_AT_KEY);
  } catch {}
}
