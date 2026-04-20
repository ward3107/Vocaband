import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

const App = lazy(() => import('./App.tsx'));
const AccessibilityWidget = lazy(() =>
  import('./components/AccessibilityWidget').then(m => ({ default: m.AccessibilityWidget }))
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
        <AccessibilityWidget />
      </Suspense>
    </ErrorBoundary>,
  );
}

// Prerender short-circuit: the post-build `scripts/prerender.ts` runs a
// headless Chrome against the built SPA with a custom UA so we can
// skip the PKCE exchange + www→apex redirect.  During prerender we
// just mount React straight away so the landing page tree paints and
// can be captured.  Detected by UA, not env, because Vite builds the
// bundle once and the same JS runs in both prerender and production.
const isPrerender =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.includes('VocabandPrerender');

if (isPrerender) {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <App />
        <AccessibilityWidget />
      </Suspense>
    </ErrorBoundary>,
  );
} else if (!canonicalizeHost()) {
  // If we're redirecting to the canonical host, let the navigation tear the
  // page down — do not kick off bootstrap (it would race the redirect and
  // potentially consume the `?code=` on the wrong origin).
  bootstrap();
}
