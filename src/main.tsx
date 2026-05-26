import {Suspense} from 'react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.tsx';
import { runSafariDiagnostics } from './utils/safariDiagnostics';
import { requestPersistentStorage } from './utils/persistStorage';
import { getCookieConsent } from './hooks/useCookieConsent';
import { resolveInitialView } from './utils/resolveInitialView';
import { isPublicView } from './utils/authViews';
import { hasRestorableSession } from './utils/hasRestorableSession';
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

/** Dynamic-import Sentry after first paint and replay any buffered errors.
 *
 *  Idempotent — safe to call multiple times.  Used both from the initial
 *  bootstrap (when the user has already granted analytics consent on a
 *  previous visit) and from the `vocaband:consent-changed` listener
 *  installed below (when the user grants consent during this visit).
 */
let sentryLoadStarted = false;
function loadSentryDeferred() {
  if (typeof window === 'undefined') return;
  if (sentryLoadStarted) return;
  sentryLoadStarted = true;

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
      sentryLoadStarted = false;  // permit retry on next consent change
    }
  });
}

/** Wait for the user to grant analytics consent, then load Sentry.
 *
 *  Called from bootstrap() when the user has NOT yet accepted analytics
 *  cookies.  The pre-Sentry error buffer keeps capturing in the
 *  meantime, so nothing is lost if the user opts in later in the
 *  session — the buffered events drain into Sentry the moment it
 *  initialises.  The listener self-removes after the first opt-in.
 */
function waitForConsentThenLoadSentry() {
  if (typeof window === 'undefined') return;
  const onChange = () => {
    const c = getCookieConsent();
    if (c?.analytics) {
      window.removeEventListener('vocaband:consent-changed', onChange);
      loadSentryDeferred();
    }
  };
  window.addEventListener('vocaband:consent-changed', onChange);
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

  // Auto-update returning visitors.  registerType:'autoUpdate' bakes
  // skipWaiting + clientsClaim into the generated SW, but injectRegister
  // is null (we register manually below), so the *client* half of the
  // autoUpdate flow — reloading the page once the fresh SW takes
  // control — was never wired up.  Without it a returning visitor's
  // first post-deploy navigation renders under the OLD SW (stale shell +
  // old cached chunks, and the pre-fix NetworkFirst-on-query-string
  // handling that chokes on the www→apex redirect for URLs like
  // /?lang=he), so they have to hard-refresh to see the page.  Reload
  // exactly once when control passes to a new SW:
  //   * hadController guard — on a first-ever visit the controller goes
  //     null → SW via clientsClaim, which also fires controllerchange;
  //     skip the reload when there was no prior controller so first
  //     loads don't bounce.
  //   * reloading one-shot — controllerchange can fire more than once;
  //     the flag prevents a reload loop.
  // location.reload() keeps the full URL (incl. ?lang=he) so the
  // visitor's language survives the refresh.
  const hadController = navigator.serviceWorker.controller != null;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  // Register the SW generated by vite-plugin-pwa.  registerType:
  // 'autoUpdate' means a new deploy's SW installs, calls skipWaiting,
  // then clientsClaim — which fires the controllerchange handler above
  // and reloads the open page onto the fresh build.  No 'update' button,
  // and no manual hard refresh, required.
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch { /* not critical — app still works without SW */ }
}

/**
 * Defer SW registration until the page has fully loaded AND the browser
 * is idle.  Previously we registered the SW immediately after createRoot,
 * which meant Workbox's precache install (~1 MB across 24 entries) raced
 * against the dynamic-import chunks the landing page needs to render.
 * On Slow 4G that contention pushed time-to-interactive ~1–2 s later
 * because the bandwidth-limited pipe was carrying SW precache fetches
 * AND the LandingPage chunks AND the below-the-fold lazy sections all
 * at once.
 *
 * Order now: render → fonts swap in → lazy chunks finish → load event
 * fires → idle callback → SW registers → precache runs in the background
 * while the user is reading the hero. First-visit perf wins; returning
 * users were already cached so this delay is invisible to them.
 */
function scheduleServiceWorkerRegistration() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  // The `?unregisterSW=1` kill switch needs to run immediately so a
  // stuck SW doesn't keep serving a broken cache — bypass the deferral.
  if (params.has('unregisterSW')) {
    void manageServiceWorker();
    return;
  }
  const runAfterIdle = () => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(() => { void manageServiceWorker(); }, { timeout: 4000 });
    } else {
      setTimeout(() => { void manageServiceWorker(); }, 1500);
    }
  };
  if (document.readyState === 'complete') {
    runAfterIdle();
  } else {
    window.addEventListener('load', runAfterIdle, { once: true });
  }
}

/**
 * Decide whether to boot into the lightweight public shell (no auth
 * machinery) vs the full app. Only pure logged-out visitors on a public
 * view qualify; anyone with a session, a Quick Play link, or a non-public
 * initial route gets the full App so nothing about the authenticated
 * experience changes. All three checks are synchronous and supabase-free.
 */
function startInPublicShell(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('session')) return false;
    if (hasRestorableSession()) return false;
    return isPublicView(resolveInitialView());
  } catch {
    return false;
  }
}

