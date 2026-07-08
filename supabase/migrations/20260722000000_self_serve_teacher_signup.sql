-- =============================================================================
-- 20260722000000_self_serve_teacher_signup.sql
--
-- Self-serve teacher sign-up (no admin allowlisting required).
--
-- Until now teacher accounts were invite-only: the users_insert RLS policy
-- (20260607170000_lock_teacher_signup_to_allowlist.sql) rejects any
-- role='teacher' self-insert unless the email is on teacher_allowlist. That
-- policy STAYS in place as the backstop for direct client inserts.
--
-- This migration adds a SECURITY DEFINER RPC — self_register_teacher — that a
-- signed-in (non-anonymous) user calls to create their OWN teacher row. Because
-- it runs as the function owner it bypasses users_insert RLS, so no allowlist
-- entry is needed; the guardrails move INTO the function instead:
--   * caller must be authenticated and NOT anonymous (students use class code +
--     PIN via anonymous sessions — they must never mint a teacher account);
--   * refuses any email that belongs to an active/approved student_profile.
--
-- The signup screen also records which Ministry-of-Education school the teacher
-- picked (searchable dropdown, src/data/israel-schools.ts), captured in the two
-- additive columns below for onboarding analytics + future school linkage.
--
-- Additive + idempotent. Reversible: DROP FUNCTION self_register_teacher(...)
-- and the two columns to fully revert to invite-only.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Additive: record the school selected at self-serve signup. Nullable — old
-- rows and allowlisted/OTP teachers simply leave them NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signup_school_semel BIGINT,
  ADD COLUMN IF NOT EXISTS signup_school_name  TEXT;

COMMENT ON COLUMN public.users.signup_school_semel IS
  'Ministry of Education school ID (סמל מוסד) the teacher chose during self-serve signup. Nullable.';
COMMENT ON COLUMN public.users.signup_school_name IS
  'School name snapshot the teacher chose during self-serve signup. Nullable.';

-- ---------------------------------------------------------------------------
-- Self-serve teacher registration. Creates (or upgrades) the CALLER's own
-- users row to role='teacher' on the free plan with a fresh 31-day trial.
-- SECURITY DEFINER so it bypasses the invite-only users_insert RLS policy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.self_register_teacher(
  p_display_name TEXT,
  p_school_semel BIGINT DEFAULT NULL,
  p_school_name  TEXT   DEFAULT NULL,
  p_subject      TEXT   DEFAULT 'english'
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid   TEXT    := (SELECT auth.uid())::text;
  v_email TEXT    := public.get_my_email();
  v_anon  BOOLEAN := COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, FALSE);
  r public.users;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_anon THEN
    RAISE EXCEPTION 'anonymous sessions cannot register as a teacher';
  END IF;
  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RAISE EXCEPTION 'account has no email';
  END IF;

  -- Students never get a teacher account (they sign in with class code + PIN).
  IF EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE lower(sp.email) = lower(v_email)
      AND sp.status IN ('active', 'approved')
  ) THEN
    RAISE EXCEPTION 'this email is registered as a student';
  END IF;

  INSERT INTO public.users (
    uid, email, role, display_name, plan, trial_ends_at, subject,
    signup_school_semel, signup_school_name
  )
  VALUES (
    v_uid, v_email, 'teacher',
    COALESCE(NULLIF(btrim(p_display_name), ''), split_part(v_email, '@', 1), 'Teacher'),
    'free',
    now() + interval '31 days',
    COALESCE(NULLIF(btrim(p_subject), ''), 'english'),
    p_school_semel,
    NULLIF(btrim(p_school_name), '')
  )
  ON CONFLICT (uid) DO UPDATE SET
    role                = 'teacher',
    display_name        = COALESCE(NULLIF(btrim(EXCLUDED.display_name), ''), public.users.display_name),
    subject             = COALESCE(EXCLUDED.subject, public.users.subject),
    signup_school_semel = COALESCE(EXCLUDED.signup_school_semel, public.users.signup_school_semel),
    signup_school_name  = COALESCE(EXCLUDED.signup_school_name,  public.users.signup_school_name)
  -- Never silently demote an existing admin/manager into a teacher.
  WHERE public.users.role IS DISTINCT FROM 'admin'
    AND public.users.role IS DISTINCT FROM 'manager'
  RETURNING * INTO r;

  -- Conflict existed but the WHERE guard blocked the update (admin/manager):
  -- return their current row unchanged rather than NULL.
  IF r.uid IS NULL THEN
    SELECT * INTO r FROM public.users WHERE uid = v_uid;
  END IF;

  RETURN r;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — any signed-in user may self-register; anon is revoked (the function
-- also rejects anonymous sessions internally as defence in depth).
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.self_register_teacher(TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.self_register_teacher(TEXT, BIGINT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.self_register_teacher IS
  'Self-serve teacher signup: creates the caller''s own teacher row (free plan + 31-day trial) and records the Ministry school selected. SECURITY DEFINER — bypasses invite-only users_insert RLS. Rejects anonymous sessions and emails registered as students.';

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (paste into the SQL editor after applying):
--   -- as an authenticated non-teacher session:
--   SELECT public.self_register_teacher('Ms. Cohen', 12345, 'ORT Haifa', 'english');
--   -- expect: one users row, role='teacher', plan='free', school fields set.
-- ---------------------------------------------------------------------------
