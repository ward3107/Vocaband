/**
 * word-relations.ts — hand-curated antonyms + synonyms dataset for
 * the "Synonyms & Antonyms" game mode.
 *
 * Each entry pairs an English base word with arrays of synonyms and
 * antonyms.  The mode picks one entry, randomly chooses synonym or
 * antonym, builds a 4-option multi-choice question (1 correct from
 * the matching list + 3 distractors from other entries' relations),
 * and shows the round.
 *
 * Curation notes:
 *   - Targets band-2 vocabulary (grades 4-9) so distractors feel
 *     plausible and recognised.
 *   - Every entry has BOTH ≥2 synonyms AND ≥1 antonym, so the same
 *     entry can serve either question type without skipping.
 *   - English-only — translations live in the existing UI strings,
 *     not in this file.  The mode shows the base word and four
 *     English options; the question prompt ("Pick the synonym",
 *     "Pick the antonym") is translated via the locale file.
 *
 * Adding more: append to RELATIONS.  The file order isn't meaningful
 * — the game shuffles its question pool each round.
 *
 * Out of scope for v1 (deferred):
 *   - Per-relation difficulty / grade tagging
 *   - "Mixed" multi-correct answers (some prompts have 2 valid syn)
 *   - Translated distractor labels (we keep English to teach the
 *     core L2 vocabulary, matching the rest of the game)
 */

export interface WordRelation {
  /** Base English word, lowercase. */
  english: string;
  /** Synonyms — English words.  Order is not meaningful.  ≥2 entries. */
  synonyms: string[];
  /** Antonyms — English words.  Order is not meaningful.  ≥1 entry. */
  antonyms: string[];
  /** Optional band-2 difficulty hint.  Reserved for future filtering;
   *  v1 ignores this and shows entries randomly. */
  level?: 1 | 2 | 3;
}

