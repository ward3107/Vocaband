import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

async function boot() {
  // PKCE code exchange (if returning from OAuth)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      const { supabase } = await import('./core/supabase');
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
    console.error('Boot error:', err);
  }

  // Pre-load vocabulary data (494KB) in its own chunk, then yield
  // so the browser stays responsive before loading App (457KB)
  await import('./data/vocabulary');
  await new Promise(r => setTimeout(r, 0));
  const { default: App } = await import('./App');
  await new Promise(r => setTimeout(r, 0));
  const { AccessibilityWidget } = await import('./components/AccessibilityWidget');
  const { default: ErrorBoundary } = await import('./ErrorBoundary');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <>
          <App />
          <AccessibilityWidget />
        </>
      </ErrorBoundary>
    </StrictMode>,
  );
}

boot();
