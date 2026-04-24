/** Immutable Fisher-Yates shuffle */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Split array into chunks of a given size */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Remove a key from an object immutably (more efficient than spread + delete) */
export function removeKey<T extends Record<string, unknown>>(obj: T, key: keyof T | string): T {
  const { [key]: removed, ...rest } = obj as any;
  return rest;
}

/** Add item to array if not already present (for tracking unique items like mistakes) */
export function addUnique<T>(array: T[], item: T): T[] {
  return array.includes(item) ? array : [...array, item];
}

/** Unbiased secure random integer in [0, max).  Uses crypto.getRandomValues
 *  when available; returns 0 for max <= 1. */
export function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}
