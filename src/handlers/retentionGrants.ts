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
