-- 20260618000000_class_background_color.sql
--
-- Per-class background color: lets a teacher tint each classroom card
-- on the teacher dashboard with a distinct color so multiple classes
-- are visually distinguishable at a glance.  Stored as a hex string
-- (e.g. '#fde68a') or NULL when the teacher wants the default theme
-- surface color (legacy behaviour).
--
-- Nullable: every existing class reads as NULL until the teacher picks
-- a color via Edit Class, so the migration is non-destructive.
--
-- Length cap: 9 chars covers '#rrggbbaa' (hex with alpha) plus a
-- leading '#'; we don't need named colors or rgb()/hsl() because the
-- picker only emits hex.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS background_color TEXT;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_background_color_format
    CHECK (
      background_color IS NULL
      OR background_color ~ '^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$'
    );

-- No new index needed — this is display-only.

-- ---------------------------------------------------------------------------
-- Extend class_lookup_by_code so the student class-join screen can
-- preview the teacher's chosen color before the student commits.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.class_lookup_by_code(text);

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  avatar text,
  school_name text,
  school_logo_url text,
  background_color text
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
  SELECT c.id, c.code, c.name, c.avatar, c.school_name, c.school_logo_url, c.background_color
  FROM public.classes c
  WHERE c.code = v_normalized
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.class_lookup_by_code(text) FROM anon;

COMMENT ON FUNCTION public.class_lookup_by_code IS
  'Returns {id, code, name, avatar, school_name, school_logo_url, background_color} for a class by code. Auth required + 30/min per-caller rate limit. See 20260618000000_class_background_color.';
