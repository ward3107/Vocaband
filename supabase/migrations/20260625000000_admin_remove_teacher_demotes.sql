-- =============================================================================
-- 20260625000000_admin_remove_teacher_demotes.sql
--
-- "Remove teacher" in the admin Developer Dashboard previously only ran
-- DELETE FROM teacher_allowlist.  That did nothing for the now-common freemium
-- teachers (self-signed-up, never allowlisted) and, even for allowlisted ones,
-- left their role='teacher' + classes intact — so the teacher was never really
-- removed.
--
-- Redefine admin_remove_teacher so it actually removes the teacher: drop any
-- allowlist entry AND demote a signed-up teacher to 'student', which revokes
-- teacher access (hasTeacherAccess) and drops them off the teacher roster /
-- manager console while preserving their underlying data (reversible: re-add to
-- the allowlist and have them sign in again).  Admin targets are refused;
-- managers are left untouched.  The role + allowlist mutations stay audit-logged
-- by the triggers in 20260523000000_audit_admin_actions.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_remove_teacher(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email   TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid     TEXT;
  v_role    TEXT;
  v_demoted BOOLEAN := false;
BEGIN
  PERFORM public.assert_admin();

  SELECT uid, role INTO v_uid, v_role
  FROM public.users
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot remove an admin account' USING ERRCODE = '42501';
  END IF;

  -- Always drop any allowlist entry (also covers a not-yet-signed-up invite).
  DELETE FROM public.teacher_allowlist WHERE lower(email) = v_email;

  -- Revoke teacher access for a signed-up teacher.  role='student' keeps the
  -- row + their data but removes them from hasTeacherAccess and the entitlements
  -- list (which keys off role IN ('teacher','manager','admin')).
  IF v_uid IS NOT NULL AND v_role = 'teacher' THEN
    UPDATE public.users SET role = 'student' WHERE uid = v_uid;
    v_demoted := true;
  END IF;

  RETURN jsonb_build_object('success', true, 'email', v_email, 'demoted', v_demoted);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_teacher(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_teacher(TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_remove_teacher IS
  'Admin-only: remove a teacher — delete any teacher_allowlist entry and demote a signed-up teacher to student (revokes teacher access; data preserved). Refuses admin targets; leaves managers untouched.';
