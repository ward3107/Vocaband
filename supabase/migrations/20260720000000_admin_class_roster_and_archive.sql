-- =============================================================================
-- Admin class roster + archive/restore (Developer Dashboard → Classes)
-- =============================================================================
-- Two additions to the Classes tab:
--   1. admin_class_roster(class_id) — the full student list for one class, so an
--      admin can SEE every student in a classroom (not just the count).
--   2. archive / restore — a reversible alternative to hard-delete. Adds a
--      nullable classes.archived_at; admin_archive_class sets it, _restore
--      clears it, and admin_list_classes now reports it (active-first) so the
--      panel can filter Active / Archived. All data is preserved either way, so
--      restore is a one-flag flip with zero reconstruction.
--
-- NOTE: archived_at is additive + nullable — existing class reads (teacher
-- dashboard, student join) are unchanged, so this cannot regress the live app.
-- Hiding archived classes from their teacher is intentionally NOT done here;
-- that's a separate, carefully-tested change to the live read paths.
--
-- All functions SECURITY DEFINER + assert_admin(), audited, anon-revoked.
-- Additive + idempotent.
-- =============================================================================

BEGIN;

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 1. admin_class_roster — one class + its full student roster.
--    Students come from student_profiles (the coded-classroom roster of
--    record, same source as admin_school_detail). named_count surfaces any
--    name/OAuth joiners (users.class_code) so none are silently missed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_class_roster(p_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_code TEXT;
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT code INTO v_code FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT jsonb_build_object(
    'class', (SELECT jsonb_build_object(
        'id', c.id, 'name', c.name, 'code', c.code,
        'teacher_uid', c.teacher_uid,
        'teacher_name',  (SELECT u.display_name FROM public.users u WHERE u.uid = c.teacher_uid),
        'teacher_email', (SELECT u.email        FROM public.users u WHERE u.uid = c.teacher_uid),
        'pending_teacher_email', c.pending_teacher_email,
        'school_name', c.school_name,
        'archived_at', c.archived_at
      ) FROM public.classes c WHERE c.id = p_class_id),

    'students', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'display_name', sp.display_name,
        'pin',          sp.roster_pin,
        'grade',        sp.grade,
        'branch',       sp.branch,
        'status',       sp.status,
        'avatar',       sp.avatar
      ) ORDER BY sp.grade NULLS LAST, sp.branch NULLS LAST, sp.anon_seq NULLS LAST, sp.display_name), '[]'::jsonb)
      FROM public.student_profiles sp WHERE sp.class_code = v_code),

    'named_count', (SELECT count(*) FROM public.users u WHERE u.class_code = v_code AND u.role = 'student')
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. admin_archive_class / admin_restore_class — reversible soft state.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_archive_class(p_class_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, auth
AS $$
DECLARE v_name TEXT;
BEGIN
  PERFORM public.assert_admin();
  SELECT name INTO v_name FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'class % not found', p_class_id USING ERRCODE = '23503'; END IF;

  UPDATE public.classes SET archived_at = now() WHERE id = p_class_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_archive_class', 'classes', p_class_id::text,
          jsonb_build_object('name', v_name, 'reason', COALESCE(trim(p_reason), '')));

  RETURN jsonb_build_object('success', true, 'id', p_class_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_class(p_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, auth
AS $$
DECLARE v_name TEXT;
BEGIN
  PERFORM public.assert_admin();
  SELECT name INTO v_name FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'class % not found', p_class_id USING ERRCODE = '23503'; END IF;

  UPDATE public.classes SET archived_at = NULL WHERE id = p_class_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_restore_class', 'classes', p_class_id::text,
          jsonb_build_object('name', v_name));

  RETURN jsonb_build_object('success', true, 'id', p_class_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. admin_list_classes — same signature, now also reports archived_at and
--    sorts active classes first. (Re-create over the 20260717 definition.)
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
  v_like  TEXT := '%' || lower(COALESCE(nullif(trim(COALESCE(p_query, '')), ''), '')) || '%';
  v_limit INT  := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  result  JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(rec ORDER BY (rec->>'archived_at') IS NOT NULL, rec->>'name'), '[]'::jsonb) INTO result
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
      'archived_at',           c.archived_at,
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
              AND (lower(COALESCE(u.email, '')) LIKE v_like OR lower(COALESCE(u.display_name, '')) LIKE v_like)
          )
       OR lower(COALESCE(c.pending_teacher_email, '')) LIKE v_like
    LIMIT v_limit
  ) q;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() inside each is the real gate.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_class_roster(UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_archive_class(UUID, TEXT)     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_class(UUID)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_classes(TEXT, INT)       FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_class_roster(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_class(UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_class(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_classes(TEXT, INT)    TO authenticated;

COMMENT ON FUNCTION public.admin_class_roster IS
  'Admin-only: one class + its full student roster (student_profiles) + named-joiner count.';

COMMIT;
