/**
 * Six tamed-rainbow gradients used by the v2 set / collection cards.
 * The set chooses one via `gradientFor(id)` so the same item always
 * gets the same thumb tint across loads.
 */
export type ThumbGradient = "g1" | "g2" | "g3" | "g4" | "g5" | "g6";

export const THUMB_GRADIENTS: Record<ThumbGradient, string> = {
  g1: "linear-gradient(135deg, #9F87F2, #D183B8)",
  g2: "linear-gradient(135deg, #87BCEF, #7CD9B9)",
  g3: "linear-gradient(135deg, #F5C685, #F5A39E)",
  g4: "linear-gradient(135deg, #7B61D6, #5990D4)",
  g5: "linear-gradient(135deg, #F1B0D4, #F5A39E)",
  g6: "linear-gradient(135deg, #4DBA94, #87BCEF)",
};

const SLOTS: ThumbGradient[] = ["g1", "g2", "g3", "g4", "g5", "g6"];

export function gradientFor(id: string): ThumbGradient {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SLOTS[h % SLOTS.length];
}
