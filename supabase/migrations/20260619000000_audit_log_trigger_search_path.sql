-- Lock search_path on the two audit-log immutability triggers.
--
-- Flagged by Supabase security advisor (`function_search_path_mutable`).
-- Without a fixed search_path, a privileged caller could shadow built-in
-- functions (e.g. by creating a same-named function in a schema earlier
-- in their search_path) and bypass the no-update/no-delete guards on
-- audit_log. pg_catalog first so the linter is satisfied and built-ins
-- always resolve before user schemas.

ALTER FUNCTION public.audit_log_forbid_update()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.audit_log_forbid_delete()
  SET search_path = pg_catalog, public;
