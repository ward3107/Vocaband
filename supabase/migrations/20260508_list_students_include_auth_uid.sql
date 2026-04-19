-- Add auth_uid to list_students_in_class so the Analytics → Reward flow
-- knows which public.users row to award XP / badges / titles to.
--
-- Symptom: teacher taps "Reward" on a student from the Analytics view
-- and gets one of:
--   * Toast "<name> hasn't created an account yet — can't receive rewards"
--   * Silent no-op or a generic "Failed to give reward" toast
--   * award_reward RPC 400 with "Student not found"
-- depending on which branch the undefined auth_uid falls into on the
-- client.
--
-- Root cause: list_students_in_class (20260333) returns only
-- {id, display_name, xp, avatar, status}. The Analytics view reads
-- student.auth_uid from that response to build a lookup map; it's
-- always undefined; every reward attempt fails.
--
-- Fix: also return student_profiles.auth_uid (nullable — some pending
-- profiles don't have one yet). Client already treats uid === null as
-- "can't reward this student" so the extra column is additive.

DROP FUNCTION IF EXISTS public.list_students_in_class(TEXT);

CREATE OR REPLACE FUNCTION public.list_students_in_class(p_class_code TEXT)
RETURNS TABLE (
  id UUID,
  auth_uid UUID,
  display_name TEXT,
  xp INTEGER,
  avatar TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.auth_uid,
    sp.display_name,
    sp.xp,
    sp.avatar,
    sp.status
  FROM public.student_profiles sp
  WHERE sp.class_code = p_class_code
    AND sp.status = 'approved'
  ORDER BY sp.display_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_students_in_class(TEXT) TO authenticated, anon;

COMMENT ON FUNCTION public.list_students_in_class IS
  'List approved students in a class — returns auth_uid so the Analytics reward modal can map display_name → public.users.uid when calling award_reward.';
