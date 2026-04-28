-- =============================================================================
-- SECURITY HIGH FIX: gate save_student_progress (+ batch wrapper) on auth
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.3-1):
--
-- Both `save_student_progress` and `save_student_progress_batch` are
-- SECURITY DEFINER and granted to BOTH `authenticated` AND `anon`.
-- Neither has an `auth.uid() IS NULL` check or any verification that
-- the supplied `p_student_uid` matches the calling user's identity.
--
-- Impact: any HTTP caller (with no auth at all OR with an authenticated
-- session under a DIFFERENT user identity) can fabricate score writes
-- for arbitrary student UIDs via:
--
--   POST /rest/v1/rpc/save_student_progress_batch
--   { "p_batch": [{ "student_uid": "<victim>", "score": 9999, ... }] }
--
-- The 10K per-call score cap inside the upsert (`GREATEST(old, new)`)
-- means the worst case is bumping a victim's score to 10000 once per
-- (assignment_id, mode, class_code) tuple, but it's still grade
-- forgery — pollutes the gradebook, fakes leaderboards, breaks
-- mastery analytics.
--
-- FIX:
--
-- 1. REVOKE EXECUTE from `anon` on both functions.  Postgres role
--    check rejects unauthenticated callers BEFORE the function body
--    runs — defense in depth even if the body checks are bypassed.
--
-- 2. Add `auth.uid() IS NULL` check at the top of both functions.
--
-- 3. Validate that the incoming `p_student_uid` matches the caller's
--    auth.uid()::text — students can only write THEIR OWN progress.
--    Carve-out: Quick Play guest rows (`class_code = 'QUICK_PLAY'`)
--    use the existing trigger relaxation — they keep their `qp:`-
--    prefixed student_uid and don't need to match auth.uid because
--    the QP path doesn't always create an auth.users row (see
--    20260517120000_progress_trigger_allow_qp_guests.sql).
--
-- Backward compat: real-student callers already pass their own UID
-- (verified via grep across hooks/useGameFinish.ts), so they pass
-- the new check unchanged.  QP guests are explicitly exempted.
-- =============================================================================

BEGIN;

-- ─── 1. Revoke anon grants ────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer[], text, jsonb
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.save_student_progress_batch(jsonb)
  FROM anon;

-- ─── 2. Recreate save_student_progress with auth + scope checks ───────
--
-- Drop+recreate keeps the signature byte-for-byte identical so the
-- batch wrapper at line 56 of 20260518_save_progress_batch.sql still
-- routes correctly without needing to re-create that one too.

DROP FUNCTION IF EXISTS public.save_student_progress(
  text, text, uuid, text, integer, text, integer[], text, jsonb
);

