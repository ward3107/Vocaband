-- =============================================================================
-- vocabulary_set_word_sentences — add `kind` column
-- =============================================================================
-- Phase 4d: AI sentence generation needs to distinguish full sentences
-- ("The brave lion roared in the jungle.") from fill-in-the-blank
-- variants ("The brave ______ roared in the jungle.").  Both forms
-- share the same word_id + level metadata; only the rendered text and
-- the kind differ.
--
-- Schema-wise this is purely additive — existing rows default to
-- 'sentence' so any code that pre-dates this migration keeps working
-- unchanged.  `kind` is a small enum that we'll extend later (cloze,
-- question, etc.) without another schema change because new values
-- just relax the CHECK.
-- =============================================================================

ALTER TABLE public.vocabulary_set_word_sentences
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'sentence'
    CHECK (kind IN ('sentence', 'fill_blank'));

-- The primary-uniqueness invariant from the original migration ("exactly
-- one primary row per word") was scoped to (word_id) when only
-- 'sentence' rows existed. Now that we have two kinds, a teacher may
-- want one primary sentence AND one primary fill-in-the-blank per word
-- — both rendered in the worksheet output, just from different slots.
-- Re-scope the partial unique index to include `kind`.

DROP INDEX IF EXISTS idx_vsws_word_primary;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vsws_word_kind_primary
  ON public.vocabulary_set_word_sentences (word_id, kind)
  WHERE is_primary = TRUE;
