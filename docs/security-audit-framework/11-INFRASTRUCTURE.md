# 11 — Infrastructure (Fly.io, Cloudflare, Supabase, R2)

> Multi-provider posture. Most controls live in each provider's dashboard;
> we audit our usage.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Fly.io machine config (HTTPS, internal_port) | GOOD — `force_https`, internal_port 3002 (fly.toml:50-51) | Low | INFO | HIGH |
| Fly secrets isolation | GOOD — set via `fly secrets`, never in repo | Low | INFO | HIGH |
| Auto-stop machines | GOOD — `'stop'` (cost + attack surface during off-hours) | Low | LOW | HIGH |
| Cloudflare Worker observability | GOOD — `observability.enabled` (wrangler.jsonc:7) | Low | INFO | HIGH |
| Cloudflare WAF rules | NOT VERIFIED — operator-side | Medium | MODERATE | LOW |
| Supabase project region | GOOD — EU (Frankfurt) — PPA-13 / GDPR alignment | Low | INFO | HIGH |
| Supabase RLS posture | HARDENED — see module 02 | Low | INFO | HIGH |
| Supabase Storage policies | NEEDS VERIFY | Medium | MODERATE | LOW |
| R2 bucket policies | NEEDS VERIFY (backup target) | Medium | MODERATE | LOW |
| TLS configuration | HARDENED — A+ via Cloudflare (per SECURITY-OVERVIEW.md) | Low | INFO | HIGH |
| DNS / domain hijack | NOT VERIFIED — registrar lock, 2FA | Medium | MODERATE | LOW |
| Sentry usage (errorTracking.ts) | GOOD — server-side filtering of PII per `src/errorTracking.ts` | Low | LOW | MEDIUM |

**Overall:** HARDENED (90/100). Fly CF-only ingress live in production
2026-05-20 09:24 UTC. Ceiling is operator-side controls we can't audit
from code (CF WAF rules, R2 lifecycle, registrar 2FA, etc.).

---

## 2. Attack surface mapping

| Provider | Surface | Notes |
|---|---|---|
| Fly.io | `vocaband.fly.dev` (origin) | reachable only via `API_BACKEND` in Worker; not for direct client use |
| Fly.io | machine SSH | `flyctl ssh console` — gated by Fly auth |
| Cloudflare | `vocaband.com`, `www.vocaband.com` | public; WAF should be on |
| Cloudflare | `auth.vocaband.com` (Supabase custom domain) | public; auth endpoints |
| Cloudflare | Workers dashboard | gated by CF auth + 2FA |
| Supabase | `*.supabase.co` | direct PostgREST + GoTrue + Storage — public, RLS-gated |
| Supabase dashboard | SQL editor, project settings | gated by Supabase auth + 2FA |
| R2 | backup bucket | should be private; access via API token |
| Sentry | dashboard + DSN ingress | DSN is technically public but write-only |

---

## 3. Offensive analysis

### A. Origin bypass (skip the Worker)

If `vocaband.fly.dev` is reachable directly, an attacker bypasses
Cloudflare's WAF + rate limits + observability.

**✅ CLOSED — live in production (2026-05-20 09:24 UTC).**
Application-level allowlist middleware `server.ts:cloudflareOnlyIngress`
checks `req.ip` against the canonical Cloudflare CIDR ranges (static
fallback in `config/cloudflare-ips.ts`, runtime refresh every 24 h from
`https://www.cloudflare.com/ips-v{4,6}`). `/api/health` is exempt so
Fly's internal probe still passes. Mounted before helmet, the rate
limiter, and the body parser so a rejected request costs us zero
further cycles.

Enabled via `fly secrets set CLOUDFLARE_INGRESS_ONLY=1`. Live
verification:

```
curl -i https://vocaband.fly.dev/api/translate     → HTTP/1.1 403 Forbidden
curl -i https://www.vocaband.com/api/health         → HTTP/1.1 200 OK
```

CI workflow `Cloudflare IP-list freshness` warns on drift between
the committed list and `cloudflare.com/ips-v4`. Quarterly manual
review still warranted.

### B. Supabase Storage policy holes

`worker/index.ts:197` fetches from
`${supabase}/storage/v1/object/public/sound/${id}.mp3`. The `public/`
path means the bucket is public-read. **Verify** the bucket also denies
public **write**; only the service-role TTS pipeline should write.

### C. R2 backup tampering

