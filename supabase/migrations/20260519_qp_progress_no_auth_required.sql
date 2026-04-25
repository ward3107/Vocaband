-- =============================================================================
-- progress trigger: skip the auth.users existence check for QUICK_PLAY rows
-- =============================================================================
--
-- Background: migration 20260430 added a BEFORE-INSERT trigger
-- `ensure_progress_student_exists` to public.progress that requires
-- `NEW.student_uid` to match a row in auth.users.  That's the right
-- thing for regular classroom assignments — student_uid is the
-- Supabase auth uid for an account, the trigger catches client-side
-- bugs that would orphan rows.
--
-- But Quick Play sessions ship with `class_code = 'QUICK_PLAY'` and
-- the student is a transient guest.  V2 expected them to sign in
-- anonymously, but that can fail silently (anonymous sign-ins
-- disabled in the project, private browsing, captive Wi-Fi).  When
-- it does, the persist-on-end path tries to write the row with a
-- synthetic uid (the localStorage clientId) and the trigger blocks
-- it — teacher's gradebook stays empty even though students played
-- and scored.
--
-- Fix: skip the auth-user check for class_code = 'QUICK_PLAY' rows.
-- Regular assignments still get the trigger's protection.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_progress_student_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.student_uid IS NULL OR char_length(NEW.student_uid) = 0 THEN
    RAISE EXCEPTION 'progress.student_uid cannot be null' USING ERRCODE = '23502';
  END IF;

  -- Quick Play students are transient guests.  Their student_uid is a
  -- localStorage-derived UUID, not necessarily an auth.users row.
  -- Skip the existence check for these rows so the persist-on-end
  -- path can land scores even when anon sign-in failed.
  IF NEW.class_code = 'QUICK_PLAY' THEN
    RETURN NEW;
  END IF;

  -- We do NOT require student_uid = auth.uid() here — the
  -- save_student_progress RPC runs as service role and legitimately
  -- inserts on the student's behalf.  Instead just verify the uid
  -- corresponds to a real auth user, catching client-side bugs that
  -- would otherwise create orphan rows.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id::text = NEW.student_uid) THEN
    RAISE EXCEPTION 'progress.student_uid % does not reference a real auth user', NEW.student_uid
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_progress_student_exists IS
  'Rejects progress rows whose student_uid does not match any auth.users row, '
  'EXCEPT for class_code=''QUICK_PLAY'' rows whose uid is a transient guest id.  '
  'Regular assignment rows still get the orphan-row protection.';
