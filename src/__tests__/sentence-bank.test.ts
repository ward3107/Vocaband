import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSentencesForWord, generateSentencesForAssignment } from '../sentence-bank';
import type { Word } from '../vocabulary';

function makeWord(overrides: Partial<Word> & { id: number; english: string }): Word {
  return {
    hebrew: '',
    arabic: '',
    level: 'Band 1' as const,
    ...overrides,
  } as Word;
}

// ─── getSentencesForWord ────────────────────────────────────────────────────

describe('getSentencesForWord', () => {
  it('returns hand-written sentences for a word in the sentence bank', () => {
    // Word id 1 has hand-written sentences
    const word = makeWord({ id: 1, english: 'a little bit' });
    const sentences = getSentencesForWord(word);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences[0]).toContain('little bit');
  });

  it('falls back to inline word.sentences when not in sentence bank', () => {
    const word = makeWord({
      id: 99999,
      english: 'testword',
      sentences: ['This is a test sentence for testword'],
    } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences).toEqual(['This is a test sentence for testword']);
  });

  it('uses POS templates for nouns not in bank', () => {
    const word = makeWord({ id: 99998, english: 'guitar', pos: 'n' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences.some(s => s.includes('guitar'))).toBe(true);
  });

  it('uses POS templates for verbs not in bank', () => {
    const word = makeWord({ id: 99997, english: 'jump', pos: 'v' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences.some(s => s.includes('jump'))).toBe(true);
  });

  it('uses POS templates for adjectives not in bank', () => {
    const word = makeWord({ id: 99996, english: 'bright', pos: 'adj' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences.some(s => s.includes('bright'))).toBe(true);
  });

  it('uses default templates when POS is unknown', () => {
    const word = makeWord({ id: 99995, english: 'zorp', pos: '' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences.some(s => s.includes('zorp'))).toBe(true);
  });

  it('uses phrase-friendly fallback for multi-word phrases', () => {
    const word = makeWord({ id: 99994, english: 'a lot of' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.length).toBe(2);
    expect(sentences.some(s => s.includes('a lot of'))).toBe(true);
  });

  it('uses POS templates for adverbs', () => {
    const word = makeWord({ id: 99993, english: 'quickly', pos: 'adv' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.some(s => s.includes('quickly'))).toBe(true);
  });

  it('uses POS templates for prepositions', () => {
    const word = makeWord({ id: 99992, english: 'under', pos: 'prep' } as any);
    const sentences = getSentencesForWord(word);
    expect(sentences.some(s => s.includes('under'))).toBe(true);
  });
});

// ─── generateSentencesForAssignment ─────────────────────────────────────────

describe('generateSentencesForAssignment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns one sentence per word', () => {
    const words = [
      makeWord({ id: 1, english: 'a little bit' }),
      makeWord({ id: 2, english: 'a pity' }),
    ];
    const sentences = generateSentencesForAssignment(words);
    expect(sentences).toHaveLength(2);
  });

  it('returns strings (not arrays)', () => {
    const words = [makeWord({ id: 1, english: 'a little bit' })];
    const sentences = generateSentencesForAssignment(words);
    expect(typeof sentences[0]).toBe('string');
  });

  it('returns empty array for empty input', () => {
    expect(generateSentencesForAssignment([])).toEqual([]);
  });
});
