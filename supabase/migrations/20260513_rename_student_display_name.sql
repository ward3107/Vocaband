-- ============================================================================
-- Rename the calling student's display name.
--
-- Students who OAuth into a class inherit their Google display name
-- ("Daniel Cohen"). Some want a pen name for the leaderboard
-- ("DanielTheDestroyer"). Without this RPC, the client would need to
-- update both student_profiles.display_name AND users.display_name in
-- two round-trips, and RLS on users.display_name is restrictive
-- (users_update policy freezes many fields for non-admins).
--
-- SECURITY DEFINER so the function can touch both tables atomically
-- on behalf of the caller. Both updates are gated on the row belonging
-- to auth.uid() — a student cannot rename anyone but themselves.
--
-- Validation:
--   * length 1..30 after trim
--   * rejects control characters
--   * trims whitespace from both ends
--   * collapses internal runs of whitespace to a single space
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rename_student_display_name(
  p_new_name TEXT
)
RETURNS public.student_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_clean_name TEXT;
  v_updated    public.student_profiles;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Normalize: trim ends, collapse internal whitespace to one space.
  v_clean_name := regexp_replace(btrim(p_new_name), '\s+', ' ', 'g');

  IF v_clean_name IS NULL OR length(v_clean_name) < 1 THEN
    RAISE EXCEPTION 'name_too_short';
  END IF;

  IF length(v_clean_name) > 30 THEN
    RAISE EXCEPTION 'name_too_long';
  END IF;

  -- Reject control characters (0x00-0x1f). Tab, newline etc. shouldn't
  -- land in a display name.
  IF v_clean_name ~ '[\x00-\x1f]' THEN
    RAISE EXCEPTION 'invalid_characters';
  END IF;

  -- Update student_profiles first. The WHERE clause is the gate: a
  -- student can only rename the row whose auth_uid matches them.
  UPDATE public.student_profiles
  SET display_name = v_clean_name
  WHERE auth_uid = v_caller_uid::text
  RETURNING * INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Mirror into users so XP / leaderboard / teacher views pick up the
  -- new name on next fetch. Scoped to the same caller uid.
  UPDATE public.users
  SET display_name = v_clean_name
  WHERE uid = v_caller_uid::text;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.rename_student_display_name IS
  'Lets the calling student change their display_name atomically across student_profiles + users. Validates length (1..30) and rejects control characters. Raises name_too_short / name_too_long / invalid_characters / profile_not_found / not_authenticated on failure.';

-- Allow any authenticated user to call. The function itself checks the
-- student owns the profile via auth.uid() = auth_uid.
GRANT EXECUTE ON FUNCTION public.rename_student_display_name(TEXT) TO authenticated;
