// Which Pet Shop accessory the student has EQUIPPED on their companion
// pet. Ownership of accessories is authoritative server-side (the
// `pet_<id>` entries in unlocked_avatars), but "which one is currently
// worn" is a lightweight per-device cosmetic choice — so it lives in
// localStorage, same as the shop pin and the booster timers. No backend
// write, no schema change. Re-equipping on a new device is one tap.
import { useCallback, useEffect, useState } from 'react';

const storageKey = (uid: string) => `vocaband_pet_accessory_${uid}`;

export interface PetAccessoryState {
  /** Equipped accessory id, or null when the pet wears nothing. */
  equipped: string | null;
  /** Equip an accessory (persists). Pass null to take it off. */
  setEquipped: (id: string | null) => void;
}

export function usePetAccessory(uid: string | null | undefined): PetAccessoryState {
  const userKey = uid || '__anon__';

  const [equipped, setEquippedState] = useState<string | null>(() => {
    try { return localStorage.getItem(storageKey(userKey)) || null; } catch { return null; }
  });

  // Re-sync once auth settles and userKey flips from '__anon__' to the
  // real uid (same first-render gotcha useRetention documents).
  useEffect(() => {
    try { setEquippedState(localStorage.getItem(storageKey(userKey)) || null); } catch {}
  }, [userKey]);

  const setEquipped = useCallback((id: string | null) => {
    setEquippedState(id);
    try {
      if (id) localStorage.setItem(storageKey(userKey), id);
      else localStorage.removeItem(storageKey(userKey));
    } catch {}
  }, [userKey]);

  return { equipped, setEquipped };
}
