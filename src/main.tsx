import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Yield to browser between heavy module evaluations
const tick = () => new Promise<void>(r => setTimeout(r, 0));

async function boot() {
  // Pre-load heavy dependencies one at a time, yielding between each.
  // This mirrors the diagnostic test that worked without freezing.
  // Once cached, import('./App') resolves instantly.
  await import('./data/vocabulary');      await tick();  // ~450ms
  await import('./data/sentence-bank');   await tick();  // ~250ms
  await import('lucide-react');           await tick();  // ~480ms
  await import('motion/react');           await tick();  // ~290ms
  await import('./core/supabase');        await tick();  // ~300ms
  await import('./components/QuickPlayMonitor');  await tick();
  await import('./components/FloatingButtons');   await tick();
  await import('./components/CookieBanner');      await tick();
  await import('./components/CreateAssignmentWizard'); await tick();

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
          if (!error) { succeeded = true; }
          else if (error.message?.includes('already used') || error.message?.includes('expired')) { break; }
          else { if (attempt < 1) await new Promise(r => setTimeout(r, 1000)); }
        } catch { if (attempt < 1) await new Promise(r => setTimeout(r, 1000)); }
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
  } catch (err) { console.error('Boot error:', err); }

  // All heavy modules are cached — this import is now instant
  const { default: App } = await import('./App');
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
