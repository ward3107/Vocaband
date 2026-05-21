-- =============================================================================
-- Vocabulary Library — teacher-owned, persistent vocabulary storage
-- =============================================================================
-- New top-level surface that gives every teacher a personal library of
-- vocabulary they curated themselves. Until now, words extracted via OCR /
-- pasted / typed manually only lived inside a single Assignment row and
-- evaporated on tab-close. This migration introduces the persistent layer
-- the OCR pipeline, the AI Lesson Builder (planned), the manual paste flow,
-- and the curriculum picker will all write into, and that assignments,
-- worksheets, Class Show, and printables will all read from.
--
-- Hierarchy (capped at 5 levels deep — enforced by trigger):
--
--   Teacher
--    └── Collection         (folder, nested, free-form name)
--         └── Sub-collection (max depth 5)
--              └── Vocabulary Set (the atom — a list of words)
--                   └── Word + translations + (optional) sentences
--
-- Legal posture: source materials (PDFs, photos) are NEVER stored here.
-- The extraction job table records filename / size / hash for audit only;
-- the actual bytes live in R2 for a maximum of 72h then auto-purge (Tier 2)
-- or are never persisted at all (Tier 1, the default for images).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Vocabulary Collections — nested folders, teacher-owned
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocabulary_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid     TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  -- ON DELETE SET NULL: deleting a parent promotes children to root rather
  -- than cascading and wiping a whole subtree by accident.
  parent_id       UUID REFERENCES public.vocabulary_collections(id) ON DELETE SET NULL,
  name            TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  description     TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  -- Cosmetics — matches your design language (frosted medallion + gradient).
  emoji           TEXT CHECK (emoji IS NULL OR char_length(emoji) <= 8),
  color           TEXT CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Educational facets — orthogonal to hierarchy, used for filtering.
  school_year     TEXT CHECK (school_year IS NULL OR char_length(school_year) <= 20),
  grade_level     INT CHECK (grade_level IS NULL OR grade_level BETWEEN 1 AND 12),
  -- Phase 2: school-wide sharing. Always private in v1.
  share_mode      TEXT NOT NULL DEFAULT 'private'
                    CHECK (share_mode IN ('private', 'school', 'invite')),
  shared_with_school_id UUID,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vc_teacher ON public.vocabulary_collections(teacher_uid, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vc_parent  ON public.vocabulary_collections(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vc_school  ON public.vocabulary_collections(shared_with_school_id) WHERE shared_with_school_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. Vocabulary Sets — the atomic unit; every consumer surface reads this
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocabulary_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid     TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  -- A set without a collection lives in the root "Unfiled" view.
  collection_id   UUID REFERENCES public.vocabulary_collections(id) ON DELETE SET NULL,

  name            TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  description     TEXT CHECK (description IS NULL OR char_length(description) <= 1000),

  -- How this set was created — analytics + UX only.
  -- NOT a copyright index — we never group across teachers by source.
  source_type     TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source_type IN (
                      'manual',       -- typed by hand
                      'paste',        -- pasted text block
                      'ocr_image',    -- photographed page
                      'ocr_document', -- uploaded PDF / Word
                      'ai_topic',     -- AI-generated from a topic prompt
                      'ai_augment',   -- AI "suggest more words like these"
                      'curriculum',   -- picked from ALL_WORDS
                      'imported'      -- CSV / JSON import
                    )),
  -- Free-text teacher reference, NEVER required, NEVER searchable cross-teacher.
  -- Teachers can type whatever helps them remember ("Module D, Page 14").
  source_label    TEXT CHECK (source_label IS NULL OR char_length(source_label) <= 200),
  extraction_job_id UUID,  -- back-reference to vocabulary_extraction_jobs (FK added later)

  -- Educational facets
  grade_level     INT CHECK (grade_level IS NULL OR grade_level BETWEEN 1 AND 12),
  language_pair   TEXT NOT NULL DEFAULT 'en-he-ar'
                    CHECK (language_pair IN ('en-he-ar', 'en-he', 'en-ar', 'he-en', 'ar-en')),
  curriculum_alignment TEXT
                    CHECK (curriculum_alignment IS NULL OR curriculum_alignment IN
                      ('Set 1', 'Set 2', 'Set 3', 'Custom')),
  difficulty      INT CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5),
  word_count      INT NOT NULL DEFAULT 0 CHECK (word_count >= 0),

  -- Sentence-generation defaults for this set (so the teacher doesn't
  -- reconfigure every time). See AI Lesson Builder Plan, #4 sentence controls.
  -- Example shape:
  --   {"level":"A2","length":"medium","tense":"mixed","tone":"story",
  --    "theme":"animals","grammar":null,"perWord":1,"culturalContext":"israeli"}
  sentence_preset JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Cosmetics
  emoji           TEXT CHECK (emoji IS NULL OR char_length(emoji) <= 8),
  color           TEXT CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),

  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Phase 3+: published templates curated by Vocaband. Always false in v1.
  is_template     BOOLEAN NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Bumped whenever the set is consumed (assignment, worksheet, Class Show,
  -- Quick Play) — drives the "Recent" tab in the library.
  last_used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vs_teacher       ON public.vocabulary_sets(teacher_uid, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vs_collection    ON public.vocabulary_sets(collection_id) WHERE collection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vs_teacher_recent ON public.vocabulary_sets(teacher_uid, last_used_at DESC) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vs_grade         ON public.vocabulary_sets(grade_level) WHERE grade_level IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 3. Words inside a Set — the leaves
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocabulary_set_words (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id          UUID NOT NULL REFERENCES public.vocabulary_sets(id) ON DELETE CASCADE,
  position        INT NOT NULL CHECK (position >= 0),
  english         TEXT NOT NULL CHECK (char_length(trim(english)) BETWEEN 1 AND 80),
  hebrew          TEXT CHECK (hebrew IS NULL OR char_length(hebrew) <= 120),
  arabic          TEXT CHECK (arabic IS NULL OR char_length(arabic) <= 120),
  part_of_speech  TEXT CHECK (part_of_speech IS NULL OR part_of_speech IN
                    ('noun', 'verb', 'adjective', 'adverb', 'preposition',
                     'pronoun', 'conjunction', 'interjection', 'phrase', 'other')),
  difficulty      INT CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5),
  -- If this word also exists in ALL_WORDS (the built-in curriculum), point
  -- to it so we can reuse shared audio + curriculum metadata without
  -- duplicating. NULL = teacher-custom word.
  curriculum_word_id INT,
  -- Pre-generated TTS audio URL (Neural2). Lazily filled; NULL until
  -- requestCustomWordAudio() finishes.
  audio_url       TEXT,
  -- Forward-compat slot for AI-extracted context (frequency, CEFR, etc.).
  -- NO source-text excerpts here — see legal posture in file header.
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Each (set, position) is unique — keeps ordering stable on reorder.
  UNIQUE (set_id, position)
);

