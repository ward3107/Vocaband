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
    try {
      const { supabase } = await import('./core/supabase');
      const code = params.get('code')!;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error && !error.message?.includes('already used') && !error.message?.includes('expired')) {
        sessionStorage.setItem('oauth_exchange_failed', '1');
      } else if (!error) {
        // Signal to App.tsx that the PKCE exchange just succeeded.
        // App.tsx will see this flag and keep the loading spinner instead
        // of flashing the landing page while the session propagates.
        // Without this, the race between history.replaceState (which
        // strips ?code=) and INITIAL_SESSION (which checks for ?code=)
        // causes the teacher to see the landing page on every first login.
        sessionStorage.setItem('oauth_session_ready', '1');
      }
    } catch {
      sessionStorage.setItem('oauth_exchange_failed', '1');
    }
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
