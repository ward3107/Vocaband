-- get_class_activity — returns per-day per-student XP for the activity chart.
--
-- Consumed by the Gradebook's top-of-page "class pulse" activity graph:
-- a 7/14/30-day bar chart showing which students played each day.
-- Also drives the "Not playing" bucket: students with zero rows in the
-- window are the ones who haven't logged in.
--
-- Data source: public.progress. `score` is the XP earned for that one
-- mode-completion, `completed_at` is the timestamp. Aggregates to
-- per-(student, day) sums so the client doesn't need to do it.
--
-- Authorization inside the function — same teacher-ownership pattern as
-- get_class_mastery.

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

  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_caller_uid
  ) INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Access denied: not the teacher of this class'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.student_uid,
    -- Latest display_name / avatar seen for this student in the window.
    -- Students who changed their name mid-session still resolve to their
    -- most recent handle here.
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
REVOKE EXECUTE ON FUNCTION public.get_class_activity(TEXT, INTEGER) FROM anon;

COMMENT ON FUNCTION public.get_class_activity IS
  'Per-student per-day XP + plays for a class over the last N days (capped 1-90). Caller must be the teacher.';
