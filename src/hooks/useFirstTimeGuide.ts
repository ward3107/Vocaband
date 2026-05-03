/**
 * useFirstTimeGuide — per-page "what is this screen?" walkthrough state.
 *
 * On a teacher's first visit to a major page (Create Assignment, Classroom,
 * Approvals, Worksheet, Class Show, Quick Play monitor) we surface a brief
 * dismissible overlay explaining the page in 3 steps.  Once the teacher
 * dismisses it we never auto-open it again — but a small "?" trigger in
 * the page chrome lets them re-open it on demand.
 *
 * Storage is plain localStorage keyed by `vocaband_guide_seen_<key>`.
 * Wrapped in try/catch so private-mode / blocked-storage browsers still
 * render the page (the guide just keeps offering itself on every visit
 * — no worse than the first-visit experience).
 */
import { useCallback, useEffect, useState } from "react";

export type GuideKey =
  | "create-assignment"
  | "classroom"
  | "approvals"
  | "worksheet"
  | "class-show"
  | "quick-play-monitor";

const STORAGE_PREFIX = "vocaband_guide_seen_";

function readSeen(key: GuideKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function writeSeen(key: GuideKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, "1");
  } catch {
    /* storage blocked — silently no-op */
  }
}

export interface UseFirstTimeGuideResult {
  /** True if the teacher hasn't dismissed this guide yet. */
  shouldShow: boolean;
  /** Force-show the guide (used by the "?" trigger). */
  open: () => void;
  /** Mark seen + close. */
  dismiss: () => void;
  /** True while open (covers both first-show and re-trigger). */
  isOpen: boolean;
}

export function useFirstTimeGuide(key: GuideKey): UseFirstTimeGuideResult {
  // Lazy initial state — read storage exactly once.  After mount we only
  // mutate the in-memory `seen` flag; storage is the source of truth on
  // the next page visit / refresh.
  const [seen, setSeen] = useState<boolean>(() => readSeen(key));
  const [forceOpen, setForceOpen] = useState<boolean>(false);

  // First-visit auto-open.  We don't render anything from this hook —
  // the consumer mounts <FirstTimeGuide> and reads `isOpen`.  Auto-open
  // happens by default whenever `seen` is false; the consumer doesn't
  // need to call open() in that case.
  const shouldShow = !seen;
  const isOpen = shouldShow || forceOpen;

  const open = useCallback(() => {
    setForceOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    writeSeen(key);
    setSeen(true);
    setForceOpen(false);
  }, [key]);

  // Keep `seen` in sync with storage if the key changes (defensive —
  // most callers pass a static key).  Using effect so the storage read
  // doesn't run on every render.
  useEffect(() => {
    setSeen(readSeen(key));
    setForceOpen(false);
  }, [key]);

  return { shouldShow, open, dismiss, isOpen };
}
