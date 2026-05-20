# 12 — API & Backend (Fly.io Express + Socket.io)

> REST endpoints under `/api/*` and the socket.io server, both hosted on Fly.io and reverse-proxied by the Cloudflare Worker. Uses Supabase service-role for privileged operations and Gemini for AI.
>
> Key files: `server.ts`, `worker/index.ts`.

---

## 1. Purpose of Module

- **What:** Server-only entry points (proxy to Supabase Auth admin paths, Gemini, custom RPCs that require service-role) + real-time channels.
- **Who:** Indirect — every authenticated client.
- **Why:** Some operations cannot be done client-side (rate limits, secret keys, prompt sandboxing). Live Challenge / Quick Play require server-coordinated sockets.
- **Criticality:** **S1**.

---

## 2. Endpoint inventory

| Endpoint                            | Method | Purpose                                                                 |
|-------------------------------------|--------|-------------------------------------------------------------------------|
| `/api/health`                       | GET    | Liveness check; returns 200 + version                                   |
| `/api/student/login`                | POST   | Issue student session via class-code (see `01-AUTH-MODULE`)             |
| `/api/teacher/profile`              | GET    | Server-side merged profile (cached, denormalized)                       |
| `/api/ocr`                          | POST   | Gemini Vision OCR (see `03-ASSIGNMENT-MODULE`)                          |
| `/api/generate-sentence`            | POST   | Gemini text generation for Sentence Builder                             |
| `/api/generate-audio`               | POST   | TTS for custom words                                                    |
| `/api/teacher/approve`              | POST   | Service-role: approve teacher account, change role                      |
| `/socket.io/*`                      | WS     | socket.io upgrade → Live Challenge + Quick Play sessions                |
| `/api/admin/*`                      | All    | Admin-only operations (service-role)                                    |

> Inventory derived from CLAUDE.md and module files — confirm against actual `server.ts` routes before automation kicks off.

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                  | Steps                                                              | Expected                                                       | Severity | Priority |
|---------------|-----------------------------------------------------------|--------------------------------------------------------------------|-----------------------------------------------------------------|----------|----------|
| API-FUNC-001  | Health check                                              | GET /api/health                                                    | 200 with version + uptime                                       | S2       | P0       |
| API-FUNC-002  | Worker proxies REST                                        | curl https://www.vocaband.com/api/health                          | 200 transparent                                                 | S2       | P0       |
| API-FUNC-003  | Worker proxies WebSocket upgrade                           | wscat to /socket.io                                                | Upgrade accepted; ping/pong                                     | S2       | P0       |
| API-FUNC-004  | CORS preflight                                            | OPTIONS                                                            | Returns allowed origins                                         | S2       | P1       |
| API-FUNC-005  | Auth required where needed                                 | curl /api/ocr without bearer                                       | 401                                                             | S1       | P0       |
| API-FUNC-006  | Rate limit kicks in                                        | Loop POST                                                          | 429 after threshold                                             | S2       | P1       |
| API-FUNC-007  | JSON body validation                                       | Send invalid JSON                                                  | 400 with details                                                | S3       | P1       |
| API-FUNC-008  | Content-type required                                       | Send without application/json                                      | 415                                                             | S3       | P2       |
| API-FUNC-009  | Idempotency header                                          | Send same key                                                       | Returns first response                                          | S3       | P2       |
| API-FUNC-010  | Graceful shutdown                                          | SIGTERM mid-request                                                | Drain; finish in-flight                                          | S2       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Network / transport

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| API-EDGE-001  | Cloudflare → Fly TLS error                                       | 502 with sane body; Worker retries once                           |
| API-EDGE-002  | Fly cold start (lazy boot)                                       | First request slow; subsequent normal                             |
| API-EDGE-003  | Slow client (Slowloris)                                          | Timeout + close                                                   |
| API-EDGE-004  | Large request bodies                                              | Reject > 5MB (or per-endpoint)                                    |
| API-EDGE-005  | Body chunked encoding edge case                                  | Handled                                                            |

