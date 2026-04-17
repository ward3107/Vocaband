-- ============================================================================
-- Public class-lookup RPC so the "switch class" flow works for students
-- who aren't yet members of the target class.
--
-- Context: RLS on public.classes (correctly) prevents non-members from
-- reading class rows. That's fine for security, but breaks the UX where
-- a student clicks an invite link `?class=ABCD1234` — the OAuth callback
-- needs to VERIFY the code resolves to a real class before offering the
-- switch-class confirmation modal. Without this RPC, a valid code the
-- student hasn't joined yet is reported as "Class not found".
--
-- This function returns ONLY {code, name} — no teacher uid, no student
-- roster, nothing the caller shouldn't see. SECURITY DEFINER means it
-- runs with table-owner privileges, bypassing RLS for this narrow read.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (code text, name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.code, c.name
  FROM public.classes c
  WHERE c.code = upper(trim(p_code))
  LIMIT 1;
$$;

-- Allow any authenticated user (student or teacher) + anon to call it.
-- Safe: only exposes code + name (both already visible to anyone with
-- an invite link).
GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated, anon;
