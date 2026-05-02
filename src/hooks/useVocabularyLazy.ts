/**
 * useVocabularyLazy — defer the 370 kB vocabulary chunk out of the
 * initial bundle.
 *
 * Vocaband's `data/vocabulary.ts` is the largest single asset in the
 * app: 6500+ word tuples, ~376 kB raw / 139 kB gzipped.  Before this
 * hook, App.tsx imported it statically at the top of the file, which
 * forced every page-load — including unauthenticated landing-page
 * visits — to download it.
 *
 * Public visitors (landing, terms, privacy, security, accessibility)
 * never need vocabulary data.  The data is only required once a user
 * is logged in OR they enter the demo mode.  Lazy-loading saves
 * ~140 kB gzip on the critical path (LCP / FCP both improve).
 *
 * Usage:
 *
 *   const vocab = useVocabularyLazy(shouldLoad);
 *   if (!vocab) return <Spinner />;  // briefly during the dynamic import
 *   const { ALL_WORDS, SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS } = vocab;
 *
 * `shouldLoad` is the gate — pass `true` once the user is past public
 * views (e.g. logged in, or showed demo).  Once `true`, the hook
 * fires the dynamic import, caches it on the module, and resolves.
 *
 * The dynamic import is cached at module level so a re-render doesn't
 * re-fetch.
 */
import { useEffect, useState } from "react";
import type { Word } from "../data/vocabulary";

export interface VocabularyModule {
  ALL_WORDS: Word[];
  SET_1_WORDS: Word[];
  SET_2_WORDS: Word[];
  SET_3_WORDS: Word[];
  TOPIC_PACKS: { name: string; icon: string; ids: number[] }[];
}

let cached: VocabularyModule | null = null;
let inFlight: Promise<VocabularyModule> | null = null;

async function loadVocabulary(): Promise<VocabularyModule> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const mod = await import("../data/vocabulary");
    cached = {
      ALL_WORDS: mod.ALL_WORDS,
      SET_1_WORDS: mod.SET_1_WORDS,
      SET_2_WORDS: mod.SET_2_WORDS,
      SET_3_WORDS: mod.SET_3_WORDS,
      TOPIC_PACKS: mod.TOPIC_PACKS,
    };
    return cached;
  })();
  return inFlight;
}

export function useVocabularyLazy(shouldLoad: boolean): VocabularyModule | null {
  const [vocab, setVocab] = useState<VocabularyModule | null>(cached);

  useEffect(() => {
    if (!shouldLoad) return;
    if (cached) {
      setVocab(cached);
      return;
    }
    let cancelled = false;
    loadVocabulary().then(mod => {
      if (!cancelled) setVocab(mod);
    });
    return () => { cancelled = true; };
  }, [shouldLoad]);

  return vocab;
}

/**
 * Synchronous accessor for code paths that absolutely need the
 * vocabulary right now (e.g. game-mode transition handlers running
 * after the user has been authenticated for several seconds).
 *
 * Returns null if the module hasn't been loaded yet — caller is
 * responsible for handling the gate.  In practice, by the time any
 * authenticated view renders, the lazy effect has resolved.
 */
export function getCachedVocabulary(): VocabularyModule | null {
  return cached;
}
