# Pending Operator Tasks

These are actions the human needs to take — no code change will cover them.

> **Last reconciled with production:** 2026-05-19.  The four
> CATASTROPHIC/HIGH operational items in §0 are now ¾ done — §0c
> (external HTTP + SSL-expiry monitor) is the only one still open.
> Feature-side, §2 (OTP email template) shipped; §4 (RU PDF
> proofread) is deferred until a native reviewer is lined up.

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

## ✅ DONE 2026-05-16 — Supabase GoTrue auth rate-limits verified

Walked the operator through every Auth → Rate Limits, Auth → Sessions,
and Project Settings → JWT Keys field. All at safe defaults:

```
Rate Limits        emails           30/h            (built-in SMTP fallback; we use Resend)
                   sms              30/h            (unused)
                   token refreshes  150 / 5 min     (= 1800/h per IP)
                   otp verifies     30 / 5 min      (= 360/h per IP)
                   anon sign-ins    30/h
                   signup+signin    30 / 5 min      (= 360/h per IP)
                   web3             30 / 5 min      (unused)

Sessions           refresh reuse    10 s            (network-jitter tolerance)
                   compromise detect  ON
                   single-session    OFF            (students use phone + class PC)
                   time-box         0 (never)
                   inactivity       0 (never)

JWT Keys (legacy)  JWT expiry       3600 s (1 h)    (blast-radius bound)
```

Operator walkthrough: `docs/auth-rate-limits.md`. hCaptcha was
deliberately left OFF — codebase has zero `captchaToken` call sites,
flipping it on would break teacher OTP + student PIN login.

If a school ever reports "we can't all log in at once" from a shared
NAT, raise signup+signin to 60/5min — don't tighten it.

---

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

## ✅ DONE 2026-05-19 — Latin web fonts self-hosted (PR #787 follow-up)

Plus Jakarta Sans (variable) + Be Vietnam Pro (4 weights) now ship from
`/public/fonts/` instead of `fonts.googleapis.com`.  ~95% of sessions
(English-only) no longer touch Google for fonts.  RTL fonts (Heebo +
Fredoka) still load from Google Fonts on HE/AR sessions — narrower-
scoped registry entry tracks that as the next-step follow-up.  Commit
`a1fb84a` on `claude/privacy-compliance-review-Z2JhW`.

---

## ✅ DONE 2026-05-19 — §0 / §0b / §0d billing + bus-factor + registrar

Three of the four ⚠️ catastrophic/high operational items closed:

- **§0 spending alerts + hard caps** — Fly $20, Supabase $25 with
  spend-cap ON, Cloudflare free, GCP $50 with `disable billing` action
  at 100%.  Alerts at 50/80/100%.
- **§0b bus-factor vault** — `Vocaband Production` 1Password vault
  with Emergency Access granted to one trusted contact + INCIDENT.md
  one-pager inside.
- **§0d domain registrar** — `vocaband.com` (and `auth.vocaband.com`)
  on 5-year auto-renew, secondary payment method added, WHOIS /
  transfer lock enabled, registrar account email pointed at the
  vault-stored mailbox.

§0c (external HTTP + SSL-expiry + DNS monitor) remains open — see
below.

---

## ✅ DONE 2026-05-19 — §2 Supabase OTP email template (6-digit)

Authentication → Providers → Email enabled, OTP length set to 6
digits.  Magic-link template updated with `{{ .Token }}`.  Unblocks
teacher OTP login.

---

## 0c. ⚠️ HIGH — External cert + DNS expiry monitor (STILL OPEN)

**Why:** Cloudflare and Fly auto-renew TLS certs, but auto-renewal
fails silently (DNS race, ACME challenge timeout, rate limit).  Result:
cert expires at 3am Sunday, every device sees a security warning
Monday morning, classes can't run.

Set up free external monitoring (UptimeRobot, Better Stack, or
Cronitor):

- HTTP probe `https://www.vocaband.com/api/health` every 5 minutes —
  alerts if 5xx or unreachable
- **SSL expiry probe** that pages you when cert has < 14 days
  remaining (UptimeRobot has this as a built-in monitor type)
- DNS A/AAAA record monitor for `vocaband.com` and `auth.vocaband.com`

Page via SMS or push, not email — email is too easy to miss at 3am.

Notion: *Vocaband — Risk Register* → "DNS / cert auto-renewal failure".

---

## 1. (OPTIONAL) Regenerate + re-upload motivational audio

If phrase audio is still mismatched:

```bash
npx tsx scripts/generate-motivational.ts
npx tsx scripts/upload-motivational.ts   # needs .env.local with service_role key
```

---

## 2. ✅ DONE 2026-05-19 — Supabase email + magic-link template for teacher OTP

Authentication → Providers → Email enabled, Email OTP length set to
**6** digits (default 8 won't validate against the in-app OTP form).
Magic-link template updated with `{{ .Token }}` and subject
`Vocaband sign-in code: {{ .Token }}`.  Teacher OTP login flow unblocked.

---

## 3. (OPTIONAL) UptimeRobot ping

Fly Starter has no cold starts but still good belt-and-suspenders.
Largely subsumed by §0c above (which adds SSL-expiry + DNS monitors on
top of a basic health-check probe).

---

## 5. Future engineering follow-up — passive PIN-attempt logging

Not an operator task — engineering. The DONE block above closes the
2026-05-14 share-invite security follow-up.

Add a `student_pin_attempts` table with success/fail rows so teachers
can later see "Sara had 7 failed attempts today" without any automatic
lockout (we deliberately rejected per-account lockout — see
`docs/teacher-share-invites-plan.md` §6 for why).

---

## 4. Native Russian proofread for the teacher PDFs (DEFERRED 2026-05-19)

**Status:** parked until a native Russian reviewer is lined up.  Not
shipping the RU PDFs to parents/admins in the meantime is the
mitigation.

The 5 Russian PDFs in `public/docs/*-ru.pdf` were authored without a native reviewer. Before any of them go out to parents or admins, get a native Russian speaker to proof at least:

- `parent-letter-ru.pdf` — goes home to families, highest stakes
- `privacy-sheet-ru.pdf` — goes to school administrators

The teacher / student / quick-start docs are lower-stakes and can wait. Source text lives in `scripts/teacher-pdfs/content/*.mjs` under the `ru` key; rebuild with `node scripts/teacher-pdfs/build.mjs --ru` after edits.

---

## ✅ DONE earlier — `claude/fix-points-display-9Q4Dw` merged to main

Branch no longer exists in remote (verified 2026-05-07 via `git branch -r`). All 2026-04-29/30 work (OCR final fix via in-page camera, PWA install banner, 3 new dashboard themes, teacher OTP login, full student i18n) shipped.