### 4.2 Backend dep failures

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| API-EDGE-101  | Supabase REST 500                                                | Server retries 1x; surface 502                                    |
| API-EDGE-102  | Supabase auth admin 5xx                                          | Retry; fallback errors                                            |
| API-EDGE-103  | Gemini 429                                                        | Backoff; surface 503 with retry-after                             |
| API-EDGE-104  | R2 upload fails                                                  | Retry; alternative storage path                                  |
| API-EDGE-105  | DB connection pool exhausted                                     | Queue + warn; auto-scale                                          |

### 4.3 Process / runtime

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| API-EDGE-201  | Memory leak in long-running socket sessions                      | Process auto-restart on RSS threshold                            |
| API-EDGE-202  | Unhandled promise rejection                                       | Captured by global handler; restart only on critical             |
| API-EDGE-203  | Sticky session breakage on Fly machine roll                       | Redis-backed adapter OR machine pin                              |
| API-EDGE-204  | Container OOM                                                    | Fly restarts; load-balancer retries                               |

---

## 5. Security QA

| ID           | Attack                                            | Exploit                                                                     | Expected secure behavior                                       |
|--------------|---------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------|
| API-SEC-001  | Service-role key exposure                          | Inspect logs, env, response bodies                                          | Never in any client-reachable artifact                        |
| API-SEC-002  | SSRF via upload URL                               | Submit internal IP                                                          | Server validates URL allowlist; or only accepts file body     |
| API-SEC-003  | Prompt injection via OCR                          | Photo containing "ignore previous"                                          | Prompt fixed server-side; JSON schema enforced                |
| API-SEC-004  | Replay attack on idempotent endpoints              | Capture and resend                                                          | Nonce / idempotency key required                              |
| API-SEC-005  | CSRF on POST                                       | Cross-origin attempt with cookies                                          | CORS deny; bearer-only auth                                   |
| API-SEC-006  | JWT tampering                                      | Bad signature                                                                | Verified server-side via supabase-js / jose                   |
| API-SEC-007  | Authorization escalation                           | Student token to admin endpoint                                             | Role check on every privileged route                          |
| API-SEC-008  | Rate-limit bypass via X-Forwarded-For spoof        | Header trickery                                                              | Trust only Cloudflare CF-Connecting-IP                       |
| API-SEC-009  | DoS via Gemini cost                                | Spam OCR                                                                     | Per-teacher rate limit + cost cap                            |
| API-SEC-010  | Header injection / response splitting               | CRLF in input                                                                | Headers sanitized                                              |
| API-SEC-011  | Path traversal in file params                     | `../../etc/passwd`                                                          | Server normalizes; allowlisted paths                          |
| API-SEC-012  | SQL injection via RPC params                       | Crafted SQL fragments                                                       | All queries parameterized                                     |
| API-SEC-013  | Insecure HTTP methods                              | TRACE, OPTIONS with sensitive data                                          | Limited; CORS only                                            |
| API-SEC-014  | Session fixation                                   | Pre-issued                                                                   | Tokens issued fresh                                            |

---

## 6. Accessibility QA

API has no UI surface; N/A.

---

## 7. Responsive / Device QA

API tested through clients; coverage handled in client modules.

---

## 8. Performance QA

| Metric                                | Target          | Critical    |
|--------------------------------------|-----------------|-------------|
| /api/health p95                       | < 100ms         | > 500ms     |
| /api/student/login p95                | < 500ms         | > 1500ms    |
| /api/ocr p95                          | < 8s            | > 20s       |
| Socket connect p95                    | < 1s            | > 3s        |
| Event RTT p95                         | < 250ms         | > 1s        |
| Sustained 300 sockets memory          | < 1GB           | > 2GB       |
| Cold-start time on Fly                | < 8s            | > 20s       |

---

## 9. Database Integrity QA

Cross-cuts the others; see each module's DB section.

---

## 10. API Contract QA

Maintain an OpenAPI spec for all REST endpoints. CI step:

- generate types
- validate spec lint
- pact-style contract test between SPA client and server

| ID           | Check                                                                | Expected                                              |
|--------------|----------------------------------------------------------------------|-------------------------------------------------------|
| API-CONTRACT-001 | OpenAPI spec exists                                                | Yes                                                   |
| API-CONTRACT-002 | All endpoints typed end-to-end                                     | Yes                                                   |
| API-CONTRACT-003 | Versioning                                                          | URL path `/v1/`                                       |
| API-CONTRACT-004 | Errors follow `{ error, message?, retryAfter? }` shape              | Yes                                                   |

