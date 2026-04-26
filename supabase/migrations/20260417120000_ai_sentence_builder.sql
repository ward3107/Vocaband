-- Per-teacher AI access control (like teacher_allowlist)
-- Add emails here via Supabase Dashboard to grant AI access:
--   INSERT INTO public.ai_allowlist (email) VALUES ('teacher@school.edu');
CREATE TABLE IF NOT EXISTS public.ai_allowlist (
  email TEXT PRIMARY KEY CHECK (char_length(email) > 0)
);

-- Block all client-side access — server-side only via service role key
ALTER TABLE public.ai_allowlist ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no client access (same pattern as teacher_allowlist)

-- Sentence cache — avoids redundant AI API calls
CREATE TABLE IF NOT EXISTS public.sentence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2,
  sentence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(word, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_sentence_cache_lookup ON public.sentence_cache(word, difficulty);
ALTER TABLE public.sentence_cache ENABLE ROW LEVEL SECURITY;
