/**
 * useCombo — chain-of-correct-answers counter, pure client-side.
 *
 * API:
 *   - chain          : current consecutive-correct count, 0 on reset
 *   - multiplier     : XP multiplier the caller folds into its grant.
 *                      3+ chain → 1.0× (no bonus, just the badge)
 *                      5+ chain → 1.25×
 *                      8+ chain → 1.5×
 *                      Capped at 1.5× to keep the XP economy in check.
 *   - registerCorrect()  : increment chain.  Returns the new chain.
 *   - registerWrong()    : reset to 0.  Returns 0.
 *   - reset()            : explicit reset (e.g. on game start / quit).
 *
 * No persistence — combo is per-game-session.  Audio cues are fired by
 * the consumer (CombosOverlay) so this hook stays pure and testable.
 */
import { useCallback, useState } from "react";

export interface UseComboApi {
  chain: number;
  multiplier: number;
  registerCorrect: () => number;
  registerWrong: () => number;
  reset: () => void;
}

export function comboMultiplier(chain: number): number {
  if (chain >= 8) return 1.5;
  if (chain >= 5) return 1.25;
  return 1;
}

export function useCombo(): UseComboApi {
  const [chain, setChain] = useState(0);

  const registerCorrect = useCallback(() => {
    let next = 0;
    setChain((prev) => {
      next = prev + 1;
      return next;
    });
    return next;
  }, []);

  const registerWrong = useCallback(() => {
    setChain(0);
    return 0;
  }, []);

  const reset = useCallback(() => setChain(0), []);

  return {
    chain,
    multiplier: comboMultiplier(chain),
    registerCorrect,
    registerWrong,
    reset,
  };
}
