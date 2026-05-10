// Hebrew OCR — small client helper for the Hebrew assignment wizard.
//
// HTTP plumbing (compress, auth, fetch, error handling) is shared with
// the English OCR pipeline via postOcrImage. Only the post-extraction
// step is Hebrew-specific: tokens are matched against HEBREW_LEMMAS by
// lemmaPlain (after stripping niqqud). Returns matched lemma ids and
// the leftover unmatched tokens for the wizard's review panel.

import { HEBREW_LEMMAS } from "../data/vocabulary-hebrew";
import { stripNiqqud } from "../data/types-hebrew";
import { postOcrImage, isPostOcrImageError, type PostOcrImageCallbacks } from "./postOcrImage";

export interface HebrewOcrResult {
  matchedIds: number[];
  unmatched: string[];
  rawCount: number;
}

export interface HebrewOcrOptions extends PostOcrImageCallbacks {
  onError?: (message: string) => void;
}

const PLAIN_LEMMA_INDEX: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (const l of HEBREW_LEMMAS) {
    m.set(stripNiqqud(l.lemmaPlain).trim(), l.id);
  }
  return m;
})();

export async function runHebrewOcr(
  file: File,
  options: HebrewOcrOptions = {},
): Promise<HebrewOcrResult | null> {
  const { onError, onProgress, onStatus } = options;

  let result;
  try {
    result = await postOcrImage(file, "he", { onProgress, onStatus });
  } catch (err) {
    if (isPostOcrImageError(err)) {
      onError?.(err.message);
    } else {
      onError?.("שגיאה בלתי צפויה בעיבוד התמונה.");
    }
    return null;
  }

  const tokens = result.words.map((w) => stripNiqqud(w).trim()).filter(Boolean);

  const matchedIds: number[] = [];
  const matchedSet = new Set<number>();
  const unmatched: string[] = [];
  for (const t of tokens) {
    const id = PLAIN_LEMMA_INDEX.get(t);
    if (id !== undefined) {
      if (!matchedSet.has(id)) {
        matchedSet.add(id);
        matchedIds.push(id);
      }
    } else {
      unmatched.push(t);
    }
  }

  return { matchedIds, unmatched, rawCount: tokens.length };
}
