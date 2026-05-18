-- ============================================
-- Worksheet archive — soft-delete that preserves attempts
-- ============================================
-- Teachers asked for two cleanup paths on the worksheet results dashboard:
--
--   * Archive: hide from the active list AND kill the public link so
--     students can't keep submitting, but keep the submitted attempts
--     for later review/grading. Reversible.
--   * Delete: nuke the worksheet AND cascade-delete all attempts.
--     Irreversible. Already shipped via revoke_my_worksheet().
--
-- This migration adds the archive half: a nullable archived_at column,
-- a teacher-scoped SELECT policy so owners can still see their own
-- archived rows, an update to the public read policy so students can't,
-- and a set_worksheet_archived() RPC mirroring the auth model of
-- revoke_my_worksheet() (auth.uid() for signed-in owners, fingerprint
-- for anonymous mints).

ALTER TABLE public.interactive_worksheets
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.interactive_worksheets.archived_at IS
  'Set when the owner archives the worksheet. Hides from the public/student read path and from the teacher''s active list, but preserves all submitted attempts. NULL = active.';

-- Partial index — the dashboard''s "active worksheets for teacher X"
-- query is the hot path. WHERE archived_at IS NULL keeps the index
-- small even after many archives accumulate.
CREATE INDEX IF NOT EXISTS idx_interactive_worksheets_teacher_active
  ON public.interactive_worksheets (teacher_uid, created_at DESC)
  WHERE teacher_uid IS NOT NULL AND archived_at IS NULL;

-- ── SELECT policies ────────────────────────────────────────────────────
-- Tighten the public read so archived rows return as if expired —
-- /w/<slug> shows "worksheet not found or expired" once the teacher
-- archives. Anonymous mints with no owner can't be archived (the RPC
-- requires fingerprint match), so unauth users only ever see active
-- non-expired rows through this policy.
DROP POLICY IF EXISTS "Anyone can read interactive worksheets"
  ON public.interactive_worksheets;
CREATE POLICY "Anyone can read interactive worksheets"
  ON public.interactive_worksheets FOR SELECT
  USING (expires_at > NOW() AND archived_at IS NULL);

-- New owner policy — RLS OR-combines policies, so the owner still sees
-- their own archived/expired rows in the dashboard via this one.
DROP POLICY IF EXISTS "Owners can read own worksheets"
  ON public.interactive_worksheets;
CREATE POLICY "Owners can read own worksheets"
  ON public.interactive_worksheets FOR SELECT
  USING (
    teacher_uid IS NOT NULL
    AND (SELECT auth.uid())::text = teacher_uid
  );

-- ── set_worksheet_archived RPC ─────────────────────────────────────────
-- Toggle archived_at on a worksheet the caller can prove they own.
-- Two acceptance paths, same as revoke_my_worksheet():
--   1. auth.uid() matches teacher_uid (logged-in owner);
--   2. p_fingerprint matches minter_fingerprint AND teacher_uid IS NULL
--      (anonymous mint owned by this browser).
-- Returns TRUE on a successful flip, FALSE when the caller can''t prove
-- ownership or the slug doesn''t exist.
CREATE OR REPLACE FUNCTION public.set_worksheet_archived(
  p_slug        TEXT,
  p_archived    BOOLEAN,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_fp  TEXT := NULLIF(p_fingerprint, '');
  v_updated INT;
BEGIN
  IF p_slug IS NULL OR length(p_slug) = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.interactive_worksheets
     SET archived_at = CASE WHEN p_archived THEN NOW() ELSE NULL END
   WHERE slug = p_slug
     AND (
       (v_uid IS NOT NULL AND teacher_uid IS NOT NULL AND teacher_uid = v_uid)
       OR
       (v_fp IS NOT NULL
         AND teacher_uid IS NULL
         AND minter_fingerprint = v_fp)
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_worksheet_archived(TEXT, BOOLEAN, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.set_worksheet_archived IS
  'Flips archived_at on a worksheet the caller owns (auth.uid() = teacher_uid OR fingerprint = minter_fingerprint on an anonymous mint). Returns TRUE on success, FALSE otherwise.';
