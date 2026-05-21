-- =============================================================================
-- Translation cache — allow Russian as a target language
-- =============================================================================
-- Phase 0 (20260621000001) shipped translation_cache with a CHECK constraint
-- restricting target_lang to ('en','he','ar'). Now that /api/translate is
-- being wired to consult the cache, Russian (which Gemini already returns
-- alongside Hebrew + Arabic) needs to land in the same table — otherwise
-- the cache only covers 2 of 3 target languages and Russian always pays
-- the AI tax.
--
-- Both source_lang and target_lang relax to ('en','he','ar','ru'). The
-- diff-langs constraint (source ≠ target) is unaffected.
-- =============================================================================

-- Postgres auto-names inline CHECK constraints as <table>_<column>_check.
-- The DO block makes the migration idempotent across environments where the
-- constraint may or may not exist under that name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'translation_cache'
      AND constraint_name = 'translation_cache_target_lang_check'
  ) THEN
    ALTER TABLE public.translation_cache
      DROP CONSTRAINT translation_cache_target_lang_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'translation_cache'
      AND constraint_name = 'translation_cache_source_lang_check'
  ) THEN
    ALTER TABLE public.translation_cache
      DROP CONSTRAINT translation_cache_source_lang_check;
  END IF;
END$$;

ALTER TABLE public.translation_cache
  ADD CONSTRAINT translation_cache_source_lang_check
    CHECK (source_lang IN ('en', 'he', 'ar', 'ru'));

ALTER TABLE public.translation_cache
  ADD CONSTRAINT translation_cache_target_lang_check
    CHECK (target_lang IN ('en', 'he', 'ar', 'ru'));
