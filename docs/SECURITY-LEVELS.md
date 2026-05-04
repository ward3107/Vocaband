# Vocaband — Security levels (defence in depth)

> Companion to `SECURITY-OVERVIEW.md`.  Where the overview is a status
> report ("what's done, what's pending"), this doc is a *map of the
> layers* — explained so a non-engineer can follow it.  Each section
> answers two questions: **what protects this layer**, and **what
> happens if an attacker gets past it**.
>
> Defence in depth means no single layer is the goalkeeper.  Even if
> one layer fails, the next one still stops the attack.

---

## The seven layers, stack view

```
                   ┌────────────────────────────────────┐
   Layer 1   →     │  Network edge (Cloudflare)         │   DDoS, bot filtering
                   ├────────────────────────────────────┤
   Layer 2   →     │  Transport (TLS 1.2/1.3 + HSTS)    │   wire-level encryption
                   ├────────────────────────────────────┤
   Layer 3   →     │  Browser policies (CSP, COOP, …)   │   limits what code can do
                   ├────────────────────────────────────┤
   Layer 4   →     │  Authentication (Supabase Auth)    │   "are you who you say?"
                   ├────────────────────────────────────┤
   Layer 5   →     │  Authorization (RLS + RPC checks)  │   "can THIS user do THIS?"
                   ├────────────────────────────────────┤
   Layer 6   →     │  App-level guards (rate limits,    │   format / size / sanity
                   │    input validation, error handler)│
                   ├────────────────────────────────────┤
   Layer 7   →     │  Operational (secrets, audits)     │   keys, rotation, logs
                   └────────────────────────────────────┘
```

A request to Vocaband flies down this stack.  An attacker has to defeat
every layer above the one they want to break.  We've also tried to
make every layer **fail safely** — if it gets bypassed, the next one
catches it.

---

## Layer 1 — Network edge (Cloudflare)

**What protects it:**
- Cloudflare's global anycast network sits in front of every request to
  `vocaband.com` and `auth.vocaband.com`.
- Built-in DDoS mitigation absorbs most opportunistic floods before
  they reach our origin.
- Bot Fight Mode + JS challenges filter scraper traffic.
- WAF managed rule sets (free tier) block well-known attack patterns
  (SQL injection signatures, common RFI/LFI probes).
- Cloudflare Workers (`worker/index.ts`) act as the routing layer:
  static assets served from their CDN, `/api/*` and `/socket.io/*`
  proxied to Fly.io.

**If an attacker gets past it:**
- Layer 6 rate-limits (per-IP and per-token) still cap the damage.
- Cloudflare logs every blocked request — visible in the dashboard if
  we ever need to attribute an attack.

**Confidence:** High for opportunistic attackers.  A determined
attacker with a real botnet would need additional Cloudflare paid-tier
features (Pro / Business plan WAF rules); we'd see it coming in the
analytics dashboard before they exhausted us.

---

## Layer 2 — Transport (TLS)

**What protects it:**
- TLS 1.2 + TLS 1.3 only.  TLS 1.0 / 1.1 disabled at Cloudflare (April
  2026 hardening).
- Every cipher offered provides Forward Secrecy.
- HSTS sent on every response: `max-age=31536000; includeSubDomains;
  preload`.  Submitted to the HSTS preload list — once shipped in
  Chrome/Firefox/Edge updates, browsers hard-code that vocaband.com is
  HTTPS-only.
- "Always Use HTTPS" + "Automatic HTTPS Rewrites" enabled — any
  accidental HTTP request is 301'd to HTTPS at the edge.
- SSL Labs grade: **A+** (verified 2026-04-28).

**If an attacker gets past it:**
- Network-level man-in-the-middle is the only realistic way past TLS,
  and that requires either a compromised CA (industry-wide concern,
  outside our threat model) or a malicious WiFi access point — which
  HSTS preload defeats by hard-coding the HTTPS requirement.
- Even if MITM succeeds, the JWT in `Authorization: Bearer` would need
  to be forged or stolen to do anything useful, which Layer 4 blocks.

**Confidence:** Very high.  This is the layer where the SSL Labs grade
is a public, third-party verification.

---

## Layer 3 — Browser policies (CSP + friends)

**What protects it:**
- Content-Security-Policy header (`public/_headers`):
  - `default-src 'self'` — same-origin only by default.
  - `connect-src` whitelist — only Supabase, Fly.io, Cloudflare
    Insights, Cloudflare Turnstile, and our own origins can be
    fetched.  Random third-party domains are blocked.
  - `frame-src` — only Google OAuth iframe + Cloudflare Turnstile.
  - `frame-ancestors 'none'` — page can't be embedded in someone
    else's iframe (clickjacking defence).
  - `object-src 'none'` — no Flash / legacy plugin loading.
