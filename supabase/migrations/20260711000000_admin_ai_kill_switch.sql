-- =============================================================================
-- 20260711000000_admin_ai_kill_switch.sql
--
-- Per-teacher AI kill-switch so an admin can turn AI OFF for an individual
-- teacher — including a teacher who is mid-14-day-trial — without changing
-- their plan or ending their trial.
--
-- WHY a new column instead of reusing ai_allowlist:
--   ai_allowlist has *allow* semantics ("only these emails may use Vocabagrut")
--   and the main AI features (sentence generation, OCR, worksheets) are gated by
--   plan/trial (is_pro_or_trialing), so every trialing teacher is allowed by
--   default. To switch a SINGLE teacher off we need a *deny* override that wins
--   over plan/trial. `users.ai_disabled` is exactly that: false by default,
--   flipped true by an admin to revoke AI for that one teacher.
--
-- Enforcement lives in server.ts (requireProTeacher, /api/features, and the
-- Vocabagrut path) — this migration only stores the flag, exposes it to the
-- admin dashboard, sets the admin RPC, and pins it against self-edit so a
-- blocked teacher cannot clear their own flag from DevTools.
-- =============================================================================

BEGIN;

-- ─── 1. The flag ────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_disabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.ai_disabled IS
  'Admin per-teacher AI kill-switch. When true, all AI features are denied for '
  'this teacher regardless of plan/trial. Default false. Set only via '
  'admin_set_ai_disabled (service_role / SECURITY DEFINER); pinned against '
  'self-edit by check_user_update_allowed.';

-- ─── 2. Pin ai_disabled against self-promotion ──────────────────────
-- Extend check_user_update_allowed to a 6-arg form that also pins
-- ai_disabled, mirroring the plan/trial lock in
-- 20260602_lock_users_plan_columns.sql. Without this a blocked teacher
-- could run `UPDATE users SET ai_disabled=false WHERE uid=auth.uid()`
-- in DevTools and re-enable AI for themselves.
--
-- Drop the dependent policy first, then the 5-arg function, then recreate
-- both inside this transaction so the table never sits without an UPDATE
-- policy in production.

DROP POLICY IF EXISTS users_update ON public.users;

-- Drop every prior overload so only the 6-arg form remains afterwards.
-- Older overloads (3-arg from 20260406, 5-arg from the plan/trial lock) can
-- linger across environments; leaving any in place makes the bare
-- COMMENT ON FUNCTION below ambiguous (ERROR 42725 "function name is not
-- unique"). Each DROP is IF EXISTS, so absent overloads are a no-op.
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text);
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid               text,
  p_new_role          text,
  p_new_class_code    text,
  p_new_plan          text,
  p_new_trial_ends_at timestamptz,
  p_new_ai_disabled   boolean
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- TRUE iff every locked column in the proposed row matches the existing
  -- row for this uid. A FALSE return causes the RLS WITH CHECK to reject
  -- the update — which is what we want for self-promotion / self-unblock.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = p_uid
      AND role = p_new_role
      AND (class_code IS NULL OR class_code = p_new_class_code)
      AND COALESCE(plan, 'free') = COALESCE(p_new_plan, 'free')
      AND COALESCE(trial_ends_at, '1970-01-01'::timestamptz)
        = COALESCE(p_new_trial_ends_at, '1970-01-01'::timestamptz)
      AND COALESCE(ai_disabled, false) = COALESCE(p_new_ai_disabled, false)
  );
$$;

COMMENT ON FUNCTION public.check_user_update_allowed(text, text, text, text, timestamptz, boolean) IS
  'Returns TRUE only if role, class_code, plan, trial_ends_at, AND ai_disabled '
  'on the proposed row match the existing values for this uid — i.e. the caller '
  'is not trying to self-promote or self-unblock. Used by the users_update RLS '
  'policy WITH CHECK. Admin/service_role updates bypass RLS, so they are '
  'unaffected.';

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
      ai_disabled
    )
  );

COMMENT ON POLICY users_update ON public.users IS
  'Owner may edit own row; admins may edit any. Caller cannot self-change '
  'role, class_code, plan, trial_ends_at, or ai_disabled — those columns are '
  'pinned by check_user_update_allowed. Legitimate paywall / kill-switch '
  'changes go through service_role (Stripe webhook + admin RPCs), which '
  'bypasses RLS.';

-- ─── 3. Surface ai_disabled in the entitlements list ────────────────
-- Mirrors the function in 20260624000000 with one added field so the
-- Developer Dashboard's entitlements panel can render the toggle state.
CREATE OR REPLACE FUNCTION public.admin_list_entitlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH emails AS (
    SELECT lower(email) AS email FROM public.teacher_allowlist WHERE email IS NOT NULL
    UNION
    SELECT lower(email) FROM public.users
    WHERE role IN ('teacher', 'manager', 'admin') AND email IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'email', e.email,
      'uid', u.uid,
      'role', u.role,
      'plan', u.plan,
      'trial_ends_at', u.trial_ends_at,
      'school_id', u.school_id,
      'school_name', s.name,
      'ai_enabled', (ai.email IS NOT NULL),
      'ai_disabled', COALESCE(u.ai_disabled, false),
      'allowlisted', (ta.email IS NOT NULL),
      'signed_up', (u.uid IS NOT NULL)
    ) ORDER BY e.email
  ), '[]'::jsonb)
  INTO result
  FROM emails e
  LEFT JOIN public.users u ON lower(u.email) = e.email
  LEFT JOIN public.teacher_allowlist ta ON lower(ta.email) = e.email
  LEFT JOIN public.ai_allowlist ai ON lower(ai.email) = e.email
  LEFT JOIN public.schools s ON s.id = u.school_id;

  RETURN result;
END;
$$;

-- ─── 4. The kill-switch RPC ─────────────────────────────────────────
-- Flips users.ai_disabled for one teacher (by uid, like admin_set_plan).
-- Audited under its own action so the change shows up in the audit log.
CREATE OR REPLACE FUNCTION public.admin_set_ai_disabled(
  p_uid      TEXT,
  p_disabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_old BOOLEAN;
BEGIN
  PERFORM public.assert_admin();

  SELECT ai_disabled INTO v_old FROM public.users WHERE uid = p_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', p_uid USING ERRCODE = '23503';
  END IF;

  UPDATE public.users
  SET ai_disabled = COALESCE(p_disabled, false)
  WHERE uid = p_uid;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    auth.uid()::text,
    'ai_disabled_change',
    'users',
    p_uid,
    jsonb_build_object('old', COALESCE(v_old, false), 'new', COALESCE(p_disabled, false))
  );

  RETURN jsonb_build_object('success', true, 'uid', p_uid, 'ai_disabled', COALESCE(p_disabled, false));
END;
$$;

-- ─── 5. Grants ──────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.admin_set_ai_disabled(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_disabled(TEXT, BOOLEAN) TO authenticated;

COMMIT;

-- =============================================================================
-- Verification (run manually after applying):
--
-- 1. Column exists, defaults false:
--    SELECT column_default, is_nullable FROM information_schema.columns
--    WHERE table_name='users' AND column_name='ai_disabled';
--
-- 2. Self-unblock attempt fails (run as the blocked teacher's session):
--    UPDATE public.users SET ai_disabled=false WHERE uid=auth.uid()::text;
--    -- Expect: 0 rows updated (RLS WITH CHECK rejects)
--
-- 3. Admin toggle works:
--    SELECT public.admin_set_ai_disabled('<teacher-uid>', true);
--    -- Expect: {"success": true, ...} and an ai_disabled_change audit row.
-- =============================================================================
