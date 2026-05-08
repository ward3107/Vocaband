// VocaHebrew — Israeli MoE curriculum standards, per grade band.
//
// Source: משרד החינוך, תכנית הלימודים בחינוך הלשוני (Hebrew language
// curriculum), grades 1–12.  Distilled from:
//   * יסודי (1–6): meyda.education.gov.il/files/Tochniyot_Limudim/HinuchLeshoni/Yesodi/
//   * חטיבה (7–9): meyda.education.gov.il/files/Tochniyot_Limudim/HinuchLeshoni/HativatBeynaim/
//   * תיכון (10–12) + Bagrut: meyda.education.gov.il/files/Mazkirut_Pedagogit/Hebrew/
//
// This file is a curated SKILL MATRIX, not a lemma list.  It tells the
// product:
//   * What pedagogical skills each grade band is responsible for
//   * Which game modes are appropriate for that band
//   * Roughly how many lemmas the band should cover
//   * What's required vs. what's enrichment
//
// Lemma data lives in src/data/vocabulary-hebrew.ts.  Each lemma's
// `gradeBand` field links it back to one of the bands defined here.
//
// Updating this file: keep it aligned with the actual MoE document
// when revisions ship (the curriculum is reviewed every ~5 years).
// A wrong skill list silently mis-routes content to the wrong age
// group — worse than a missing lemma.

import type { HebrewGradeBand } from "./types-hebrew";

// ─── Skill taxonomy ────────────────────────────────────────────────
// Every Hebrew language skill the curriculum names.  Adding a new
// skill means: add it here, decide which grade bands require it,
// and (when ready) tag matching lemmas / build a matching game mode.
export type CurriculumSkill =
  // Phase 1 — pre-literacy and basic reading (יסודי א'-ב')
  | "alphabet"            // אותיות הא'-ב'
  | "letter-sounds"       // צלילי האותיות
  | "cvc-reading"         // קריאת מילים פתוחות וסגורות
  | "sight-words"         // מילות יסוד נקראות במבט
  | "niqqud-vowels"       // ניקוד — תנועות
  | "niqqud-shva"         // שווא — נע ונח
  // Phase 2 — vocabulary and morphology (יסודי ג'-ו')
  | "vocabulary-themes"   // אוצר מילים נושאי
  | "shoresh"             // שורש המילה
  | "mishkal"             // משקלי שמות
  | "gender-number"       // מין ומספר
  | "synonyms-antonyms"   // נרדפות והפכים
  | "word-families"       // משפחות מילים
  // Phase 3 — grammar and verb morphology (חטיבת ביניים, ז'-ט')
  | "binyanim"            // שבעת הבניינים
  | "verb-tenses"         // עבר, הווה, עתיד, ציווי
  | "smichut"             // סמיכות (מצב נפרד / נסמך)
  | "preposition-pronouns"// כינויים חבורים: לי, לך, לו...
  | "complex-sentences"   // משפטים מורכבים, פסוקיות
  // Phase 4 — literary, classical, exam (תיכון, י'-יב' + Bagrut)
  | "biblical-hebrew"     // לשון המקרא
  | "mishnaic-hebrew"     // לשון חז"ל
  | "medieval-hebrew"     // עברית של ימי הביניים
  | "literary-register"   // לשון הספרות המודרנית
  | "idioms-expressions"  // ביטויים, פתגמים, ניבים
  | "register-shifts"     // רובדי לשון, מעברים בין רבדים
  | "bagrut-prep";        // הכנה לבחינת הבגרות

export interface GradeBandSpec {
  band: HebrewGradeBand;
  /** Hebrew label as written in MoE docs.  Used in UI when shown to
   *  Hebrew-speaking teachers — same word their school uses. */
  labelHe: string;
  /** English label for non-Hebrew-speaking staff. */
  labelEn: string;
  /** School phase — יסודי / חטיבה / תיכון. */
  phaseHe: string;
  phaseEn: string;
  /** Skills the curriculum REQUIRES the student to master in this band. */
  requiredSkills: readonly CurriculumSkill[];
  /** Skills introduced as enrichment but not assessed. */
  enrichmentSkills?: readonly CurriculumSkill[];
  /** MoE target lemma count for this band — roughly. */
  targetLemmas: number;
  /** Niqqud rendering policy:
   *   - 'always' = niqqud is ALWAYS shown (grades 1-4)
   *   - 'partial' = niqqud only on new/unfamiliar words (grades 5-6)
   *   - 'rare'   = niqqud rarely; on poetry, ambiguous words (grades 7-9)
   *   - 'never'  = unmarked text the norm (grades 10-12) */
  niqqudPolicy: "always" | "partial" | "rare" | "never";
}

