import { getCachedVocabulary } from "../hooks/useVocabularyLazy";
import type { Word } from "../data/vocabulary";
import type { AssignmentData } from "../core/supabase";

/**
 * Resolve the Word objects for an assignment WITHOUT dragging the
 * 432 kB vocabulary file into the student-dashboard chunk.
 *
 * Why this exists: the dashboard + its cards used to
 * `import { ALL_WORDS } from "../data/vocabulary"` directly. Because
 * `vocabulary` is its own manualChunk (see vite.config.ts), that static
 * import made the dashboard chunk hard-depend on it — so every student
 * login had to fetch + parse ~139 kB gz of word data BEFORE the
 * dashboard could render, which is exactly the "slow login / loading"
 * the symptom describes.
 *
 * The vocabulary is only actually needed when a student TAPS an
 * assignment to launch a game — a click handler, never the render path.
 * App.tsx already warms the lazy vocabulary chunk the moment any
 * authenticated (non-public) view mounts, so by tap-time
 * `getCachedVocabulary()` is populated and this resolves synchronously
 * via the microtask. On the rare cache miss we await the dynamic import
 * (the runtime dedupes it with App's in-flight load — no double fetch).
 *
 * Custom assignments embed their own `words`; curriculum assignments
 * carry only `wordIds` and need ALL_WORDS to hydrate. Truthiness check
 * on `assignment.words` mirrors the original `assignment.words || …`.
 */
export async function resolveAssignmentWords(assignment: AssignmentData): Promise<Word[]> {
  if (assignment.words) return assignment.words;

  const ids = assignment.wordIds;
  let vocab = getCachedVocabulary();
  if (!vocab) {
    const mod = await import("../data/vocabulary");
    vocab = {
      ALL_WORDS: mod.ALL_WORDS,
      SET_1_WORDS: mod.SET_1_WORDS,
      SET_2_WORDS: mod.SET_2_WORDS,
      SET_3_WORDS: mod.SET_3_WORDS,
      TOPIC_PACKS: mod.TOPIC_PACKS,
    };
  }
  return vocab.ALL_WORDS.filter((w) => ids.includes(w.id));
}
