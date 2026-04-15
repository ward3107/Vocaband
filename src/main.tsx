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

bootstrap();
