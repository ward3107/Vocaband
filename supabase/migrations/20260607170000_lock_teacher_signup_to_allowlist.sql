-- =============================================================================
-- 20260607170000_lock_teacher_signup_to_allowlist.sql
--
-- Invite-only teacher sign-up (hard server-side backstop).
--
-- Until now the users_insert RLS policy let ANY authenticated user create their
-- own row with role='teacher' (open freemium sign-up). This re-creates that
-- policy to additionally require that teacher self-inserts come from an email on
-- public.teacher_allowlist. Students are unaffected and can still self-register.
--
-- The client (src/hooks/useAuthRestore.ts) is updated in lockstep to route
-- non-allowlisted OAuth sign-ins away from teacher creation, but this policy is
-- the authoritative enforcement: even a bypassed/forged client cannot insert a
-- teacher row for a non-allowlisted email.
--
-- Reversible: to reopen sign-up, re-create users_insert without the final
-- (role='student' OR is_teacher_allowed(...)) clause.
--
-- DROP + CREATE run in the migration's single transaction, so there is no
-- window in which public.users has no INSERT policy.
-- =============================================================================

DROP POLICY IF EXISTS users_insert ON public.users;

CREATE POLICY users_insert ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    (((SELECT auth.uid())::text = uid)
     AND (role = ANY (ARRAY['teacher'::text, 'student'::text]))
     AND (COALESCE(plan, 'free'::text) = 'free'::text)
     AND ((trial_ends_at IS NULL) OR (trial_ends_at <= (now() + '31 days'::interval)))
     AND (school_id IS NULL)
     -- NEW: students self-register freely; teachers must be pre-approved.
     AND (
       (role = 'student'::text)
       OR (SELECT public.is_teacher_allowed(public.get_my_email()))
     ))
  );

COMMENT ON POLICY users_insert ON public.users IS
  'Self-insert: students freely; teachers only when their email is on '
  'public.teacher_allowlist (is_teacher_allowed). Invite-only since 2026-06-07.';

-- ---------------------------------------------------------------------------
-- Verification (paste into the SQL editor after applying):
--   -- A non-allowlisted teacher insert should be rejected by RLS.
--   -- Confirm the policy carries the new clause:
--   SELECT with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename='users' AND policyname='users_insert';
--   -- expect: ...OR ( SELECT is_teacher_allowed(get_my_email()))...
-- ---------------------------------------------------------------------------
