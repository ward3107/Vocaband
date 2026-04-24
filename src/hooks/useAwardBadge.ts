/**
 * useAwardBadge — idempotent "grant a badge to the current user"
 * helper extracted from App.tsx.
 *
 * Returns a single callback. Checks that the badge isn't already on
 * the user's list (cheap idempotency), prepends it to the in-memory
 * list, fires a 'big' celebration, and persists to the users table.
 * DB failures are not surfaced as a toast — we flip setSaveError so
 * the existing save-error banner can show the "will sync next time"
 * message, matching the wider optimistic-save posture.
 *
 * Called from useGameFinish's saveScore when the student hits one of
 * the score / streak / XP milestones. No other callers today.
 */
import { useCallback } from "react";
import { supabase, type AppUser } from "../core/supabase";
import { celebrate } from "../utils/celebrate";

export interface UseAwardBadgeParams {
  user: AppUser | null;
  badges: string[];
  setBadges: React.Dispatch<React.SetStateAction<string[]>>;
  setSaveError: (msg: string | null) => void;
}

export function useAwardBadge(params: UseAwardBadgeParams) {
  const { user, badges, setBadges, setSaveError } = params;

  return useCallback(async (badge: string) => {
    if (!user || badges.includes(badge)) return;

    const newBadges = [...badges, badge];
    setBadges(newBadges);
    celebrate('big');

    try {
      const { error } = await supabase.from('users').update({ badges: newBadges }).eq('uid', user.uid);
      if (error) throw error;
    } catch (error) {
      console.error("Error saving badge:", error);
      setSaveError("Badge couldn't be saved right now, but don't worry — it will sync next time.");
    }
  }, [user, badges, setBadges, setSaveError]);
}
