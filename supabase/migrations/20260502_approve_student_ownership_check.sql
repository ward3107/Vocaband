-- Add teacher-ownership validation to approve_student().
-- Previously the RPC was SECURITY DEFINER and bypassed RLS without
-- verifying that the calling teacher actually owns the class the
-- pending student is trying to join. A malicious (or buggy) client
-- could therefore approve any pending profile by ID. This migration
-- hardens the function by requiring auth.uid() to own the class.
--
-- Reject-student is UPDATE-through-RLS so the existing RLS policy
-- already covers it — this migration only touches approve_student.

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
  v_owns_class BOOLEAN;
BEGIN
  -- Lock and fetch profile
  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Authorization: the caller must own the class the student is
  -- requesting to join. Without this any authenticated teacher could
  -- approve any pending student by guessing their profile ID.
  SELECT EXISTS (
    SELECT 1
    FROM public.classes
    WHERE code = v_profile.class_code
      AND teacher_uid = auth.uid()::text
  ) INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Not authorized to approve a student in this class';
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
