-- 20260512_school_branding.sql
--
-- Per-class school branding: lets a teacher attach their school name +
-- logo to a class so the class card, student class-join screen, and
-- live-challenge podium can display them.  Selling point for the
-- multi-school pitch — each school appears "white-labelled" without
-- any infra work on our side.
--
-- Both columns are nullable: every existing class reads as NULL until
-- the teacher fills them in, so the migration is non-destructive and
-- the app continues to render with the existing class-avatar fallback
-- where these aren't set.
--
-- Limits:
--   school_name      — up to 100 chars (matches the existing class.name limit shape)
--   school_logo_url  — up to 500 chars (long enough for Supabase Storage signed URLs)

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS school_name      TEXT,
  ADD COLUMN IF NOT EXISTS school_logo_url  TEXT;

-- Constrain lengths defensively.  We accept NULL but reject pathological
-- multi-KB blobs that would only ever arrive via a misuse of the API.
ALTER TABLE public.classes
  ADD CONSTRAINT classes_school_name_len
    CHECK (school_name IS NULL OR char_length(school_name) <= 100),
  ADD CONSTRAINT classes_school_logo_url_len
    CHECK (school_logo_url IS NULL OR char_length(school_logo_url) <= 500);

-- No new index needed — neither field is queried on, just displayed.

-- ---------------------------------------------------------------------------
-- Extend class_lookup_by_code to return the new branding fields so the
-- student class-join screen can show the school logo + name before the
-- student commits to joining (last seen confirmation: "yes, this is my
-- school").  RPC is the only path students have to read a class row
-- (RLS forbids direct SELECT for non-enrolled students).
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.class_lookup_by_code(text);

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  avatar text,
  school_name text,
  school_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid    TEXT := auth.uid()::text;
  v_recent_calls  INTEGER;
  LIMIT_PER_MINUTE CONSTANT INTEGER := 30;
  v_normalized    TEXT := upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = v_caller_uid
    AND called_at > now() - INTERVAL '1 minute';

  IF v_recent_calls >= LIMIT_PER_MINUTE THEN
    RAISE EXCEPTION 'Rate limit exceeded for class lookup' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (v_caller_uid);

  RETURN QUERY
  SELECT c.id, c.code, c.name, c.avatar, c.school_name, c.school_logo_url
  FROM public.classes c
  WHERE c.code = v_normalized
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.class_lookup_by_code(text) FROM anon;

COMMENT ON FUNCTION public.class_lookup_by_code IS
  'Returns {id, code, name, avatar, school_name, school_logo_url} for a class by code. Auth required + 30/min per-caller rate limit. School-branding fields nullable. See 20260512_school_branding.';
