-- Scaling pass — 2026-05-11 (chunk C)
-- Drop genuinely-redundant unused indexes to reduce write amplification.
--
-- Conservative scope: ONLY indexes where we can verify they're either
-- strictly redundant (another index covers the same query) or never
-- queryable from the codebase. PK / UNIQUE constraint indexes and
-- FK-covering indexes are KEPT even when flagged unused, because they
-- support constraint checks and cascade operations.
--
-- Already applied to production 2026-05-11 via Supabase MCP.

BEGIN;

-- Redundant with word_corrections_word_id_corrected_by_key UNIQUE INDEX
-- on (word_id, corrected_by). Postgres uses the leading column of a
-- composite index for single-column lookups, so this dedicated single-
-- column index adds write cost without any read benefit.
DROP INDEX IF EXISTS public.idx_word_corrections_word_id;

-- audit_log is append-only at our scale; queries by actor_uid are rare
-- enough that a full scan of a small table is faster than index lookup.
-- If we later add an actor-filtered audit-log dashboard, recreate.
DROP INDEX IF EXISTS public.idx_audit_log_actor;

-- No code path filters quick_play_sessions by the allowed_modes array.
-- Index was speculatively added but never queried.
DROP INDEX IF EXISTS public.idx_quick_play_allowed_modes;

COMMIT;
