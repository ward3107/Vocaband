-- Security Hardening Migration
-- 1. Revoke anonymous access to student_sign_in (require authentication)
-- 2. Use cryptographically secure random for session code generation
-- 3. Restrict "Anyone can read active sessions" to authenticated users only

-- ============================================
-- 1. Revoke anon access to student_sign_in
-- ============================================
-- Students must authenticate before calling this RPC.
-- This prevents unauthenticated brute-force attempts.
REVOKE EXECUTE ON FUNCTION public.student_sign_in(TEXT, TEXT) FROM anon;

-- ============================================
-- 2. Fix session code generation to use crypto-secure random
-- ============================================
-- Ensure pgcrypto extension is available (provides gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  chars_len INTEGER := length(chars);
  code TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
  random_bytes BYTEA;
BEGIN
  WHILE attempts < max_attempts LOOP
    -- Use cryptographically secure random bytes
    random_bytes := gen_random_bytes(6);
    code := '';
    FOR i IN 0..5 LOOP
      code := code || SUBSTRING(chars FROM (get_byte(random_bytes, i) % chars_len) + 1 FOR 1);
    END LOOP;

    -- Check if code is unique among active sessions
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

COMMENT ON FUNCTION public.generate_session_code IS 'Generate unique 6-character session code using cryptographically secure random (no confusing chars like 0/O/1/I)';

-- ============================================
-- 3. Tighten quick_play_sessions read policy
-- ============================================
-- Drop the overly permissive "anyone" policy and replace with authenticated-only
DROP POLICY IF EXISTS "Anyone can read active sessions" ON public.quick_play_sessions;

CREATE POLICY "Authenticated users can read active sessions"
ON public.quick_play_sessions FOR SELECT
TO authenticated
USING (is_active = true);