CREATE INDEX IF NOT EXISTS idx_vsw_set        ON public.vocabulary_set_words(set_id, position);
CREATE INDEX IF NOT EXISTS idx_vsw_curriculum ON public.vocabulary_set_words(curriculum_word_id) WHERE curriculum_word_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 4. Sentences attached to words — multi-variant for differentiation
-- ---------------------------------------------------------------------------
-- Phase 1: one is_primary=true row per word (acts like a TEXT column).
-- Phase 2+: multiple rows per word with different levels lets the same set
-- serve weak + strong students with appropriate sentences. THE killer
-- school-tier feature, so the schema supports it from day one even though
-- the UI ships single-variant first.
CREATE TABLE IF NOT EXISTS public.vocabulary_set_word_sentences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id         UUID NOT NULL REFERENCES public.vocabulary_set_words(id) ON DELETE CASCADE,
  text            TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 500),
  -- CEFR-aligned level. NULL = unspecified / teacher-edited freeform.
  level           TEXT CHECK (level IS NULL OR level IN ('A1', 'A2', 'B1', 'B2', 'C1')),
  length_bucket   TEXT CHECK (length_bucket IS NULL OR length_bucket IN ('short', 'medium', 'long')),
  tense           TEXT CHECK (tense IS NULL OR tense IN ('present', 'past', 'future', 'mixed')),
  tone            TEXT CHECK (tone IS NULL OR tone IN ('neutral', 'fun', 'story', 'conversational', 'educational')),
  theme           TEXT CHECK (theme IS NULL OR char_length(theme) <= 80),
  grammar_focus   TEXT CHECK (grammar_focus IS NULL OR char_length(grammar_focus) <= 60),
  cultural_context TEXT CHECK (cultural_context IS NULL OR cultural_context IN ('universal', 'israeli')),
  -- The one shown by default in worksheets / Class Show. Exactly one per
  -- word should be primary (enforced by partial unique index below).
  is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
  was_edited      BOOLEAN NOT NULL DEFAULT FALSE,
  generated_by    TEXT NOT NULL DEFAULT 'ai'
                    CHECK (generated_by IN ('ai', 'manual')),
  audio_url       TEXT,  -- TTS of the full sentence; lazily generated
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vsws_word ON public.vocabulary_set_word_sentences(word_id);
-- Exactly one primary sentence per word.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vsws_word_primary
  ON public.vocabulary_set_word_sentences(word_id) WHERE is_primary = TRUE;


