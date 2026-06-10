import { useState } from "react";

/**
 * The four headline reward counters that follow the signed-in user
 * everywhere — XP, coins, streak, and earned badges. They move together
 * (a finished game or a claimed reward bumps several at once) and are
 * read by the retention, level-up, and achievement systems, so grouping
 * them keeps the orchestrator's reward plumbing in one place.
 */
export function useGameStats() {
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  return {
    xp, setXp,
    coins, setCoins,
    streak, setStreak,
    badges, setBadges,
  };
}
