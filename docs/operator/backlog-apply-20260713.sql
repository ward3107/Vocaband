-- =============================================================================
-- Vocaband — consolidated backlog migration script
-- Generated 2026-06-06T20:44:44Z
--
-- WHAT THIS IS:
--   Every migration above the production bookkeeping frontier (20260621000000)
--   that the broken auto-apply workflow never shipped, concatenated in version
--   order. Paste the WHOLE thing into the Supabase SQL editor and Run once.
--
-- SAFETY:
--   * Every block is idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE
--     FUNCTION / DROP POLICY IF EXISTS) and safe to re-run.
--   * The superseded 20260627000000_feature_flags.sql is INTENTIONALLY OMITTED —
--     it collides with the live name-based table. 20260713000000 below wires the
--     dashboard RPCs to the live table instead.
--   * Because every block is idempotent, if the run stops on an error you can
--     fix that one statement and simply re-run the WHOLE script — blocks that
--     already applied no-op the second time. Run it in one paste; don't split.
-- =============================================================================

-- ====================================================================
-- BEGIN 20260621000001_translation_cache.sql
-- ====================================================================
-- =============================================================================
-- Translation cache — shared across all teachers, saves AI cost at scale
-- =============================================================================
-- Same English word translated to Hebrew + Arabic by 1,000 teachers should be
-- 1 API call, not 1,000. This table holds the cached translations so the
-- server-side translate endpoint can hit the DB first before paying Google
-- Translate. At 10K teachers, hit rate is 70-90% — saves ~$30/month and
-- scales linearly forever after.
--
-- Cheap to build now (~4h), painful to retrofit (requires migrating live
-- traffic to consult the cache without breaking the existing translate
-- pipeline), so we land it alongside the vocabulary library.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.translation_cache (
  -- Composite key: (source_lang, source_text_normalized, target_lang).
  -- Normalized = lowercased + trimmed so "Lion", "lion", " lion " hit the
  -- same row. The DB enforces this via the unique constraint at the bottom.
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lang     TEXT NOT NULL CHECK (source_lang IN ('en', 'he', 'ar')),
  source_text     TEXT NOT NULL CHECK (char_length(source_text) BETWEEN 1 AND 200),
  target_lang     TEXT NOT NULL CHECK (target_lang IN ('en', 'he', 'ar')),
  translation     TEXT NOT NULL CHECK (char_length(translation) BETWEEN 1 AND 400),
  -- Confidence score from the translation provider (0..1). NULL = unknown.
  -- Sub-threshold entries can be re-translated by a future cleanup pass.
  confidence      NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  -- Which provider produced this — lets us migrate to a better provider
  -- later without invalidating every cache row.
  provider        TEXT NOT NULL DEFAULT 'google_translate'
                    CHECK (char_length(provider) <= 60),
  -- Hit counter — drives eviction (least-used first if we ever cap the table).
  hit_count       INT NOT NULL DEFAULT 0,
  last_hit_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: same source+langs cannot have two cached translations.
  -- The server upserts on this key; reads do exact lookup.
  CONSTRAINT translation_cache_unique UNIQUE (source_lang, source_text, target_lang),
  -- Source/target must differ.
  CONSTRAINT translation_cache_diff_langs CHECK (source_lang <> target_lang)
);

-- The "is it cached?" lookup hits this index. Two indexes deliberately:
-- the unique constraint already creates one, but having a covering index
-- with `translation` makes the lookup an index-only scan.
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
  ON public.translation_cache (source_lang, target_lang, source_text);

-- Eviction support — find stale entries (low hit count, old).
CREATE INDEX IF NOT EXISTS idx_translation_cache_lru
  ON public.translation_cache (last_hit_at NULLS FIRST, hit_count);


-- ---------------------------------------------------------------------------
-- RLS — read-only for authenticated; writes via service role only
-- ---------------------------------------------------------------------------
-- The cache is shared infrastructure — no per-row ownership.
-- Any authenticated user can READ (they need to consult the cache).
-- Only the server (service role) can WRITE — prevents cache poisoning.
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tc_read" ON public.translation_cache;
CREATE POLICY "tc_read" ON public.translation_cache
  FOR SELECT TO authenticated USING (true);


-- ---------------------------------------------------------------------------
-- Upsert RPC — server-side endpoints call this to record new translations
-- ---------------------------------------------------------------------------
-- Wraps the INSERT ... ON CONFLICT pattern so the server doesn't have to
-- think about the unique constraint. Returns the cached row.
CREATE OR REPLACE FUNCTION public.upsert_translation(
  p_source_lang TEXT,
  p_source_text TEXT,
  p_target_lang TEXT,
  p_translation TEXT,
  p_confidence  NUMERIC DEFAULT NULL,
  p_provider    TEXT DEFAULT 'google_translate'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Service role only — clients should never call this directly.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'upsert_translation is service-role only';
  END IF;

  INSERT INTO public.translation_cache (
    source_lang, source_text, target_lang, translation, confidence, provider
  ) VALUES (
    p_source_lang, p_source_text, p_target_lang, p_translation, p_confidence, p_provider
  )
  ON CONFLICT (source_lang, source_text, target_lang) DO UPDATE
    SET translation = EXCLUDED.translation,
        confidence  = EXCLUDED.confidence,
        provider    = EXCLUDED.provider,
        last_hit_at = now(),
        hit_count   = public.translation_cache.hit_count + 1
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

-- Note: no GRANT to authenticated — service role only.


-- ---------------------------------------------------------------------------
-- Bump-on-read RPC — counts cache hits so eviction stays smart
-- ---------------------------------------------------------------------------
-- Cheaper to bump in a separate call than to do a write on every read.
-- Server batches reads, then fires this once per batch with the matched ids.
CREATE OR REPLACE FUNCTION public.touch_translation_cache(p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'touch_translation_cache is service-role only';
  END IF;

  UPDATE public.translation_cache
    SET hit_count = hit_count + 1, last_hit_at = now()
    WHERE id = ANY(p_ids);
END;
$$;

-- END 20260621000001_translation_cache.sql

-- ====================================================================
-- BEGIN 20260621000002_ai_usage_counters.sql
-- ====================================================================
-- =============================================================================
-- AI usage counters — per-teacher daily + monthly usage tracking
-- =============================================================================
-- Future-proofs cost control. Today, with ~80 teachers, we don't ENFORCE
-- limits (everyone's well under). But every AI call increments a counter
-- so:
--   1. We can spot abuse the moment it starts (one teacher uploading 200
--      PDFs/day shows up immediately in the metrics).
--   2. The day we add hard limits, the data is already there — no migration.
--   3. The day we add Pro tiers ("Pro = 100 extractions/day"), it's a
--      one-line config change, not a schema rewrite.
--
-- Schema is pricing-aware from day one even though every teacher's plan
-- column reads 'free' for now.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_counters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid     TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  -- Day bucket as YYYY-MM-DD (UTC). One row per (teacher, day, action).
  -- UTC chosen for billing alignment; teacher-local display computed client-side.
  day_bucket      DATE NOT NULL DEFAULT CURRENT_DATE,
  -- What the teacher did. Matches the source_type vocabulary, plus a few
  -- extras for actions that don't produce a set (translation hits, sentence
  -- regenerations, audio generation calls).
  action          TEXT NOT NULL CHECK (action IN (
                    'ocr_image',
                    'ocr_document',
                    'ai_topic_words',
                    'ai_augment_words',
                    'ai_generate_sentences',
                    'ai_generate_text',       -- AI Lesson Builder Stage 2
                    'ai_generate_questions',  -- AI Lesson Builder Stage 3
                    'translation_batch',
                    'audio_generation'
                  )),
  -- Number of "units" consumed by this action.
  -- For ocr_*: 1 per request.
  -- For ai_generate_*: 1 per batch (a batch of 30 sentences = 1).
  -- For translation_batch: count of words.
  -- For audio_generation: count of new audio files.
  count           INT NOT NULL DEFAULT 0 CHECK (count >= 0),
  -- Estimated cost in micro-USD (1 = $0.000001). Lets us aggregate
  -- "$/teacher/day" without storing floats. Server fills this in based on
  -- per-action cost constants. Optional — null is fine.
  cost_micro_usd  BIGINT CHECK (cost_micro_usd IS NULL OR cost_micro_usd >= 0),
  -- Snapshot of the teacher's plan at the time of the action. Helps debug
  -- "why was this teacher rate-limited?" later when plans change.
  plan_at_action  TEXT CHECK (plan_at_action IN ('free', 'pro', 'school')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One bucket per (teacher, day, action) — increments via the RPC below.
  CONSTRAINT ai_usage_counters_bucket_unique UNIQUE (teacher_uid, day_bucket, action)
);

-- Fast lookup: "what has this teacher done today?"
CREATE INDEX IF NOT EXISTS idx_auc_teacher_today
  ON public.ai_usage_counters (teacher_uid, day_bucket DESC, action);

-- Cost analytics: "who's the most expensive teacher this month?"
CREATE INDEX IF NOT EXISTS idx_auc_cost_by_month
  ON public.ai_usage_counters (day_bucket, cost_micro_usd DESC NULLS LAST)
  WHERE cost_micro_usd IS NOT NULL;


-- ---------------------------------------------------------------------------
-- RLS — teachers see their own counters; admins see everything
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

-- Teachers can see their own usage (powers a future "you've used X today"
-- meter in the UI). They cannot write — increments happen server-side.
DROP POLICY IF EXISTS "auc_self_read" ON public.ai_usage_counters;
CREATE POLICY "auc_self_read" ON public.ai_usage_counters
  FOR SELECT TO authenticated USING (
    auth.uid()::text = teacher_uid OR public.is_admin()
  );


-- ---------------------------------------------------------------------------
-- Atomic increment RPC — called by the AI endpoints on every billable action
-- ---------------------------------------------------------------------------
-- Idempotent-ish: upserts the (teacher, day, action) row and bumps count.
-- Returns the new daily total so the caller can decide whether to
-- rate-limit. Service-role only — clients never call this.
CREATE OR REPLACE FUNCTION public.bump_ai_usage(
  p_teacher_uid    TEXT,
  p_action         TEXT,
  p_count          INT DEFAULT 1,
  p_cost_micro_usd BIGINT DEFAULT NULL,
  p_plan_at_action TEXT DEFAULT 'free'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'bump_ai_usage is service-role only';
  END IF;

  INSERT INTO public.ai_usage_counters (
    teacher_uid, day_bucket, action, count, cost_micro_usd, plan_at_action
  ) VALUES (
    p_teacher_uid, CURRENT_DATE, p_action, p_count, p_cost_micro_usd, p_plan_at_action
  )
  ON CONFLICT (teacher_uid, day_bucket, action) DO UPDATE
    SET count          = public.ai_usage_counters.count + EXCLUDED.count,
        cost_micro_usd = COALESCE(public.ai_usage_counters.cost_micro_usd, 0)
                         + COALESCE(EXCLUDED.cost_micro_usd, 0),
        updated_at     = now()
  RETURNING count INTO new_total;

  RETURN new_total;
END;
$$;


-- ---------------------------------------------------------------------------
-- Quick-check RPC — has this teacher exceeded their daily quota?
-- ---------------------------------------------------------------------------
-- Returns TRUE if the teacher is OVER the limit and the action should be
-- refused. Centralizes the limit table so we can tune limits per-plan in
-- one place without redeploying every AI endpoint.
--
-- Today's limits (all-free pricing, soft caps to catch abuse):
--   ocr_image / ocr_document    : 30/day
--   ai_topic_words              : 20/day
--   ai_augment_words            : 30/day
--   ai_generate_sentences       : 10/day (each = 1 batch up to 30 sentences)
--   ai_generate_text            : 10/day
--   ai_generate_questions       : 10/day
--   translation_batch           :  500/day (counted as #words)
--   audio_generation            :  200/day (counted as #files)
--
-- These limits exist to defend against runaway costs, NOT to upsell. A normal
-- teacher will never hit them. The day a real Pro tier ships, this function
-- gets a CASE on p_plan and the limits relax for paying users.
CREATE OR REPLACE FUNCTION public.check_ai_quota(
  p_teacher_uid TEXT,
  p_action      TEXT,
  p_plan        TEXT DEFAULT 'free'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INT;
  limit_value INT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'check_ai_quota is service-role only';
  END IF;

  -- Look up today's count for this teacher + action.
  SELECT COALESCE(count, 0) INTO current_count
    FROM public.ai_usage_counters
    WHERE teacher_uid = p_teacher_uid
      AND day_bucket = CURRENT_DATE
      AND action = p_action;
  current_count := COALESCE(current_count, 0);

  -- Per-action daily limits. Multiply by 5 for 'pro', 20 for 'school'.
  limit_value := CASE p_action
    WHEN 'ocr_image'             THEN 30
    WHEN 'ocr_document'          THEN 30
    WHEN 'ai_topic_words'        THEN 20
    WHEN 'ai_augment_words'      THEN 30
    WHEN 'ai_generate_sentences' THEN 10
    WHEN 'ai_generate_text'      THEN 10
    WHEN 'ai_generate_questions' THEN 10
    WHEN 'translation_batch'     THEN 500
    WHEN 'audio_generation'      THEN 200
    ELSE 0
  END;

  -- Plan multiplier. Stays neutral while everyone's free; lights up later.
  IF p_plan = 'pro'    THEN limit_value := limit_value * 5;  END IF;
  IF p_plan = 'school' THEN limit_value := limit_value * 20; END IF;

  RETURN current_count >= limit_value;  -- TRUE = over limit, refuse
END;
$$;

-- END 20260621000002_ai_usage_counters.sql

-- ====================================================================
-- BEGIN 20260621000003_translation_cache_allow_ru.sql
-- ====================================================================
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

-- END 20260621000003_translation_cache_allow_ru.sql

-- ====================================================================
-- BEGIN 20260621000020_sentence_kind.sql
-- ====================================================================
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

-- END 20260621000020_sentence_kind.sql

-- ====================================================================
-- BEGIN 20260622000000_c7_revoke_progress_insert.sql
-- ====================================================================
-- =============================================================================
-- C7 — Force all `progress` INSERTs through save_student_progress RPC
-- =============================================================================
--
-- Closes the remaining half of C7 from PRODUCTION-READINESS-AUDIT-2026-05-21.
--
-- Context:
--   * F3 (migration 20260606) added a [0, 1000] score range check to
--     `progress_insert` WITH CHECK — closed the simplest leaderboard-
--     inflation attack (score = 999_999_999 via direct REST INSERT).
--   * But: a student could still INSERT a single row with score = 1000
--     for ANY assignment in their class.  The monotonic-update guard on
--     `progress_update` only fires for UPDATEs, not INSERTs, so the
--     "start from zero" pattern bypassed it.
--   * `save_student_progress` (SECURITY DEFINER) already validates
--     ownership + clamps score atomically + handles QUICK_PLAY exempt
--     guests.  It's the canonical write path; the direct-INSERT REST
--     fallback was the gap.
--
-- This migration: REVOKE INSERT on public.progress from `authenticated`
-- and `anon` so the only client-side write path becomes the RPC.  Same
-- pattern adopted for save_student_progress_batch (see the audit's
-- own recommendation).
--
-- Companion React work (must deploy BEFORE this migration applies):
--   * src/hooks/useGameState.ts — Quick Play save route now calls
--     supabase.rpc("save_student_progress", …) instead of
--     supabase.from("progress").insert(…).
--   * src/hooks/useSaveQueueResilience.ts — localStorage retry path now
--     calls the same RPC instead of a direct INSERT.
--
-- Surviving write paths (all explicit, all reviewed):
--   * save_student_progress      — SECURITY DEFINER, runs as function
--                                  owner; GRANT bypasses the table
--                                  REVOKE.  Caller scope-checked
--                                  inside the function body.
--   * save_student_progress_batch — same pattern, same exemption.
--   * server.ts (TEACHER_END persist) — uses supabaseAdmin which is
--                                       the service_role client; service
--                                       role keeps all privileges by
--                                       default.
--
-- Defence in depth: the existing progress_insert RLS policy stays in
-- place.  With INSERT revoked at the GRANT level, the policy becomes
-- effectively dead code — but leaving it preserves the protection if a
-- future migration accidentally re-GRANTs INSERT.

BEGIN;

REVOKE INSERT ON public.progress FROM authenticated;
REVOKE INSERT ON public.progress FROM anon;

-- Record the policy intent on the table for future-you.
COMMENT ON TABLE public.progress IS
  'Student progress rows. Client-side INSERT is REVOKEd (C7, 2026-05-22) — '
  'all writes go through save_student_progress / save_student_progress_batch '
  '(SECURITY DEFINER RPCs).  Service-role writes (server.ts) bypass the '
  'revoke as expected.  Existing progress_insert RLS policy stays in place '
  'as defence in depth if a future migration accidentally re-GRANTs INSERT.';

COMMIT;

-- =============================================================================
-- Verification queries (run manually after applying this migration):
--
-- 1. Authenticated direct INSERT must fail:
--      INSERT INTO public.progress (student_name, student_uid, assignment_id,
--                                   class_code, score, mode, completed_at)
--      VALUES ('test', auth.uid()::text, '<some-assignment-id>',
--              '<my-class>', 100, 'classic', NOW());
--      -- Expect: ERROR: permission denied for table progress
--
-- 2. Same INSERT via the RPC must succeed:
--      SELECT save_student_progress(
--        p_student_name      => 'test',
--        p_student_uid       => auth.uid()::text,
--        p_assignment_id     => '<some-assignment-id>',
--        p_class_code        => '<my-class>',
--        p_score             => 100,
--        p_mode              => 'classic'
--      );
--      -- Expect: returns a uuid; row visible via SELECT * FROM progress.
--
-- 3. Service-role direct INSERT still works (sanity check that REVOKE
--    didn't catch the wrong role):
--      -- Connect as service_role; the same INSERT as #1 should succeed.
--
-- ROLLBACK plan (if a write path was missed and saves start failing in
-- prod):
--      BEGIN;
--      GRANT INSERT ON public.progress TO authenticated;
--      GRANT INSERT ON public.progress TO anon;
--      COMMIT;
--   F3's WITH CHECK on progress_insert is still in place, so rollback
--   leaves us at the pre-C7 (but post-F3) posture: score capped at
--   1000 but inflatable to 1000 on any assignment.
-- =============================================================================

-- END 20260622000000_c7_revoke_progress_insert.sql

-- ====================================================================
-- BEGIN 20260622000001_decode_ai_entity_leaks.sql
-- ====================================================================
-- Decode AI-generated rows that were stored with HTML-entity-encoded
-- punctuation by the old sanitizeAiOutput() (server.ts).  The function
-- used to convert `'`, `"`, `&`, `<`, `>` into their entity forms; every
-- consumer in this codebase renders those columns as TEXT in React, so
-- the entities leaked through to teachers as literal `Leo&#x27;s`.
--
-- We've since switched the sanitizer to a strip-tags approach, but the
-- rows already in these tables remain entity-encoded.  This one-shot
-- decode brings stored data back to its correct form.
--
-- Order of unescape matters: `&amp;` last so a literal "&lt;" in source
-- doesn't get double-decoded.

UPDATE public.sentence_cache
SET sentence = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
       sentence,
       '&#x27;', ''''),
       '&quot;', '"'),
       '&lt;',  '<'),
       '&gt;',  '>'),
       '&amp;', '&')
WHERE sentence ~ '&(#x27|quot|lt|gt|amp);';

UPDATE public.vocabulary_set_word_sentences
SET text = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
       text,
       '&#x27;', ''''),
       '&quot;', '"'),
       '&lt;',  '<'),
       '&gt;',  '>'),
       '&amp;', '&')
WHERE text ~ '&(#x27|quot|lt|gt|amp);';

-- END 20260622000001_decode_ai_entity_leaks.sql

-- ====================================================================
-- BEGIN 20260623000000_school_manager.sql
-- ====================================================================
-- =============================================================================
-- School Manager (principal) role + multi-tenant "schools" layer
-- =============================================================================
-- Adds an organization layer above teachers so a school principal can oversee
-- *only* the teachers + classes + students in their own school — distinct from
-- the existing global `admin` role, which still sees everything.
--
-- Design notes:
--   • A `manager` is a read-only overseer (v1). No write policies are granted;
--     they observe rosters + analytics but never edit a teacher's data.
--   • A class's school is derived through its teacher (`classes.teacher_uid`
--     -> `users.school_id`). We deliberately do NOT denormalize `school_id`
--     onto `classes` so it can never drift from the teacher's school.
--   • Tenant scoping is enforced via SECURITY DEFINER helpers so the RLS
--     subqueries don't recurse on `public.users` (which has its own RLS).
--
-- Provisioning a principal (operator / service-role only — there is no
-- self-serve school onboarding in v1):
--   1) INSERT INTO public.schools (name) VALUES ('Example High') RETURNING id;
--   2) INSERT INTO public.teacher_allowlist (email) VALUES (lower('head@example.com'));
--   3) The principal signs in once via the normal teacher login (Google / OTP),
--      which mints a `teacher` row.
--   4) UPDATE public.users SET role='manager', school_id='<school-uuid>'
--        WHERE email = 'head@example.com';
--   5) Assign teachers to the school:
--      UPDATE public.users SET school_id='<school-uuid>'
--        WHERE email IN ('t1@example.com','t2@example.com');
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) < 200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users (school_id);

