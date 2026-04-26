-- =============================================================================
-- Word Translation Corrections
-- =============================================================================
-- Allows teachers to correct inaccurate Hebrew/Arabic translations
-- Teachers can suggest improvements that override the hardcoded translations

-- Create table for storing translation corrections
CREATE TABLE IF NOT EXISTS public.word_corrections (
  id BIGSERIAL PRIMARY KEY,
  word_id INTEGER NOT NULL, -- References the word ID from vocabulary.ts
  english TEXT NOT NULL, -- Original English word (for reference)
  hebrew TEXT, -- Corrected Hebrew translation (null if not corrected)
  arabic TEXT, -- Corrected Arabic translation (null if not corrected)
  corrected_by UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Who made the correction
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(word_id, corrected_by) -- One correction per word per user
);

-- Enable RLS
ALTER TABLE public.word_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own corrections
DROP POLICY IF EXISTS "Users can view own corrections" ON public.word_corrections;
CREATE POLICY "Users can view own corrections"
  ON public.word_corrections
  FOR SELECT
  TO authenticated
  USING (corrected_by = auth.uid());

-- Policy: Users can insert their own corrections
DROP POLICY IF EXISTS "Users can insert own corrections" ON public.word_corrections;
CREATE POLICY "Users can insert own corrections"
  ON public.word_corrections
  FOR INSERT
  TO authenticated
  WITH CHECK (corrected_by = auth.uid());

-- Policy: Users can update their own corrections
DROP POLICY IF EXISTS "Users can update own corrections" ON public.word_corrections;
CREATE POLICY "Users can update own corrections"
  ON public.word_corrections
  FOR UPDATE
  TO authenticated
  USING (corrected_by = auth.uid())
  WITH CHECK (corrected_by = auth.uid());

-- Policy: Users can delete their own corrections
DROP POLICY IF EXISTS "Users can delete own corrections" ON public.word_corrections;
CREATE POLICY "Users can delete own corrections"
  ON public.word_corrections
  FOR DELETE
  TO authenticated
  USING (corrected_by = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_word_corrections_word_id ON public.word_corrections(word_id);
CREATE INDEX IF NOT EXISTS idx_word_corrections_corrected_by ON public.word_corrections(corrected_by);

-- Function to get word with user's corrections applied
DROP FUNCTION IF EXISTS public.get_word_with_corrections(INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_word_with_corrections(
  p_word_id INTEGER,
  p_default_hebrew TEXT,
  p_default_arabic TEXT
)
RETURNS TABLE (
  word_id INTEGER,
  english TEXT,
  hebrew TEXT,
  arabic TEXT,
  corrected BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(wc.word_id, p_word_id) as word_id,
    COALESCE(wc.english, '') as english,
    COALESCE(wc.hebrew, p_default_hebrew) as hebrew,
    COALESCE(wc.arabic, p_default_arabic) as arabic,
    CASE WHEN wc.id IS NOT NULL THEN true ELSE false END as corrected
  FROM (SELECT p_word_id as word_id) base_id
  LEFT JOIN public.word_corrections wc
    ON wc.word_id = p_word_id
    AND wc.corrected_by = auth.uid();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_word_with_corrections(INTEGER, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.word_corrections IS 'Stores teacher corrections for word translations';
COMMENT ON FUNCTION public.get_word_with_corrections IS 'Returns word with user corrections applied (hebrew/arabic)';
