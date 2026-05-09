-- =============================================================================
-- Server-side enforcement of the Free-tier limits + Pro-only feature gates
-- =============================================================================
-- Until today every Pro/Free distinction lived in React (`isPro(user)` checks
-- in components).  That means a trial-expired teacher (or anyone with a
-- valid teacher JWT) could call Supabase + Fly directly, bypass the UI hide,
-- and rack up Gemini bills, create unlimited classes, or approve unlimited
-- students.  This migration moves the gates into the database where they
-- can't be bypassed by editing client state.
--
-- What's enforced here:
--   1. Max 1 class per Free teacher (was: client toast only)
--   2. Max 30 students per class for Free teachers (was: client toast only)
--
-- AI endpoint gating happens server-side in server.ts (Fly.io Express) via
-- a requireProTeacher middleware -- not here, since AI calls don't touch
-- Supabase.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_pro_or_trialing()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND (
        plan IN ('pro', 'school')
        OR (trial_ends_at IS NOT NULL AND trial_ends_at > now())
      )
  );
$$;

COMMENT ON FUNCTION public.is_pro_or_trialing() IS
  'Returns TRUE when the current auth.uid is on a paid plan (pro/school) or still inside their 30-day trial. Used by RLS to gate Free-tier limits server-side.';

-- Two permissive INSERT policies existed:
--   "Teachers can insert own classes" -- legacy, only checked teacher_uid match
--   "classes_insert"                 -- canonical, also requires is_teacher()
-- PERMISSIVE policies OR together, so the legacy one made the canonical
-- one meaningless.  Drop the legacy one before tightening the canonical.
DROP POLICY IF EXISTS "Teachers can insert own classes" ON public.classes;

DROP POLICY IF EXISTS classes_insert ON public.classes;

CREATE POLICY classes_insert ON public.classes
  FOR INSERT
  WITH CHECK (
    (auth.uid())::text = teacher_uid
    AND is_teacher()
    AND (
      is_pro_or_trialing()
      OR (
        SELECT COUNT(*) FROM public.classes c2
        WHERE c2.teacher_uid = (auth.uid())::text
      ) = 0
    )
  );

COMMENT ON POLICY classes_insert ON public.classes IS
  'Teachers can insert their own classes. Free-tier teachers (not Pro/trial) are capped at 1 class. Existing classes above the cap are grandfathered -- only new inserts are blocked.';

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
  v_approved_count INTEGER;
BEGIN
  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

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

  -- Free-tier cap: 30 active/approved students per class.  Pro / School
  -- / trialing teachers skip the count entirely.  Errors out with
  -- 'free_tier_student_cap' so the frontend can show a paywall toast.
  IF NOT is_pro_or_trialing() THEN
    SELECT COUNT(*) INTO v_approved_count
    FROM public.student_profiles
    WHERE class_code = v_profile.class_code
      AND status IN ('active', 'approved');

    IF v_approved_count >= 30 THEN
      RAISE EXCEPTION 'free_tier_student_cap'
        USING HINT = 'Free plan is limited to 30 students per class. Upgrade to Pro for unlimited students.';
    END IF;
  END IF;

  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_profile.email
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
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