// Single lazy root whose import target is chosen at first render. Deciding
// inside the dynamic-import factory (rather than a `cond ? <App/> :
// <PublicShell/>` ternary in JSX) keeps the unused half out of the entry's
// STATIC graph — and therefore out of Vite's index.html modulepreload. A
// static <App /> reference would get preloaded regardless of the runtime
// branch, dragging the ~50 kB supabase client back onto the landing.
// PublicShell itself lazy-imports App when a login hands off.
const RootApp = lazyWithRetry(() =>
  startInPublicShell() ? import('./PublicShell.tsx') : import('./App.tsx'),
);

// Dev-only short-circuit: `/dev/student-rtl-preview` renders the
// student-dashboard widgets touched by the 2026-05-24 RTL sweep against
// fake data so the EN / HE / AR layout can be verified without a real
// student login.  Tree-shaken out of production by the
// `import.meta.env.DEV` guard below.
const StudentRtlPreview = lazyWithRetry(() => import('./dev/StudentRtlPreview'));
// Dev-only short-circuit: `/dev/teacher-affordances` mounts the
// teacher-dashboard floating circles + trial banner with fake AppUser
// data so the projector / theme / plan-status surfaces can be
// inspected without logging in as a real teacher.
const TeacherAffordancesPreview = lazyWithRetry(() => import('./dev/TeacherAffordancesPreview'));
// AccessibilityWidget is lazy too — it doesn't render anything on
// public pages until the user interacts, so keeping it in the entry
// chunk (with its motion/lucide deps) was pure dead weight on first
// paint.  The widget's own initial state (`currentView === ''`)
// already shows the trigger on landing, so missing the first
// 'vocaband-view-change' event is harmless: the next view change
// reaches it via the window event listener.
const AccessibilityWidget = lazyWithRetry(() =>
  import('./components/AccessibilityWidget').then(m => ({ default: m.AccessibilityWidget })),
);
// Mounted as a sibling to <App /> (not inside it) so the install gate +
// in-app-browser warning are present in the DOM regardless of which view
// App.tsx returns. Previously they lived inside useAppPreOverlays'
// cookieBannerOverlay, which is only wired into the public + auth-flow
// view sections — post-login dashboards never rendered it, so the gate
// never reached real users.
const GlobalOverlays = lazyWithRetry(() => import('./components/GlobalOverlays'));

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
  // Short class-join link fallback: the Worker normally 302-redirects
  // /j/<CODE> → /student?class=<CODE> at the edge, but a cached SPA
  // shell (offline / Service Worker) or the local dev server never hits
  // the Worker.  Rewrite the path here before React reads the route so
  // resolveInitialView + StudentAccountLoginView see the canonical
  // ?class= form and pre-fill the code.
  const joinMatch = window.location.pathname.match(/^\/j\/([A-Za-z0-9]{3,20})$/);
  if (joinMatch) {
    window.history.replaceState(
      {},
      '',
      `/student?class=${encodeURIComponent(joinMatch[1].toUpperCase())}`,
    );
  }

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

  const devPath = import.meta.env.DEV ? window.location.pathname : '';
  const isStudentRtlPreview = devPath === '/dev/student-rtl-preview';
  const isTeacherAffordancesPreview = devPath === '/dev/teacher-affordances';
  const isDevPreview = isStudentRtlPreview || isTeacherAffordancesPreview;

  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        {isDevPreview ? (
          isTeacherAffordancesPreview ? <TeacherAffordancesPreview /> : <StudentRtlPreview />
        ) : (
          <>
            <RootApp />
            <Suspense fallback={null}>
              <AccessibilityWidget />
            </Suspense>
            <Suspense fallback={null}>
              <GlobalOverlays />
            </Suspense>
          </>
        )}
      </Suspense>
    </ErrorBoundary>,
  );

  // Register the Service Worker AFTER the load event AND the first idle
  // callback, so Workbox's precache install doesn't compete with the
  // landing page's lazy chunks for the limited Slow-4G pipe. The kill
  // switch (`?unregisterSW=1`) still runs immediately inside the
  // scheduler — see scheduleServiceWorkerRegistration above for why.
  scheduleServiceWorkerRegistration();

  // Dynamic-import Sentry (+init, replay, browserTracing) after first
  // paint — keeps the ~41 kB gz @sentry/react chunk off the DCL critical
  // path. The window listeners installed above buffer anything that
  // throws in the gap so nothing is lost. See loadSentryDeferred above.
  //
  // Consent gate: ePrivacy Art. 5(3) + GDPR require explicit opt-in
  // BEFORE telemetry runs.  If the user has already granted analytics
  // consent on a previous visit, fire immediately; otherwise wait for
  // the `vocaband:consent-changed` CustomEvent (emitted by
  // useCookieConsent when the user accepts).  The pre-Sentry error
  // buffer keeps catching events in the meantime — nothing is lost on
  // late opt-in.
  const consent = getCookieConsent();
  if (consent?.analytics) {
    loadSentryDeferred();
  } else {
    waitForConsentThenLoadSentry();
  }

  // Ask the browser to mark our storage as persistent so an Android
  // device running low on disk doesn't wipe the SW cache + IDB queue
  // while a student is mid-lesson. Chrome auto-grants this for
  // installed PWAs; Safari ignores it harmlessly. Best-effort — see
  // utils/persistStorage.ts for the why.
  void requestPersistentStorage();
}

// If we're redirecting to the canonical host, let the navigation tear the
// page down — do not kick off bootstrap (it would race the redirect and
// potentially consume the `?code=` on the wrong origin).
if (!canonicalizeHost()) {
  bootstrap();
}
