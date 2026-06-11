/**
 * useInterruptionPause — mid-game phone-call / notification / tab-switch
 * detection (open-issues §C). When the page hides mid-round we flip into
 * a sticky paused state; the student must tap the PauseOverlay to resume,
 * so coming back from a call never dumps them straight into a question
 * they haven't re-read.
 *
 * Scope note: callers gate `enabled` to SOLO/ASSIGNMENT play only.
 * Quick Play sessions stay un-paused on purpose — the socket leaderboard
 * and teacher monitor keep flowing server-side, so a local pause would
 * silently desync the student from the live session.
 *
 * This intentionally does NOT try to freeze the feedback timeouts in
 * useGameModeActions: browsers already throttle hidden-tab timers, and
 * the overlay blocks input on return, so the worst case is the round
 * having auto-advanced one question. Mode-owned countdowns (Speed Round
 * / Class Minute) accept a `paused` prop and freeze for real.
 */
import { useCallback, useEffect, useState } from "react";

export function useInterruptionPause(enabled: boolean): {
  isPaused: boolean;
  resume: () => void;
} {
  const [isPaused, setIsPaused] = useState(false);

  // Round ended / scope changed while paused — clear the overlay during
  // render (adjust-state pattern) so it can't shadow the results screen.
  if (!enabled && isPaused) setIsPaused(false);

  useEffect(() => {
    if (!enabled) return;
    const onVisibilityChange = () => {
      if (document.hidden) setIsPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled]);

  const resume = useCallback(() => setIsPaused(false), []);

  return { isPaused, resume };
}
