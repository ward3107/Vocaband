import { useRef } from "react";
import type { View } from "../core/views";
import type { AppUser } from "../core/supabase";

/**
 * Navigation-related refs shared between the auth listener, the
 * back-button trap, and the misc-effects bundle.
 *
 * - `previousViewRef`: most-recent prior view, used by `goBack()`.
 *   Updated by the view-change effect in useAppMiscEffects.
 * - `currentViewRef`: ref-mirror of the current view so restoreSession
 *   can read it asynchronously from auth events (the auth listener
 *   effect has empty deps and can't close over the latest value).
 * - `lastUserRoleRef`: most-recent user role so the SIGNED_OUT handler
 *   can route students back to the student-login screen instead of
 *   the teacher-focused public landing.
 */
export function useNavigationRefs(initialView: View) {
  const previousViewRef = useRef<string>("public-landing");
  const currentViewRef = useRef<View>(initialView);
  const lastUserRoleRef = useRef<AppUser["role"] | null>(null);
  return { previousViewRef, currentViewRef, lastUserRoleRef };
}
