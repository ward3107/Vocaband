/**
 * usePresentationPrompt — gentle, heuristic "you look like you're
 * projecting" nudge for the teacher dashboard.
 *
 * There is no reliable browser API that says "this is a projector," so
 * this leans on the signals that correlate with one: a low-density
 * display (projectors and external monitors are typically ~1× DPR,
 * while modern laptop panels are 2×+) at a large resolution, or the
 * page being in fullscreen. Because the heuristic can misfire (a 1080p
 * desk monitor trips it too), it only ever *offers* — it never flips
 * Presentation Mode on by itself.
 *
 * Dismissal is persisted to localStorage so teachers who wave it away
 * at their desk aren't pestered on every login.  A fullscreen entry
 * (F11 right before class) is treated as a strong "about to present"
 * signal that *clears* the persisted dismissal so the offer can
 * reappear when it's actually useful.
 */
import { useCallback, useEffect, useState } from "react";
import { CLIENT_STORAGE_KEYS } from "../config/privacy-config";

const LARGE_DISPLAY_MIN_WIDTH = 1280;
const MAX_PROJECTOR_DPR = 1.5;
const DISMISSED_KEY = CLIENT_STORAGE_KEYS.projectorPromptDismissed;

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function looksLikeProjector(): boolean {
  if (typeof window === "undefined") return false;
  if (document.fullscreenElement) return true;
  const dpr = window.devicePixelRatio || 1;
  const width = window.screen?.width ?? window.innerWidth;
  return dpr <= MAX_PROJECTOR_DPR && width >= LARGE_DISPLAY_MIN_WIDTH;
}

/**
 * @param active whether Presentation Mode is already on — suppresses the
 *               prompt so we never nudge toward a state we're already in.
 */
export function usePresentationPrompt(active: boolean): {
  show: boolean;
  dismiss: () => void;
} {
  // Initialise from localStorage so the dismissal survives reloads.
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
  // Evaluated once at mount via the lazy initializer (SSR-guarded inside
  // looksLikeProjector) so we don't setState synchronously in an effect.
  const [projectorLikely, setProjectorLikely] = useState<boolean>(() =>
    looksLikeProjector(),
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Entering fullscreen (e.g. F11 before class) is a strong "about to
    // present" signal — re-evaluate AND clear the persisted dismissal
    // so the offer can reappear when it's actually useful.  Exiting
    // fullscreen just re-evaluates without resurrecting the offer.
    const onFullscreen = () => {
      const inFullscreen = !!document.fullscreenElement;
      if (inFullscreen) {
        try { localStorage.removeItem(DISMISSED_KEY); } catch { /* storage blocked */ }
        setDismissed(false);
      }
      setProjectorLikely(looksLikeProjector());
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* storage blocked */ }
  }, []);

  return { show: projectorLikely && !active && !dismissed, dismiss };
}
