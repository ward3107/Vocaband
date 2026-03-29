-- ============================================
-- Add Custom Words Support to Quick Play
-- ============================================
-- This allows teachers to mix database words with their own custom words

-- Add column for custom words (stored as JSON)
ALTER TABLE public.quick_play_sessions
ADD COLUMN IF NOT EXISTS custom_words JSONB;

-- Update create_quick_play_session to accept custom words
CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids INTEGER[] DEFAULT NULL,
  p_custom_words JSONB DEFAULT NULL
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

  -- Create session with both database and custom words
  INSERT INTO public.quick_play_sessions (
    session_code,
    teacher_uid,
    word_ids,
    custom_words,
    is_active
  ) VALUES (
    v_session_code,
    auth.uid()::text,
    COALESCE(p_word_ids, ARRAY[]::INTEGER[]),
    p_custom_words,
    true
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

COMMENT ON COLUMN public.quick_play_sessions.custom_words IS 'Custom words added by teacher (array of {english, hebrew, arabic, sentence, example})';
COMMENT ON FUNCTION public.create_quick_play_session IS 'Create quick play session with database words and/or custom words';
