console.log('[BOOT] main.tsx loaded');
import {StrictMode} from 'react';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import {createRoot} from 'react-dom/client';
console.log('[BOOT] React imports OK');
import App from './App.tsx';
console.log('[BOOT] App import OK');
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';
// PWA service worker disabled — was causing white screens due to stale cache
// import { registerSW } from 'virtual:pwa-register';
import { supabase } from './core/supabase';
console.log('[BOOT] All imports OK');

function renderApp() {
  console.log('[BOOT] renderApp() called');
  try {
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
    console.log('[BOOT] React rendered');
  } catch (err) {
    console.error('[BOOT] React render failed:', err);
    document.getElementById('root')!.innerHTML = '<div style="padding:2rem;color:red;font-family:sans-serif"><h1>App crashed</h1><pre>' + String(err) + '</pre></div>';
  }
}

async function boot() {
  console.log('[BOOT] boot() started');
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      console.log('[BOOT] PKCE code exchange starting');
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
    console.error('[BOOT] Boot error (rendering app anyway):', err);
  }
  console.log('[BOOT] About to call renderApp()');
  renderApp();
}

boot();
