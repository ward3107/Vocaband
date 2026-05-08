# Vocaband — Security Overview

> The single landing page for Vocaband's security posture.  Aggregates
> all audits, fixes, and pending operator actions.  Updated 2026-05-08
> (Phase 6 — full unsafe-* CSP removal).

## What this doc is for

- A school IT / district administrator can read this once and know
  what we do.
- A privacy lawyer can use it as the technical input for a
  GDPR / COPPA / חוק הגנת הפרטיות gap analysis.
- The next engineer can resume the security workstream without
  re-doing the audits.

For deep technical detail, jump to the linked per-area docs.

---

## TL;DR — current security posture

| Area | Status | Owner |
|---|---|---|
| Row-level security on every table | ✅ Enforced | Code |
| Authentication (Google OAuth + anonymous Quick Play) | ✅ Wired | Code |
| Three HIGH audit findings (2026-04-28) | ✅ Fixed in code, applied to live DB | Code + Operator |
| All three MED findings — `teacher_profiles` enum, `quick_play_sessions` enum, class-RPC role check | ✅ Fixed in code (operator pastes migrations) | Code + Operator |
| CSP `unsafe-eval` | ✅ **Removed 2026-05-08** | Audit of the production bundle confirmed zero `eval()` / `new Function()` calls. The earlier "Vite codegen needed it" theory was stale. |
| CSP `unsafe-inline` (script-src) | ✅ **Removed 2026-05-08** | Inline boot-debug script extracted to `/boot-debug.js`. Cloudflare Insights uses an external `<script src=…>` to `static.cloudflareinsights.com` (host-allowlisted). |
| CSP `unsafe-inline` (style-src-elem) | ✅ **Removed 2026-05-08** | Inline boot-loader / noscript styles moved to `/boot.css`. Only external `<link rel="stylesheet">` is allowed for `<style>`/stylesheet elements. |
| CSP `unsafe-inline` (style-src-attr) | ⚠️ Kept, narrow + documented | motion/react writes `transform`/`opacity` to the element's `style` attribute on every animated frame. CSS-only — cannot escalate to JS execution. To drop this we'd have to replace motion/react with keyframe CSS classes (week+ refactor; visual fidelity risk). |
| Secret hygiene (no committed secrets, .gitignore correct) | ✅ Verified | Code |
| Express global error handler (no stack-trace leaks) | ✅ Added | Code |
| `/api/features?debug=1` info leak | ✅ Sanitised | Code |
| TLS / transport — SSL Labs grade | ✅ **A+** (was B) — TLS 1.0/1.1 disabled, HSTS preload submitted | Operator (Cloudflare) |
| Live pen-test against staging | ⏳ Optional (DIY with OWASP ZAP) | Operator |
| Compliance certification | ⏳ Needs lawyer | Operator |
| Diagnostic info-leak endpoints (`/api/version`, `/api/ocr/status`, `/api/ocr/diagnostic`) | ✅ Auth-gated 2026-05-08 | Code |
| `/api/submit-bagrut` per-user rate limit + answer-key shape validation | ✅ Added 2026-05-08 | Code |
| Cross-origin headers (`COOP`, `X-Permitted-Cross-Domain-Policies`) | ✅ Added 2026-05-08 | Code |
| CSP `script-src` cleanup (drop unused `cdn.jsdelivr.net`) | ✅ Done 2026-05-08 | Code |
| CSP `unsafe-eval` + `unsafe-inline` removal (Phase 6) | ✅ Done 2026-05-08 | Code |

---

## What we audited and when

### Phase 1 + 2 — dependency scan, OWASP Top 10, RLS audit

`docs/security-audit-2026-04-28.md` — full report.

Findings:
- 3 HIGH: progress-write auth gate, `quick_play_joins` RLS, `award_reward`
  missing class-ownership + XP bounds.
- 3 MED: `teacher_profiles` enumeration, `quick_play_sessions` enumeration,
  `class_lookup_by_code` role-check fragility.
- Various LOW (filed, not fixed).

### Phase 3 — CSP + secret hygiene + error-message review

`docs/security-phase3-2026-04-28.md` — full report.

Findings:
- CSP allowed `unsafe-eval` (HIGH for XSS escalation) — fixed.
- `/api/features?debug=1` reflected caller email + SQL hint — fixed.
- No global Express error handler — fixed.
- `unsafe-inline` (script + style) — load-bearing (Cloudflare Insights
  beacon, motion/react inline animation styles); kept and documented.

### DB cost / efficiency audit (security-adjacent)

