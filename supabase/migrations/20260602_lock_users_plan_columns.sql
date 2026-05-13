-- =============================================================================
-- Lock plan + trial_ends_at on public.users (paywall-bypass defence)
-- =============================================================================
--
-- AUDIT FINDING (pen-test 2026-05-12, docs/security-audit-2026-05-12.md):
--
-- The `users_update` RLS policy WITH CHECK was:
--
--   is_admin() OR check_user_update_allowed(uid, role, class_code)
--
-- — which pinned only `role` and `class_code`.  Every other column on
-- public.users was self-editable, including `plan` and `trial_ends_at`.
-- server.ts:1553 (`requireProTeacher`) reads exactly those two columns
-- to gate every Pro-only endpoint (AI sentence generation, OCR, Vocab-
-- agrut paper generation), so a Free-tier teacher could open DevTools
-- and run:
--
--   await supabase.from('users')
--     .update({ plan: 'pro', trial_ends_at: '2099-01-01' })
--     .eq('uid', myUid)
--
-- … and then call every Pro endpoint at our expense (Gemini quota,
-- Anthropic quota, unlimited classes / students).
--
-- The matching INSERT vector was also open: `users_insert` only checked
-- `role IN ('teacher','student')`, so a new sign-up could stamp itself
-- as `plan='pro'` on the very first INSERT.
--
-- FIX:
--
-- 1. Extend `check_user_update_allowed` so it also pins `plan` and
--    `trial_ends_at`.  Re-wire `users_update` to call the new signature.
--
-- 2. Tighten `users_insert` so a sign-up may only stamp `plan='free'`
--    and a `trial_ends_at` within 31 days (30-day trial + 1 day slack).
--    Anything longer must be granted by `service_role` — Stripe webhook,
--    admin console, server-side trial-extension scripts.
--
-- All legitimate Pro/trial writes already run through `service_role`,
-- which bypasses RLS entirely, so no caller needs to be migrated.
-- =============================================================================

BEGIN;

-- ─── 1. Replace the helper with a 5-arg version ─────────────────────
-- Drop the dependent policy first so the function drop doesn't fail on
-- pg_depend.  We recreate the policy inside the same transaction so
-- the table never sits without an UPDATE policy in production.

DROP POLICY IF EXISTS users_update ON public.users;

DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text);

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid               text,
  p_new_role          text,
  p_new_class_code    text,
  p_new_plan          text,
  p_new_trial_ends_at timestamptz
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- TRUE iff every locked column in the proposed row matches the
  -- existing row for this uid.  A FALSE return causes the RLS
  -- WITH CHECK to reject the update — which is what we want for
  -- self-promotion attempts.
  --
  -- COALESCE on plan defaults to 'free' so a NULL→'free' transition
  -- (or vice versa) is treated as no change.  Same idea on
  -- trial_ends_at with a fixed epoch sentinel.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = p_uid
      AND role = p_new_role
      AND (class_code IS NULL OR class_code = p_new_class_code)
      AND COALESCE(plan, 'free') = COALESCE(p_new_plan, 'free')
      AND COALESCE(trial_ends_at, '1970-01-01'::timestamptz)
        = COALESCE(p_new_trial_ends_at, '1970-01-01'::timestamptz)
  );
$$;

COMMENT ON FUNCTION public.check_user_update_allowed IS
  'Returns TRUE only if role, class_code, plan, AND trial_ends_at on '
  'the proposed row match the existing values for this uid — i.e. the '
  'caller is not trying to self-promote.  Used by the users_update RLS '
  'policy WITH CHECK.  Stripe webhook + admin updates use service_role '
  'which bypasses RLS, so they are unaffected.';

-- ─── 2. Recreate users_update with the 5-arg helper ─────────────────

CREATE POLICY users_update ON public.users
  AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()))::text = uid) OR is_admin())
  WITH CHECK (
    is_admin()
    OR check_user_update_allowed(
      ((SELECT auth.uid()))::text,
      role,
      class_code,
      plan,
      trial_ends_at
    )
  );

COMMENT ON POLICY users_update ON public.users IS
  'Owner may edit own row; admins may edit any.  Caller cannot self-'
  'change role, class_code, plan, or trial_ends_at — those columns '
  'are pinned by check_user_update_allowed.  Legitimate paywall '
  'changes go through service_role (Stripe webhook + admin scripts), '
  'which bypasses RLS.';

-- ─── 3. Tighten users_insert ────────────────────────────────────────
-- A new sign-up can only stamp Free + a trial window within the
-- legitimate 30-day grant (31 days slack for clock skew).  Longer
-- trials and any paid plan must be set by service_role.

DROP POLICY IF EXISTS users_insert ON public.users;

CREATE POLICY users_insert ON public.users
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (((SELECT auth.uid()))::text = uid)
    AND (role = ANY (ARRAY['teacher'::text, 'student'::text]))
    AND COALESCE(plan, 'free') = 'free'
    AND (
      trial_ends_at IS NULL
      OR trial_ends_at <= now() + interval '31 days'
    )
  );

COMMENT ON POLICY users_insert ON public.users IS
  'Sign-up may only create a Free-tier row with a trial ending within '
  '31 days of now.  Longer trials and any paid plan must be set by '
  'service_role (Stripe webhook + admin scripts).';

COMMIT;

-- =============================================================================
-- Verification queries (run manually after applying this migration):
--
-- 1. Function signature is the new 5-arg form:
--    SELECT pg_get_function_identity_arguments(oid)
--    FROM pg_proc
--    WHERE proname='check_user_update_allowed'
--      AND pronamespace='public'::regnamespace;
--    -- Expect: p_uid text, p_new_role text, p_new_class_code text,
--    --         p_new_plan text, p_new_trial_ends_at timestamptz
--
-- 2. users_update policy references the new helper:
--    SELECT with_check FROM pg_policies
--    WHERE tablename='users' AND policyname='users_update';
--    -- Expect: ... check_user_update_allowed(..., plan, trial_ends_at) ...
--
-- 3. Self-promotion attempt fails (run as an authenticated student session):
--    UPDATE public.users SET plan='pro' WHERE uid=auth.uid()::text;
--    -- Expect: 0 rows updated (RLS WITH CHECK rejects)
-- =============================================================================
