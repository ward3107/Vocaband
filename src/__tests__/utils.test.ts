import { describe, it, expect, vi } from 'vitest';
import { shuffle, chunkArray } from '../utils';

// ─── chunkArray ───────────────────────────────────────────────────────────────

describe('chunkArray', () => {
  it('splits an array into even chunks', () => {
    expect(chunkArray([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it('handles a remainder chunk', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns entire array as one chunk when size >= length', () => {
    expect(chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunkArray([], 3)).toEqual([]);
  });

  it('works with strings', () => {
    expect(chunkArray(['a', 'b', 'c', 'd'], 3)).toEqual([['a', 'b', 'c'], ['d']]);
  });

  it('does not mutate the original array', () => {
    const original = [1, 2, 3, 4];
    chunkArray(original, 2);
    expect(original).toEqual([1, 2, 3, 4]);
  });

  it('creates single-element chunks when size is 1', () => {
    expect(chunkArray([10, 20, 30], 1)).toEqual([[10], [20], [30]]);
  });
});

// ─── shuffle ─────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(5);
  });

  it('contains all the original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual([...arr].sort());
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns empty array for empty input', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('produces a different order when Math.random is mocked', () => {
    // Force a fixed swap sequence: always picks index 0 for every position
    let call = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const values = [0.9, 0.8, 0.7, 0.6];
      return values[call++ % values.length];
    });
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(5);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5].sort());
    vi.restoreAllMocks();
  });
});
