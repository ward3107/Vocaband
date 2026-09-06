-- get_assignments_for_class: return the `subject` column.
--
-- Root cause: `assignments.subject` was added by
-- 20260507204614_voca_subject_flags.sql — AFTER the RPC's last
-- definition in 20260507_fix_get_assignments_smallint_cast.sql. The
-- RETURNS TABLE was never updated, so the column has been missing from
-- every student-side read since VocaHebrew Phase 2.
--
-- Impact: the student dashboard loads assignments exclusively through
-- this RPC (src/hooks/useTeacherData.ts loadAssignmentsForClass), and
-- mapAssignment (src/core/supabase.ts:611) resolves a missing column to
-- the English default:
--
--     subject: row.subject === 'hebrew' ? 'hebrew' : 'english'
--
-- So EVERY assignment a student loads is mapped as English. A Hebrew
-- assignment therefore never routes to the Hebrew game modes: the
-- student gets the English mode picker, and the English renderer is
-- handed HebrewLemma rows whose fields it does not have — every option
-- and answer reads `undefined`. The teacher cannot reproduce it,
-- because her own dashboard reads the table directly (ASSIGNMENT_COLUMNS
-- includes `subject`) and renders correctly.
--
-- bootstrap_student_session (20260517105307) aggregates this function's
-- rows with `to_jsonb(a)`, so it inherits the omission and is fixed by
-- this migration too — no separate change needed there.
--
-- A return-type change requires DROP + CREATE; the auth gates and the
-- ::INTEGER casts from 20260507 are preserved verbatim. Reversible by
-- re-applying 20260507_fix_get_assignments_smallint_cast.sql.

DROP FUNCTION IF EXISTS public.get_assignments_for_class(UUID);

CREATE OR REPLACE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  words JSONB,
  allowed_modes TEXT[],
  deadline TEXT,
  sentences TEXT[],
  sentence_difficulty INTEGER,
  created_at TIMESTAMPTZ,
  subject TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid   TEXT := auth.uid()::text;
  v_caller_role  TEXT;
  v_caller_class TEXT;
  v_target_code  TEXT;
  v_is_teacher   BOOLEAN;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT u.role, u.class_code INTO v_caller_role, v_caller_class
  FROM public.users u WHERE u.uid = v_caller_uid;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '42501';
  END IF;

  -- Teacher path: must own the class.
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_uid = v_caller_uid
  ) INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    -- Student path: must be enrolled in the class.
    SELECT c.code INTO v_target_code FROM public.classes c WHERE c.id = p_class_id;

    IF v_target_code IS NULL OR v_caller_class IS NULL OR v_caller_class <> v_target_code THEN
      RAISE EXCEPTION 'Access denied: caller is not a member of this class'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids::INTEGER[],                 -- keep INTEGER[] even if schema drifts
    a.words,
    a.allowed_modes,
    a.deadline,
    a.sentences,
    a.sentence_difficulty::INTEGER,        -- SMALLINT on prod; cast up to INTEGER
    a.created_at,
    a.subject::TEXT                        -- added 20260507204614; was never returned
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) FROM anon;

COMMENT ON FUNCTION public.get_assignments_for_class IS
  'Get assignments for a class. Validates caller is the class teacher or an enrolled student. Returns subject so Hebrew assignments route to the Hebrew game modes on the student side. Explicit ::INTEGER casts defend against SMALLINT/INTEGER schema drift on sentence_difficulty + word_ids.';
