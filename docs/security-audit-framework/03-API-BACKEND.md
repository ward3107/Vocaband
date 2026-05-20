# 03 — API Backend (Express on Fly.io)

> `server.ts` — ~3200 lines, ~25 REST endpoints, the AI & real-time edge
> of the system.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Helmet / security headers | HARDENED — Phase 6 CSP, full Permissions-Policy | Low | INFO | HIGH |
| Bearer-token auth on protected routes | HARDENED — central helper `requireAuthenticatedTeacher` (server.ts:1725) | Low | INFO | HIGH |
| Rate limiting | GOOD — per-token + per-IP; differentiated by endpoint cost | Medium-Low | LOW | HIGH |
| Input validation | MODERATE — manual checks; no zod/joi schema | Medium | MODERATE | HIGH |
| Body size limits | GOOD — `express.json({limit:'50kb'})` (server.ts:461) | Low | INFO | HIGH |
| Error handling | GOOD — Phase 3 global handler, no stack-trace leaks | Low | INFO | MEDIUM |
| Diagnostic endpoints | GOOD — auth-gated since Phase 3 | Low | LOW | HIGH |
| Service-role isolation | GOOD — server-only; one anon endpoint by design | Medium | MODERATE | HIGH |
| Logging hygiene (no PII) | GOOD — token previews truncated; no email logging | Low | LOW | MEDIUM |
| CORS allowlist | GOOD — `isOriginAllowed` helper (server.ts:447) | Low | LOW | HIGH |
| Open-redirect surface | NONE — no redirect endpoints | Low | INFO | HIGH |
| SSRF surface | LOW — only outbound calls are to Google/Anthropic/Supabase | Low | LOW | HIGH |

**Overall:** GOOD (80/100). Strong helmet/CSP, mature rate-limit strategy,
weakest link is the manual input validation pattern (zod would catch a
whole class of bugs at the boundary).

---

## 2. Attack surface mapping (endpoints)

| Path | Method | Auth | Rate limit | Cost | Notes |
|---|---|---|---|---|---|
| `/api/health` | GET | public | global 200/min | $0 | health probe (server.ts:1495) |
| `/api/health/audit-log` | GET | public | global | $0 | reveals only "pass/fail" of audit-trigger probe (server.ts:1510) |
| `/api/health/redis` | GET | public | global | $0 | reveals only redis adapter state (server.ts:1547) |
| `/api/translate` | POST | Bearer | 30/min/token | small Gemini | server.ts:1584 |
| `/api/ocr/status` | GET | Bearer (Phase 3) | global | $0 | server.ts:1793 |
| `/api/ocr/diagnostic` | GET | Bearer (Phase 3) | global | small Gemini probe | server.ts:1809 |
| `/api/ocr` | POST | Bearer + multer | 10/min/token | Gemini vision | server.ts:1840 |
| `/api/tts/custom-words` | POST | Bearer | 20/min/token | Google TTS | server.ts:2070 |
| `/api/features` | GET | Bearer (Phase 3) | edge-cached 60s | $0 | server.ts:2167 |
| `/api/version` | GET | Bearer (Phase 3) | edge-cached 60s | $0 | server.ts:2224 |
| `/api/quick-play/session/:code` | GET | **public** | 60/min/IP | $0 (service-role RLS-bypass) | server.ts:2262 |
| `/api/generate-sentences` | POST | Bearer (Pro) | ~10/min/token | Anthropic/Gemini | server.ts:2309 |
| `/api/ai-process-text` | POST | Bearer (Pro) | shared AI limiter | Gemini | server.ts:2409 |
| `/api/ai-generate-lesson` | POST | Bearer (Pro) | shared AI limiter | Gemini | server.ts:2578 |
| `/api/generate-bagrut` | POST | Bearer (Pro) | day + hour bucket | Gemini | server.ts:2850 |
| `/api/submit-bagrut` | POST | Bearer | per-student limiter | small | server.ts:3009 |
| `/api/student-bagrut/:id` | GET | Bearer | per-student limiter | small | server.ts:3096 |
| `/sw.js`, `/sitemap.xml`, `/.well-known/security.txt`, `/*splat` | GET | public | global | $0 | static (server.ts:3149+) |

**Hidden surface to verify.** None found in code grep; no `/debug`, no
`/admin`, no `/test` routes.

---

## 3. Offensive analysis

### A. Injection

**SQL injection.** All DB access is via the Supabase JS client →
PostgREST → parameterised queries. **Not vulnerable.**

**Command injection.** No `exec`/`spawn` of user-controlled strings.
**Not vulnerable.**

