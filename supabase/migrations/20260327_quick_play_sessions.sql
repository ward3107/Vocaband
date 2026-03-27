-- ============================================
-- Quick Play Sessions Table
-- ============================================
-- This migration creates the quick_play_sessions table
-- which allows teachers to create temporary sessions
-- with custom word selection that students can join
-- via QR code without login

-- Create quick_play_sessions table
CREATE TABLE IF NOT EXISTS public.quick_play_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  teacher_uid TEXT NOT NULL,
  word_ids INTEGER[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast lookups by session code
CREATE INDEX IF NOT EXISTS idx_quick_play_sessions_code
  ON public.quick_play_sessions(session_code);

-- Create index for teacher's active sessions
CREATE INDEX IF NOT EXISTS idx_quick_play_sessions_teacher_active
  ON public.quick_play_sessions(teacher_uid, is_active);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE public.quick_play_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can create their own sessions
CREATE POLICY "Teachers can create sessions"
ON public.quick_play_sessions FOR INSERT
WITH CHECK (auth.uid()::text = teacher_uid);

-- Policy: Teachers can read their own sessions
CREATE POLICY "Teachers can read own sessions"
ON public.quick_play_sessions FOR SELECT
USING (auth.uid()::text = teacher_uid);

-- Policy: Teachers can update their own sessions (end them)
CREATE POLICY "Teachers can update own sessions"
ON public.quick_play_sessions FOR UPDATE
USING (auth.uid()::text = teacher_uid)
WITH CHECK (auth.uid()::text = teacher_uid);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access"
ON public.quick_play_sessions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow read access for joining sessions (no auth required)
CREATE POLICY "Anyone can read active sessions"
ON public.quick_play_sessions FOR SELECT
USING (is_active = true);

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Generate unique session code
CREATE OR REPLACE FUNCTION public.generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  WHILE attempts < max_attempts LOOP
    -- Generate 6-character code
    code := '';
    FOR i IN 1..6 LOOP
      code := code || SUBSTRING(chars FROM (floor(random() * length(chars)) + 1)::INTEGER FOR 1);
    END LOOP;

    -- Check if code is unique
    IF NOT EXISTS (
      SELECT 1 FROM public.quick_play_sessions
      WHERE session_code = code AND is_active = true
    ) THEN
      RETURN code;
    END IF;

    attempts := attempts + 1;
  END LOOP;

  RAISE EXCEPTION 'Failed to generate unique session code';
END;
$$;

-- Function: Create new quick play session
CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids INTEGER[]
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
    is_active
  ) VALUES (
    v_session_code,
    auth.uid()::text,
    p_word_ids,
    true
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- Function: End quick play session
CREATE OR REPLACE FUNCTION public.end_quick_play_session(
  p_session_code TEXT
)
RETURNS public.quick_play_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session public.quick_play_sessions;
BEGIN
  -- Update session
  UPDATE public.quick_play_sessions
  SET
    is_active = false,
    ended_at = NOW()
  WHERE session_code = p_session_code
    AND teacher_uid = auth.uid()::text
    AND is_active = true
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or already ended';
  END IF;

  RETURN v_session;
END;
$$;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE public.quick_play_sessions IS 'Temporary quick play sessions with custom word selection that students can join via QR code';

COMMENT ON COLUMN public.quick_play_sessions.session_code IS '6-character alphanumeric code used for QR codes and URLs';

COMMENT ON COLUMN public.quick_play_sessions.word_ids IS 'Array of vocabulary word IDs selected by teacher';

COMMENT ON COLUMN public.quick_play_sessions.is_active IS 'Session status - true for active, false after teacher ends it';

COMMENT ON FUNCTION public.generate_session_code IS 'Generate unique 6-character session code (no confusing chars like 0/O/1/I)';

COMMENT ON FUNCTION public.create_quick_play_session IS 'Create new quick play session with selected words and return session details';

COMMENT ON FUNCTION public.end_quick_play_session IS 'End an active quick play session';
