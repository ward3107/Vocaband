-- Native (FCM) push support for the Android Play Store app.
--
-- The original push_subscriptions table assumed Web Push, where each row
-- carries the W3C `endpoint` + `p256dh` + `auth` keys. The Capacitor
-- Android app can't use Web Push (its WebView lacks the API), so it
-- registers via native FCM instead — which gives a single opaque
-- registration TOKEN and no key pair.
--
-- We reuse the same table:
--   * kind = 'web'    → endpoint/p256dh/auth as before (Web Push).
--   * kind = 'native' → endpoint holds the FCM registration token;
--                       p256dh/auth are NULL.
-- The server picks the delivery path per row by `kind`.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'web';

-- Native rows have no W3C key pair — relax the NOT NULL added originally.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth   DROP NOT NULL;

-- Constrain kind, and keep Web Push rows honest (they still need the keys).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_kind_keys_chk'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_kind_keys_chk CHECK (
        kind IN ('web', 'native')
        AND (kind <> 'web' OR (p256dh IS NOT NULL AND auth IS NOT NULL))
      );
  END IF;
END $$;
