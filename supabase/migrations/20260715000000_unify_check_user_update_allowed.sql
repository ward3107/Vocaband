-- =============================================================================
-- 20260715000000_unify_check_user_update_allowed.sql
--
-- Reconcile two conflicting redefinitions of the users-row self-edit guard.
--
-- THE CONFLICT:
--   * 20260624000000_school_license_propagates_pro.sql redefined
--     check_user_update_allowed to a 6-arg form that pins SCHOOL_ID
--     (text,text,text,text,timestamptz,uuid) so a teacher can't self-assign
--     to a paid school.
--   * 20260711000000_admin_ai_kill_switch.sql redefined it to a DIFFERENT
--     6-arg form that pins AI_DISABLED
--     (text,text,text,text,timestamptz,boolean) and pointed users_update at
--     that form — silently DROPPING the school_id pin and leaving a stray,
--     unused uuid overload behind.
--
--   Net effect of applying both as-written: school_id is no longer enforced
--   (privilege escalation — `UPDATE users SET school_id=<paid school>` passes
--   the RLS WITH CHECK), and the bare `COMMENT ON FUNCTION
--   check_user_update_allowed` in 20260624 is ambiguous (ERROR 42725).
--
-- THE FIX (this migration):
--   Collapse to ONE 7-arg form that pins EVERY locked column at once — role,
--   class_code, plan, trial_ends_at, school_id AND ai_disabled — drop every
--   older overload, and point users_update at it. Wrapped in a transaction so
--   public.users is never left without an UPDATE policy. Idempotent.
-- =============================================================================

BEGIN;

-- Drop the dependent policy first so the function overloads can be removed.
DROP POLICY IF EXISTS users_update ON public.users;

-- Remove every prior overload so exactly one remains afterwards (each IF EXISTS
-- → absent overloads are a no-op). Covers 3-arg (20260406), 5-arg (plan/trial
-- lock), and the two conflicting 6-arg forms (school_id / ai_disabled).
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text);
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz, boolean);

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid               text,
  p_new_role          text,
  p_new_class_code    text,
  p_new_plan          text,
  p_new_trial_ends_at timestamptz,
  p_new_school_id     uuid,
  p_new_ai_disabled   boolean
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- TRUE iff every locked column on the proposed row matches the existing row
  -- for this uid. A FALSE return makes the RLS WITH CHECK reject the update,
  -- which is what we want for any self-promotion / self-unblock attempt.
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
      AND COALESCE(ai_disabled, false) = COALESCE(p_new_ai_disabled, false)
  );
$$;

COMMENT ON FUNCTION public.check_user_update_allowed(text, text, text, text, timestamptz, uuid, boolean) IS
  'TRUE only if role, class_code, plan, trial_ends_at, school_id AND ai_disabled '
  'on the proposed row match the existing values for this uid -- i.e. the caller '
  'is not self-promoting, self-assigning to a paid school, or self-unblocking AI. '
  'Used by the users_update RLS WITH CHECK. service_role / admin writes bypass '
  'RLS, so operator changes (Stripe webhook, admin RPCs) are unaffected.';

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
      school_id,
      ai_disabled
    )
  );

COMMENT ON POLICY users_update ON public.users IS
  'Owner may edit own row; admins may edit any. Caller cannot self-change role, '
  'class_code, plan, trial_ends_at, school_id, or ai_disabled -- all pinned by '
  'check_user_update_allowed. Legitimate paywall / school-assignment / '
  'kill-switch changes go through service_role, which bypasses RLS.';

COMMIT;
