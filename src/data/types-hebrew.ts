// VocaHebrew — Hebrew-as-source-language lemma shape.
//
// Distinct from src/data/vocabulary.ts (English source, Hebrew/Arabic
// as TRANSLATION targets). Here Hebrew IS the source: a native-speaker
// 5th-grader uses these to learn niqqud, shoresh, synonyms, etc.
// Translations are still carried so the same data feeds the
// learner-track modes (HE→EN/AR/RU) for non-native students.

export type HebrewPos =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "preposition"
  | "pronoun"
  | "phrase"
  | "interjection"
  | "other";

export type HebrewGender = "m" | "f" | "both";
export type HebrewNumber = "singular" | "plural" | "dual";

// 7 binyanim — the verb conjugation patterns.  Only set when pos === "verb".
export type HebrewBinyan =
  | "paal"      // פָּעַל (also called קל)
  | "nifal"     // נִפְעַל
  | "piel"      // פִּעֵל
  | "pual"      // פֻּעַל
  | "hifil"     // הִפְעִיל
  | "hufal"     // הֻפְעַל
  | "hitpael";  // הִתְפַּעֵל

// Israeli school grade bands aligned to the Ministry of Education
// תכנית הלימודים בעברית.  Each band corresponds to a major
// curricular shift:
//   * 1-2  — alphabet mastery, niqqud-only, CVC reading, sight words
//   * 3-4  — fluent niqqud reading, basic morphology, vocabulary expansion
//   * 5-6  — shoresh awareness, mishkal patterns, gender/number agreement
//   * 7-9  — חטיבת ביניים: binyanim, smichut, advanced grammar, niqqud fades
//   * 10-12 — תיכון: literary register, classical/biblical Hebrew, Bagrut
// See src/data/hebrew-curriculum.ts for the per-band skill matrix.
export type HebrewGradeBand = "1-2" | "3-4" | "5-6" | "7-9" | "10-12";

export interface HebrewLemma {
  /** Stable numeric id — same role as Word.id in vocabulary.ts. */
  id: number;

  // ── Spelling forms ──────────────────────────────────────────────
  /** With full niqqud (vowel marks).  e.g. "כֶּלֶב". Used by Niqqud Mode. */
  lemmaNiqqud: string;
  /** Consonants only — what students see in newspapers.  e.g. "כלב". */
  lemmaPlain: string;

  // ── Morphology ──────────────────────────────────────────────────
  pos: HebrewPos;
  /** 3 (sometimes 4) root consonants. e.g. ["כ","ל","ב"]. */
  shoresh?: readonly string[];
  /** Verb pattern — only set when pos === "verb". */
  binyan?: HebrewBinyan;
  /** Noun pattern (mishkal) — free-text label, only set for nouns. */
  mishkal?: string;
  /** Grammatical gender — set for nouns and adjectives. */
  gender?: HebrewGender;
  number?: HebrewNumber;

  // ── Semantic content (NATIVE track) ─────────────────────────────
  /** Hebrew definition, IN HEBREW. */
  definitionHe: string;
  synonymsHe?: readonly string[];
  antonymsHe?: readonly string[];
  /** Example sentence WITH niqqud so the renderer can choose to
   *  strip it for older grades. */
  exampleHe: string;

  // ── Translations (LEARNER track) ────────────────────────────────
  translationEn: string;
  translationAr: string;
  translationRu?: string;

  // ── Pedagogical metadata ────────────────────────────────────────
  gradeBand: HebrewGradeBand;
  /** Thematic tag — e.g. "animals", "family", "school", "weather". */
  theme: string;

  // ── Audio (deferred) ────────────────────────────────────────────
  /** Optional override.  When unset, the audio loader will synthesize
   *  the path as `/audio-hebrew/<id>.mp3` once the Hebrew TTS pipeline
   *  ships.  Until then, Niqqud Mode falls back to the browser's
   *  built-in Web Speech API with a Hebrew voice if available. */
  audioUrl?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Strip all niqqud marks from a string.  Hebrew niqqud lives in the
 *  ranges U+05B0–U+05BC (vowels), U+05C1–U+05C2 (shin/sin dots), and
 *  U+05C7 (qamatz qatan).  Used to derive lemmaPlain from lemmaNiqqud
 *  at seed-time and to render unmarked example sentences for grades
 *  10–12. */
const NIQQUD_RE = /[ְ-ׇּׁׂ]/g;
export const stripNiqqud = (s: string): string => s.replace(NIQQUD_RE, "");

/** True when a string contains at least one niqqud character. */
export const hasNiqqud = (s: string): boolean => NIQQUD_RE.test(s);
