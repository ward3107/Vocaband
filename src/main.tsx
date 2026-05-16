import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.tsx';
import { runSafariDiagnostics } from './utils/safariDiagnostics';
import './index.css';

// Tiny pre-Sentry error buffer.
//
// Sentry's import is deferred to after first paint (see loadSentryDeferred
// below) so its ~41 kB gz chunk stays off the critical DCL path. The
// few-hundred-ms gap between page boot and Sentry loading is covered by
// these listeners: any window error or unhandled rejection fires before
// React mounts gets queued, then drained the moment Sentry's
// captureException is available.
//
// The buffer is bounded (10 events) so a runaway throw loop can't grow
// unboundedly while we're waiting on idle.
type BufferedEvent =
  | { kind: 'error'; error: unknown; message?: string; source?: string; lineno?: number; colno?: number }
  | { kind: 'rejection'; reason: unknown };
const errorBuffer: BufferedEvent[] = [];
const MAX_BUFFERED_ERRORS = 10;
let sentryLoaded = false;

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (sentryLoaded) return;
    if (errorBuffer.length >= MAX_BUFFERED_ERRORS) return;
    errorBuffer.push({
      kind: 'error',
      error: event.error,
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (sentryLoaded) return;
    if (errorBuffer.length >= MAX_BUFFERED_ERRORS) return;
    errorBuffer.push({ kind: 'rejection', reason: event.reason });
  });
}

/** Dynamic-import Sentry after first paint and replay any buffered errors. */
function loadSentryDeferred() {
  if (typeof window === 'undefined') return;

  const schedule = (cb: () => void): void => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(cb, { timeout: 3000 });
    } else {
      setTimeout(cb, 800);
    }
  };

  schedule(async () => {
    try {
      const sentry = await import('./core/sentry');
      sentry.initSentry();
      sentryLoaded = true;
      // Drain the pre-load buffer.
      for (const ev of errorBuffer) {
        try {
          if (ev.kind === 'error') {
            const err = ev.error instanceof Error ? ev.error : new Error(ev.message || 'pre-sentry error');
            sentry.reportError(err, { source: ev.source, lineno: ev.lineno, colno: ev.colno });
          } else {
            const reason = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason ?? 'unhandled rejection'));
            sentry.reportError(reason, { type: 'unhandledrejection' });
          }
        } catch { /* best-effort */ }
      }
      errorBuffer.length = 0;
      sentry.addReplayIntegrationLazy();
      sentry.addBrowserTracingLazy();
    } catch {
      // Sentry chunk failed to load (blocked CDN, offline, CSP). Not
      // app-critical — keep going without it.
    }
  });
}

// Apply the teacher's saved display scale BEFORE React renders, so
// the first paint already uses the right rem base.  Without this,
// teachers who picked "large" see a brief flash of normal-size UI on
// every page load while the React component mounts and re-applies.
try {
  const v = localStorage.getItem('vocaband_ui_scale');
  const px = v === 'large' ? 19 : v === 'xlarge' ? 22 : null;
  if (px !== null) {
    document.documentElement.style.setProperty('font-size', `${px}px`, 'important');
    document.documentElement.style.setProperty('--a11y-font-size', `${px}px`);
  }
} catch { /* localStorage unavailable — keep Tailwind default */ }

// Surface a top banner if a critical browser API is missing (Safari
// Private Browsing, third-party cookies disabled, WebSocket blocked).
// Teachers reported "the game doesn't work on Safari" with no DevTools
// access on iPad/iPhone — this gives them a readable cause instead of a
// blank screen. Must run before React mounts so it's visible even if
// the app crashes on boot.
runSafariDiagnostics();

// Service Worker registrar + kill switch.
//
// History note: an earlier PWA attempt cached index.html too aggressively
// and left returning users on a stale shell that pointed at JS chunks the
// server no longer had — white screen.  This re-enable uses a safer
// NetworkFirst strategy for the HTML shell (see vite.config.ts).  The
// kill switch below exists specifically so a teacher on a misbehaving
// device can recover by visiting https://vocaband.com/?unregisterSW=1:
// we tear down every registration + every cache + hard-reload.  No app
// code or support call required.
async function manageServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const params = new URLSearchParams(window.location.search);
  if (params.has('unregisterSW')) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if (typeof caches !== 'undefined') {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch { /* best-effort */ }
    // Strip the query param and hard-reload so the user lands on a
    // SW-free, cache-free page.
    window.location.replace(window.location.origin + window.location.pathname);
    return;
  }

  // Register the SW generated by vite-plugin-pwa.  We intentionally use
  // registerType:'autoUpdate' in the plugin config so a new SW takes
  // over on the next navigation — users don't have to click an 'update'
  // button.  The page they're currently on keeps running the old
  // version; the next navigation gets the new one.
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch { /* not critical — app still works without SW */ }
}

