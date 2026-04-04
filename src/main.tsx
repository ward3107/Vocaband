import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import { Loader2 } from 'lucide-react';

// Dynamic imports — keeps the browser responsive during the ~5s module load
const App = lazy(() => import('./App'));
const AccessibilityWidget = lazy(() => import('./components/AccessibilityWidget').then(m => ({ default: m.AccessibilityWidget })));
const ErrorBoundary = lazy(() => import('./ErrorBoundary'));

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-100">
    <Loader2 className="animate-spin text-blue-700" size={48} />
  </div>
);

async function boot() {
  try {
    // Exchange PKCE auth code BEFORE React mounts
    const { supabase } = await import('./core/supabase');
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      const code = params.get('code')!;
      let succeeded = false;
      for (let attempt = 0; attempt < 2 && !succeeded; attempt++) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            succeeded = true;
          } else if (error.message?.includes('already used') || error.message?.includes('expired')) {
            break;
          } else {
            console.warn(`OAuth exchange attempt ${attempt + 1} failed:`, error.message);
            if (attempt < 1) await new Promise(r => setTimeout(r, 1000));
          }
        } catch {
          console.warn(`OAuth exchange attempt ${attempt + 1} threw`);
          if (attempt < 1) await new Promise(r => setTimeout(r, 1000));
        }
      }
      if (!succeeded) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          sessionStorage.setItem('oauth_exchange_failed', '1');
          await supabase.auth.signOut().catch(() => {});
        }
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch (err) {
    console.error('Boot error (rendering app anyway):', err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Suspense fallback={<LoadingScreen />}>
        <ErrorBoundary>
          <App />
          <AccessibilityWidget />
        </ErrorBoundary>
      </Suspense>
    </StrictMode>,
  );
}

boot();
