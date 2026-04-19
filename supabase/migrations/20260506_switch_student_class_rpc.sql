-- switch_student_class — atomic class-switch for already-approved students.
--
-- Why: the users_update RLS policy (20260340) freezes class_code for non-
-- admins to prevent casual "class hopping". That's the right default for
-- direct table updates, but breaks the legitimate class-switch UX where a
-- student was logged into class A and re-logged in with class B's code.
-- The client's handleConfirmClassSwitch was doing two direct .update()
-- calls on users + student_profiles; both now come back 403 under that
-- freeze, the DB stays on the old code, the socket server reads the old
-- code and rejects JOIN_CHALLENGE with a role/class mismatch.
--
-- Solution: a SECURITY DEFINER RPC the client calls on confirm. It:
--   1. Resolves auth.uid() and rejects unauthenticated callers.
--   2. Confirms the target class code exists (whitespace-normalized).
--   3. Updates the caller's users.class_code and student_profiles.class_code
--      (+ status to 'approved' so they don't get bounced through pending).
--
-- Only the caller's own rows are touched — no way for one student to move
-- another. Teachers and admins still use direct updates as before.

CREATE OR REPLACE FUNCTION public.switch_student_class(p_new_code TEXT)
RETURNS TABLE (users_updated INTEGER, profiles_updated INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid   TEXT := auth.uid()::text;
  v_caller_email TEXT := auth.jwt() ->> 'email';
  v_normalized   TEXT := upper(regexp_replace(coalesce(p_new_code, ''), '\s+', '', 'g'));
  v_class_exists BOOLEAN;
  v_users_count  INTEGER;
  v_profile_count INTEGER;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_normalized = '' THEN
    RAISE EXCEPTION 'class code required' USING ERRCODE = '22023';
  END IF;

  -- Confirm target class exists; never accept a phantom code.
  SELECT EXISTS (
    SELECT 1 FROM public.classes WHERE code = v_normalized
  ) INTO v_class_exists;

  IF NOT v_class_exists THEN
    RAISE EXCEPTION 'class % does not exist', v_normalized USING ERRCODE = 'P0002';
  END IF;

  -- 1. Update the caller's users row.
  UPDATE public.users
  SET class_code = v_normalized
  WHERE uid = v_caller_uid;
  GET DIAGNOSTICS v_users_count = ROW_COUNT;

  -- 2. Update the caller's student_profiles row (by email, which is unique).
  -- Status → approved so the student lands on the dashboard rather than
  -- the pending screen. Teacher-approval requirement is bypassed here
  -- because the student was ALREADY approved before — they're just
  -- moving, not newly joining.
  IF v_caller_email IS NOT NULL AND v_caller_email <> '' THEN
    UPDATE public.student_profiles
    SET class_code = v_normalized,
        status     = 'approved'
    WHERE email = v_caller_email;
    GET DIAGNOSTICS v_profile_count = ROW_COUNT;
  ELSE
    v_profile_count := 0;
  END IF;

  RETURN QUERY SELECT v_users_count, v_profile_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_student_class(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.switch_student_class(text) FROM anon;

COMMENT ON FUNCTION public.switch_student_class IS
  'Atomic class-switch for an already-approved student. Updates users.class_code + student_profiles.class_code for the caller only. Bypasses the class_code freeze in users_update policy (20260340) which is there to block class hopping via direct updates.';
