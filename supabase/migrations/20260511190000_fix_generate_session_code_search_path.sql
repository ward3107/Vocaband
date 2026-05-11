-- Hotfix: Quick Play session creation broken after 20260510120000.
--
-- That migration set search_path='' on create_quick_play_session for
-- security, but generate_session_code (called by it) uses unqualified
-- gen_random_bytes() which lives in the `extensions` schema. The empty
-- search_path propagates through the SECURITY DEFINER call chain,
-- causing "function gen_random_bytes(integer) does not exist" when the
-- Quick Play setup wizard tries to create a session.
--
-- Fix: pin search_path on generate_session_code AND schema-qualify the
-- extensions function. Both — defense in depth so the function works
-- regardless of which caller's search_path is in effect.
--
-- Already applied to prod 2026-05-11 via Supabase MCP. Smoke test:
--   SELECT public.generate_session_code();
-- returns a 6-char code as expected.

CREATE OR REPLACE FUNCTION public.generate_session_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  chars_len INTEGER := length(chars);
  code TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
  random_bytes BYTEA;
BEGIN
  WHILE attempts < max_attempts LOOP
    -- gen_random_bytes lives in the `extensions` schema (pgcrypto).
    -- Schema-qualify it so this works regardless of search_path.
    random_bytes := extensions.gen_random_bytes(6);
    code := '';
    FOR i IN 0..5 LOOP
      code := code || SUBSTRING(chars FROM (get_byte(random_bytes, i) % chars_len) + 1 FOR 1);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM public.quick_play_sessions
      WHERE session_code = code AND is_active = true
    ) THEN
      RETURN code;
    END IF;

    attempts := attempts + 1;
  END LOOP;

  RAISE EXCEPTION 'Failed to generate unique session code';
END;
$function$;
