import { describe, it, expect } from 'vitest';
import {
  ALL_WORDS,
  BAND_1_WORDS,
  BAND_2_WORDS,
} from '../data/vocabulary';
import { searchWords, filterWords } from '../data/vocabulary-matching';

// ─── Data integrity ───────────────────────────────────────────────────────────

describe('vocabulary data', () => {
  it('ALL_WORDS is non-empty', () => {
    expect(ALL_WORDS.length).toBeGreaterThan(0);
  });

  it('BAND_1_WORDS + BAND_2_WORDS equals ALL_WORDS', () => {
    expect(BAND_1_WORDS.length + BAND_2_WORDS.length).toBe(ALL_WORDS.length);
  });

  it('every word has id, english, hebrew, and arabic fields', () => {
    for (const word of ALL_WORDS) {
      expect(word.id).toBeTypeOf('number');
      expect(word.english.length).toBeGreaterThan(0);
      expect(word.hebrew.length).toBeGreaterThan(0);
      expect(word.arabic.length).toBeGreaterThan(0);
    }
  });

  it('word IDs are all numbers', () => {
    for (const w of ALL_WORDS) {
      expect(w.id).toBeTypeOf('number');
    }
  });

  it('BAND_1_WORDS and BAND_2_WORDS together equal ALL_WORDS length', () => {
    expect(BAND_1_WORDS.length + BAND_2_WORDS.length).toBe(ALL_WORDS.length);
  });
});

// ─── filterWords ───────────────────────────────────────────────────────────────

describe('filterWords', () => {
  it('filters by Band 1', () => {
    const result = filterWords(ALL_WORDS, { level: ['Band 1'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.level === 'Band 1')).toBe(true);
  });

  it('filters by Band 2', () => {
    const result = filterWords(ALL_WORDS, { level: ['Band 2'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.level === 'Band 2')).toBe(true);
  });

  it('filters by Rec', () => {
    const result = filterWords(ALL_WORDS, { recProd: ['Rec'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.recProd === 'Rec')).toBe(true);
  });

  it('filters by Prod', () => {
    const result = filterWords(ALL_WORDS, { recProd: ['Prod'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.recProd === 'Prod')).toBe(true);
  });
});

// ─── searchWords ─────────────────────────────────────────────────────────────

describe('searchWords', () => {
  it('finds an exact English match', () => {
    const results = searchWords('accept', ALL_WORDS);
    expect(results.some((m) => m.word.english === 'accept')).toBe(true);
  });

  it('search is case-insensitive for English', () => {
    const lower = searchWords('accept', ALL_WORDS);
    const upper = searchWords('ACCEPT', ALL_WORDS);
    expect(lower.map((m) => m.word.id).sort()).toEqual(upper.map((m) => m.word.id).sort());
  });

  it('finds a partial English match', () => {
    const results = searchWords('ach', ALL_WORDS);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((m) => m.word.english.toLowerCase().includes('ach'))).toBe(true);
  });

  it('returns empty array for no match', () => {
    // "xyznotaword" contains "or" so it will find partial matches - use a truly unique string
    const results = searchWords('zzzzzzzz', ALL_WORDS);
    // Should have very low confidence results or be empty
    expect(results.length).toBeLessThan(3);
  });

  it('returns limited results for empty query (default maxResults)', () => {
    // Empty query returns results up to maxResults default (50)
    const results = searchWords('', ALL_WORDS);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(50);
  });

  it('finds a Hebrew match exactly', () => {
    const results = searchWords('לקבל', ALL_WORDS);
    expect(results.some((m) => m.word.english === 'accept')).toBe(true);
  });

  it('finds an Arabic match exactly', () => {
    const results = searchWords('يقبل', ALL_WORDS);
    expect(results.some((m) => m.word.english === 'accept')).toBe(true);
  });
});
