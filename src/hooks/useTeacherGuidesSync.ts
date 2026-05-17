/**
 * Wire the signed-in teacher's persisted `guides_seen` list into the
 * module-level guide store consumed by useFirstTimeGuide.  On dismissal
 * the hook's markSeen callback appends to user.guides_seen and writes
 * it back to Supabase, so a teacher signing in on a second device never
 * re-sees a guide they already closed.
 *
 * Students / guests get a null store — useFirstTimeGuide then falls
 * back to localStorage (still works, just per-device).
 *
 * Pulled out of App.tsx so the optimistic-update + rollback dance has a
 * stable home.  No behaviour change.
 */
import { useEffect } from 'react';
import type React from 'react';
import { supabase, hasTeacherAccess, type AppUser } from '../core/supabase';
import { setGuideStore, type GuideKey } from './useFirstTimeGuide';

export function useTeacherGuidesSync(
  user: AppUser | null,
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>,
): void {
  useEffect(() => {
    if (!user || !hasTeacherAccess(user)) {
      setGuideStore(null);
      return;
    }
    const seen = user.guidesSeen ?? [];
    setGuideStore({
      seen,
      markSeen: async (key: GuideKey) => {
        if (seen.includes(key)) return;
        const next = Array.from(new Set([...seen, key]));
        // Optimistic in-memory update first — the dashboard re-renders
        // immediately without waiting for the round-trip.
        setUser((prev) => (prev ? { ...prev, guidesSeen: next } : prev));
        const { error } = await supabase
          .from('users')
          .update({ guides_seen: next })
          .eq('uid', user.uid);
        if (error) {
          // Roll back the optimistic update so a retry from another
          // device can re-attempt.  localStorage still suppresses
          // re-shows on THIS device until storage clears.
          console.warn('[guides] persist failed; rolling back:', error);
          setUser((prev) => (prev ? { ...prev, guidesSeen: seen } : prev));
        }
      },
    });
    return () => {
      setGuideStore(null);
    };
  }, [user, setUser]);
}
