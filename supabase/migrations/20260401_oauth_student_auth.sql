-- =============================================================================
-- OAuth Student Authentication System
-- =============================================================================
-- This migration implements OAuth for students with pre-approved teachers.

-- ============================================
-- 1. Create teacher_profiles table (manual management via Supabase Dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  school_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.teacher_profiles IS
  'Pre-approved teachers managed by admin via Supabase Dashboard. Only teachers in this table can access teacher dashboard.';

-- Enable RLS
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read (for OAuth check)
CREATE POLICY "Teachers can be read by authenticated users"
  ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: No one can insert via API (admin uses Supabase Dashboard directly)
CREATE POLICY "Teachers cannot be inserted via API"
  ON public.teacher_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Policy: No one can update via API (admin uses Supabase Dashboard directly)
CREATE POLICY "Teachers cannot be updated via API"
  ON public.teacher_profiles
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: No one can delete via API (admin uses Supabase Dashboard directly)
CREATE POLICY "Teachers cannot be deleted via API"
  ON public.teacher_profiles
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================
-- 2. Update student_profiles for OAuth
-- ============================================

-- First, check if avatar column exists, if not add it
DO LANGUAGE plpgsql
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_profiles'
    AND column_name = 'avatar'
  ) THEN
    ALTER TABLE public.student_profiles ADD COLUMN avatar TEXT DEFAULT '🦊';
  END IF;
END $$;

-- Add email column if not exists
DO LANGUAGE plpgsql
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_profiles'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.student_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Make email unique (for OAuth users)
DO LANGUAGE plpgsql
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'student_profiles'
    AND constraint_name = 'student_profiles_email_key'
  ) THEN
    ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- ============================================
-- 3. Create OAuth helper functions
-- ============================================

-- Drop ALL overloaded versions of functions first
DO LANGUAGE plpgsql
$$
BEGIN
  -- Drop is_teacher function (all overloads)
  DROP FUNCTION IF EXISTS public.is_teacher() CASCADE;

  -- Drop get_or_create_student_profile_oauth function (all overloads)
  DROP FUNCTION IF EXISTS public.get_or_create_student_profile_oauth() CASCADE;

  -- Drop update_updated_at_column function (all overloads)
  DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
END $$;

-- Function to check if user is a teacher
CREATE FUNCTION public.is_teacher(p_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teacher_profiles
    WHERE email = p_user_email
    AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.is_teacher IS
  'Check if an email belongs to a pre-approved teacher.';

-- Function to get or create student profile via OAuth
CREATE FUNCTION public.get_or_create_student_profile_oauth(
  p_class_code TEXT,
  p_display_name TEXT,
  p_email TEXT,
  p_auth_uid UUID,
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
BEGIN
  -- Create unique ID from class code + email
  v_unique_id := LOWER(p_class_code) || ':' || LOWER(p_email);

  -- Try to find existing profile by email or unique_id
  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE email = p_email
     OR unique_id = v_unique_id;

  -- If not found, create new one
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
      p_email,
      'pending_approval',
      p_auth_uid,
      p_avatar
    )
    RETURNING * INTO v_profile;

    RETURN QUERY SELECT v_profile, true::BOOLEAN;
  ELSE
    -- Update profile if needed
    UPDATE public.student_profiles
    SET
      display_name = COALESCE(p_display_name, display_name),
      email = COALESCE(p_email, email),
      auth_uid = COALESCE(p_auth_uid, auth_uid),
      avatar = COALESCE(p_avatar, avatar)
    WHERE id = v_profile.id
    RETURNING * INTO v_profile;

    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_student_profile_oauth IS
  'Get or create student profile via OAuth authentication. Requires email, auth_uid from Google OAuth.';

-- ============================================
-- 4. Create view for user type detection
-- ============================================
CREATE OR REPLACE VIEW public.user_roles AS
SELECT
  auth.uid() as user_id,
  auth.email() as email,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.teacher_profiles
      WHERE email = auth.email()
      AND status = 'active'
    ) THEN 'teacher'
    WHEN EXISTS (
      SELECT 1 FROM public.student_profiles
      WHERE email = auth.email()
    ) THEN 'student'
    ELSE 'new_user'
  END as role;

COMMENT ON VIEW public.user_roles IS
  'View to determine user role (teacher/student/new) based on email.';

-- ============================================
-- 5. Add updated_at trigger to teacher_profiles
-- ============================================
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
