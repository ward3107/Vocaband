-- =============================================================================
-- 20260628000000_admin_set_role.sql
--
-- admin_set_role — flip public.users.role for any user. Backs the
-- "Promote to teacher" button on the developer-dashboard User Lookup panel.
--
-- Adding an email to teacher_allowlist alone does NOT promote an existing
-- user; it only gates future signups. To flip a current student to teacher
-- (or any other role transition) we need to UPDATE users.role directly.
--
-- The existing trigger from 20260523000000_audit_admin_actions.sql logs the
-- role change to audit_log automatically, so no explicit audit INSERT here.
--
-- Safeguards:
--   * Refuses self-role-change (admins changing their own role is a footgun
--     and usually a mistake — use the Supabase SQL editor if truly needed).
--   * Refuses to demote the last admin (would leave the org with no admin).
--   * On promotion to teacher/manager/admin, also adds the email to
--     teacher_allowlist so a future re-signup flow succeeds without
--     remembering to do it separately.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_set_role(p_uid TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller        TEXT := auth.uid()::text;
  v_old         TEXT;
  v_email       TEXT;
  v_admin_count INT;
BEGIN
  PERFORM public.assert_admin();

  IF p_role NOT IN ('teacher', 'student', 'admin', 'manager') THEN
    RAISE EXCEPTION 'role must be teacher, student, admin, or manager'
      USING ERRCODE = '22023';
  END IF;

  IF caller = p_uid THEN
    RAISE EXCEPTION 'Cannot change your own role via this RPC'
      USING ERRCODE = '42501';
  END IF;

  SELECT role, email INTO v_old, v_email FROM public.users WHERE uid = p_uid;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  IF v_old = p_role THEN
    RETURN jsonb_build_object('success', true, 'unchanged', true, 'role', p_role);
  END IF;

  IF v_old = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*) INTO v_admin_count FROM public.users WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.users SET role = p_role WHERE uid = p_uid;
  -- audit_users_role_change trigger from 20260523000000 logs the change.

  -- When promoting to a staff role, ensure the email is on the allowlist
  -- so a future re-signup doesn't bounce off the teacher gate.
  IF p_role IN ('teacher', 'manager', 'admin') AND v_email IS NOT NULL THEN
    INSERT INTO public.teacher_allowlist (email)
    VALUES (lower(v_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success',  true,
    'uid',      p_uid,
    'old_role', v_old,
    'new_role', p_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role(TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_set_role(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_set_role IS
  'Admin-only: flip public.users.role for any user. Refuses self-change and demoting the last admin. Auto-adds the email to teacher_allowlist when promoting to a staff role.';