**Prompt injection.** Several endpoints concatenate user text directly
into Gemini/Claude prompts:
- `/api/translate`: word list (server.ts:1670s)
- `/api/ai-process-text`: `"""${trimmedText}"""` (server.ts:2440)
- `/api/ai-generate-lesson`: similar pattern
- `/api/generate-bagrut`: teacher-supplied criteria

The triple-quote delimiter is **trivial to escape** by an attacker
embedding `"""` followed by override instructions. See module 06 for
the full prompt-injection treatment and mitigation roadmap.

**SSRF.** Outbound calls are constants (`generativelanguage.googleapis.com`,
`api.anthropic.com`, `*.supabase.co`, `api.mymemory.translated.net`).
No user URL is fetched server-side. **Not vulnerable.**

**XSS reflected.** All error responses are `res.json(...)`. **Not
vulnerable** when client uses JSON; if a future endpoint sets
`Content-Type: text/html`, retest.

### B. API-tier abuse

**Mass assignment.** REST endpoints accept `req.body.{whitelist}` — the
audit examples (`/api/ai-process-text`) destructure named fields only:
`const { text, level, extractVocab, generateQuestions } = req.body`.
Safe. **Verify** every new endpoint follows the destructure-pattern; a
`const x = req.body` pass-through to Supabase is the classic mass-assign
bug.

**Excessive data exposure.** `/api/features?debug=1` was a Phase 3
finding — now gated. `/api/version` similarly Phase 3 gated. No
recurrence found.

**Rate-limit bypass.**
- Key generator is `Authorization: Bearer <token>` prefix
  (`server.ts:486`, `server.ts:499`). If `Authorization` header absent,
  falls back to `ipKeyGenerator`. **Bypass attempt:** rotate Bearer
  tokens. Mitigation: per-route check that `Authorization` is
  *present and valid* before rate-limit applies (it is, via
  `requireAuthenticatedTeacher` running *before* the limiter handler
  responds — but the limiter increments the bucket on connect, so a
  flood of bad tokens spikes load. Acceptable trade-off; Cloudflare
  WAF can absorb a flood).
- Global limiter at 200/min/IP — sized for classroom NAT. A
  determined attacker behind a residential ISP or VPN hops IPs.

**Replay attacks.** No replay-resistance on JSON bodies. The Bagrut
submission flow generates a one-time URL with a per-student token —
verify in module 07.

**Parameter pollution.** Express parses duplicate keys to arrays; we
did not find any handler that trusts an array where a string is
expected. **Spot-check** new endpoints for this.

### C. Diagnostic surface

`/api/ocr/diagnostic` (server.ts:1809) performs a live test call to
Gemini to verify the API key. It returns the *result* of that probe.
An attacker with a stolen teacher token can confirm the platform's AI
key is live, but cannot extract it. **Acceptable**; consider returning
just `ok|fail` rather than provider-side detail.

### D. CORS abuse

The `isOriginAllowed` helper (server.ts:447) uses a static allowlist +
preview-URL pattern. **Risk:** a preview URL pattern that's too loose
could allow `evil-vocaband.workers.dev`. **Action:** read the helper
and confirm the pattern is `^https://[a-z0-9-]+--vocaband\.pages\.dev$`
or similar tight. (Did not deep-read this helper; flagged for next
sprint.)

### E. Error handler leakage

Phase 3 added a global error handler that does not echo stack traces.
**Verify** the catch-block in every async handler — a missed
`next(err)` in an async middleware would surface the default Express
error page (which can leak the framework version). Grep:

```
grep -nE 'catch\s*\([^)]*\)\s*\{[^}]*console' server.ts
```
…shows ~40 hits, all logging-only; none echoes to response. **Safe.**

---

## 4. Blue-team controls

| Control | Status | Where |
|---|---|---|
| helmet CSP (Phase 6) | ✅ | server.ts:378-417 |
| Permissions-Policy | ✅ | server.ts:421-428 |
| HSTS preload-eligible | ✅ | server.ts:399-403 |
| `X-Permitted-Cross-Domain-Policies: none` | ✅ | server.ts:426 |
| Token-prefix log (10 chars + `…`) | ✅ | server.ts:502 |
| Global error handler (no stacks) | ✅ | per `docs/SECURITY-OVERVIEW.md` |
| Body limit 50kb | ✅ | server.ts:461 |
| Trust-proxy = 1 (real IPs behind CF) | ✅ | server.ts:355 |
| Add zod schema validation per endpoint | ❌ | Recommend `zod` + a small `validateBody(schema)` middleware |
| Add per-endpoint Sentry tag (`endpoint=/api/ocr`) | ❌ | Lets us slice abuse by endpoint |
| Add `Vary: Authorization` already at origin | ✅ at edge (worker/index.ts:241) | — |

