-- Fix approve_student function to explicitly generate UUID for auth.users
-- The auth.users table requires an explicit id - it doesn't auto-generate

CREATE OR REPLACE FUNCTION public.approve_student(
  p_profile_id UUID
)
RETURNS public.student_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile public.student_profiles;
  v_auth_user_id UUID;
BEGIN
  -- Lock and fetch profile
  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.status = 'approved' THEN
    RETURN v_profile;
  END IF;

  -- Must explicitly generate UUID - auth.users doesn't auto-generate
  v_auth_user_id := gen_random_uuid();

  -- Create Supabase auth user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_auth_user_id,
    v_profile.email,
    crypt(gen_random_bytes(32)::text, gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'display_name', v_profile.display_name,
      'class_code', v_profile.class_code,
      'role', 'student'
    ),
    NOW(),
    NOW()
  );

  -- Update profile with auth UID and approval
  UPDATE public.student_profiles
  SET
    auth_uid = v_auth_user_id,
    status = 'approved',
    approved_at = NOW(),
    approved_by = auth.uid()
  WHERE id = p_profile_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.approve_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student(UUID) TO service_role;
