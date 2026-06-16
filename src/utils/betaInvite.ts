/**
 * Beta invite code — tiny localStorage bridge.
 *
 * A beta tester arrives via a shared link like
 *   https://www.vocaband.com/?invite=VOCABAND-BETA
 * or types the code into the teacher login card. Either way we stash it in
 * localStorage BEFORE the OAuth redirect (which drops the query string), so
 * the post-sign-in restore (useAuthRestore) can redeem it with the backend
 * `redeem_beta_invite` RPC and self-grant teacher access.
 *
 * Deliberately framework-free and side-effect-free at import time so it's safe
 * to call from the public shell, the login card, and the auth-restore hook.
 */

const KEY = "vocaband_beta_invite";
const PARAM = "invite";

/** Normalize so the link, the typed value, and the DB all agree. */
function normalize(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Grab `?invite=CODE` from the current URL into localStorage, then strip it
 * from the address bar (so it doesn't linger in history / share links).
 * Idempotent — safe to call on every mount. Returns the captured code, if any.
 */
export function captureInviteFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(PARAM);
    if (!raw) return null;
    const code = normalize(raw);
    if (code.length < 4) return null;
    localStorage.setItem(KEY, code);
    url.searchParams.delete(PARAM);
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    return code;
  } catch {
    return null;
  }
}

export function setPendingInvite(code: string): void {
  try {
    const c = normalize(code);
    if (c.length >= 4) localStorage.setItem(KEY, c);
  } catch { /* private mode / quota — non-critical */ }
}

export function getPendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Read and clear in one go — used once at redemption time. */
export function takePendingInvite(): string | null {
  const code = getPendingInvite();
  clearPendingInvite();
  return code;
}

export function clearPendingInvite(): void {
  try { localStorage.removeItem(KEY); } catch { /* non-critical */ }
}
