-- Push notification subscriptions.
--
-- One row per (student, device/browser) that has opted in to push
-- notifications. The Fly.io sender (server.ts, service-role key) reads
-- these to fan out PII-free pushes when a teacher posts an assignment,
-- grants a reward, or starts a live challenge.
--
-- Privacy posture (see docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md):
--   * `uid` mirrors the consent_log convention (auth.uid()::text) so a
--     student owns ONLY their own rows.
--   * Teachers must NOT be able to read these rows — the endpoint is an
--     opaque device identifier. RLS therefore grants SELECT only to the
--     owner + admins, never via is_teacher().
--   * The endpoint payload itself carries no name/score (enforced in
--     server.ts), so this table is the only place a device link lives.
--
-- The whole feature ships behind the `push_notifications` feature flag
-- (OFF by default); this table is inert until a client subscribes.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid              TEXT NOT NULL,                       -- auth.uid()::text of the student
  endpoint         TEXT NOT NULL UNIQUE,                -- push service URL (opaque)
  p256dh           TEXT NOT NULL,                       -- client public key (Web Push)
  auth             TEXT NOT NULL,                       -- client auth secret (Web Push)
  device_label     TEXT,                                -- "Chrome on Android" — UX only
  lang             TEXT NOT NULL DEFAULT 'en',          -- notification language (en/he/ar)
  consent_version  TEXT NOT NULL,                       -- PUSH_CONSENT_VERSION at opt-in
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at       TIMESTAMPTZ                          -- soft-delete on opt-out / 410 Gone
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_uid
  ON public.push_subscriptions (uid)
  WHERE revoked_at IS NULL;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A student may register a subscription only for themselves.
DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- Owner (and admins) can read; teachers explicitly cannot — the device
-- endpoint is a personal identifier, out of gradebook scope.
DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
  FOR SELECT USING (auth.uid()::text = uid OR public.is_admin());

-- Owner can refresh last_seen / soft-revoke their own rows.
DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);

-- Owner can hard-delete (opt-out wipe).
DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
  FOR DELETE USING (auth.uid()::text = uid);

-- The Fly.io sender uses the service-role key, which bypasses RLS, to
-- read every opted-in student's subscription for a class. No broad grant
-- to anon/authenticated is needed beyond the owner policies above.

-- Ship the feature OFF. Flip `enabled` (or add a class to
-- enabled_for_classes) only after the compliance package is ratified.
INSERT INTO public.feature_flags (name, enabled, enabled_for_classes)
VALUES ('push_notifications', false, '{}'::text[])
ON CONFLICT (name) DO NOTHING;
