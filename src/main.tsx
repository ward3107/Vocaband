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
      await supabase.auth.exchangeCodeForSession(params.get('code')!);
    } catch {
      // Code may already have been consumed (e.g. back-button replay)
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