-- Add 'manager' to the role CHECK (was: teacher / student / admin).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'admin', 'manager'));

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — bypass RLS, hardened search_path)
-- ---------------------------------------------------------------------------

-- The caller's school, but ONLY when they are a manager. NULL otherwise, so
-- every policy clause below fails closed for non-managers (NULL = x is never
-- TRUE).
CREATE OR REPLACE FUNCTION public.manager_school()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.users
  WHERE uid = auth.uid()::text AND role = 'manager';
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'manager'
  );
$$;

-- The set of classes (id + code) belonging to the caller's school, resolved
-- through each class's teacher. SECURITY DEFINER so policy subqueries that
-- reference it don't recurse through users/classes RLS. Empty for non-managers.
CREATE OR REPLACE FUNCTION public.manager_classes()
RETURNS TABLE(id UUID, code TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.code
  FROM public.classes c
  JOIN public.users u ON u.uid = c.teacher_uid
  WHERE u.school_id = public.manager_school();
$$;

-- ---------------------------------------------------------------------------
-- RLS — schools table
-- ---------------------------------------------------------------------------

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select" ON public.schools;
CREATE POLICY "schools_select" ON public.schools
  FOR SELECT TO authenticated USING (
    public.is_admin()
    OR id = public.manager_school()
    OR id = (SELECT school_id FROM public.users WHERE uid = auth.uid()::text)
  );
-- No insert/update/delete policies: schools are managed by the operator via
-- the service role / dashboard only (fail closed for all clients).

-- ---------------------------------------------------------------------------
-- RLS — extend the existing _select policies with a school-manager clause.
-- Each policy below is recreated VERBATIM from schema.sql plus one OR branch.
-- ---------------------------------------------------------------------------

-- ·· users ·· managers see staff (by school_id) + students (by class membership)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid()::text = uid
    OR public.is_admin()
    OR (
      public.is_manager() AND (
        school_id = public.manager_school()
        OR class_code IN (SELECT code FROM public.manager_classes())
      )
    )
  );

-- ·· classes ··
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (
    (
      teacher_uid = auth.uid()::text
      OR public.is_admin()
      OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
      OR (public.is_manager() AND id IN (SELECT id FROM public.manager_classes()))
    )
    AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ·· assignments ··
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated USING (
    class_id IN (
      SELECT id FROM public.classes
      WHERE teacher_uid = auth.uid()::text
         OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    )
    OR public.is_admin()
    OR (public.is_manager() AND class_id IN (SELECT id FROM public.manager_classes()))
  );

-- ·· progress ··
DROP POLICY IF EXISTS "progress_select" ON public.progress;
CREATE POLICY "progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    auth.uid()::text = student_uid
    OR class_code IN (
      SELECT code FROM public.classes WHERE teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
    OR (public.is_manager() AND class_code IN (SELECT code FROM public.manager_classes()))
  );

-- ---------------------------------------------------------------------------
-- manager_overview() — one round-trip dashboard payload, scoped server-side
-- to the caller's school. Aggregates instead of shipping every progress row.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.manager_overview()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sid    UUID := public.manager_school();
  result JSONB;
BEGIN
  IF sid IS NULL THEN
    -- Not a manager (or unassigned). Fail closed with an explicit marker.
    RETURN jsonb_build_object('error', 'not_a_manager');
  END IF;

  WITH school_classes AS (
    SELECT c.id, c.code, c.teacher_uid
    FROM public.classes c
    JOIN public.users u ON u.uid = c.teacher_uid
    WHERE u.school_id = sid
  ),
  school_students AS (
    SELECT DISTINCT s.uid, s.xp
    FROM public.users s
    WHERE s.class_code IN (SELECT code FROM school_classes)
  )
  SELECT jsonb_build_object(
    'school', (
      SELECT jsonb_build_object('id', sc.id, 'name', sc.name)
      FROM public.schools sc WHERE sc.id = sid
    ),
    'totals', jsonb_build_object(
      'teachers', (SELECT count(*) FROM public.users WHERE school_id = sid AND role = 'teacher'),
      'classes',  (SELECT count(*) FROM school_classes),
      'students', (SELECT count(*) FROM school_students),
      'active_students_7d', (
        SELECT count(DISTINCT p.student_uid)
        FROM public.progress p
        WHERE p.completed_at > now() - interval '7 days'
          AND p.class_code IN (SELECT code FROM school_classes)
      ),
      'games_7d', (
        SELECT count(*)
        FROM public.progress p
        WHERE p.completed_at > now() - interval '7 days'
          AND p.class_code IN (SELECT code FROM school_classes)
      ),
      'total_xp', (SELECT COALESCE(sum(xp), 0) FROM school_students)
    ),
    'teachers', COALESCE((
      SELECT jsonb_agg(t ORDER BY t->>'display_name')
      FROM (
        SELECT jsonb_build_object(
          'uid', u.uid,
          'display_name', u.display_name,
          'email', u.email,
          'class_count', (
            SELECT count(*) FROM public.classes c WHERE c.teacher_uid = u.uid
          ),
          'student_count', (
            SELECT count(DISTINCT s.uid) FROM public.users s
            WHERE s.class_code IN (
              SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid
            )
          ),
          'active_students_7d', (
            SELECT count(DISTINCT p.student_uid) FROM public.progress p
            WHERE p.completed_at > now() - interval '7 days'
              AND p.class_code IN (
                SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid
              )
          ),
          'last_activity', (
            SELECT max(p.completed_at) FROM public.progress p
            WHERE p.class_code IN (
              SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid
            )
          )
        ) AS t
        FROM public.users u
        WHERE u.school_id = sid AND u.role = 'teacher'
      ) sub
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- Authenticated clients may call it; the body self-scopes to the caller's
-- school and returns {"error":"not_a_manager"} for everyone else.
REVOKE ALL ON FUNCTION public.manager_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_overview() TO authenticated;

-- END 20260623000000_school_manager.sql

-- ====================================================================
-- BEGIN 20260623000001_manager_console.sql
-- ====================================================================
-- =============================================================================
-- Principal Console (v2) — aggregate RPCs for the school-manager dashboard
-- =============================================================================
-- Adds the read-only, school-scoped aggregate RPCs that power the console's
-- Overview / Teachers / Classes / Engagement views. Every function:
--   • is SECURITY DEFINER with a hardened search_path,
--   • self-scopes to public.manager_school() (the caller's school; NULL ⇒
--     fails closed with {"error":"not_a_manager"}),
--   • for drill-downs, verifies the requested teacher/class belongs to the
--     caller's school before returning anything (no cross-tenant peeking),
--   • aggregates server-side and references ONLY core tables (users, classes,
--     assignments, progress, schools) so it stays in lockstep with schema.sql.
-- =============================================================================

-- ── Overview: totals + teacher roster + 14-day series + breakdowns ──────────
CREATE OR REPLACE FUNCTION public.manager_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;

  WITH sc AS (
    SELECT c.id, c.name, c.code, c.teacher_uid
    FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid
    WHERE u.school_id = sid
  ),
  ss AS (
    SELECT DISTINCT s.uid, s.xp FROM public.users s WHERE s.class_code IN (SELECT code FROM sc)
  ),
  eng AS (
    SELECT to_char(now()::date - n, 'MM-DD') AS d,
      (SELECT count(DISTINCT p.student_uid) FROM public.progress p
        WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS active,
      (SELECT count(*) FROM public.progress p
        WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS games
    FROM generate_series(13, 0, -1) AS n
  )
  SELECT jsonb_build_object(
    'school', (SELECT jsonb_build_object('id', id, 'name', name) FROM public.schools WHERE id = sid),
    'totals', jsonb_build_object(
      'teachers', (SELECT count(*) FROM public.users WHERE school_id = sid AND role = 'teacher'),
      'classes',  (SELECT count(*) FROM sc),
      'students', (SELECT count(*) FROM ss),
      'active_students_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '7 days'),
      'games_7d', (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '7 days'),
      'total_xp', (SELECT COALESCE(sum(xp), 0) FROM ss)
    ),
    'teachers', (SELECT COALESCE(jsonb_agg(t ORDER BY t->>'display_name'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'uid', u.uid, 'display_name', u.display_name, 'email', u.email,
        'class_count', (SELECT count(*) FROM public.classes c WHERE c.teacher_uid = u.uid),
        'student_count', (SELECT count(DISTINCT s.uid) FROM public.users s WHERE s.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid)),
        'active_students_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid) AND p.completed_at > now() - interval '7 days'),
        'last_activity', (SELECT max(p.completed_at) FROM public.progress p WHERE p.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid))
      ) AS t FROM public.users u WHERE u.school_id = sid AND u.role = 'teacher') q),
    'engagement14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active, 'games', games)), '[]'::jsonb) FROM eng),
    'students_by_class', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC), '[]'::jsonb) FROM (
      SELECT sc.name, (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code) AS cnt FROM sc ORDER BY cnt DESC LIMIT 6) z),
    'xp_by_teacher', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', display_name, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb) FROM (
      SELECT u.display_name, (SELECT COALESCE(sum(s.xp), 0) FROM public.users s WHERE s.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid)) AS xp
      FROM public.users u WHERE u.school_id = sid AND u.role = 'teacher') y),
    'classes', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'code', code,
        'teacher_name', (SELECT display_name FROM public.users WHERE uid = sc.teacher_uid),
        'students', (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code),
        'avg_score', (SELECT round(avg(p.score)) FROM public.progress p WHERE p.class_code = sc.code),
        'completion', CASE WHEN (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code) = 0 THEN 0
          ELSE round(100.0 * (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = sc.code) / (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code)) END,
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = sc.code AND p.completed_at > now() - interval '7 days'),
        'last_activity', (SELECT max(p.completed_at) FROM public.progress p WHERE p.class_code = sc.code)
      ) ORDER BY name), '[]'::jsonb) FROM sc)
  ) INTO result;
  RETURN result;
END; $$;

-- ── Engagement: 30-day trend, 14-day games, day-of-week, game modes ─────────
CREATE OR REPLACE FUNCTION public.manager_engagement()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;

  WITH sc AS (
    SELECT c.code FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid WHERE u.school_id = sid
  )
  SELECT jsonb_build_object(
    'active30', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(29, 0, -1) AS n) a),
    'games14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'games', games)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS games
      FROM generate_series(13, 0, -1) AS n) g),
    'dow', (SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', dow, 'plays', plays) ORDER BY dow), '[]'::jsonb) FROM (
      SELECT EXTRACT(DOW FROM p.completed_at)::int AS dow, count(*) AS plays
      FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '30 days'
      GROUP BY 1) d),
    'modes', (SELECT COALESCE(jsonb_agg(jsonb_build_object('mode', mode, 'plays', plays) ORDER BY plays DESC), '[]'::jsonb) FROM (
      SELECT p.mode, count(*) AS plays
      FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '30 days'
      GROUP BY p.mode ORDER BY plays DESC LIMIT 8) m)
  ) INTO result;
  RETURN result;
END; $$;

-- ── Teacher drill-down (ownership-checked) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.manager_teacher_detail(p_uid TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  -- Cross-tenant guard: the teacher must belong to the caller's school.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = p_uid AND school_id = sid AND role = 'teacher') THEN
    RETURN jsonb_build_object('error', 'not_in_school');
  END IF;

  WITH tc AS (SELECT id, name, code FROM public.classes WHERE teacher_uid = p_uid)
  SELECT jsonb_build_object(
    'teacher', (SELECT jsonb_build_object('uid', u.uid, 'display_name', u.display_name, 'email', u.email,
        'classes', (SELECT count(*) FROM tc),
        'students', (SELECT count(DISTINCT s.uid) FROM public.users s WHERE s.class_code IN (SELECT code FROM tc)),
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM tc) AND p.completed_at > now() - interval '7 days'),
        'xp', (SELECT COALESCE(sum(s.xp), 0) FROM public.users s WHERE s.class_code IN (SELECT code FROM tc)))
      FROM public.users u WHERE u.uid = p_uid),
    'activity14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM tc) AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(13, 0, -1) AS n) a),
    'per_class', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'students', cnt) ORDER BY name), '[]'::jsonb) FROM (
      SELECT tc.name, (SELECT count(*) FROM public.users s WHERE s.class_code = tc.code) AS cnt FROM tc) z),
    'top_students', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', display_name, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb) FROM (
      SELECT s.display_name, COALESCE(s.xp, 0) AS xp FROM public.users s WHERE s.class_code IN (SELECT code FROM tc) ORDER BY s.xp DESC NULLS LAST LIMIT 5) y)
  ) INTO result;
  RETURN result;
END; $$;

