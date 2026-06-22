# Push Notifications — Engineering Design

> **Status: PROPOSAL — no code written yet.** This document is the plan to
> review and approve *before* any implementation. It touches PROTECTED
> ZONES (`server.ts`, the database, a new service worker), so nothing
> ships until the design + the companion compliance package
> (`docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md`) are approved.
>
> Author: engineering. Created 2026-06-22. Owner: founder.

---

## 1. Goal (plain English)

When a teacher sends a new assignment (or reward, or starts a live
challenge), the student should be able to get a **notification on their
device** — even when the app is closed — instead of only finding out the
next time they happen to open the app.

Today the only signal is the **count badge on the "Tasks" orbit circle**
(`StudentDashboardView.tsx` → `badge: studentAssignments.length`). It's
in-app only, shows a total (not "new"), and never reaches a closed app.

---

## 2. Scope

### In scope (Phase 1)
- **Functional / transactional** notifications only:
  1. New assignment from your teacher.
  2. Teacher sent you a reward.
  3. Live challenge is starting now.
- **Web Push** delivery (works for the installed PWA + Android).
- Explicit, contextual **opt-in** with a versioned consent record.
- Easy **opt-out** in Privacy Settings.

### Out of scope (explicitly NOT Phase 1)
- ❌ Marketing / re-engagement pushes ("come back!", "sale!") — banned for
  minors and would trip Communications Law §30A (anti-spam). See compliance doc.
- ❌ Streak / "you'll lose your streak" nudges — manipulative-nudge risk
  toward children; **default OFF**, revisit only with explicit sign-off.
- ❌ Native iOS APNs via a real App Store app (Apple Developer fee, separate
  build pipeline). Deferred — see §4 iOS note.

---

## 3. Architecture

```
Teacher creates assignment
      │
      ▼
server.ts  ──(reads push_subscriptions for the class's students)──┐
      │                                                            │
      │  web-push (VAPID-signed) POST to each endpoint             │
      ▼                                                            ▼
FCM (Android/Chrome)  /  Mozilla autopush  /  APNs-web (Safari)  ── push services
      │
      ▼
Service Worker on student device  ── self.registration.showNotification()
      │
      ▼
Student taps → opens app deep-linked to the Tasks sheet
```

### Pieces to build
| # | Piece | Where | Protected? |
|---|---|---|---|
| 1 | Service worker `push` + `notificationclick` handlers | new `public/sw-push.js` (or extend the PWA SW) | New file |
| 2 | Client subscribe/unsubscribe + permission UX | new `src/hooks/usePushSubscription.ts` + a card in Privacy Settings | No |
| 3 | `push_subscriptions` table + RLS | new migration `supabase/migrations/` | 🔒 **DB** |
| 4 | Sender util + trigger on assignment create | `server.ts` (`web-push` lib + VAPID env) | 🔒 **Backend** |
| 5 | Consent version + opt-in copy | `src/config/privacy-config.ts`, `legalTranslations.ts` | 🔒 shared contract |
| 6 | Feature flag | existing `feature_flags` | No |

### Data model (proposed)
```sql
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  endpoint     text not null unique,           -- push service URL (opaque)
  p256dh       text not null,                  -- client public key
  auth         text not null,                  -- client auth secret
  device_label text,                           -- "Chrome on Android" (UX only)
  lang         text not null default 'en',     -- notification language
  consent_version text not null,               -- PUSH_CONSENT_VERSION at opt-in
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz                     -- soft-delete on opt-out / 410
);
-- RLS: a user may only see/insert/delete their OWN rows.
-- Teachers MUST NOT be able to read student subscriptions (it's a device
-- identifier). Sender runs in server.ts under the service-role key only.
```

### Payload — strict data minimisation
The push body crosses third-party push services (Google/Apple/Mozilla), so
it carries **no PII**. Generic, localized text only:

```json
{ "type": "new_assignment", "title": "New task from your teacher",
  "body": "Tap to play", "url": "/student?open=tasks", "lang": "he" }
```
No student name, no class name, no scores. The app fetches details *after*
the student taps and is authenticated.

---

## 4. Hard constraints to design around

- **iOS Web Push** only works for a **home-screen-installed PWA on iOS/iPadOS
  16.4+**. A student who just uses Safari gets nothing. Decision: Phase 1 =
  Android + installed PWA; surface an "Add to Home Screen" nudge for iOS;
  native APNs deferred.
- **Permission UX:** never prompt on first load (instant deny = permanently
  blocked). Use a **pre-prompt card** ("Want a ping when your teacher sends a
  task?") and only call the browser permission API after the student taps yes,
  ideally after their first game.
- **Expired endpoints:** push services return `404/410` — the sender must
  soft-delete (`revoked_at`) those rows.
- **Quiet hours + frequency cap:** no pushes 20:00–07:00 local; max N/day per
  student; coalesce bursts ("3 new tasks" not 3 pings). Protects children from
  over-notification (a DPIA mitigation, not just polish).
- **i18n:** notification text in the student's `lang` (en/he/ar), RTL-safe.
- **VAPID keys:** new Fly.io secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT=mailto:privacy@vocaband.com`. Never committed.

---

## 5. Pre-flight checklist — what MUST be true before any change

1. ☐ This design approved by the founder.
2. ☐ Compliance package (`docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md`)
   reviewed by the privacy lawyer (ties into the open MoE/legal operator task).
3. ☐ DPIA addendum ratified (children + new device identifier = high-risk processing).
4. ☐ `SUBPROCESSORS.md` + `THIRD_PARTY_REGISTRY` updated to list Google FCM
   (and Apple APNs when iOS lands) — **before** the first real push is sent.
5. ☐ Privacy policy + Google Play Data Safety + Apple privacy label updated.
6. ☐ Feature flag created (ships OFF; enabled for founder's test class first).
7. ☐ CODEOWNERS review for the protected files (DB migration, `server.ts`).

---

## 6. Rollout phases
1. **P0 — plumbing, flag OFF:** table + RLS, SW, subscribe hook, sender util,
   VAPID secrets. Self-test only.
2. **P1 — one notification type:** "new assignment", founder's test class.
3. **P2 — opt-in UX + Privacy Settings opt-out + quiet hours/caps.**
4. **P3 — add reward + live-challenge types;** roll out per-class behind flag.
5. **P4 (later) — native iOS APNs** if demand justifies the Apple fee.

---

## 7. Cost
- FCM (Android/Web) and APNs: **free**.
- Storage (`push_subscriptions`): negligible on current Supabase plan.
- Native iOS App Store route (Phase 4 only): **Apple Developer $99/yr**.
- Legal review: lawyer's fee (already a pending operator task).

---

## 8. Test matrix (before P1 → P2)
| Platform | Expected |
|---|---|
| Chrome Android | Full push, app closed |
| Chrome/Edge desktop | Full push |
| Installed PWA, Android | Full push |
| Installed PWA, iOS 16.4+ | Push only if installed |
| Safari iOS, not installed | No push — show install nudge, no error |
| Permission denied | Graceful, never re-nags, opt-in still in Settings |
| Opt-out | Row soft-deleted, no further pushes |
| Expired endpoint (410) | Row auto-revoked by sender |
