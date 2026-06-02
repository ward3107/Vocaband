/**
 * useLevelUp — watches a student's XP and fires a single "level up"
 * event when they cross an XP_TITLES tier boundary.
 *
 * The hook stores the last-seen tier minimum in localStorage per user so
 * a refresh during a celebration doesn't fire it twice, and a student
 * who logs in already past a tier doesn't get retroactively spammed.
 *
 * Returns:
 *   - pending : the tier just crossed (or null when nothing pending)
 *   - dismiss : clears the pending tier
 *
 * The caller (App.tsx) renders LevelUpModal when `pending` is non-null
 * and calls `dismiss` on close.
 */
import { useEffect, useState } from "react";
import { XP_TITLES, getXpTitle } from "../constants/game";

type Tier = typeof XP_TITLES[number];

const storageKey = (uid: string) => `voca:last-tier:${uid}`;

function readLastSeenMin(uid: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (raw == null) return fallback;
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
  /** When false, the hook is inert — used to silence level-ups for
   *  guests / pre-auth flows so a sign-in seed doesn't fire a modal. */
  enabled: boolean;
}

export function useLevelUp({ uid, xp, enabled }: UseLevelUpOptions) {
  const [pending, setPending] = useState<Tier | null>(null);

  useEffect(() => {
    if (!enabled || !uid) return;
    const currentMin = getXpTitle(xp).min;
    const lastSeen = readLastSeenMin(uid, currentMin);
    if (currentMin > lastSeen) {
      const tier = XP_TITLES.find((t) => t.min === currentMin) ?? null;
      if (tier) setPending(tier);
      writeLastSeenMin(uid, currentMin);
    } else if (lastSeen !== currentMin) {
      // First-time seed (no localStorage entry yet) OR XP went down
      // (shouldn't happen normally, but be defensive — just sync without
      // firing the modal).
      writeLastSeenMin(uid, currentMin);
    }
  }, [uid, xp, enabled]);

  return {
    pending,
    dismiss: () => setPending(null),
  };
}
