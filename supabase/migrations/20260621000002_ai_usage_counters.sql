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