`docs/db-cost-audit-2026-04-28.md` — runs alongside the security audits
since rate-limit and token-budget exhaustion are availability concerns.

Findings:
- `RewardInboxCard` called `supabase.auth.getUser()` per mount (~9k
  wasted Auth API calls/month) — fixed.
- 2 LOW (narrow `select('*')`, dedupe class lookup) — deferred.

### Phase 4 — TLS / transport hardening (Cloudflare)

Configured 2026-04-28 via Cloudflare Dashboard → SSL/TLS → Edge
Certificates.  No code changes; pure infrastructure.

| Setting | Before | After |
|---|---|---|
| Minimum TLS Version | TLS 1.0 | **TLS 1.2** |
| TLS 1.3 | On | On (confirmed) |
| Always Use HTTPS | Off | **On** |
| Automatic HTTPS Rewrites | Off | **On** |
| HSTS | Sent (`max-age=31536000; includeSubDomains; preload`) | Same + submitted to https://hstspreload.org/ |

**Result:** SSL Labs grade went from **B → A+** in one session.

What "B" cost us:
- Vulnerable to TLS 1.0 / 1.1 downgrade attacks (POODLE family).
- Weak CBC + plain-RSA cipher suites available to old clients.
- Not on the HSTS preload list — first-time visitor's initial request
  still made over HTTP for ~1 round trip before the HSTS header was
  received and cached.

What "A+" gives us:
- Only TLS 1.2 + 1.3.  Every cipher offers Forward Secrecy.
- BEAST attack: server-side mitigated.
- Forward Secrecy: ROBUST.
- HSTS preload pending — once Chrome/Firefox/Edge ship the updated
  list (6-12 weeks), browsers will hard-code that vocaband.com is
  HTTPS-only, eliminating the first-visit window entirely.

Verification URL (re-run quarterly):
https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com

### Phase 5 — defence-in-depth pass (2026-05-08)

Code-level hardening on top of the April-28 baseline. Reviewed every
`/api/*` route for unauthenticated info disclosure; tightened the
Cloudflare Pages `_headers`; added per-user rate limiting on the
Vocabagrut student submit/lookup paths.

| Change | What it closes |
|---|---|
| `/api/version` now requires authenticated teacher/admin + `allowedOrigin` value dropped from response | Recon-time leak of CORS allow-list and branch metadata to anonymous callers. |
| `/api/ocr/status` requires teacher/admin; key prefix + length removed from response | Was leaking 6-char prefix + suffix + length of `GOOGLE_AI_API_KEY` to anyone — partial credential disclosure. |
| `/api/ocr/diagnostic` requires teacher/admin; `keyLength` removed from response | Same class as above; also stops anonymous callers from spending Gemini quota probing the key. |
| `/api/submit-bagrut` + `/api/student-bagrut/:id` get a per-token rate limit (60/min) | Caps abuse / scripted retry storms targeting the bagrut grader. |
| `/api/submit-bagrut` answer-key format check (`/^[A-Za-z0-9_-]{1,32}$/`, max 200 keys, ≤5KB per value) | Stops a hostile client from upserting megabytes of arbitrary keys into `bagrut_responses.answers` JSONB. |
| `public/_headers` drops unused `https://cdn.jsdelivr.net` from `script-src`/`script-src-elem` | Removes an unused third-party CDN from the script allowlist — one fewer host an XSS payload can pivot to. |
| `public/_headers` adds `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Cross-Origin-Resource-Policy: same-site`, `X-Permitted-Cross-Domain-Policies: none` | Reduces cross-window/process-state leakage; blocks legacy Adobe cross-domain policies. COOP keeps Google OAuth popup working. |
| `public/_headers` Permissions-Policy expanded (`usb`, `magnetometer`, `gyroscope`, `accelerometer`, `interest-cohort` all `()`) | Denies surface area we never use — defence in depth if a bundled lib ever tries to access these. |
| Express helmet adds `frameAncestors`, `objectSrc`, `baseUri`, `formAction` directives + COOP `same-origin-allow-popups` + Permissions-Policy middleware | Brings Express CSP in line with Cloudflare Pages headers; emits the same hardening when SPA is served from Express. |
| `scripts/security-pen-test.sh` extended with checks 10–15 (auth gates + headers) | Locks the new gates against future regression. Run quarterly with `APP_URL=https://www.vocaband.com`. |

Run-after-deploy:

```bash
APP_URL="https://www.vocaband.com" \
SUPABASE_URL="https://auth.vocaband.com" \
ANON_KEY="sb_publishable_..." \
./scripts/security-pen-test.sh
```

