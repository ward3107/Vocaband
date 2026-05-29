/**
 * useReducedMotion — single source of truth for whether the UI should
 * downgrade heavy animations.  Returns `true` when EITHER:
 *
 *   1. the OS reports `prefers-reduced-motion: reduce`, OR
 *   2. `navigator.deviceMemory` reports < 2 GB (budget Android, where
 *      confetti + simultaneous motion chains push past 60 fps).
 *
 * The boolean is the contract every arcade-side effect honours —
 * confetti bursts, parallax tilt, particle emitters, and any
 * continuously-animating `motion.div animate={…}` loop must skip or
 * downgrade when this returns true.
 *
 * The matchMedia listener cleans itself up on unmount; the deviceMemory
 * check is one-shot since it can't change during a session.
 */
import { useEffect, useState } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  const lowMemory =
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" &&
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) < 2;
  const reduceMotion = window.matchMedia?.(REDUCE_QUERY).matches ?? false;
  return reduceMotion || lowMemory;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(readInitial);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCE_QUERY);
    const onChange = () => setReduced(readInitial());
    // Safari < 14 only supports the deprecated addListener API; modern
    // browsers expose addEventListener.  Cover both to keep iPad-on-iOS-13
    // school devices working.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}
