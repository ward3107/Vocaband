-- get_class_mastery — returns per-student per-word mastery stats for a class.
--
-- Consumed by the redesigned Gradebook's per-student drawer (heatmap
-- showing which words each student has mastered, is shaky on, or fails).
--
-- Data source: public.word_attempts (added in 20260423). Aggregates the
-- granular per-attempt rows into:
--   correct_count / total_count / last_attempt_at per (student_uid, word_id)
--
-- Teacher ownership gate inside the function (SECURITY DEFINER bypasses
-- RLS so we must enforce authz manually) — same pattern as
-- get_assignments_for_class and approve_student.
--
-- Caller gets back enough fields to render:
--   * a coloured dot per word (green/amber/rose based on accuracy)
--   * per-mode tallies later (mode column included)
--   * recency (so "hasn't touched in 10 days" hints are possible)

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

  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_caller_uid
  ) INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Access denied: not the teacher of this class'
      USING ERRCODE = '42501';
  END IF;

  -- Aggregate per (student, word, mode). Keeps modes separate so the
  -- drawer can show "Jane got 'through' right in Flashcards but wrong
  -- in Spelling" — more informative than a single merged number.
  RETURN QUERY
  SELECT
    wa.student_uid,
    -- Pull display_name from the latest progress row for this student
    -- (avoids an extra users-table join). Fallback to the uid prefix.
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
REVOKE EXECUTE ON FUNCTION public.get_class_mastery(TEXT) FROM anon;

COMMENT ON FUNCTION public.get_class_mastery IS
  'Per-student per-word mastery stats for a class. Caller must be the teacher. Used by the redesigned Gradebook.';
