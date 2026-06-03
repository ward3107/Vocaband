/**
 * useAchievements — fetches the student's existing unlock rows from
 * Supabase, evaluates the ACHIEVEMENTS catalogue against an incoming
 * snapshot, and persists any newly-met achievements append-only.
 *
 * Flow:
 *   1. Mount: fetch all existing rows for the user. `unlocked` mirrors
 *      the DB, and `recordEvent` stays INERT until that read resolves
 *      (`ready`). This is the linchpin: if we evaluated before the
 *      unlock set loaded, every already-earned achievement would look
 *      "newly unlocked" and re-toast on every page reload.
 *   2. First-run back-fill: when the DB returns ZERO rows the student has
 *      never had achievements evaluated. The first evaluation then seeds
 *      whatever is already met *silently* (no toast, no XP) so a student
 *      who was already at XP 6000 before this feature shipped doesn't get
 *      spammed. The DB is the source of truth here — not a per-device
 *      localStorage flag — so the seed is correct across devices.
 *   3. recordEvent(snapshot): re-evaluate every still-locked achievement.
 *      For each that flips from locked → unlocked:
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
  // Flips true only once the initial DB read resolves. recordEvent is a
  // no-op until then so a snapshot that hydrates before the unlock set
  // can't mistake already-earned achievements for fresh unlocks.
  const [ready, setReady] = useState(false);
  // True when the DB held zero rows at load — i.e. achievements have never
  // been evaluated for this student. The first evaluation back-fills the
  // already-met set silently; everything after that is a real unlock.
  const needsSeedRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial fetch. Establishes the unlock set from the DB before any
  // evaluation can run, and decides whether a silent back-fill is due.
  useEffect(() => {
    if (!enabled || !uid) {
      setReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    void (async () => {
      const { data, error } = await supabase
        .from("student_achievements")
        .select("achievement_id")
        .eq("user_uid", uid);
      if (cancelled) return;
      // On a failed read we deliberately stay not-ready: evaluating against
      // an empty set here is exactly what produced the reload spam.
      if (error) return;
      const ids = new Set<string>(
        (data ?? []).map((r: { achievement_id: string }) => r.achievement_id),
      );
      setUnlocked(ids);
      needsSeedRef.current = ids.size === 0;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, enabled]);

  const recordEvent = useCallback(
    async (snapshot: AchievementSnapshot) => {
      // Gate on `ready`: until the DB read lands, `unlocked` is unreliable.
      if (!enabled || !uid || !ready) return;

      const newly = ACHIEVEMENTS.filter(
        (ach) => !unlocked.has(ach.id) && ach.predicate(snapshot),
      );

      if (newly.length === 0) {
        // Nothing met. The back-fill window is over the moment we evaluate a
        // real snapshot with nothing pending, so a brand-new student's first
        // genuine unlock later isn't swallowed as a silent seed.
        needsSeedRef.current = false;
        return;
      }

      const isSilentSeed = needsSeedRef.current;
      // Bulk insert — upsert with ignoreDuplicates so an RLS-permitted
      // concurrent unlock doesn't fail the whole batch.
      const { error } = await supabase.from("student_achievements").upsert(
        newly.map((ach) => ({
          user_uid: uid,
          achievement_id: ach.id,
          xp_awarded: isSilentSeed ? 0 : ach.xpReward,
        })),
        { onConflict: "user_uid,achievement_id", ignoreDuplicates: true },
      );
      if (error) return;

      // Mirror the new ids locally so they're never re-evaluated this session.
      setUnlocked((prev) => {
        const next = new Set(prev);
        for (const ach of newly) next.add(ach.id);
        return next;
      });

      if (isSilentSeed) {
        // First-run back-fill done — persisted, but no toast and no XP.
        needsSeedRef.current = false;
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
    [enabled, uid, ready, unlocked, onGrantXp, dismissToast],
  );

  return { unlocked, toasts, dismissToast, recordEvent };
}
