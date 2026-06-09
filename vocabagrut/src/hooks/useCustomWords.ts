import { useCallback, useEffect, useState } from 'react';
import type { VocabWord } from '../core/types';

// User-supplied vocabulary, persisted locally so a student's own list
// survives reloads without any backend. These words join the standard
// word-flow everywhere `customWords` is merged in (Vocabulary + Build).
const STORAGE_KEY = 'vocabagrut_custom_words';

const load = (): VocabWord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function useCustomWords() {
  const [words, setWords] = useState<VocabWord[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch {
      /* storage blocked / full — keep in-memory copy */
    }
  }, [words]);

  // De-duplicate by lowercase headword so the same word added twice
  // (e.g. paste then photo) doesn't pile up in the flow.
  const add = useCallback((incoming: VocabWord[]) => {
    setWords((prev) => {
      const seen = new Set(prev.map((w) => w.word.trim().toLowerCase()));
      const fresh = incoming.filter((w) => {
        const key = w.word.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...fresh];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const clear = useCallback(() => setWords([]), []);

  return { words, add, remove, clear };
}
