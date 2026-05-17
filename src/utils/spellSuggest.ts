/**
 * spellSuggest.ts — live "did you mean" suggestions for the teacher's
 * paste textarea (English only).
 *
 * Why a separate module from wordAnalysis.ts: that one is the heavy
 * post-paste analyzer that runs once on Analyze. This one runs on every
 * debounced keystroke, so it has to stay cheap — length-bucketed
 * Levenshtein over the 6.5k-word curriculum only, English tokens only,
 * no translation lookups, no batched RPCs.
 */

import { levenshteinDistance } from '../data/vocabulary-matching';
import type { Word } from '../data/vocabulary';

export interface SpellSuggestion {
  typo: string;
  suggestion: string;
  distance: number;
}

const NON_ENGLISH_RE = /[^a-z]/;
const TOKEN_SPLIT_RE = /[\s,;\n\r\t.|/]+/;
const STRIP_PUNCT_RE = /["'!?()[\]{}<>:]/g;

export function extractEnglishTokens(text: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(TOKEN_SPLIT_RE)) {
    const t = raw.trim().toLowerCase().replace(STRIP_PUNCT_RE, '');
    if (t.length < 4) continue;
    if (NON_ENGLISH_RE.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

interface CurriculumIndex {
  exact: Set<string>;
  byLength: Map<number, string[]>;
  byFirstChar: Map<string, string[]>;
}

const indexCache = new WeakMap<Word[], CurriculumIndex>();

function getIndex(allWords: Word[]): CurriculumIndex {
  const cached = indexCache.get(allWords);
  if (cached) return cached;
  const exact = new Set<string>();
  const byLength = new Map<number, string[]>();
  const byFirstChar = new Map<string, string[]>();
  for (const w of allWords) {
    const e = (w.english || '').toLowerCase().trim();
    if (!e || e.includes(' ')) continue;
    if (NON_ENGLISH_RE.test(e)) continue;
    exact.add(e);
    const lenList = byLength.get(e.length) ?? [];
    lenList.push(e);
    byLength.set(e.length, lenList);
    const firstList = byFirstChar.get(e[0]) ?? [];
    firstList.push(e);
    byFirstChar.set(e[0], firstList);
  }
  const idx = { exact, byLength, byFirstChar };
  indexCache.set(allWords, idx);
  return idx;
}

export function suggestCorrections(
  text: string,
  allWords: Word[],
  options: { maxSuggestions?: number; maxDistance?: number; ignored?: Set<string>; taken?: Set<string> } = {}
): SpellSuggestion[] {
  const { maxSuggestions = 6, maxDistance = 2, ignored, taken } = options;
  if (!text || !allWords?.length) return [];

  const index = getIndex(allWords);
  const tokens = extractEnglishTokens(text);
  const suggestions: SpellSuggestion[] = [];

  for (const token of tokens) {
    if (ignored?.has(token)) continue;
    if (index.exact.has(token)) continue;

    let best: SpellSuggestion | null = null;
    for (let len = token.length - maxDistance; len <= token.length + maxDistance; len++) {
      if (len < 2) continue;
      const bucket = index.byLength.get(len);
      if (!bucket) continue;
      for (const candidate of bucket) {
        if (taken?.has(candidate)) continue;
        const d = levenshteinDistance(token, candidate);
        if (d > maxDistance) continue;
        // For distance > 1, require same first letter — cuts false
        // positives like "wifi" → "wife".
        if (d > 1 && token[0] !== candidate[0]) continue;
        if (!best || d < best.distance) {
          best = { typo: token, suggestion: candidate, distance: d };
          if (d === 1) break;
        }
      }
      if (best && best.distance === 1) break;
    }

    if (best) suggestions.push(best);
  }

  suggestions.sort((a, b) => a.distance - b.distance);
  return suggestions.slice(0, maxSuggestions);
}

/**
 * Replace every whole-word occurrence of `typo` in `text` with
 * `replacement`. Used when the teacher taps a suggestion chip.
 */
export function applySuggestion(text: string, typo: string, replacement: string): string {
  if (!typo) return text;
  const escaped = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^A-Za-z])(${escaped})(?=$|[^A-Za-z])`, 'gi');
  return text.replace(re, (_match, pre) => `${pre}${replacement}`);
}

// ─── As-you-type autocomplete ─────────────────────────────────────────────────

const SEPARATOR_RE = /[\s,;\n\r\t.|/]/;

export interface TokenAtCaret {
  /** The token straddling the caret, lower-cased + punctuation-stripped. */
  token: string;
  /** Inclusive start index in the original text. */
  start: number;
  /** Exclusive end index in the original text. */
  end: number;
}

/**
 * Find the contiguous non-separator span around `caret` in `text`.
 * Returns empty token when the caret sits on a separator.
 */
export function getCurrentToken(text: string, caret: number): TokenAtCaret {
  const pos = Math.max(0, Math.min(caret, text.length));
  let start = pos;
  let end = pos;
  while (start > 0 && !SEPARATOR_RE.test(text[start - 1])) start--;
  while (end < text.length && !SEPARATOR_RE.test(text[end])) end++;
  const raw = text.slice(start, end).toLowerCase().replace(STRIP_PUNCT_RE, '');
  return { token: raw, start, end };
}

export interface AutocompleteMatch {
  word: string;
  kind: 'prefix' | 'fuzzy';
}

/**
 * Suggest curriculum words for the partial token the teacher is typing.
 * Prefix matches come first (most predictive), then short-distance
 * fuzzy matches to catch typos. Returns [] if `partial` is already an
 * exact curriculum hit or too short.
 */
export function getAutocompleteMatches(
  partial: string,
  allWords: Word[],
  options: { max?: number; minLength?: number; taken?: Set<string> } = {}
): AutocompleteMatch[] {
  const { max = 5, minLength = 2, taken } = options;
  if (!partial || partial.length < minLength) return [];
  if (NON_ENGLISH_RE.test(partial)) return [];
  if (!allWords?.length) return [];

  const index = getIndex(allWords);
  if (index.exact.has(partial)) return [];

  const bucket = index.byFirstChar.get(partial[0]) ?? [];
  const prefixHits: string[] = [];
  for (const w of bucket) {
    if (w === partial) continue;
    if (taken?.has(w)) continue;
    if (w.startsWith(partial)) prefixHits.push(w);
  }
  prefixHits.sort((a, b) => a.length - b.length || a.localeCompare(b));

  if (prefixHits.length >= max) {
    return prefixHits.slice(0, max).map(word => ({ word, kind: 'prefix' as const }));
  }

  // Fill remaining slots with fuzzy matches (length window, distance ≤ 2).
  const prefixSet = new Set(prefixHits);
  const fuzzy: { word: string; distance: number }[] = [];
  for (let len = partial.length - 2; len <= partial.length + 2; len++) {
    if (len < 2) continue;
    const lenBucket = index.byLength.get(len);
    if (!lenBucket) continue;
    for (const candidate of lenBucket) {
      if (prefixSet.has(candidate)) continue;
      if (taken?.has(candidate)) continue;
      const d = levenshteinDistance(partial, candidate);
      if (d === 0 || d > 2) continue;
      if (d > 1 && partial[0] !== candidate[0]) continue;
      fuzzy.push({ word: candidate, distance: d });
    }
  }
  fuzzy.sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word));

  const out: AutocompleteMatch[] = prefixHits.map(word => ({ word, kind: 'prefix' as const }));
  for (const f of fuzzy) {
    if (out.length >= max) break;
    out.push({ word: f.word, kind: 'fuzzy' });
  }
  return out;
}

/**
 * Replace the token at [start, end) with `replacement`, appending a
 * comma-space separator if the inserted word would otherwise butt up
 * against the next character (or the end of the text). Returns the new
 * text plus the caret position that the textarea should restore.
 */
export function insertAutocomplete(
  text: string,
  start: number,
  end: number,
  replacement: string
): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const nextChar = after[0];
  const needsSeparator = !nextChar || !SEPARATOR_RE.test(nextChar);
  const suffix = needsSeparator ? ', ' : '';
  const newText = before + replacement + suffix + after;
  const caret = start + replacement.length + suffix.length;
  return { text: newText, caret };
}
