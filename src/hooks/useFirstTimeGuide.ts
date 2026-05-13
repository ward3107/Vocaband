/**
 * useFirstTimeGuide — per-page "what is this screen?" walkthrough state.
 *
 * On a teacher's first visit to a major page (Create Assignment, Classroom,
 * Approvals, Worksheet, Class Show, Quick Play monitor) we surface a brief
 * dismissible overlay explaining the page in 3 steps.  Once the teacher
 * dismisses it we never auto-open it again — but a small "?" trigger in
 * the page chrome lets them re-open it on demand.
 *
 * Persistence — two-tier:
 *   1. Source of truth: `users.guides_seen text[]` in Supabase, exposed
 *      through a module-level store (see setGuideStore below) that
 *      App.tsx populates whenever the signed-in user row changes.  When
 *      present, this is read on mount and written on dismiss so
 *      "seen once" travels with the account across devices / browsers /
 *      private windows.
 *   2. Fallback cache: localStorage keyed by `vocaband_guide_seen_<key>`.
 *      Used when no store is set (logged-out preview, public surfaces)
 *      and as a defence against transient network errors.
 *
 * Why a module-level store (not React context)?  App.tsx has ~38
 * conditional `return (...)` branches; wrapping every one in a Provider
 * would be unrealistic.  The store is a tiny pub/sub plugged into
 * useSyncExternalStore — re-renders the right components without
 * threading a Provider through the tree.
 *
 * Wrapped in try/catch so private-mode / blocked-storage browsers still
 * render the page (the guide just keeps offering itself until storage
 * works again — no worse than the first-visit experience).
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type GuideKey =
  | "create-assignment"
  | "classroom"
  | "approvals"
  | "worksheet"
  | "class-show"
  | "quick-play-monitor";

// ─── Account-level persistence (Supabase, pub/sub store) ───────────────────

export interface GuideStore {
  /** Dismissed guide keys for the current account. */
  seen: ReadonlyArray<string>;
  /** Append `key` to the seen list and persist to Supabase. */
  markSeen: (key: GuideKey) => Promise<void> | void;
}

let activeStore: GuideStore | null = null;
const listeners = new Set<() => void>();

/**
 * App.tsx calls this whenever the signed-in user changes (or signs out).
 * Pass `null` on sign-out so the hook falls back to localStorage.
 *
 * Identity matters — pass a new object whenever `seen` changes so React's
 * useSyncExternalStore detects the change.
 */
export function setGuideStore(store: GuideStore | null): void {
  if (activeStore === store) return;
  activeStore = store;
  listeners.forEach((l) => {
    try { l(); } catch { /* ignore listener errors */ }
  });
}

function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStore(): GuideStore | null {
  return activeStore;
}

function readStoreSSR(): GuideStore | null {
  return null;
}

export function useGuideStore(): GuideStore | null {
  return useSyncExternalStore(subscribeStore, readStore, readStoreSSR);
}

// ─── localStorage fallback ─────────────────────────────────────────────────

const STORAGE_PREFIX = "vocaband_guide_seen_";

function readSeenLocal(key: GuideKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function writeSeenLocal(key: GuideKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, "1");
  } catch {
    /* storage blocked — silently no-op */
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

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
  const store = useGuideStore();

  // Lazy initial state — prefer the account-level seen list when we
  // have it; fall back to localStorage so logged-out preview surfaces
  // still get the one-shot UX.  After mount we mutate the in-memory
  // flag; the store + localStorage are sources of truth on next mount.
  const initialSeen = (): boolean => {
    if (store && store.seen.includes(key)) return true;
    return readSeenLocal(key);
  };
  const [seen, setSeen] = useState<boolean>(initialSeen);
  const [forceOpen, setForceOpen] = useState<boolean>(false);

  const shouldShow = !seen;
  const isOpen = shouldShow || forceOpen;

  const open = useCallback(() => {
    setForceOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    // Local cache + in-memory flip first so the modal closes
    // instantly even if the DB write is slow.
    writeSeenLocal(key);
    setSeen(true);
    setForceOpen(false);
    // Best-effort persist to the account.  Errors are swallowed —
    // localStorage still suppresses re-shows on this device, and the
    // next dismissal attempt (or a manual retry from another device)
    // will sync the array again.
    if (store) {
      try {
        const maybePromise = store.markSeen(key);
        if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
          (maybePromise as Promise<void>).catch((err: unknown) => {
            // eslint-disable-next-line no-console
            console.warn("[useFirstTimeGuide] markSeen failed:", err);
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[useFirstTimeGuide] markSeen threw:", err);
      }
    }
  }, [key, store]);

  // Re-sync the in-memory `seen` flag when the store's seen list
  // changes (e.g. user row reloads after sign-in).  Local writes still
  // win — once we've set seen=true here we don't flip back to false.
  useEffect(() => {
    if (store && store.seen.includes(key)) {
      setSeen(true);
      setForceOpen(false);
    }
  }, [store, key]);

  // Keep `seen` in sync with localStorage if the key changes
  // (defensive — most callers pass a static key).
  useEffect(() => {
    if (readSeenLocal(key)) setSeen(true);
    setForceOpen(false);
  }, [key]);

  return { shouldShow, open, dismiss, isOpen };
}
