/**
 * useLevelUp — fires a single "level up" modal each time a student
 * crosses an XP_TITLES tier boundary.
 *
 * Implementation note: rather than watch XP in an effect and push
 * pending tier into state (which trips the `set-state-in-effect`
 * lint), this hook DERIVES pending synchronously from current XP and
 * the per-user "last seen" tier minimum.  The lastSeen state is only
 * updated on `dismiss()`, so the celebration sticks on screen until
 * the student closes it, persists across XP bumps mid-celebration,
 * and never fires twice for the same crossing.
 *
 * localStorage `voca:last-tier:<uid>` keeps lastSeen across reloads,
 * so a refresh during the modal doesn't replay it, and an already-
 * past-tier login at first device-use silently seeds without firing.
 */
import { useEffect, useMemo, useState } from "react";
import { XP_TITLES, getXpTitle } from "../constants/game";

type Tier = typeof XP_TITLES[number];

const storageKey = (uid: string) => `voca:last-tier:${uid}`;

function readLastSeenMin(uid: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (raw == null) {
      // First-time seed — write current so we don't fire retroactively.
      localStorage.setItem(storageKey(uid), String(fallback));
      return fallback;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeLastSeenMin(uid: string, min: number): void {
  try {
    localStorage.setItem(storageKey(uid), String(min));
  } catch {/* private-mode / quota — non-fatal */}
}

interface UseLevelUpOptions {
  uid: string | null | undefined;
  xp: number;
  /** When false, the hook is inert — silences level-ups for guests and
   *  pre-auth flows so a sign-in XP seed doesn't fire a modal. */
  enabled: boolean;
}

export function useLevelUp({ uid, xp, enabled }: UseLevelUpOptions) {
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  // Initialise lastSeen on uid change.  The read also seeds the
  // localStorage entry on first-ever device-use so an existing high-
  // XP student doesn't get retroactively spammed.
  //
  // We deliberately call setState inside this effect: it's a one-shot
  // sync of external (localStorage) state into React on identity
  // change, which is the documented pattern useSyncExternalStore was
  // designed for but a single read is overkill for that API.  The
  // effect does NOT depend on xp — re-running on every tick would
  // clobber the in-flight pending tier.
  useEffect(() => {
    if (!enabled || !uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSeen(null);
      return;
    }
    const currentMin = getXpTitle(xp).min;
    setLastSeen(readLastSeenMin(uid, currentMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, enabled]);

  const pending = useMemo<Tier | null>(() => {
    if (!enabled || lastSeen == null) return null;
    const currentMin = getXpTitle(xp).min;
    if (currentMin <= lastSeen) return null;
    return XP_TITLES.find((t) => t.min === currentMin) ?? null;
  }, [enabled, lastSeen, xp]);

  const dismiss = () => {
    if (!pending || !uid) return;
    writeLastSeenMin(uid, pending.min);
    setLastSeen(pending.min);
  };

  return { pending, dismiss };
}
