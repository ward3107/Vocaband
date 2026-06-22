# Push Notifications — Operator Runbook

> How to turn the push-notification feature ON. It ships **OFF and inert**:
> no VAPID keys + flag off = the whole path no-ops. Do NOT enable for real
> students until the compliance package
> (`docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md`) is ratified.

## What's already in the codebase (this PR)
- DB: `push_subscriptions` table + RLS (migration `20260724000000_…`), and a
  seeded `push_notifications` feature flag (**disabled**).
- Service worker: `public/sw-push.js` (imported by workbox).
- Client: opt-in card (student dashboard), opt-out toggle (Privacy
  Settings), `usePushNotifications` hook.
- Server: `POST /api/push/notify` in `server.ts` (web-push + VAPID).
- Triggers: new assignment, teacher reward, live-challenge start.

## Enabling — step by step

### 1. Generate a VAPID key pair (once)
```bash
npx web-push generate-vapid-keys
# → Public Key:  B...   Private Key:  ...
```

### 2. Set the secrets
**Fly.io (server sender):**
```bash
fly secrets set \
  VAPID_PUBLIC_KEY="<public>" \
  VAPID_PRIVATE_KEY="<private>" \
  VAPID_SUBJECT="mailto:privacy@vocaband.com"
```
**Build (client subscribe) — set in the build env / CI:**
```
VITE_VAPID_PUBLIC_KEY=<public>   # MUST equal the server public key
```
> If either side is missing, the feature stays a no-op (server logs
> `[push] VAPID keys missing — push notifications DISABLED`).

### 3. Run the migration
Applied with the normal Supabase migration flow (the table + flag row).

### 4. Flip the flag — gradually
Roll out to ONE class first (your own test class), not everyone:
```sql
-- targeted: only this class sees it (master switch stays off)
UPDATE public.feature_flags
SET enabled_for_classes = ARRAY['YOURTESTCODE']
WHERE name = 'push_notifications';
```
When confident, enable for everyone:
```sql
UPDATE public.feature_flags SET enabled = true WHERE name = 'push_notifications';
```
Kill switch (instant off for all): set `enabled = false` and clear the array.

## Verifying
1. Open the student app on Chrome Android (or an installed PWA).
2. The opt-in card appears on the dashboard → tap "Yes, notify me" → grant.
3. As the teacher, create an assignment for that class.
4. The device shows "New task from your teacher" within seconds.
5. Privacy Settings → Notifications → "Turn off" stops further pushes.

## Notes / limits
- **iOS:** only installed PWAs (16.4+) receive push; Safari tabs get nothing.
- Payloads are PII-free by contract — never add a name/score to the push.
- Expired endpoints (404/410) are auto-revoked by the sender.
- Quiet hours / frequency caps are NOT yet implemented — add before a wide
  rollout (see design doc §4).