- `unsafe-eval` disabled (April 2026 hardening).  An XSS that smuggles
  in a `<script>eval(...)</script>` cannot dynamically construct code.
- `unsafe-inline` for scripts and styles still allowed — load-bearing
  for Cloudflare Insights and motion/react inline styles.  Documented
  in `SECURITY-OVERVIEW.md`; future work is a nonce-based refactor.

**If an attacker gets past it:**
- React's auto-escaping is the line of defence below CSP — every
  rendered string runs through React's interpolation, which encodes
  HTML entities.  Direct DOM manipulation is rare and audited.
- Layer 4 + 5 catch any privileged action even if a script slips
  through, because every state-changing call goes through Supabase
  Auth + RLS.

**Confidence:** Medium-high.  The two `'unsafe-inline'` directives are
the gap; closing them (pending refactor) would push this to high.

---

## Layer 4 — Authentication (Supabase Auth)

**What protects it:**
- Supabase Auth is the identity provider.  Three flows:
  1. **Google OAuth** — for teachers; full PKCE flow.
  2. **Email + 6-digit OTP** — for teachers on shared computers (no
     persistent Google session).
  3. **Anonymous** — for Quick Play guests; lightweight signup that
     mints a temporary JWT.
- All tokens are JWTs signed by Supabase using the project's secret
  key.  Forging one requires the secret, which never leaves Supabase.
- Tokens are sent in `Authorization: Bearer <jwt>` headers — never
  cookies — so CSRF is a non-issue (no implicit credentials are sent
  cross-origin).
- The `verifyToken()` helper in `server.ts` validates every Bearer
  token by calling `supabaseAdmin.auth.getUser(token)`.  Fly.io
  endpoints that mutate state require a valid token.

**If an attacker gets past it:**
- A stolen token is bounded by the JWT's TTL (1 hour for sessions,
  refreshable up to 7 days).
- Layer 5 (RLS) still scopes every query to that user's UID, so a
  token for student A cannot read student B's progress.

**Confidence:** High.  The threat model assumes Supabase's signing
infrastructure is trustworthy; that's a reasonable assumption.

---

## Layer 5 — Authorization (RLS + RPC checks)

This is the **most important layer**.  Even if everything above leaks
or is bypassed, Layer 5 is what stops a teacher from reading another
teacher's class roster.

**What protects it:**
- **Row-Level Security on every table** — every `SELECT`, `INSERT`,
  `UPDATE`, `DELETE` runs through a policy.  The policy says, for
  example: "you can SELECT a class only if `auth.uid() = teacher_uid`."
  PostgreSQL enforces this at the storage layer, not the app — even a
  raw SQL injection that bypassed our query builder would still hit
  the policy.
- **RPCs (`SECURITY DEFINER` functions)** that need elevated privilege
  re-implement the auth check inside their function body, so the
  caller's role doesn't matter — the function checks `auth.uid()`
  directly.  Examples: `save_student_progress` (verifies the calling
  student owns the progress row), `award_reward` (verifies the
  calling teacher owns the class the student belongs to + clamps XP
  to ±1000).
- Service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is **server-only** —
  used by Fly.io for paths that intentionally bypass RLS (admin
  endpoints, cleanup crons, the new `/api/quick-play/session/:code`
  endpoint).  Never bundled into the browser.
- Every policy is documented in `docs/SECURITY.md` and verified by
  `scripts/security-pen-test.sh`.

**If an attacker gets past it:**
- There is no "below" Layer 5 — this is the last line of defence
  against unauthorized data access.  If RLS fails, an attacker can
  read whatever the policy was supposed to prevent.
- We compensate with an audit cadence (quarterly) and the pen-test
  script that catches policy drift.

**Confidence:** High.  This is the layer we audit the hardest:
- Three HIGH findings from the April 2026 audit (`save_progress` auth
  gate, `quick_play_joins` RLS, `award_reward` ownership) — fixed.
- Three MED findings (`teacher_profiles` enum, `quick_play_sessions`
  enum, `class_lookup_by_code` role check) — fixed.
- Pen-test script runs against the live DB — last green 2026-04-28.

---

## Layer 6 — App-level guards

**What protects it:**
- **Rate limits** on every public endpoint (`server.ts`):
  - Global: 200 req/min/IP.
  - OCR: 10/min/teacher.
  - Translate: 30/min/teacher.
  - AI sentence/word/lesson generation: 10/min/teacher.
  - TTS for custom words: 20/min/teacher.
  - Quick Play session lookup: 60/min/IP.
  - Express-rate-limit keys per token first, then per IP — so one
    misbehaving teacher can't burn the budget for everyone behind the
    same NAT.