-- ── Class drill-down (ownership-checked) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.manager_class_detail(p_class_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); ccode TEXT; result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  -- Cross-tenant guard: the class's teacher must belong to the caller's school.
  SELECT c.code INTO ccode FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid
    WHERE c.id = p_class_id AND u.school_id = sid;
  IF ccode IS NULL THEN RETURN jsonb_build_object('error', 'not_in_school'); END IF;

  SELECT jsonb_build_object(
    'class', (SELECT jsonb_build_object('id', c.id, 'name', c.name, 'code', c.code,
        'teacher_name', (SELECT display_name FROM public.users WHERE uid = c.teacher_uid),
        'students', (SELECT count(*) FROM public.users s WHERE s.class_code = c.code),
        'avg_score', (SELECT round(avg(p.score)) FROM public.progress p WHERE p.class_code = c.code),
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = c.code AND p.completed_at > now() - interval '7 days'))
      FROM public.classes c WHERE c.id = p_class_id),
    'score_dist', (SELECT COALESCE(jsonb_agg(jsonb_build_object('band', band, 'n', n) ORDER BY ord), '[]'::jsonb) FROM (
      SELECT '0–60' band, 1 ord, count(*) FILTER (WHERE p.score < 600) n FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '60–75', 2, count(*) FILTER (WHERE p.score >= 600 AND p.score < 750) FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '75–90', 3, count(*) FILTER (WHERE p.score >= 750 AND p.score < 900) FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '90–100', 4, count(*) FILTER (WHERE p.score >= 900) FROM public.progress p WHERE p.class_code = ccode) sd),
    'activity14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = ccode AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(13, 0, -1) AS n) a),
    'assignments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('title', title, 'completion', completion) ORDER BY created_at DESC), '[]'::jsonb) FROM (
      SELECT a.title, a.created_at,
        CASE WHEN (SELECT count(*) FROM public.users s WHERE s.class_code = ccode) = 0 THEN 0
          ELSE round(100.0 * (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.assignment_id = a.id)
            / (SELECT count(*) FROM public.users s WHERE s.class_code = ccode)) END AS completion
      FROM public.assignments a WHERE a.class_id = p_class_id ORDER BY a.created_at DESC LIMIT 8) asg)
  ) INTO result;
  RETURN result;
END; $$;

