-- school_inquiries — leads captured from the public landing-page modal.
--
-- Insert path: anonymous (anon role) — visitors aren't logged in when
-- they submit. We allow public INSERT but column CHECKs + an RLS WITH
-- CHECK clause keep spam fields and status-tampering out.
--
-- Read path: service_role only. Inquiries contain school + contact PII
-- so they must never be readable by anon or authenticated. Sales pulls
-- them via the Supabase dashboard / admin tooling.
--
-- The mailto: in SchoolInquiryModal stays as a parallel notification —
-- even if the DB insert succeeds, the user's mail client opens so the
-- founder gets immediate visibility while the lead is also persisted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_inquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name     TEXT NOT NULL CHECK (char_length(school_name) BETWEEN 2 AND 200),
  contact_name    TEXT NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 200),
  email           TEXT NOT NULL CHECK (char_length(email) BETWEEN 5 AND 320 AND position('@' IN email) > 1),
  whatsapp        TEXT NOT NULL CHECK (char_length(whatsapp) BETWEEN 5 AND 40),
  students_count  INT  NOT NULL CHECK (students_count BETWEEN 1 AND 100000),
  teachers_count  INT  NOT NULL CHECK (teachers_count BETWEEN 1 AND 1000),
  language        TEXT CHECK (language IS NULL OR language IN ('en', 'he', 'ar')),
  user_agent      TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','won','lost','spam')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_inquiries_created ON public.school_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_inquiries_status_new
  ON public.school_inquiries (created_at DESC) WHERE status = 'new';

ALTER TABLE public.school_inquiries ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated can INSERT only. status must be 'new' (no preset
-- pipeline tampering) and notes must be NULL (no free-form payload injection
-- — sales adds notes via service_role from the dashboard).
DROP POLICY IF EXISTS school_inquiries_insert_public ON public.school_inquiries;
CREATE POLICY school_inquiries_insert_public
  ON public.school_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new' AND notes IS NULL);

COMMENT ON TABLE public.school_inquiries IS
  'Public landing-page school plan inquiries. Anon insert; service_role read.';

COMMIT;
