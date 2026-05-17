import { useRef } from "react";

/**
 * Refs used by the auth-restore + manual-login control flow.
 *
 * - `manualLoginInProgress`: gates onAuthStateChange so it doesn't
 *   clobber loading/view mid-login (signInAnonymously fires the
 *   listener before handleStudentLogin finishes its DB queries).
 * - `restoreInProgress`: prevents restoreSession from re-entering
 *   when the auth listener fires during its own work.
 * - `restoreRetried`: one-shot retry gate for the restore safety
 *   timeout.
 * - `fromShareLinkRef`: captured at first render — true when the URL
 *   has `?share=1` (set by FloatingButtons social-share). Forces the
 *   landing page to render even for logged-in visitors so the social
 *   preview isn't replaced by their dashboard.
 */
export function useAuthFlowRefs() {
  const manualLoginInProgress = useRef(false);
  const restoreInProgress = useRef(false);
  const restoreRetried = useRef(false);
  const fromShareLinkRef = useRef(
    new URLSearchParams(window.location.search).get("share") === "1",
  );
  return { manualLoginInProgress, restoreInProgress, restoreRetried, fromShareLinkRef };
}