-- ---------------------------------------------------------------------------
-- 5. Tags — flexible cross-cutting facets (orthogonal to folder hierarchy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocabulary_set_tags (
  set_id          UUID NOT NULL REFERENCES public.vocabulary_sets(id) ON DELETE CASCADE,
  tag             TEXT NOT NULL CHECK (char_length(trim(tag)) BETWEEN 1 AND 40),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (set_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_vst_tag ON public.vocabulary_set_tags(tag);


-- ---------------------------------------------------------------------------
-- 6. Extraction jobs — audit log + retry support + defensive evidence
-- ---------------------------------------------------------------------------
-- Records that an extraction happened. Proves the retention policy is
-- honored (storage_deleted_at). The source file ITSELF lives in R2 with a
-- 72h auto-purge lifecycle rule; this table never holds the bytes.
CREATE TABLE IF NOT EXISTS public.vocabulary_extraction_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid       TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  -- The set this job produced (or attempted to). NULL while still pending
  -- or if the job failed before any rows were written.
  set_id            UUID REFERENCES public.vocabulary_sets(id) ON DELETE SET NULL,
  source_type       TEXT NOT NULL
                      CHECK (source_type IN ('ocr_image', 'ocr_document', 'paste', 'ai_topic', 'ai_augment')),
  -- Filename only, NOT the file contents.
  source_filename   TEXT CHECK (source_filename IS NULL OR char_length(source_filename) <= 255),
  source_size_bytes BIGINT CHECK (source_size_bytes IS NULL OR source_size_bytes >= 0),
  source_mime_type  TEXT CHECK (source_mime_type IS NULL OR char_length(source_mime_type) <= 100),
  -- SHA-256 of the source bytes — useful for retry / dedup WITHIN a single
  -- teacher's workflow, NEVER used to dedupe across teachers (legal posture).
  source_hash_sha256 TEXT CHECK (source_hash_sha256 IS NULL OR source_hash_sha256 ~ '^[0-9a-f]{64}$'),
  ai_model          TEXT CHECK (ai_model IS NULL OR char_length(ai_model) <= 60),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  words_extracted   INT CHECK (words_extracted IS NULL OR words_extracted >= 0),
  processing_ms     INT CHECK (processing_ms IS NULL OR processing_ms >= 0),
  error_message     TEXT CHECK (error_message IS NULL OR char_length(error_message) <= 1000),
  -- R2 object key — set only if Tier-2 storage was used (large PDFs).
  -- NULL for Tier-1 stream-only flows (the default for images).
  storage_object_key TEXT,
  -- When the source file was purged from R2. Set by the auto-cleanup cron
  -- or by the worker once extraction completes. Defensive evidence.
  storage_deleted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vej_teacher ON public.vocabulary_extraction_jobs(teacher_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vej_pending ON public.vocabulary_extraction_jobs(status, created_at)
  WHERE status IN ('pending', 'processing');
-- Find jobs whose R2 source still needs cleanup (storage_deleted_at IS NULL
-- AND storage_object_key IS NOT NULL AND created_at < now() - 72h).
CREATE INDEX IF NOT EXISTS idx_vej_cleanup ON public.vocabulary_extraction_jobs(created_at)
  WHERE storage_object_key IS NOT NULL AND storage_deleted_at IS NULL;

-- Now we can add the back-reference FK from vocabulary_sets to its job.
ALTER TABLE public.vocabulary_sets
  ADD CONSTRAINT fk_vs_extraction_job
  FOREIGN KEY (extraction_job_id)
  REFERENCES public.vocabulary_extraction_jobs(id)
  ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 7. Hierarchy guard — prevent cycles, cap nesting at 5 levels
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_collection_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  walker_id UUID := NEW.parent_id;
  depth INT := 1;
BEGIN
  -- Reject self-parenting outright.
  IF NEW.parent_id IS NOT NULL AND NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A collection cannot be its own parent';
  END IF;

  -- Walk up the ancestor chain. Detect cycles + enforce the 5-level cap.
  WHILE walker_id IS NOT NULL LOOP
    IF walker_id = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in collection hierarchy';
    END IF;
    depth := depth + 1;
    IF depth > 5 THEN
      RAISE EXCEPTION 'Collection nesting depth cannot exceed 5 levels';
    END IF;
    SELECT parent_id INTO walker_id
      FROM public.vocabulary_collections
      WHERE id = walker_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vc_check_hierarchy ON public.vocabulary_collections;
CREATE TRIGGER trg_vc_check_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id ON public.vocabulary_collections
  FOR EACH ROW EXECUTE FUNCTION public.check_collection_hierarchy();


-- ---------------------------------------------------------------------------
-- 8. word_count keeper — auto-maintain vocabulary_sets.word_count
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recount_vocabulary_set_words()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_set_id UUID;
BEGIN
  target_set_id := COALESCE(NEW.set_id, OLD.set_id);
  UPDATE public.vocabulary_sets
    SET word_count = (
      SELECT COUNT(*) FROM public.vocabulary_set_words WHERE set_id = target_set_id
    ),
    updated_at = now()
    WHERE id = target_set_id;
  RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$;

DROP TRIGGER IF EXISTS trg_vsw_recount ON public.vocabulary_set_words;
CREATE TRIGGER trg_vsw_recount
  AFTER INSERT OR DELETE ON public.vocabulary_set_words
  FOR EACH ROW EXECUTE FUNCTION public.recount_vocabulary_set_words();


-- ---------------------------------------------------------------------------
-- 9. updated_at keepers — bump on any UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vc_touch ON public.vocabulary_collections;
CREATE TRIGGER trg_vc_touch
  BEFORE UPDATE ON public.vocabulary_collections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_vs_touch ON public.vocabulary_sets;
CREATE TRIGGER trg_vs_touch
  BEFORE UPDATE ON public.vocabulary_sets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_vsw_touch ON public.vocabulary_set_words;
CREATE TRIGGER trg_vsw_touch
  BEFORE UPDATE ON public.vocabulary_set_words
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_vsws_touch ON public.vocabulary_set_word_sentences;
CREATE TRIGGER trg_vsws_touch
  BEFORE UPDATE ON public.vocabulary_set_word_sentences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 10. Row Level Security
-- ---------------------------------------------------------------------------
-- Every teacher sees ONLY their own library. Admins see everything.
-- Phase 2 will add school-share read policies; the share_mode column is
-- already in place so the future migration is additive.

ALTER TABLE public.vocabulary_collections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_sets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_set_words             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_set_word_sentences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_set_tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_extraction_jobs       ENABLE ROW LEVEL SECURITY;

-- ·· vocabulary_collections ··
DROP POLICY IF EXISTS "vc_select" ON public.vocabulary_collections;
CREATE POLICY "vc_select" ON public.vocabulary_collections
  FOR SELECT TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

DROP POLICY IF EXISTS "vc_insert" ON public.vocabulary_collections;
CREATE POLICY "vc_insert" ON public.vocabulary_collections
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

DROP POLICY IF EXISTS "vc_update" ON public.vocabulary_collections;
CREATE POLICY "vc_update" ON public.vocabulary_collections
  FOR UPDATE TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  ) WITH CHECK (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

DROP POLICY IF EXISTS "vc_delete" ON public.vocabulary_collections;
CREATE POLICY "vc_delete" ON public.vocabulary_collections
  FOR DELETE TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

-- ·· vocabulary_sets ··
DROP POLICY IF EXISTS "vs_select" ON public.vocabulary_sets;
CREATE POLICY "vs_select" ON public.vocabulary_sets
  FOR SELECT TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

DROP POLICY IF EXISTS "vs_insert" ON public.vocabulary_sets;
CREATE POLICY "vs_insert" ON public.vocabulary_sets
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

DROP POLICY IF EXISTS "vs_update" ON public.vocabulary_sets;
CREATE POLICY "vs_update" ON public.vocabulary_sets
  FOR UPDATE TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  ) WITH CHECK (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

DROP POLICY IF EXISTS "vs_delete" ON public.vocabulary_sets;
CREATE POLICY "vs_delete" ON public.vocabulary_sets
  FOR DELETE TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

-- ·· vocabulary_set_words ·· (child of vocabulary_sets — derive ownership)
DROP POLICY IF EXISTS "vsw_select" ON public.vocabulary_set_words;
CREATE POLICY "vsw_select" ON public.vocabulary_set_words
  FOR SELECT TO authenticated USING (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "vsw_insert" ON public.vocabulary_set_words;
CREATE POLICY "vsw_insert" ON public.vocabulary_set_words
  FOR INSERT TO authenticated WITH CHECK (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "vsw_update" ON public.vocabulary_set_words;
CREATE POLICY "vsw_update" ON public.vocabulary_set_words
  FOR UPDATE TO authenticated USING (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
    OR public.is_admin()
  ) WITH CHECK (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "vsw_delete" ON public.vocabulary_set_words;
CREATE POLICY "vsw_delete" ON public.vocabulary_set_words
  FOR DELETE TO authenticated USING (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
    OR public.is_admin()
  );

-- ·· vocabulary_set_word_sentences ·· (grandchild of vocabulary_sets)
DROP POLICY IF EXISTS "vsws_select" ON public.vocabulary_set_word_sentences;
CREATE POLICY "vsws_select" ON public.vocabulary_set_word_sentences
  FOR SELECT TO authenticated USING (
    word_id IN (
      SELECT w.id FROM public.vocabulary_set_words w
      JOIN public.vocabulary_sets s ON s.id = w.set_id
      WHERE s.teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "vsws_insert" ON public.vocabulary_set_word_sentences;
CREATE POLICY "vsws_insert" ON public.vocabulary_set_word_sentences
  FOR INSERT TO authenticated WITH CHECK (
    word_id IN (
      SELECT w.id FROM public.vocabulary_set_words w
      JOIN public.vocabulary_sets s ON s.id = w.set_id
      WHERE s.teacher_uid = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "vsws_update" ON public.vocabulary_set_word_sentences;
CREATE POLICY "vsws_update" ON public.vocabulary_set_word_sentences
  FOR UPDATE TO authenticated USING (
    word_id IN (
      SELECT w.id FROM public.vocabulary_set_words w
      JOIN public.vocabulary_sets s ON s.id = w.set_id
      WHERE s.teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  ) WITH CHECK (
    word_id IN (
      SELECT w.id FROM public.vocabulary_set_words w
      JOIN public.vocabulary_sets s ON s.id = w.set_id
      WHERE s.teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "vsws_delete" ON public.vocabulary_set_word_sentences;
CREATE POLICY "vsws_delete" ON public.vocabulary_set_word_sentences
  FOR DELETE TO authenticated USING (
    word_id IN (
      SELECT w.id FROM public.vocabulary_set_words w
      JOIN public.vocabulary_sets s ON s.id = w.set_id
      WHERE s.teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

-- ·· vocabulary_set_tags ·· (child of vocabulary_sets)
DROP POLICY IF EXISTS "vst_select" ON public.vocabulary_set_tags;
CREATE POLICY "vst_select" ON public.vocabulary_set_tags
  FOR SELECT TO authenticated USING (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "vst_insert" ON public.vocabulary_set_tags;
CREATE POLICY "vst_insert" ON public.vocabulary_set_tags
  FOR INSERT TO authenticated WITH CHECK (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "vst_delete" ON public.vocabulary_set_tags;
CREATE POLICY "vst_delete" ON public.vocabulary_set_tags
  FOR DELETE TO authenticated USING (
    set_id IN (SELECT id FROM public.vocabulary_sets WHERE teacher_uid = auth.uid()::text)
    OR public.is_admin()
  );

-- ·· vocabulary_extraction_jobs ··
-- Teachers can read their own jobs; writes happen server-side via service role.
DROP POLICY IF EXISTS "vej_select" ON public.vocabulary_extraction_jobs;
CREATE POLICY "vej_select" ON public.vocabulary_extraction_jobs
  FOR SELECT TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );

DROP POLICY IF EXISTS "vej_insert" ON public.vocabulary_extraction_jobs;
CREATE POLICY "vej_insert" ON public.vocabulary_extraction_jobs
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );


-- ---------------------------------------------------------------------------
-- 11. Helper RPCs — atomic operations callable from the client
-- ---------------------------------------------------------------------------

-- Return the breadcrumb path for a collection: root → ... → self.
-- Used by the library UI to render the breadcrumb header.
CREATE OR REPLACE FUNCTION public.get_collection_path(p_collection_id UUID)
RETURNS TABLE (id UUID, name TEXT, depth INT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT vc.id, vc.name, vc.parent_id, 0 AS depth
      FROM public.vocabulary_collections vc
      WHERE vc.id = p_collection_id
    UNION ALL
    SELECT vc.id, vc.name, vc.parent_id, chain.depth + 1
      FROM public.vocabulary_collections vc
      JOIN chain ON chain.parent_id = vc.id
  )
  SELECT chain.id, chain.name, chain.depth
    FROM chain
    ORDER BY depth DESC;  -- root first, self last
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_collection_path(UUID) TO authenticated;


-- Bump last_used_at when a set is consumed by an assignment / worksheet / etc.
-- Called from the client as a fire-and-forget on consume.
CREATE OR REPLACE FUNCTION public.touch_vocabulary_set_used(p_set_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vocabulary_sets
    SET last_used_at = now()
    WHERE id = p_set_id
      AND (teacher_uid = auth.uid()::text OR public.is_admin());
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_vocabulary_set_used(UUID) TO authenticated;
