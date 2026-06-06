-- =============================================================================
-- Admin cleanup: delete a school + remove a manager (Developer Dashboard)
-- =============================================================================
-- Two operator cleanup actions that were missing from the admin Schools panel
-- (you could create a school and assign a manager, but never undo either):
--
--   * admin_remove_manager — un-assign a principal/manager: role back to
--       'teacher', school_id cleared. Exact inverse of admin_assign_manager.
--
--   * admin_delete_school  — SAFE hard-delete. Only deletes when the school has
--       no attached staff/students (users.school_id) AND no classes naming it
--       (classes.school_name). Otherwise it refuses with the counts so the
--       operator clears the school first — never silently orphans real data.
--
-- Both are SECURITY DEFINER + assert_admin(), matching every other admin_* RPC.
-- Additive and idempotent (CREATE OR REPLACE).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- admin_remove_manager — inverse of admin_assign_manager
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_manager(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid   TEXT;
  v_role  TEXT;
BEGIN
  PERFORM public.assert_admin();

  SELECT uid, role INTO v_uid, v_role
  FROM public.users WHERE lower(email) = v_email LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no user with email %', v_email USING ERRCODE = '23503';
  END IF;
  IF v_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'user % is not a manager', v_email USING ERRCODE = '22023';
  END IF;

  -- Demote to teacher + detach from the school. The role change fires the
  -- audit trigger from 20260523000000, same as admin_assign_manager.
  UPDATE public.users SET role = 'teacher', school_id = NULL WHERE uid = v_uid;

  RETURN jsonb_build_object('success', true, 'uid', v_uid);
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_delete_school — safe hard-delete (refuses when non-empty)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_school(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_name    TEXT;
  v_members INT;
  v_classes INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT name INTO v_name FROM public.schools WHERE id = p_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;

  SELECT count(*) INTO v_members FROM public.users   WHERE school_id = p_school_id;
  SELECT count(*) INTO v_classes FROM public.classes WHERE school_name = v_name;
  IF v_members > 0 OR v_classes > 0 THEN
    RAISE EXCEPTION
      'school "%" still has % member(s) and % class(es) — remove those first',
      v_name, v_members, v_classes USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.schools WHERE id = p_school_id;
  RETURN jsonb_build_object('success', true, 'id', p_school_id, 'name', v_name);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() does the real gating.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_remove_manager(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_school(UUID)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_manager(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_school(UUID)  TO authenticated;

COMMIT;
