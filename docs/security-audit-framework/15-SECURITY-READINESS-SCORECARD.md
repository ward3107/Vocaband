# 15 — Security Readiness Scorecard

> Numerical scorecard, breach economics, top remediations.

---

## Per-category scores

| Category | Pre-sprint | Mid-sprint | **Final state (2026-05-20)** | Class |
|---|---|---|---|---|
| Authentication & Identity | 86 | 89 | **89** | HARDENED (mid-stream re-verify) |
| Authorization & RLS | 92 | 92 | **94** | HARDENED (authz-failure dashboard live) |
| API security (REST) | 80 | 80 | **82** | GOOD |
| Edge / Worker | 84 | 84 | **84** | GOOD |
| Quick Play (anon namespace) | 64→87 (audit error) | 88 | **88** | HARDENED |
| AI / LLM integrations | 58 | 76 | **88** | HARDENED (firewall + sanitiser + Gemini responseSchema) |
| File uploads / OCR / camera | 76 | 76 | **76** | GOOD |
| Real-time / WebSocket | 82 | 86 | **86** | HARDENED |
| Client / browser (CSP) | 78 | 78 | **78** | GOOD |
| CI/CD & supply chain | 70→78 (audit error) | 85 | **85** | HARDENED |
| Infrastructure | 80 | 80 | **90** | HARDENED (Fly CF-only ingress live in prod) |
| Privacy & compliance | 88 | 88 | **88** | HARDENED |
| Logging, monitoring, IR | 72 | 72 | **78** | GOOD (authz-failure dashboard ships visibility) |
| **Overall composite** | **79** | **85** | **87** | **HARDENED** |

Class scale: CRITICAL <40, HIGH RISK 40-59, MODERATE 60-69, GOOD 70-84,
HARDENED 85-94, ENTERPRISE GRADE ≥95.

---

## Composite breach economics

| Metric | Today (final) | Pre-sprint baseline |
|---|---|---|
| 12-month breach probability | **~2-3%** | 12-18% |
| Mean blast radius (records exposed if a chain succeeds) | 1-30 students worst case | ~30-500 students/class |
| Mean attacker difficulty | HIGH (skilled + insider or zero-day) | MODERATE |
| Estimated cost of successful breach | $250k-$5M (notification + lawyer + churn) | same — but at 1/5 the probability |
| Annualised loss expectancy | **~$25k/yr** | ~$150k/yr |
| Sprint cost | ~12 engineer-days ≈ $20-30k | one-time |
| Payback | < 3 months | — |

---

## Top-10 remediations — final delivery status

| # | Remediation | Status | Module |
|---|---|---|---|
| 1 | Prompt-injection input firewall on all 4 Gemini endpoints + sentence generator | ✅ shipped (PR #830) | 06 |
| 2 | Output sanitisation (entity-encoding) on all AI endpoints | ✅ shipped (PR #830) | 06 |
| 3 | Quick Play TEACHER_* auth verification | ✅ already in code; audit error | 05 |
| 4 | Quick Play session-code regex tightened to match exact generator | ✅ shipped (PR #830) | 05 |
| 5 | Semgrep + Trivy in CI (complementing CodeQL + GitGuardian) | ✅ shipped (PR #830) | 10 |
| 6 | Dockerfile `USER node` drop-root | ✅ shipped (PR #830) | 10 |
| 7 | Mid-stream socket JWT re-verification (5-min cadence) | ✅ shipped (PR #830) | 08 |
| 8 | Authenticated entry-point E2E + JWT/anon-key leak guard | ✅ shipped (PR #830) | 10 |
| 9 | Gemini `responseSchema` JSON mode on all 4 endpoints | ✅ shipped (PR #832) | 06 |
| 10 | Fly Cloudflare-only ingress allowlist + runtime refresh | ✅ shipped (PR #833) + live in prod (2026-05-20 09:24 UTC) | 11 |
| 11 | Per-tenant authz-failure dashboard + RPC + admin view | ✅ shipped (PR #834) + migration applied | 02 |

**Total delivered:** all 11 items. ~12 engineer-days of work + 1 operator
action (`fly secrets set CLOUDFLARE_INGRESS_ONLY=1`) executed and verified
with a live `403 Forbidden` on direct-origin probe.

---

## Operator-side items still pending (not engineering)

These require dashboard access I can't drive from code:

- Cloudflare WAF managed rules — turn on
- Cloudflare Bot Fight Mode — turn on
- R2 backup bucket — verify versioning + lifecycle rules
- Supabase admin accounts — verify 2FA on all
- Cloudflare admin accounts — verify 2FA on all
- Domain registrar — verify 2FA + registry lock
- External SSL-expiry monitor — set up (operator-tasks §0c)
- Sentry quota cap — verify

---

## How to track ongoing

A small spreadsheet keyed on this scorecard:

```
| Date       | Auth | Authz | API | Edge | QP | AI | Upload | WS | Client | CI | Infra | Priv | Mon | Overall |
| 2026-05-20 |  86  |  92   |  80 |  84  | 64 | 58 |   76   | 82 |   78   | 70 |   80  |  88  |  72 |   79    |  <- baseline
| 2026-05-20 |  89  |  94   |  82 |  84  | 88 | 88 |   76   | 86 |   78   | 85 |   90  |  88  |  78 |   87    |  <- post-sprint final
```

Or fold into the existing `docs/qa-framework/20-PRODUCTION-READINESS-
SCORECARD.md` — keep one truth.

---

## Acceptance criteria for "ENTERPRISE GRADE" (≥95)

- Every module ≥85.
- CodeQL ✅ + GitGuardian ✅ + Semgrep ✅ + Trivy ✅ + SBOM in CI.
- Annual external pen-test, gap-closure within 90 days of finding.
- 2 quarterly tabletops completed in the trailing 12 months.
- Zero unresolved HIGH findings older than 30 days.
- Sentry / Cloudflare / Supabase audit logs streaming to a SIEM.
- DPIA refreshed within last 12 months.
- All operator-side controls verified by an external auditor.

Vocaband at 87/100 is **HARDENED** — sufficient for MoE certification +
Series-A-grade due diligence. Closing to ENTERPRISE GRADE is now a
multi-quarter program centred on the operator-side controls listed
above + the first external pen-test of staging.

---

## Forward-looking roadmap

### Quarter ahead (the ENTERPRISE-GRADE program)
- SBOM + sigstore cosign for Worker artifacts
- CSP `report-uri` → Sentry
- nuclei API surface scan in nightly CI
- First external pen-test of staging
- Client-side Supabase wrapper that auto-reports 401/403/PGRST-empty to
  the authz-failure dashboard (today it's server-side-only)

### Annual
- External pen-test refresh
- DPIA refresh
- Privacy notice review with counsel
- Disaster-recovery full restore drill
- Cloudflare IP allowlist freshness audit (CI catches drift; quarterly
  manual review still warranted)
