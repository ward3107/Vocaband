import { COIN_BASE_PER_GAME, COIN_SCORE_DIVISOR } from '../constants/game';

/**
 * Coins earned for finishing one game.
 *  - flat base + (normalised score / divisor), so every completed game pays
 *    something but a good game pays more
 *  - zero when the assignment is locked (the anti-farm round cap already
 *    zeroes XP in the same situation — coins follow the same rule)
 *  - multiplier carries the 2× Coins booster (1 when inactive)
 * Score is expected on a 0-100 scale; values outside are clamped.
 */
export function coinsForGame(params: {
  score: number;
  locked: boolean;
  coinMultiplier: number;
}): number {
  if (params.locked) return 0;
  const score = Math.max(0, Math.min(100, params.score));
  const base = COIN_BASE_PER_GAME + Math.round(score / COIN_SCORE_DIVISOR);
  return Math.round(base * params.coinMultiplier);
}