-- Authenticated clients may call them; each self-scopes server-side.
REVOKE ALL ON FUNCTION public.manager_engagement()              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_teacher_detail(TEXT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_class_detail(UUID)        FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_engagement()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_teacher_detail(TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_class_detail(UUID)     TO authenticated;

-- END 20260623000001_manager_console.sql

-- ====================================================================
-- BEGIN 20260624000000_developer_dashboard_admin_rpcs.sql
-- ====================================================================
-- =============================================================================
-- 20260624000000_developer_dashboard_admin_rpcs.sql
--
-- Dated to sort AFTER its dependencies: ai_usage_counters (20260621000002),
-- schools (baseline schema + 20260623000000), and the admin-action audit
-- triggers (20260523000000).
--
-- Backs the admin-only Developer Dashboard (src/views/DeveloperDashboardView).
--
-- WHY this exists: teacher_allowlist + ai_allowlist have NO RLS policies, so
-- even an admin's authenticated session cannot read or mutate them from the
-- browser (only the service role bypasses RLS).  The dashboard therefore goes
-- through these SECURITY DEFINER RPCs, each of which fails closed unless the
-- caller is role='admin'.  Allowlist + role + plan mutations are already
-- audit-logged by the triggers in 20260523000000_audit_admin_actions.sql; the
-- plan-change RPC adds its own audit row since no trigger covers plan edits.
--
-- All functions:
--   * require an authenticated admin (42501 otherwise),
--   * pin search_path,
--   * are granted to `authenticated` only (anon is revoked at the bottom).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared guard — RAISEs unless the current session is an admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller_uid TEXT := auth.uid()::text;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = caller_uid AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin privilege required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Overview KPIs — one round-trip for the dashboard header strip.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  v_cost_today BIGINT := 0;
  v_cost_7d    BIGINT := 0;
  v_cost_30d   BIGINT := 0;
  v_calls_30d  BIGINT := 0;
BEGIN
  PERFORM public.assert_admin();

  -- ai_usage_counters may not be deployed yet (its migration is independent).
  -- plpgsql plans this block lazily, so the guard keeps us from referencing a
  -- missing relation; absence simply yields zero spend.
  IF to_regclass('public.ai_usage_counters') IS NOT NULL THEN
    SELECT
      COALESCE(sum(cost_micro_usd) FILTER (WHERE day_bucket = current_date), 0),
      COALESCE(sum(cost_micro_usd) FILTER (WHERE day_bucket > current_date - 7), 0),
      COALESCE(sum(cost_micro_usd) FILTER (WHERE day_bucket > current_date - 30), 0),
      COALESCE(sum(count)          FILTER (WHERE day_bucket > current_date - 30), 0)
    INTO v_cost_today, v_cost_7d, v_cost_30d, v_calls_30d
    FROM public.ai_usage_counters;
  END IF;

  SELECT jsonb_build_object(
    'teachers',  (SELECT count(*) FROM public.users WHERE role = 'teacher'),
    'students',  (SELECT count(*) FROM public.users WHERE role = 'student'),
    'managers',  (SELECT count(*) FROM public.users WHERE role = 'manager'),
    'admins',    (SELECT count(*) FROM public.users WHERE role = 'admin'),
    'classes',   (SELECT count(*) FROM public.classes),
    'schools',   (SELECT count(*) FROM public.schools),
    'ai_cost_micro_today', v_cost_today,
    'ai_cost_micro_7d',    v_cost_7d,
    'ai_cost_micro_30d',   v_cost_30d,
    'ai_calls_30d',        v_calls_30d
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. AI usage breakdown — by day, by action, and the top spenders.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_ai_usage(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since DATE := current_date - v_days;
BEGIN
  PERFORM public.assert_admin();

  -- See admin_dashboard_overview: degrade to empty breakdowns when the
  -- ai_usage_counters table isn't deployed yet.
  IF to_regclass('public.ai_usage_counters') IS NULL THEN
    RETURN jsonb_build_object(
      'days', v_days,
      'by_day', '[]'::jsonb,
      'by_action', '[]'::jsonb,
      'top_teachers', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'days', v_days,
    'by_day', COALESCE((
      SELECT jsonb_agg(j ORDER BY j->>'day')
      FROM (
        SELECT jsonb_build_object(
          'day', day_bucket,
          'calls', sum(count),
          'cost_micro', sum(cost_micro_usd)
        ) AS j
        FROM public.ai_usage_counters
        WHERE day_bucket > v_since
        GROUP BY day_bucket
      ) d
    ), '[]'::jsonb),
    'by_action', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'cost_micro')::bigint DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'action', action,
          'calls', sum(count),
          'cost_micro', sum(cost_micro_usd)
        ) AS j
        FROM public.ai_usage_counters
        WHERE day_bucket > v_since
        GROUP BY action
      ) a
    ), '[]'::jsonb),
    'top_teachers', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'cost_micro')::bigint DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'teacher_uid', c.teacher_uid,
          'email', u.email,
          'calls', sum(c.count),
          'cost_micro', sum(c.cost_micro_usd)
        ) AS j
        FROM public.ai_usage_counters c
        LEFT JOIN public.users u ON u.uid = c.teacher_uid
        WHERE c.day_bucket > v_since
        GROUP BY c.teacher_uid, u.email
        ORDER BY sum(c.cost_micro_usd) DESC NULLS LAST
        LIMIT 25
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Entitlements list — every teacher/manager/admin email with their plan,
--    AI-allowlist state, and school.  The ONLY read path for the allowlists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_entitlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH emails AS (
    SELECT lower(email) AS email FROM public.teacher_allowlist WHERE email IS NOT NULL
    UNION
    SELECT lower(email) FROM public.users
    WHERE role IN ('teacher', 'manager', 'admin') AND email IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'email', e.email,
      'uid', u.uid,
      'role', u.role,
      'plan', u.plan,
      'trial_ends_at', u.trial_ends_at,
      'school_id', u.school_id,
      'school_name', s.name,
      'ai_enabled', (ai.email IS NOT NULL),
      'allowlisted', (ta.email IS NOT NULL),
      'signed_up', (u.uid IS NOT NULL)
    ) ORDER BY e.email
  ), '[]'::jsonb)
  INTO result
  FROM emails e
  LEFT JOIN public.users u ON lower(u.email) = e.email
  LEFT JOIN public.teacher_allowlist ta ON lower(ta.email) = e.email
  LEFT JOIN public.ai_allowlist ai ON lower(ai.email) = e.email
  LEFT JOIN public.schools s ON s.id = u.school_id;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Teacher allowlist add / remove.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_add_teacher(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
BEGIN
  PERFORM public.assert_admin();
  IF position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.teacher_allowlist (email)
  VALUES (v_email)
  ON CONFLICT (email) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_teacher(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.teacher_allowlist WHERE lower(email) = v_email;
  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Per-teacher AI access — toggle the ai_allowlist membership.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_ai_access(p_email TEXT, p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
BEGIN
  PERFORM public.assert_admin();
  IF position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.ai_allowlist (email) VALUES (v_email)
    ON CONFLICT (email) DO NOTHING;
  ELSE
    DELETE FROM public.ai_allowlist WHERE lower(email) = v_email;
  END IF;

  RETURN jsonb_build_object('success', true, 'email', v_email, 'ai_enabled', p_enabled);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Plan / trial setter.  No trigger audits plan edits, so we log here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_plan(
  p_uid TEXT,
  p_plan TEXT,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_old_plan TEXT;
BEGIN
  PERFORM public.assert_admin();
  IF p_plan NOT IN ('free', 'pro', 'school') THEN
    RAISE EXCEPTION 'plan must be free, pro, or school' USING ERRCODE = '22023';
  END IF;

  SELECT plan INTO v_old_plan FROM public.users WHERE uid = p_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', p_uid USING ERRCODE = '23503';
  END IF;

  UPDATE public.users
  SET plan = p_plan,
      trial_ends_at = p_trial_ends_at
  WHERE uid = p_uid;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    auth.uid()::text,
    'plan_change',
    'users',
    p_uid,
    jsonb_build_object('old_plan', v_old_plan, 'new_plan', p_plan, 'trial_ends_at', p_trial_ends_at)
  );

  RETURN jsonb_build_object('success', true, 'uid', p_uid, 'plan', p_plan);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Schools — list, create, and assign a manager.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_schools()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'created_at', s.created_at,
      'teachers', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role IN ('teacher', 'manager')),
      'students', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'student'),
      'managers', (SELECT COALESCE(jsonb_agg(u.email), '[]'::jsonb) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'manager')
    ) ORDER BY s.name
  ), '[]'::jsonb)
  INTO result
  FROM public.schools s;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_school(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_name TEXT := trim(COALESCE(p_name, ''));
  v_id UUID;
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'school name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.schools (name) VALUES (v_name) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'name', v_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_manager(p_email TEXT, p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid TEXT;
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;

  SELECT uid INTO v_uid FROM public.users WHERE lower(email) = v_email LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no signed-up user with email % — they must sign in once first', v_email
      USING ERRCODE = '23503';
  END IF;

  -- role-change here fires the audit trigger from 20260523000000.
  UPDATE public.users
  SET role = 'manager', school_id = p_school_id
  WHERE uid = v_uid;

  RETURN jsonb_build_object('success', true, 'uid', v_uid, 'school_id', p_school_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; the per-function assert_admin() does the
-- real gating.  anon never reaches these.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.assert_admin()                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_dashboard_overview()           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_usage(INTEGER)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_entitlements()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_teacher(TEXT)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_teacher(TEXT)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_ai_access(TEXT, BOOLEAN)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_plan(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_schools()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_school(TEXT)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_assign_manager(TEXT, UUID)    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage(INTEGER)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_entitlements()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_teacher(TEXT)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_teacher(TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_access(TEXT, BOOLEAN)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_schools()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_school(TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_manager(TEXT, UUID)    TO authenticated;

COMMENT ON FUNCTION public.admin_dashboard_overview IS
  'Admin-only Developer Dashboard: KPI overview (user/class/school counts, AI cost rollups).';
COMMENT ON FUNCTION public.admin_list_entitlements IS
  'Admin-only: per-teacher plan + ai_allowlist + school state. Only read path for the RLS-less allowlists.';

-- END 20260624000000_developer_dashboard_admin_rpcs.sql

-- ====================================================================
-- BEGIN 20260624000000_school_license_propagates_pro.sql
-- ====================================================================
-- =============================================================================
-- School license propagates Pro to a school's teachers ("whole school = Pro")
-- =============================================================================
-- The school/manager tenant layer (20260623000000_school_manager.sql) gave a
-- principal read-only oversight, but a `schools` row carried no billing state
-- and did NOT entitle its teachers to anything. This migration makes a *paid*
-- school lift every member to Pro -- one switch per school instead of stamping
-- users.plan on each teacher by hand.
--
-- Model (chosen 2026-05-25): whole-school = all Pro. A school whose plan is
-- 'school' (an active license) OR whose school-wide trial is unexpired makes
-- every user with that school_id behave as Pro everywhere caps are enforced:
--   * Supabase RLS Free-tier caps (1 class / 30 students) -> is_pro_or_trialing()
--   * Fly.io AI endpoint gates (sentence-gen, OCR)        -> server.ts
--       requireProTeacher + /api/features (updated in the same change)
-- Derivation, not denormalisation: the plan is never copied onto users.plan,
-- so it cannot drift (mirrors why 20260623000000 derives a class's school
-- through its teacher rather than denormalising school_id onto classes).
--
-- PAYWALL-BYPASS DEFENCE (critical): because school membership now confers Pro,
-- `users.school_id` becomes a billing-sensitive column. It was NOT pinned by
-- check_user_update_allowed (school_id was added in 20260623000000, AFTER
-- 20260602_lock_users_plan_columns). Without this migration a Free teacher
-- could PATCH their own row to a paid school's id and get Pro for free. We pin
-- school_id on self-update and forbid setting it on self-insert. All legitimate
-- school assignment goes through service_role (operator/admin), which bypasses
-- RLS.
--
-- Operator -- mark a school paid (lifts all its teachers to Pro):
--   UPDATE public.schools SET plan='school' WHERE id='<school-uuid>';
-- Give a school a trial instead:
--   UPDATE public.schools SET trial_ends_at = now() + interval '30 days'
--     WHERE id='<school-uuid>';
-- Stop a lapsed license (members fall back to their own plan):
--   UPDATE public.schools SET plan='free', trial_ends_at=NULL WHERE id='<school-uuid>';
-- =============================================================================

BEGIN;

-- ─── 1. Billing state on schools ────────────────────────────────────
-- 'free'   = no active license (default; members keep their own plan)
-- 'school' = active school license (every member user is Pro)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'school')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.schools.plan IS
  'free = no license (members keep their own plan); school = active license that makes every member user Pro via is_pro_or_trialing(). Operator/service-role only -- schools has no client write policy.';
COMMENT ON COLUMN public.schools.trial_ends_at IS
  'Optional school-wide Pro trial. While > now(), every member user is Pro even if the school plan is free. Operator/service-role only.';

-- ─── 2. is_pro_or_trialing(): inherit Pro from a paid school ─────────
-- Recreated verbatim from 20260514_dev_email_pro_bypass.sql plus one school
-- branch. CREATE OR REPLACE preserves the existing EXECUTE grants
-- (authenticated only; revoked from anon in 20260517115649). Keep the
-- dev-email allowlist in sync with src/core/dev-allowlist.ts.
CREATE OR REPLACE FUNCTION public.is_pro_or_trialing()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text
      AND (
        u.plan IN ('pro', 'school')
        OR (u.trial_ends_at IS NOT NULL AND u.trial_ends_at > now())
        OR u.role = 'admin'
        OR LOWER(u.email) IN ('wasya92@gmail.com')
        -- Whole-school license: a member of a paid (or school-trialing)
        -- school inherits Pro. A NULL school_id never matches a schools row.
        OR EXISTS (
          SELECT 1 FROM public.schools s
          WHERE s.id = u.school_id
            AND (
              s.plan = 'school'
              OR (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now())
            )
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_pro_or_trialing() IS
  'TRUE when the current auth.uid is Pro: own plan pro/school, inside their own trial, admin role, dev-allowlist email, OR a member of a school whose license is active (plan=school or unexpired school trial). Used by RLS Free-tier gates. Keep the email list in sync with src/core/dev-allowlist.ts.';

-- ─── 3. Pin school_id against self-service (paywall-bypass defence) ──
-- Extend check_user_update_allowed to a 6-arg form that also pins school_id,
-- and re-wire users_update. Drop the dependent policy first so the function
-- drop does not fail on pg_depend; recreate inside the same transaction so the
-- table is never without an UPDATE policy.
DROP POLICY IF EXISTS users_update ON public.users;

DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid               text,
  p_new_role          text,
  p_new_class_code    text,
  p_new_plan          text,
  p_new_trial_ends_at timestamptz,
  p_new_school_id     uuid
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- TRUE iff every locked column in the proposed row matches the existing row
  -- for this uid. A FALSE return makes the RLS WITH CHECK reject the update.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = p_uid
      AND role = p_new_role
      AND (class_code IS NULL OR class_code = p_new_class_code)
      AND COALESCE(plan, 'free') = COALESCE(p_new_plan, 'free')
      AND COALESCE(trial_ends_at, '1970-01-01'::timestamptz)
        = COALESCE(p_new_trial_ends_at, '1970-01-01'::timestamptz)
      AND COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(p_new_school_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

COMMENT ON FUNCTION public.check_user_update_allowed IS
  'TRUE only if role, class_code, plan, trial_ends_at AND school_id on the proposed row match the existing values for this uid -- i.e. the caller is not self-promoting or self-assigning to a (paid) school. Used by the users_update RLS WITH CHECK. service_role bypasses RLS, so operator/admin writes are unaffected.';

CREATE POLICY users_update ON public.users
  AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()))::text = uid) OR is_admin())
  WITH CHECK (
    is_admin()
    OR check_user_update_allowed(
      ((SELECT auth.uid()))::text,
      role,
      class_code,
      plan,
      trial_ends_at,
      school_id
    )
  );

COMMENT ON POLICY users_update ON public.users IS
  'Owner may edit own row; admins may edit any. Caller cannot self-change role, class_code, plan, trial_ends_at, or school_id -- all pinned by check_user_update_allowed. School assignment + paywall changes are set on service_role only (the operator does it manually -- there is no automatic payment integration), which bypasses RLS.';

-- ─── 4. Forbid self-assigning a school on INSERT ────────────────────
-- A fresh sign-up must not stamp itself into a school (which would inherit that
-- school's Pro). Operator/service-role sets school_id after the row exists.
-- Mirrors the plan/trial pinning added in 20260602_lock_users_plan_columns.sql.
DROP POLICY IF EXISTS users_insert ON public.users;

CREATE POLICY users_insert ON public.users
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (((SELECT auth.uid()))::text = uid)
    AND (role = ANY (ARRAY['teacher'::text, 'student'::text]))
    AND COALESCE(plan, 'free') = 'free'
    AND (
      trial_ends_at IS NULL
      OR trial_ends_at <= now() + interval '31 days'
    )
    AND school_id IS NULL
  );

COMMENT ON POLICY users_insert ON public.users IS
  'Sign-up may only create a Free-tier row, a trial ending within 31 days, and NO school_id. Longer trials, paid plans, and school assignment must be set by service_role (the operator, manually).';

COMMIT;

-- =============================================================================
-- Verification (run manually after applying):
--
-- 1. A paid school lifts a member teacher to Pro (run in that teacher's session):
--      -- operator: UPDATE public.schools SET plan='school' WHERE id='<sid>';
--      -- operator: UPDATE public.users   SET school_id='<sid>' WHERE uid='<teacher-uid>';
--      SELECT public.is_pro_or_trialing();           -- expect: t
--      -- then operator: UPDATE public.schools SET plan='free' WHERE id='<sid>';
--      SELECT public.is_pro_or_trialing();           -- expect: f (if no own plan/trial)
--
-- 2. school_id is pinned (run as an authenticated teacher whose school_id IS NULL):
--      UPDATE public.users SET school_id='<any-school-uuid>' WHERE uid=auth.uid()::text;
--      -- expect: 0 rows / RLS WITH CHECK rejection (paywall-bypass blocked)
--
-- 3. Function signature is the new 6-arg form:
--      SELECT pg_get_function_identity_arguments(oid) FROM pg_proc
--      WHERE proname='check_user_update_allowed' AND pronamespace='public'::regnamespace;
--      -- expect: ... p_new_school_id uuid
-- =============================================================================

-- END 20260624000000_school_license_propagates_pro.sql

-- ====================================================================
-- BEGIN 20260625000000_admin_remove_teacher_demotes.sql
-- ====================================================================
-- =============================================================================
-- 20260625000000_admin_remove_teacher_demotes.sql
--
-- "Remove teacher" in the admin Developer Dashboard previously only ran
-- DELETE FROM teacher_allowlist.  That did nothing for the now-common freemium
-- teachers (self-signed-up, never allowlisted) and, even for allowlisted ones,
-- left their role='teacher' + classes intact — so the teacher was never really
-- removed.
--
-- Redefine admin_remove_teacher so it actually removes the teacher: drop any
-- allowlist entry AND demote a signed-up teacher to 'student', which revokes
-- teacher access (hasTeacherAccess) and drops them off the teacher roster /
-- manager console while preserving their underlying data (reversible: re-add to
-- the allowlist and have them sign in again).  Admin targets are refused;
-- managers are left untouched.  The role + allowlist mutations stay audit-logged
-- by the triggers in 20260523000000_audit_admin_actions.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_remove_teacher(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email   TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid     TEXT;
  v_role    TEXT;
  v_demoted BOOLEAN := false;
BEGIN
  PERFORM public.assert_admin();

  SELECT uid, role INTO v_uid, v_role
  FROM public.users
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot remove an admin account' USING ERRCODE = '42501';
  END IF;

  -- Always drop any allowlist entry (also covers a not-yet-signed-up invite).
  DELETE FROM public.teacher_allowlist WHERE lower(email) = v_email;

  -- Revoke teacher access for a signed-up teacher.  role='student' keeps the
  -- row + their data but removes them from hasTeacherAccess and the entitlements
  -- list (which keys off role IN ('teacher','manager','admin')).
  IF v_uid IS NOT NULL AND v_role = 'teacher' THEN
    UPDATE public.users SET role = 'student' WHERE uid = v_uid;
    v_demoted := true;
  END IF;

  RETURN jsonb_build_object('success', true, 'email', v_email, 'demoted', v_demoted);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_teacher(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_teacher(TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_remove_teacher IS
  'Admin-only: remove a teacher — delete any teacher_allowlist entry and demote a signed-up teacher to student (revokes teacher access; data preserved). Refuses admin targets; leaves managers untouched.';

-- END 20260625000000_admin_remove_teacher_demotes.sql

-- ====================================================================
-- BEGIN 20260626000000_developer_dashboard_batch1_rpcs.sql
-- ====================================================================
-- =============================================================================
-- 20260626000000_developer_dashboard_batch1_rpcs.sql
--
-- Batch 1 of the developer-dashboard expansion. Adds five admin-only RPCs:
--
--   1. admin_search_users        — user lookup by email / class code / uid
--   2. admin_list_audit_log      — paginated read of audit_log with filters
--   3. admin_trial_funnel        — trial state + conversion-rate snapshot
--   4. admin_export_user_data    — admin-side GDPR Art. 15 export (parent req.)
--   5. admin_delete_user_account — admin-side GDPR Art. 17 erasure (parent req.)
--
-- Pattern matches 20260624000000_developer_dashboard_admin_rpcs.sql:
--   * each function calls public.assert_admin() at the top,
--   * pins search_path = pg_catalog, public, auth,
--   * is SECURITY DEFINER + REVOKEd from anon / PUBLIC,
--   * is granted to `authenticated` (assert_admin enforces the role check).
-- All mutating actions write an audit_log row before mutating so a rolled-back
-- transaction still leaves a trail of the *attempt*.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_search_users — substring/code lookup, returns rich profile +
--    owned classes + last activity timestamp. Caps at 200 results.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_search_users(
  p_query TEXT,
  p_limit INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  q      TEXT := lower(trim(COALESCE(p_query, '')));
  v_limit INT  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);
BEGIN
  PERFORM public.assert_admin();

  -- Two-character minimum keeps an accidental empty input from returning
  -- the whole users table.
  IF char_length(q) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH matches AS (
    SELECT u.*
    FROM public.users u
    WHERE lower(u.email) LIKE '%' || q || '%'
       OR lower(u.display_name) LIKE '%' || q || '%'
       OR u.uid = q
       OR EXISTS (
         SELECT 1 FROM public.classes c
         WHERE c.teacher_uid = u.uid AND lower(c.code) = q
       )
       OR upper(u.class_code) = upper(q)
    ORDER BY u.role, lower(u.email)
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'uid', m.uid,
      'email', m.email,
      'display_name', m.display_name,
      'role', m.role,
      'plan', m.plan,
      'trial_ends_at', m.trial_ends_at,
      'school_id', m.school_id,
      'school_name', s.name,
      'first_seen_at', m.first_seen_at,
      'consent_given_at', m.consent_given_at,
      'classes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'code', c.code,
          'student_count', (
            SELECT count(DISTINCT p.student_uid)
            FROM public.progress p WHERE p.class_code = c.code
          )
        ) ORDER BY c.name)
        FROM public.classes c WHERE c.teacher_uid = m.uid
      ), '[]'::jsonb),
      'last_activity_at', (
        SELECT max(p.completed_at) FROM public.progress p WHERE p.student_uid = m.uid
      )
    )
  ), '[]'::jsonb)
  INTO result
  FROM matches m
  LEFT JOIN public.schools s ON s.id = m.school_id;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. admin_list_audit_log — newest-first list with optional filters.
--    Joins actor + target uids to email for human-readable display.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_audit_log(
  p_limit  INTEGER       DEFAULT 100,
  p_action TEXT          DEFAULT NULL,
  p_actor  TEXT          DEFAULT NULL,
  p_since  TIMESTAMPTZ   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result  JSONB;
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  PERFORM public.assert_admin();

  WITH page AS (
    SELECT *
    FROM public.audit_log al
    WHERE (p_action IS NULL OR al.action      = p_action)
      AND (p_actor  IS NULL OR al.actor_uid   = p_actor)
      AND (p_since  IS NULL OR al.created_at >= p_since)
    ORDER BY al.created_at DESC
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'actor_uid', p.actor_uid,
      'actor_email', ua.email,
      'action', p.action,
      'data_category', p.data_category,
      'target_uid', p.target_uid,
      'target_email', ut.email,
      'metadata', p.metadata,
      'created_at', p.created_at
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM page p
  LEFT JOIN public.users ua ON ua.uid = p.actor_uid
  LEFT JOIN public.users ut ON ut.uid = p.target_uid;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. admin_trial_funnel — snapshot + days-remaining histogram.
--
-- Caveat: "converted" is an approximation — we count teachers on a paid plan
-- whose first_seen_at falls inside the window. That overcounts teachers who
-- arrived on a school license (never trialed) and undercounts teachers whose
-- trial expired and converted later in a separate window. Directionally fine
-- for "is conversion improving."  A precise cohort metric would need a
-- plan_history table; tracked as a follow-up.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_trial_funnel(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result          JSONB;
  v_days          INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since         TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
  v_trialing_now  INT;
  v_expired       INT;
  v_converted     INT;
  v_rate          NUMERIC;
  v_pro_total     INT;
  v_school_total  INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*) INTO v_trialing_now
  FROM public.users
  WHERE role = 'teacher' AND plan = 'free' AND trial_ends_at > now();

  SELECT count(*) INTO v_expired
  FROM public.users
  WHERE role = 'teacher'
    AND plan = 'free'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at <= now();

  SELECT count(*) INTO v_converted
  FROM public.users
  WHERE role = 'teacher'
    AND plan IN ('pro', 'school')
    AND first_seen_at >= v_since;

  SELECT
    count(*) FILTER (WHERE plan = 'pro'),
    count(*) FILTER (WHERE plan = 'school')
  INTO v_pro_total, v_school_total
  FROM public.users
  WHERE role = 'teacher';

  IF (v_converted + v_expired + v_trialing_now) > 0 THEN
    v_rate := v_converted::numeric / (v_converted + v_expired + v_trialing_now);
  ELSE
    v_rate := 0;
  END IF;

  SELECT jsonb_build_object(
    'days',            v_days,
    'trialing_now',    v_trialing_now,
    'expired',         v_expired,
    'converted',       v_converted,
    'conversion_rate', v_rate,
    'paid_total',      jsonb_build_object('pro', v_pro_total, 'school', v_school_total),
    'trialing_buckets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('days_left', bucket, 'count', cnt) ORDER BY bucket)
      FROM (
        SELECT
          CASE
            WHEN trial_ends_at - now() <= interval '1 day'  THEN 1
            WHEN trial_ends_at - now() <= interval '3 days' THEN 3
            WHEN trial_ends_at - now() <= interval '7 days' THEN 7
            ELSE 14
          END AS bucket,
          count(*) AS cnt
        FROM public.users
        WHERE role = 'teacher' AND plan = 'free' AND trial_ends_at > now()
        GROUP BY 1
      ) buckets
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. admin_export_user_data — admin-side wrapper around the GDPR Art. 15
--    export logic in 20260522020000_expand_export_and_delete.sql.
--
-- Why this duplicates export_my_data: the original is intentionally
-- self-service (uses auth.uid()). A parent request scenario needs an admin
-- to export on behalf of a target uid, so we re-author the same payload
-- shape with the target's uid + a separate audit action.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_export_user_data(p_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT;
  v_exists BOOLEAN;
  result  JSONB;
  caller  TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();

  SELECT email, true INTO v_email, v_exists FROM public.users WHERE uid = p_uid;
  IF NOT COALESCE(v_exists, false) THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  SELECT jsonb_build_object(
    'export_format_version', '2026-05-22',
    'exported_at',           now(),
    'exported_by_admin',     caller,
    'subject_uid',           p_uid,
    'subject_email',         v_email,
    'tables', jsonb_build_object(
      'user', (
        SELECT to_jsonb(u.*) FROM public.users u WHERE u.uid = p_uid
      ),
      'student_profile', (
        SELECT to_jsonb(sp.*) FROM public.student_profiles sp
        WHERE sp.auth_uid::text = p_uid LIMIT 1
      ),
      'teacher_profile', (
        SELECT to_jsonb(tp.*) FROM public.teacher_profiles tp
        WHERE tp.email = v_email LIMIT 1
      ),
      'classes_owned', (
        SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
        FROM public.classes c WHERE c.teacher_uid = p_uid
      ),
      'progress', (
        SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb)
        FROM public.progress p WHERE p.student_uid = p_uid
      ),
      'consent_history', (
        SELECT COALESCE(jsonb_agg(to_jsonb(cl.*)), '[]'::jsonb)
        FROM public.consent_log cl WHERE cl.uid = p_uid
      ),
      'audit_log_as_actor', (
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.actor_uid = p_uid
      ),
      'audit_log_as_target', (
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.target_uid = p_uid AND al.actor_uid <> p_uid
      )
    )
  ) INTO result;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid)
  VALUES (caller, 'admin_export_user', 'all', p_uid);

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. admin_delete_user_account — admin-side wrapper around the GDPR Art. 17
--    erasure logic. Refuses on admin / manager targets (change role first)
--    and on self (use delete_my_account instead).
--
-- Audit row is INSERTed BEFORE the destructive deletes so a rolled-back
-- transaction still preserves the attempt record. The audit_log retention
-- argument from 20260522020000 (730-day legal-claim exemption + the
-- immutability trigger from 20260518120000) carries over unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user_account(
  p_uid TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_role  TEXT;
  v_email TEXT;
  caller  TEXT := auth.uid()::text;
  deleted_progress         INT := 0;
  deleted_classes          INT := 0;
  deleted_student_profile  INT := 0;
  deleted_teacher_profile  INT := 0;
  deleted_auth_user        INT := 0;
BEGIN
  PERFORM public.assert_admin();

  SELECT role, email INTO v_role, v_email FROM public.users WHERE uid = p_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  IF v_role IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Cannot delete % accounts via this RPC — change role first', v_role
      USING ERRCODE = '42501';
  END IF;

  IF caller = p_uid THEN
    RAISE EXCEPTION 'Use delete_my_account() for self-deletion'
      USING ERRCODE = '42501';
  END IF;

  -- Audit FIRST — see migration header.
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    caller,
    'admin_delete_user',
    'all',
    p_uid,
    jsonb_build_object(
      'role',         v_role,
      'reason',       COALESCE(trim(p_reason), ''),
      'email_domain', split_part(COALESCE(v_email, ''), '@', 2)
    )
  );

  IF v_role = 'student' THEN
    DELETE FROM public.progress WHERE student_uid = p_uid;
    GET DIAGNOSTICS deleted_progress = ROW_COUNT;

    DELETE FROM public.student_profiles WHERE auth_uid::text = p_uid;
    GET DIAGNOSTICS deleted_student_profile = ROW_COUNT;

    DELETE FROM public.consent_log WHERE uid = p_uid;

  ELSIF v_role = 'teacher' THEN
    -- Anonymise gradebook progress for the teacher's classes
    -- (student rows survive — those belong to the students).
    UPDATE public.progress
    SET student_name = 'Deleted Student'
    WHERE class_code IN (SELECT code FROM public.classes WHERE teacher_uid = p_uid)
      AND student_uid NOT IN (SELECT uid FROM public.users WHERE role = 'student');

    IF v_email IS NOT NULL THEN
      DELETE FROM public.teacher_profiles WHERE email = v_email;
      GET DIAGNOSTICS deleted_teacher_profile = ROW_COUNT;
    END IF;

    DELETE FROM public.classes WHERE teacher_uid = p_uid;
    GET DIAGNOSTICS deleted_classes = ROW_COUNT;

    DELETE FROM public.consent_log WHERE uid = p_uid;
  END IF;

  DELETE FROM public.users WHERE uid = p_uid;

  -- Same defensive wrap as delete_my_account — see 20260522020000 header.
  BEGIN
    DELETE FROM auth.users WHERE id::text = p_uid;
    GET DIAGNOSTICS deleted_auth_user = ROW_COUNT;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
      deleted_auth_user := -1;
  END;

  RETURN jsonb_build_object(
    'success',                  true,
    'uid',                      p_uid,
    'role',                     v_role,
    'deleted_progress',         deleted_progress,
    'deleted_classes',          deleted_classes,
    'deleted_student_profile',  deleted_student_profile,
    'deleted_teacher_profile',  deleted_teacher_profile,
    'deleted_auth_user',        deleted_auth_user,
    'audit_log_retained_until', (CURRENT_DATE + INTERVAL '730 days')
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() does the real gating.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_search_users(TEXT, INTEGER)                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit_log(INTEGER, TEXT, TEXT, TIMESTAMPTZ)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_trial_funnel(INTEGER)                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_export_user_data(TEXT)                                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user_account(TEXT, TEXT)                        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_search_users(TEXT, INTEGER)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_log(INTEGER, TEXT, TEXT, TIMESTAMPTZ)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_trial_funnel(INTEGER)                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_export_user_data(TEXT)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(TEXT, TEXT)                     TO authenticated;

COMMENT ON FUNCTION public.admin_search_users IS
  'Admin-only: substring lookup over users.email/display_name + exact class code/uid match.';
COMMENT ON FUNCTION public.admin_list_audit_log IS
  'Admin-only: newest-first read of audit_log with optional action/actor/since filters.';
COMMENT ON FUNCTION public.admin_trial_funnel IS
  'Admin-only: trial snapshot — trialing/expired/converted counts + days-remaining histogram. Converted is approximate (see header).';
COMMENT ON FUNCTION public.admin_export_user_data IS
  'Admin-only GDPR Art. 15 export on behalf of a target uid (parent-request scenario). Mirrors export_my_data payload shape.';
COMMENT ON FUNCTION public.admin_delete_user_account IS
  'Admin-only GDPR Art. 17 erasure on behalf of a target uid. Refuses admin/manager and self targets.';

-- END 20260626000000_developer_dashboard_batch1_rpcs.sql

-- ===== SKIPPED (superseded): 20260627000000_feature_flags.sql =====

-- ====================================================================
-- BEGIN 20260627000001_announcements.sql
-- ====================================================================
-- =============================================================================
-- 20260627000001_announcements.sql
--
-- Admin-broadcast announcement banner. Two tables:
--
--   1. announcements           — the messages themselves (admin-managed).
--   2. announcement_dismissals — per-user dismissal records, so a teacher
--                                who clicked "X" on a banner doesn't see it
--                                next login.
--
-- Read posture:
--   * All authenticated users can SELECT announcements (the banner needs
--     them) and their OWN dismissal rows.
--
-- Write posture:
--   * announcements: admin RPCs only.
--   * announcement_dismissals: each user inserts their own (gated by RLS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  message    TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  level      TEXT NOT NULL CHECK (level IN ('info','warning','critical')) DEFAULT 'info',
  audience   TEXT NOT NULL CHECK (audience IN ('teachers','students','all')) DEFAULT 'teachers',
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at    TIMESTAMPTZ,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  uid             TEXT NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active        ON public.announcements (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_uid ON public.announcement_dismissals (uid);

ALTER TABLE public.announcements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "announcement_dismissals_select" ON public.announcement_dismissals;
CREATE POLICY "announcement_dismissals_select" ON public.announcement_dismissals
  FOR SELECT USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "announcement_dismissals_insert" ON public.announcement_dismissals;
CREATE POLICY "announcement_dismissals_insert" ON public.announcement_dismissals
  FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- ---------------------------------------------------------------------------
-- Admin CRUD
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_announcements()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'message', a.message,
      'level', a.level,
      'audience', a.audience,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'dismissible', a.dismissible,
      'created_by', a.created_by,
      'created_by_email', u.email,
      'created_at', a.created_at,
      'is_active', (a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())),
      'dismissed_count', (SELECT count(*) FROM public.announcement_dismissals d WHERE d.announcement_id = a.id)
    ) ORDER BY a.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM public.announcements a
  LEFT JOIN public.users u ON u.uid = a.created_by;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_announcement(
  p_title       TEXT,
  p_message     TEXT,
  p_level       TEXT     DEFAULT 'info',
  p_audience    TEXT     DEFAULT 'teachers',
  p_starts_at   TIMESTAMPTZ DEFAULT NULL,
  p_ends_at     TIMESTAMPTZ DEFAULT NULL,
  p_dismissible BOOLEAN  DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_id   UUID;
BEGIN
  PERFORM public.assert_admin();
  IF char_length(trim(COALESCE(p_title, ''))) = 0 OR char_length(trim(COALESCE(p_message, ''))) = 0 THEN
    RAISE EXCEPTION 'title and message are required' USING ERRCODE = '22023';
  END IF;
  IF p_level NOT IN ('info','warning','critical') THEN
    RAISE EXCEPTION 'level must be info, warning, or critical' USING ERRCODE = '22023';
  END IF;
  IF p_audience NOT IN ('teachers','students','all') THEN
    RAISE EXCEPTION 'audience must be teachers, students, or all' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.announcements
    (title, message, level, audience, starts_at, ends_at, dismissible, created_by)
  VALUES
    (trim(p_title), trim(p_message), p_level, p_audience,
     COALESCE(p_starts_at, now()), p_ends_at, p_dismissible, caller)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'announcement_create', 'announcements',
          jsonb_build_object('id', v_id, 'title', p_title, 'level', p_level, 'audience', p_audience));

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_announcement(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.announcements WHERE id = p_id;
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'announcement_delete', 'announcements', jsonb_build_object('id', p_id));
  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- User-facing reads
-- ---------------------------------------------------------------------------

-- Returns announcements that are currently active AND match the caller's
-- audience AND haven't been dismissed by the caller. Used by the global
-- AnnouncementBanner component.
CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_role TEXT;
  result JSONB;
BEGIN
  IF caller IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE uid = caller;
  -- Guests / not-yet-provisioned users see only 'all' announcements.
  IF v_role IS NULL THEN v_role := 'guest'; END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'message', a.message,
      'level', a.level,
      'dismissible', a.dismissible
    ) ORDER BY
      CASE a.level WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      a.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM public.announcements a
  WHERE a.starts_at <= now()
    AND (a.ends_at IS NULL OR a.ends_at > now())
    AND (
      a.audience = 'all'
      OR (a.audience = 'teachers' AND v_role IN ('teacher', 'admin', 'manager'))
      OR (a.audience = 'students' AND v_role = 'student')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.announcement_dismissals d
      WHERE d.announcement_id = a.id AND d.uid = caller
    );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_announcement(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.announcement_dismissals (uid, announcement_id)
  VALUES (caller, p_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_list_announcements()                                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_announcement(UUID)                                        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_announcements()                                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_announcement(UUID)                                             FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_announcements()                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_announcement(UUID)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_announcements()                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_announcement(UUID)                                          TO authenticated;

COMMENT ON TABLE public.announcements IS
  'Admin-broadcast banner messages. Read-by-all-authenticated, written via admin RPCs only.';
COMMENT ON TABLE public.announcement_dismissals IS
  'Per-user dismissal records. Each user manages their own rows (gated by RLS).';

-- END 20260627000001_announcements.sql

-- ====================================================================
-- BEGIN 20260628000000_admin_set_role.sql
-- ====================================================================
-- =============================================================================
-- 20260628000000_admin_set_role.sql
--
-- admin_set_role — flip public.users.role for any user. Backs the
-- "Promote to teacher" button on the developer-dashboard User Lookup panel.
--
-- Adding an email to teacher_allowlist alone does NOT promote an existing
-- user; it only gates future signups. To flip a current student to teacher
-- (or any other role transition) we need to UPDATE users.role directly.
--
-- The existing trigger from 20260523000000_audit_admin_actions.sql logs the
-- role change to audit_log automatically, so no explicit audit INSERT here.
--
-- Safeguards:
--   * Refuses self-role-change (admins changing their own role is a footgun
--     and usually a mistake — use the Supabase SQL editor if truly needed).
--   * Refuses to demote the last admin (would leave the org with no admin).
--   * On promotion to teacher/manager/admin, also adds the email to
--     teacher_allowlist so a future re-signup flow succeeds without
--     remembering to do it separately.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_set_role(p_uid TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller        TEXT := auth.uid()::text;
  v_old         TEXT;
  v_email       TEXT;
  v_admin_count INT;
BEGIN
  PERFORM public.assert_admin();

  IF p_role NOT IN ('teacher', 'student', 'admin', 'manager') THEN
    RAISE EXCEPTION 'role must be teacher, student, admin, or manager'
      USING ERRCODE = '22023';
  END IF;

  IF caller = p_uid THEN
    RAISE EXCEPTION 'Cannot change your own role via this RPC'
      USING ERRCODE = '42501';
  END IF;

  SELECT role, email INTO v_old, v_email FROM public.users WHERE uid = p_uid;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  IF v_old = p_role THEN
    RETURN jsonb_build_object('success', true, 'unchanged', true, 'role', p_role);
  END IF;

  IF v_old = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*) INTO v_admin_count FROM public.users WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.users SET role = p_role WHERE uid = p_uid;
  -- audit_users_role_change trigger from 20260523000000 logs the change.

  -- When promoting to a staff role, ensure the email is on the allowlist
  -- so a future re-signup doesn't bounce off the teacher gate.
  IF p_role IN ('teacher', 'manager', 'admin') AND v_email IS NOT NULL THEN
    INSERT INTO public.teacher_allowlist (email)
    VALUES (lower(v_email))
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success',  true,
    'uid',      p_uid,
    'old_role', v_old,
    'new_role', p_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role(TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_set_role(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_set_role IS
  'Admin-only: flip public.users.role for any user. Refuses self-change and demoting the last admin. Auto-adds the email to teacher_allowlist when promoting to a staff role.';

-- END 20260628000000_admin_set_role.sql

-- ====================================================================
-- BEGIN 20260628000001_trial_funnel_teachers.sql
-- ====================================================================
-- =============================================================================
-- 20260628000001_trial_funnel_teachers.sql
--
-- Extends admin_trial_funnel (mig 20260626000000) with a per-teacher list of
-- everyone currently in their trial window. Backs the "Trialing teachers"
-- drill-down list on the Trial Funnel panel — the bucket histogram is a
-- summary, this is the per-person view so operators can see exactly who's
-- about to expire.
--
-- CREATE OR REPLACE rewrites the function in place; no data migration.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_trial_funnel(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result          JSONB;
  v_days          INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since         TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
  v_trialing_now  INT;
  v_expired       INT;
  v_converted     INT;
  v_rate          NUMERIC;
  v_pro_total     INT;
  v_school_total  INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*) INTO v_trialing_now
  FROM public.users
  WHERE role = 'teacher' AND plan = 'free' AND trial_ends_at > now();

  SELECT count(*) INTO v_expired
  FROM public.users
  WHERE role = 'teacher'
    AND plan = 'free'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at <= now();

  SELECT count(*) INTO v_converted
  FROM public.users
  WHERE role = 'teacher'
    AND plan IN ('pro', 'school')
    AND first_seen_at >= v_since;

  SELECT
    count(*) FILTER (WHERE plan = 'pro'),
    count(*) FILTER (WHERE plan = 'school')
  INTO v_pro_total, v_school_total
  FROM public.users
  WHERE role = 'teacher';

  IF (v_converted + v_expired + v_trialing_now) > 0 THEN
    v_rate := v_converted::numeric / (v_converted + v_expired + v_trialing_now);
  ELSE
    v_rate := 0;
  END IF;

  SELECT jsonb_build_object(
    'days',            v_days,
    'trialing_now',    v_trialing_now,
    'expired',         v_expired,
    'converted',       v_converted,
    'conversion_rate', v_rate,
    'paid_total',      jsonb_build_object('pro', v_pro_total, 'school', v_school_total),
    'trialing_buckets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('days_left', bucket, 'count', cnt) ORDER BY bucket)
      FROM (
        SELECT
          CASE
            WHEN trial_ends_at - now() <= interval '1 day'  THEN 1
            WHEN trial_ends_at - now() <= interval '3 days' THEN 3
            WHEN trial_ends_at - now() <= interval '7 days' THEN 7
            ELSE 14
          END AS bucket,
          count(*) AS cnt
        FROM public.users
        WHERE role = 'teacher' AND plan = 'free' AND trial_ends_at > now()
        GROUP BY 1
      ) buckets
    ), '[]'::jsonb),
    'trialing_teachers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'uid', u.uid,
          'email', u.email,
          'display_name', u.display_name,
          'school_name', s.name,
          'trial_ends_at', u.trial_ends_at,
          'first_seen_at', u.first_seen_at,
          'days_left', GREATEST(
            0,
            CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - now())) / 86400)
          )::int
        ) ORDER BY u.trial_ends_at ASC
      )
      FROM public.users u
      LEFT JOIN public.schools s ON s.id = u.school_id
      WHERE u.role = 'teacher'
        AND u.plan = 'free'
        AND u.trial_ends_at > now()
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.admin_trial_funnel IS
  'Admin-only: trial snapshot — trialing/expired/converted counts + days-remaining histogram + per-teacher drill-down list. Converted is approximate (see header).';

