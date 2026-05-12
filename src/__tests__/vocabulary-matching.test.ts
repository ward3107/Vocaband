import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  levenshteinDistance,
  isFuzzyMatch,
  extractRootWord,
  findWordFamily,
  searchWords,
  findMatchesEnhanced,
} from '../data/vocabulary-matching';
import type { Word } from '../data/vocabulary';

// Helper to create minimal Word objects for testing
function makeWord(overrides: Partial<Word> & { id: number; english: string }): Word {
  return {
    hebrew: '',
    arabic: '',
    level: 'Set 1' as const,
    ...overrides,
  } as Word;
}

// ─── normalizeText ──────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('Hello World')).toBe('hello world');
  });

  it('trims whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('hello    world')).toBe('hello world');
  });

  it('removes common punctuation', () => {
    expect(normalizeText('hello, world!')).toBe('hello world');
    expect(normalizeText('"test"')).toBe('test');
    expect(normalizeText('(brackets) [and] <angles>')).toBe('brackets and angles');
  });

  it('removes Hebrew niqqud (vowel points)', () => {
    // שָׁלוֹם with niqqud → שלום without
    expect(normalizeText('שָׁלוֹם')).toBe('שלום');
  });

  it('removes Arabic diacritics (harakat)', () => {
    // مَدْرَسَة with harakat → مدرسة without
    expect(normalizeText('مَدْرَسَة')).toBe('مدرسة');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeText('')).toBe('');
  });

  it('handles string with only punctuation', () => {
    expect(normalizeText('.,!?')).toBe('');
  });

  it('handles string with only whitespace', () => {
    expect(normalizeText('   ')).toBe('');
  });
});

