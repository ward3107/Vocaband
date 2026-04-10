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
      // PKCE codes are single-use, so retrying the exchange with the same
      // code always fails. If the exchange failed, flag it so App.tsx can
      // show a toast and let the teacher retry from a fresh OAuth redirect.
      if (error && !error.message?.includes('already used') && !error.message?.includes('expired')) {
        sessionStorage.setItem('oauth_exchange_failed', '1');
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