---

## 11. State / Idempotency QA

| ID              | Check                                                                | Expected                                                  |
|-----------------|----------------------------------------------------------------------|-----------------------------------------------------------|
| API-STATE-001   | Idempotency-Key header supported on critical POSTs                   | Yes                                                       |
| API-STATE-002   | Server-side dedupe within 1h window                                  | Yes                                                       |
| API-STATE-003   | Sticky sockets via Redis adapter or machine pin                      | Verified                                                  |
| API-STATE-004   | Token refresh handled by client + server cleanly                     | Yes                                                       |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| API-OBS-001  | 5xx rate                                         | > 1% → alert           | Backend issue                       |
| API-OBS-002  | 4xx rate                                         | > 10% → review         | Client misuse                       |
| API-OBS-003  | p95 latency per endpoint                         | > target → alert       | Perf regression                     |
| API-OBS-004  | Gemini cost / day                                | > $X → alert           | Abuse                              |
| API-OBS-005  | Socket count                                     | > 80% capacity → alert | Need scale                          |
| API-OBS-006  | Memory / CPU                                     | > 80% → alert          | Need scale                          |
| API-OBS-007  | DB connection pool                               | saturation → alert     | Pool exhaustion                     |
| API-OBS-008  | Service-role usage frequency                      | review trend            | Misuse                              |

Tracing: distributed traces (OpenTelemetry) from Worker → Fly → Supabase recommended.

---

## 13. QA Automation Strategy

| Layer        | Tool             | Coverage                                                       |
|--------------|------------------|----------------------------------------------------------------|
| Unit         | Vitest           | request validators, prompt builders                            |
| Integration  | Supertest        | every REST endpoint                                            |
| Contract     | Pact / OpenAPI   | client ↔ server shape                                          |
| E2E          | Playwright       | through SPA                                                    |
| Load         | k6               | 100 RPS sustained; 5000 sockets                                |
| Security     | OWASP ZAP / Burp | scripted scan                                                  |
| Chaos        | toxiproxy        | latency, packet loss                                            |

**P0**: smoke suite per endpoint; rate-limit tests; auth/ABAC tests.

---

## 14. Production Readiness Score (API)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 3     | Solid for pilot; needs explicit OpenAPI                                                     |
| Security        | 3     | RLS strong; service-role usage audit needed                                                 |
| Performance     | 3     | Single Fly region; load not yet at 5000 sockets                                              |
| Accessibility   | N/A   |                                                                                            |
| Reliability     | 2     | No multi-region failover                                                                    |
| Observability   | 2     | Limited metrics                                                                              |
| Data integrity  | 4     | RPC + idempotency                                                                           |

**Module readiness: 2.8 / 5.**

Blockers:
- OpenAPI spec
- Distributed tracing
- Multi-region or warm-standby plan
- Rate-limit centralization (now distributed across endpoints)

---

## 15. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| API uptime (per /api/health)        | ≥ 99.9%    | 99.5–99.9% | < 99.5% |
| 5xx rate                            | < 0.5%     | 0.5–2%   | > 2%     |
| p95 latency                         | < 800ms    | 800–2000 | > 2000ms |
| Socket session completion           | ≥ 95%      | 90–95%   | < 90%    |
| Service-role key exposures          | 0          | —        | any      |
| Prompt injection escapes            | 0          | —        | any      |

---

## 16. Self-QA Validation

**Missed initially:**
1. **Sticky session for socket.io** — API-STATE-003.
2. **CF-Connecting-IP usage** — API-SEC-008.
3. **OpenAPI generation step** — needed for client typing + automated tests.
4. **Distributed tracing** — added to observability.
5. **Gemini cost cap** — API-SEC-009.

**Dangerous assumptions:**
- "Worker preserves headers correctly" — verify CSP, HSTS, X-Frame-Options.
- "All endpoints check role" — must be enforced via middleware, not per-route.

**Hidden failures:**
- Memory leak in long-lived socket sessions only manifests after hours; need soak test.
- Misconfigured CORS letting one subdomain leak to another.