const App = lazy(() => import('./App.tsx'));
// AccessibilityWidget is lazy too — it doesn't render anything on
// public pages until the user interacts, so keeping it in the entry
// chunk (with its motion/lucide deps) was pure dead weight on first
// paint.  The widget's own initial state (`currentView === ''`)
// already shows the trigger on landing, so missing the first
// 'vocaband-view-change' event is harmless: the next view change
// reaches it via the window event listener.
const AccessibilityWidget = lazy(() =>
  import('./components/AccessibilityWidget').then(m => ({ default: m.AccessibilityWidget })),
);

const Loading = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui',color:'#666'}}>
    Loading Vocaband...
  </div>
);

// Supabase's auth URL whitelist contains `https://vocaband.com/**` but not
// the `www.` host, and the Site URL is the apex.  If OAuth is started from
// `www.vocaband.com`, Supabase silently rewrites `redirectTo` to the apex
// Site URL, so the `?code=` returns to a different origin than the one that
// wrote the PKCE `code_verifier` into localStorage.  The exchange then fails
// silently and the teacher has to click "Teacher Login" a second time — the
// "login twice on mobile" bug.
//
// Canonicalizing www → apex before bootstrap runs keeps the entire OAuth
// flow on a single origin so localStorage (and the PKCE verifier) stays
// consistent across the round-trip to Google.
function canonicalizeHost(): boolean {
  if (window.location.hostname === 'www.vocaband.com') {
    window.location.replace(
      'https://vocaband.com' +
        window.location.pathname +
        window.location.search +
        window.location.hash,
    );
    return true;
  }
  return false;
}

// PKCE code exchange — MUST complete before React renders, otherwise the
// onAuthStateChange INITIAL_SESSION event fires with no session and the
// teacher sees the landing page again (the infamous "login twice" bug).
async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    const { supabase } = await import('./core/supabase');
    const code = params.get('code')!;
    let sessionReady = false;
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session?.user) {
        sessionReady = true;
      } else {
        // Exchange returned an error or no session in response.  Common
        // causes: "already used" (code consumed by a previous mount),
        // slow storage sync on mobile.  Poll getSession() briefly to
        // see if the session materialises anyway — often it does.
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 150));
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) { sessionReady = true; break; }
          } catch { /* retry */ }
        }
      }
    } catch {
      // Network/exchange threw — still try to find an existing session
      // before declaring the login failed.
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 150));
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) { sessionReady = true; break; }
        } catch { /* retry */ }
      }
    }
    sessionStorage.setItem(
      sessionReady ? 'oauth_session_ready' : 'oauth_exchange_failed',
      '1'
    );
    // Clear the ?code= query param so a page refresh doesn't re-trigger
    // the (now-consumed) exchange and so routing logic doesn't see it.
    window.history.replaceState({}, '', window.location.pathname);
  }

  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <App />
        <Suspense fallback={null}>
          <AccessibilityWidget />
        </Suspense>
      </Suspense>
    </ErrorBoundary>,
  );

  // Register the Service Worker after React has started rendering, so SW
  // install work can't compete with the first paint.  Fire-and-forget —
  // SW failures must never block the app.
  void manageServiceWorker();

  // Dynamic-import Sentry (+init, replay, browserTracing) after first
  // paint — keeps the ~41 kB gz @sentry/react chunk off the DCL critical
  // path. The window listeners installed above buffer anything that
  // throws in the gap so nothing is lost. See loadSentryDeferred above.
  loadSentryDeferred();
}

// If we're redirecting to the canonical host, let the navigation tear the
// page down — do not kick off bootstrap (it would race the redirect and
// potentially consume the `?code=` on the wrong origin).
if (!canonicalizeHost()) {
  bootstrap();
}
