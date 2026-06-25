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
- Quiet hours + daily frequency cap are **implemented server-side** in
  `server.ts`: no pushes 20:00–07:00 in `PUSH_TIMEZONE` (default
  `Asia/Jerusalem`), and a per-student daily cap (`PUSH_DAILY_CAP`, default 5)
  backed by the `push_daily_counts` table + `bump_push_daily_count()` RPC
  (migration `20260725000000`). Both are env-configurable; the in-app badge is
  unaffected.

---

## Native Android (FCM) — for the Google Play app

The Web Push above works in Chrome / installed PWAs but **not inside the
Capacitor Play Store app** (its WebView has no Push API). The code for the
native path is already in the repo (the app uses
`@capacitor/push-notifications`; the server sends via Firebase when
`FIREBASE_SERVICE_ACCOUNT` is set; `push_subscriptions.kind='native'` rows
hold the FCM token). It stays inert until the Firebase steps below are done.

### One-time setup (operator)
1. **Create a Firebase project** (free) → add an Android app with package
   name **`com.vocaband.student`**.
2. Download **`google-services.json`** → place it at
   **`android/app/google-services.json`**.
3. **Apply the Google Services Gradle plugin** (two small edits):
   - `android/build.gradle` (project) → in `dependencies`, add:
     `classpath 'com.google.gms:google-services:4.4.2'`
   - `android/app/build.gradle` (app) → at the very bottom, add:
     `apply plugin: 'com.google.gms.google-services'`
   > These are left to you on purpose: applying the plugin without the JSON
   > would break the Android build, so we don't ship it half-wired.
4. **Server credential:** in Firebase → Project settings → Service accounts
   → "Generate new private key". Set the whole JSON as a Fly secret:
   `fly secrets set FIREBASE_SERVICE_ACCOUNT='<paste the JSON>'`

### Build + ship
5. Run GitHub → Actions → **Build Student Android App** (build mode) → it
   produces the signed `.aab`.
6. Upload the `.aab` to Google Play (internal testing track first).
7. **Update the Play Data Safety form**: now collects a "Device ID" (FCM
   token) for notifications — optional, opt-in, encrypted in transit.

### Verify
8. Install the internal-testing app on a real Android phone → open it.
9. The opt-in card appears → tap "Yes" → grant the Android 13+ permission.
10. As the teacher, post an assignment → the phone shows the notification
    even with the app closed.

### Notes
- Same children-safety rules: functional-only, PII-free, opt-in, easy off.
- Stale FCM tokens (`registration-token-not-registered`) auto-revoke.
- **iOS** is a separate job: same plugin, but APNs + Apple Push key + an
  App Store release ($99/yr Apple Developer).
