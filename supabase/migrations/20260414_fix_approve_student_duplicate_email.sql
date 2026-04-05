-- Fix approve_student to handle students who already have an auth.users row
-- (e.g. from a previous Google OAuth sign-in). Instead of failing with a
-- duplicate key error, reuse the existing auth user ID.

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

  -- Check if an auth user with this email already exists (e.g. from Google OAuth)
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_profile.email
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    -- No existing auth user — create one
    v_auth_user_id := gen_random_uuid();

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
  END IF;

  -- Ensure the public.users row exists for this auth user
  INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
  VALUES (
    v_auth_user_id::text,
    v_profile.email,
    'student',
    v_profile.display_name,
    v_profile.class_code,
    v_profile.avatar
  )
  ON CONFLICT (uid) DO UPDATE SET
    class_code = EXCLUDED.class_code,
    display_name = EXCLUDED.display_name,
    avatar = EXCLUDED.avatar;

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