Expected: **15 passed, 0 failed** (9 RLS + 6 app-server) before Phase 6;
**18 passed, 0 failed** after Phase 6 (adds 3 CSP hardening checks).

### Phase 6 — full unsafe-* CSP removal (2026-05-08)

The April-28 work left `unsafe-inline` (script + style) and `unsafe-eval`
in the page CSP because of three perceived dependencies:
Cloudflare Insights inline beacon, motion/react inline animation styles,
and a bundled dep that supposedly needed `eval`. Phase 6 disproved each
one and dropped them.

| Change | What it closes |
|---|---|
| `unsafe-eval` removed from `script-src` (page) and helmet (Express) | Re-audit of `dist/assets/*.js` confirms no `eval()` / `new Function()` calls in the production bundle. Removing closes the entire dynamic-code-execution XSS escalation class. |
| `unsafe-inline` removed from `script-src` / `script-src-elem` | The page's only inline `<script>` (boot-debug error overlay) extracted to `public/boot-debug.js` (loaded via `<script src=…>` from `'self'`). Cloudflare Insights auto-injects an external `<script src="https://static.cloudflareinsights.com/beacon.min.js…">` — host-allowlisted, no inline. JSON-LD `<script type="application/ld+json">` is structured data, CSP doesn't apply. |
| `unsafe-inline` removed from `style-src-elem` | Inline `style="…"` attributes in the boot loader and noscript fallback moved to `public/boot.css` (loaded via `<link rel="stylesheet">` from `'self'`). |
| `style-src-attr 'unsafe-inline'` retained, narrowly | motion/react sets `transform` / `opacity` on the element's `style` attribute every animated frame. Cannot escalate to JS; CSS-only attack surface. Replacing this requires a week+ refactor to keyframe CSS classes; tracked as a future hardening item. |
| `scripts/security-pen-test.sh` adds checks 16–18 (CSP hardening) | Locks the new CSP against future regression — fails CI if `'unsafe-inline'` or `'unsafe-eval'` reappear in `script-src`, or `'unsafe-inline'` reappears in `style-src-elem`. |

Files changed:
- `public/_headers` — CSP header rewritten
- `server.ts` — helmet `contentSecurityPolicy.directives` updated
- `index.html` — inline `<script>` and `style="…"` attrs replaced with external file references
- `public/boot-debug.js` (new) — pre-React error overlay logic
- `public/boot.css` (new) — pre-React loader + noscript styles
- `scripts/security-pen-test.sh` — checks 16–18 added

### Already-existing baseline docs

- `docs/SECURITY.md` — RLS policy reference (every table, every policy).
- `docs/PRIVACY_CHECKLIST.md` — data-handling checklist for parents/IT.

---

## Migrations applied 2026-04-28

All four are committed to the repo at `supabase/migrations/`.  All four
have been pasted into the live Supabase Dashboard SQL Editor and
verified.

| File | What it fixes |
|---|---|
| `20260428130000_security_high_save_progress_auth.sql` | Auth gate + per-student scope check on `save_student_progress` + batch wrapper. |
| `20260428131000_security_high_quick_play_joins.sql` | Replaces `USING(true)` SELECT/INSERT with teacher-of-session SELECT, active-session INSERT. |
| `20260428132000_security_high_award_reward.sql` | Adds class-ownership check + XP bounds [-1000, 1000] to teacher reward grants. |
| `20260428133000_security_med_teacher_profiles.sql` | Narrows `teacher_profiles` SELECT from `USING(true)` to email-match-against-JWT. |
| `20260428134000_security_high_revoke_anon_after_recreate.sql` | Followup: re-REVOKEs `anon` after `DROP+CREATE` reset the privilege table on `save_student_progress` (+batch). |
| `20260428141000_security_med_quick_play_sessions.sql` | Narrows `quick_play_sessions` SELECT from `TO anon, authenticated` to `TO authenticated` only — closes the unauth-enumeration seam. |
| `20260428142000_security_med_class_rpc_admin.sql` | Adds explicit `OR public.is_admin()` to `get_class_activity` + `get_class_mastery` so admins can support teachers without role-impersonation. |

### Verification queries

Paste into Supabase SQL Editor — should return all-green:

