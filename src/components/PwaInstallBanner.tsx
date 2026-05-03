/**
 * PwaInstallBanner — slide-up banner on mobile devices that nudges the
 * user to install Vocaband to their home screen as a PWA.
 *
 * Self-contained — decides on its own whether to render based on:
 *   1. Mobile viewport (max-width 768px)
 *   2. Not already running as a standalone PWA
 *   3. Not dismissed within the last 14 days
 *   4. After a 1.5s warm-up so the hero animations settle before the
 *      banner slides in.  Long enough to feel intentional, short
 *      enough to catch attention while interest is high.
 *
 * Two paths:
 *   * Android (Chrome / Edge / Samsung) — captures the
 *     beforeinstallprompt event, shows our custom banner with a
 *     native Install button that calls .prompt() on tap.
 *   * iOS Safari — no programmatic install API exists, so we show
 *     instructions ("Tap Share → Add to Home Screen") with the
 *     Safari share-sheet icon.
 *
 * Dismissals are stored in localStorage as `pwa_dismissed_at: <ms>`.
 * Re-prompts after 14 days.  On install (Android), the banner hides
 * permanently for that browser since `beforeinstallprompt` won't fire
 * again on a Chrome that's already installed the app.
 */
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Share } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa_dismissed_at";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const WARMUP_MS = 1500;

const COPY: Record<Language, {
  androidTitle: string;
  androidSub: string;
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
  /** Android browsers without beforeinstallprompt — Firefox, Samsung
   *  Internet, in-app webviews, Chrome before its engagement
   *  heuristics fire.  Same shape as the iOS instructions but pointing
   *  at the browser's own menu instead of the share sheet. */
  androidManualTitle: string;
  androidManualStep1: string;
  androidManualStep2: string;
  install: string;
  dismiss: string;
}> = {
  en: {
    androidTitle: "Install Vocaband",
    androidSub: "Add to your home screen for the best experience.",
    iosTitle: "Install Vocaband on iPhone",
    iosStep1: "Tap the Share button below",
    iosStep2: "Choose \"Add to Home Screen\"",
    androidManualTitle: "Install Vocaband",
    androidManualStep1: "Open the browser menu (⋮ in the top corner)",
    androidManualStep2: "Tap \"Install app\" or \"Add to Home screen\"",
    install: "Install",
    dismiss: "Not now",
  },
  he: {
    androidTitle: "התקנת Vocaband",
    androidSub: "הוסיפו למסך הבית לחוויה הטובה ביותר.",
    iosTitle: "התקנת Vocaband באייפון",
    iosStep1: "הקישו על כפתור השיתוף למטה",
    iosStep2: "בחרו \"הוסף למסך הבית\"",
    androidManualTitle: "התקנת Vocaband",
    androidManualStep1: "פתחו את תפריט הדפדפן (⋮ בפינה העליונה)",
    androidManualStep2: "הקישו על \"התקן אפליקציה\" או \"הוסף למסך הבית\"",
    install: "התקנה",
    dismiss: "לא עכשיו",
  },
  ar: {
    androidTitle: "تثبيت Vocaband",
    androidSub: "أضفه إلى الشاشة الرئيسية للحصول على أفضل تجربة.",
    iosTitle: "تثبيت Vocaband على iPhone",
    iosStep1: "اضغط على زر المشاركة أدناه",
    iosStep2: "اختر \"إضافة إلى الشاشة الرئيسية\"",
    androidManualTitle: "تثبيت Vocaband",
    androidManualStep1: "افتح قائمة المتصفح (⋮ في الزاوية العلوية)",
    androidManualStep2: "اضغط على \"تثبيت التطبيق\" أو \"إضافة إلى الشاشة الرئيسية\"",
    install: "تثبيت",
    dismiss: "ليس الآن",
  },
};

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS uses navigator.standalone, everything else uses display-mode
  // media query.  Cover both.
  const matchStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return matchStandalone || iosStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // Chrome on iOS is "CriOS"; Firefox is "FxiOS".  Real Safari excludes both.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

