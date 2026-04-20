-- Expand class_lookup_by_code to return fields the student-login flow needs.
--
-- Background: migration 20260430 tightened the classes SELECT RLS to only
-- allow teachers + enrolled students. That's correct for security but
-- broke handleStudentLogin, which does a direct
--   .from('classes').select('id,name,code,teacher_uid,avatar').eq('code', X)
-- BEFORE the users row is created for the new anonymous student. The
-- query returned empty and the app showed "Invalid Class Code!" for real
-- classes. Same issue hit the email/password + OAuth class-switch flows
-- — they called this RPC but the old return type (code, name) was too
-- narrow to rebuild a full ClassData object on the client.
--
-- Fix: widen the RPC to return id + avatar so callers can use its output
-- as the class source of truth without needing a follow-up SELECT. We
-- explicitly DO NOT return teacher_uid — students don't need it and it
-- stays protected by RLS.
--
-- Keeps: auth.uid() required + 30/min per-caller rate limit from 20260428.

DROP FUNCTION IF EXISTS public.class_lookup_by_code(text);

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (id uuid, code text, name text, avatar text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid      TEXT := auth.uid()::text;
  recent_calls    INTEGER;
  LIMIT_PER_MINUTE CONSTANT INTEGER := 30;
  normalized      TEXT := upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Housekeeping: delete rows older than 5 minutes so the ledger stays tiny.
  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  -- Per-uid window check: block obvious scripted brute-force.
  SELECT COUNT(*) INTO recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = class_lookup_by_code.caller_uid
    AND called_at > now() - INTERVAL '1 minute';

  IF recent_calls >= LIMIT_PER_MINUTE THEN
    RAISE EXCEPTION 'Rate limit exceeded for class lookup' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (caller_uid);

  RETURN QUERY
  SELECT c.id, c.code, c.name, c.avatar
  FROM public.classes c
  WHERE c.code = normalized
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.class_lookup_by_code(text) FROM anon;

COMMENT ON FUNCTION public.class_lookup_by_code IS
  'Returns {id, code, name, avatar} for a class by code. Auth required + 30/min per-caller rate limit. Strips whitespace and upper-cases the input so "mg2 zqpla" resolves to "MG2ZQPLA".';