-- END 20260628000001_trial_funnel_teachers.sql

-- ====================================================================
-- BEGIN 20260629000000_security_check_log.sql
-- ====================================================================
-- =============================================================================
-- 20260629000000_security_check_log.sql
--
-- Tracked-cadence security checklist for the admin dashboard's Security tab.
-- Each "I did this" click writes a row here AND a row in audit_log; the panel
-- reads the latest row per check_key to compute overdue / fresh status.
--
-- The catalog of checks lives inside admin_list_security_checks as a CTE so
-- adding/removing reminders is a single in-migration edit — no separate
-- catalog table to keep in sync.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_check_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key     TEXT NOT NULL CHECK (char_length(check_key) > 0 AND char_length(check_key) <= 64),
  performed_by  TEXT NOT NULL,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_check_log_key_time
  ON public.security_check_log (check_key, performed_at DESC);

ALTER TABLE public.security_check_log ENABLE ROW LEVEL SECURITY;
-- No client SELECT / INSERT policy — everything goes through admin RPCs.

-- ---------------------------------------------------------------------------
-- admin_list_security_checks — catalog × latest performed_at JOIN.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_security_checks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH catalog AS (
    SELECT * FROM (VALUES
      (
        'review_audit_log',
        'Review audit log',
        'Open the Audit log tab. Scan the last 7 days for unexpected admin actions, role changes, or deletes.',
        7,
        'weekly'
      ),
      (
        'audit_admin_accounts',
        'Audit admin accounts',
        'Confirm everyone with role=admin still needs access. Demote anyone who left the team.',
        30,
        'monthly'
      ),
      (
        'verify_admin_mfa',
        'Verify admin MFA',
        'Check that 2-Step Verification is still enabled on every admin''s Google account.',
        90,
        'quarterly'
      ),
      (
        'rotate_service_role_key',
        'Rotate Supabase service role key',
        'Reset SUPABASE_SERVICE_ROLE_KEY in the Supabase dashboard, then update the secret on Fly.io.',
        180,
        'every 6 months'
      ),
      (
        'rotate_anthropic_key',
        'Rotate Anthropic API key',
        'Issue a new Anthropic API key, update Fly secrets, revoke the old one.',
        365,
        'yearly'
      )
    ) AS c(check_key, title, description, cadence_days, cadence_label)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'key',                     c.check_key,
      'title',                   c.title,
      'description',             c.description,
      'cadence_days',            c.cadence_days,
      'cadence_label',           c.cadence_label,
      'last_performed_at',       l.last_at,
      'last_performed_by_email', u.email,
      'last_notes',              l.notes,
      'days_since_last', CASE
        WHEN l.last_at IS NULL THEN NULL
        ELSE FLOOR(EXTRACT(EPOCH FROM (now() - l.last_at)) / 86400)::int
      END,
      'overdue_days', CASE
        WHEN l.last_at IS NULL THEN NULL
        ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - l.last_at)) / 86400)::int - c.cadence_days)
      END
    ) ORDER BY c.cadence_days
  )
  INTO result
  FROM catalog c
  LEFT JOIN LATERAL (
    SELECT performed_at AS last_at, performed_by, notes
    FROM public.security_check_log
    WHERE check_key = c.check_key
    ORDER BY performed_at DESC
    LIMIT 1
  ) l ON true
  LEFT JOIN public.users u ON u.uid = l.performed_by;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_record_security_check — record a "done" click, log to audit trail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_record_security_check(
  p_key   TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_key  TEXT := trim(COALESCE(p_key, ''));
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_key) = 0 THEN
    RAISE EXCEPTION 'check key is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.security_check_log (check_key, performed_by, performed_at, notes)
  VALUES (v_key, caller, now(), NULLIF(trim(COALESCE(p_notes, '')), ''));

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'security_check_done', 'security', jsonb_build_object('key', v_key));

  RETURN jsonb_build_object('success', true, 'key', v_key);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_security_checks()             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_security_check(TEXT, TEXT)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_security_checks()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_security_check(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_list_security_checks IS
  'Admin-only: catalog of recurring security checks JOINed with the latest performed_at per key.';
COMMENT ON FUNCTION public.admin_record_security_check IS
  'Admin-only: record completion of a security check. Writes to security_check_log AND audit_log.';

-- END 20260629000000_security_check_log.sql

-- ====================================================================
-- BEGIN 20260629000001_dashboard_analytics_rpcs.sql
-- ====================================================================
-- =============================================================================
-- 20260629000001_dashboard_analytics_rpcs.sql
--
-- Five admin-only additions for the developer dashboard:
--
--   1. admin_onboarding_funnel  — signup → first class → first assignment →
--                                 first student joined (per-day cohort)
--   2. admin_top_modes          — most-played game modes + most-used
--                                 assignment titles in a window
--   3. admin_active_users       — directional DAU/WAU/MAU split by role,
--                                 derived from progress.completed_at (student
--                                 activity) and audit_log (teacher activity).
--                                 No new schema — approximation noted in panel.
--   4. admin_db_health          — table sizes, slow-query top-N, RLS hygiene
--   5. admin_recent_exports     — recent admin_export_user actions for the
--                                 Security Ops panel's "any unusual export
--                                 volume?" check
--
-- Plus a defensive update to admin_export_user_data: raise on >20 exports per
-- caller per 24h. The threshold catches "compromised admin scraping every
-- user" patterns without bothering legitimate operators who export 1–2 a day.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Onboarding funnel — same shape as the Trial Funnel: counts + rate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_onboarding_funnel(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result          JSONB;
  v_days          INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since         TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
  v_signed_up     INT;
  v_made_class    INT;
  v_made_assign   INT;
  v_got_student   INT;
BEGIN
  PERFORM public.assert_admin();

  -- Cohort: teachers whose first_seen_at falls in the window.
  SELECT count(*) INTO v_signed_up
  FROM public.users
  WHERE role = 'teacher' AND first_seen_at >= v_since;

  SELECT count(DISTINCT u.uid) INTO v_made_class
  FROM public.users u
  JOIN public.classes c ON c.teacher_uid = u.uid
  WHERE u.role = 'teacher' AND u.first_seen_at >= v_since;

  SELECT count(DISTINCT u.uid) INTO v_made_assign
  FROM public.users u
  JOIN public.classes c ON c.teacher_uid = u.uid
  JOIN public.assignments a ON a.class_id = c.id
  WHERE u.role = 'teacher' AND u.first_seen_at >= v_since;

  SELECT count(DISTINCT u.uid) INTO v_got_student
  FROM public.users u
  JOIN public.classes c ON c.teacher_uid = u.uid
  WHERE u.role = 'teacher'
    AND u.first_seen_at >= v_since
    AND EXISTS (SELECT 1 FROM public.progress p WHERE p.class_code = c.code);

  SELECT jsonb_build_object(
    'days',          v_days,
    'signed_up',     v_signed_up,
    'made_class',    v_made_class,
    'made_assignment', v_made_assign,
    'got_student',   v_got_student,
    'rates', jsonb_build_object(
      'class_pct',      CASE WHEN v_signed_up   > 0 THEN (v_made_class::numeric  / v_signed_up)  ELSE 0 END,
      'assignment_pct', CASE WHEN v_made_class  > 0 THEN (v_made_assign::numeric / v_made_class) ELSE 0 END,
      'student_pct',    CASE WHEN v_made_assign > 0 THEN (v_got_student::numeric / v_made_assign) ELSE 0 END
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Top modes + top assignments (proxy for "top content").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_top_modes(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result  JSONB;
  v_days  INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
BEGIN
  PERFORM public.assert_admin();

  SELECT jsonb_build_object(
    'days', v_days,
    'modes', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'plays')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'mode', mode,
          'plays', count(*),
          'players', count(DISTINCT student_uid),
          'avg_score', round(avg(score)::numeric, 1)
        ) AS j
        FROM public.progress
        WHERE completed_at >= v_since
        GROUP BY mode
      ) m
    ), '[]'::jsonb),
    'assignments', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'plays')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'assignment_id', a.id,
          'title',         a.title,
          'class_name',    c.name,
          'plays',         count(*),
          'players',       count(DISTINCT p.student_uid)
        ) AS j
        FROM public.progress p
        JOIN public.assignments a ON a.id = p.assignment_id
        JOIN public.classes c     ON c.id = a.class_id
        WHERE p.completed_at >= v_since
        GROUP BY a.id, a.title, c.name
        ORDER BY count(*) DESC
        LIMIT 15
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Active users (DAU/WAU/MAU) — directional approximation.
--    Student activity = a progress row in the window.
--    Teacher activity = an audit_log row OR owning a class with progress
--                       in the window (approximation; without last_seen_at
--                       we can't capture "logged in but did nothing").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_active_users()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result  JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH windows AS (
    SELECT 'day'   AS w, now() - interval '1 day'   AS since UNION ALL
    SELECT 'week'  AS w, now() - interval '7 days'  UNION ALL
    SELECT 'month' AS w, now() - interval '30 days'
  ),
  student_active AS (
    SELECT w.w, count(DISTINCT p.student_uid) AS n
    FROM windows w
    LEFT JOIN public.progress p ON p.completed_at >= w.since
    GROUP BY w.w
  ),
  teacher_active AS (
    SELECT w.w, count(DISTINCT tid) AS n
    FROM windows w
    LEFT JOIN LATERAL (
      SELECT actor_uid AS tid
      FROM public.audit_log al
      WHERE al.created_at >= w.since
      UNION
      SELECT c.teacher_uid
      FROM public.progress p
      JOIN public.classes c ON c.code = p.class_code
      WHERE p.completed_at >= w.since
    ) sub ON true
    LEFT JOIN public.users u ON u.uid = sub.tid AND u.role IN ('teacher', 'admin', 'manager')
    WHERE u.uid IS NOT NULL
    GROUP BY w.w
  )
  SELECT jsonb_build_object(
    'students', jsonb_build_object(
      'dau', (SELECT n FROM student_active WHERE w = 'day'),
      'wau', (SELECT n FROM student_active WHERE w = 'week'),
      'mau', (SELECT n FROM student_active WHERE w = 'month')
    ),
    'teachers', jsonb_build_object(
      'dau', (SELECT n FROM teacher_active WHERE w = 'day'),
      'wau', (SELECT n FROM teacher_active WHERE w = 'week'),
      'mau', (SELECT n FROM teacher_active WHERE w = 'month')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. DB health — table sizes + slow queries (if pg_stat_statements is on)
--    + RLS coverage check. Read-only, no mutations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_db_health()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  v_pgss_available BOOLEAN;
BEGIN
  PERFORM public.assert_admin();

  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) INTO v_pgss_available;

  SELECT jsonb_build_object(
    'table_sizes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'table', schemaname || '.' || tablename,
        'total_bytes', pg_total_relation_size(schemaname || '.' || tablename),
        'rows_estimate', n_live_tup
      ) ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC)
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      LIMIT 30
    ), '[]'::jsonb),
    'rls_coverage', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'table', schemaname || '.' || tablename,
        'rls_enabled', rowsecurity,
        'policy_count', (
          SELECT count(*) FROM pg_policies p
          WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
        )
      ) ORDER BY tablename)
      FROM pg_tables t
      WHERE schemaname = 'public'
    ), '[]'::jsonb),
    'slow_queries_available', v_pgss_available,
    'slow_queries', CASE
      WHEN v_pgss_available THEN COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'query', left(query, 200),
          'calls', calls,
          'mean_ms', round((mean_exec_time)::numeric, 2),
          'total_ms', round((total_exec_time)::numeric, 0)
        ) ORDER BY total_exec_time DESC)
        FROM (
          SELECT query, calls, mean_exec_time, total_exec_time
          FROM pg_stat_statements
          WHERE query NOT LIKE '%pg_stat_statements%'
            AND query NOT LIKE '%pg_extension%'
          ORDER BY total_exec_time DESC
          LIMIT 15
        ) s
      ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Recent exports — for the Security Ops panel + manual scan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_recent_exports(p_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result   JSONB;
  v_hours  INT         := LEAST(GREATEST(COALESCE(p_hours, 24), 1), 720);
  v_since  TIMESTAMPTZ := now() - (v_hours::text || ' hours')::interval;
BEGIN
  PERFORM public.assert_admin();

  SELECT jsonb_build_object(
    'hours', v_hours,
    'total', (
      SELECT count(*) FROM public.audit_log
      WHERE action = 'admin_export_user' AND created_at >= v_since
    ),
    'by_actor', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'actor_uid', actor_uid,
        'actor_email', ua.email,
        'count', cnt,
        'last_at', last_at
      ) ORDER BY cnt DESC)
      FROM (
        SELECT actor_uid, count(*) AS cnt, max(created_at) AS last_at
        FROM public.audit_log
        WHERE action = 'admin_export_user' AND created_at >= v_since
        GROUP BY actor_uid
      ) s
      LEFT JOIN public.users ua ON ua.uid = s.actor_uid
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Defensive update: rate-limit admin_export_user_data to <=20 per 24h per
-- caller. Catches "compromised admin scraping all users" without bothering
-- legitimate single-user exports.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_export_user_data(p_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email   TEXT;
  v_exists  BOOLEAN;
  v_recent  INT;
  result    JSONB;
  caller    TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();

  -- Rate limit: refuse if this caller has run >= 20 exports in the last 24h.
  SELECT count(*) INTO v_recent
  FROM public.audit_log
  WHERE action = 'admin_export_user'
    AND actor_uid = caller
    AND created_at >= now() - interval '24 hours';
  IF v_recent >= 20 THEN
    RAISE EXCEPTION 'Export rate limit exceeded (% in last 24h). Contact another admin if this is legitimate.', v_recent
      USING ERRCODE = '42501';
  END IF;

  SELECT email, true INTO v_email, v_exists FROM public.users WHERE uid = p_uid;
  IF NOT COALESCE(v_exists, false) THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  SELECT jsonb_build_object(
    'export_format_version', '2026-05-22',
    'exported_at',           now(),
    'exported_by_admin',     caller,
    'subject_uid',           p_uid,
    'subject_email',         v_email,
    'tables', jsonb_build_object(
      'user', (
        SELECT to_jsonb(u.*) FROM public.users u WHERE u.uid = p_uid
      ),
      'student_profile', (
        SELECT to_jsonb(sp.*) FROM public.student_profiles sp
        WHERE sp.auth_uid::text = p_uid LIMIT 1
      ),
      'teacher_profile', (
        SELECT to_jsonb(tp.*) FROM public.teacher_profiles tp
        WHERE tp.email = v_email LIMIT 1
      ),
      'classes_owned', (
        SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
        FROM public.classes c WHERE c.teacher_uid = p_uid
      ),
      'progress', (
        SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb)
        FROM public.progress p WHERE p.student_uid = p_uid
      ),
      'consent_history', (
        SELECT COALESCE(jsonb_agg(to_jsonb(cl.*)), '[]'::jsonb)
        FROM public.consent_log cl WHERE cl.uid = p_uid
      ),
      'audit_log_as_actor', (
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.actor_uid = p_uid
      ),
      'audit_log_as_target', (
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.target_uid = p_uid AND al.actor_uid <> p_uid
      )
    )
  ) INTO result;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid)
  VALUES (caller, 'admin_export_user', 'all', p_uid);

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_onboarding_funnel(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_top_modes(INTEGER)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_active_users()              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_db_health()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_recent_exports(INTEGER)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_onboarding_funnel(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_modes(INTEGER)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_active_users()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_db_health()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_exports(INTEGER)     TO authenticated;

-- END 20260629000001_dashboard_analytics_rpcs.sql

-- ====================================================================
-- BEGIN 20260702000000_student_achievements.sql
-- ====================================================================
-- =============================================================================
-- 20260702000000_student_achievements.sql
--
-- Persistent storage for student-earned achievements (arcade redesign,
-- PR #1006).  A row is created the first time a student satisfies an
-- achievement predicate (e.g. "5-Day Streak", "100 Words Mastered").
--
-- Design notes:
--   * Append-only — no UPDATE or DELETE policy.  An achievement, once
--     earned, is permanent.
--   * Composite primary key (user_uid, achievement_id) — guarantees a
--     student can only unlock each achievement once and lets the
--     client use ON CONFLICT DO NOTHING for idempotent upserts.
--   * Students INSERT + SELECT their own rows; teachers SELECT their
--     class's rows for the gradebook view.
--   * No XP grant happens in this table — XP is added via the existing
--     users.xp update path so the economy stays in one place.
--     `xp_awarded` here is informational so the client can render
--     "earned +50 XP" on the toast without re-deriving it from the
--     achievement definition.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_achievements (
  user_uid       text        NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  achievement_id text        NOT NULL,
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  xp_awarded     int         NOT NULL DEFAULT 0,
  PRIMARY KEY (user_uid, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_user
  ON public.student_achievements(user_uid);

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- Students can read their own achievements.
DROP POLICY IF EXISTS "students_read_own_achievements" ON public.student_achievements;
CREATE POLICY "students_read_own_achievements"
  ON public.student_achievements
  FOR SELECT
  USING (auth.uid()::text = user_uid);

-- Students can unlock their own achievements (append-only — no UPDATE/DELETE).
DROP POLICY IF EXISTS "students_insert_own_achievements" ON public.student_achievements;
CREATE POLICY "students_insert_own_achievements"
  ON public.student_achievements
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_uid);

-- Teachers can read achievements for students whose class they own.
-- Mirrors the gradebook visibility pattern on the progress table.
DROP POLICY IF EXISTS "teachers_read_class_achievements" ON public.student_achievements;
CREATE POLICY "teachers_read_class_achievements"
  ON public.student_achievements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users student
      JOIN public.classes cls ON cls.code = student.class_code
      WHERE student.uid = student_achievements.user_uid
        AND cls.teacher_uid = auth.uid()::text
    )
  );

-- END 20260702000000_student_achievements.sql

-- ====================================================================
-- BEGIN 20260703000000_ai_generic_cache.sql
-- ====================================================================
-- =============================================================================
-- Generic AI result cache — for pure, deterministic AI generators
-- =============================================================================
-- Some AI endpoints are pure functions of their input: the same request
-- always SHOULD produce the same payload, so re-paying the model (and making
-- the teacher re-wait several seconds) on an identical request is pure waste.
--
-- This table backs the server-side aiCacheGet / aiCacheSet helpers, which
-- currently cover:
--   - ai_process_text     (/api/ai-process-text, Gemini, temp 0.2)
--   - ai_generate_lesson  (/api/ai-generate-lesson, Gemini, multi-call)
--
-- Each feature namespaces its own keys via the `feature` column, so one
-- table serves them all without collisions. The bagrut/sentence/translation
-- caches keep their dedicated tables (different shapes + RPCs).
--
-- NOT cached here (by design): the library sentence/distractor generators —
-- they persist candidates to the DB and exist to give teachers FRESH variety
-- on each "Regenerate", so a cache hit would defeat the feature.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_cache (
  -- (feature, cache_key) is the composite identity. cache_key is a SHA-256
  -- hex digest of the canonical request inputs, computed server-side.
  feature     TEXT NOT NULL CHECK (char_length(feature) BETWEEN 1 AND 60),
  cache_key   TEXT NOT NULL CHECK (char_length(cache_key) BETWEEN 1 AND 128),
  -- The full response payload to replay on a hit.
  content     JSONB NOT NULL,
  -- Hit counter — bumped via touch_ai_cache on read; informs future eviction.
  hits        INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Default 30-day TTL keeps the table bounded and lets prompt/model
  -- improvements roll in. Server overrides expires_at on upsert.
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  PRIMARY KEY (feature, cache_key)
);

-- Expiry sweeps (cleanup_expired_data or a future cron) scan by expires_at.
CREATE INDEX IF NOT EXISTS idx_ai_cache_expiry ON public.ai_cache (expires_at);

-- ---------------------------------------------------------------------------
-- RLS — server-side only. No policies = no client access at all (same
-- posture as ai_allowlist / sentence_cache). The server reads + writes with
-- the service-role key, which bypasses RLS; clients can neither read cached
-- content nor poison it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Bump-on-read RPC — counts cache hits without a full-row rewrite on read.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_ai_cache(p_feature TEXT, p_cache_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role only — clients should never call this directly.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'touch_ai_cache is service-role only';
  END IF;

  UPDATE public.ai_cache
    SET hits = hits + 1
    WHERE feature = p_feature AND cache_key = p_cache_key;
END;
$$;

-- Note: no GRANT to authenticated — service role only.

-- END 20260703000000_ai_generic_cache.sql

-- ====================================================================
-- BEGIN 20260703000000_claim_badge_xp.sql
-- ====================================================================
-- claim_badge_xp — server-authoritative, one-shot badge XP rewards.
--
-- Background: the arcade dashboard lets a student tap an earned badge to
-- collect a small XP reward.  The first implementation deduped claims in
-- localStorage only, so clearing site data let a student re-collect the
-- same badge's XP repeatedly (the retention RPC just adds a delta — it
-- doesn't know which badge it came from).
--
-- Fix: a real claim ledger.  public.claimed_badges holds one row per
-- (uid, badge_id); the SECURITY DEFINER RPC below inserts that row and
-- grants the XP in a single transaction, so a second attempt for the
-- same badge is a no-op no matter what the client does.  The truth lives
-- in the DB, not the browser.
--
-- Mirrors claim_retention_xp (20260514130000) for the XP-write half:
-- authenticated-only, writes the caller's own users.xp, clamps the delta.

CREATE TABLE IF NOT EXISTS public.claimed_badges (
  uid        text        NOT NULL,
  badge_id   text        NOT NULL,
  xp_awarded integer     NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, badge_id)
);

ALTER TABLE public.claimed_badges ENABLE ROW LEVEL SECURITY;

-- Students may read their own claim rows so the dashboard can hydrate
-- which badges are already collected.  All writes go through the
-- SECURITY DEFINER RPC below — there is intentionally no INSERT/UPDATE
-- policy, so the client cannot forge or delete claims directly.
DROP POLICY IF EXISTS claimed_badges_select_own ON public.claimed_badges;
CREATE POLICY claimed_badges_select_own ON public.claimed_badges
  FOR SELECT TO authenticated
  USING (uid = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.claim_badge_xp(
  p_badge_id text,
  p_xp       integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid        text := auth.uid()::text;
  v_rows       integer;
  v_current_xp integer;
  v_new_xp     integer;
  v_clamped    integer;
  XP_MIN CONSTANT integer := 0;
  XP_MAX CONSTANT integer := 500;  -- badge rewards are small; cap tight
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_badge_id IS NULL OR length(btrim(p_badge_id)) = 0 THEN
    RAISE EXCEPTION 'p_badge_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_xp IS NULL THEN
    RAISE EXCEPTION 'p_xp is required' USING ERRCODE = '22023';
  END IF;

  v_clamped := GREATEST(XP_MIN, LEAST(XP_MAX, p_xp));

  -- Atomic dedup: a duplicate (uid, badge_id) hits the PK and is
  -- skipped.  ROW_COUNT then tells us whether THIS call was the first
  -- claim (1) or a replay (0).
  INSERT INTO public.claimed_badges (uid, badge_id, xp_awarded)
  VALUES (v_uid, p_badge_id, v_clamped)
  ON CONFLICT (uid, badge_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  SELECT COALESCE(xp, 0) INTO v_current_xp
    FROM public.users
   WHERE uid = v_uid;

  IF NOT FOUND THEN
    -- Roll the ledger insert back via the exception so a user with no
    -- row can't leave an orphan claim.
    RAISE EXCEPTION 'User row not found for uid=%', v_uid USING ERRCODE = '42704';
  END IF;

  -- Replay → grant nothing, just report the current total.
  IF v_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'new_xp', v_current_xp,
      'xp_awarded', 0
    );
  END IF;

  -- First claim → grant the reward.
  v_new_xp := v_current_xp + v_clamped;
  UPDATE public.users SET xp = v_new_xp WHERE uid = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'new_xp', v_new_xp,
    'xp_awarded', v_clamped
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_badge_xp(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_badge_xp(text, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_badge_xp(text, integer) TO authenticated;

COMMENT ON FUNCTION public.claim_badge_xp IS
  'One-shot badge XP claim. Inserts a public.claimed_badges row and adds
   the (clamped, <=500) XP to the caller''s users.xp in one transaction;
   replays for an already-claimed badge grant nothing. Server-authoritative
   dedup — clearing client storage cannot re-trigger a grant.';

-- END 20260703000000_claim_badge_xp.sql

-- ====================================================================
-- BEGIN 20260710000000_anonymous_coded_classrooms.sql
-- ====================================================================
-- =============================================================================
-- Anonymous Coded Classrooms (privacy-by-design school onboarding)
-- =============================================================================
-- Goal: never store a student NAME. Each roster student instead gets a
-- structured anonymous code encoding school · grade · branch · seq
-- (e.g. "07-5-2-14") plus a login PIN. The code is stored in display_name, so
-- every existing read (class_roster_for_login, teacher_view_roster, the print
-- sheet, progress) keeps working unchanged — it simply shows the code.
--
-- Two creation paths, both reusing the roster insert pattern from
-- 20260602_student_roster_pins.sql (auth.users bcrypt PIN + public.users +
-- student_profiles, roster_created=TRUE, status='approved'):
--   * teacher_bulk_create_roster  — teacher self-serve top-up (owns the class)
--   * admin_bulk_seed_school       — operator seeds a whole school at onboarding
--
-- Admin-seeded classes link to a teacher via claim-on-login: the class carries
-- pending_teacher_email and is claimed (teacher_uid set) the first time that
-- teacher signs in (claim_pending_classes()).
--
-- This migration is ADDITIVE and backward-compatible. The only change to
-- existing schema is loosening classes.teacher_uid to NULLABLE (so a seeded but
-- unclaimed class can exist) — which never breaks existing rows.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. schools.school_code — short numeric prefix for student codes
-- ---------------------------------------------------------------------------
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_code TEXT
    CHECK (school_code IS NULL OR school_code ~ '^[0-9]{1,4}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_school_code_uniq
  ON public.schools (school_code) WHERE school_code IS NOT NULL;

COMMENT ON COLUMN public.schools.school_code IS
  'Short numeric prefix (e.g. "07") forming the first segment of anonymous
   student codes school-grade-branch-seq. Operator/admin only via
   admin_set_school_code (schools has no client write policy).';

-- ---------------------------------------------------------------------------
-- 2. student_profiles — structured code parts (the code itself is display_name)
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS grade    INT,
  ADD COLUMN IF NOT EXISTS branch   INT,
  ADD COLUMN IF NOT EXISTS anon_seq INT;

COMMENT ON COLUMN public.student_profiles.anon_seq IS
  'Sequence within (class_code, grade, branch) for coded roster students.
   display_name = school_code-grade-branch-anon_seq.';

-- Fast next-seq lookup + concurrency guard (two parallel bulk calls can never
-- mint the same seq — the second INSERT raises and its RPC rolls back).
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_anon_seq_uniq
  ON public.student_profiles (class_code, grade, branch, anon_seq)
  WHERE roster_created = TRUE AND anon_seq IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. classes — pending_teacher_email + nullable teacher_uid (claim-on-login)
-- ---------------------------------------------------------------------------
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS pending_teacher_email TEXT;

ALTER TABLE public.classes ALTER COLUMN teacher_uid DROP NOT NULL;

COMMENT ON COLUMN public.classes.pending_teacher_email IS
  'Set by admin_bulk_seed_school for a class with no owner yet. The matching
   teacher claims the class (teacher_uid set, this cleared) on first login via
   claim_pending_classes().';

-- ---------------------------------------------------------------------------
-- 4. generate_roster_pin() — server-side 6-char PIN
--    Charset matches the client (RosterModalV2.generatePin) AND the roster PIN
--    regex ^[A-HJ-KM-NP-Z2-9]{6}$ — drops I/L/O/0/1. PINs are not unique keys,
--    so no retry loop is needed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_roster_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  rb    BYTEA := extensions.gen_random_bytes(6);
  out   TEXT := '';
  i     INT;
BEGIN
  FOR i IN 0..5 LOOP
    out := out || substr(chars, (get_byte(rb, i) % length(chars)) + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. generate_class_code() — server-side 8-char class code with uniqueness
--    retry. Charset mirrors the client generator in useTeacherActions.ts
--    (keeps L; drops only I/O/0/1). Mirrors classes.code constraint (6–20).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_class_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  chars    TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempts INT := 0;
  v_code   TEXT;
  rb       BYTEA;
  i        INT;
BEGIN
  WHILE attempts < 10 LOOP
    rb := extensions.gen_random_bytes(8);
    v_code := '';
    FOR i IN 0..7 LOOP
      v_code := v_code || substr(chars, (get_byte(rb, i) % length(chars)) + 1, 1);
    END LOOP;
    -- Qualify the column to avoid the variable/column name collision that
    -- would make `code = v_code` ambiguous.
    IF NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.code = v_code) THEN
      RETURN v_code;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  RAISE EXCEPTION 'failed to generate a unique class code after 10 attempts';
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. teacher_bulk_create_roster — teacher self-serve, N coded students at once
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.teacher_bulk_create_roster(
  p_class_code TEXT,
  p_grade      INT,
  p_branch     INT,
  p_count      INT
)
RETURNS TABLE (structured_id TEXT, pin TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $$
DECLARE
  v_teacher_uid TEXT := auth.uid()::text;
  v_school_code TEXT;
  v_existing    INT;
  v_next_seq    INT;
  v_code        TEXT;
  v_pin         TEXT;
  v_auth_uid    UUID;
  v_email       TEXT;
  i             INT;
BEGIN
  IF v_teacher_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Ownership: the class must belong to the caller.
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_teacher_uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not your class';
  END IF;

  IF p_grade  IS NULL OR p_grade  < 1 OR p_grade  > 99 THEN RAISE EXCEPTION 'invalid grade';  END IF;
  IF p_branch IS NULL OR p_branch < 1 OR p_branch > 99 THEN RAISE EXCEPTION 'invalid branch'; END IF;
  IF p_count  IS NULL OR p_count  < 1 OR p_count  > 60 THEN RAISE EXCEPTION 'invalid count';  END IF;

  -- Derive the school code through the teacher's school. Fallback '00'.
  SELECT COALESCE(s.school_code, '00')
    INTO v_school_code
  FROM public.users u
  LEFT JOIN public.schools s ON s.id = u.school_id
  WHERE u.uid = v_teacher_uid;
  v_school_code := COALESCE(v_school_code, '00');

  -- Free-tier cap: 30 roster students per class unless the teacher is Pro/school.
  IF NOT public.is_pro_or_trialing() THEN
    SELECT count(*) INTO v_existing
    FROM public.student_profiles
    WHERE class_code = p_class_code AND roster_created = TRUE;
    IF v_existing + p_count > 30 THEN
      RAISE EXCEPTION 'free_tier_cap';
    END IF;
  END IF;

  -- Next sequence within (class, grade, branch).
  SELECT COALESCE(MAX(anon_seq), 0) INTO v_next_seq
  FROM public.student_profiles
  WHERE class_code = p_class_code
    AND grade = p_grade AND branch = p_branch
    AND roster_created = TRUE;

  FOR i IN 1..p_count LOOP
    v_next_seq := v_next_seq + 1;
    v_code := v_school_code || '-' || p_grade || '-' || p_branch || '-' || v_next_seq;
    v_pin := public.generate_roster_pin();
    v_auth_uid := gen_random_uuid();
    v_email := 'student-' || v_auth_uid::text || '@class-' || lower(p_class_code) || '.vocaband.local';

    -- 1) auth.users — PIN bcrypt (same shape as teacher_create_roster_student).
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_auth_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pin, extensions.gen_salt('bf')), NOW(),
      jsonb_build_object('provider', 'roster_pin', 'providers', ARRAY['roster_pin']),
      jsonb_build_object('display_name', v_code, 'class_code', p_class_code,
                         'role', 'student', 'roster_created', true),
      NOW(), NOW()
    );

    -- 2) public.users — required for progress RLS.
    INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
    VALUES (v_auth_uid::text, v_email, 'student', v_code, p_class_code, '🦊');

    -- 3) student_profiles — approved, coded, structured parts populated.
    INSERT INTO public.student_profiles (
      unique_id, display_name, class_code, email, status, auth_uid,
      avatar, roster_created, roster_pin, approved_at, approved_by,
      grade, branch, anon_seq
    ) VALUES (
      lower(p_class_code) || ':roster:' || lower(v_code), v_code, p_class_code, v_email,
      'approved', v_auth_uid, '🦊', TRUE, v_pin, NOW(), auth.uid(),
      p_grade, p_branch, v_next_seq
    );

    structured_id := v_code;
    pin := v_pin;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. admin_set_school_code — operator assigns a school's numeric prefix
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_school_code(p_school_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_code TEXT := trim(COALESCE(p_code, ''));
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;
  IF v_code !~ '^[0-9]{1,4}$' THEN
    RAISE EXCEPTION 'school code must be 1–4 digits' USING ERRCODE = '22023';
  END IF;

  BEGIN
    UPDATE public.schools SET school_code = v_code WHERE id = p_school_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'school code % is already in use', v_code USING ERRCODE = '23505';
  END;

  RETURN jsonb_build_object('success', true, 'id', p_school_id, 'school_code', v_code);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. admin_bulk_seed_school — create a school's classes + coded students
--    p_rows: [{ "grade":5, "branch":2, "count":14, "teacher_email":"t@x" }, …]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_bulk_seed_school(
  p_school_id UUID,
  p_rows      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $$
DECLARE
  v_school_code  TEXT;
  v_school_name  TEXT;
  r              JSONB;
  v_grade        INT;
  v_branch       INT;
  v_count        INT;
  v_teacher_email TEXT;
  v_teacher_uid  TEXT;
  v_class_code   TEXT;
  v_class_name   TEXT;
  v_seq          INT;
  v_code         TEXT;
  v_pin          TEXT;
  v_auth_uid     UUID;
  v_email        TEXT;
  v_students     JSONB;
  v_classes      JSONB := '[]'::jsonb;
  i              INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT school_code, name INTO v_school_code, v_school_name
  FROM public.schools WHERE id = p_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;
  v_school_code := COALESCE(v_school_code, '00');

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_grade  := (r->>'grade')::INT;
    v_branch := (r->>'branch')::INT;
    v_count  := (r->>'count')::INT;
    v_teacher_email := lower(NULLIF(trim(COALESCE(r->>'teacher_email', '')), ''));

    IF v_grade IS NULL OR v_grade < 1 OR v_grade > 99
       OR v_branch IS NULL OR v_branch < 1 OR v_branch > 99
       OR v_count IS NULL OR v_count < 1 OR v_count > 60 THEN
      RAISE EXCEPTION 'invalid row: %', r USING ERRCODE = '22023';
    END IF;

    -- Resolve teacher if already signed up; else leave NULL (claim-on-login).
    v_teacher_uid := NULL;
    IF v_teacher_email IS NOT NULL THEN
      SELECT uid INTO v_teacher_uid
      FROM public.users WHERE lower(email) = v_teacher_email LIMIT 1;
    END IF;

    v_class_code := public.generate_class_code();
    v_class_name := 'Grade ' || v_grade || ' / ' || v_branch;

    INSERT INTO public.classes (name, teacher_uid, code, subject, school_name, pending_teacher_email)
    VALUES (v_class_name, v_teacher_uid, v_class_code, 'english', v_school_name,
            CASE WHEN v_teacher_uid IS NULL THEN v_teacher_email ELSE NULL END);

    v_students := '[]'::jsonb;
    FOR i IN 1..v_count LOOP
      v_seq := i;
      v_code := v_school_code || '-' || v_grade || '-' || v_branch || '-' || v_seq;
      v_pin := public.generate_roster_pin();
      v_auth_uid := gen_random_uuid();
      v_email := 'student-' || v_auth_uid::text || '@class-' || lower(v_class_code) || '.vocaband.local';

      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        v_auth_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        v_email, extensions.crypt(v_pin, extensions.gen_salt('bf')), NOW(),
        jsonb_build_object('provider', 'roster_pin', 'providers', ARRAY['roster_pin']),
        jsonb_build_object('display_name', v_code, 'class_code', v_class_code,
                           'role', 'student', 'roster_created', true),
        NOW(), NOW()
      );

      INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
      VALUES (v_auth_uid::text, v_email, 'student', v_code, v_class_code, '🦊');

      INSERT INTO public.student_profiles (
        unique_id, display_name, class_code, email, status, auth_uid,
        avatar, roster_created, roster_pin, approved_at, approved_by,
        grade, branch, anon_seq
      ) VALUES (
        lower(v_class_code) || ':roster:' || lower(v_code), v_code, v_class_code, v_email,
        'approved', v_auth_uid, '🦊', TRUE, v_pin, NOW(), auth.uid(),
        v_grade, v_branch, v_seq
      );

      v_students := v_students || jsonb_build_object('code', v_code, 'pin', v_pin);
    END LOOP;

    v_classes := v_classes || jsonb_build_object(
      'class_code', v_class_code, 'class_name', v_class_name,
      'grade', v_grade, 'branch', v_branch,
      'teacher_email', v_teacher_email, 'claimed', (v_teacher_uid IS NOT NULL),
      'students', v_students);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'school_code', v_school_code, 'classes', v_classes);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. claim_pending_classes — teacher attaches any classes seeded for their email
--    Called once after a teacher session is established (teacherOnboarding).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_pending_classes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid     TEXT := auth.uid()::text;
  v_email   TEXT;
  v_claimed INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT lower(email) INTO v_email FROM public.users WHERE uid = v_uid;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.classes
  SET teacher_uid = v_uid, pending_teacher_email = NULL
  WHERE teacher_uid IS NULL
    AND lower(pending_teacher_email) = v_email;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;

  RETURN v_claimed;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. admin_list_schools — add school_code to the existing payload so the
--     dashboard seed section can show / pre-fill it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_schools()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'school_code', s.school_code,
      'created_at', s.created_at,
      'teachers', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role IN ('teacher', 'manager')),
      'students', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'student'),
      'managers', (SELECT COALESCE(jsonb_agg(u.email), '[]'::jsonb) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'manager')
    ) ORDER BY s.name
  ), '[]'::jsonb)
  INTO result
  FROM public.schools s;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; per-function guards (ownership / assert_admin)
