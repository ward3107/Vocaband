import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Yield to the browser event loop so it stays responsive
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

async function boot() {
  // Show loading spinner immediately
  const root = document.getElementById('root')!;

  // Pre-load heavy modules sequentially, yielding between each
  // so the browser stays responsive (each takes ~250-450ms)
  await import('./data/vocabulary');
  await yieldToMain();
  await import('lucide-react');
  await yieldToMain();
  await import('motion/react');
  await yieldToMain();

  // Now load App — its heavy dependencies are already cached
  const { default: App } = await import('./App');
  await yieldToMain();
  const { AccessibilityWidget } = await import('./components/AccessibilityWidget');
  const { default: ErrorBoundary } = await import('./ErrorBoundary');

  // PKCE code exchange
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

  // Render the app
  createRoot(root).render(
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
