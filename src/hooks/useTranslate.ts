/**
 * useTranslate — server-proxied English → Hebrew + Arabic translation
 * with an in-session cache.
 *
 * Calls /api/translate (which fronts the Gemini-backed batch translator
 * on the Render server) and caches results per-word for the lifetime of
 * the React tree, so repeated lookups of the same word are free.
 *
 * Two callable shapes:
 *   - `translateWordsBatch(englishWords)` — preferred for any flow that
 *     has more than one word at a time (paste, OCR, custom-word imports).
 *     One round-trip for the whole batch; cached words are returned from
 *     memory without hitting the network.
 *   - `translateWord(word)` — convenience wrapper for the single-word
 *     "Auto-translate" button on the assignment editor; thin facade
 *     over the batch path.
 *
 * Silent on failure: a network error clears `match` to undefined and
 * skips that word's entry in the result map. Callers already treat
 * missing entries as "no translation available", so no error UI is
 * surfaced — translation is a nice-to-have, not a blocker.
 */
import { useCallback, useRef } from "react";
import { supabase } from "../core/supabase";
import { trackAutoError } from "../errorTracking";

export interface TranslationEntry {
  hebrew: string;
  arabic: string;
  /** Russian translation. Optional because older deploys of /api/translate
   *  (pre-2026-04) didn't include it; the client treats `undefined` and
   *  `""` the same when rendering. */
  russian?: string;
  /** Confidence-ish: 1 when all languages came back, ~0.5 when only some. */
  match: number;
}

export function useTranslate() {
  const translationCache = useRef<Map<string, TranslationEntry>>(new Map());

  const translateWordsBatch = useCallback(async (
    englishWords: string[],
  ): Promise<Map<string, TranslationEntry>> => {
    const out = new Map<string, TranslationEntry>();
    const uncached: string[] = [];

    for (const w of englishWords) {
      const key = w.toLowerCase().trim();
      if (!key) continue;
      const cached = translationCache.current.get(key);
      if (cached) {
        out.set(key, cached);
      } else {
        uncached.push(w.trim());
      }
    }

    if (uncached.length === 0) return out;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return out;

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ words: uncached }),
      });

      if (!res.ok) {
        console.warn('[translate] /api/translate failed:', res.status);
        return out;
      }

      const { hebrew, arabic, russian } = await res.json() as {
        hebrew?: string[]; arabic?: string[]; russian?: string[];
      };
      uncached.forEach((word, i) => {
        const he = hebrew?.[i]?.trim() || '';
        const ar = arabic?.[i]?.trim() || '';
        const ru = russian?.[i]?.trim() || '';
        if (!he && !ar && !ru) return;
        // Confidence is a fraction of the three target languages that
        // came back non-empty — 1.0 when all three landed.
        const filled = [he, ar, ru].filter(Boolean).length;
        const entry: TranslationEntry = {
          hebrew: he,
          arabic: ar,
          russian: ru || undefined,
          match: filled / 3,
        };
        const key = word.toLowerCase();
        translationCache.current.set(key, entry);
        out.set(key, entry);
      });
    } catch (error) {
      trackAutoError(error, 'Translation service error');
    }

    return out;
  }, []);

  // Single-word translator kept for API compatibility with existing callers
  // (manual "Auto-translate" button, Quick Play). Thin wrapper over the batch.
  const translateWord = useCallback(async (
    englishWord: string,
  ): Promise<TranslationEntry | null> => {
    const result = await translateWordsBatch([englishWord]);
    return result.get(englishWord.toLowerCase().trim()) || null;
  }, [translateWordsBatch]);

  return { translateWord, translateWordsBatch };
}
