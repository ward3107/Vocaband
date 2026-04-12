-- Fix save_student_progress RPC: TWO type mismatches that caused
-- "Your score couldn't be saved" on EVERY game completion.
--
-- 1. p_student_uid was UUID but progress.student_uid is TEXT
--    → "operator does not exist: text = uuid"
-- 2. p_mistakes was INTEGER but progress.mistakes is INTEGER[]
--    → "column mistakes is of type integer[] but expression is of type integer"
--
-- Fix: change p_student_uid to TEXT, wrap p_mistakes in ARRAY[].

DROP FUNCTION IF EXISTS public.save_student_progress(text, uuid, uuid, text, integer, text, integer, text);

CREATE OR REPLACE FUNCTION public.save_student_progress(
  p_student_name text,
  p_student_uid text,
  p_assignment_id uuid,
  p_class_code text,
  p_score integer,
  p_mode text,
  p_mistakes integer DEFAULT 0,
  p_avatar text DEFAULT '🦊'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.progress
  WHERE assignment_id = p_assignment_id
    AND student_uid = p_student_uid
    AND mode = p_mode
    AND class_code = p_class_code
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.progress
    SET score = GREATEST(score, p_score),
        mistakes = ARRAY[p_mistakes],
        avatar = p_avatar,
        completed_at = NOW()
    WHERE id = v_existing_id;
    RETURN v_existing_id;
  ELSE
    INSERT INTO public.progress (
      student_name, student_uid, assignment_id, class_code,
      score, mode, mistakes, avatar, completed_at
    ) VALUES (
      p_student_name, p_student_uid, p_assignment_id, p_class_code,
      p_score, p_mode, ARRAY[p_mistakes], p_avatar, NOW()
    )
    RETURNING id INTO v_new_id;
    RETURN v_new_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_progress(text, text, uuid, text, integer, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_progress(text, text, uuid, text, integer, text, integer, text) TO anon;
