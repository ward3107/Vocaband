# 13 — Infrastructure (Cloudflare Worker, Fly.io, Supabase, R2)

> Hosting + reverse proxy + storage + database. Cross-cuts every module.
>
> Key files: `worker/index.ts`, `fly.toml` (Fly.io config), `supabase/schema.sql`, `supabase/migrations/`, related docs in `docs/` (uptime, scaling, R2).

---

## 1. Purpose of Module

- **What:** The platform itself: Worker (edge, static + proxy), Fly.io (compute), Supabase (DB/auth/storage), R2 (large blobs).
- **Who:** Indirect — every user.
- **Why:** Downtime here is the most visible failure mode. School day windows are unforgiving (8am–3pm Israel).
- **Criticality:** **S1**.

---

## 2. Component map

```
DNS (Cloudflare):
  www.vocaband.com   → Worker (SPA + proxy)
  auth.vocaband.com  → Supabase custom domain
  api.vocaband.com   (if used) → Worker → Fly

Cloudflare Worker (worker/index.ts):
  - Serves SPA assets from Workers Assets / KV
  - Proxies /api/* → Fly Express
  - Proxies /socket.io/* → Fly socket.io (upgrade)
  - Caches static assets
  - Adds CSP/HSTS headers
  - WAF / bot filtering

Fly.io (server.ts):
  - Express + socket.io
  - Service-role queries to Supabase
  - Gemini calls
  - Region: ams or fra (EU)
  - Auto-scale: pending policy

Supabase (EU/Frankfurt):
  - Postgres 15
  - Auth (custom domain auth.vocaband.com)
  - RLS policies
  - Storage (audio, avatars)
  - Realtime (not used for live challenge; reserved)

Cloudflare R2:
  - Audio MP3s, custom audio
  - Image assets (if migrated)
```

---

## 3. Functional QA Scenarios

| ID              | Scenario                                                  | Steps                                                      | Expected                                                       | Severity | Priority |
|-----------------|-----------------------------------------------------------|------------------------------------------------------------|-----------------------------------------------------------------|----------|----------|
| INFRA-FUNC-001  | DNS resolves                                              | dig www.vocaband.com                                       | Cloudflare A/AAAA                                              | S1       | P0       |
| INFRA-FUNC-002  | TLS valid + chained                                       | curl https://www.vocaband.com -v                          | Cert valid, HSTS header                                         | S1       | P0       |
| INFRA-FUNC-003  | Worker serves SPA                                         | GET /                                                       | 200 HTML; assets cached                                         | S1       | P0       |
| INFRA-FUNC-004  | Worker proxies /api/                                      | GET /api/health                                            | 200 from Fly                                                    | S1       | P0       |
| INFRA-FUNC-005  | Worker proxies websocket                                   | wscat /socket.io                                           | Upgrade + handshake                                            | S1       | P0       |
| INFRA-FUNC-006  | SPA route fallback                                         | GET /random-route                                           | Worker serves index.html (SPA)                                  | S2       | P1       |
| INFRA-FUNC-007  | Static assets cached at edge                              | Second GET                                                  | Cache-Control honored                                          | S2       | P1       |
| INFRA-FUNC-008  | Supabase REST                                              | curl with anon key                                          | 200                                                             | S1       | P0       |
| INFRA-FUNC-009  | Auth custom domain                                         | OAuth flow                                                  | redirects to auth.vocaband.com                                  | S1       | P0       |
| INFRA-FUNC-010  | R2 public read                                             | GET R2 audio URL                                            | 200 with correct MIME + Cache-Control                          | S2       | P1       |

---

