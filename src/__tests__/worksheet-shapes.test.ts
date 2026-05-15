/**
 * worksheet-shapes.test.ts — guards the print-worksheet answer-key
 * correctness.  The old code hardcoded "A / True / translation" in the
 * consolidated key, which was wrong for ~75% of MC questions, half of
 * T/F questions, and every match-up row.  These tests lock in:
 *
 *   - MC: target word is always among the options, exactly once, at
 *     the position reported by `correctIndex`.
 *   - T/F: when isTrue, the shown translation equals the correct one;
 *     when !isTrue, it doesn't.
 *   - Match-up: `rightOrder` is a valid permutation (every row idx
 *     appears exactly once), so `rightOrder.indexOf(leftIdx)` resolves
 *     to a real position.
 *   - Sentence builder: token scrambles use the same tokens as the
 *     source sentence.
 */
import { describe, it, expect } from 'vitest';
import { buildQuestionShapes } from '../components/worksheet/buildShapes';
import type { Word } from '../data/vocabulary';

const WORDS: Word[] = [
  { id: 1, english: 'apple', hebrew: 'תפוח', arabic: 'تفاحة', level: 'Set 1' },
  { id: 2, english: 'banana', hebrew: 'בננה', arabic: 'موز', level: 'Set 1' },
  { id: 3, english: 'cherry', hebrew: 'דובדבן', arabic: 'كرز', level: 'Set 1' },
  { id: 4, english: 'date', hebrew: 'תמר', arabic: 'تمر', level: 'Set 1' },
  { id: 5, english: 'elderberry', hebrew: 'סמבוק', arabic: 'بلسان', level: 'Set 1' },
];

describe('buildQuestionShapes — multiple choice', () => {
  it('places the target at correctIndex', () => {
    const { 'multiple-choice': mc } = buildQuestionShapes(WORDS, 'he', undefined);
    mc.questions.forEach((q) => {
      const target = WORDS.find((w) => w.id === q.wordId)!;
      expect(q.options[q.correctIndex]).toBe(target.english);
    });
  });

  it('dedupes distractors by english text', () => {
    // Two entries share the same english text — the second's id is
    // different (custom paste with OCR + typing).  MC must not list
    // the same english twice in the options.
    const wordsWithDup: Word[] = [
      ...WORDS,
      { id: 99, english: 'apple', hebrew: 'תפוח 2', arabic: 'تفاحة 2', level: 'Custom' },
    ];
    const { 'multiple-choice': mc } = buildQuestionShapes(wordsWithDup, 'he', undefined);
    mc.questions.forEach((q) => {
      const unique = new Set(q.options.map((o) => o.toLowerCase()));
      expect(unique.size).toBe(q.options.length);
    });
  });

  it('includes the target exactly once in options', () => {
    const { 'multiple-choice': mc } = buildQuestionShapes(WORDS, 'he', undefined);
    mc.questions.forEach((q) => {
      const target = WORDS.find((w) => w.id === q.wordId)!;
      const hits = q.options.filter((o) => o === target.english).length;
      expect(hits).toBe(1);
    });
  });

  it('does not list the target as a distractor', () => {
    const { 'multiple-choice': mc } = buildQuestionShapes(WORDS, 'he', undefined);
    mc.questions.forEach((q) => {
      const target = WORDS.find((w) => w.id === q.wordId)!;
      const otherPositions = q.options
        .map((opt, i) => ({ opt, i }))
        .filter(({ i }) => i !== q.correctIndex);
      otherPositions.forEach(({ opt }) => {
        expect(opt).not.toBe(target.english);
      });
    });
  });
});

describe('buildQuestionShapes — true/false', () => {
  it('isTrue rows show the correct translation', () => {
    const { 'true-false': tf } = buildQuestionShapes(WORDS, 'he', undefined);
    tf.questions.forEach((q) => {
      if (!q.isTrue) return;
      const word = WORDS.find((w) => w.id === q.wordId)!;
      expect(q.shownTranslation).toBe(word.hebrew);
    });
  });

  it('!isTrue rows show a translation that differs from the correct one', () => {
    const { 'true-false': tf } = buildQuestionShapes(WORDS, 'he', undefined);
    tf.questions.forEach((q) => {
      if (q.isTrue) return;
      const word = WORDS.find((w) => w.id === q.wordId)!;
      // The whole point: distractor must NOT equal the correct
      // translation, otherwise the "false" answer is actually true.
      expect(q.shownTranslation).not.toBe(word.hebrew);
    });
  });

  it('produces a balanced true/false pattern (not all same value)', () => {
    const { 'true-false': tf } = buildQuestionShapes(WORDS, 'he', undefined);
    const trues = tf.questions.filter((q) => q.isTrue).length;
    expect(trues).toBeGreaterThan(0);
    expect(trues).toBeLessThan(tf.questions.length);
  });
});

describe('buildQuestionShapes — match-up', () => {
  it('rightOrder is a valid permutation', () => {
    const { 'match-up': mu } = buildQuestionShapes(WORDS, 'he', undefined);
    const sorted = [...mu.rightOrder].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4]);
  });

  it('every left row resolves to a real right position', () => {
    const { 'match-up': mu } = buildQuestionShapes(WORDS, 'he', undefined);
    WORDS.forEach((_, leftIdx) => {
      const rightPos = mu.rightOrder.indexOf(leftIdx);
      expect(rightPos).toBeGreaterThanOrEqual(0);
      expect(rightPos).toBeLessThan(WORDS.length);
    });
  });
});

describe('buildQuestionShapes — matching', () => {
  it('translationOrder is a valid permutation', () => {
    const { matching } = buildQuestionShapes(WORDS, 'he', undefined);
    const sorted = [...matching.translationOrder].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('buildQuestionShapes — sentence builder', () => {
  it('uses AI sentence when provided, with all tokens preserved', () => {
    const ai = { 1: 'I ate an apple yesterday' };
    const { 'sentence-builder': sb } = buildQuestionShapes(WORDS, 'he', ai);
    const apple = sb.items.find((it) => it.wordId === 1)!;
    expect(apple.sentence).toBe('I ate an apple yesterday');
    const originalTokens = 'I ate an apple yesterday'.split(' ').sort();
    const scrambledTokens = apple.scrambled.split(' ').sort();
    expect(scrambledTokens).toEqual(originalTokens);
  });

  it('returns null sentence when no AI / stored sentence is available', () => {
    const { 'sentence-builder': sb } = buildQuestionShapes(WORDS, 'he', undefined);
    sb.items.forEach((item) => {
      expect(item.sentence).toBeNull();
      expect(item.scrambled).toBe('');
    });
  });
});

describe('buildQuestionShapes — scramble', () => {
  it('produces one entry per word', () => {
    const { scramble } = buildQuestionShapes(WORDS, 'he', undefined);
    expect(scramble.scrambled).toHaveLength(WORDS.length);
  });

  it('scrambled letters match the source letters (multiset equal)', () => {
    const { scramble } = buildQuestionShapes(WORDS, 'he', undefined);
    WORDS.forEach((w, i) => {
      const source = w.english.toUpperCase().split('').sort().join('');
      const scrambledChars = scramble.scrambled[i].split('').sort().join('');
      expect(scrambledChars).toBe(source);
    });
  });
});
