-- Teacher onboarding marker — records when a teacher completed the
-- first-class wizard so we don't show it on every sign-in.
--
-- The wizard runs ONCE per teacher (first sign-in OR any time they
-- have zero classes AND the column is null).  Marking it "done"
-- writes a timestamp; clearing the column is reserved for QA /
-- support flows that don't yet exist.
--
-- Column is on `users` rather than a separate table since the state
-- is strictly per-user 0/1 with a timestamp.  Adding a join would
-- be premature for a single boolean-equivalent.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.onboarded_at IS
  'Timestamp the teacher completed (or skipped) the first-class onboarding wizard. NULL = wizard hasn''t shown yet OR was dismissed without completing. Set by mark_teacher_onboarded.';

-- ── mark_teacher_onboarded() ─────────────────────────────────────────
-- Tiny RPC the frontend calls on wizard completion (or skip-and-don't-
-- show-again).  SECURITY DEFINER so the column write doesn't need
-- explicit RLS update grants.  Body still gates on auth.uid().
CREATE OR REPLACE FUNCTION public.mark_teacher_onboarded()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.users
     SET onboarded_at = COALESCE(onboarded_at, now())
   WHERE uid = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_teacher_onboarded() TO authenticated;

COMMIT;