// Mobile browsers that don't fire `beforeinstallprompt` (or only fire
// it after Chrome's site-engagement heuristics decide the user is
// "engaged" — multiple visits, ≥30 s, manifest, SW, …) still benefit
// from a manual prompt.  Falling back to instructions for those keeps
// the banner from appearing inconsistently between sessions: teachers
// reported "sometimes the PWA message appears, sometimes it doesn't".
function isAndroidLikeMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android|Mobi/.test(ua) && !/iPad|iPhone|iPod/.test(ua);
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export default function PwaInstallBanner() {
  const { language, isRTL, dir } = useLanguage();
  const t = COPY[language];

  const [show, setShow] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  // Capture Android's beforeinstallprompt
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  // Decide whether to render after warm-up
  useEffect(() => {
    if (!isMobileViewport()) return;
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    const id = setTimeout(() => {
      // Show whenever any mobile install path makes sense.  Earlier
      // this was Android-with-prompt OR iOS Safari only — Android
      // browsers without the prompt event silently skipped (Firefox,
      // Samsung Internet, in-app webviews, Chrome before its
      // engagement heuristics kicked in).  Now we also fall back to
      // manual instructions for Android-like UAs so the banner is
      // consistent across sessions.
      if (installPrompt || isIosSafari() || isAndroidLikeMobile()) {
        setShow(true);
      }
    }, WARMUP_MS);

    return () => clearTimeout(id);
  }, [installPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // Private mode can throw — fine, the banner just won't persist
    }
    setShow(false);
    setShowIosInstructions(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "accepted") {
          // Install succeeded — banner won't fire again, but stamp the
          // dismissal anyway so Safari opening the same site later
          // doesn't re-prompt.
          try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}
        }
        setInstallPrompt(null);
        setShow(false);
      } catch {
        // User cancelled — leave the banner alone, they may still want to install later
      }
      return;
    }
    // iOS path: show step-by-step instructions
    setShowIosInstructions(true);
  }, [installPrompt]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        dir={dir}
        className="fixed bottom-0 inset-x-0 z-[9990] px-3 pb-3 pointer-events-none"
        role="dialog"
        aria-label={installPrompt ? t.androidTitle : t.iosTitle}
      >
        <div
          className="mx-auto max-w-md pointer-events-auto bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
        >
          {!showIosInstructions ? (
            <div className="p-4 flex items-center gap-3">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
                <p className="font-black text-sm text-stone-900 truncate">
                  {installPrompt ? t.androidTitle : t.iosTitle}
                </p>
                {installPrompt && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{t.androidSub}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleInstall}
                className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow active:scale-95 transition-transform"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {t.install}
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t.dismiss}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Manual step-by-step — iOS gets the share-sheet path,
            // Android-like (Firefox / Samsung Internet / in-app
            // webviews / engagement-throttled Chrome) get the
            // browser-menu path.  We can't trigger either
            // programmatically, so we explain.  Detected here, not
            // in state, so the banner re-evaluates if the UA changes
            // (rare — mostly just simplifies the state machine).
            (() => {
              const useIosCopy = isIosSafari();
              return (
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <p className={`flex-1 font-black text-sm text-stone-900 ${isRTL ? "text-right" : "text-left"}`}>
                      {useIosCopy ? t.iosTitle : t.androidManualTitle}
                    </p>
                    <button
                      type="button"
                      onClick={dismiss}
                      aria-label={t.dismiss}
                      className="shrink-0 w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400"
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ol className={`space-y-2 text-sm text-stone-700 ${isRTL ? "text-right" : "text-left"}`}>
                    <li className="flex items-center gap-2">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">1</span>
                      <span className="flex items-center gap-1">
                        {useIosCopy ? t.iosStep1 : t.androidManualStep1}
                        {useIosCopy && (
                          <Share className="w-4 h-4 inline-block text-indigo-600" />
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">2</span>
                      <span>{useIosCopy ? t.iosStep2 : t.androidManualStep2}</span>
                    </li>
                  </ol>
                </div>
              );
            })()
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
