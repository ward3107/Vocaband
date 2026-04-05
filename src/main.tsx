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
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      const code = params.get('code')!;
      // Exchange PKCE code for session. Retry once on transient failure.
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
  } catch (err) {
    console.error('Boot PKCE exchange error:', err);
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
