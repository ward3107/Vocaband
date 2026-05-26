/**
 * Synchronous, best-effort check for whether an auth session could
 * possibly be restored on this mount.  Runs inside App's
 * useState(loading) initializer so a fresh visitor with no session skips
 * the auth-restore spinner entirely and the public landing paints on the
 * first frame instead of waiting on supabase.auth.getSession().
 *
 * Mirrors the runtime branches in useAuthRestore: a Supabase auth token
 * in localStorage, an in-flight OAuth callback / exchange, or a persisted
 * student / pending-approval login.  If none are present there is nothing
 * to restore, so `loading` can start `false`.
 *
 * Conservative by design: any uncertainty (storage throws, unexpected
 * state) returns `true` so we fall back to the existing spinner-then-
 * restore flow rather than risk flashing the landing page to a user who
 * actually has a session.
 */
export function hasRestorableSession(): boolean {
  try {
    // OAuth redirect in progress (PKCE `?code=` or implicit `#access_token=`).
    if (
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=')
    ) return true;

    // OAuth exchange flags set by main.tsx's bootstrap().
    if (
      sessionStorage.getItem('oauth_session_ready') ||
      sessionStorage.getItem('oauth_exchange_failed')
    ) return true;

    // Persisted student login / pending-approval handoff.
    if (
      localStorage.getItem('vocaband_student_login') ||
      sessionStorage.getItem('vocaband_pending_approval')
    ) return true;

    // Supabase persists its session under a key shaped like
    // `sb-<project-ref>-auth-token`.  Its mere presence means there may be
    // a session to restore (it could be expired — we still defer to the
    // real restore in that case rather than guess).
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return true;
      }
    }

    return false;
  } catch {
    // localStorage/sessionStorage unavailable (Safari Private Mode, etc.)
    // — fall back to the safe spinner-then-restore path.
    return true;
  }
}
