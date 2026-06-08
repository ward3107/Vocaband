-- =============================================================================
-- Admin class management (Developer Dashboard → "Classes" tab)
-- =============================================================================
-- The admin dashboard could inspect a teacher's classes (User Lookup) and a
-- school's rosters (admin_school_detail) but had NO way to act on a class:
-- no delete, no transfer to another teacher, no code reset, no rename. A
-- duplicate/abandoned/test class — or one whose code leaked — could only be
-- cleaned up by deleting its whole owner, which is far too blunt.
--
-- This migration adds five admin_* RPCs, all following the house pattern:
--   * SECURITY DEFINER + assert_admin()  — re-checks is_admin() server-side,
--   * pinned search_path (extensions.* schema-qualified),
--   * audit_log row written BEFORE any destructive change,
--   * GRANTed to `authenticated` only (anon revoked at the bottom).
--
--   1. admin_list_classes    — search/list classes with teacher + counts (read)
--   2. admin_rename_class     — rename a class (edit)
--   3. admin_transfer_class   — reassign a class to another teacher (move)
--   4. admin_reset_class_code — regenerate the 6-char join code, carrying the
--                               existing roster across every code-keyed table
--   5. admin_delete_class     — hard-delete a class + its roster, audited with
--                               a snapshot, mirroring admin_delete_user_account
--
-- Additive + idempotent (CREATE OR REPLACE). Edits no existing migration and
-- no schema.sql. classes -> assignments -> progress already CASCADE on delete
-- (see schema.sql), so admin_delete_class only has to clean the rows that are
-- denormalised by class CODE (student_profiles, users, progress) by hand.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. admin_list_classes — one round-trip list for the Classes panel.
--    p_query (optional) matches class name, exact 6-char code, or the owning
--    teacher's name/email. Student counts come from student_profiles keyed by
--    class code, exactly like admin_school_detail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_classes(
  p_query TEXT DEFAULT NULL,
  p_limit INT  DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_q     TEXT := nullif(trim(COALESCE(p_query, '')), '');
  v_like  TEXT;
  v_limit INT  := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  result  JSONB;
BEGIN
  PERFORM public.assert_admin();

  v_like := '%' || lower(COALESCE(v_q, '')) || '%';

  SELECT COALESCE(jsonb_agg(rec ORDER BY rec->>'name'), '[]'::jsonb) INTO result
  FROM (
    SELECT jsonb_build_object(
      'id',                    c.id,
      'name',                  c.name,
      'code',                  c.code,
      'teacher_uid',           c.teacher_uid,
      'teacher_name',          (SELECT u.display_name FROM public.users u WHERE u.uid = c.teacher_uid),
      'teacher_email',         (SELECT u.email        FROM public.users u WHERE u.uid = c.teacher_uid),
      'pending_teacher_email', c.pending_teacher_email,
      'school_name',           c.school_name,
      'student_count',         (SELECT count(*) FROM public.student_profiles sp WHERE sp.class_code = c.code),
      'assignment_count',      (SELECT count(*) FROM public.assignments a WHERE a.class_id = c.id)
    ) AS rec
    FROM public.classes c
    WHERE v_q IS NULL
       OR lower(c.name) LIKE v_like
       OR lower(c.code) = lower(v_q)
       OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.uid = c.teacher_uid
              AND (lower(COALESCE(u.email, '')) LIKE v_like
                OR lower(COALESCE(u.display_name, '')) LIKE v_like)
          )
       OR lower(COALESCE(c.pending_teacher_email, '')) LIKE v_like
    LIMIT v_limit
  ) q;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. admin_rename_class — change classes.name (mirrors the CHECK on the column).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_rename_class(
  p_class_id UUID,
  p_name     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_old  TEXT;
  v_name TEXT := trim(COALESCE(p_name, ''));
BEGIN
  PERFORM public.assert_admin();

  IF char_length(v_name) = 0 OR char_length(v_name) >= 100 THEN
    RAISE EXCEPTION 'class name must be 1–99 characters' USING ERRCODE = '22023';
  END IF;

  SELECT name INTO v_old FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'class % not found', p_class_id USING ERRCODE = '23503';
  END IF;

  UPDATE public.classes SET name = v_name WHERE id = p_class_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_rename_class', 'classes', p_class_id::text,
          jsonb_build_object('old', v_old, 'new', v_name));

  RETURN jsonb_build_object('success', true, 'id', p_class_id, 'name', v_name);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. admin_transfer_class — reassign ownership to another teacher.