## 4. Edge Cases & Failure Injection

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| INFRA-EDGE-001 | Worker → Fly origin 502                                          | Worker returns 502 with helpful body; SPA shows degraded banner  |
| INFRA-EDGE-002 | Fly region outage                                                | Failover to nearest region (if multi-region); else degraded mode |
| INFRA-EDGE-003 | Cloudflare worker quota exceeded                                  | Switch to backup config; alert                                   |
| INFRA-EDGE-004 | Supabase rate limit (e.g. anon JWT issuance)                      | Backoff; user sees retry                                          |
| INFRA-EDGE-005 | Supabase Postgres connection pool exhausted                       | Increase pool or pgbouncer; queue                                 |
| INFRA-EDGE-006 | R2 region failure                                                 | Multi-region replication (planned per docs)                       |
| INFRA-EDGE-007 | DNS misconfiguration after migration                              | Pre-deployment validation step                                    |
| INFRA-EDGE-008 | Cert renewal failure                                              | Cloudflare auto-renews; monitor expiry                            |
| INFRA-EDGE-009 | KV / Worker Assets returns stale                                  | Purge on deploy; version tag in path                              |
| INFRA-EDGE-010 | Supabase Storage egress quota                                     | Move heavy traffic to R2 (planned)                                |

---

## 5. Security QA

| ID            | Attack                                                | Exploit                                                                     | Expected secure behavior                                       |
|---------------|-------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------|
| INFRA-SEC-001 | DDoS at the edge                                       | Botnet                                                                       | Cloudflare WAF + rate-limit + Anycast                         |
| INFRA-SEC-002 | Direct attack on Fly origin (bypassing Cloudflare)     | Discover origin IP                                                            | Origin firewall: allow only Cloudflare IPs                    |
| INFRA-SEC-003 | Subdomain takeover                                     | Dangling CNAMEs                                                              | DNS audit; remove orphans                                     |
| INFRA-SEC-004 | TLS downgrade                                          | Force HTTP                                                                   | HSTS preload                                                  |
| INFRA-SEC-005 | Misconfigured CORS                                     | Open *                                                                       | Origin allowlist                                              |
| INFRA-SEC-006 | Service-role key in env exposed                        | Misconfig                                                                   | Secrets in Fly Secrets only; rotate regularly                |
| INFRA-SEC-007 | Storage misconfig (public bucket)                     | List objects                                                                | All buckets default-private; signed URLs                      |
| INFRA-SEC-008 | Database SSL bypass                                    | Insecure conn string                                                          | sslmode=verify-full                                           |
| INFRA-SEC-009 | Cloudflare token scope too broad                      | Token leak                                                                   | Least-privilege                                               |

---

## 6/7. N/A (no direct UI)

---

## 8. Performance QA

| Metric                                | Target          | Critical    |
|--------------------------------------|-----------------|-------------|
| Worker p50 origin pull                | < 100ms         | > 500ms     |
| Worker cache hit ratio                 | > 80%           | < 50%       |
| Fly cold start                         | < 8s            | > 20s       |
| Supabase query p95 (typical RPC)       | < 300ms         | > 1s        |
| R2 GET p95                             | < 150ms         | > 500ms     |
| TLS handshake                          | < 200ms         | > 600ms     |

---

## 9. Data Integrity / Backup QA

| ID            | Check                                                                | Expected                                                          |
|---------------|----------------------------------------------------------------------|-------------------------------------------------------------------|
| INFRA-DATA-001 | Supabase daily backups                                              | Verified; retention ≥ 30 days                                     |
| INFRA-DATA-002 | PITR enabled                                                         | Yes (paid tier)                                                   |
| INFRA-DATA-003 | Backup restore drill (quarterly)                                     | Documented in `DISASTER-RECOVERY.md`                              |
| INFRA-DATA-004 | R2 bucket versioning                                                 | Yes for audio assets                                              |
| INFRA-DATA-005 | Migration safety (zero-downtime)                                     | All migrations reviewed via SOP                                   |
| INFRA-DATA-006 | Soft-delete patterns honored                                         | Yes                                                               |

---

## 10. Networking / Config QA

