/**
 * useAdaptiveTheme — feature-flagged adaptive theming hook.
 *
 * Status (2026-05-02): MVP scaffold.  Currently exposes Presentation
 * Mode (font scale 1.4×, simplified UI, AAA contrast target via the
 * `:root.vb-presentation` CSS class) and the feature flag plumbing.
 *
 * Future scope (per `docs/ADAPTIVE-THEME-PLAN.md` once written):
 *   - Context detection (screen tier, distance mode, env signals)
 *   - Auto-distance inference + Distance Mode override
 *   - Theme generator + post-render contrast audit loop
 *   - Self-correcting token writer
 *
 * Safety guarantees:
 *   - Feature flag default OFF — UI behaves exactly as before
 *   - Single setter, no React tree re-renders on toggle (only :root
 *     CSS class flips)
 *   - SSR-safe — guarded by `typeof window === 'undefined'` checks
 *
 * Toggling:
 *   const { presentationMode, setPresentationMode, adaptiveEnabled } = useAdaptiveTheme();
 *   <button onClick={() => setPresentationMode(true)}>Project to class</button>
 */
import { useCallback, useEffect, useState } from "react";

const PRESENTATION_KEY = "vocaband_presentation_mode";

/** Feature flag — default OFF.  Flip by setting VITE_ADAPTIVE_THEME=true
 *  at build time, or by passing `?adaptive=1` in the URL for one-off
 *  testing without a redeploy. */
export function isAdaptiveThemeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_ADAPTIVE_THEME === "true") return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("adaptive") === "1") return true;
  } catch {
    /* ignore — older browsers without URLSearchParams */
  }
  return false;
}

/** Apply or remove the `.vb-presentation` class on documentElement.
 *  CSS does the rest via the `:root.vb-presentation { ... }` block in
 *  index.css — no React re-renders. */
function applyPresentationClass(active: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (active) {
    root.classList.add("vb-presentation");
  } else {
    root.classList.remove("vb-presentation");
  }
}

export interface UseAdaptiveTheme {
  /** True when the feature flag is on for this build/session. */
  adaptiveEnabled: boolean;
  /** True when Presentation Mode is currently active. */
  presentationMode: boolean;
  /** Toggle Presentation Mode. */
  setPresentationMode: (active: boolean) => void;
  /** Convenience: flip Presentation Mode. */
  togglePresentationMode: () => void;
}

export function useAdaptiveTheme(): UseAdaptiveTheme {
  const adaptiveEnabled = isAdaptiveThemeEnabled();

  const [presentationMode, setPresentationModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(PRESENTATION_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Apply the class on mount + whenever state flips.  Persisted to
  // localStorage so a teacher's "I'm projecting" choice survives
  // navigation between teacher views.
  useEffect(() => {
    applyPresentationClass(presentationMode && adaptiveEnabled);
    try {
      if (presentationMode) {
        localStorage.setItem(PRESENTATION_KEY, "true");
      } else {
        localStorage.removeItem(PRESENTATION_KEY);
      }
    } catch {
      /* ignore quota / private mode */
    }
  }, [presentationMode, adaptiveEnabled]);

  const setPresentationMode = useCallback((active: boolean) => {
    setPresentationModeState(active);
  }, []);

  const togglePresentationMode = useCallback(() => {
    setPresentationModeState((v) => !v);
  }, []);

  return {
    adaptiveEnabled,
    presentationMode,
    setPresentationMode,
    togglePresentationMode,
  };
}
