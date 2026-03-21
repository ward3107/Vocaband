import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { supabase } from './supabase.ts';

registerSW();

// Exchange PKCE auth code BEFORE React mounts.  We must await this so the
// lock is released before onAuthStateChange tries to acquire it — otherwise
// they fight for 5 seconds, onAuthStateChange steals the lock, and the
// exchange is aborted (teacher session never established).
async function boot() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(params.get('code')!);
      if (error) {
        // Exchange failed (expired code, missing verifier, etc.).
        // Store a flag so App can show a helpful message instead of
        // silently dumping the teacher on the landing page.
        console.error('OAuth code exchange failed:', error.message);
        sessionStorage.setItem('oauth_exchange_failed', '1');
      }
    } catch {
      // Network error or code already consumed (e.g. back-button replay)
      sessionStorage.setItem('oauth_exchange_failed', '1');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

boot();