export const RELATIONS: WordRelation[] = [
  // ── Adjectives — emotion / feel ────────────────────────────────
  { english: 'happy',       synonyms: ['glad', 'cheerful', 'joyful'],          antonyms: ['sad', 'unhappy', 'miserable'],   level: 1 },
  { english: 'sad',         synonyms: ['unhappy', 'sorrowful'],                antonyms: ['happy', 'glad', 'cheerful'],      level: 1 },
  { english: 'angry',       synonyms: ['mad', 'furious'],                       antonyms: ['calm', 'pleased'],                level: 2 },
  { english: 'kind',        synonyms: ['nice', 'friendly', 'gentle'],           antonyms: ['mean', 'cruel', 'unkind'],        level: 1 },
  { english: 'brave',       synonyms: ['courageous', 'fearless', 'bold'],       antonyms: ['scared', 'afraid', 'cowardly'],   level: 2 },

  // ── Adjectives — size / quantity ───────────────────────────────
  { english: 'big',         synonyms: ['large', 'huge', 'enormous'],            antonyms: ['small', 'tiny', 'little'],        level: 1 },
  { english: 'small',       synonyms: ['tiny', 'little', 'mini'],               antonyms: ['big', 'large', 'huge'],           level: 1 },
  { english: 'tall',        synonyms: ['high', 'lofty'],                        antonyms: ['short', 'low'],                   level: 1 },
  { english: 'full',        synonyms: ['packed', 'crowded'],                    antonyms: ['empty', 'vacant'],                level: 1 },
  { english: 'rich',        synonyms: ['wealthy', 'affluent'],                  antonyms: ['poor', 'broke'],                  level: 2 },

  // ── Adjectives — speed / time ──────────────────────────────────
  { english: 'fast',        synonyms: ['quick', 'rapid', 'swift'],              antonyms: ['slow', 'sluggish'],               level: 1 },
  { english: 'slow',        synonyms: ['gradual', 'sluggish'],                  antonyms: ['fast', 'quick', 'rapid'],         level: 1 },
  { english: 'new',         synonyms: ['fresh', 'modern', 'recent'],            antonyms: ['old', 'ancient', 'outdated'],     level: 1 },
  { english: 'old',         synonyms: ['ancient', 'aged', 'elderly'],           antonyms: ['new', 'young', 'fresh'],          level: 1 },
  { english: 'young',       synonyms: ['youthful'],                             antonyms: ['old', 'elderly'],                 level: 1 },

  // ── Adjectives — quality / appearance ──────────────────────────
  { english: 'beautiful',   synonyms: ['pretty', 'lovely', 'gorgeous'],         antonyms: ['ugly', 'plain'],                  level: 2 },
  { english: 'ugly',        synonyms: ['hideous', 'plain'],                     antonyms: ['beautiful', 'pretty', 'lovely'],  level: 2 },
  { english: 'clean',       synonyms: ['tidy', 'neat', 'pure'],                 antonyms: ['dirty', 'messy', 'filthy'],       level: 1 },
  { english: 'dirty',       synonyms: ['filthy', 'messy', 'soiled'],            antonyms: ['clean', 'tidy', 'neat'],          level: 1 },
  { english: 'interesting', synonyms: ['fascinating', 'engaging'],              antonyms: ['boring', 'dull'],                 level: 2 },
  { english: 'boring',      synonyms: ['dull', 'tedious'],                      antonyms: ['interesting', 'fascinating'],     level: 2 },
  { english: 'funny',       synonyms: ['hilarious', 'amusing'],                 antonyms: ['serious', 'dull'],                level: 2 },

  // ── Adjectives — temperature / texture / state ────────────────
  { english: 'hot',         synonyms: ['warm', 'scorching'],                    antonyms: ['cold', 'cool', 'freezing'],       level: 1 },
  { english: 'cold',        synonyms: ['cool', 'freezing', 'chilly'],           antonyms: ['hot', 'warm'],                    level: 1 },
  { english: 'wet',         synonyms: ['damp', 'soaked'],                       antonyms: ['dry'],                            level: 1 },
  { english: 'soft',        synonyms: ['gentle', 'smooth'],                     antonyms: ['hard', 'rough', 'harsh'],         level: 2 },
  { english: 'easy',        synonyms: ['simple', 'effortless'],                 antonyms: ['hard', 'difficult', 'tough'],     level: 1 },
  { english: 'strong',      synonyms: ['powerful', 'mighty', 'sturdy'],         antonyms: ['weak', 'fragile'],                level: 2 },
  { english: 'weak',        synonyms: ['feeble', 'fragile'],                    antonyms: ['strong', 'powerful'],             level: 2 },

  // ── Adjectives — light / position ──────────────────────────────
  { english: 'light',       synonyms: ['bright', 'luminous'],                   antonyms: ['dark', 'dim'],                    level: 1 },
  { english: 'dark',        synonyms: ['dim', 'gloomy', 'shadowy'],             antonyms: ['light', 'bright'],                level: 1 },
  { english: 'open',        synonyms: ['unlocked', 'available'],                antonyms: ['closed', 'shut', 'locked'],       level: 1 },
  { english: 'quiet',       synonyms: ['silent', 'hushed', 'calm'],             antonyms: ['loud', 'noisy'],                  level: 1 },
  { english: 'safe',        synonyms: ['secure', 'protected'],                  antonyms: ['dangerous', 'risky', 'unsafe'],   level: 2 },
  { english: 'expensive',   synonyms: ['costly', 'pricey'],                     antonyms: ['cheap', 'affordable'],            level: 2 },
  { english: 'true',        synonyms: ['correct', 'accurate', 'real'],          antonyms: ['false', 'wrong', 'fake'],         level: 1 },

  // ── Verbs — action ─────────────────────────────────────────────
  { english: 'start',       synonyms: ['begin', 'commence'],                    antonyms: ['stop', 'end', 'finish'],          level: 1 },
  { english: 'stop',        synonyms: ['halt', 'cease', 'pause'],               antonyms: ['start', 'begin', 'continue'],     level: 1 },
  { english: 'accept',      synonyms: ['agree', 'approve'],                     antonyms: ['refuse', 'reject', 'deny'],       level: 2 },
  { english: 'build',       synonyms: ['construct', 'create'],                  antonyms: ['destroy', 'demolish', 'break'],   level: 2 },
  { english: 'find',        synonyms: ['discover', 'locate'],                   antonyms: ['lose', 'miss'],                   level: 1 },
  { english: 'give',        synonyms: ['hand', 'offer', 'donate'],              antonyms: ['take', 'receive', 'keep'],        level: 1 },
  { english: 'help',        synonyms: ['assist', 'aid', 'support'],             antonyms: ['hinder', 'harm'],                 level: 1 },
  { english: 'win',         synonyms: ['succeed', 'triumph'],                   antonyms: ['lose', 'fail'],                   level: 1 },
  { english: 'learn',       synonyms: ['study', 'discover'],                    antonyms: ['forget', 'ignore'],               level: 1 },
  { english: 'love',        synonyms: ['adore', 'cherish'],                     antonyms: ['hate', 'despise', 'dislike'],     level: 1 },
  { english: 'remember',    synonyms: ['recall', 'recollect'],                  antonyms: ['forget'],                          level: 1 },
  { english: 'arrive',      synonyms: ['reach', 'come'],                        antonyms: ['leave', 'depart'],                level: 1 },
  { english: 'buy',         synonyms: ['purchase', 'get'],                      antonyms: ['sell', 'return'],                 level: 1 },
  { english: 'hide',        synonyms: ['conceal', 'cover'],                     antonyms: ['show', 'reveal'],                 level: 2 },
  { english: 'ask',         synonyms: ['question', 'inquire'],                  antonyms: ['answer', 'reply'],                level: 1 },

  // ── Adverbs — frequency / direction ────────────────────────────
  { english: 'quickly',     synonyms: ['fast', 'rapidly', 'swiftly'],           antonyms: ['slowly', 'gradually'],            level: 2 },
  { english: 'always',      synonyms: ['forever', 'constantly'],                antonyms: ['never', 'sometimes'],             level: 1 },
  { english: 'often',       synonyms: ['frequently', 'regularly'],              antonyms: ['rarely', 'seldom', 'never'],      level: 2 },
  { english: 'before',      synonyms: ['earlier', 'prior'],                     antonyms: ['after', 'following'],             level: 1 },
  { english: 'above',       synonyms: ['over', 'atop'],                         antonyms: ['below', 'under', 'beneath'],      level: 2 },
  { english: 'inside',      synonyms: ['within', 'indoors'],                    antonyms: ['outside', 'outdoors'],            level: 1 },

  // ── Nouns — abstract pairs ─────────────────────────────────────
  { english: 'peace',       synonyms: ['calm', 'tranquility'],                  antonyms: ['war', 'conflict'],                level: 2 },
  { english: 'truth',       synonyms: ['fact', 'honesty'],                      antonyms: ['lie', 'falsehood'],               level: 2 },
  { english: 'friend',      synonyms: ['buddy', 'pal', 'companion'],            antonyms: ['enemy', 'foe'],                   level: 1 },
];

/** Fisher-Yates shuffle (returns a new array). */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick N random unique entries from RELATIONS. */
export function pickRandomRelations(n: number): WordRelation[] {
  return shuffle(RELATIONS).slice(0, Math.min(n, RELATIONS.length));
}

/** All synonyms + antonyms across the dataset, deduplicated.  Used as
 *  a global distractor pool when filtering by question type yields too
 *  few options to fill out 4 choices. */
export const ALL_RELATION_WORDS: string[] = (() => {
  const set = new Set<string>();
  for (const r of RELATIONS) {
    for (const s of r.synonyms) set.add(s);
    for (const a of r.antonyms) set.add(a);
  }
  return Array.from(set);
})();
