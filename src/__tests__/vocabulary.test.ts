import { describe, it, expect } from 'vitest';
import {
  ALL_WORDS,
  BAND_2_WORDS,
  BAND_2_CORE_I_WORDS,
  BAND_2_CORE_II_WORDS,
  getWordsByCore,
  getWordsByRecProd,
  searchWords,
  getRandomWords,
  getWordsByIds,
} from '../vocabulary';

// ─── Data integrity ───────────────────────────────────────────────────────────

describe('vocabulary data', () => {
  it('ALL_WORDS is non-empty', () => {
    expect(ALL_WORDS.length).toBeGreaterThan(0);
  });

  it('BAND_2_WORDS equals ALL_WORDS', () => {
    expect(BAND_2_WORDS).toBe(ALL_WORDS);
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

  it('BAND_2_CORE_I_WORDS and BAND_2_CORE_II_WORDS together equal ALL_WORDS length', () => {
    expect(BAND_2_CORE_I_WORDS.length + BAND_2_CORE_II_WORDS.length).toBe(ALL_WORDS.length);
  });
});

// ─── getWordsByCore ──────────────────────────────────────────────────────────

describe('getWordsByCore', () => {
  it('returns only Core I words', () => {
    const result = getWordsByCore('Core I');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.core === 'Core I')).toBe(true);
  });

  it('returns only Core II words', () => {
    const result = getWordsByCore('Core II');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.core === 'Core II')).toBe(true);
  });

  it('Core I + Core II together account for all words', () => {
    const coreI = getWordsByCore('Core I');
    const coreII = getWordsByCore('Core II');
    expect(coreI.length + coreII.length).toBe(ALL_WORDS.length);
  });

  it('Core I words all have core === "Core I"', () => {
    const coreI = getWordsByCore('Core I');
    expect(coreI.every((w) => w.core === 'Core I')).toBe(true);
  });
});

// ─── getWordsByRecProd ───────────────────────────────────────────────────────

describe('getWordsByRecProd', () => {
  it('returns only Rec words', () => {
    const result = getWordsByRecProd('Rec');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.recProd === 'Rec')).toBe(true);
  });

  it('returns only Prod words', () => {
    const result = getWordsByRecProd('Prod');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => w.recProd === 'Prod')).toBe(true);
  });

  it('Rec + Prod together account for all words', () => {
    const rec = getWordsByRecProd('Rec');
    const prod = getWordsByRecProd('Prod');
    expect(rec.length + prod.length).toBe(ALL_WORDS.length);
  });
});

// ─── searchWords ─────────────────────────────────────────────────────────────

describe('searchWords', () => {
  it('finds an exact English match', () => {
    const results = searchWords('accept');
    expect(results.some((w) => w.english === 'accept')).toBe(true);
  });

  it('search is case-insensitive for English', () => {
    const lower = searchWords('accept');
    const upper = searchWords('ACCEPT');
    expect(lower.map((w) => w.id).sort()).toEqual(upper.map((w) => w.id).sort());
  });

  it('finds a partial English match', () => {
    // "ach" should match "achieve", "achievement", "ache"
    const results = searchWords('ach');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((w) => w.english.toLowerCase().includes('ach'))).toBe(true);
  });

  it('returns empty array for no match', () => {
    expect(searchWords('xyznotaword')).toEqual([]);
  });

  it('returns all words for empty query', () => {
    expect(searchWords('')).toHaveLength(ALL_WORDS.length);
  });

  it('finds a Hebrew match exactly', () => {
    // id=7 "accept" => hebrew "לקבל"
    const results = searchWords('לקבל');
    expect(results.some((w) => w.english === 'accept')).toBe(true);
  });

  it('finds an Arabic match exactly', () => {
    // id=7 "accept" => arabic "يقبل"
    const results = searchWords('يقبل');
    expect(results.some((w) => w.english === 'accept')).toBe(true);
  });
});

// ─── getRandomWords ───────────────────────────────────────────────────────────

describe('getRandomWords', () => {
  it('returns the requested number of words', () => {
    expect(getRandomWords(5)).toHaveLength(5);
    expect(getRandomWords(10)).toHaveLength(10);
  });

  it('returns no duplicates', () => {
    const words = getRandomWords(20);
    const ids = words.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns valid Word objects', () => {
    const words = getRandomWords(3);
    for (const w of words) {
      expect(w.id).toBeTypeOf('number');
      expect(w.english.length).toBeGreaterThan(0);
    }
  });

  it('returns at most ALL_WORDS.length words when count exceeds total', () => {
    const words = getRandomWords(ALL_WORDS.length + 100);
    expect(words.length).toBeLessThanOrEqual(ALL_WORDS.length);
  });
});

// ─── getWordsByIds ────────────────────────────────────────────────────────────

describe('getWordsByIds', () => {
  it('returns words matching the given IDs', () => {
    const result = getWordsByIds([1, 2, 3]);
    expect(result).toHaveLength(3);
    expect(result.map((w) => w.id).sort()).toEqual([1, 2, 3]);
  });

  it('ignores IDs that do not exist', () => {
    const result = getWordsByIds([1, 99999]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns empty array for empty input', () => {
    expect(getWordsByIds([])).toEqual([]);
  });

  it('returns correct word data for a known ID', () => {
    // id=7 is "accept" based on the vocabulary list
    const result = getWordsByIds([7]);
    expect(result[0].english).toBe('accept');
    expect(result[0].hebrew).toBe('לקבל');
  });

  it('deduplicates when the same ID appears twice', () => {
    // filter-based implementation returns each word once even if ID repeated
    const result = getWordsByIds([1, 1, 2]);
    const ids = result.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
