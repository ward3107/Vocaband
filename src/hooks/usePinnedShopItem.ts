// Save-for-later state for the Marketplace Spotlight. Persists per-user
// in localStorage — pin survives reloads on the same device but doesn't
// follow the student across devices. Acceptable for v1: pinning is a
// UX nudge, not financial data, and if a kid re-pins on a new phone the
// cost is one tap. No backend write.

import { useCallback, useState } from 'react';

export type PinnedKind =
  | 'avatar'
  | 'theme'
  | 'egg'
  | 'frame'
  | 'title'
  | 'booster'
  | 'powerUp';

export interface PinnedItem {
  kind: PinnedKind;
  id: string;
}

const storageKey = (uid: string) => `vocaband_shop_pin_${uid}`;

function readInitial(uid: string): PinnedItem | null {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.kind && parsed?.id) return parsed as PinnedItem;
    return null;
  } catch {
    return null;
  }
}

export function usePinnedShopItem(uid: string | undefined) {
  const [pinned, setPinned] = useState<PinnedItem | null>(() =>
    uid ? readInitial(uid) : null,
  );

  const pin = useCallback(
    (kind: PinnedKind, id: string) => {
      if (!uid) return;
      const next = { kind, id };
      localStorage.setItem(storageKey(uid), JSON.stringify(next));
      setPinned(next);
    },
    [uid],
  );

  const unpin = useCallback(() => {
    if (!uid) return;
    localStorage.removeItem(storageKey(uid));
    setPinned(null);
  }, [uid]);

  const togglePin = useCallback(
    (kind: PinnedKind, id: string) => {
      if (pinned?.kind === kind && pinned.id === id) {
        unpin();
      } else {
        pin(kind, id);
      }
    },
    [pinned, pin, unpin],
  );

  const isPinned = useCallback(
    (kind: PinnedKind, id: string) =>
      pinned?.kind === kind && pinned.id === id,
    [pinned],
  );

  return { pinned, pin, unpin, togglePin, isPinned };
}
