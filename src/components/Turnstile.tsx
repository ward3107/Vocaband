/**
 * Turnstile — lightweight React wrapper around Cloudflare Turnstile.
 *
 * Loads `https://challenges.cloudflare.com/turnstile/v0/api.js` once
 * per page-load (idempotent — multiple component instances reuse the
 * same script tag), renders a widget into a div, and bubbles the
 * verified token up via `onToken`.
 *
 * The token is short-lived (~5 minutes from Cloudflare's side) so the
 * widget auto-refreshes when it expires; we re-emit the new token to
 * the parent via the same callback.  The parent's responsibility is
 * to hold the latest token and submit it with the next form action.
 *
 * If `VITE_TURNSTILE_SITE_KEY` is not configured at build time, the
 * component renders nothing and immediately calls `onToken('')` so the
 * caller's submit handler doesn't block waiting for a token that
 * never arrives.  This makes Turnstile opt-in via env: dev environments
 * without a key keep working unchanged.
 */
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface TurnstileProps {
  /** Cloudflare-issued site key (the public one). */
  siteKey: string;
  /** Called with the verified token whenever the widget produces one
   *  (initial solve + every auto-refresh). */
  onToken: (token: string) => void;
  /** Optional — called when the token expires, before the next refresh
   *  emits a new one.  Use it to flip the parent's submit button into
   *  a "verifying again…" state if you want. */
  onExpired?: () => void;
  /** Optional — light / dark / auto.  Defaults to 'auto' (matches the
   *  user's system preference). */
  theme?: 'light' | 'dark' | 'auto';
}

export function Turnstile({ siteKey, onToken, onExpired, theme = 'auto' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        if (!containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          'expired-callback': () => {
            onToken('');
            onExpired?.();
          },
          'error-callback': () => {
            onToken('');
          },
          theme,
          size: 'flexible',
        });
      })
      .catch((err) => {
        console.warn('[Turnstile] script load failed:', err);
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone — safe to ignore */
        }
        widgetIdRef.current = null;
      }
    };
    // siteKey is the only dep that should re-render the widget; the
    // callbacks are intentionally captured at first mount so a parent
    // re-render doesn't blow away an already-solved widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} />;
}

/** True if Turnstile is configured for this build.  Use it to decide
 *  whether to gate form submission on a token. */
export function isTurnstileEnabled(): boolean {
  return !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
}

export function turnstileSiteKey(): string {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
}
