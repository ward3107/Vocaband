/**
 * Answer-match rules for typing game modes (Spelling, Scramble, Reverse,
 * Letter Sounds). Students get marked wrong for real spelling mistakes only
 * — not for trivial typographical noise that has nothing to do with the
 * word they're learning.
 *
 * Rules applied to BOTH student input and expected answer before comparing:
 *  1. Lowercased
 *  2. POS tags stripped: (n), (v), (adj), (adv), (prep), (conj), (pron),
 *     (art), (interj), (num)
 *  3. Smart quotes and dashes normalised to ASCII
 *  4. Diacritics removed (café → cafe)
 *  5. Apostrophes dropped (don't / dont both accepted)
 *  6. Common punctuation stripped (. , ; : ! ? ")
 *  7. "&" expanded to "and"
 *  8. Leading "to " stripped so "to run" and "run" both pass
 *  9. Hyphens treated as spaces — "check-in" / "check in" both pass
 * 10. Whitespace collapsed + trimmed
 *
 * Additionally, for expected answers with parentheses like "(be) in a hurry",
 * we accept BOTH canonical forms:
 *   - Content dropped:  "in a hurry"
 *   - Content kept:     "be in a hurry"
 * So students are never forced to guess the curriculum's bracket convention.
 *
 * What we DO NOT fuzzy-match (to preserve real learning):
 *  - Typos / near-misses (Levenshtein) — wrong spelling is a wrong answer
 *  - Articles ("the apple" ≠ "apple")
 *  - Plurals / conjugations
 *  - Partial matches ("hurry" ≠ "in a hurry")
 */

const POS_TAG_REGEX = /\s*\((?:n|v|adj|adv|prep|conj|pron|art|interj|num)\)\s*/gi;

export function normalizeAnswer(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Strip POS tags
    .replace(POS_TAG_REGEX, " ")
    // Smart quotes → straight, en/em dashes → hyphen
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    // Remove diacritics (NFD decomposes, then drop combining marks)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Drop apostrophes / backticks
    .replace(/['`]/g, "")
    // Strip basic punctuation
    .replace(/[.,;:!?"]/g, "")
    // "&" → "and" (with surrounding spaces managed by the final collapse)
    .replace(/\s*&\s*/g, " and ")
    // Leading "to " for infinitives ("to run" === "run")
    .replace(/^\s*to\s+/i, "")
    // Hyphens behave as spaces — "check-in" === "check in"
    .replace(/-/g, " ")
    // Collapse whitespace and trim
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerCorrect(studentInput: string, expectedWord: string): boolean {
  const student = normalizeAnswer(studentInput);
  if (!student) return false;

  // Form A: drop parens AND their content — "(be) in a hurry" → "in a hurry"
  const formA = normalizeAnswer(expectedWord.replace(/\([^)]*\)/g, " "));
  // Form B: drop only the parens, keep content — "(be) in a hurry" → "be in a hurry"
  const formB = normalizeAnswer(expectedWord.replace(/\(([^)]*)\)/g, "$1"));

  return student === formA || student === formB;
}
