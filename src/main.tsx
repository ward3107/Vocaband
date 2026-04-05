import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

// Lazy-load the heavy App component so the page doesn't freeze
const App = lazy(() => import('./App.tsx'));
const AccessibilityWidget = lazy(() => import('./components/AccessibilityWidget').then(m => ({ default: m.AccessibilityWidget })));

// PKCE code exchange — runs in parallel, doesn't block render
(async function exchangePKCE() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return;
  try {
    const { supabase } = await import('./core/supabase');
    const code = params.get('code')!;
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error && !error.message?.includes('already used') && !error.message?.includes('expired')) {
      await new Promise(r => setTimeout(r, 1000));
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch {
    try {
      const { supabase } = await import('./core/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sessionStorage.setItem('oauth_exchange_failed', '1');
        await supabase.auth.signOut().catch(() => {});
      }
    } catch {}
  }
  window.history.replaceState({}, '', window.location.pathname);
})().catch(err => console.error('PKCE error:', err));

// Loading fallback while App chunk downloads
const LoadingFallback = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui,sans-serif',fontSize:'1.2rem',color:'#666'}}>
    Loading Vocaband...
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <App />
        <AccessibilityWidget />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