-- do the real gating. anon never reaches these.
-- ---------------------------------------------------------------------------
-- Pure internal helpers: no external caller needs them. They are invoked only
-- by the SECURITY DEFINER RPCs below (which run as the owner, so the nested
-- calls still resolve). Revoke from authenticated too to keep the API surface
-- minimal — they never appear as callable /rest/v1/rpc endpoints.
REVOKE ALL ON FUNCTION public.generate_roster_pin()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_class_code()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_bulk_create_roster(TEXT, INT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_school_code(UUID, TEXT)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_seed_school(UUID, JSONB)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_pending_classes()                        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.teacher_bulk_create_roster(TEXT, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_school_code(UUID, TEXT)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_seed_school(UUID, JSONB)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_classes()                        TO authenticated;

-- ---------------------------------------------------------------------------
-- Dark launch: register the gating flag (OFF). The teacher bulk-add UI and the
-- admin seed section render only when this is enabled. Ships disabled so the
-- feature is invisible until the operator flips it on (self first, then all)
-- from the Feature Flags panel. Idempotent — never clobbers an existing row.
-- ---------------------------------------------------------------------------
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('anon_coded_classrooms', false,
        'Anonymous coded classrooms: teacher bulk "add a whole class" + admin school seeding (no student names).')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- =============================================================================
-- Verification (run manually on a branch after applying):
--   -- as an admin:
--   SELECT public.admin_set_school_code('<school-uuid>', '07');
--   -- as a teacher who owns class CODE, attached to that school:
--   SELECT * FROM public.teacher_bulk_create_roster('CODE', 5, 2, 14);
--     -- expect 14 rows: 07-5-2-1 … 07-5-2-14, each with a 6-char PIN
--   SELECT display_name FROM public.class_roster_for_login('CODE');  -- codes only
--   -- admin seed:
--   SELECT public.admin_bulk_seed_school('<school-uuid>',
--     '[{"grade":5,"branch":2,"count":3,"teacher_email":"t@x.com"}]'::jsonb);
--   -- then sign in as t@x.com and:
--   SELECT public.claim_pending_classes();  -- expect 1
-- =============================================================================

-- END 20260710000000_anonymous_coded_classrooms.sql

-- ====================================================================
-- BEGIN 20260711000000_admin_ai_kill_switch.sql
-- ====================================================================
-- =============================================================================
-- 20260711000000_admin_ai_kill_switch.sql
--
-- Per-teacher AI kill-switch so an admin can turn AI OFF for an individual
-- teacher — including a teacher who is mid-14-day-trial — without changing
-- their plan or ending their trial.
--
-- WHY a new column instead of reusing ai_allowlist:
--   ai_allowlist has *allow* semantics ("only these emails may use Vocabagrut")
--   and the main AI features (sentence generation, OCR, worksheets) are gated by
--   plan/trial (is_pro_or_trialing), so every trialing teacher is allowed by
--   default. To switch a SINGLE teacher off we need a *deny* override that wins
--   over plan/trial. `users.ai_disabled` is exactly that: false by default,
--   flipped true by an admin to revoke AI for that one teacher.
--
-- Enforcement lives in server.ts (requireProTeacher, /api/features, and the
-- Vocabagrut path) — this migration only stores the flag, exposes it to the
-- admin dashboard, sets the admin RPC, and pins it against self-edit so a
-- blocked teacher cannot clear their own flag from DevTools.
-- =============================================================================

BEGIN;

-- ─── 1. The flag ────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_disabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.ai_disabled IS
  'Admin per-teacher AI kill-switch. When true, all AI features are denied for '
  'this teacher regardless of plan/trial. Default false. Set only via '
  'admin_set_ai_disabled (service_role / SECURITY DEFINER); pinned against '
  'self-edit by check_user_update_allowed.';

-- ─── 2. Pin ai_disabled against self-promotion ──────────────────────
-- Extend check_user_update_allowed to a 6-arg form that also pins
-- ai_disabled, mirroring the plan/trial lock in
-- 20260602_lock_users_plan_columns.sql. Without this a blocked teacher
-- could run `UPDATE users SET ai_disabled=false WHERE uid=auth.uid()`
-- in DevTools and re-enable AI for themselves.
--
-- Drop the dependent policy first, then the 5-arg function, then recreate
-- both inside this transaction so the table never sits without an UPDATE
-- policy in production.

DROP POLICY IF EXISTS users_update ON public.users;

-- Drop every prior overload so only the 6-arg form remains afterwards.
-- Older overloads (3-arg from 20260406, 5-arg from the plan/trial lock) can
-- linger across environments; leaving any in place makes the bare
-- COMMENT ON FUNCTION below ambiguous (ERROR 42725 "function name is not
-- unique"). Each DROP is IF EXISTS, so absent overloads are a no-op.
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text);
DROP FUNCTION IF EXISTS public.check_user_update_allowed(text, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid               text,
  p_new_role          text,
  p_new_class_code    text,
  p_new_plan          text,
  p_new_trial_ends_at timestamptz,
  p_new_ai_disabled   boolean
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- TRUE iff every locked column in the proposed row matches the existing
  -- row for this uid. A FALSE return causes the RLS WITH CHECK to reject
  -- the update — which is what we want for self-promotion / self-unblock.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = p_uid
      AND role = p_new_role
      AND (class_code IS NULL OR class_code = p_new_class_code)
      AND COALESCE(plan, 'free') = COALESCE(p_new_plan, 'free')
      AND COALESCE(trial_ends_at, '1970-01-01'::timestamptz)
        = COALESCE(p_new_trial_ends_at, '1970-01-01'::timestamptz)
      AND COALESCE(ai_disabled, false) = COALESCE(p_new_ai_disabled, false)
  );
$$;

COMMENT ON FUNCTION public.check_user_update_allowed(text, text, text, text, timestamptz, boolean) IS
  'Returns TRUE only if role, class_code, plan, trial_ends_at, AND ai_disabled '
  'on the proposed row match the existing values for this uid — i.e. the caller '
  'is not trying to self-promote or self-unblock. Used by the users_update RLS '
  'policy WITH CHECK. Admin/service_role updates bypass RLS, so they are '
  'unaffected.';

CREATE POLICY users_update ON public.users
  AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()))::text = uid) OR is_admin())
  WITH CHECK (
    is_admin()
    OR check_user_update_allowed(
      ((SELECT auth.uid()))::text,
      role,
      class_code,
      plan,
      trial_ends_at,
      ai_disabled
    )
  );

