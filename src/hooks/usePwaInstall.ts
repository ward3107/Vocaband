import { useCallback, useEffect, useRef, useState } from 'react';

// Chromium's beforeinstallprompt isn't in the TS DOM lib.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type PwaPlatform = 'ios' | 'android-chromium' | 'desktop-or-other';

export interface PwaInstallState {
  platform: PwaPlatform;
  isInstalled: boolean;
  /**
   * Native install prompt — only present on Chromium-family browsers that
   * have fired `beforeinstallprompt`. null everywhere else (iOS, Firefox,
   * in-app WebViews, Chromium before the engagement heuristic). Resolves
   * with the user's outcome so the caller can flag dismissal.
   */
  promptInstall: (() => Promise<'accepted' | 'dismissed'>) | null;
}

function detectPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'desktop-or-other';
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as MacIntel; the touch-points check distinguishes it
  // from a real Mac. Without this iPads silently fall through to desktop.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/.test(ua)) return 'android-chromium';
  return 'desktop-or-other';
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari exposes a legacy boolean; everyone else uses the MQL.
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mqlStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || mqlStandalone;
}

export function usePwaInstall(): PwaInstallState {
  const [platform] = useState<PwaPlatform>(detectPlatform);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectInstalled);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Suppress Chrome's mini-infobar — we render our own UI so the moment
      // of install is in our hands, not at the browser's discretion.
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      promptRef.current = null;
      setHasNativePrompt(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;
    const onMqlChange = () => setIsInstalled(detectInstalled());
    mql?.addEventListener?.('change', onMqlChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      mql?.removeEventListener?.('change', onMqlChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed'> => {
    const p = promptRef.current;
    if (!p) return 'dismissed';
    await p.prompt();
    const { outcome } = await p.userChoice;
    // A captured event can only prompt once. Drop the ref so a re-render
    // can't try to reuse a stale event (the second prompt() call throws).
    promptRef.current = null;
    setHasNativePrompt(false);
    return outcome;
  }, []);

  return {
    platform,
    isInstalled,
    promptInstall: hasNativePrompt ? promptInstall : null,
  };
}