--    Target must be a signed-up teacher (promote a student first). Clears any
--    pending_teacher_email so a seeded class can't be re-claimed out from under
--    the new owner. Assignments (class_id) and progress (class_code) ride along
--    untouched — only the owner changes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_transfer_class(
  p_class_id       UUID,
  p_new_teacher_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_old_uid TEXT;
  v_role    TEXT;
  v_email   TEXT;
BEGIN
  PERFORM public.assert_admin();

  SELECT teacher_uid INTO v_old_uid FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'class % not found', p_class_id USING ERRCODE = '23503';
  END IF;

  SELECT role, email INTO v_role, v_email FROM public.users WHERE uid = p_new_teacher_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'target user % not found', p_new_teacher_uid USING ERRCODE = '23503';
  END IF;
  IF v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'target % is a % — promote to teacher first', COALESCE(v_email, p_new_teacher_uid), v_role
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.classes
  SET teacher_uid = p_new_teacher_uid, pending_teacher_email = NULL
  WHERE id = p_class_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_transfer_class', 'classes', p_class_id::text,
          jsonb_build_object('from_uid', v_old_uid, 'to_uid', p_new_teacher_uid, 'to_email', v_email));

  RETURN jsonb_build_object('success', true, 'id', p_class_id, 'teacher_uid', p_new_teacher_uid);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. admin_reset_class_code — regenerate the join code (e.g. a leaked code).
--    The code is denormalised onto student_profiles / progress / users, so a
--    naive UPDATE on classes alone would orphan the whole roster. We carry the
--    code across all four tables inside the one RPC transaction so students,
--    gradebook and profiles stay attached under the new code.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reset_class_code(p_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  -- Same unambiguous alphabet as generate_session_code (no 0/O/1/I).
  v_chars    TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_old_code TEXT;
  v_new_code TEXT;
  v_bytes    BYTEA;
  v_tries    INT := 0;
  v_moved    INT := 0;
BEGIN
  PERFORM public.assert_admin();

  SELECT code INTO v_old_code FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'class % not found', p_class_id USING ERRCODE = '23503';
  END IF;

  LOOP
    v_bytes := extensions.gen_random_bytes(6);
    v_new_code := '';
    FOR i IN 0..5 LOOP
      v_new_code := v_new_code || substr(v_chars, (get_byte(v_bytes, i) % length(v_chars)) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE code = v_new_code);
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN
      RAISE EXCEPTION 'could not generate a unique class code' USING ERRCODE = '40001';
    END IF;
  END LOOP;

  UPDATE public.classes         SET code       = v_new_code WHERE id        = p_class_id;
  UPDATE public.student_profiles SET class_code = v_new_code WHERE class_code = v_old_code;
  GET DIAGNOSTICS v_moved = ROW_COUNT;
  UPDATE public.progress        SET class_code = v_new_code WHERE class_code = v_old_code;
  UPDATE public.users           SET class_code = v_new_code WHERE class_code = v_old_code;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_reset_class_code', 'classes', p_class_id::text,
          jsonb_build_object('old_code', v_old_code, 'new_code', v_new_code, 'students_moved', v_moved));

  RETURN jsonb_build_object('success', true, 'id', p_class_id, 'code', v_new_code, 'students_moved', v_moved);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. admin_delete_class — hard-delete a class and its roster.
--    classes -> assignments -> progress CASCADE on the FK, so the class DELETE
--    clears assignments + their gradebook rows. student_profiles and the
--    students' own users.class_code are keyed by CODE (no FK), so we clear
--    those by hand first. Audit row (with a snapshot) is written BEFORE the
--    deletes, exactly like admin_delete_user_account.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_class(
  p_class_id UUID,
  p_reason   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_name        TEXT;
  v_code        TEXT;
  v_teacher     TEXT;
  v_students    INT := 0;
  v_assignments INT := 0;
  v_detached    INT := 0;
BEGIN
  PERFORM public.assert_admin();

  SELECT name, code, teacher_uid INTO v_name, v_code, v_teacher
  FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'class % not found', p_class_id USING ERRCODE = '23503';
  END IF;

  SELECT count(*) INTO v_students    FROM public.student_profiles WHERE class_code = v_code;
  SELECT count(*) INTO v_assignments FROM public.assignments      WHERE class_id   = p_class_id;

  -- Audit FIRST (snapshot) — a rolled-back txn still records the attempt.
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_delete_class', 'classes', p_class_id::text,
          jsonb_build_object(
            'name',        v_name,
            'code',        v_code,
            'teacher_uid', v_teacher,
            'students',    v_students,
            'assignments', v_assignments,
            'reason',      COALESCE(trim(p_reason), '')
          ));

  -- Roster cleanup (denormalised by code, no cascade).
  DELETE FROM public.student_profiles WHERE class_code = v_code;
  UPDATE public.users SET class_code = NULL WHERE class_code = v_code;
  GET DIAGNOSTICS v_detached = ROW_COUNT;

  -- Cascades to assignments -> progress via the schema FKs.
  DELETE FROM public.classes WHERE id = p_class_id;

  RETURN jsonb_build_object(
    'success',            true,
    'id',                 p_class_id,
    'name',               v_name,
    'deleted_students',   v_students,
    'deleted_assignments', v_assignments,
    'detached_users',     v_detached
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() inside each does the real gating.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_classes(TEXT, INT)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_rename_class(UUID, TEXT)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_transfer_class(UUID, TEXT)     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_class_code(UUID)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_class(UUID, TEXT)       FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_classes(TEXT, INT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rename_class(UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_class(UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_class_code(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_class(UUID, TEXT)    TO authenticated;

COMMENT ON FUNCTION public.admin_delete_class IS
  'Admin-only: hard-delete a class + roster (cascades assignments/progress; '
  'clears student_profiles + users.class_code by code). Audited with a snapshot.';

COMMIT;