```sql
WITH
m1 AS (
  SELECT '1. save_progress' AS check_name,
    has_function_privilege('anon', 'public.save_student_progress(text, text, uuid, text, integer, text, integer[], text, jsonb)', 'EXECUTE')::text AS detail_a,
    (position('Authentication required' in pg_get_functiondef(oid)) > 0)::text AS detail_b
  FROM pg_proc WHERE proname = 'save_student_progress' AND pronargs = 9 LIMIT 1
),
m2 AS (
  SELECT '2. qp_joins policies' AS check_name,
    string_agg(policyname, ', ' ORDER BY policyname) AS detail_a,
    string_agg(cmd, ', ' ORDER BY policyname) AS detail_b
  FROM pg_policies WHERE tablename = 'quick_play_joins'
),
m3 AS (
  SELECT '3. award_reward' AS check_name,
    (position('Not authorized to reward this student' in pg_get_functiondef(oid)) > 0)::text AS detail_a,
    (position('XP value % out of range' in pg_get_functiondef(oid)) > 0)::text AS detail_b
  FROM pg_proc WHERE proname = 'award_reward' LIMIT 1
),
m4 AS (
  SELECT '4. teacher_profiles' AS check_name,
    string_agg(policyname, ', ' ORDER BY policyname) AS detail_a,
    string_agg(cmd, ', ' ORDER BY policyname) AS detail_b
  FROM pg_policies WHERE tablename = 'teacher_profiles' AND cmd = 'SELECT'
)
SELECT * FROM m1
UNION ALL SELECT * FROM m2
UNION ALL SELECT * FROM m3
UNION ALL SELECT * FROM m4;
```

Expected (all 4 rows green after the followup migration is applied):

| check_name | detail_a | detail_b |
|---|---|---|
| 1. save_progress | `false` (anon CANNOT call) | `true` (auth gate present) |
| 2. qp_joins policies | `qp_joins_insert, qp_joins_select` | `INSERT, SELECT` |
| 3. award_reward | `true` (class check) | `true` (XP bounds) |
| 4. teacher_profiles | `teacher_profiles_select` | `SELECT` |

### Live REST pen-test

`scripts/security-pen-test.sh` — run with the publishable key:

```bash
SUPABASE_URL="https://auth.vocaband.com" \
ANON_KEY="sb_publishable_..." \
./scripts/security-pen-test.sh
```

Windows operators can run the PowerShell port instead — same checks,
native to PowerShell 5.1+:

```powershell
$env:SUPABASE_URL = "https://auth.vocaband.com"
$env:ANON_KEY     = "sb_publishable_..."
$env:APP_URL      = "https://www.vocaband.com"   # optional
./scripts/security-pen-test.ps1
```

Expected:

```
Results: 4 passed, 0 failed.
```

Last verified passing 2026-04-28.

---

## Operator action items

These are the things only a human can do.

### Done (2026-04-28)

- ✅ Pasted 4 security migrations (130000, 131000, 132000, 133000) into Supabase SQL Editor.
- ✅ Ran the verification SQL — all four checks green (after followup applied).
- ✅ Ran `scripts/security-pen-test.sh` — 4 passed, 0 failed.
- ✅ Cloudflare TLS hardening: min TLS 1.2, Always Use HTTPS, Automatic HTTPS Rewrites all enabled.
- ✅ Submitted vocaband.com to https://hstspreload.org/ — pending inclusion.
- ✅ SSL Labs re-scan: grade jumped from B → **A+**.

### Pending

| Action | Why |
|---|---|
| **Apply migration `20260428134000`** in Supabase SQL Editor | Re-REVOKE anon after DROP+CREATE reset.  Defence-in-depth — auth check inside function body still works, but role-level grant should also reject. |
| **Rotate the `sb_secret_*` service-role key** | Was pasted into a chat message during pen-test verification on 2026-04-28.  Rotate via Supabase Dashboard → Settings → API → "Rotate".  Then `fly secrets set SUPABASE_SERVICE_ROLE_KEY="<new-key>" -a vocaband`. |
| **Run the verification SQL after rotation + followup** | Confirm `1. save_progress` shows `detail_a: false`. |

### Optional / next-quarter

| Action | Why |
|---|---|
| **Live pen-test with OWASP ZAP** against a staging Supabase project | End-to-end black-box validation.  Requires writing your own consent + a staging clone. |
| **Apply MED #5 + #6 fixes** (`quick_play_sessions` enumeration, class-RPC role check) | Lower-impact than the HIGH fixes but worth closing.  Plans in `docs/security-audit-2026-04-28.md`. |
| **Replace motion/react inline-style runtime** with keyframe CSS classes | Last remaining CSP gap is `style-src-attr 'unsafe-inline'`, kept because motion/react writes transform/opacity to the element's `style` attribute on every animated frame. Closing it would require replacing motion/react's runtime style-setting with predefined CSS classes — week+ refactor with visual-fidelity risk on every animation. CSS-only attack surface (no JS escalation), so the residual risk is narrow. |
| **Privacy lawyer review** for compliance certification | GDPR (EU students), COPPA (US students if any), חוק הגנת הפרטיות (Israeli MoE).  Code controls are in place; lawyer needs to certify. |

