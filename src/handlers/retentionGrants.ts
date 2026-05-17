/**
 * Persist a retention-XP grant (daily chest, weekly challenge, comeback,
 * pet evolution) through the claim_retention_xp RPC.  Direct UPDATE on
 * public.users used to work but RLS now restricts xp writes to
 * SECURITY DEFINER paths — see
 * supabase/migrations/20260514130000_claim_retention_xp.sql for context.
 *
 * Optimistically bumps the local XP so the celebration toast lands
 * instantly; the RPC reconciles (and clamps) authoritatively.  On RPC
 * failure the optimistic bump is rolled back so the dashboard doesn't
 * show a phantom value the server didn't accept.
 */
import type React from 'react';
import { supabase, type AppUser } from '../core/supabase';
import type { PetRewardKind } from '../constants/game';

export interface GrantRetentionXpDeps {
  user: AppUser | null;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function grantRetentionXp(
  amount: number,
  reason: string,
  deps: GrantRetentionXpDeps,
): void {
  const { user, setXp, showToast } = deps;
  setXp((prev) => prev + amount);
  if (user && amount > 0) {
    supabase
      .rpc('claim_retention_xp', { p_xp_delta: amount })
      .then(({ data, error }) => {
        if (error) {
          console.error('[onGrantXp] claim_retention_xp failed:', error);
          setXp((prev) => Math.max(0, prev - amount));
          return;
        }
        const serverXp = (data as { new_xp?: number } | null)?.new_xp;
        if (typeof serverXp === 'number') setXp(serverXp);
      });
  }
  showToast(reason, 'success');
}

export interface ApplyServerRewardsDeps {
  setXp: React.Dispatch<React.SetStateAction<number>>;
  setBadges: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Sync the dashboard's LOCAL XP + badges snapshot to a server-applied
 * teacher-reward burst.  The award_reward RPC already incremented
 * users.xp and appended badges in the same transaction as the
 * teacher_rewards insert — writing to Supabase here would double-count.
 * Called from RewardInboxCard when polling detects new rewards.
 */
export function applyServerRewards(
  xpToAdd: number,
  badgesToAppend: string[],
  deps: ApplyServerRewardsDeps,
): void {
  if (xpToAdd > 0) deps.setXp((prev) => prev + xpToAdd);
  if (badgesToAppend.length > 0) {
    deps.setBadges((prev) => {
      const next = [...prev];
      for (const b of badgesToAppend) {
        if (!next.includes(b)) next.push(b);
      }
      return next;
    });
  }
}

export interface GrantNonXpRewardDeps {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
}

/**
 * Apply a non-XP reward (title/frame/avatar unlock) into local user
 * state.  Called from pet-milestone claims; the DB row is already
 * authoritative by the time we get here.  'xp' is a valid PetRewardKind
 * but flows through grantRetentionXp, not this path.
 */
export function grantNonXpReward(
  kind: PetRewardKind,
  value: number | string,
  deps: GrantNonXpRewardDeps,
): void {
  if (!deps.user) return;
  let tagged: string | null = null;
  if (kind === 'unlock_avatar') tagged = String(value);
  else if (kind === 'unlock_title') tagged = `title_${value}`;
  else if (kind === 'unlock_frame') tagged = `frame_${value}`;
  if (!tagged) return;
  deps.setUser((prev) =>
    prev
      ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), tagged as string] }
      : prev,
  );
}
