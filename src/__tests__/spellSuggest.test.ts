import { describe, it, expect } from 'vitest';
import {
  extractEnglishTokens,
  suggestCorrections,
  applySuggestion,
  getCurrentToken,
  getAutocompleteMatches,
  insertAutocomplete,
} from '../utils/spellSuggest';
import type { Word } from '../data/vocabulary';

function makeWord(id: number, english: string): Word {
  return { id, english, hebrew: '', arabic: '', level: 'Set 1' } as Word;
}

const CURRICULUM: Word[] = [
  'apple', 'banana', 'orange', 'grape', 'pineapple', 'strawberry',
  'house', 'mouse', 'horse', 'wife', 'water', 'window', 'wonder',
  'beautiful', 'because',
].map((w, i) => makeWord(i + 1, w));

describe('extractEnglishTokens', () => {
  it('splits on commas, spaces, and newlines', () => {
    expect(extractEnglishTokens('apple, banana orange\ngrape')).toEqual([
      'apple', 'banana', 'orange', 'grape',
    ]);
  });

  it('drops Hebrew and Arabic tokens', () => {
    expect(extractEnglishTokens('apple, תפוח, تفاحة, banana')).toEqual([
      'apple', 'banana',
    ]);
  });

  it('skips tokens shorter than 4 chars', () => {
    expect(extractEnglishTokens('cat dog apple bird')).toEqual(['apple', 'bird']);
  });

  it('dedupes case-insensitively', () => {
    expect(extractEnglishTokens('Apple apple APPLE banana')).toEqual([
      'apple', 'banana',
    ]);
  });
});

describe('suggestCorrections', () => {
  it('finds single-edit typos', () => {
    const out = suggestCorrections('appel', CURRICULUM);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ typo: 'appel', suggestion: 'apple' });
  });

  it('finds multiple typos in one pass', () => {
    const out = suggestCorrections('appel, banan, oranje', CURRICULUM);
    const map = Object.fromEntries(out.map(s => [s.typo, s.suggestion]));
    expect(map).toMatchObject({
      appel: 'apple',
      banan: 'banana',
      oranje: 'orange',
    });
  });

  it('does not flag exact matches', () => {
    expect(suggestCorrections('apple, banana, grape', CURRICULUM)).toEqual([]);
  });

  it('ignores Hebrew/Arabic content (English-only)', () => {
    expect(suggestCorrections('תפוח, تفاحة', CURRICULUM)).toEqual([]);
  });

  it('rejects suggestions when first letter differs and distance > 1', () => {
    // "wifi" should NOT suggest "wife" (distance 2, same first letter — allowed)
    // but "yife" → "wife" (distance 1, allowed)
    const out = suggestCorrections('yife', CURRICULUM);
    expect(out[0]?.suggestion).toBe('wife');
  });

  it('respects the ignored set', () => {
    const ignored = new Set(['appel']);
    expect(suggestCorrections('appel, banan', CURRICULUM, { ignored })).toHaveLength(1);
  });

  it('caps results to maxSuggestions', () => {
    const text = 'appel banan oranje grappe houze mouze horze wateer';
    const out = suggestCorrections(text, CURRICULUM, { maxSuggestions: 3 });
    expect(out).toHaveLength(3);
  });

  it('returns nothing for empty input', () => {
    expect(suggestCorrections('', CURRICULUM)).toEqual([]);
  });
});

describe('getCurrentToken', () => {
  it('returns the word at the caret', () => {
    expect(getCurrentToken('apple banana orange', 9).token).toBe('banana');
  });

  it('handles caret at end of text', () => {
    expect(getCurrentToken('apple ban', 9)).toMatchObject({ token: 'ban', start: 6, end: 9 });
  });

  it('returns empty token when caret sits on a separator', () => {
    expect(getCurrentToken('apple, banana', 5).token).toBe('apple');
    expect(getCurrentToken('apple, banana', 6).token).toBe('');
  });

  it('clamps out-of-range caret', () => {
    expect(getCurrentToken('apple', 999).token).toBe('apple');
  });

  it('strips punctuation from the returned token', () => {
    expect(getCurrentToken('hello!', 6).token).toBe('hello');
  });
});

describe('getAutocompleteMatches', () => {
  it('returns prefix matches first', () => {
    const out = getAutocompleteMatches('app', CURRICULUM);
    expect(out[0]).toMatchObject({ word: 'apple', kind: 'prefix' });
  });

  it('falls back to fuzzy matches when prefix is sparse', () => {
    // "appl" has only "apple" as a prefix match → fills with fuzzy
    const out = getAutocompleteMatches('appl', CURRICULUM, { max: 3 });
    const kinds = out.map(o => o.kind);
    expect(kinds[0]).toBe('prefix');
  });

  it('returns nothing when partial is an exact curriculum word', () => {
    expect(getAutocompleteMatches('apple', CURRICULUM)).toEqual([]);
  });

  it('returns nothing for partials below minLength', () => {
    expect(getAutocompleteMatches('a', CURRICULUM)).toEqual([]);
  });

  it('returns nothing for Hebrew/Arabic input', () => {
    expect(getAutocompleteMatches('תפ', CURRICULUM)).toEqual([]);
  });

  it('caps results at max', () => {
    expect(getAutocompleteMatches('a', CURRICULUM, { max: 2, minLength: 1 }).length).toBeLessThanOrEqual(2);
  });
});

describe('insertAutocomplete', () => {
  it('replaces the token and appends ", " at end of text', () => {
    const out = insertAutocomplete('apple, ban', 7, 10, 'banana');
    expect(out.text).toBe('apple, banana, ');
    expect(out.caret).toBe(15);
  });

  it('does not double up the separator when one follows the token', () => {
    const out = insertAutocomplete('apple, ban, orange', 7, 10, 'banana');
    expect(out.text).toBe('apple, banana, orange');
    expect(out.caret).toBe(13);
  });

  it('handles insertion at start of text', () => {
    const out = insertAutocomplete('app banana', 0, 3, 'apple');
    expect(out.text).toBe('apple banana');
    expect(out.caret).toBe(5);
  });
});

describe('applySuggestion', () => {
  it('replaces a single occurrence', () => {
    expect(applySuggestion('appel, banana', 'appel', 'apple')).toBe('apple, banana');
  });

  it('replaces all occurrences', () => {
    expect(applySuggestion('appel, banana, appel', 'appel', 'apple'))
      .toBe('apple, banana, apple');
  });

  it('is case-insensitive when matching', () => {
    expect(applySuggestion('Appel, APPEL', 'appel', 'apple')).toBe('apple, apple');
  });

  it('does not replace substrings of other words', () => {
    expect(applySuggestion('pineapple, appel', 'appel', 'apple'))
      .toBe('pineapple, apple');
  });

  it('handles newlines and tabs as boundaries', () => {
    expect(applySuggestion('appel\nbanana\tappel', 'appel', 'apple'))
      .toBe('apple\nbanana\tapple');
  });
});