| ID            | Check                                                                | Expected                                                          |
|---------------|----------------------------------------------------------------------|-------------------------------------------------------------------|
| INFRA-NET-001 | Worker → Fly via private hostname or stable URL                      | Documented                                                        |
| INFRA-NET-002 | Cloudflare → origin via Authenticated Origin Pulls (mTLS)            | Recommended                                                       |
| INFRA-NET-003 | Fly Secrets used (not env files committed)                            | Yes                                                               |
| INFRA-NET-004 | Cloudflare WAF rules                                                  | Custom rules for `/api/*`                                         |
| INFRA-NET-005 | CSP / Permissions-Policy / Referrer-Policy headers                    | Set on Worker                                                     |

---

## 11. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| INFRA-OBS-001 | Uptime (`/api/health` external monitor)         | < 99.9%/month → alert  | Outage                              |
| INFRA-OBS-002 | TLS expiry                                       | < 30 days              | Renewal pending                     |
| INFRA-OBS-003 | DNS query failures                               | > 0.01%                | DNS issue                           |
| INFRA-OBS-004 | Worker error rate                                | > 0.5%                 | Bug or origin                       |
| INFRA-OBS-005 | Fly memory / CPU                                 | > 80%                  | Need scale                          |
| INFRA-OBS-006 | Supabase DB CPU                                  | > 70%                  | Need optimize / upgrade             |
| INFRA-OBS-007 | R2 4xx                                           | > 0.1%                 | Misconfig                           |
| INFRA-OBS-008 | Secret rotation overdue                          | > 90 days              | Compliance                          |

Recommended stack: Cloudflare Analytics + Fly metrics + Supabase logs + uptime via Better Stack / UptimeRobot.

---

## 12. QA Automation Strategy

| Layer       | Tool         | Coverage                                                       |
|-------------|--------------|----------------------------------------------------------------|
| Smoke       | curl / k6    | TLS, DNS, /api/health, /socket.io ping                         |
| Chaos       | manual + Cloudflare WAF testing | route a portion of traffic to chaos endpoints |
| Pen-test    | external     | Scheduled quarterly                                            |
| Backup drill | manual      | Quarterly restore                                              |

**P0**: external uptime monitor + alerting. **P1**: pen-test schedule. **P2**: chaos testing.

---

## 13. Production Readiness Score (Infrastructure)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Working                                                                                     |
| Security        | 3     | WAF + RLS + secrets in Fly; need formal pen-test (operator task)                            |
| Performance     | 4     | Edge cache solid                                                                            |
| Reliability     | 3     | Single Fly region; multi-region future work                                                  |
| Observability   | 2     | Uptime monitor exists; full SLO dashboard pending                                            |
| Data integrity  | 4     | Backups + PITR                                                                              |

**Module readiness: 3.3 / 5.**

---

## 14. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Monthly uptime                     | ≥ 99.9%    | 99.5–99.9% | < 99.5% |
| MTTR                                | < 30 min   | 30 min–2h | > 2h   |
| Backups age                        | < 25h      | 25–48h   | > 48h    |
| Cert renewal lead time             | > 30 days  | 14–30    | < 14d   |
| Secret rotation cadence            | ≤ 90 days  | 90–180   | > 180   |

---

## 15. Self-QA Validation

**Missed initially:**
1. **Origin protection (Authenticated Origin Pulls)** — INFRA-NET-002.
2. **Subdomain takeover audit** — INFRA-SEC-003.
3. **Backup restore drill cadence** — INFRA-DATA-003.
4. **WAF rules for /api/** — INFRA-NET-004.

**Dangerous assumptions:**
- "Cloudflare always shields the origin" — only if origin firewall is configured.
- "Supabase backups are sufficient" — need PITR + offsite copy.

**Hidden failures:**
- Cloudflare worker bundle size limits could one day cause deploy failures; track size in CI.
- Supabase region change in the future would require careful auth domain migration.
