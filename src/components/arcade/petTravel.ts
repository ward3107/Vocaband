/**
 * Remembers which island the explorer pet was last sitting on, per
 * assignment, so the map can animate it from the old island to the new
 * recommended one after a mode is completed. First visit returns
 * `from: null` so the caller places the pet without a walk animation.
 */
export interface PetTravel {
  from: number | null;
  to: number;
}

const key = (assignmentId: string) => `vb_pet_island_${assignmentId}`;

export function advancePetTravel(
  assignmentId: string,
  toIndex: number,
  storage: Storage = sessionStorage,
): PetTravel {
  const raw = storage.getItem(key(assignmentId));
  const parsed = raw == null ? null : Number(raw);
  const from = parsed != null && Number.isFinite(parsed) ? parsed : null;
  storage.setItem(key(assignmentId), String(toIndex));
  return { from, to: toIndex };
}
