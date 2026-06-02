/**
 * useAchievements — fetches the student's existing unlock rows from
 * Supabase, evaluates the ACHIEVEMENTS catalogue against an incoming
 * snapshot, and persists any newly-met achievements append-only.
 *
 * Flow:
 *   1. Mount: fetch all existing rows for the user; cache the set.
 *   2. First-run seed: if `voca:ach-seeded:<uid>` is absent in
 *      localStorage, every currently-met achievement is inserted
 *      *silently* (no toast, no XP) — back-fill protection so a
 *      student already at XP 6000 doesn't get spammed at first login.
 *      The seed flag prevents re-seeding on subsequent loads.
 *   3. recordEvent(snapshot): re-evaluate every still-locked
 *      achievement against the new snapshot.  For each that flips
 *      from locked → unlocked:
 *         - INSERT into student_achievements (ON CONFLICT DO NOTHING)
 *         - queue an AchievementToast item
 *         - call onGrantXp(xpReward, label) so the economy stays in
 *           one place
 *
 * The hook is inert when `enabled` is false (guests, pre-auth flows).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, type AchievementSnapshot } from "../constants/game";
import { supabase } from "../core/supabase";

const seedKey = (uid: string) => `voca:ach-seeded:${uid}`;

export interface AchievementToastItem {
  id: string;
  achievementId: string;
  emoji: string;
  name: string;
  xpReward: number;
}

export interface UseAchievementsApi {
  unlocked: Set<string>;
  toasts: AchievementToastItem[];
  dismissToast: (id: string) => void;
  /** Re-evaluate every locked achievement against this snapshot. */
  recordEvent: (snapshot: AchievementSnapshot) => Promise<void>;
}

interface UseAchievementsOptions {
  uid: string | null | undefined;
  enabled: boolean;
  /** XP grant routed through the App's canonical economy path so the
   *  toast XP and the users.xp row stay consistent. */
  onGrantXp?: (amount: number, reason: string) => void;
}

const TOAST_DURATION_MS = 4200;

export function useAchievements({
  uid,
  enabled,
  onGrantXp,
}: UseAchievementsOptions): UseAchievementsApi {
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<AchievementToastItem[]>([]);
  const seededRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial fetch + first-run seed.
  useEffect(() => {
    if (!enabled || !uid) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("student_achievements")
        .select("achievement_id")
        .eq("user_uid", uid);
      if (cancelled) return;
      if (error) return;
      const ids = new Set<string>((data ?? []).map((r: { achievement_id: string }) => r.achievement_id));
      setUnlocked(ids);
      // If no seed marker exists, this is the first time the user has
      // had achievements evaluated on this device.  We don't seed
      // proactively here — `recordEvent` will seed silently on its
      // first call (when the caller's first real snapshot is built).
      try {
        if (!localStorage.getItem(seedKey(uid))) {
          // Mark uninitialised; first recordEvent call performs the seed.
          seededRef.current = false;
        } else {
          seededRef.current = true;
        }
      } catch {
        seededRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, enabled]);

  const recordEvent = useCallback(
    async (snapshot: AchievementSnapshot) => {
      if (!enabled || !uid) return;
      // Evaluate every locked achievement against the snapshot.
      const newly: typeof ACHIEVEMENTS = [];
      for (const ach of ACHIEVEMENTS) {
        if (unlocked.has(ach.id)) continue;
        if (ach.predicate(snapshot)) newly.push(ach);
      }
      if (newly.length === 0) return;

      const isSilentSeed = !seededRef.current;
      // Bulk insert — Supabase upsert with ignoreDuplicates so any
      // RLS-permitted concurrent unlock doesn't fail the whole batch.
      const { error } = await supabase
        .from("student_achievements")
        .upsert(
          newly.map((ach) => ({
            user_uid: uid,
            achievement_id: ach.id,
            xp_awarded: isSilentSeed ? 0 : ach.xpReward,
          })),
          { onConflict: "user_uid,achievement_id", ignoreDuplicates: true },
        );
      if (error) return;

      // Optimistic local set update regardless of seed/real unlock.
      setUnlocked((prev) => {
        const next = new Set(prev);
        for (const ach of newly) next.add(ach.id);
        return next;
      });

      if (isSilentSeed) {
        // First-run seed completes; mark and skip toasts + XP grants.
        seededRef.current = true;
        try {
          localStorage.setItem(seedKey(uid), "1");
        } catch {/* private-mode */}
        return;
      }

      // Real unlock — queue toasts and grant XP.
      const ts = Date.now();
      setToasts((prev) => [
        ...prev,
        ...newly.map((ach, i) => ({
          id: `${ts}-${ach.id}-${i}`,
          achievementId: ach.id,
          emoji: ach.emoji,
          name: ach.name,
          xpReward: ach.xpReward,
        })),
      ]);
      for (const ach of newly) {
        onGrantXp?.(ach.xpReward, `${ach.emoji} Achievement: ${ach.name}`);
      }
      // Auto-dismiss after a beat so a sweep of three doesn't stick.
      newly.forEach((ach, i) => {
        const tid = `${ts}-${ach.id}-${i}`;
        setTimeout(() => dismissToast(tid), TOAST_DURATION_MS + i * 800);
      });
    },
    [enabled, uid, unlocked, onGrantXp, dismissToast],
  );

  return { unlocked, toasts, dismissToast, recordEvent };
}
