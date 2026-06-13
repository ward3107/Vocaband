import type { MutableRefObject } from "react";
import { supabase, type AppUser } from "../core/supabase";

/**
 * Clears any save queue work in flight plus the feedback timeout that
 * lives outside the save queue's domain. Called from logout / session
 * end paths.
 */
export function buildCleanupSessionData(
  clearSaveQueue: () => void,
  feedbackTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
) {
  return () => {
    clearSaveQueue();
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = undefined;
    }
  };
}

/**
 * Full guest exit cleanup. Called whenever a Quick Play student
 * explicitly leaves the game.
 *
 * Progress rows are intentionally left in place so the student stays
 * visible on the teacher's podium after leaving — teachers need to see
 * who actually played. Row removal happens elsewhere:
 *   (a) teacher kick — QuickPlayMonitor.removeStudent
 *   (b) re-join with same name — QuickPlayStudentView join-time delete
 * This function only signs out the anon auth session + clears the
 * guest localStorage entry so a fresh re-entry from the same device
 * starts cleanly.
 */
export function buildCleanupQuickPlayGuest(
  getUser: () => AppUser | null,
  getQuickPlayActiveSession: () => unknown,
  setQuickPlayCompletedModes: (modes: Set<string>) => void,
) {
  return async () => {
    const user = getUser();
    if (!user?.isGuest || !getQuickPlayActiveSession()) return;
    try { localStorage.removeItem("vocaband_qp_guest"); } catch { /* blocked */ }
    setQuickPlayCompletedModes(new Set());
    try { await supabase.auth.signOut(); } catch { /* offline / already out */ }
  };
}
