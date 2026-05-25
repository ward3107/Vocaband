-- =============================================================================
-- School license propagates Pro to a school's teachers ("whole school = Pro")
-- =============================================================================
-- The school/manager tenant layer (20260623000000_school_manager.sql) gave a
-- principal read-only oversight, but a `schools` row carried no billing state
-- and did NOT entitle its teachers to anything. This migration makes a *paid*
-- school lift every member to Pro -- one switch per school instead of stamping
-- users.plan on each teacher by hand.
--
-- Model (chosen 2026-05-25): whole-school = all Pro. A school whose plan is
-- 'school' (an active license) OR whose school-wide trial is unexpired makes
-- every user with that school_id behave as Pro everywhere caps are enforced:
--   * Supabase RLS Free-tier caps (1 class / 30 students) -> is_pro_or_trialing()
--   * Fly.io AI endpoint gates (sentence-gen, OCR)        -> server.ts
--       requireProTeacher + /api/features (updated in the same change)
-- Derivation, not denormalisation: the plan is never copied onto users.plan,
-- so it cannot drift (mirrors why 20260623000000 derives a class's school
-- through its teacher rather than denormalising school_id onto classes).
--
-- PAYWALL-BYPASS DEFENCE (critical): because school membership now confers Pro,
-- `users.school_id` becomes a billing-sensitive column. It was NOT pinned by
-- check_user_update_allowed (school_id was added in 20260623000000, AFTER
-- 20260602_lock_users_plan_columns). Without this migration a Free teacher
-- could PATCH their own row to a paid school's id and get Pro for free. We pin
-- school_id on self-update and forbid setting it on self-insert. All legitimate
-- school assignment goes through service_role (operator/admin), which bypasses
-- RLS.
--
-- Operator -- mark a school paid (lifts all its teachers to Pro):
--   UPDATE public.schools SET plan='school' WHERE id='<school-uuid>';
-- Give a school a trial instead:
--   UPDATE public.schools SET trial_ends_at = now() + interval '30 days'
--     WHERE id='<school-uuid>';
-- Stop a lapsed license (members fall back to their own plan):
--   UPDATE public.schools SET plan='free', trial_ends_at=NULL WHERE id='<school-uuid>';
-- =============================================================================

BEGIN;

-- ─── 1. Billing state on schools ────────────────────────────────────
-- 'free'   = no active license (default; members keep their own plan)
-- 'school' = active school license (every member user is Pro)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'school')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.schools.plan IS
  'free = no license (members keep their own plan); school = active license that makes every member user Pro via is_pro_or_trialing(). Operator/service-role only -- schools has no client write policy.';
COMMENT ON COLUMN public.schools.trial_ends_at IS
  'Optional school-wide Pro trial. While > now(), every member user is Pro even if the school plan is free. Operator/service-role only.';

