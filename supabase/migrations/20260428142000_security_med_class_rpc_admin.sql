-- =============================================================================
-- SECURITY MED FIX: explicit admin role in class-data RPCs
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.3-3):
--
-- `get_class_activity` (20260510_get_class_activity_rpc.sql) and
-- `get_class_mastery` (20260509_get_class_mastery_rpc.sql) verify
-- class-ownership (`teacher_uid = auth.uid()::text`) but don't have
-- an explicit role check.
--
-- In practice this is fine because non-teachers can never own a
-- class (the classes-INSERT policy gates that).  But the implicit
-- assumption is brittle: if a future migration ever lets a non-
-- teacher own a class, these RPCs silently expand access.
--
-- ALSO: admins currently can't query class data even though they
-- should be able to for support purposes.  Right now the only path
-- is "log in as the teacher" which is impractical.
--
-- FIX:
--
-- Add `OR public.is_admin()` to the ownership check in both RPCs
-- so admins can query any class for support, and the implicit
-- teacher-only access becomes explicit.  Teacher behaviour
-- unchanged byte-for-byte.
--
-- Backward compat: existing teacher callers pass the same check
-- they did before (teacher_uid = caller).  Admins are a new add.
-- No client-side changes needed.
-- =============================================================================

BEGIN;

-- ─── get_class_activity ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_class_activity(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_class_activity(
  p_class_code TEXT,
  p_days       INTEGER DEFAULT 30
)
RETURNS TABLE (
  student_uid  TEXT,
  student_name TEXT,
  avatar       TEXT,
  day          DATE,
  xp_sum       INTEGER,
  plays_count  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid  TEXT := auth.uid()::text;
  v_owns_class  BOOLEAN;
  v_window_days INTEGER := GREATEST(1, LEAST(90, COALESCE(p_days, 30)));
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Tightened in 20260428142000: caller must own the class OR be an
  -- admin.  Previously the OR-admin branch was missing — admins
  -- couldn't query class data even for support.
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_caller_uid
  ) OR public.is_admin() INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Access denied: not the teacher of this class'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.student_uid,
    MAX(p.student_name)::TEXT AS student_name,
    MAX(COALESCE(p.avatar, '🦊'))::TEXT AS avatar,
    p.completed_at::DATE AS day,
    SUM(p.score)::INTEGER AS xp_sum,
    COUNT(*)::INTEGER AS plays_count
  FROM public.progress p
  WHERE p.class_code = p_class_code
    AND p.completed_at >= (now() - (v_window_days || ' days')::INTERVAL)
  GROUP BY p.student_uid, p.completed_at::DATE
  ORDER BY day DESC, xp_sum DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_activity(TEXT, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_class_activity(TEXT, INTEGER) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.get_class_activity IS
  'Per-student per-day XP + plays for a class over the last N days '
  '(capped 1-90).  Caller must be the teacher of the class OR an '
  'admin.  Tightened in 20260428142000 to add the OR-admin branch '
  'so admins can support teachers without role-impersonation.';

-- ─── get_class_mastery ───────────────────────────────────────────────
--
-- Preserve the exact signature from 20260509_get_class_mastery_rpc.sql:
-- (student_uid, student_name, avatar, word_id, mode, correct_count,
--  total_count, last_attempt) — anything else is a breaking change for
-- the Gradebook drawer that consumes these columns.

DROP FUNCTION IF EXISTS public.get_class_mastery(TEXT);

CREATE OR REPLACE FUNCTION public.get_class_mastery(p_class_code TEXT)
RETURNS TABLE (
  student_uid   TEXT,
  student_name  TEXT,
  avatar        TEXT,
  word_id       INTEGER,
  mode          TEXT,
  correct_count INTEGER,
  total_count   INTEGER,
  last_attempt  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid  TEXT := auth.uid()::text;
  v_owns_class  BOOLEAN;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Tightened in 20260428142000: caller must own the class OR be an
  -- admin.  Same OR-admin branch as get_class_activity above.
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_caller_uid
  ) OR public.is_admin() INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Access denied: not the teacher of this class'
      USING ERRCODE = '42501';
  END IF;

  -- Body identical to 20260509 — preserves return columns + ordering.
  RETURN QUERY
  SELECT
    wa.student_uid,
    COALESCE(
      (SELECT p.student_name FROM public.progress p
        WHERE p.student_uid = wa.student_uid
        ORDER BY p.completed_at DESC LIMIT 1),
      LEFT(wa.student_uid, 8)
    )::TEXT AS student_name,
    COALESCE(
      (SELECT p.avatar FROM public.progress p
        WHERE p.student_uid = wa.student_uid
        ORDER BY p.completed_at DESC LIMIT 1),
      '🦊'
    )::TEXT AS avatar,
    wa.word_id,
    wa.mode,
    COUNT(*) FILTER (WHERE wa.is_correct)::INTEGER AS correct_count,
    COUNT(*)::INTEGER                              AS total_count,
    MAX(wa.created_at)                             AS last_attempt
  FROM public.word_attempts wa
  WHERE wa.class_code = p_class_code
  GROUP BY wa.student_uid, wa.word_id, wa.mode;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_mastery(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_class_mastery(TEXT) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.get_class_mastery IS
  'Per-(student, word, mode) mastery counts for a class.  Caller '
  'must own the class OR be an admin.  Tightened in 20260428142000 '
  'to add the OR-admin branch (was implicit teacher-only via '
  'class-ownership; now explicit).';

COMMIT;
