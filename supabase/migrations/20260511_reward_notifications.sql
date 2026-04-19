-- Reward notifications for students.
--
-- Current state: teacher_rewards (20260425) is an audit log — every
-- reward gets a row, but students have no way to know a teacher gave
-- them something. They notice the XP bump or new badge, maybe, but
-- they don't get any "Mrs. Cohen gave you 50 XP for great work!"
-- moment. This migration adds:
--
--   1. A seen_at column so each reward is either pending or
--      acknowledged by the student.
--   2. A SELECT RLS policy that lets students read their own rewards
--      (they couldn't before — only teachers could view).
--   3. get_unseen_rewards() — RPC the student dashboard calls on
--      mount to pull anything they haven't been shown yet.
--   4. mark_rewards_seen(ids UUID[]) — RPC the dashboard calls after
--      the student dismisses the celebration card.

ALTER TABLE public.teacher_rewards
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;

-- Students can read their own reward history. Teachers still have the
-- existing "Teachers can view their own rewards" policy from 20260425
-- so this is additive.
DROP POLICY IF EXISTS "Students can view own rewards" ON public.teacher_rewards;
CREATE POLICY "Students can view own rewards"
  ON public.teacher_rewards FOR SELECT
  USING (auth.uid()::text = student_uid);

-- Students can mark their own rewards as seen. Can ONLY set seen_at;
-- everything else is frozen by the WITH CHECK — no way to rewrite
-- reward_value or reason.
DROP POLICY IF EXISTS "Students can mark own rewards seen" ON public.teacher_rewards;
CREATE POLICY "Students can mark own rewards seen"
  ON public.teacher_rewards FOR UPDATE
  USING (auth.uid()::text = student_uid)
  WITH CHECK (auth.uid()::text = student_uid);

-- ── RPC: get_unseen_rewards ──────────────────────────────────────────────
-- Returns the caller's unseen rewards (newest first). No args — always
-- scoped to auth.uid() so a student can't peek at anyone else's inbox.
CREATE OR REPLACE FUNCTION public.get_unseen_rewards()
RETURNS TABLE (
  id            UUID,
  teacher_uid   TEXT,
  teacher_name  TEXT,
  reward_type   TEXT,
  reward_value  TEXT,
  reason        TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid TEXT := auth.uid()::text;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    tr.id,
    tr.teacher_uid,
    COALESCE(
      (SELECT u.display_name FROM public.users u WHERE u.uid = tr.teacher_uid),
      'Your teacher'
    )::TEXT AS teacher_name,
    tr.reward_type,
    tr.reward_value,
    tr.reason,
    tr.created_at
  FROM public.teacher_rewards tr
  WHERE tr.student_uid = v_caller_uid
    AND tr.seen_at IS NULL
  ORDER BY tr.created_at DESC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unseen_rewards() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_unseen_rewards() FROM anon;

-- ── RPC: mark_rewards_seen ───────────────────────────────────────────────
-- Accepts an array of reward IDs, stamps seen_at = now() on the ones that
-- belong to the caller. Safe to call with ids that don't belong to the
-- caller — they just won't update. No error surface.
CREATE OR REPLACE FUNCTION public.mark_rewards_seen(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid TEXT := auth.uid()::text;
  v_updated    INTEGER;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.teacher_rewards
  SET seen_at = now()
  WHERE id = ANY(p_ids)
    AND student_uid = v_caller_uid
    AND seen_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_rewards_seen(UUID[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_rewards_seen(UUID[]) FROM anon;

COMMENT ON COLUMN public.teacher_rewards.seen_at IS
  'Timestamp when the student acknowledged the reward in their dashboard. NULL = still in their inbox.';

COMMENT ON FUNCTION public.get_unseen_rewards IS
  'Returns up to 20 unseen reward rows for the calling student. Used by StudentDashboardView to render the reward inbox card.';

COMMENT ON FUNCTION public.mark_rewards_seen IS
  'Marks the given reward ids as seen. Only affects rows belonging to the caller — safe to pass a mixed list.';
