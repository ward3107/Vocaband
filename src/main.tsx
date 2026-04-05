import {lazy, Suspense, useState} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

const App = lazy(() => import('./App.tsx'));
const AccessibilityWidget = lazy(() =>
  import('./components/AccessibilityWidget').then(m => ({ default: m.AccessibilityWidget }))
);

// PKCE exchange — fire and forget
(async function() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return;
  try {
    const { supabase } = await import('./core/supabase');
    const code = params.get('code')!;
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error && !error.message?.includes('already used') && !error.message?.includes('expired')) {
      await new Promise(r => setTimeout(r, 1000));
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch {
    try {
      const { supabase } = await import('./core/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sessionStorage.setItem('oauth_exchange_failed', '1');
        await supabase.auth.signOut().catch(() => {});
      }
    } catch {}
  }
  window.history.replaceState({}, '', window.location.pathname);
})().catch(() => {});

// Gate: show a button to mount App so we can see if it freezes
function GatedApp() {
  const [mounted, setMounted] = useState(false);

  if (!mounted) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui',background:'#f0fdf4'}}>
        <div style={{textAlign:'center',padding:'2rem',background:'white',borderRadius:'1rem',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
          <h1 style={{color:'#16a34a',fontSize:'1.5rem',margin:'0 0 1rem'}}>Imports OK — Ready to mount App</h1>
          <button
            onClick={() => {
              console.log('[Gate] Mounting App...');
              setMounted(true);
            }}
            style={{padding:'1rem 3rem',background:'#16a34a',color:'white',border:'none',borderRadius:'0.5rem',fontSize:'1.2rem',cursor:'pointer'}}
          >
            Mount Full App
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui',color:'#666'}}>Rendering App...</div>}>
      <App />
      <AccessibilityWidget />
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <GatedApp />
  </ErrorBoundary>,
);
