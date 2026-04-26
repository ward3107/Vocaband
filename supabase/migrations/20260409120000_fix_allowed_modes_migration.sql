-- Drop the old function first
-- Need to drop both the original 1-arg and the 2-arg overload because
-- a fresh migration apply may have created the 2-arg first via the
-- earlier 20260326 migration; without dropping both we end up with
-- an ambiguous overload set and the COMMENT below fails with
-- "function name ... is not unique".
DROP FUNCTION IF EXISTS public.create_quick_play_session(INTEGER[]);
DROP FUNCTION IF EXISTS public.create_quick_play_session(INTEGER[], JSONB);

-- Add allowed_modes column if not exists
ALTER TABLE public.quick_play_sessions
ADD COLUMN IF NOT EXISTS allowed_modes TEXT[] DEFAULT '{"classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"}';

-- Recreate function with all three parameters
CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids INTEGER[] DEFAULT NULL,
  p_custom_words JSONB DEFAULT NULL,
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

  -- Create session with all parameters
  INSERT INTO public.quick_play_sessions (
    session_code,
    teacher_uid,
    word_ids,
    custom_words,
    allowed_modes,
    is_active
  ) VALUES (
    v_session_code,
    auth.uid()::text,
    COALESCE(p_word_ids, ARRAY[]::INTEGER[]),
    p_custom_words,
    p_allowed_modes,
    true
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

COMMENT ON FUNCTION public.create_quick_play_session(INTEGER[], JSONB, TEXT[]) IS 'Create quick play session with database words, custom words, and allowed game modes';
