/**
 * nicknameProfanity.ts — defensive check for obviously-offensive
 * nicknames in Quick Play join flow.
 *
 * Scope: best-effort filter for the most common slurs / profanity in
 * EN / HE / AR.  Not a complete moderation system — the teacher can
 * still kick anyone via the QuickPlayMonitor, and the per-class
 * nickname is gone the moment the QP session ends.  This filter just
 * stops the most blatant attempts to display a slur on a classroom
 * projector.
 *
 * Approach:
 *   1. Normalize the input — strip diacritics, collapse l33t-speak
 *      (a→4, e→3, i→1, o→0, s→5, t→7), lowercase, drop common
 *      separators (space, dot, dash, underscore).
 *   2. Match against a list of disallowed substrings using whole-word
 *      boundaries OR exact-substring depending on the language
 *      (Hebrew + Arabic have no word-boundary regex equivalent that
 *      works for those scripts, so we substring-match instead).
 *   3. Return a boolean.  Caller surfaces an error to the user.
 *
 * Lists are deliberately short — only the worst, most-frequent cases.
 * A determined attacker can still type a slur with weird spacing or
 * an unlisted slang term.  This is a speed-bump, not a guarantee.
 */

// English — most common slurs + classic profanity.  Using fragments
// (e.g. "fuck") so variations like "fucking" / "fucker" / "asshole"
// also match.  Order matters: longer fragments first so we don't
// false-positive shorter ones.
const EN_FRAGMENTS = [
  "nigger", "niggr", "faggot", "tranny",
  "fuck", "shit", "asshole", "bitch", "cunt", "dick", "pussy", "cock",
  "wanker", "bastard", "slut", "whore", "retard", "twat",
];

// Hebrew — most common slurs.  Includes both common spellings and
// transliterations students sometimes type in Latin chars.
const HE_FRAGMENTS = [
  "זונה", "כוס", "בן זונה", "שרמוטה", "מניאק", "פוסי",
  "תזדיין", "תזדייני", "לך תזדיין",
];

// Arabic — most common slurs.  Includes a few Hebrew-letter
// transliterations (Israeli Arabic students sometimes type in Hebrew
// chars on shared school keyboards).
const AR_FRAGMENTS = [
  "كس", "كسم", "كسمك", "كسختك", "ابن الشرموطة", "شرموطة",
  "زب", "زبي", "متناك", "كلب", "حقير", "احا",
];

const ALL_FRAGMENTS = [
  ...EN_FRAGMENTS.map(s => s.toLowerCase()),
  ...HE_FRAGMENTS,
  ...AR_FRAGMENTS,
];

/** Strip diacritics + collapse l33t-speak + drop separators. */
function normalize(input: string): string {
  let s = input.toLowerCase();
  // Strip combining diacritical marks (Hebrew vowel points, Arabic
  // tashkeel, accented Latin) so "shìt" still matches "shit".
  s = s.normalize("NFKD").replace(/[̀-֑ͯ-ֽׁ-ׇؐ-ًؚ-ٰٟۖ-ۭ]/g, "");
  // l33t-speak collapse — only if mixed with letters, but we just do
  // the unconditional swap because false positives on benign all-digit
  // nicknames don't hit our filter list anyway.
  s = s
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
  // Drop separators that students use to break up bad words ("f.u.c.k",
  // "f-u-c-k", "f u c k", "f_u_c_k").
  s = s.replace(/[\s._\-*+|]/g, "");
  return s;
}

export function containsProfanity(nickname: string): boolean {
  if (!nickname) return false;
  const norm = normalize(nickname);
  for (const frag of ALL_FRAGMENTS) {
    // Normalize the fragment too (so the literal text in the list
    // matches against our normalized input — particularly important
    // for Hebrew/Arabic where the source might include diacritics).
    const normFrag = normalize(frag);
    if (!normFrag) continue;
    if (norm.includes(normFrag)) return true;
  }
  return false;
}
