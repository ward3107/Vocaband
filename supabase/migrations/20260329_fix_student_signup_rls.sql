-- ============================================
-- Fix Student Signup RLS Policy
-- ============================================
-- This migration adds an INSERT policy to allow
-- students to create their own profiles during signup.

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Students can insert own profile" ON public.student_profiles;

-- Policy: Students can insert their own profile (pending_approval only)
CREATE POLICY "Students can insert own profile"
ON public.student_profiles FOR INSERT
WITH CHECK (
  status = 'pending_approval' AND
  unique_id = LOWER(class_code) || LOWER(TRIM(display_name))
);

-- Allow teachers to insert student profiles for their classes
CREATE POLICY "Teachers can insert student profiles"
ON public.student_profiles FOR INSERT
WITH CHECK (
  status = 'pending_approval' AND
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = student_profiles.class_code
    AND teacher_uid::text = auth.uid()::text
  )
);

COMMENT ON POLICY "Students can insert own profile" ON public.student_profiles IS
'Allows students to create their own profile during signup. Only pending_approval status allowed, and unique_id must follow format.';
