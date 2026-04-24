/**
 * safariDiagnostics — boot-time feature check that surfaces a banner when
 * a critical browser API is missing or disabled.
 *
 * Motivation: teachers report "the game doesn't work on Safari" but can't
 * open DevTools on an iPad / iPhone to say what's actually broken. Instead
 * of guessing, we probe the handful of APIs the app hard-depends on and,
 * if any are unavailable, render an in-page banner naming the specific
 * problem (private mode, third-party cookies blocked, no WebSocket, etc).
 *
 * The banner is pure DOM so it runs before React mounts — if the failure
 * is severe enough to crash React, the diagnostic still shows.
 */

interface Diagnostic {
  name: string;
  ok: boolean;
  detail?: string;
}

function checkLocalStorage(): Diagnostic {
  try {
    const k = '__vocaband_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return { name: 'localStorage', ok: true };
  } catch {
    return {
      name: 'localStorage',
      ok: false,
      detail:
        'Browser storage is blocked. Turn off Private Browsing (Safari → top tabs → Private) and reload.',
    };
  }
}

function checkCookies(): Diagnostic {
  const enabled = typeof navigator !== 'undefined' && navigator.cookieEnabled;
  return enabled
    ? { name: 'cookies', ok: true }
    : {
        name: 'cookies',
        ok: false,
        detail:
          'Cookies are blocked. On iOS: Settings → Safari → uncheck "Block All Cookies". On Mac Safari: Settings → Privacy → uncheck "Block all cookies".',
      };
}

function checkWebSocket(): Diagnostic {
  const ok = typeof WebSocket !== 'undefined';
  return ok
    ? { name: 'WebSocket', ok: true }
    : {
        name: 'WebSocket',
        ok: false,
        detail:
          'Your network blocks real-time connections. Try a different Wi-Fi or turn off any content-filter / parental-control app.',
      };
}

function checkFetch(): Diagnostic {
  const ok = typeof fetch === 'function';
  return ok
    ? { name: 'fetch', ok: true }
    : {
        name: 'fetch',
        ok: false,
        detail: 'Your browser is too old. Please update Safari / iOS.',
      };
}

function renderBanner(failures: Diagnostic[]) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('vocaband-safari-diag');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'vocaband-safari-diag';
  banner.setAttribute('role', 'alert');
  banner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:2147483647',
    'background:#fef3c7',
    'color:#78350f',
    'border-bottom:2px solid #f59e0b',
    'padding:12px 16px',
    'font-family:system-ui,-apple-system,sans-serif',
    'font-size:14px',
    'line-height:1.4',
    'box-shadow:0 2px 8px rgba(0,0,0,0.08)',
  ].join(';');

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;margin-bottom:4px';
  title.textContent = "Vocaband can't start — something is blocking your browser:";
  banner.appendChild(title);

  failures.forEach(f => {
    const row = document.createElement('div');
    row.style.cssText = 'margin-top:4px';
    row.textContent = `• ${f.detail ?? f.name + ' is unavailable.'}`;
    banner.appendChild(row);
  });

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Dismiss';
  close.style.cssText = [
    'margin-top:8px',
    'padding:6px 12px',
    'background:#78350f',
    'color:#fff',
    'border:0',
    'border-radius:8px',
    'font-weight:700',
    'cursor:pointer',
  ].join(';');
  close.addEventListener('click', () => banner.remove());
  banner.appendChild(close);

  document.body.appendChild(banner);
}

/**
 * Runs every probe and renders a banner if any fails.  Fire-and-forget —
 * exceptions inside any probe are swallowed so the diagnostic layer can
 * never itself crash the app.
 */
export function runSafariDiagnostics(): void {
  try {
    const results = [
      checkLocalStorage(),
      checkCookies(),
      checkWebSocket(),
      checkFetch(),
    ];
    const failures = results.filter(r => !r.ok);
    if (failures.length > 0) {
      // Defer so <body> is definitely mounted.
      const render = () => renderBanner(failures);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render, { once: true });
      } else {
        render();
      }
    }
  } catch {
    /* diagnostics themselves must never throw */
  }
}
