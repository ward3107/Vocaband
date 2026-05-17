import { useRef } from "react";
import type { AppUser } from "../core/supabase";

/**
 * Refs that participate in the render-loop / gameplay-effect plumbing.
 *
 * - `userRef`: "current" user for effects that don't re-register.
 * - `feedbackTimeoutRef`: timeout id for the feedback overlay (cleared
 *   on unmount and from `cleanupSessionData`).
 * - `isProcessingRef`: guard against rapid clicks during feedback.
 * - `lastScoreEmitRef`: last Socket.IO score emit time — throttle gate
 *   for the live-challenge + Quick Play score-update wire.
 */
export function useRenderLoopRefs(initialUser: AppUser | null) {
  const userRef = useRef(initialUser);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isProcessingRef = useRef<boolean>(false);
  const lastScoreEmitRef = useRef<number>(0);
  return { userRef, feedbackTimeoutRef, isProcessingRef, lastScoreEmitRef };
}
