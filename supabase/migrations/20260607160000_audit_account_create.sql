-- =============================================================================
-- 20260607160000_audit_account_create.sql
--
-- Extends the admin-action audit trail (20260523000000_audit_admin_actions.sql)
-- to cover brand-new privileged account creation.
--
-- WHY: audit_users_role_change() only fires AFTER UPDATE, so it captures a
-- *promotion* (student -> teacher) but NOT a fresh self-serve teacher sign-up,
-- which arrives as an INSERT into public.users with role='teacher'. With
-- open/freemium teacher sign-up, that INSERT is the most common way someone
-- gains teacher access, and until now it left no audit_log trail.
--
-- WHAT: an AFTER INSERT trigger that logs every new teacher/admin/manager
-- account, with a `self_serve` flag distinguishing a public sign-up (the user
-- created their own row) from an operator-provisioned account.
--
-- Students are intentionally excluded -- they sign up in bulk and would flood
-- the log without adding security signal.
--
-- Safe by construction: audit_log has no AFTER INSERT trigger of its own, so
-- writing to it from here cannot recurse; its immutability triggers only guard
-- UPDATE/DELETE, so the INSERT is allowed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_user_account_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  actor TEXT;
BEGIN
  IF NEW.role IN ('teacher', 'admin', 'manager') THEN
    actor := COALESCE(auth.uid()::text, 'system:direct-sql');
    INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
    VALUES (
      actor,
      'account_create',
      'users',
      NEW.uid,
      jsonb_build_object(
        'role', NEW.role,
        -- self_serve = the new user inserted their own row (public sign-up),
        -- as opposed to an admin/operator provisioning the account for them.
        'self_serve', (actor = NEW.uid),
        'plan', NEW.plan
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_account_create ON public.users;
CREATE TRIGGER trg_audit_user_account_create
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_account_create();

COMMENT ON FUNCTION public.audit_user_account_create() IS
  'Writes an audit_log row when a teacher/admin/manager account is created '
  '(AFTER INSERT on public.users). Complements audit_users_role_change() which '
  'only fires on UPDATE. metadata.self_serve=true marks a public self-signup.';

-- ---------------------------------------------------------------------------
-- Verification (paste into the SQL editor after applying):
--   SELECT tgname FROM pg_trigger
--   WHERE tgname = 'trg_audit_user_account_create' AND NOT tgisinternal;
--   -- expect: 1 row.
-- ---------------------------------------------------------------------------
