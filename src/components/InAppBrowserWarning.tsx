import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { detectInAppBrowser, type InAppBrowserInfo } from '../utils/inAppBrowser';
import { inAppBrowserT } from '../locales/inapp-browser';

// Per-session dismissal — if the user really insists on staying in the
// WebView (e.g. a quick demo), don't keep re-blocking them. They'll see
// it again next time they open the link.
const SESSION_DISMISSED_KEY = 'vocaband_inapp_warning_dismissed';

/**
 * Full-screen warning shown when Vocaband is being viewed inside an
 * in-app browser (Instagram / Facebook / WhatsApp / TikTok WebView).
 *
 * In those WebViews service workers don't register, the install gate
 * has nothing to install, and offline progress writes can silently
 * fail — so it's a real silent-breakage class of bug. This modal
 * surfaces it loudly and points at the platform-specific recovery
 * gesture. Dismissible per-session as an escape hatch.
 */
export default function InAppBrowserWarning() {
  const { language, dir, isRTL } = useLanguage();
  const t = inAppBrowserT[language];
  const [info, setInfo] = useState<InAppBrowserInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const detected = detectInAppBrowser();
    setInfo(detected);
    if (!detected.isInApp) return;
    let dismissed = false;
    try { dismissed = window.sessionStorage.getItem(SESSION_DISMISSED_KEY) === '1'; } catch { /* */ }
    setVisible(!dismissed);
  }, []);

  if (!info?.isInApp || !visible) return null;

  const dismiss = () => {
    try { window.sessionStorage.setItem(SESSION_DISMISSED_KEY, '1'); } catch { /* */ }
    setVisible(false);
  };

  const copyUrl = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Older WebViews lack the Clipboard API. Fallback: select-and-prompt
      // via the legacy execCommand path so users still have a copy escape.
      const input = document.createElement('input');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); setCopied(true); window.setTimeout(() => setCopied(false), 2400); }
      catch { /* clipboard isn't available — user copies the URL from the address bar */ }
      document.body.removeChild(input);
    }
  };

  // Android can hard-redirect to Chrome via the intent: scheme. iOS has
  // no equivalent (Apple won't let one app force-launch another), so
  // iPhone users get instructions + copy-link instead.
  const openInChrome = () => {
    const { protocol, host, pathname, search, hash } = window.location;
    // intent://example.com/path#Intent;scheme=https;package=com.android.chrome;end
    const intentUrl =
      'intent://' +
      host +
      pathname +
      search +
      hash +
      '#Intent;scheme=' +
      protocol.replace(':', '') +
      ';package=com.android.chrome;end';
    window.location.href = intentUrl;
  };

  const steps = info.platform === 'ios'
    ? [t.iosStep1, t.iosStep2]
    : [t.androidStep1, t.androidStep2];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inapp-warning-title"
      dir={dir}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 px-3 py-6 backdrop-blur-sm animate-in"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in">
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 pb-5 pt-7 text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ExternalLink size={28} />
          </div>
          <h2 id="inapp-warning-title" className="text-center text-xl font-bold leading-tight">
            {t.title}
          </h2>
          <p className="mt-1.5 text-center text-sm text-white/90">{t.subtitle}</p>
        </div>

        <div className="px-6 py-5">
          <ol className="mb-4 space-y-2">
            {steps.map((step, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-800">{step}</span>
              </li>
            ))}
          </ol>

          {info.platform === 'android' && (
            <button
              type="button"
              onClick={openInChrome}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="mb-2 w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98]"
            >
              {t.openInChrome}
            </button>
          )}

          <button
            type="button"
            onClick={copyUrl}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? t.copyUrlSuccess : t.copyUrl}</span>
          </button>

          <button
            type="button"
            onClick={dismiss}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="block w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {t.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
