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
}

const indexCache = new WeakMap<Word[], CurriculumIndex>();

function getIndex(allWords: Word[]): CurriculumIndex {
  const cached = indexCache.get(allWords);
  if (cached) return cached;
  const exact = new Set<string>();
  const byLength = new Map<number, string[]>();
  for (const w of allWords) {
    const e = (w.english || '').toLowerCase().trim();
    if (!e || e.includes(' ')) continue;
    if (NON_ENGLISH_RE.test(e)) continue;
    exact.add(e);
    const list = byLength.get(e.length) ?? [];
    list.push(e);
    byLength.set(e.length, list);
  }
  const idx = { exact, byLength };
  indexCache.set(allWords, idx);
  return idx;
}

export function suggestCorrections(
  text: string,
  allWords: Word[],
  options: { maxSuggestions?: number; maxDistance?: number; ignored?: Set<string> } = {}
): SpellSuggestion[] {
  const { maxSuggestions = 6, maxDistance = 2, ignored } = options;
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
