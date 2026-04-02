-- =============================================================================
-- Teacher RLS Policies for Classes Table
-- =============================================================================
-- This migration adds RLS policies to allow pre-approved teachers
-- to create and manage their own classes.

-- Enable RLS on classes table (if not already enabled)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can insert own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;

-- Policy: Teachers can INSERT classes where they are the teacher
CREATE POLICY "Teachers can insert own classes"
ON public.classes FOR INSERT
TO authenticated
WITH CHECK (
  teacher_uid::text = auth.uid()::text
);

-- Policy: Teachers can SELECT their own classes
CREATE POLICY "Teachers can view own classes"
ON public.classes FOR SELECT
TO authenticated
USING (
  teacher_uid::text = auth.uid()::text
);

-- Policy: Teachers can UPDATE their own classes
CREATE POLICY "Teachers can update own classes"
ON public.classes FOR UPDATE
TO authenticated
USING (
  teacher_uid::text = auth.uid()::text
)
WITH CHECK (
  teacher_uid::text = auth.uid()::text
);

-- Policy: Teachers can DELETE their own classes
CREATE POLICY "Teachers can delete own classes"
ON public.classes FOR DELETE
TO authenticated
USING (
  teacher_uid::text = auth.uid()::text
);

COMMENT ON POLICY "Teachers can insert own classes" ON public.classes IS
  'Allows pre-approved teachers (authenticated via OAuth) to create classes where they are the teacher.';

COMMENT ON POLICY "Teachers can view own classes" ON public.classes IS
  'Allows teachers to see only their own classes.';

-- Note: Students access classes via get_class_by_code() RPC function (SECURITY DEFINER)
-- to avoid RLS policy circular dependencies
