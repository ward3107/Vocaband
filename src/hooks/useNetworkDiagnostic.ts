import { useCallback, useState } from 'react';
import { supabaseUrl, supabaseAnonKey } from '../core/supabase';

// Teacher-facing diagnostic that probes the exact paths the app depends on,
// so when a school's network is misbehaving the teacher gets a concrete
// "X is reachable, Y is not" report instead of a generic "something broke".
//
// Each probe does the *real* thing the app does, not a synthetic substitute,
// so a "pass" here means the corresponding feature will work right now:
//
//   1. Internet (general)   GET cloudflareinsights.com via no-cors — proves
//                           the device can reach a known-public host on a
//                           different domain than vocaband.com.  Picked
//                           cloudflareinsights.com because it's already in
//                           the CSP connect-src allowlist, so no security
//                           policy change is needed.  no-cors lets *any*
//                           response (even 404) count as a network success
//                           — what we care about is the TCP/TLS handshake,
//                           not the HTTP body.
//
//   2. Vocaband server      GET /api/health — Cloudflare Worker → Fly.io.
//                           Fails when the school filter blocks our domain
//                           or the Fly machine is sleeping past its boot
//                           grace.
//
//   3. Student & class data POST-equivalent fetch to /auth/v1/health with
//                           the apikey + Authorization Bearer headers the
//                           real Supabase client sends.  The previous
//                           implementation sent no headers and got 401
//                           back from healthy Supabase deployments —
//                           that's the false-positive BLOCKED state seen
//                           on real school Wi-Fi.
//
//   4. Live game server     wss://<host>/socket.io/ handshake.  Probes the
//                           full WebSocket upgrade — the high-signal check
//                           for schools, since many filtering proxies
//                           silently drop WS while allowing HTTPS.
//
// All probes share an 8s timeout so a slow proxy can complete its
// handshake without us cutting it off prematurely (6s was borderline on
// real school Wi-Fi).

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

const PROBE_TIMEOUT_MS = 8000;

// External-internet ping target.  Already in the prod CSP connect-src so
// adding this probe does not require a security-policy change.  no-cors
// mode bypasses CORS preflight entirely — we don't need to read the body,
// only learn whether the request completed at the network layer.
const INTERNET_PING_URL = 'https://cloudflareinsights.com/cdn-cgi/rum';

interface FetchOptions {
  headers?: Record<string, string>;
  mode?: RequestMode;
}

function fetchWithTimeout(url: string, timeoutMs: number, opts: FetchOptions = {}): Promise<Response> {
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
      ...opts,
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

async function probeInternet(): Promise<CheckStatus> {
  // OS-level signal is a fast negative.  When it says online we still do
  // the real ping below — `navigator.onLine === true` is unreliable in
  // captive-portal and "router up, WAN down" scenarios.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'fail';
  try {
    await fetchWithTimeout(INTERNET_PING_URL, PROBE_TIMEOUT_MS, { mode: 'no-cors' });
    return 'pass';
  } catch {
    return 'fail';
  }
}

async function probeApi(): Promise<CheckStatus> {
  try {
    const res = await fetchWithTimeout('/api/health', PROBE_TIMEOUT_MS);
    return res.ok ? 'pass' : 'fail';
  } catch {
    return 'fail';
  }
}

async function probeSupabase(): Promise<CheckStatus> {
  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`;
    const res = await fetchWithTimeout(url, PROBE_TIMEOUT_MS, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    return res.ok ? 'pass' : 'fail';
  } catch {
    return 'fail';
  }
}

function probeWebSocket(timeoutMs: number): Promise<CheckStatus> {
  return new Promise(resolve => {
    if (typeof WebSocket === 'undefined') {
      resolve('fail');
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
        resolve('fail');
      }, timeoutMs);
      ws.onopen = () => {
        window.clearTimeout(timer);
        try { ws.close(); } catch { /* ignore */ }
        resolve('pass');
      };
      ws.onerror = () => {
        window.clearTimeout(timer);
        resolve('fail');
      };
    } catch {
      resolve('fail');
    }
  });
}

export function useNetworkDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult>(INITIAL);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResult({ online: 'running', api: 'running', database: 'running', websocket: 'running' });

    // Fire all four probes concurrently — each has its own timeout, so the
    // slowest one bounds the modal's "Checking…" duration rather than the
    // sum.  Promise.all because no probe depends on another.
    const [online, api, database, websocket] = await Promise.all([
      probeInternet(),
      probeApi(),
      probeSupabase(),
      probeWebSocket(PROBE_TIMEOUT_MS),
    ]);

    setResult({ online, api, database, websocket });
    setRunning(false);
  }, []);

  return { result, running, run };
}
