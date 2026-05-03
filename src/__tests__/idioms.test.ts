/**
 * idioms.test.ts — data integrity for the curated idiom dataset.
 *
 * The Idiom game mode picks a random entry, shows the English idiom,
 * and asks the student to pick the figurative meaning from 4
 * options.  The 3 distractors come straight from the entry's
 * `distractorsEn` tuple.  If any entry is missing a field — or
 * accidentally lists the correct meaning AS a distractor — the round
 * silently breaks for the student.  These tests gate every PR
 * against that class of regression.
 */
import { describe, it, expect } from 'vitest';
import { IDIOMS, pickRandomIdioms } from '../data/idioms';

describe('IDIOMS dataset', () => {
  it('has at least 30 entries (room for variety in a 10-question round)', () => {
    expect(IDIOMS.length).toBeGreaterThanOrEqual(30);
  });

  it('every entry has all required fields populated', () => {
    for (const idiom of IDIOMS) {
      expect(idiom.id, `idiom ${idiom.english} missing id`).toBeTypeOf('number');
      expect(idiom.english, `idiom ${idiom.id} missing english`).toBeTypeOf('string');
      expect(idiom.english.length, `idiom ${idiom.id} has empty english`).toBeGreaterThan(0);
      expect(idiom.meaningEn, `${idiom.english} missing meaningEn`).toBeTypeOf('string');
      expect(idiom.meaningHe, `${idiom.english} missing meaningHe`).toBeTypeOf('string');
      expect(idiom.meaningAr, `${idiom.english} missing meaningAr`).toBeTypeOf('string');
      expect(idiom.example, `${idiom.english} missing example`).toBeTypeOf('string');
      expect(idiom.category, `${idiom.english} missing category`).toBeTypeOf('string');
    }
  });

  it('every entry has exactly 3 distractors', () => {
    for (const idiom of IDIOMS) {
      expect(idiom.distractorsEn, `${idiom.english} distractors`).toHaveLength(3);
      for (const d of idiom.distractorsEn) {
        expect(d, `${idiom.english} has empty distractor`).toBeTypeOf('string');
        expect(d.length, `${idiom.english} has zero-length distractor`).toBeGreaterThan(0);
      }
    }
  });

  it('no distractor accidentally matches the correct English meaning', () => {
    // Common content-curation slip — copy-paste a distractor from
    // meaningEn would silently make the question impossible.
    for (const idiom of IDIOMS) {
      const correct = idiom.meaningEn.trim().toLowerCase();
      for (const d of idiom.distractorsEn) {
        expect(
          d.trim().toLowerCase(),
          `${idiom.english}: distractor "${d}" matches the correct answer`,
        ).not.toBe(correct);
      }
    }
  });

  it('every example sentence contains a recognisable form of the idiom', () => {
    // Loose check — example must include at least the LAST word of
    // the idiom (to catch the case where a curator wrote a sample
    // sentence about a different word entirely).
    //
    // Strip non-word chars from BOTH sides so "red-handed" matches
    // even though the regex removed the hyphen on one side.
    const stripPunct = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '');
    for (const idiom of IDIOMS) {
      const lastWord = stripPunct(idiom.english.trim().split(/\s+/).slice(-1)[0] ?? '');
      expect(lastWord, `${idiom.english}: empty english`).toBeTypeOf('string');
      const flat = stripPunct(idiom.example);
      expect(
        flat.includes(lastWord),
        `${idiom.english}: example "${idiom.example}" doesn't include "${lastWord}"`,
      ).toBe(true);
    }
  });

  it('ids are unique', () => {
    const seen = new Set<number>();
    for (const idiom of IDIOMS) {
      expect(seen.has(idiom.id), `duplicate id ${idiom.id}`).toBe(false);
      seen.add(idiom.id);
    }
  });

  it('categories are from the allowed set', () => {
    const allowed = new Set(['everyday', 'animal', 'body', 'color', 'weather']);
    for (const idiom of IDIOMS) {
      expect(allowed.has(idiom.category), `unknown category ${idiom.category} on ${idiom.english}`).toBe(true);
    }
  });
});

describe('pickRandomIdioms', () => {
  it('returns the requested number when within bounds', () => {
    const picked = pickRandomIdioms(5);
    expect(picked).toHaveLength(5);
  });

  it('caps at the dataset size', () => {
    const picked = pickRandomIdioms(IDIOMS.length + 100);
    expect(picked.length).toBe(IDIOMS.length);
  });

  it('returns no duplicates within a single round', () => {
    const picked = pickRandomIdioms(20);
    const ids = picked.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
