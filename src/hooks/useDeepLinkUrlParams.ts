import { useState } from "react";

const readParam = (key: string): string | null => {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
};

/**
 * Captures the `?assignment=<id>` and `?play=<mode>` URL params at boot.
 *
 * - `pendingAssignmentId`: when a student lands on their dashboard with
 *   this set, the matching assignment is looked up and the student gets
 *   dropped straight into the mode picker (teachers share links from
 *   the assignment row).
 * - `pendingPlayMode`: set by teacher-shared share links (Class Minute
 *   today).  Consumed once the student is on their dashboard then
 *   stripped from the URL so a back-nav doesn't re-trigger the launch.
 */
export function useDeepLinkUrlParams() {
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(() => readParam("assignment"));
  const [pendingPlayMode, setPendingPlayMode] = useState<string | null>(() => readParam("play"));
  return {
    pendingAssignmentId, setPendingAssignmentId,
    pendingPlayMode, setPendingPlayMode,
  };
}
