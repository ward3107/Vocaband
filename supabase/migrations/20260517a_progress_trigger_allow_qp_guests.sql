-- =============================================================================
-- progress: relax the student-uid auth check for Quick Play rows
-- =============================================================================
--
-- Background: migration 20260430_hardening_and_perf.sql installed an
-- AFTER-trigger-style guard via `ensure_progress_student_exists` that
-- rejects any progress INSERT whose student_uid doesn't reference a real
-- auth.users row.  That guard is the right call for class-assignment
-- rows (real students with real accounts), but Quick Play students are
-- transient guests — when anonymous sign-ins are disabled in the
-- Supabase project (default-off in some org templates) or blocked by a
-- private-browsing session, the QP join flow completes without an
-- auth.users row at all.  The 2026-04-25 audit found EVERY persist
-- attempt from `save_student_progress` was being silently dropped at
-- the trigger because no Quick Play student had an auth.users entry.
--
-- Fix: allow rows where class_code = 'QUICK_PLAY' to use any
-- non-empty student_uid (e.g. the client-side localStorage UUID
-- prefixed `qp:`).  All other class_codes still require a matching
-- auth.users row, so the trigger's original purpose — preventing
-- orphan progress writes from a buggy classroom client — is unchanged.
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

  -- Quick Play guests skip the auth-user check.  These rows always
  -- carry class_code = 'QUICK_PLAY' (set by the QP persist path on
  -- the server) and student_uid is either the student's anon auth
  -- uid OR a synthetic 'qp:<clientId>' fallback when anon auth was
  -- unavailable — both are safe because nothing else reads QP rows
  -- by joining on auth.users.
  IF NEW.class_code = 'QUICK_PLAY' THEN
    RETURN NEW;
  END IF;

  -- Non-QP rows keep the original guard.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id::text = NEW.student_uid) THEN
    RAISE EXCEPTION 'progress.student_uid % does not reference a real auth user', NEW.student_uid
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_progress_student_exists IS
  'Rejects orphan progress rows.  Skips the auth.users check for class_code=QUICK_PLAY rows so transient anon-less Quick Play guests can be persisted by the server-side TEACHER_END flow.';
