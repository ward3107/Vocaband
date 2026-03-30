-- =============================================================================
-- Security Fix: Prevent students from changing class_code + fix unique_id collision
-- =============================================================================

-- ============================================
-- 1. Freeze class_code for non-admin users
-- ============================================
-- Problem: The users_update RLS policy freezes role but not class_code.
--          A student could call supabase.from('users').update({ class_code: 'X' })
--          to move themselves to another class without teacher approval.
-- Fix: Non-admin users must keep their existing class_code (or set it from NULL
--      during initial login — the INSERT policy already enforces auth.uid match).

DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid()::text = uid OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      -- Single subquery: freeze both role and class_code for non-admins
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.uid = auth.uid()::text
          AND u.role = role
          AND (u.class_code IS NULL OR u.class_code = class_code)
      )
    )
  );

COMMENT ON POLICY "users_update" ON public.users IS
  'Users can update own row but cannot change role or class_code (prevents class hopping). Admins bypass all restrictions.';

-- ============================================
-- 2. Fix unique_id generation to include UID
-- ============================================
-- Problem: unique_id = lowercase(code + name) means two students with the same
--          display name in the same class share one profile row. Approving one
--          approves all students with that name.
-- Fix: Include the caller's auth UID in the unique_id for guaranteed uniqueness.

CREATE OR REPLACE FUNCTION public.get_or_create_student_profile(
  p_class_code TEXT,
  p_display_name TEXT
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

  -- If not found, create new one
  IF NOT FOUND THEN
    INSERT INTO public.student_profiles (
      unique_id,
      display_name,
      class_code,
      email,
      status,
      auth_uid
    ) VALUES (
      v_unique_id,
      p_display_name,
      p_class_code,
      v_unique_id || '@internal.app',
      'pending_approval',
      auth.uid()
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

    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_student_profile IS
  'Get existing student profile or create new pending one. unique_id now includes auth UID to prevent name collisions.';
