# 01 — Authentication & Identity

> Trust boundary #1. Failure here cascades to every other module.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Identity providers | GOOD — Google OAuth + Supabase email OTP + anonymous (Quick Play) | Low | INFO | HIGH |
| Session storage (browser) | MODERATE — Supabase session in `localStorage` (PKCE intentional) | Medium | LOW | HIGH |
| Token verification (server) | HARDENED — admin-client `getUser(token)` on every Bearer path | Low | INFO | HIGH |
| Socket auth | GOOD — `io.use()` JWT gate on `/`; anon namespace separate | Low | LOW | HIGH |
| Role assignment | HARDENED — teacher allowlist + RLS INSERT-policy lock | Low | INFO | HIGH |
| Role escalation defence | HARDENED — RLS UPDATE policy denies self-promotion (migration 001 + 007) | Low | INFO | HIGH |
| Token rotation | MODERATE — Supabase default refresh; no application-side rotation hooks | Medium | LOW | MEDIUM |
| MFA | NOT APPLICABLE — Google OAuth carries Google MFA; email-OTP path has no second factor | Medium | MODERATE | HIGH |
| Anonymous-user lifecycle | GOOD — pg_cron cleanup at 30 days (migration `20260429_anon_user_cleanup_cron.sql`) | Low | LOW | HIGH |
| Account recovery | MODERATE — Supabase magic-link reuse, no in-app recovery code | Medium | LOW | MEDIUM |

**Overall:** GOOD (86/100). Defence-in-depth: identity is provider-issued,
allowlist-gated, and DB-enforced. MFA gap is the only meaningful weakness.

---

## 2. Attack surface mapping

| Entry point | Auth required | Exposure | Exploitability | Business impact |
|---|---|---|---|---|
| `auth.vocaband.com` (Supabase GoTrue) | n/a | Internet | Bounded by Supabase rate limits | Account takeover if abused |
| Google OAuth redirect → Supabase | n/a | Internet | Standard OIDC | Account takeover via redirect-uri misconfig (CHECK in Supabase dashboard) |
| Email magic-link / OTP | n/a | Internet | Throttled by Supabase | Phishing-relay |
| Class-code login (student) | Class code only | Internet | 4-char code (~1.6M) → brute-forceable | Roster exposure |
| Quick Play QR / code (anon) | none | Internet | 4-char code | Anon user fan-out + DB row growth |
| `/api/*` Bearer JWT | required (server.ts:`requireAuthenticatedTeacher`) | Internet | JWT-based | Per-route impact |
| Socket.io `/` namespace | JWT via `auth` payload (`server.ts:584-607`) | Internet | JWT-based | Live-challenge tampering |
| Socket.io `/quick-play` namespace | **none — UUID + code** (`server.ts:769-772`) | Internet | UUID guessing infeasible; per-session code is the only secret | Quick-play impersonation |
| `localStorage` token (browser) | XSS-stealable | Per-browser | Bounded by Vocaband CSP | Session hijack |

---

## 3. Offensive analysis (red team)

### A. Authentication attacks

**A1. Password / OTP brute force.**
Vocaband does not use passwords. The OTP path is Supabase-throttled (default
limits documented in `docs/auth-rate-limits.md`, verified 2026-05-16).
**Exploit difficulty:** HIGH — rate limit + IP-per-IP throttle.
**Mitigation today:** Supabase default GoTrue limits — verify in dashboard.
**Improvement:** alert on >5 OTP requests/email/15min to a SIEM channel.

**A2. OAuth state / PKCE replay.**
PKCE is enforced (`code_verifier` in `localStorage` — `src/main.tsx:215`).
The `state` parameter is owned by Supabase.
**Exploit difficulty:** HIGH.
**Risk** comes from a misconfigured redirect URI in the Supabase project —
we cannot verify from code; **operator action:** confirm redirect allowlist
in Supabase dashboard contains **only** `https://vocaband.com/...` and
preview origins.

**A3. Token theft via XSS.**
`localStorage` is XSS-readable. CSP Phase 6 removed inline script from the
SPA (`docs/SECURITY-OVERVIEW.md`). Residual risk: a stored-XSS via
teacher-supplied content (custom words, assignment titles) rendered without
escaping. We did not find any `dangerouslySetInnerHTML` outside
`WorksheetShareCard.tsx:150` (rendering a self-generated QR SVG — safe).
**Exploit difficulty:** MEDIUM if a non-React render path is ever added.
**Defence:** keep React's auto-escaping intact; lint for
`dangerouslySetInnerHTML`.