CREATE OR REPLACE FUNCTION public.save_student_progress(
  p_student_name text,
  p_student_uid text,
  p_assignment_id uuid,
  p_class_code text,
  p_score integer,
  p_mode text,
  p_mistakes integer[] DEFAULT '{}'::integer[],
  p_avatar text DEFAULT '🦊',
  p_word_attempts jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_caller_uid text;
  v_progress_id uuid;
BEGIN
  v_caller_uid := auth.uid()::text;

  -- Auth gate: reject unauthenticated callers entirely.
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Scope gate: caller can only write THEIR OWN progress.
  -- Carve-out for Quick Play guests whose student_uid is a client-
  -- generated `qp:` prefix and may not have an auth.users row at all
  -- (see 20260517120000_progress_trigger_allow_qp_guests.sql).
  IF p_class_code <> 'QUICK_PLAY' AND p_student_uid <> v_caller_uid THEN
    RAISE EXCEPTION 'Cannot write progress for another student' USING ERRCODE = '42501';
  END IF;

  -- Atomic upsert.  Conflict target matches the unique constraint
  -- uq_progress_assignment_student_mode_class.  GREATEST(old, new)
  -- preserves the student's personal best; play_count increments on
  -- every replay.
  INSERT INTO public.progress (
    student_name, student_uid, assignment_id, class_code,
    score, mode, mistakes, avatar, completed_at, play_count
  ) VALUES (
    p_student_name, p_student_uid, p_assignment_id, p_class_code,
    p_score, p_mode, COALESCE(p_mistakes, '{}'::integer[]), p_avatar, NOW(), 1
  )
  ON CONFLICT ON CONSTRAINT uq_progress_assignment_student_mode_class
  DO UPDATE SET
    score        = GREATEST(public.progress.score, EXCLUDED.score),
    mistakes     = EXCLUDED.mistakes,
    avatar       = EXCLUDED.avatar,
    completed_at = EXCLUDED.completed_at,
    play_count   = public.progress.play_count + 1
  RETURNING id INTO v_progress_id;

  -- Per-word attempts batch (unchanged semantics).
  IF p_word_attempts IS NOT NULL AND jsonb_typeof(p_word_attempts) = 'array' THEN
    INSERT INTO public.word_attempts (
      progress_id, student_uid, class_code, assignment_id, word_id, mode, is_correct
    )
    SELECT
      v_progress_id,
      p_student_uid,
      p_class_code,
      p_assignment_id,
      (elem->>'word_id')::integer,
      p_mode,
      (elem->>'is_correct')::boolean
    FROM jsonb_array_elements(p_word_attempts) AS elem
    WHERE elem ? 'word_id' AND elem ? 'is_correct';
  END IF;

  RETURN v_progress_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer[], text, jsonb
) TO authenticated;

-- ─── 3. Recreate batch wrapper with the same gates ────────────────────

DROP FUNCTION IF EXISTS public.save_student_progress_batch(jsonb);

CREATE OR REPLACE FUNCTION public.save_student_progress_batch(
  p_batch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_caller_uid  text;
  v_result      jsonb := '[]'::jsonb;
  v_elem        jsonb;
  v_progress_id uuid;
  v_uid         text;
  v_class_code  text;
BEGIN
  v_caller_uid := auth.uid()::text;

  -- Auth gate at the wrapper layer (defense in depth — the underlying
  -- single-row RPC also checks, but failing fast here avoids running
  -- N empty INSERTs in the loop body).
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_batch IS NULL OR jsonb_typeof(p_batch) <> 'array' THEN
    RAISE EXCEPTION 'p_batch must be a JSONB array' USING ERRCODE = '22023';
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_batch) LOOP
    v_uid := (v_elem->>'student_uid')::text;
    v_class_code := (v_elem->>'class_code')::text;

    -- Per-row scope gate.  Same QP carve-out as the single-row RPC.
    IF v_class_code <> 'QUICK_PLAY' AND v_uid <> v_caller_uid THEN
      RAISE EXCEPTION 'Cannot batch-write progress for another student (uid=%)', v_uid USING ERRCODE = '42501';
    END IF;

    v_progress_id := public.save_student_progress(
      (v_elem->>'student_name')::text,
      v_uid,
      (v_elem->>'assignment_id')::uuid,
      v_class_code,
      (v_elem->>'score')::integer,
      (v_elem->>'mode')::text,
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_elem->'mistakes'))::integer[],
        '{}'::integer[]
      ),
      COALESCE(v_elem->>'avatar', '🦊'),
      v_elem->'word_attempts'
    );

    v_result := v_result || jsonb_build_object(
      'progress_id', v_progress_id,
      'student_uid', v_uid,
      'mode', v_elem->>'mode'
    );
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_progress_batch(jsonb)
  TO authenticated;

COMMIT;

COMMENT ON FUNCTION public.save_student_progress IS
  'Atomic upsert into progress + append to word_attempts.  Authenticated '
  'callers only.  Caller can only write to their OWN student_uid except '
  'for class_code=''QUICK_PLAY'' (transient guests with no auth.users '
  'row).  Tightened in 20260428130000_security_high_save_progress_auth.';

COMMENT ON FUNCTION public.save_student_progress_batch IS
  'Batched wrapper around save_student_progress.  Same auth + scope '
  'gates as the single-row RPC, applied per batch element.  '
  'Tightened in 20260428130000_security_high_save_progress_auth.';
