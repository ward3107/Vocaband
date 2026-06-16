/**
 * useAutoAdvance — a reusable "chain to the next round automatically"
 * countdown for the live-game hosts. Speed Round pioneered the pattern
 * (start the first round by hand, then each finished round auto-launches the
 * next after a short podium beat); this hook generalizes it so Category Race
 * and Word Hunt Arena behave the same way without copy-pasting the timer.
 *
 * While `active` is true a 1-second countdown runs from `seconds`; when it
 * reaches zero `onFire` is called once and the countdown clears. Any change
 * that makes `active` false (auto-play toggled off, a round starting, the
 * run completing) cancels a pending countdown immediately.
 *
 * Returns the live countdown (seconds remaining) or null when idle, so the
 * caller can surface "Next in 3…" on its start button.
 */
import { useEffect, useRef, useState } from "react";

export function useAutoAdvance(active: boolean, seconds: number, onFire: () => void): number | null {
  const [countdown, setCountdown] = useState<number | null>(null);
  // Always call the freshest onFire without re-arming the interval when the
  // callback identity changes between renders.
  const fireRef = useRef(onFire);
  useEffect(() => { fireRef.current = onFire; });

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cancels a pending countdown when auto-advance conditions break
      setCountdown(null);
      return;
    }
    setCountdown(seconds);
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          window.clearInterval(id);
          fireRef.current();
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, seconds]);

  return countdown;
}
