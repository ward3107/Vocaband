-- Fix the "column reference caller_uid is ambiguous" error in
-- class_lookup_by_code. The function declared a local variable
-- `caller_uid` AND later queried the `class_lookup_rate` table which
-- also has a column named `caller_uid`:
--
--   DECLARE caller_uid TEXT := auth.uid()::text;
--   ...
--   SELECT COUNT(*) INTO recent_calls
--   FROM public.class_lookup_rate
--   WHERE caller_uid = class_lookup_by_code.caller_uid;
--
-- Postgres raises 42702 "ambiguous column reference" because the bare
-- `caller_uid` on the left side could be either the local variable or
-- the table column. The surfacing-errors work the client just shipped
-- made this visible — students saw "not found (lookup failed: column
-- reference caller_uid is ambiguous)" instead of silent failure.
--
-- Fix: rename the local variable to v_caller_uid so the table column
-- name is unambiguous. Keeps the same rate-limit behaviour, same
-- 30/min ceiling, same return shape.

DROP FUNCTION IF EXISTS public.class_lookup_by_code(text);

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (id uuid, code text, name text, avatar text)
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
  SELECT c.id, c.code, c.name, c.avatar
  FROM public.classes c
  WHERE c.code = v_normalized
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.class_lookup_by_code(text) FROM anon;

COMMENT ON FUNCTION public.class_lookup_by_code IS
  'Returns {id, code, name, avatar} for a class by code. Auth required + 30/min per-caller rate limit. Whitespace stripped + upper-cased server-side. Fixed in 20260505 to use v_-prefixed local vars so the WHERE clause is unambiguous.';
