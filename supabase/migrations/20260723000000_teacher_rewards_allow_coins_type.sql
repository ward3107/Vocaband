-- =============================================================================
-- FIX: allow 'coins' in the teacher_rewards.reward_type CHECK constraint
-- =============================================================================
--
-- 20260722000000_award_reward_coins added a `coins` branch to award_reward,
-- but the teacher_rewards table (the audit row every reward writes) still
-- carried the original constraint from 20260425120000_teacher_rewards:
--
--     CHECK (reward_type IN ('xp', 'badge', 'title', 'avatar'))
--
-- So award_reward('…','coins','50') applied the coin increment, then failed
-- on the audit INSERT with 23514 (teacher_rewards_reward_type_check), which
-- rolled the whole function back — no coins, an error toast, no confetti.
--
-- Widen the constraint to include 'coins'.  Idempotent: drop-if-exists then
-- re-add so a re-run is a no-op.
-- =============================================================================

BEGIN;

ALTER TABLE public.teacher_rewards
  DROP CONSTRAINT IF EXISTS teacher_rewards_reward_type_check;

ALTER TABLE public.teacher_rewards
  ADD CONSTRAINT teacher_rewards_reward_type_check
  CHECK (reward_type IN ('xp', 'coins', 'badge', 'title', 'avatar'));

COMMIT;
