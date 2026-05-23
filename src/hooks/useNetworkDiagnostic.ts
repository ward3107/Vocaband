import { useCallback, useState } from 'react';

// Teacher-facing diagnostic that probes the exact paths the app depends on,
// so when a school's network is misbehaving the teacher gets a concrete
// "X is reachable, Y is not" report instead of a generic "something broke".
//
// Four checks:
//   1. browser online flag        — quick sanity
//   2. Vocaband REST API          — Cloudflare Worker → Fly.io
//   3. Supabase (auth/db)         — auth.vocaband.com custom domain
//   4. Live game socket           — WebSocket on the same edge
//
// Each runs independently with its own timeout so one slow probe doesn't
// stall the rest.  The WebSocket probe is the high-signal one for schools
// — many filtering proxies allow HTTP/HTTPS but silently drop WS upgrades.

export type CheckStatus = 'idle' | 'running' | 'pass' | 'fail';

export interface DiagnosticResult {
  online: CheckStatus;
  api: CheckStatus;
  database: CheckStatus;
  websocket: CheckStatus;
}

const INITIAL: DiagnosticResult = {
  online: 'idle',
  api: 'idle',
  database: 'idle',
  websocket: 'idle',
};

const PROBE_TIMEOUT_MS = 6000;

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = window.setTimeout(() => {
      if (ctrl) ctrl.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
    fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl?.signal,
    })
      .then(r => {
        window.clearTimeout(timer);
        resolve(r);
      })
      .catch(err => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

function probeWebSocket(timeoutMs: number): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof WebSocket === 'undefined') {
      resolve(false);
      return;
    }
    try {
      // Hit the socket.io engine handshake directly so we don't need a
      // valid auth token — any 101 Switching Protocols response proves
      // the WS upgrade is allowed by the school's firewall.
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/socket.io/?EIO=4&transport=websocket`;
      const ws = new WebSocket(url);
      const timer = window.setTimeout(() => {
        try { ws.close(); } catch { /* ignore */ }
        resolve(false);
      }, timeoutMs);
      ws.onopen = () => {
        window.clearTimeout(timer);
        try { ws.close(); } catch { /* ignore */ }
        resolve(true);
      };
      ws.onerror = () => {
        window.clearTimeout(timer);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

function readSupabaseUrl(): string {
  const env = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  if (env.length > 0) return env;
  return 'https://auth.vocaband.com';
}

export function useNetworkDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult>(INITIAL);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResult({ online: 'running', api: 'running', database: 'running', websocket: 'running' });

    const onlineOk: CheckStatus = (typeof navigator !== 'undefined' && navigator.onLine !== false) ? 'pass' : 'fail';
    setResult(prev => ({ ...prev, online: onlineOk }));

    const apiPromise = fetchWithTimeout('/api/health', PROBE_TIMEOUT_MS)
      .then(r => (r.ok ? 'pass' : 'fail') as CheckStatus)
      .catch(() => 'fail' as CheckStatus);

    // Supabase exposes /auth/v1/health publicly — returns 200 with no auth.
    const supabaseUrl = readSupabaseUrl().replace(/\/$/, '');
    const dbPromise = fetchWithTimeout(`${supabaseUrl}/auth/v1/health`, PROBE_TIMEOUT_MS)
      .then(r => (r.ok ? 'pass' : 'fail') as CheckStatus)
      .catch(() => 'fail' as CheckStatus);

    const wsPromise = probeWebSocket(PROBE_TIMEOUT_MS)
      .then(ok => (ok ? 'pass' : 'fail') as CheckStatus);

    const [apiStatus, dbStatus, wsStatus] = await Promise.all([apiPromise, dbPromise, wsPromise]);

    setResult({ online: onlineOk, api: apiStatus, database: dbStatus, websocket: wsStatus });
    setRunning(false);
  }, []);

  return { result, running, run };
}