**A4. JWT tampering / `alg: none`.**
Server uses `supabaseAdmin.auth.getUser(token)` (server.ts:119-149) — this
hits Supabase, which verifies signature. **Not vulnerable.**

**A5. Refresh-token abuse.**
Supabase manages refresh internally; the SDK rotates on refresh and the old
refresh token is revoked server-side. **Not vulnerable** under default.

**A6. Session fixation.**
Anonymous Quick Play creates a fresh `auth.users` row on `signInAnonymously`.
A teacher session is bound to the OAuth/OTP-issued JWT. No code path mints a
token for a different user. **Not vulnerable.**

### B. Authorization-tier attacks (see also module 02)

**B1. Role self-promotion.**
RLS UPDATE policy denies role change unless `OLD.role = NEW.role` or actor
is admin (schema.sql:129-134). RLS INSERT policy locks new rows to `student`
unless `is_teacher_allowed(email)` (migration 007). **Hardened.**

**B2. Teacher impersonation via class code.**
A student knowing a teacher's class code cannot become teacher: socket
`JOIN_CHALLENGE` validates `userData.role` from `public.users`
(server.ts:653). **Hardened.**

**B3. Cross-class JWT replay.**
Each REST handler re-derives `uid` from the Bearer token; `class_code` is
authoritatively fetched server-side, not trusted from the payload.
**Hardened.**

### C. Class-code brute force (the real risk)

Class codes are short (default 6 chars — `008_update_class_code_length.sql`
extended them). At 6 alphanumeric chars, ~2.2B states — infeasible without
target-specific knowledge.

**Quick Play codes** are however **4 chars** (~1.6M states). Worst case: an
attacker brute-forces a live session, joins as a fake student, and pollutes
the leaderboard. Loss: reputation, not data — Quick Play stores no PII.
**Hardened, with caveat:** see module 05 for length increase recommendation.

### D. Anonymous-user abuse

`signInAnonymously()` mints `auth.users` rows with no rate limit beyond
GoTrue defaults. **Risk:** an attacker scripts 100k anonymous joins,
inflating cost and DB size. Cleanup at 30 days
(`20260429_anon_user_cleanup_cron.sql`) bounds the damage to a month of
growth. **Improvement:** add a Cloudflare WAF rule firing on
`/auth/v1/signup` rates per IP > 60/min.

---

## 4. Blue-team controls (existing + new)

| Control | Status | Where | Add? |
|---|---|---|---|
| Bearer header check before any teacher action | ✅ Live | `server.ts:1725-1748` (`requireAuthenticatedTeacher`) | — |
| Pro-tier check for AI endpoints | ✅ Live | `requireProTeacher` (around server.ts:2310) | — |
| Anonymous JWT explicitly rejected for paid endpoints | ✅ Live | server.ts:1605 | — |
| Socket connect-time JWT verify | ✅ Live | server.ts:584-607 | — |
| Class-code length ≥ 6 | ✅ Live | migration 008 | — |
| Anon-user 30-day cleanup | ✅ Live | migration `20260429_anon_user_cleanup_cron.sql` | — |
| Token-prefix logging (only first 10 chars + `…`) | ✅ Live | server.ts:502 | — |
| MFA at the IDP layer | partial — Google OAuth carries it | Supabase dashboard | Enforce TOTP for **admin** role accounts |
| Impossible-travel detection | ❌ Missing | n/a | Add Sentry tag for last-known country + alert on 2-country flip <1h |
| Account recovery codes | ❌ Missing | n/a | Generate 10-code packs on first teacher login, store hashed |
| Auth-event SIEM stream | ❌ Missing | n/a | Supabase logs → S3 → SIEM |

---

## 5. Testing strategy

