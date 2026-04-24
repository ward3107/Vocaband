-- =============================================================================
-- Add Russian translation column to word_corrections
-- =============================================================================
-- The /api/translate endpoint now produces Hebrew + Arabic + Russian via
-- Gemini.  Teachers asked for Russian support so immigrant-background
-- students can see their first-language gloss next to the English
-- prompt.  Extending the correction store lets Russian translations
-- persist across future assignments the same way Hebrew + Arabic
-- already do.

ALTER TABLE public.word_corrections
  ADD COLUMN IF NOT EXISTS russian TEXT;

COMMENT ON COLUMN public.word_corrections.russian IS
  'Corrected Russian translation (nullable — filled when the teacher supplies one).';
