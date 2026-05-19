-- Hotfix: worksheet creation broken — "function gen_random_bytes(integer)
-- does not exist", and a second latent bug behind it.
--
-- generate_worksheet_slug() (introduced in 20260616000000) had two bugs
-- that made worksheet creation impossible:
--
-- 1. SET search_path = public + unqualified gen_random_bytes(8). pgcrypto
--    lives in the `extensions` schema on Supabase, so the locked
--    search_path can't see it. Same shape as 20260511190000's fix for
--    generate_session_code. Fix: schema-qualify as extensions.gen_random_bytes.
--
-- 2. The uniqueness check `WHERE interactive_worksheets.slug = slug` is
--    ambiguous to plpgsql — the local variable `slug` shadows the column
--    name in the resolver, raising 42702. Never triggered in prod because
--    bug #1 errored first. Fix: rename the variable to v_slug.

CREATE OR REPLACE FUNCTION public.generate_worksheet_slug()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars      TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  charcount  INT := length(chars);
  v_slug     TEXT;
  attempts   INT := 0;
  rand_bytes BYTEA;
BEGIN
  WHILE attempts < 10 LOOP
    v_slug := '';
    -- gen_random_bytes lives in the `extensions` schema (pgcrypto).
    -- Schema-qualify it so this works regardless of search_path.
    rand_bytes := extensions.gen_random_bytes(8);
    FOR i IN 1..8 LOOP
      v_slug := v_slug || SUBSTRING(
        chars
        FROM ((get_byte(rand_bytes, i - 1) % charcount) + 1)
        FOR 1
      );
    END LOOP;
    IF NOT EXISTS (
      SELECT 1 FROM public.interactive_worksheets
      WHERE interactive_worksheets.slug = v_slug
    ) THEN
      RETURN v_slug;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  RAISE EXCEPTION 'Failed to generate unique worksheet slug after 10 attempts';
END;
$$;

COMMENT ON FUNCTION public.generate_worksheet_slug() IS
  '8-char Crockford-alphabet slug from extensions.gen_random_bytes() — CSPRNG, ~40 bits.';