- **Input validation** at the boundary:
  - `isValidClassCode`, `isValidName`, `isValidUid`, `isValidToken` —
    format gates in `src/server-utils`.
  - Class codes constrained to `[A-Z0-9]{4-8}` regex before any DB
    lookup (the new QP endpoint demonstrates this pattern).
- **Global Express error handler** returns generic 500 — no
  stack-trace leak.  Added April 2026 after audit.
- **Sanitisation of user-supplied URLs** (`sanitizeAvatarUrl` in
  `TopAppBar`) — only `http:` / `https:` allowed in `<img src>`,
  blocking `javascript:` / `data:` injection.

**If an attacker gets past it:**
- Layer 5 still scopes data access.
- Layer 1 still rate-limits at the edge.

**Confidence:** Medium-high.  This is the layer where new features
introduce the most risk; every new endpoint needs a rate limiter +
input validator added at the same time.

---

## Layer 7 — Operational

**What protects it:**
- **Secret hygiene:**
  - `.env.local` in `.gitignore`.
  - `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLOUD_API_KEY`,
    `ANTHROPIC_API_KEY` only on Fly.io (set via `fly secrets`),
    never in the repo.
  - `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in the client are
    public-by-design (Supabase calls the anon key the "publishable"
    key).  RLS is what protects data, not key secrecy.
  - Service-role key was rotated 2026-04-28 after a pen-test session.
- **Audit cadence:** quarterly re-run of dependency scan (`npm audit`),
  pen-test script, RLS verification SQL, SSL Labs scan.
- **Deployment integrity:**
  - Cloudflare Workers + Pages deployed from `main` only via GitHub
    integration.
  - Fly.io deployed via `fly deploy`; production secrets live in Fly's
    encrypted secret store.
- **Logging:**
  - Supabase: every auth event + query in the dashboard.
  - Fly.io: stdout streamed to `fly logs`.
  - Cloudflare Insights: client-side error beacon.

**If an attacker gets past it:**
- A compromised service-role key would be catastrophic; the mitigation
  is rotation cadence (semi-annual + after any suspected leak) and
  monitoring for unusual write rates in Supabase logs.

**Confidence:** Medium.  This is the layer most dependent on human
discipline — the technical controls are in place but they only work
if the human follows the playbook.  Documented in
`SECURITY-OVERVIEW.md` § "Operator action items".

---

## What we explicitly do NOT claim

Same as `SECURITY-OVERVIEW.md` — repeated here for completeness:

- **No third-party black-box pentest.**  The in-repo pen-test is
  targeted RLS coverage, not a comprehensive engagement.
- **Not certified compliant** with COPPA / GDPR / חוק הגנת הפרטיות.
  Technical controls are in place; certification requires a lawyer.
- **No load-test against a coordinated DDoS.**  Cloudflare absorbs
  opportunistic attacks; targeted-attack mitigation is paid-tier.
- **Threat model trusts Supabase + Fly.io + Cloudflare** as
  infrastructure.  Their own security posture is outside our control.

---

## Quick map: where each control lives in the repo

| Layer | Where to look |
|---|---|
| 1. Network edge | Cloudflare dashboard; `worker/index.ts` for routing |
| 2. Transport | Cloudflare SSL/TLS settings; `public/_headers` for HSTS |
| 3. Browser policies | `public/_headers` (CSP), `index.html` head meta |
| 4. Authentication | `src/core/supabase.ts`, `src/main.tsx` (PKCE), `server.ts:verifyToken` |
| 5. Authorization | `supabase/migrations/*.sql` (RLS), `docs/SECURITY.md` (policy reference) |
| 6. App-level guards | `server.ts` (rate limits, input validation), `src/server-utils.ts` |
| 7. Operational | `docs/operator-tasks.md`, Fly.io secrets, Supabase dashboard |

---

## How to spot regressions

1. **A new `select('*')` in client code that hits a new table** →
   verify Layer 5 has an RLS policy on that table.
2. **A new endpoint in `server.ts`** → it MUST have `verifyToken()` (or
   a rate limiter for public endpoints) and a `keyGenerator` that
   keys by token first.
3. **A new secret used in `src/`** → it CAN'T be a server-only
   secret.  Anything in `src/` ends up in the browser bundle.  Use
   `process.env.*` only in `server.ts` / `worker/index.ts`.
4. **Loosening a CSP directive** → the only acceptable reason is a
   new third-party library that needs a specific origin in
   `connect-src`.  Adding `'unsafe-inline'` or `'unsafe-eval'` is
   never acceptable without a written justification.
5. **An RLS policy with `USING (true)`** → the `USING (true)` makes
   the row visible to anyone who can SELECT.  This is almost always a
   mistake.  If you genuinely want a public table, use
   `USING (is_public = true)` or similar.

The pen-test script at `scripts/security-pen-test.sh` catches most of
the above when run.  Make running it part of every release checklist.