---

## What we DON'T claim

To be honest with school IT / parents / lawyers, here's what we are
NOT claiming:

- **We have not run a black-box penetration test against production.**
  The pen-test script in this repo runs targeted RLS checks against
  the live DB, but that's not the same as a comprehensive 3rd-party
  pentest.
- **We are not certified compliant with COPPA / GDPR / חוק הגנת
  הפרטיות.**  The technical controls are in place; certification
  requires a lawyer.
- **We have not load-tested for a determined DDoS attacker.**
  Cloudflare absorbs most opportunistic attacks; a coordinated
  attack would need additional mitigation.
- **Our threat model assumes the Supabase infrastructure itself
  is trustworthy.**  We rely on Supabase for DB encryption-at-rest,
  TLS, and physical security of the Frankfurt region.

---

## Threat model summary

| Threat | Status |
|---|---|
| Student forging another student's score | ❌ Blocked — `save_student_progress` auth + per-student scope check |
| Student enumerating teachers via `teacher_profiles` | ❌ Blocked — RLS narrowed to email-match-against-JWT |
| Anon caller writing to `quick_play_joins` for an arbitrary session | ❌ Blocked — RLS requires authenticated + active-session |
| Cross-teacher reward grant (teacher A rewards teacher B's student) | ❌ Blocked — `award_reward` class-ownership check |
| Teacher overflowing student XP via `award_reward` | ❌ Blocked — `award_reward` XP bounds [-1000, 1000] |
| XSS via inline-script injection | ❌ Blocked — `unsafe-inline` and `unsafe-eval` removed from `script-src` (Phase 6, 2026-05-08). Inline `<script>` blocks no longer execute. Only allowlisted external scripts run (`'self'` + Cloudflare Insights + Cloudflare Challenges). |
| XSS via injected `<style>` block | ❌ Blocked — `unsafe-inline` removed from `style-src-elem`. Only external stylesheets from `'self'` + Google Fonts CSS allowed. |
| CSS exfiltration via injected `style="…"` attribute | ⚠️ Mitigated — `style-src-attr 'unsafe-inline'` retained for motion/react. CSS-only — cannot execute JS. `connect-src` allowlist constrains where exfiltrated data could go. |
| CSRF on state-changing endpoints | ✅ N/A — Supabase JWTs in `Authorization: Bearer` header (not cookies); no implicit credentials sent cross-origin. |
| Stack-trace leak via uncaught server exception | ❌ Blocked — global Express error handler returns generic 500. |
| TLS downgrade attack (POODLE family / weak cipher) | ❌ Blocked — TLS 1.0/1.1 disabled at Cloudflare; only TLS 1.2 + 1.3 with Forward Secrecy. SSL Labs A+. |
| First-visit MITM before HSTS header arrives | ⚠️ Mitigated — `Always Use HTTPS` redirects + HSTS preload submitted; will be fully closed once preload list ships (~6-12 weeks). |
| Dependency vulnerability (npm audit) | ✅ Clean as of 2026-04-28; re-run quarterly. |
| Secret leak via committed code | ✅ None — `.gitignore` correct, audited. |
| Session hijack via service-role key in browser | ✅ N/A — service-role key is server-only, never in `src/`. |

---

## Re-audit cadence

Recommendation: re-run the full audit suite **quarterly**.  At each
checkpoint:

1. `npm audit` — re-check for new dependency vulns.
2. Re-run the verification SQL above — confirm policies didn't drift.
3. Re-run `scripts/security-pen-test.sh` — confirm REST gates still
   reject anon.
4. Diff `git log` against the previous audit date and check for any
   new SECURITY DEFINER RPCs / new tables that need RLS / new
   `process.env.*` reads in client code.
5. Re-scan SSL Labs at https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com
   — confirm grade is still A+ (Cloudflare SSL settings haven't drifted,
   certificate hasn't expired).
6. Confirm vocaband.com appears in the HSTS preload list at
   https://hstspreload.org/?domain=vocaband.com — once the initial
   submission ships, the row should say "Status: Preloaded".

If any of these fail, file a HIGH and patch ASAP.
