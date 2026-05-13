# Pending Operator Tasks

These are actions the human needs to take — no code change will cover them.

> **Last reconciled with production:** 2026-05-07. The April-28 security
> migration backlog is closed; pen-test passes 9/9. Remaining items are
> the May/June feature migrations (with collision-investigation needed)
> and the operational tasks #2–#4 below.

---

## ✅ DONE 2026-05-07 — April-28 security migration backlog

Applied to production via MCP, in order:

```
20260428120000_teacher_dashboard_theme
20260428130000_security_high_save_progress_auth
20260428131000_security_high_quick_play_joins
20260428132000_security_high_award_reward
20260428133000_security_med_teacher_profiles
20260428134000_security_high_revoke_anon_after_recreate
20260428140000_first_rating_columns
20260428141000_security_med_quick_play_sessions
20260428142000_security_med_class_rpc_admin
20260428150000_quick_play_ratings
20260430073933_saved_word_groups
20260501022528_saved_word_groups_by_email
```

12 migrations total. All idempotent. Pen-test passed 9/9 (`scripts/security-pen-test.sh`). No new advisors flagged.

---

## ✅ DONE 2026-05-07 — June collision investigation

Verified via DB introspection that the 3 local June files (`20260609_vocabagrut`, `20260610_school_inquiries`, `20260611_teacher_plan_and_trial`) were pure duplicates of earlier-applied versions (`20260506130131_vocabagrut`, `20260507104138_school_inquiries`, `20260507121937_teacher_plan_and_trial`). Deleted the duplicates from local repo (commit `f07b76d`).

## ✅ DONE 2026-05-07 — June feature migration backlog

Applied to production via MCP, in dependency order:

```
20260507205457 cleanup_expired_data_cron       (pg_cron job nightly 03:30 UTC, retention enforcement)
20260507205536 daily_missions                  (users.timezone, daily_missions table, 4 RPCs)
20260507205558 pet_evolution                   (users.pet_active_days/last_active_date, 2 RPCs)
20260507205628 spaced_repetition               (review_schedule table, 4 RPCs)
20260507205641 teacher_onboarded_at            (users.onboarded_at, 1 RPC)
```

Local files renamed to match applied versions. Cron job active and scheduled (verified `cron.job` table). Pen-test re-run: 9/9 passed.

Backend is now ready for: daily-missions UI, pet-evolution UI, spaced-repetition Review mode tile, teacher onboarding wizard completion tracking. None of these activate without app code shipping.

---

## 0. ⚠️ CATASTROPHIC — Set spending alerts + hard caps on every billing account

**Why:** a single viral school heavy-using can blow through Fly egress, Supabase egress, Gemini OCR quota, or Cloudflare workers paid-tier overage in a week. No alerts are in place today. One $3,000 surprise invoice kills the runway.

Set alerts at **50% / 80% / 100%** of monthly budget AND a hard cap where supported, on each:

| Service | Where | Alert target | Hard cap |
|---|---|---|---|
| Fly.io | Dashboard → Billing → Budget alerts | email + SMS | not directly capped — set low-balance alert + watch egress meter |
| Supabase | Org → Billing → Budgets | email | "spend cap" toggle ON — pauses project at limit instead of overage billing |
| Cloudflare | Dashboard → Billing → Notifications | email | not capped — Workers free tier should be sufficient; watch R2 if used |
| Google Cloud (Gemini) | Billing → Budgets & alerts | email + Pub/Sub | budget action: `disable billing` at 100% (kills the project but stops bleeding) |

Reasonable starting budgets given current scale: Fly $20, Supabase $25 (Pro), Cloudflare $0 (free tier), GCP $50.

Notion: *Vocaband — Risk Register* → "No spending alerts" + "One viral school blows quotas".

---

## 0b. ⚠️ CATASTROPHIC — Bus-factor: document every credential + grant emergency access

**Why:** today every production credential lives with one human. If that human is unreachable for 2 weeks (illness, family emergency, account locked out), Vocaband becomes unmaintainable until they return — including security patches and outage response.