COMMENT ON POLICY users_update ON public.users IS
  'Owner may edit own row; admins may edit any. Caller cannot self-change '
  'role, class_code, plan, trial_ends_at, or ai_disabled — those columns are '
  'pinned by check_user_update_allowed. Legitimate paywall / kill-switch '
  'changes go through service_role (Stripe webhook + admin RPCs), which '
  'bypasses RLS.';

-- ─── 3. Surface ai_disabled in the entitlements list ────────────────
-- Mirrors the function in 20260624000000 with one added field so the
-- Developer Dashboard's entitlements panel can render the toggle state.
CREATE OR REPLACE FUNCTION public.admin_list_entitlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH emails AS (
    SELECT lower(email) AS email FROM public.teacher_allowlist WHERE email IS NOT NULL
    UNION
    SELECT lower(email) FROM public.users
    WHERE role IN ('teacher', 'manager', 'admin') AND email IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'email', e.email,
      'uid', u.uid,
      'role', u.role,
      'plan', u.plan,
      'trial_ends_at', u.trial_ends_at,
      'school_id', u.school_id,
      'school_name', s.name,
      'ai_enabled', (ai.email IS NOT NULL),
      'ai_disabled', COALESCE(u.ai_disabled, false),
      'allowlisted', (ta.email IS NOT NULL),
      'signed_up', (u.uid IS NOT NULL)
    ) ORDER BY e.email
  ), '[]'::jsonb)
  INTO result
  FROM emails e
  LEFT JOIN public.users u ON lower(u.email) = e.email
  LEFT JOIN public.teacher_allowlist ta ON lower(ta.email) = e.email
  LEFT JOIN public.ai_allowlist ai ON lower(ai.email) = e.email
  LEFT JOIN public.schools s ON s.id = u.school_id;

  RETURN result;
