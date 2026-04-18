-- ============================================================================
-- Post-audit hardening + performance
--
-- Combines the remaining audit items that fit in a single migration:
--   1. Tighten classes RLS — stop batch-enumeration of codes
--   2. Add a covering index on progress.student_uid
--   3. Validate progress inserts reference a real auth.users row
--   4. Add partial index for the "missed words" analytics query
--
-- None of these change app behaviour when used correctly — they only
-- close abuse paths and speed up the hot analytics queries.
-- ============================================================================

-- ── 1. classes SELECT: drop the blanket USING(true) ────────────────────────
-- Previously any authenticated user could fetch every classes row by passing
-- a list of codes to `.from('classes').select('code, name').in('code', [...])`
-- which sidesteps the rate-limited class_lookup_by_code RPC.
--
-- New policy: only members of the class (teacher or enrolled student) or
-- admins can read directly. Unknown-code lookups must go through the RPC,
-- which is already rate-limited per caller and auth-required.
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated USING (
    teacher_uid = auth.uid()::text
    OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    OR public.is_admin()
  );

COMMENT ON POLICY "classes_select" ON public.classes IS
  'Direct reads limited to class members. Unknown-code discovery must use class_lookup_by_code() RPC (rate-limited).';

-- ── 2. progress.student_uid index ──────────────────────────────────────────
-- The save_student_progress RPC and Quick Play cleanup both filter on
-- student_uid. Without this index Postgres seq-scans the whole progress
-- table for those queries — fine at 100 rows, painful at 100 000.
CREATE INDEX IF NOT EXISTS idx_progress_student_uid
  ON public.progress (student_uid);

-- ── 3. progress insert: require a real auth user ───────────────────────────
-- We can't FK student_uid → auth.users.id directly because student_uid is
-- TEXT (to share the same column between quick-play guests and regular
-- students). Use a trigger instead: reject inserts where student_uid
-- doesn't match the auth.users row making the call.  Anonymous Supabase
-- sessions still count — they have a real auth row.
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

  -- We do NOT require student_uid = auth.uid() here — the save_student_progress
  -- RPC runs as service role and legitimately inserts on the student's behalf.
  -- Instead just verify the uid corresponds to a real auth user, catching
  -- client-side bugs that would otherwise create orphan rows.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id::text = NEW.student_uid) THEN
    RAISE EXCEPTION 'progress.student_uid % does not reference a real auth user', NEW.student_uid
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_progress_student_uid_check ON public.progress;
CREATE TRIGGER trg_progress_student_uid_check
  BEFORE INSERT ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.ensure_progress_student_exists();

COMMENT ON FUNCTION public.ensure_progress_student_exists IS
  'Rejects progress rows whose student_uid does not match any auth.users row. Prevents orphans without requiring a literal FK.';

-- ── 4. word_attempts: partial index for "missed words" analytics ──────────
-- Teacher dashboard queries `WHERE class_code = ? AND is_correct = false`
-- to find which words the class struggles with most. A full index on
-- (class_code, word_id) exists, but adding a partial index on just the
-- is_correct = false rows makes the scan smaller and faster, especially
-- once word_attempts reaches millions of rows.
CREATE INDEX IF NOT EXISTS idx_word_attempts_missed
  ON public.word_attempts (class_code, word_id)
  WHERE is_correct = FALSE;
