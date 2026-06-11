-- get_teacher_class_analytics — server-side aggregation for the teacher
-- Analytics view, so the browser no longer downloads every progress row and
-- re-crunches it on the main thread (which got slower with class size + time,
-- and silently under-counted once a class passed the client's row cap).
--
-- Returns ONE row per owned class with the GROUP-BY work already done:
--   * scalar totals (student_count, total_attempts, total_score)
--   * per-student buckets (uid, name, avatar, total, count)
--   * per-missed-word counts (word_id, count) from the `mistakes` int[]
--   * per-mode buckets (mode, count, total)
-- The client keeps doing the cheap final shaping it already does (struggling =
-- avg < 70, top-8 mistakes, best mode, avg = round(total/count)) over these
-- tiny pre-aggregated arrays, so the UI logic is unchanged — only the heavy
-- GROUP BY moves to Postgres. Identity is the student_uid (fallback to name
-- for legacy blank-uid rows) so two students sharing a display name stay
-- distinct — matching the client fix.
--
-- SECURITY DEFINER bypasses RLS, so authz is enforced here: the query is
-- restricted to classes the caller actually owns (unowned codes are silently
-- dropped). Same teacher-ownership pattern as get_class_mastery /
-- get_assignments_for_class. Read-only; reversible with DROP FUNCTION.

DROP FUNCTION IF EXISTS public.get_teacher_class_analytics(TEXT[], TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_teacher_class_analytics(
  p_class_codes TEXT[],
  p_since       TIMESTAMPTZ
)
RETURNS TABLE (
  class_code     TEXT,
  student_count  INTEGER,
  total_attempts INTEGER,
  total_score    NUMERIC,
  students       JSONB,
  mistakes       JSONB,
  modes          JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid TEXT := auth.uid()::text;
  v_owned      TEXT[];
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Restrict to the caller's own classes; unowned codes are silently dropped.
  SELECT array_agg(c.code) INTO v_owned
  FROM public.classes c
  WHERE c.teacher_uid = v_caller_uid AND c.code = ANY(p_class_codes);

  IF v_owned IS NULL THEN
    RETURN; -- caller owns none of the requested classes
  END IF;

  RETURN QUERY
  WITH r AS (
    SELECT p.class_code,
      COALESCE(NULLIF(p.student_uid, ''), p.student_name) AS ident,
      p.student_uid, p.student_name, p.avatar, p.score, p.mode, p.mistakes, p.completed_at
    FROM public.progress p
    WHERE p.class_code = ANY(v_owned) AND p.completed_at >= p_since
  ),
  per_student AS (
    SELECT r.class_code, r.ident,
      (array_agg(r.student_uid  ORDER BY r.completed_at DESC))[1] AS uid,
      (array_agg(r.student_name ORDER BY r.completed_at DESC))[1] AS name,
      (array_agg(COALESCE(r.avatar, '🦊') ORDER BY r.completed_at DESC))[1] AS avatar,
      SUM(r.score) AS total, COUNT(*) AS cnt
    FROM r GROUP BY r.class_code, r.ident
  ),
  per_word AS (
    SELECT r.class_code, m.word_id, COUNT(*) AS cnt
    FROM r, unnest(r.mistakes) AS m(word_id)
    GROUP BY r.class_code, m.word_id
  ),
  per_mode AS (
    SELECT r.class_code, r.mode, COUNT(*) AS cnt, SUM(r.score) AS total
    FROM r GROUP BY r.class_code, r.mode
  ),
  totals AS (
    SELECT r.class_code,
      COUNT(*) AS total_attempts,
      SUM(r.score) AS total_score,
      COUNT(DISTINCT r.ident) AS student_count
    FROM r GROUP BY r.class_code
  )
  SELECT
    t.class_code,
    t.student_count::INTEGER,
    t.total_attempts::INTEGER,
    t.total_score,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('uid', ps.uid, 'name', ps.name, 'avatar', ps.avatar, 'total', ps.total, 'count', ps.cnt))
              FROM per_student ps WHERE ps.class_code = t.class_code), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('word_id', pw.word_id, 'count', pw.cnt))
              FROM per_word pw WHERE pw.class_code = t.class_code), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('mode', pm.mode, 'count', pm.cnt, 'total', pm.total))
              FROM per_mode pm WHERE pm.class_code = t.class_code), '[]'::jsonb)
  FROM totals t;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_class_analytics(TEXT[], TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_teacher_class_analytics(TEXT[], TIMESTAMPTZ) FROM anon;

COMMENT ON FUNCTION public.get_teacher_class_analytics IS
  'Server-side aggregates for the teacher Analytics view (per-class student/word/mode buckets). Caller must own the classes; unowned codes are dropped.';
