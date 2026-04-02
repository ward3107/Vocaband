-- ============================================
-- Student Profiles Table & Authentication
-- ============================================
-- This migration creates the student_profiles table
-- which manages permanent student accounts with
-- class codes and teacher approval workflow

-- Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  class_code TEXT NOT NULL,
  email TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  auth_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  xp INTEGER DEFAULT 0,
  avatar TEXT DEFAULT '🦊',
  badges TEXT[] DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups by class code
CREATE INDEX IF NOT EXISTS idx_student_profiles_class_code
  ON public.student_profiles(class_code);

-- Create index for fast lookups by unique_id
CREATE INDEX IF NOT EXISTS idx_student_profiles_unique_id
  ON public.student_profiles(unique_id);

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_status
  ON public.student_profiles(status);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Students can read their own profile
DROP POLICY IF EXISTS "Students can read own profile" ON public.student_profiles;
CREATE POLICY "Students can read own profile"
ON public.student_profiles FOR SELECT
USING (auth.uid() = auth_uid);

-- Policy: Students can update their own profile (avatar, badges only)
DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
CREATE POLICY "Students can update own profile"
ON public.student_profiles FOR UPDATE
USING (auth.uid() = auth_uid)
WITH CHECK (
  auth.uid() = auth_uid
);

-- Note: Field-level restrictions handled in application layer

-- Policy: Teachers can read profiles for their classes
DROP POLICY IF EXISTS "Teachers can read class profiles" ON public.student_profiles;
CREATE POLICY "Teachers can read class profiles"
ON public.student_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = student_profiles.class_code
    AND teacher_uid::text = auth.uid()::text
  )
);

-- Policy: Teachers can approve students in their classes
DROP POLICY IF EXISTS "Teachers can approve class students" ON public.student_profiles;
CREATE POLICY "Teachers can approve class students"
ON public.student_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = student_profiles.class_code
    AND teacher_uid::text = auth.uid()::text
  )
)
WITH CHECK (
  status = 'approved' AND
  approved_at = NOW() AND
  approved_by = auth.uid()
);

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON public.student_profiles;
CREATE POLICY "Service role full access"
ON public.student_profiles FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Helper Functions
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_or_create_student_profile(TEXT, TEXT);

-- Function: Get or create student profile
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
BEGIN
  -- Generate case-insensitive unique_id
  v_unique_id := LOWER(p_class_code) || LOWER(TRIM(p_display_name));

  -- Try to find existing profile
  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE unique_id = v_unique_id;

  -- If not found, create new one
  IF NOT FOUND THEN
    INSERT INTO public.student_profiles (
      unique_id,
      display_name,
      class_code,
      email,
      status
    ) VALUES (
      v_unique_id,
      p_display_name,
      p_class_code,
      v_unique_id || '@internal.app',
      'pending_approval'
    )
    RETURNING * INTO v_profile;

    RETURN QUERY SELECT v_profile, true::BOOLEAN;
  ELSE
    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$$;

-- Function: Approve student and create auth user
DROP FUNCTION IF EXISTS public.approve_student(UUID);
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

  -- Create Supabase auth user
  -- Must explicitly provide id - auth.users doesn't auto-generate
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

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE public.student_profiles IS 'Student profile accounts with class codes and approval workflow';

COMMENT ON COLUMN public.student_profiles.unique_id IS 'Deterministic ID: lowercase(classcode + displayname). Used for consistent student identity.';

COMMENT ON COLUMN public.student_profiles.status IS 'pending_approval | approved | rejected';

COMMENT ON COLUMN public.student_profiles.email IS 'Internal email for auth (students never see this). Format: unique_id@internal.app';

-- Note: Function comments removed due to potential overload conflicts