-- ─── 2. is_pro_or_trialing(): inherit Pro from a paid school ─────────
-- Recreated verbatim from 20260514_dev_email_pro_bypass.sql plus one school
-- branch. CREATE OR REPLACE preserves the existing EXECUTE grants
-- (authenticated only; revoked from anon in 20260517115649). Keep the
-- dev-email allowlist in sync with src/core/dev-allowlist.ts.
CREATE OR REPLACE FUNCTION public.is_pro_or_trialing()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text
      AND (
        u.plan IN ('pro', 'school')
        OR (u.trial_ends_at IS NOT NULL AND u.trial_ends_at > now())
        OR u.role = 'admin'
        OR LOWER(u.email) IN ('wasya92@gmail.com')
        -- Whole-school license: a member of a paid (or school-trialing)
        -- school inherits Pro. A NULL school_id never matches a schools row.
        OR EXISTS (
          SELECT 1 FROM public.schools s
          WHERE s.id = u.school_id
            AND (
              s.plan = 'school'
              OR (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now())
            )
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_pro_or_trialing() IS
  'TRUE when the current auth.uid is Pro: own plan pro/school, inside their own trial, admin role, dev-allowlist email, OR a member of a school whose license is active (plan=school or unexpired school trial). Used by RLS Free-tier gates. Keep the email list in sync with src/core/dev-allowlist.ts.';

-- ─── 3. Pin school_id against self-service (paywall-bypass defence) ──
-- Extend check_user_update_allowed to a 6-arg form that also pins school_id,
-- and re-wire users_update. Drop the dependent policy first so the function
-- drop does not fail on pg_depend; recreate inside the same transaction so the
-- table is never without an UPDATE policy.
DROP POLICY IF EXISTS users_update ON public.users;

DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid               text,
  p_new_role          text,
  p_new_class_code    text,
  p_new_plan          text,
  p_new_trial_ends_at timestamptz,
  p_new_school_id     uuid
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- TRUE iff every locked column in the proposed row matches the existing row
  -- for this uid. A FALSE return makes the RLS WITH CHECK reject the update.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = p_uid
      AND role = p_new_role
      AND (class_code IS NULL OR class_code = p_new_class_code)
      AND COALESCE(plan, 'free') = COALESCE(p_new_plan, 'free')
      AND COALESCE(trial_ends_at, '1970-01-01'::timestamptz)
        = COALESCE(p_new_trial_ends_at, '1970-01-01'::timestamptz)
      AND COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(p_new_school_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

COMMENT ON FUNCTION public.check_user_update_allowed IS
  'TRUE only if role, class_code, plan, trial_ends_at AND school_id on the proposed row match the existing values for this uid -- i.e. the caller is not self-promoting or self-assigning to a (paid) school. Used by the users_update RLS WITH CHECK. service_role bypasses RLS, so operator/admin writes are unaffected.';

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
      trial_ends_at,
      school_id
    )
  );

COMMENT ON POLICY users_update ON public.users IS
  'Owner may edit own row; admins may edit any. Caller cannot self-change role, class_code, plan, trial_ends_at, or school_id -- all pinned by check_user_update_allowed. School assignment + paywall changes are set on service_role only (the operator does it manually -- there is no automatic payment integration), which bypasses RLS.';

-- ─── 4. Forbid self-assigning a school on INSERT ────────────────────
-- A fresh sign-up must not stamp itself into a school (which would inherit that
-- school's Pro). Operator/service-role sets school_id after the row exists.
-- Mirrors the plan/trial pinning added in 20260602_lock_users_plan_columns.sql.
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
    AND school_id IS NULL
  );

COMMENT ON POLICY users_insert ON public.users IS
  'Sign-up may only create a Free-tier row, a trial ending within 31 days, and NO school_id. Longer trials, paid plans, and school assignment must be set by service_role (the operator, manually).';

COMMIT;

-- =============================================================================
-- Verification (run manually after applying):
--
-- 1. A paid school lifts a member teacher to Pro (run in that teacher's session):
--      -- operator: UPDATE public.schools SET plan='school' WHERE id='<sid>';
--      -- operator: UPDATE public.users   SET school_id='<sid>' WHERE uid='<teacher-uid>';
--      SELECT public.is_pro_or_trialing();           -- expect: t
--      -- then operator: UPDATE public.schools SET plan='free' WHERE id='<sid>';
--      SELECT public.is_pro_or_trialing();           -- expect: f (if no own plan/trial)
--
-- 2. school_id is pinned (run as an authenticated teacher whose school_id IS NULL):
--      UPDATE public.users SET school_id='<any-school-uuid>' WHERE uid=auth.uid()::text;
--      -- expect: 0 rows / RLS WITH CHECK rejection (paywall-bypass blocked)
--
-- 3. Function signature is the new 6-arg form:
--      SELECT pg_get_function_identity_arguments(oid) FROM pg_proc
--      WHERE proname='check_user_update_allowed' AND pronamespace='public'::regnamespace;
--      -- expect: ... p_new_school_id uuid
-- =============================================================================
