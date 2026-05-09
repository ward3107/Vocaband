-- =============================================================================
-- Fix: classes_insert RLS hits "infinite recursion detected"
-- =============================================================================
-- Problem: migration 20260509131939_enforce_pro_gates_server_side added a
-- "first class is free" gate to the classes_insert WITH CHECK clause:
--
--   is_pro_or_trialing()
--   OR ((SELECT count(*) FROM classes c2 WHERE c2.teacher_uid = ...) = 0)
--
-- The subquery reads from classes inside an INSERT policy on classes itself.
-- Postgres applies the classes_select policy to that subquery and detects
-- the cyclic policy reference, raising:
--
--   ERROR: infinite recursion detected in policy for relation "classes"
--
-- Symptom: freemium teachers complete OAuth + users.upsert successfully
-- (after 20260509122855) but every class creation attempt fails with the
-- recursion error.  Two such errors observed in postgres logs around
-- 2026-05-09T15:01Z.
--
-- Solution: move the class count behind a SECURITY DEFINER helper so the
-- inner read bypasses RLS.  The helper is scoped to a single uid arg and
-- returns only a bigint -- no row data leaks.  The policy still ties the
-- caller to (auth.uid())::text, so a teacher can only test their own count.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.teacher_class_count(p_uid text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT count(*) FROM public.classes WHERE teacher_uid = p_uid
$$;

REVOKE ALL ON FUNCTION public.teacher_class_count(text) FROM public;
GRANT EXECUTE ON FUNCTION public.teacher_class_count(text) TO authenticated;

DROP POLICY IF EXISTS classes_insert ON public.classes;

CREATE POLICY classes_insert ON public.classes
  FOR INSERT
  WITH CHECK (
    (auth.uid())::text = teacher_uid
    AND is_teacher()
    AND (
      is_pro_or_trialing()
      OR public.teacher_class_count((auth.uid())::text) = 0
    )
  );

COMMENT ON POLICY classes_insert ON public.classes IS
  'Teacher can insert a class scoped to their own uid. Pro/trialing teachers have no cap; freemium teachers get one free class. Count is read via SECURITY DEFINER helper to avoid RLS recursion on classes.';

COMMENT ON FUNCTION public.teacher_class_count(text) IS
  'Returns the number of classes owned by a given teacher uid. SECURITY DEFINER so it can be called from the classes_insert WITH CHECK without re-entering classes RLS (which causes infinite recursion).';
