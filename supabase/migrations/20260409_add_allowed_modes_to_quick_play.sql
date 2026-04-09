-- Add allowed_modes column to quick_play_sessions table
ALTER TABLE public.quick_play_sessions
ADD COLUMN IF NOT EXISTS allowed_modes TEXT[] DEFAULT '{"classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"}';

-- Update the create_quick_play_session function to accept allowed_modes
CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids INTEGER[],
  p_allowed_modes TEXT[] DEFAULT '{"classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"}'
)
RETURNS public.quick_play_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_code TEXT;
  v_session public.quick_play_sessions;
BEGIN
  -- Generate unique session code
  v_session_code := public.generate_session_code();

  -- Create session
  INSERT INTO public.quick_play_sessions (
    session_code,
    teacher_uid,
    word_ids,
    allowed_modes,
    is_active
  ) VALUES (
    v_session_code,
    auth.uid()::text,
    p_word_ids,
    p_allowed_modes,
    true
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

COMMENT ON COLUMN public.quick_play_sessions.allowed_modes IS 'Array of game mode IDs that students can play in this session';
