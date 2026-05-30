/**
 * Client helper for the Tier-2 single-round-trip student login
 * (POST /api/student/login on the Fly server, co-located with Supabase
 * in Frankfurt). See docs/login-latency-tier2-proposal.md.
 *
 * Instead of the phone making 3-4 serial transcontinental hops
 * (signInWithPassword → profile → bootstrap), it makes ONE request that
 * terminates at the nearby Cloudflare edge; the server does the hops
 * locally and returns the session tokens + dashboard payload. The caller
 * then runs `supabase.auth.setSession(result.session)` (a LOCAL op) so the
 * resulting session is identical to the direct path.
 *
 * This module is intentionally side-effect-free and does NOT touch the
 * Supabase client or app state — the caller owns setSession + hydration so
 * it can coordinate with App's auth-restore guard (manualLoginInProgress).
 */
import { mapBootstrapResponse, type BootstrapResult } from '../core/bootstrap';

export interface StudentLoginSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
}

export type StudentLoginResult =
  /** Auth succeeded. `bootstrap` is null only if the dashboard RPC failed
   *  server-side — caller still has a valid session and should fall through
   *  to its normal dashboard load. */
  | { kind: 'ok'; session: StudentLoginSession; bootstrap: BootstrapResult | null }
  /** Wrong PIN / unknown account (HTTP 401). Show the "wrong PIN" UX. */
  | { kind: 'invalid' }
  /** Endpoint disabled, server error, or network failure. Caller MUST fall
   *  back to the existing direct-to-Supabase signInWithPassword path. */
  | { kind: 'unavailable' };

export async function studentLoginViaServer(params: {
  email: string;
  pin: string;
  /** User-local YYYY-MM-DD — drives daily-missions / pet rollover. */
  localDate?: string;
}): Promise<StudentLoginResult> {
  const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
  try {
    const res = await fetch(`${apiUrl}/api/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        pin: params.pin,
        localDate: params.localDate ?? null,
      }),
    });

    if (res.status === 401) return { kind: 'invalid' };
    // 503 (not_configured), 5xx, 400 — anything non-OK → fall back.
    if (!res.ok) return { kind: 'unavailable' };

    const json = await res.json().catch(() => null);
    if (!json?.session?.access_token || !json?.session?.refresh_token) {
      return { kind: 'unavailable' };
    }

    return {
      kind: 'ok',
      session: json.session as StudentLoginSession,
      bootstrap: json.bootstrap ? mapBootstrapResponse(json.bootstrap) : null,
    };
  } catch {
    // Network error / CORS / timeout — fall back to the direct path.
    return { kind: 'unavailable' };
  }
}
