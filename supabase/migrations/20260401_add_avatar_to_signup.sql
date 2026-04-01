-- =============================================================================
-- Avatar Selection for Student Signup
-- =============================================================================
-- This migration adds avatar selection to the student signup flow.
-- Students choose an avatar during registration, which is stored with their
-- profile and shown in the login list to prevent impersonation.

-- ============================================
-- 1. Drop all overloaded versions of get_or_create_student_profile
-- ============================================
DROP FUNCTION IF EXISTS public.get_or_create_student_profile(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_or_create_student_profile(TEXT, TEXT, TEXT);

-- ============================================
-- 2. Recreate function with avatar parameter
-- ============================================
-- Problem: The function doesn't accept avatar parameter, so students can't
--          choose their avatar during signup.
-- Fix: Add p_avatar parameter with default value for backwards compatibility.

CREATE FUNCTION public.get_or_create_student_profile(
  p_class_code TEXT,
  p_display_name TEXT,
  p_avatar TEXT DEFAULT '🦊'
)
RETURNS TABLE (
  profile public.student_profiles,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unique_id TEXT;
  v_profile public.student_profiles;
  v_caller_uid TEXT;
BEGIN
  v_caller_uid := auth.uid()::text;
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Include UID to prevent name collisions between students
  v_unique_id := LOWER(p_class_code) || LOWER(TRIM(p_display_name)) || ':' || v_caller_uid;

  -- Try to find existing profile (also check legacy format without UID for backwards compat)
  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE unique_id = v_unique_id
     OR (unique_id = LOWER(p_class_code) || LOWER(TRIM(p_display_name)) AND auth_uid = auth.uid());

  -- If not found, create new one with avatar
  IF NOT FOUND THEN
    INSERT INTO public.student_profiles (
      unique_id,
      display_name,
      class_code,
      email,
      status,
      auth_uid,
      avatar
    ) VALUES (
      v_unique_id,
      p_display_name,
      p_class_code,
      v_unique_id || '@internal.app',
      'pending_approval',
      auth.uid(),
      p_avatar
    )
    RETURNING * INTO v_profile;

    RETURN QUERY SELECT v_profile, true::BOOLEAN;
  ELSE
    -- Migrate legacy unique_id to new format if needed
    IF v_profile.unique_id != v_unique_id THEN
      UPDATE public.student_profiles
      SET unique_id = v_unique_id, email = v_unique_id || '@internal.app'
      WHERE id = v_profile.id;
      v_profile.unique_id := v_unique_id;
    END IF;

    -- Update avatar if provided and different from existing
    IF p_avatar IS DISTINCT FROM v_profile.avatar THEN
      UPDATE public.student_profiles
      SET avatar = p_avatar
      WHERE id = v_profile.id;
      v_profile.avatar := p_avatar;
    END IF;

    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_student_profile IS
  'Get existing student profile or create new pending one. Accepts avatar parameter for visual verification. unique_id includes auth UID to prevent name collisions.';
