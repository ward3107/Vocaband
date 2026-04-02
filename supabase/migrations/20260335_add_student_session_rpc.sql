-- Student Session RPC
-- This function creates a session for an existing student auth user
-- It bypasses the need for passwords by using internal auth functions

CREATE OR REPLACE FUNCTION public.create_student_session(
  p_auth_uid UUID
)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_in INTEGER,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_access_token TEXT;
  v_refresh_token TEXT;
  v_expires_in INTEGER := 3600; -- 1 hour
BEGIN
  -- Get the auth user
  SELECT * INTO v_user
  FROM auth.users
  WHERE id = p_auth_uid AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found for UID: %', p_auth_uid;
  END IF;

  -- Generate a new access token using Supabase's internal function
  -- This creates a valid session without needing a password
  PERFORM supabase_http.request(
    'POST',
    '/auth/v1/admin/user/' || p_auth_uid || '/token',
    jsonb_build_object(
      'expires_in', v_expires_in,
      'refresh_token', true
    ),
    NULL,
    'application/json'
  );

  -- Since we can't directly generate tokens from SQL without service role,
  -- we'll return the auth_uid and let the frontend handle session establishment
  -- using a different approach

  RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, v_expires_in, v_user.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_student_session(UUID) TO authenticated;

-- Grant execute permission to anon (for student login before they have a session)
GRANT EXECUTE ON FUNCTION public.create_student_session(UUID) TO anon;

COMMENT ON FUNCTION public.create_student_session IS 'Create a session for an existing student auth user';

-- ============================================
-- Alternative approach: Use the OTP sign-in method
-- This bypasses the need for passwords
-- ============================================

-- Function to generate OTP and return it (for development/testing)
-- In production, you'd send this via email or other channel
CREATE OR REPLACE FUNCTION public.generate_student_otp(
  p_auth_uid UUID
)
RETURNS TABLE (
  otp_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_otp_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '10 minutes';
BEGIN
  -- Get the auth user
  SELECT * INTO v_user
  FROM auth.users
  WHERE id = p_auth_uid AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found for UID: %', p_auth_uid;
  END IF;

  -- Generate a 6-digit OTP
  v_otp_token := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Store OTP in user metadata (for verification later)
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'otp_token', v_otp_token,
    'otp_expires', v_expires_at
  )
  WHERE id = p_auth_uid;

  RETURN QUERY SELECT v_otp_token, v_expires_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_student_otp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_student_otp(UUID) TO anon;

COMMENT ON FUNCTION public.generate_student_otp IS 'Generate one-time password for student sign-in (development mode)';
