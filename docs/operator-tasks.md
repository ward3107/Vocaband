# Pending Operator Tasks

These are actions the human needs to take — no code change will cover them.

> **Last reconciled with production:** 2026-05-19.  The four
> CATASTROPHIC/HIGH operational items in §0 are now ⁵⁄₆ closed — §0c
> (external HTTP + SSL-expiry monitor) is the only one still open.
> Feature-side, §2 (OTP email template) and §6 (audio CDN) shipped;
> §4 (RU PDF proofread) is deferred until a native reviewer is lined
> up.

---

## 🟡 OPEN — Enable branch protection + Code Owners review on `main`

**Why:** `.github/CODEOWNERS` now lists the critical flows (auth, AI,
backend, database, shared `src/core/`, build config). By itself that file
only *auto-requests* the owner's review — it does **not** block a merge.
The block only happens once branch protection on `main` has "Require
review from Code Owners" turned on. This is a one-time click-through;
no code change can do it.

**Steps (≈3 min, GitHub web UI):**

1. Confirm the owner handle: open `.github/CODEOWNERS` and check every
   line uses your real GitHub username (currently `@ward3107`). An invalid
   handle silently disables enforcement.
2. GitHub → repo **Settings → Branches → Add branch ruleset** (or "Add
   classic branch protection rule") targeting `main`.
3. Enable:
   - ✅ **Require a pull request before merging** → Require approvals: **1**
   - ✅ **Require review from Code Owners**  ← this is the switch that makes
     CODEOWNERS actually block merges to the protected paths
   - ✅ **Require status checks to pass** → select the **"Typecheck + tests
     + build"** check (the `ci.yml` job) so a broken build can't merge
   - ✅ **Block force pushes** and **Do not allow bypassing the above**
     (or restrict bypass to yourself only)
4. Save. Test it: open a throwaway PR that tweaks one line in `server.ts`
   — the PR should now show "Review required from code owners" and the
   merge button should stay disabled until you approve.

**Result:** after this, no change to auth / AI / backend / DB / core can
reach production without your explicit approval — even if it was authored
by an AI agent or pushed straight to a branch. This is the hard,
server-enforced half of the protection (the `CLAUDE.md` "PROTECTED ZONES"
section is the soft half that warns AI sessions up front).

---

## ✅ RESOLVED 2026-06-08 — Teacher email login 500 (Resend DKIM record deleted)

Teacher email/OTP login broke with `POST /auth/v1/otp → 500` /
"Error sending magic link email". Supabase **auth logs** showed the real
cause: `550 The vocaband.com domain is not verified` from Resend. The
`resend._domainkey` (DKIM) TXT record had been **deleted** from the
Cloudflare DNS zone; SPF + bounce records were intact, so Resend
un-verified the whole domain on its next re-check and refused all sends.

Fixed by re-adding the DKIM TXT record (Resend → Domains → copy the DKIM
`p=...` value → Cloudflare DNS → Add TXT `resend._domainkey`). All three
Resend rows returned to Verified; login recovered.

**If it recurs:** the records are public, so diagnose with no dashboard —
`dig +short TXT resend._domainkey.vocaband.com` (empty = the bug). Full
runbook + the other two records to check live in
`docs/RESEND-SMTP-SETUP.md` → "Resolved incident — 2026-06-08". Watch
for the decoy `cf2024-1._domainkey` record (that's Cloudflare Email
Routing's DKIM, not Resend's). Affects ALL auth email; Google OAuth +
student PIN login unaffected.

---

## ✅ DONE — Eliminated Cloudflare Insights rotation churn

**RESOLVED 2026-05-23:** Operator disabled Cloudflare Browser
Insights in the dashboard and enabled the script-less Cloudflare
Web Analytics product instead (Option A below).  Code follow-up
(this commit) dropped 5 rotating script hashes,
`static.cloudflareinsights.com` from `script-src` / `script-src-elem`,
and `cloudflareinsights.com` from `connect-src` across both
`public/_headers` and `server.ts`.  The Network Diagnostic probe was
re-pointed to same-origin `/cdn-cgi/trace` so it no longer depends
on the retired allowlist entry.  Verified post-flip with
`curl -s https://vocaband.com/ | grep cloudflareinsights` returning
zero matches.  Sentry continues to cover client-side error
telemetry; Web Analytics covers traffic.  The original problem
write-up is preserved below for the audit trail.

**ORIGINAL STATUS (pre-fix):** 5 hash rotations in 9 days
(`u2tz3AO+oB` → `VxcUPwAXbsfZ` → `jsbFxr3mSLx` → `ZScbVWl2oPtsl` → 4
of the 2026-05-22/23 variants).  Each rotation triggers a CSP
violation in production (last reported on the OAuth callback path
`?code=...`).  PRs #882, #885, #899, and the follow-up that lands
this entry have all been "add the new hash, retire the oldest" — a
treadmill, not a fix.

**WHY:**  Cloudflare Insights injects an inline bootstrap script into
every HTML response.  That script's content changes per cache version
(probably as Cloudflare rolls security updates to the beacon).  CSP
hash allowlisting requires the exact bytes — so every rotation breaks
production for any user whose request happens to hit the new cached
variant before we ship the new hash.  Adding a hash inside Cloudflare's
edge-cache rotation window is impossible by design.

**HOW (pick one):**

### Option A (recommended, no code) — Switch to Cloudflare Web Analytics

Cloudflare offers two analytics products in the same dashboard:

- **Insights** — JS beacon (`cdn-cgi/beacon/insights`), inline bootstrap,
  rotating script.  This is what we have.
- **Web Analytics** — server-side, no JS injection, no CSP hashes,
  cookie-less, GDPR-friendlier.  Same dashboard UI for traffic stats.

Migration is a dashboard flip:

1. Cloudflare dashboard → `vocaband.com` zone → Analytics & Logs →
   Web Analytics → enable.
2. Same screen → Insights → disable.
3. Once disabled, follow-up PR removes from `public/_headers`:
   - All 5 CF Insights hashes from `script-src` + `script-src-elem`
   - `https://static.cloudflareinsights.com` from both directives
   - The whole "Cloudflare Insights bootstrap" comment block (lines 17-40)
4. CSP shrinks by ~700 chars — plenty of room for future hash additions
   for whatever else gets inlined.

**Tradeoff:**  Insights gives slightly richer per-request data (the JS
beacon can report client-side errors + page-load timings).  Web
Analytics gives only server-observed traffic.  For Vocaband's stage
(pilot/early), traffic stats are enough — Sentry already covers
client-side errors.

**COST:**  $0.  Both products are free.

### Option B (medium effort, code) — Strip the Insights script in the Cloudflare Worker

The Worker already uses `HTMLRewriter` (see worker/index.ts).  Add a
selector that drops every `<script>` whose content matches the CF
Insights signature.  Pseudo-code in the Worker:

```ts
new HTMLRewriter()
  .on('script', {
    element(el) {
      // CF Insights bootstrap doesn't have a stable src or class;
      // detect via the static.cloudflareinsights.com domain reference
      // inside its body.  HTMLRewriter doesn't expose body content
      // directly — use a text handler to inspect-and-buffer.
      ...
    }
  })
```

Same effect as Option A but the operator keeps Insights enabled if
they want the JS beacon's other features (e.g. RUM timing).  More
fragile (CF could change the bootstrap signature) but no dashboard
flip needed.

### Option C (status quo) — Keep adding hashes by hand

What we've been doing.  Each rotation = 1 PR.  Sustainable if
rotations slow to monthly; unsustainable at the current 1-2-day pace.

**DONE LOOKS LIKE:**  `_headers` has no `sha256-…` hashes for
CF Insights, no `static.cloudflareinsights.com` host in script-src,
and no "Cloudflare Insights bootstrap" comment block.  CSP line
length drops back to ~1300 chars (plenty of headroom).  No CSP
violations on the OAuth callback path for 30 consecutive days.

---

## 🟡 OPEN — Migrate Gemini OCR to Vertex AI for region-pinning + no-training (H-5)

**STATUS:** Open since 2026-05-23 (audit H-5 verification).

**WHY:** Today the OCR + sentence-generation features go through
`generativelanguage.googleapis.com` (the AI Studio API).  That endpoint
is Google-global — there is NO `europe-west` regional pinning, and the
data-handling guarantees depend on whether the GCP project has billing
enabled (Pay-As-You-Go terms) or is running on the free tier (which may
use prompts for product improvement / model training).

Migrating to Vertex AI Gemini (`aiplatform.googleapis.com`, e.g.
`europe-west1`) gives us, in writing:

  - regional pinning (data stays in Europe);
  - no use of prompts for model training;
  - the full Google Cloud DPA + the Cloud Data Processing Addendum,
    which is what our `docs/SUBPROCESSORS.md` row claims today.

**HOW:**

1. In GCP console for the Vocaband project, enable the Vertex AI API.
2. Pick a regional endpoint — `europe-west1` (Belgium) is the closest
   in-EEA option that supports the `gemini-2.5-flash` family.  Verify
   the chosen model is available in that region:
   https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations
3. Create a service account with the `Vertex AI User` role.  Download
   the JSON key (small file, fine in `fly secrets`).
4. `fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste>` — the
   server reads this at boot.
5. Swap `@google/generative-ai` SDK calls for `@google-cloud/vertexai`
   (or use the unified `@google/genai` SDK with `vertexai: true`).  The
   call sites are in `server.ts` (search for `GoogleGenerativeAI`).
6. Confirm with a single OCR test that the response shape is identical.
7. Once confirmed in prod, update `privacy-config.ts → HOSTING_REGIONS.googleCloud`
   back to "EU (europe-west) — regionally pinned" and bump the
   Gemini row's `transfer.mechanism` from `dpf` to `adequacy`.
8. Append a `region_changed` row to `SUBPROCESSOR_CHANGELOG` with the
   migration date.
9. `npm run gen:privacy-html` to regenerate the public page.

**COST:** Vertex AI Gemini is ~10–30% more expensive per token than
the equivalent AI Studio paid tier (free-tier is cheaper still but
disqualifies us on the no-training requirement).  Today's OCR volume
should remain well under USD 50/month at expected school scale.

**INTERIM:** Until the migration ships, the operator must keep billing
enabled in the GCP project so AI Studio runs under the Pay-As-You-Go
terms (no training) instead of the free-tier terms.  This is the
single most important interim control — verify quarterly.

**DONE LOOKS LIKE:** Vertex AI is live in production, the
`generativelanguage.googleapis.com` endpoint no longer appears in any
server log under `[ocr]`, `[translate]`, or `[bagrut]`, and the
SUBPROCESSORS.md transfer-register row honestly says "EU (europe-west)
— regionally pinned" again.

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

## ✅ DONE 2026-05-19 — `vocaband-audio` Worker deletion (no-op)

Earlier task notes referred to deleting a standalone `vocaband-audio`
Cloudflare Worker. Audited the account via MCP (`workers_list`,
2026-05-19): only one Worker exists — `vocaband`
(id `9df30ae2047d4c739c38850b8f7da1ba`, the SPA + `/api/*` proxy
configured in `wrangler.jsonc`). There is no `vocaband-audio` Worker
to delete; the note was stale.

⚠️ Do **not** run `npx wrangler delete --name vocaband` — that would
take down the production site. The R2 *bucket* named `vocaband-audio`
is separate and should stay (see §6).

---

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
lockout. Per-account lockout was deliberately rejected because students
behind a shared school NAT would lock each other out (see
`docs/auth-rate-limits.md` for the NAT-sharing constraint).

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

## ✅ DONE 2026-05-19 — §6 Audio CDN connected (`audio.vocaband.com` → R2)

Custom domain wired, deploy env var landed, mirror complete.  Verified
2026-05-19:

- `https://audio.vocaband.com/sound/1.mp3` → `HTTP/2 200` from Cloudflare
  (`content-type: audio/mpeg`, `cache-control: public, max-age=31536000,
  immutable`).
- `.github/workflows/cloudflare-deploy.yml:80` sets
  `VITE_CLOUDFLARE_URL: https://audio.vocaband.com` on the build step,
  so `src/utils/audioUrl.ts` now routes every word-audio fetch through
  the CDN.
- R2 bucket `vocaband-audio` holds the full 9.13k-object mirror of the
  Supabase `sound/` bucket (confirmed earlier via `r2_buckets_list`).

Rollback if anything breaks: unset `VITE_CLOUDFLARE_URL` in the workflow
and `audioUrl.ts:32` falls back to Supabase Storage automatically — no
data migration in reverse.

---

## ✅ DONE earlier — `claude/fix-points-display-9Q4Dw` merged to main

Branch no longer exists in remote (verified 2026-05-07 via `git branch -r`). All 2026-04-29/30 work (OCR final fix via in-page camera, PWA install banner, 3 new dashboard themes, teacher OTP login, full student i18n) shipped.