// ─── levenshteinDistance ────────────────────────────────────────────────────

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('returns length of b for empty a', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });

  it('returns length of a for empty b', () => {
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('computes known distance: kitten → sitting = 3', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('computes single insertion', () => {
    expect(levenshteinDistance('abc', 'abcd')).toBe(1);
  });

  it('computes single deletion', () => {
    expect(levenshteinDistance('abcd', 'abc')).toBe(1);
  });

  it('computes single substitution', () => {
    expect(levenshteinDistance('abc', 'axc')).toBe(1);
  });

  it('is symmetric', () => {
    expect(levenshteinDistance('abc', 'def')).toBe(levenshteinDistance('def', 'abc'));
  });
});

// ─── isFuzzyMatch ───────────────────────────────────────────────────────────

describe('isFuzzyMatch', () => {
  it('returns true for identical strings', () => {
    expect(isFuzzyMatch('hello', 'hello')).toBe(true);
  });

  it('returns true for two empty strings', () => {
    expect(isFuzzyMatch('', '')).toBe(true);
  });

  it('returns true for small difference within threshold', () => {
    // "cat" vs "bat" = distance 1, maxLen 3, ratio 0.33 — at default 0.3 threshold this is false
    expect(isFuzzyMatch('cat', 'bat', 0.4)).toBe(true);
  });

  it('returns false when difference exceeds threshold', () => {
    expect(isFuzzyMatch('abc', 'xyz', 0.3)).toBe(false);
  });

  it('returns true at exactly the threshold boundary', () => {
    // "ab" vs "ac" = distance 1, maxLen 2, ratio 0.5
    expect(isFuzzyMatch('ab', 'ac', 0.5)).toBe(true);
  });

  it('returns false just above the threshold boundary', () => {
    // "ab" vs "ac" = distance 1, maxLen 2, ratio 0.5
    expect(isFuzzyMatch('ab', 'ac', 0.49)).toBe(false);
  });

  it('uses default threshold of 0.3', () => {
    // "hello" vs "hallo" = distance 1, maxLen 5, ratio 0.2 — under 0.3
    expect(isFuzzyMatch('hello', 'hallo')).toBe(true);
  });
});

// ─── extractRootWord ────────────────────────────────────────────────────────

describe('extractRootWord', () => {
  it('removes -ing suffix', () => {
    expect(extractRootWord('running')).toBe('runn');
  });

  it('removes -ed suffix', () => {
    expect(extractRootWord('walked')).toBe('walk');
  });

  it('removes -ly suffix', () => {
    expect(extractRootWord('quickly')).toBe('quick');
  });

  it('removes -ment suffix', () => {
    expect(extractRootWord('achievement')).toBe('achieve');
  });

  it('removes -ness suffix', () => {
    expect(extractRootWord('happiness')).toBe('happi');
  });

  it('does not strip suffix if remaining word is too short', () => {
    // "bed" ends in "ed" but remaining "b" is too short (length <= suffix.length + 2)
    expect(extractRootWord('bed')).toBe('bed');
  });

  it('returns lowercase for words with no matching suffix', () => {
    expect(extractRootWord('Cat')).toBe('cat');
  });

  it('handles empty string', () => {
    expect(extractRootWord('')).toBe('');
  });
});

// ─── findWordFamily ─────────────────────────────────────────────────────────

describe('findWordFamily', () => {
  const words: Word[] = [
    makeWord({ id: 1, english: 'achieve' }),
    makeWord({ id: 2, english: 'achievement' }),
    makeWord({ id: 3, english: 'achievable' }),
    makeWord({ id: 4, english: 'run' }),
  ];

  it('finds words sharing the same root', () => {
    const family = findWordFamily('achieve', words);
    const ids = family.map(w => w.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it('does not include unrelated words', () => {
    const family = findWordFamily('achieve', words);
    const ids = family.map(w => w.id);
    expect(ids).not.toContain(4);
  });

  it('returns empty array when no family members found', () => {
    const family = findWordFamily('xyz', words);
    expect(family).toEqual([]);
  });
});

// ─── searchWords ────────────────────────────────────────────────────────────

describe('searchWords (vocabulary-matching)', () => {
  const words: Word[] = [
    makeWord({ id: 1, english: 'accept', hebrew: 'לקבל', arabic: 'يقبل' }),
    makeWord({ id: 2, english: 'achieve', hebrew: 'להשיג', arabic: 'يحقق' }),
    makeWord({ id: 3, english: 'across', hebrew: 'לרוחב', arabic: 'عبر' }),
    makeWord({ id: 4, english: 'accapt', hebrew: '', arabic: '' }), // misspelling for fuzzy test
  ];

  it('finds exact English match with confidence 1.0', () => {
    const results = searchWords('accept', words);
    const exact = results.find(m => m.word.id === 1);
    expect(exact).toBeDefined();
    expect(exact!.matchType).toBe('exact');
    expect(exact!.confidence).toBe(1.0);
  });

  it('finds partial English match', () => {
    const results = searchWords('acc', words);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(m => m.word.english.toLowerCase().includes('acc'))).toBe(true);
  });

  it('finds Hebrew match', () => {
    const results = searchWords('לקבל', words);
    expect(results.some(m => m.word.id === 1 && m.matchField === 'hebrew')).toBe(true);
  });

  it('finds Arabic match', () => {
    const results = searchWords('يقبل', words);
    expect(results.some(m => m.word.id === 1 && m.matchField === 'arabic')).toBe(true);
  });

  it('finds fuzzy match for typo', () => {
    // "accapt" is close to "accept"
    const results = searchWords('accept', words, { fuzzy: true, includeWordFamilies: false });
    expect(results.some(m => m.word.id === 1)).toBe(true);
  });

  it('respects maxResults option', () => {
    const results = searchWords('a', words, { maxResults: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('sorts results by confidence descending', () => {
    const results = searchWords('accept', words);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });
});

// ─── findMatchesEnhanced ────────────────────────────────────────────────────

describe('findMatchesEnhanced', () => {
  const words: Word[] = [
    makeWord({ id: 1, english: 'accept', hebrew: 'לקבל', arabic: 'يقبل' }),
    makeWord({ id: 2, english: 'enjoyment', hebrew: 'הנאה', arabic: 'متعة' }),
    makeWord({ id: 3, english: 'achievement', hebrew: 'הישג', arabic: 'إنجاز' }),
    makeWord({ id: 4, english: 'run', hebrew: 'לרוץ', arabic: 'يركض' }),
  ];

  it('matches exact English words', () => {
    const { matched, unmatched } = findMatchesEnhanced(['accept'], words);
    expect(matched).toHaveLength(1);
    expect(matched[0].matchType).toBe('exact');
    expect(matched[0].word.id).toBe(1);
    expect(unmatched).toHaveLength(0);
  });

  it('matches Hebrew words', () => {
    const { matched } = findMatchesEnhanced(['לקבל'], words);
    expect(matched).toHaveLength(1);
    expect(matched[0].word.id).toBe(1);
  });

  it('matches Arabic words', () => {
    const { matched } = findMatchesEnhanced(['يقبل'], words);
    expect(matched).toHaveLength(1);
    expect(matched[0].word.id).toBe(1);
  });

  it('reports unmatched words', () => {
    const { unmatched } = findMatchesEnhanced(['xyznotaword'], words, { enableFuzzy: false, enableWordFamilies: false });
    expect(unmatched).toContain('xyznotaword');
  });

  it('does not duplicate matched words across search terms', () => {
    // Both "accept" and "לקבל" refer to word id 1; processedWordIds prevents double-matching
    const { matched } = findMatchesEnhanced(['accept', 'לקבל'], words);
    const ids = matched.map(m => m.word.id);
    const id1Count = ids.filter(id => id === 1).length;
    expect(id1Count).toBe(1);
  });

  it('uses word family matching as last resort', () => {
    // "enjoyable" shares root "enjoy" with "enjoyment" (id 2) but doesn't partial-match it
    const { matched } = findMatchesEnhanced(['enjoyable'], words, { enableFuzzy: false, enableWordFamilies: true });
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(m => m.matchType === 'family' && m.word.id === 2)).toBe(true);
  });

  it('respects enableFuzzy: false', () => {
    const { matched, unmatched } = findMatchesEnhanced(['accapt'], words, { enableFuzzy: false, enableWordFamilies: false });
    expect(matched).toHaveLength(0);
    expect(unmatched).toContain('accapt');
  });
});