1. Create a single 1Password (or Bitwarden) vault named `Vocaband Production`.
2. Store credentials for: Supabase, Fly.io, Cloudflare, domain registrar, Google Cloud (Gemini), Sentry, GitHub `ward3107` account, Notion workspace owner, and any other service holding production secrets.
3. Enable **Emergency Access** for one trusted person (co-founder, lawyer, spouse). 1Password's emergency-access flow gives them encrypted vault export after a waiting period if you don't deny the request — sound trust-but-verify default.
4. Add a one-page `INCIDENT.md` to the vault with: who to call, where production is hosted, where the kill switch is (`?unregisterSW=1`), how to rotate Supabase service role key, how to pause Stripe (if added later).

Notion: *Vocaband — Risk Register* → "Bus factor of 1".

---

## 0c. ⚠️ HIGH — External cert + DNS expiry monitor

**Why:** Cloudflare and Fly auto-renew TLS certs, but auto-renewal fails silently (DNS race, ACME challenge timeout, rate limit). Result: cert expires at 3am Sunday, every device sees a security warning Monday morning, classes can't run.

Set up free external monitoring (UptimeRobot, Better Stack, or Cronitor):

- HTTP probe `https://www.vocaband.com/api/health` every 5 minutes — alerts if 5xx or unreachable
- **SSL expiry probe** that pages you when cert has < 14 days remaining (UptimeRobot has this as a built-in monitor type)
- DNS A/AAAA record monitor for `vocaband.com` and `auth.vocaband.com`

Page via SMS or push, not email — email is too easy to miss at 3am.

Notion: *Vocaband — Risk Register* → "DNS / cert auto-renewal failure".

---

## 0d. ⚠️ HIGH — Domain registrar: 5-year auto-renew + secondary card + WHOIS lock

**Why:** vocaband.com is on one registrar tied to one email tied to one payment card. Expired card → registrar fails renewal → domain enters redemption → kids' school accounts go dark. Real-world horror story for many SaaS founders.

Action items:

1. Set `vocaband.com` and `auth.vocaband.com` (if separately registered) to auto-renew for **5 years**, not 1. Most registrars allow this.
2. Add a **secondary payment method** in the registrar account. If primary card declines, secondary tries automatically.
3. Enable **WHOIS / registrar lock** (transfer lock). Prevents domain hijack via social-engineered transfer.
4. Verify the registrar account email is one in the 1Password vault from §0b — not a personal Gmail that could be lost.

Notion: *Vocaband — Risk Register* → "Domain registrar lapse".

---

## 1. (OPTIONAL) Regenerate + re-upload motivational audio

If phrase audio is still mismatched:

```bash
npx tsx scripts/generate-motivational.ts
npx tsx scripts/upload-motivational.ts   # needs .env.local with service_role key
```

---

## 2. Configure Supabase email + magic-link template for teacher OTP

**Authentication → Providers → Email:** enable + Email OTP length = **6** digits (default 8 won't validate).

**Authentication → Email Templates → Magic Link:** paste styled template from OTP shipping notes — must include `{{ .Token }}`. Subject: `Vocaband sign-in code: {{ .Token }}`.

---

## 3. (OPTIONAL) UptimeRobot ping

Fly Starter has no cold starts but still good belt-and-suspenders.

---

## 4. Native Russian proofread for the teacher PDFs

The 5 Russian PDFs in `public/docs/*-ru.pdf` were authored without a native reviewer. Before any of them go out to parents or admins, get a native Russian speaker to proof at least:

- `parent-letter-ru.pdf` — goes home to families, highest stakes
- `privacy-sheet-ru.pdf` — goes to school administrators

The teacher / student / quick-start docs are lower-stakes and can wait. Source text lives in `scripts/teacher-pdfs/content/*.mjs` under the `ru` key; rebuild with `node scripts/teacher-pdfs/build.mjs --ru` after edits.

---

## ✅ DONE earlier — `claude/fix-points-display-9Q4Dw` merged to main

Branch no longer exists in remote (verified 2026-05-07 via `git branch -r`). All 2026-04-29/30 work (OCR final fix via in-page camera, PWA install banner, 3 new dashboard themes, teacher OTP login, full student i18n) shipped.