| Test | Automation? | Tool | Skill |
|---|---|---|---|
| OTP rate-limit holds at 60/min | Semi-auto | `k6` or `vegeta` + Supabase staging | Junior |
| OAuth redirect-allowlist | Manual | Supabase dashboard | Junior |
| RLS denies cross-class role escalation | Auto | `scripts/security-pen-test.sh` | Junior |
| Socket connect with no JWT → reject | Auto | Playwright + `socket.io-client` | Mid |
| JWT tampering rejected | Auto | curl + custom JWT signer | Mid |
| Token leak in logs | Manual | Live log review | Mid |
| OAuth replay across origins | Manual | Burp + intercept | Senior |
| Account-recovery flow abuse | Manual | n/a (not yet built) | — |

### Continuous

- Add `Auth.smoke.spec.ts`: OAuth login → expect token persisted → refresh →
  expect new access token; logout → expect storage cleared. Add to
  `ci-e2e.yml`.
- Nuclei template for `/auth/v1/signup` open-redirect / IDOR.

---

## 6. Architecture review (Zero Trust)

- **Least privilege:** anonymous JWT cannot reach any paid AI endpoint —
  `requireProTeacher` (server.ts) and RLS `is_teacher()` both gate.
- **Deny by default:** server.ts treats absent Bearer as 401 in every
  `requireAuthenticatedTeacher` helper.
- **Trust boundary:** the only trust boundary that grants role is the
  `teacher_allowlist` table + `is_teacher_allowed()` SECURITY DEFINER
  (schema.sql:109-115). Compromise of that table = full teacher mint.
  **Mitigation:** RLS denies all client access to `teacher_allowlist`
  (schema.sql:87 + no policy). Only operator + service role can modify.
- **Session expiration:** Supabase default 1h access + 60-day refresh —
  consider tightening to 7-day refresh for teachers handling PII.

---

## 7. Monitoring + detection

| Signal | What to alert on | Channel | Tier |
|---|---|---|---|
| Failed JWT verify | >50/5min from one IP | Slack `#sec` | P1 |
| Anon-user creation rate | >100/min | Slack | P2 |
| `requireProTeacher` reject rate | sudden spike | Sentry | P2 |
| Same email + 2 distinct ASNs <1h | Possible MITM | Slack | P1 |
| `users.role` change | Always (admin only path) | Audit log + Slack | P0 |
| `teacher_allowlist` INSERT | Operator-only change | Audit log + Slack | P0 |

---

## 8. Incident response

- **Compromised teacher account:** rotate the Supabase JWT secret
  (revokes all tokens); force re-login via Worker-side cookie purge;
  audit `audit_log` for the past 30 days of activity by `actor_uid`;
  surface to affected students' parents per PPA-13.
- **Anon-user flood:** flip Cloudflare WAF rule blocking
  `/auth/v1/signup` to challenge mode; let cleanup job catch up.
- **Allowlist compromise:** every row added via the operator UI — diff
  against last snapshot in `audit_log`; suspend new teachers, force
  re-onboarding.

---

## 9. Edge cases

- Two devices, one teacher: legal, common pattern (classroom display +
  laptop). No per-device bind.
- Student device shared after class: previous student's localStorage
  carries the QP resume hint (`src/components/QuickPlayResumeBanner.tsx`).
  Has no PII but does reveal the prior session — acceptable.
- OAuth popup blocked by browser: fallback to redirect mode is wired
  via `crossOriginOpenerPolicy: same-origin-allow-popups`
  (server.ts:406). Good.
- JWT expiry mid-game: socket layer accepts the connection, then a later
  RLS-bound operation fails; client must transparently refresh and
  re-emit. **Verify** by killing `auth.users` refresh and observing UX
  — currently untested.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Failed auth events / hour | <10 | 10-50 | >50 |
| Anon-user signups / day | <5k | 5-20k | >20k |
| Token verifications failing on `/api/*` | <1% | 1-5% | >5% |
| Successful OAuth signs / day (school days) | 100-2000 | <100 ↘ regression | sudden 10× = abuse |
| MTTR after detected token theft | <1h | <4h | >4h |

---

## 11. Self-critique (module-level)

- We did not test the actual Supabase rate-limit values — they may have
  been changed in the dashboard since `auth-rate-limits.md` was written.
- We did not verify the OAuth redirect-allowlist in the dashboard;
  attacker-controlled redirect URIs would bypass everything above.
- The class-code login UX flow (student joining a class) was not deeply
  modelled here — module 02 covers the row-level effects, but the
  client-side form may have its own quirks.

