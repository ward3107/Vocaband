-- Drop the dormant Parent Weekly Digest feature in its entirety.
--
-- This rolls back two prior migrations:
--   1. 20260612000000_parent_digest_optin.sql  — Phase 1 opt-in columns
--   2. 20260613000000_digest_send_log.sql      — Phase 2 idempotency log
--
-- Plus the companion Edge Function `supabase/functions/send_parent_digest`
-- and the setup doc `docs/PARENT-DIGEST-SETUP.md`, both deleted in the
-- same commit.
--
-- The feature was flag-gated off and never released — no row ever had
-- a non-null parent_email, no row was ever written to digest_send_log.
-- It was live schema + Edge-Function code but dead data.
--
-- The 2026-05-18 privacy review flagged this stub: a reviewer reading
-- the schema would see parent_email + a Resend-touching Edge Function
-- and reasonably ask why Vocaband collects parent emails when the
-- privacy policy makes no mention of them or of Resend as a sub-
-- processor.  The cleaner story is that we don't collect parent emails
-- at all.  Dropping the schema + worker aligns code with policy.
--
-- If we ever ship the Friday-digest feature, re-introduce the schema
-- in a new migration alongside the worker + cron + email template +
-- privacy-policy disclosure update + Resend in THIRD_PARTY_REGISTRY.
-- Don't bring back columns ahead of the disclosure.

-- Phase 2 idempotency log.
DROP TABLE IF EXISTS public.digest_send_log;

-- Phase 1 opt-in columns.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_parent_email_locale_check,
  DROP CONSTRAINT IF EXISTS users_parent_email_format_check;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS parent_email,
  DROP COLUMN IF EXISTS parent_email_locale,
  DROP COLUMN IF EXISTS parent_email_opt_in_at;