`docs/r2-migration-runbook.md` documents the migration. **Verify**
the backup bucket:
- Public read **denied**
- Object versioning **enabled** (so a ransomware actor can't overwrite)
- Lifecycle rules don't delete versions < 30 days
- Access tokens scoped to backup-write only (no global account perms)

### D. DNS hijack

A compromised registrar account → MX/A record swap → email
interception → password resets → full takeover. Mitigations are
universal: registrar 2FA + registry lock. **Operator action:** confirm.

### E. Sentry DSN abuse

The DSN is in client code (per `src/errorTracking.ts`). Anyone can
POST events to your Sentry project. Mitigations:
- Sentry quota cap (set in dashboard)
- IP rate limit on Sentry ingress
- Event-type filter in `errorTracking.ts` (you do this — confirm
  PII scrubber is on)

### F. Cloudflare account compromise

A compromised CF account = full DNS + Workers + WAF control.
**Operator action:** verify 2FA on all CF account admins, set up
audit log alerts, restrict Workers deploy to least-privilege API token.

### G. Fly secret stale rotation

Secrets set via `fly secrets set` persist until rotated. There is
no built-in rotation. **Action:** quarterly rotation drill —
`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`,
`SUPABASE_JWT_SECRET`, etc.

### H. Supabase service-role key leak

Stored in Fly secrets. Re-read at startup. Logged truncated only
(server.ts:91-107). **Not vulnerable** today; defence-in-depth is
quarterly rotation.

---

## 4. Blue-team controls

| Control | Status | Priority |
|---|---|---|
| Cloudflare WAF managed rules on | ❓ | operator verify |
| CF Bot Fight Mode on | ❓ | operator verify |
| Fly IP allowlist (CF only) | ✅ shipped + enforcing in production (verified 2026-05-20 09:26 UTC) | done |
| Sentry PII scrubber on (server + client) | partial | confirm `beforeSend` strips emails |
| R2 versioning + lifecycle | ❓ | operator verify |
| Supabase 2FA on operator accounts | ❓ | operator verify |
| Registrar 2FA + registry lock | ❓ | operator verify |
| Secrets rotation runbook + cadence | partial | document in `docs/SECRETS-ROTATION.md` |
| Sentry quota cap | ❓ | operator verify |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| `vocaband.fly.dev` direct hit returns 403 / blocked | Auto (curl from non-CF IP) |
| Supabase Storage anon write to `sound/` denied | Auto |
| R2 backup bucket anon read denied | Auto |
| TLS A+ grade on `vocaband.com` | Manual (SSL Labs, quarterly) |
| HSTS preload list status | Manual quarterly |
| Sentry DSN flood test (quota holds) | Manual |
| Secrets-rotation dry run | Manual quarterly |

---

## 6. Architecture review

- **Defence in depth across providers.** Cloudflare WAF in front of
  Fly, Fly behind helmet/CSP, Supabase with RLS, R2 for backups.
  Strong layering.
- **Region coherence.** Supabase EU + Fly EU keeps data in EU. **Verify**
  Fly machine is `fra` or `cdg`. R2 bucket region — confirm EU also.
- **Sentry usage in EU.** Sentry's EU data centre supported; confirm
  the DSN points to `*.sentry.eu.io` or equivalent for GDPR.

---

## 7. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| Direct `vocaband.fly.dev` hits | always (once filter is up) | P1 |
| Cloudflare WAF block rate | >5×/baseline | P2 |
| Supabase auth p95 latency | >2s | P2 |
| Sentry quota >80% used | scale-up | P2 |
| R2 backup missing one week | always | P0 |
| Fly machine restart rate | >10/h | P1 |
| DNS query anomaly (lookups for non-existent subdomain) | recon attempt | P3 |

---

## 8. Incident response

- **Origin bypass detected:** turn on Cloudflare "Under Attack" mode;
  apply IP allowlist on Fly.
- **DNS hijack:** contact registrar; restore records; rotate every
  service that uses DNS for verification (TLS, SMTP).
- **Backup tampering:** restore from R2 version history; investigate
  R2 access logs; rotate R2 access tokens.

---

## 9. Edge cases

- **Cloudflare zone deactivation by CF for ToS reasons** — DR plan
  needs alternate DNS (Cloudflare Registrar dependency).
- **Fly region failure** — multi-region requires Redis adapter + state
  reasoning; see `docs/DISASTER-RECOVERY.md`.
- **Supabase project paused for billing** — operator playbook addresses
  this.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Backup R2 weekly success | 100% | 75-99% | <75% |
| TLS A+ continuously | A+ | A | <A |
| Cloudflare cache hit rate | >85% | 70-85% | <70% |
| Fly machine uptime / month | >99.9% | 99-99.9% | <99% |
| Sentry quota burn | <70%/month | 70-90% | >90% |

---

## 11. Self-critique

- Operator-side controls (WAF, registrar lock, 2FA, R2 lifecycle) are
  *expected* to exist but were not visually verified. Pair with an
  operator audit using `docs/operator-tasks.md`.
- We did not audit Fly's `[http_service]` flag granularity beyond
  `force_https` — review the full toml for any debug flags.
