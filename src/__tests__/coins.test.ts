import { describe, it, expect } from 'vitest';
import { coinsForGame } from '../utils/coins';

describe('coinsForGame', () => {
  it('grants base + score-scaled coins for a normal game', () => {
    expect(coinsForGame({ score: 80, locked: false, coinMultiplier: 1 })).toBe(18);
  });

  it('grants base + full bonus for a perfect game', () => {
    expect(coinsForGame({ score: 100, locked: false, coinMultiplier: 1 })).toBe(20);
  });

  it('still pays the base on a zero-score game', () => {
    expect(coinsForGame({ score: 0, locked: false, coinMultiplier: 1 })).toBe(10);
  });

  it('grants ZERO when the assignment is locked (anti-farm)', () => {
    expect(coinsForGame({ score: 100, locked: true, coinMultiplier: 1 })).toBe(0);
  });

  it('applies the coin multiplier (2× Coins booster), rounding the result', () => {
    expect(coinsForGame({ score: 80, locked: false, coinMultiplier: 2 })).toBe(36);
  });

  it('clamps a negative score to the base', () => {
    expect(coinsForGame({ score: -50, locked: false, coinMultiplier: 1 })).toBe(10);
  });
});
