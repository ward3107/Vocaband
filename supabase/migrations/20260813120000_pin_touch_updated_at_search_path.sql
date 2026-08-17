-- ---------------------------------------------------------------------------
-- Pin search_path on public.touch_updated_at()
--
-- Supabase's security advisor flags this as `function_search_path_mutable`.
-- It is the ONLY function still flagged: the May-2026 blanket lock
-- (20260517115055_lock_function_search_paths.sql) pinned 23 functions, but
-- touch_updated_at() was introduced later, by 20260621000000_vocabulary_library.sql,
-- and shipped without `SET search_path`.
--
-- Why it matters: a function with a role-mutable search_path resolves
-- unqualified names against whatever the CALLER's search_path says. A caller
-- who can create objects in a schema earlier on that path can shadow a builtin
-- (e.g. now()) and have their version run inside the trigger. This body is
-- tiny and calls only now(), so the practical risk is low — but the whole
-- point of the earlier blanket lock was to make "no mutable search_path" an
-- invariant, and one unpinned function erodes it.
--
-- Idempotent: CREATE OR REPLACE keeps the existing triggers
-- (trg_vc_touch and the other updated_at keepers) bound to this function —
-- replacing a function body does not drop dependent triggers. Behaviour is
-- byte-identical; only the search_path binding changes.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