// ─── The standards ─────────────────────────────────────────────────
// Order matters: bands are listed grade-ascending so the dashboard
// can render them as a left-to-right "elementary → secondary" arc.
export const CURRICULUM_STANDARDS: readonly GradeBandSpec[] = [
  {
    band: "1-2",
    labelHe: "כיתות א'-ב'",
    labelEn: "Grades 1–2",
    phaseHe: "יסודי",
    phaseEn: "Elementary (lower)",
    requiredSkills: [
      "alphabet",
      "letter-sounds",
      "cvc-reading",
      "sight-words",
      "niqqud-vowels",
      "niqqud-shva",
    ],
    targetLemmas: 500,
    niqqudPolicy: "always",
  },
  {
    band: "3-4",
    labelHe: "כיתות ג'-ד'",
    labelEn: "Grades 3–4",
    phaseHe: "יסודי",
    phaseEn: "Elementary (mid)",
    requiredSkills: [
      "niqqud-vowels",
      "niqqud-shva",
      "vocabulary-themes",
      "gender-number",
      "synonyms-antonyms",
    ],
    enrichmentSkills: ["shoresh"],
    targetLemmas: 1500,
    niqqudPolicy: "always",
  },
  {
    band: "5-6",
    labelHe: "כיתות ה'-ו'",
    labelEn: "Grades 5–6",
    phaseHe: "יסודי",
    phaseEn: "Elementary (upper)",
    requiredSkills: [
      "shoresh",
      "mishkal",
      "gender-number",
      "synonyms-antonyms",
      "word-families",
      "vocabulary-themes",
    ],
    enrichmentSkills: ["binyanim", "verb-tenses"],
    targetLemmas: 2000,
    niqqudPolicy: "partial",
  },
  {
    band: "7-9",
    labelHe: "כיתות ז'-ט'",
    labelEn: "Grades 7–9",
    phaseHe: "חטיבת ביניים",
    phaseEn: "Middle school",
    requiredSkills: [
      "binyanim",
      "verb-tenses",
      "smichut",
      "preposition-pronouns",
      "complex-sentences",
      "shoresh",
      "synonyms-antonyms",
      "idioms-expressions",
    ],
    enrichmentSkills: ["literary-register", "register-shifts"],
    targetLemmas: 1500,
    niqqudPolicy: "rare",
  },
  {
    band: "10-12",
    labelHe: "כיתות י'-יב'",
    labelEn: "Grades 10–12",
    phaseHe: "תיכון",
    phaseEn: "High school + Bagrut",
    requiredSkills: [
      "biblical-hebrew",
      "mishnaic-hebrew",
      "medieval-hebrew",
      "literary-register",
      "idioms-expressions",
      "register-shifts",
      "bagrut-prep",
    ],
    enrichmentSkills: ["complex-sentences"],
    targetLemmas: 1500,
    niqqudPolicy: "never",
  },
];

// ─── Lookups ───────────────────────────────────────────────────────
export const CURRICULUM_BY_BAND: Readonly<Record<HebrewGradeBand, GradeBandSpec>> =
  CURRICULUM_STANDARDS.reduce<Record<string, GradeBandSpec>>((acc, spec) => {
    acc[spec.band] = spec;
    return acc;
  }, {}) as Readonly<Record<HebrewGradeBand, GradeBandSpec>>;

// Hebrew labels for each individual skill — used in the dashboard
// curriculum overview when listing what each band teaches.
export const SKILL_LABEL_HE: Readonly<Record<CurriculumSkill, string>> = {
  "alphabet":             "אותיות הא'-ב'",
  "letter-sounds":        "צלילי האותיות",
  "cvc-reading":          "קריאת מילים פתוחות וסגורות",
  "sight-words":          "מילות יסוד",
  "niqqud-vowels":        "תנועות הניקוד",
  "niqqud-shva":          "שווא נע ונח",
  "vocabulary-themes":    "אוצר מילים נושאי",
  "shoresh":              "שורש המילה",
  "mishkal":              "משקלי שמות",
  "gender-number":        "מין ומספר",
  "synonyms-antonyms":    "נרדפות והפכים",
  "word-families":        "משפחות מילים",
  "binyanim":             "שבעת הבניינים",
  "verb-tenses":          "זמני הפועל",
  "smichut":              "סמיכות",
  "preposition-pronouns": "כינויים חבורים",
  "complex-sentences":    "משפטים מורכבים",
  "biblical-hebrew":      "לשון המקרא",
  "mishnaic-hebrew":      "לשון חז\"ל",
  "medieval-hebrew":      "עברית של ימי הביניים",
  "literary-register":    "לשון הספרות",
  "idioms-expressions":   "ביטויים ופתגמים",
  "register-shifts":      "רובדי לשון",
  "bagrut-prep":          "הכנה לבגרות",
};

// English labels mirror.  Used when a non-Hebrew-speaking principal
// audits the curriculum coverage.
export const SKILL_LABEL_EN: Readonly<Record<CurriculumSkill, string>> = {
  "alphabet":             "Alphabet",
  "letter-sounds":        "Letter sounds",
  "cvc-reading":          "CVC reading",
  "sight-words":          "Sight words",
  "niqqud-vowels":        "Niqqud — vowels",
  "niqqud-shva":          "Sheva (mobile/silent)",
  "vocabulary-themes":    "Themed vocabulary",
  "shoresh":              "Roots (shoresh)",
  "mishkal":              "Noun patterns",
  "gender-number":        "Gender + number",
  "synonyms-antonyms":    "Synonyms / antonyms",
  "word-families":        "Word families",
  "binyanim":             "Verb patterns (7 binyanim)",
  "verb-tenses":          "Verb tenses",
  "smichut":              "Construct state",
  "preposition-pronouns": "Pronominal suffixes",
  "complex-sentences":    "Complex sentences",
  "biblical-hebrew":      "Biblical Hebrew",
  "mishnaic-hebrew":      "Mishnaic Hebrew",
  "medieval-hebrew":      "Medieval Hebrew",
  "literary-register":    "Literary register",
  "idioms-expressions":   "Idioms & expressions",
  "register-shifts":      "Register shifts",
  "bagrut-prep":          "Bagrut preparation",
};
