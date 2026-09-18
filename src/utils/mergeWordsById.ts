import type { Word } from "../data/vocabulary";

/**
 * Union two Word lists by id, keeping the existing selection first.
 *
 * Used when seeding a picker selection from another source (e.g. a saved
 * assignment) so re-picking the same source — or one that overlaps the
 * current pick — never duplicates a word. `current` wins on a collision:
 * an id already present keeps its existing object and position; only
 * genuinely new ids are appended, in their original order, and `incoming`
 * is de-duped against itself too. When nothing new is added the original
 * `current` reference is returned unchanged so callers can skip a render.
 */
export function mergeWordsById(current: Word[], incoming: Word[]): Word[] {
  const seen = new Set(current.map((w) => w.id));
  const additions: Word[] = [];
  for (const w of incoming) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    additions.push(w);
  }
  return additions.length === 0 ? current : [...current, ...additions];
}
