-- Save or update student progress for an assignment
-- This function has SECURITY DEFINER to bypass RLS
-- allowing students to save their game progress

CREATE OR REPLACE FUNCTION public.save_student_progress(
  p_student_name TEXT,
  p_student_uid UUID,
  p_assignment_id UUID,
  p_class_code TEXT,
  p_score INTEGER,
  p_mode TEXT,
  p_mistakes INTEGER DEFAULT 0,
  p_avatar TEXT DEFAULT '🦊'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  -- Check if existing progress exists with higher score
  SELECT id INTO v_existing_id
  FROM public.progress
  WHERE assignment_id = p_assignment_id
    AND student_uid = p_student_uid
    AND mode = p_mode
    AND class_code = p_class_code
  LIMIT 1;

  -- If exists and new score is higher, update it
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.progress
    SET score = GREATEST(score, p_score),
        mistakes = p_mistakes,
        avatar = p_avatar,
        completed_at = NOW()
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  ELSE
    -- Insert new progress record
    INSERT INTO public.progress (
      student_name,
      student_uid,
      assignment_id,
      class_code,
      score,
      mode,
      mistakes,
      avatar,
      completed_at
    ) VALUES (
      p_student_name,
      p_student_uid,
      p_assignment_id,
      p_class_code,
      p_score,
      p_mode,
      p_mistakes,
      p_avatar,
      NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.save_student_progress(
  TEXT,
  UUID,
  UUID,
  TEXT,
  INTEGER,
  TEXT,
  INTEGER,
  TEXT
) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.save_student_progress IS 'Save or update student progress for an assignment';
