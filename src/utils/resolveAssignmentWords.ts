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
 * carry only `wordIds` and need ALL_WORDS to hydrate.
 *
 * The embedded `words` array is treated as authoritative only when it is
 * NON-EMPTY and covers every id in `wordIds`. The original check here was
 * a bare truthiness test (`if (assignment.words)`), and `[]` is truthy in
 * JS — so an assignment row whose `words` JSONB had been written empty or
 * partial short-circuited to that broken list and never hydrated from
 * `wordIds`. Downstream that surfaced as zero words, and the game view
 * substituted a generic Set-2 sample the teacher never assigned (the
 * "student sees the demo list" bug). Rows written before the save-path
 * fix are still in the database, so backfilling the missing ids here is
 * what actually heals them at read time.
 */
export async function resolveAssignmentWords(assignment: AssignmentData): Promise<Word[]> {
  const embedded = assignment.words ?? [];
  const ids = assignment.wordIds ?? [];

  // Fully-hydrated embedded list (the normal custom-assignment case).
  const embeddedIds = new Set(embedded.map((w) => w.id));
  const missingIds = ids.filter((id) => !embeddedIds.has(id));
  if (embedded.length > 0 && missingIds.length === 0) return embedded;

  // Nothing to hydrate from either — a genuinely empty assignment. Return
  // the embedded list as-is rather than inventing words; callers must treat
  // an empty result as "this assignment has no words", never as "use a
  // sample list".
  if (missingIds.length === 0) return embedded;

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

  const hydrated = vocab.ALL_WORDS.filter((w) => missingIds.includes(w.id));
  // Custom words (negative ids) only ever live in the embedded array and
  // are absent from wordIds, so keeping both halves preserves the teacher's
  // full list rather than silently dropping one kind.
  return embedded.length > 0 ? [...embedded, ...hydrated] : hydrated;
}
