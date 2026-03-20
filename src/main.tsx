import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { supabase } from './supabase.ts';

registerSW();

// Exchange PKCE auth code BEFORE React mounts.  This runs exactly once,
// outside the React lifecycle, so StrictMode double-mounting can't cause
// a race where the code is consumed twice or the listener is unsubscribed
// before the exchange completes.
const params = new URLSearchParams(window.location.search);
if (params.has('code')) {
  supabase.auth.exchangeCodeForSession(params.get('code')!).finally(() => {
    window.history.replaceState({}, '', window.location.pathname);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