---

## 5. Testing strategy

| Test | Auto? | Tool | Skill |
|---|---|---|---|
| All endpoints return 401 without Bearer | Auto | nuclei fuzz template | Junior |
| All endpoints return 415 on wrong Content-Type | Auto | nuclei | Junior |
| Rate limits hold at documented thresholds | Semi | k6, vegeta | Mid |
| Body-size limit enforced | Auto | curl -d $(head -c 100000 /dev/urandom) | Junior |
| Helmet CSP applied to every `/api/*` response | Auto | nuclei `cve-headers` | Junior |
| CORS allowlist denies arbitrary origin | Auto | curl -H 'Origin: https://evil.com' | Junior |
| Diagnostic endpoints reject anon | Auto | Postman + collection runner | Junior |
| Prompt-injection on every AI endpoint | Semi | LLM red-team scripts (Garak, PromptInject) | Mid |
| Async error-handler doesn't 500 | Auto | nuclei + Sentry rate alarm | Mid |

### Automation hooks

Add to `.github/workflows/ci.yml`:

```yaml
- name: nuclei API surface
  uses: projectdiscovery/nuclei-action@v3
  with:
    target: https://staging.vocaband.com
    templates: technologies,exposures,misconfiguration
```

---

## 6. Architecture review

- **Single security middleware order.** helmet → CORS → JSON body → per-
  route limiter → per-route auth → handler. Correct.
- **Two clients on purpose.** `supabaseAnon` for JWT-verifying user
  reads, `supabaseAdmin` for the few RLS-bypass paths. Naming is
  unambiguous; no risk of accidental mix.
- **No shared mutable state** in handlers — each request is independent
  (rate-limit buckets live in `express-rate-limit` memory, which is
  the only mutable state).

---

## 7. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| 5xx rate on `/api/*` | >0.5%/5min | P1 |
| Rate-limit reject rate on any single endpoint | >5%/5min | P2 |
| Unique tokens hitting `/api/ocr` in 1h | >2× weekly baseline | P2 |
| Multer file-type reject rate | >20% | P2 (probe?) |
| Outbound Gemini cost (USD) | >$50/day | P1 |
| `Authorization` header missing on `/api/*` >X% | spike investigate | P2 |

---

## 8. Incident response

- **Token leak suspected:** rotate `SUPABASE_JWT_SECRET` (revokes all
  tokens). Force teacher re-login.
- **AI key leak suspected:** rotate `GOOGLE_AI_API_KEY` /
  `ANTHROPIC_API_KEY` in Fly secrets. Restart worker. Investigate
  `audit_log` for unusual `/api/ai-*` activity in the past 30 days.
- **Endpoint abuse:** Cloudflare WAF rule blocking the abusing pattern;
  per-IP block list curated.

---

## 9. Edge cases

- **Empty Bearer header (`Authorization: Bearer `).** Treated as 401
  (substring check `.startsWith('Bearer ')`). Safe.
- **Unicode normalisation in `text` body.** Gemini handles UTF-8; no
  application-level normalisation needed.
- **Multi-byte character + 10000-char limit on `/api/ai-process-text`.**
  `text.length` is JS string length (UTF-16 code units). A worst-case
  10000 surrogate pairs = 20000 bytes; well under the 50kb body limit.
- **Cloudflare-stripped headers.** `req.ip` is correct only if CF→Fly
  preserves `X-Forwarded-For`; verify by spot-check in logs.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| API 5xx rate | <0.1% | 0.1-1% | >1% |
| Rate-limit reject rate (across all routes) | <0.5% | 0.5-5% | >5% |
| AI endpoint cost / day | <$10 | $10-50 | >$50 |
| Anon endpoint (`/api/quick-play/session/:code`) requests/min | <100 baseline | 100-500 | >500 |

---

## 11. Self-critique

- We did not exhaustively read every endpoint body. We trust the
  `requireAuthenticatedTeacher` discipline based on grep — but a
  reviewer should pair-walk every new endpoint and tick:
  `[ ] limiter [ ] auth helper [ ] body schema [ ] error caught`.
- We did not measure actual cost of the rate-limit memory store at
  scale; consider Redis-backed `rate-limit-redis` if you ever multi-
  region the API tier.
- The `isOriginAllowed` helper was inferred from usage — confirm pattern
  tightness directly.