END;
$$;

-- ─── 4. The kill-switch RPC ─────────────────────────────────────────
-- Flips users.ai_disabled for one teacher (by uid, like admin_set_plan).
-- Audited under its own action so the change shows up in the audit log.
CREATE OR REPLACE FUNCTION public.admin_set_ai_disabled(
  p_uid      TEXT,
  p_disabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_old BOOLEAN;
BEGIN
  PERFORM public.assert_admin();

  SELECT ai_disabled INTO v_old FROM public.users WHERE uid = p_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', p_uid USING ERRCODE = '23503';
  END IF;

  UPDATE public.users
  SET ai_disabled = COALESCE(p_disabled, false)
  WHERE uid = p_uid;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    auth.uid()::text,
    'ai_disabled_change',
    'users',
    p_uid,
    jsonb_build_object('old', COALESCE(v_old, false), 'new', COALESCE(p_disabled, false))
  );

  RETURN jsonb_build_object('success', true, 'uid', p_uid, 'ai_disabled', COALESCE(p_disabled, false));
END;
$$;

-- ─── 5. Grants ──────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.admin_set_ai_disabled(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_disabled(TEXT, BOOLEAN) TO authenticated;

COMMIT;

-- =============================================================================
-- Verification (run manually after applying):
--
-- 1. Column exists, defaults false:
--    SELECT column_default, is_nullable FROM information_schema.columns
--    WHERE table_name='users' AND column_name='ai_disabled';
--
-- 2. Self-unblock attempt fails (run as the blocked teacher's session):
--    UPDATE public.users SET ai_disabled=false WHERE uid=auth.uid()::text;
--    -- Expect: 0 rows updated (RLS WITH CHECK rejects)
--
-- 3. Admin toggle works:
--    SELECT public.admin_set_ai_disabled('<teacher-uid>', true);
--    -- Expect: {"success": true, ...} and an ai_disabled_change audit row.
-- =============================================================================

-- END 20260711000000_admin_ai_kill_switch.sql

-- ====================================================================
-- BEGIN 20260712000000_admin_delete_school_and_manager.sql
-- ====================================================================
-- =============================================================================
-- Admin cleanup: delete a school + remove a manager (Developer Dashboard)
-- =============================================================================
-- Two operator cleanup actions that were missing from the admin Schools panel
-- (you could create a school and assign a manager, but never undo either):
--
--   * admin_remove_manager — un-assign a principal/manager: role back to
--       'teacher', school_id cleared. Exact inverse of admin_assign_manager.
--
--   * admin_delete_school  — SAFE hard-delete. Only deletes when the school has
--       no attached staff/students (users.school_id) AND no classes naming it
--       (classes.school_name). Otherwise it refuses with the counts so the
--       operator clears the school first — never silently orphans real data.
--
-- Both are SECURITY DEFINER + assert_admin(), matching every other admin_* RPC.
-- Additive and idempotent (CREATE OR REPLACE).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- admin_remove_manager — inverse of admin_assign_manager
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_manager(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid   TEXT;
  v_role  TEXT;
BEGIN
  PERFORM public.assert_admin();

  SELECT uid, role INTO v_uid, v_role
  FROM public.users WHERE lower(email) = v_email LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no user with email %', v_email USING ERRCODE = '23503';
  END IF;
  IF v_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'user % is not a manager', v_email USING ERRCODE = '22023';
  END IF;

  -- Demote to teacher + detach from the school. The role change fires the
  -- audit trigger from 20260523000000, same as admin_assign_manager.
  UPDATE public.users SET role = 'teacher', school_id = NULL WHERE uid = v_uid;

  RETURN jsonb_build_object('success', true, 'uid', v_uid);
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_delete_school — safe hard-delete (refuses when non-empty)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_school(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_name    TEXT;
  v_members INT;
  v_classes INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT name INTO v_name FROM public.schools WHERE id = p_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;

  SELECT count(*) INTO v_members FROM public.users   WHERE school_id = p_school_id;
  SELECT count(*) INTO v_classes FROM public.classes WHERE school_name = v_name;
  IF v_members > 0 OR v_classes > 0 THEN
    RAISE EXCEPTION
      'school "%" still has % member(s) and % class(es) — remove those first',
      v_name, v_members, v_classes USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.schools WHERE id = p_school_id;
  RETURN jsonb_build_object('success', true, 'id', p_school_id, 'name', v_name);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() does the real gating.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_remove_manager(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_school(UUID)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_manager(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_school(UUID)  TO authenticated;

COMMIT;

-- END 20260712000000_admin_delete_school_and_manager.sql

-- ====================================================================
-- BEGIN 20260713000000_feature_flags_rpcs_on_legacy_table.sql
-- ====================================================================
-- =============================================================================
-- 20260713000000_feature_flags_rpcs_on_legacy_table.sql
--
-- Reconcile the two feature_flags designs onto the ONE table that is live in
-- production.
--
-- BACKGROUND:
--   * 20260514_feature_flags.sql created public.feature_flags keyed on `name`
--     (with enabled_for_classes[] for targeted rollouts). THIS is the table
--     that exists in prod, and src/hooks/useFeatureFlag.ts reads it by `name`.
--   * 20260627000000_feature_flags.sql tried to introduce a SECOND, different
--     design keyed on `key` plus admin RPCs (admin_list_flags / _upsert_flag /
--     _delete_flag). It never reached the live database — CREATE TABLE
--     IF NOT EXISTS no-op'd against the existing table, so its `key`-based
--     statements 404'd / errored.
--   * The Developer dashboard (DevFeatureFlagsPanel.tsx) calls those RPCs.
--     Result: the Feature-flags tab is broken because the RPCs don't exist.
--
-- DECISION (operator-approved): keep the live `name` table, and redefine the
-- three admin RPCs to operate on it — mapping the RPC's `key` parameter to the
-- table's `name` column. No table is dropped or renamed; the existing read
-- path (useFeatureFlag) and targeted-rollout column (enabled_for_classes) are
-- untouched.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION. Safe to
-- re-run. Depends on public.assert_admin() (20260624000000) and
-- public.audit_log (010_privacy_compliance.sql).
-- =============================================================================

BEGIN;

-- The dashboard surfaces "updated by <email>"; the legacy table never tracked
-- an author. Add it nullably so existing rows are fine.
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Authenticated clients read flags directly via the useFeatureFlag hook.
-- (The legacy world-read RLS policy already permits SELECT; this just makes
-- the table-level grant explicit and harmless if already present.)
GRANT SELECT ON public.feature_flags TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- admin_list_flags() — read all flags for the dashboard, newest author email
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_flags()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'key', f.name,                 -- dashboard speaks `key`; table stores `name`
      'enabled', f.enabled,
      'description', f.description,
      'updated_at', f.updated_at,
      'updated_by', f.updated_by,
      'updated_by_email', u.email
    ) ORDER BY f.name
  ), '[]'::jsonb)
  INTO result
  FROM public.feature_flags f
  LEFT JOIN public.users u ON u.uid = f.updated_by;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_upsert_flag(p_key, p_enabled, p_description) — create or toggle a flag
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_flag(
  p_key         TEXT,
  p_enabled     BOOLEAN,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_key  TEXT := lower(trim(COALESCE(p_key, '')));
  v_desc TEXT := COALESCE(trim(p_description), '');
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_key) = 0 THEN
    RAISE EXCEPTION 'flag key is required' USING ERRCODE = '22023';
  END IF;
  -- Mirror the legacy table's name CHECK so the admin gets a clear message
  -- instead of a raw constraint-violation error.
  IF v_key !~ '^[a-z][a-z0-9_]{1,63}$' THEN
    RAISE EXCEPTION 'flag key must be snake_case (a-z, 0-9, underscore), 2-64 chars'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.feature_flags (name, enabled, description, updated_at, updated_by)
  VALUES (v_key, p_enabled, v_desc, now(), caller)
  ON CONFLICT (name) DO UPDATE
    SET enabled     = EXCLUDED.enabled,
        description = CASE
          WHEN char_length(EXCLUDED.description) > 0 THEN EXCLUDED.description
          ELSE public.feature_flags.description
        END,
        updated_at  = now(),
        updated_by  = caller;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'feature_flag_set', 'feature_flags',
          jsonb_build_object('key', v_key, 'enabled', p_enabled));

  RETURN jsonb_build_object('success', true, 'key', v_key, 'enabled', p_enabled);
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_delete_flag(p_key) — remove a flag
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_flag(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_key  TEXT := lower(trim(COALESCE(p_key, '')));
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.feature_flags WHERE name = v_key;
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'feature_flag_delete', 'feature_flags', jsonb_build_object('key', v_key));
  RETURN jsonb_build_object('success', true, 'key', v_key);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — writes are admin-only via these SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_flags()                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_flag(TEXT, BOOLEAN, TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_flag(TEXT)                  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_flags()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_flag(TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_flag(TEXT)               TO authenticated;

COMMIT;

-- END 20260713000000_feature_flags_rpcs_on_legacy_table.sql

