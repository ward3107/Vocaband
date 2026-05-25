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
 * Dismissal is session-scoped (in-memory), not persisted: a teacher who
 * waves it away at their desk should still get the offer later when
 * they actually open the dashboard on the classroom projector.
 */
import { useCallback, useEffect, useState } from "react";

const LARGE_DISPLAY_MIN_WIDTH = 1280;
const MAX_PROJECTOR_DPR = 1.5;

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
  const [dismissed, setDismissed] = useState(false);
  // Evaluated once at mount via the lazy initializer (SSR-guarded inside
  // looksLikeProjector) so we don't setState synchronously in an effect.
  const [projectorLikely, setProjectorLikely] = useState<boolean>(() =>
    looksLikeProjector(),
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Entering fullscreen (e.g. F11 before class) is a strong "about to
    // present" signal — re-evaluate so the offer can appear then too.
    const onFullscreen = () => setProjectorLikely(looksLikeProjector());
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { show: projectorLikely && !active && !dismissed, dismiss };
}
