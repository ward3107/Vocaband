/**
 * Booster activation + lookup.
 *
 * Boosters in the shop (xp_booster, weekend_warrior, streak_freeze,
 * lucky_charm, focus_mode) were previously purchasable but inert — the
 * RPC deducted XP, returned success, and nothing else happened.  This
 * hook gives them real semantics:
 *
 *   - `activate(id)` is called from the shop's purchaseBooster handler;
 *     it stamps an expiry timestamp into localStorage (scoped per uid).
 *   - `xpMultiplier()` returns the combined multiplier from any active
 *     XP-boosting boosters; the finish-game path multiplies xpEarned.
 *   - `consumeLuckyCharm()` is called once per game start; if a Lucky
 *     Charm is active, the first wrong answer in the upcoming game is
 *     forgiven.  Returns true when the charm was just consumed.
 *   - `isStreakFrozen()` is checked before resetting a streak on a
 *     missed-day; if frozen, eat the freeze and keep the streak.
 *
 * No schema change required; everything lives in localStorage so we can
 * iterate quickly.  Promote to a server-side table later if cheating
 * becomes a problem.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

export type BoosterId =
  | 'streak_freeze'
  | 'lucky_spin'
  | 'xp_booster'
  | 'lucky_charm'
  | 'focus_mode'
  | 'weekend_warrior';

interface BoosterDuration {
  /** Milliseconds the booster stays active after activation, or null if
   * single-use (lucky_charm) / weekend (computed from current day). */
  durationMs: number | null;
}

const DURATIONS: Record<BoosterId, BoosterDuration> = {
  xp_booster:      { durationMs: 24 * 60 * 60 * 1000 },        // 24h
  focus_mode:      { durationMs: 60 * 60 * 1000 },             // 1h
  weekend_warrior: { durationMs: null },                       // computed (sat-sun)
  streak_freeze:   { durationMs: null },                       // single-use shield
  lucky_charm:     { durationMs: null },                       // single-use shield (first wrong forgiven)
  lucky_spin:      { durationMs: null },                       // grants reward immediately, no active state
};

const k = (uid: string, suffix: string) => `vocaband_booster_${uid}_${suffix}`;

export function useBoosters(uid: string | null | undefined) {
  const userKey = uid || '__anon__';

  // --- xp_booster: store an expiry timestamp ---
  const [xpBoosterExpiry, setXpBoosterExpiry] = useState<number>(() => {
    try { return Number(localStorage.getItem(k(userKey, 'xp_booster_expiry')) ?? 0); } catch { return 0; }
  });
  // --- focus_mode: same pattern ---
  const [focusModeExpiry, setFocusModeExpiry] = useState<number>(() => {
    try { return Number(localStorage.getItem(k(userKey, 'focus_mode_expiry')) ?? 0); } catch { return 0; }
  });
  // --- streak_freeze + lucky_charm: count of remaining shields ---
  const [streakFreezes, setStreakFreezes] = useState<number>(() => {
    try { return Number(localStorage.getItem(k(userKey, 'streak_freezes')) ?? 0); } catch { return 0; }
  });
  const [luckyCharms, setLuckyCharms] = useState<number>(() => {
    try { return Number(localStorage.getItem(k(userKey, 'lucky_charms')) ?? 0); } catch { return 0; }
  });
  // --- weekend_warrior: a single bool flag for "purchased weekend warrior";
  //     active only on Sat/Sun until the next Monday ---
  const [weekendArmed, setWeekendArmed] = useState<boolean>(() => {
    try { return localStorage.getItem(k(userKey, 'weekend_armed')) === '1'; } catch { return false; }
  });

  // Persist on changes
  useEffect(() => { try { localStorage.setItem(k(userKey, 'xp_booster_expiry'), String(xpBoosterExpiry)); } catch {} }, [xpBoosterExpiry, userKey]);
  useEffect(() => { try { localStorage.setItem(k(userKey, 'focus_mode_expiry'), String(focusModeExpiry)); } catch {} }, [focusModeExpiry, userKey]);
  useEffect(() => { try { localStorage.setItem(k(userKey, 'streak_freezes'), String(streakFreezes)); } catch {} }, [streakFreezes, userKey]);
  useEffect(() => { try { localStorage.setItem(k(userKey, 'lucky_charms'), String(luckyCharms)); } catch {} }, [luckyCharms, userKey]);
  useEffect(() => { try { localStorage.setItem(k(userKey, 'weekend_armed'), weekendArmed ? '1' : '0'); } catch {} }, [weekendArmed, userKey]);

  const now = Date.now();
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;

  const isXpBoosterActive    = xpBoosterExpiry > now;
  const isFocusModeActive    = focusModeExpiry > now;
  const isWeekendWarriorActive = weekendArmed && isWeekend;

  /** Combined XP multiplier from all active boosters. */
  const xpMultiplier = useCallback(() => {
    let mult = 1;
    if (isXpBoosterActive)        mult *= 2;
    if (isWeekendWarriorActive)   mult *= 2;
    return mult;
  }, [isXpBoosterActive, isWeekendWarriorActive]);

  /** Activate a booster.  Called from shop's purchaseBooster handler.
   *  Date.now() is computed inside the body (not via the closure-
   *  captured `now` constant) so the callback identity is stable
   *  across renders.  A 2026-05-04 audit found `now` in the deps
   *  array caused this callback ref to churn every render — local-
   *  only churn today, but invites bugs if a future caller takes
   *  `activate` as a useEffect dep. */
  const activate = useCallback((id: BoosterId) => {
    const d = DURATIONS[id];
    const tNow = Date.now();
    if (id === 'xp_booster' && d.durationMs) {
      // Stack: extend existing expiry rather than reset.
      setXpBoosterExpiry(prev => Math.max(prev, tNow) + (d.durationMs ?? 0));
    } else if (id === 'focus_mode' && d.durationMs) {
      setFocusModeExpiry(prev => Math.max(prev, tNow) + (d.durationMs ?? 0));
    } else if (id === 'streak_freeze') {
      setStreakFreezes(prev => prev + 1);
    } else if (id === 'lucky_charm') {
      setLuckyCharms(prev => prev + 1);
    } else if (id === 'weekend_warrior') {
      setWeekendArmed(true);
    }
    // lucky_spin grants a reward immediately via shop RPC; nothing to set here.
  }, []);

  /** Consume a single Lucky Charm shield if available.  Call once on
   * game start.  Returns true if a charm was consumed (caller should
   * record this so the first wrong answer is forgiven). */
  const consumeLuckyCharm = useCallback(() => {
    if (luckyCharms <= 0) return false;
    setLuckyCharms(prev => prev - 1);
    return true;
  }, [luckyCharms]);

  /** Spend a Streak Freeze if available.  Returns true if one was used
   * (caller should NOT reset the streak).  Otherwise returns false. */
  const tryConsumeStreakFreeze = useCallback(() => {
    if (streakFreezes <= 0) return false;
    setStreakFreezes(prev => prev - 1);
    return true;
  }, [streakFreezes]);

  return useMemo(() => ({
    isXpBoosterActive,
    isFocusModeActive,
    isWeekendWarriorActive,
    streakFreezes,
    luckyCharms,
    xpMultiplier,
    activate,
    consumeLuckyCharm,
    tryConsumeStreakFreeze,
  }), [isXpBoosterActive, isFocusModeActive, isWeekendWarriorActive, streakFreezes, luckyCharms, xpMultiplier, activate, consumeLuckyCharm, tryConsumeStreakFreeze]);
}
