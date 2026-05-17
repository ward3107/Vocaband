import { useEffect, useState } from 'react';
import { ArrowDown, Check, Share, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { usePwaInstall, type PwaPlatform } from '../hooks/usePwaInstall';
import { pwaInstallT, type PwaInstallStrings } from '../locales/pwa-install';

// One-time flag — set when the user has seen (and dismissed or accepted)
// the full-screen first-visit modal. After that they only see the smaller
// per-session banner.
const FIRST_VISIT_KEY = 'vocaband_pwa_first_visit_done';
// Per-session dismissal of the smaller banner. Cleared automatically when
// the tab closes, so the banner re-appears next session.
const SESSION_DISMISSED_KEY = 'vocaband_pwa_banner_dismissed';

function safeGetItem(storage: Storage | undefined, key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}
function safeSetItem(storage: Storage | undefined, key: string, value: string) {
  try { storage?.setItem(key, value); } catch { /* private mode */ }
}

/**
 * Aggressive PWA install gate.
 *
 *   - First visit on a supported platform: full-screen modal with iOS
 *     gesture instructions or an Android "Install" button. Backdrop is
 *     opaque — the user must hit "Not now" or install to dismiss.
 *   - Every subsequent session: a smaller persistent banner pinned to
 *     the bottom of the viewport that re-appears until they install.
 *
 * Why force this: installed PWAs on iOS get persistent storage (no 7-day
 * eviction), and on both platforms they avoid in-app-browser breakage.
 * That's the whole offline-classroom story — without install, the SW
 * cache and queued progress can vanish between lessons.
 */
export default function PwaInstallGate() {
  const { platform, isInstalled, promptInstall } = usePwaInstall();
  const { language, dir, isRTL } = useLanguage();
  const t = pwaInstallT[language];

  const [view, setView] = useState<'hidden' | 'modal' | 'banner'>('hidden');

  useEffect(() => {
    if (isInstalled) { setView('hidden'); return; }
    if (platform === 'desktop-or-other') { setView('hidden'); return; }

    const firstVisitDone = safeGetItem(window.localStorage, FIRST_VISIT_KEY) === '1';
    const sessionDismissed = safeGetItem(window.sessionStorage, SESSION_DISMISSED_KEY) === '1';

    if (!firstVisitDone) setView('modal');
    else if (!sessionDismissed) setView('banner');
    else setView('hidden');
  }, [isInstalled, platform]);

  if (view === 'hidden') return null;

  const flagFirstVisitDone = () => {
    safeSetItem(window.localStorage, FIRST_VISIT_KEY, '1');
    // Also flag this session so the banner doesn't immediately replace
    // the modal — let the user breathe until next session.
    safeSetItem(window.sessionStorage, SESSION_DISMISSED_KEY, '1');
  };

  const handleNativeInstall = async () => {
    if (!promptInstall) return;
    const outcome = await promptInstall();
    if (outcome === 'accepted') flagFirstVisitDone();
    // Either way, hide the UI for now — if dismissed, the banner returns next session.
    flagFirstVisitDone();
    setView('hidden');
  };

  const handleDismissModal = () => {
    flagFirstVisitDone();
    setView('hidden');
  };

  const handleDismissBanner = () => {
    safeSetItem(window.sessionStorage, SESSION_DISMISSED_KEY, '1');
    setView('hidden');
  };

  // Banner CTA on iOS can't trigger an install — pop the instructions modal.
  const handleBannerCta = () => {
    if (platform === 'ios') {
      setView('modal');
      return;
    }
    void handleNativeInstall();
  };

  if (view === 'modal') {
    return (
      <InstallModal
        platform={platform}
        t={t}
        dir={dir}
        isRTL={isRTL}
        hasNativePrompt={promptInstall !== null}
        onInstall={handleNativeInstall}
        onDismiss={handleDismissModal}
      />
    );
  }

  return (
    <InstallBanner
      t={t}
      dir={dir}
      isRTL={isRTL}
      onCta={handleBannerCta}
      onDismiss={handleDismissBanner}
    />
  );
}

interface ModalProps {
  platform: PwaPlatform;
  t: PwaInstallStrings;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  hasNativePrompt: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

function InstallModal({ platform, t, dir, isRTL, hasNativePrompt, onInstall, onDismiss }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      dir={dir}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6 animate-in"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in">
        <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-6 pb-5 pt-7 text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-lg" />
          </div>
          <h2 id="pwa-install-title" className="text-center text-xl font-bold leading-tight">
            {t.modalTitle}
          </h2>
          <p className="mt-1.5 text-center text-sm text-white/85">{t.modalSubtitle}</p>
        </div>

        <div className="px-6 py-5">
          <ul className="mb-5 space-y-2.5">
            {[t.benefitOffline, t.benefitFaster, t.benefitHomeScreen].map((b, i) => (
              <li
                key={i}
                className={`flex items-start gap-2.5 text-sm text-slate-700 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {platform === 'ios' ? (
            <IosSteps t={t} isRTL={isRTL} />
          ) : hasNativePrompt ? (
            <button
              type="button"
              onClick={onInstall}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="mb-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition active:scale-[0.98]"
            >
              {t.androidInstallCta}
            </button>
          ) : (
            // Chromium hasn't fired beforeinstallprompt yet (engagement
            // heuristic not met, or browser is Firefox/in-app). Fall
            // back to the same generic instructions the iOS path uses.
            <IosSteps t={t} isRTL={isRTL} />
          )}

          <button
            type="button"
            onClick={onDismiss}
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

function IosSteps({ t, isRTL }: { t: PwaInstallStrings; isRTL: boolean }) {
  const steps: Array<React.ReactNode> = [
    <>
      {t.iosStep1Before}{' '}
      <span className="mx-1 inline-flex items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.5 align-middle text-xs font-semibold text-indigo-700">
        <Share size={13} />
        {t.iosStep1ShareLabel}
      </span>
    </>,
    t.iosStep2,
    t.iosStep3,
  ];

  return (
    <div className="mb-3">
      <h3 className={`mb-2 text-sm font-semibold text-slate-900 ${isRTL ? 'text-right' : ''}`}>
        {t.iosHeading}
      </h3>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="text-sm text-slate-800">{step}</span>
          </li>
        ))}
      </ol>
      {/* Bouncing arrow as a strong visual cue — Safari's Share button
          sits at the bottom of the screen on iPhone, at the top on iPad.
          The arrow points down for the (much larger) iPhone audience;
          iPad users will spot the Share icon either way. */}
      <div className="mt-2 flex justify-center text-indigo-500" aria-hidden="true">
        <ArrowDown size={22} className="animate-bounce" />
      </div>
    </div>
  );
}

interface BannerProps {
  t: PwaInstallStrings;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  onCta: () => void;
  onDismiss: () => void;
}

function InstallBanner({ t, dir, isRTL, onCta, onDismiss }: BannerProps) {
  // The outer fixed wrapper handles horizontal centering with -translate-x-1/2.
  // The inner div carries the entry animation (translateY) so the two transforms
  // don't fight on the same element.
  return (
    <div
      role="region"
      aria-label={t.bannerTitle}
      dir={dir}
      className="fixed bottom-3 left-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2"
    >
      <div className="rounded-xl border border-violet-200 bg-white/95 p-3 shadow-lg shadow-violet-500/20 backdrop-blur animate-in">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img src="/icon-192.png" alt="" className="h-10 w-10 flex-none rounded-lg" />
        <p className={`flex-1 text-sm font-medium leading-snug text-slate-800 ${isRTL ? 'text-right' : ''}`}>
          {t.bannerTitle}
        </p>
        <button
          type="button"
          onClick={onCta}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="flex-none rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition active:scale-[0.97]"
        >
          {t.bannerCta}
        </button>
        <button
          type="button"
          aria-label={t.closeLabel}
          onClick={onDismiss}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="flex-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
        </div>
      </div>
    </div>
  );
}
