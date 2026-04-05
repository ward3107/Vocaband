import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import './index.css';
import { supabase } from './core/supabase';

// PKCE code exchange — must happen before React mounts
async function exchangePKCE() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return;

  const code = params.get('code')!;
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error && !error.message?.includes('already used') && !error.message?.includes('expired')) {
      // Retry once
      await new Promise(r => setTimeout(r, 1000));
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch {
    // Check if session exists anyway
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sessionStorage.setItem('oauth_exchange_failed', '1');
      await supabase.auth.signOut().catch(() => {});
    }
  }
  window.history.replaceState({}, '', window.location.pathname);
}

// Mount React immediately, handle PKCE in parallel
exchangePKCE().catch(err => console.error('PKCE error:', err));

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
