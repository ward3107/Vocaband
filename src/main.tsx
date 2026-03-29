import {StrictMode} from 'react';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { supabase } from './core/supabase';

registerSW();

// Exchange PKCE auth code BEFORE React mounts.  We must await this so the
// lock is released before onAuthStateChange tries to acquire it — otherwise
// they fight for 5 seconds, onAuthStateChange steals the lock, and the
// exchange is aborted (teacher session never established).
async function boot() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    const code = params.get('code')!;
    // Retry the exchange up to 2 times (cold-start / flaky network)
    let succeeded = false;
    for (let attempt = 0; attempt < 3 && !succeeded; attempt++) {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          succeeded = true;
        } else if (error.message?.includes('already used') || error.message?.includes('expired')) {
          // Code consumed or expired — don't retry, just let onAuthStateChange
          // pick up whatever session exists (e.g. from a previous exchange).
          break;
        } else {
          console.warn(`OAuth exchange attempt ${attempt + 1} failed:`, error.message);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      } catch {
        console.warn(`OAuth exchange attempt ${attempt + 1} threw`);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    if (!succeeded) {
      // Only flag as failed if no session exists at all — if a previous
      // exchange already established the session, the user is fine.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sessionStorage.setItem('oauth_exchange_failed', '1');
        await supabase.auth.signOut().catch(() => {});
      }
    }
    window.history.replaceState({}, '', window.location.pathname);
  }

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
