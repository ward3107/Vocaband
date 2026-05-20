# 15 — Security Readiness Scorecard

> Numerical scorecard, breach economics, top remediations.

---

## Per-category scores

| Category | Score /100 | Class | Trend |
|---|---|---|---|
| Authentication & Identity | 86 | GOOD | flat |
| Authorization & RLS | 92 | HARDENED | flat |
| API security (REST) | 80 | GOOD | flat |
| Edge / Worker | 84 | GOOD | flat |
| Quick Play (anon namespace) | 64 | MODERATE | flat — sprint to ↑85 |
| AI / LLM integrations | 58 | MODERATE | flat — sprint to ↑80 |
| File uploads / OCR / camera | 76 | GOOD | flat |
| Real-time / WebSocket | 82 | GOOD | flat |
| Client / browser (CSP) | 78 | GOOD | flat |
| CI/CD & supply chain | 78 | GOOD | sprint to ↑85 (post-correction: CodeQL + GitGuardian already wired at repo level) |
| Infrastructure | 80 | GOOD | flat |
| Privacy & compliance | 88 | HARDENED | flat |
| Logging, monitoring, IR | 72 | GOOD | flat |
| **Overall composite** | **80** | **GOOD** | sprint to **89** |

Class scale: CRITICAL <40, HIGH RISK 40-59, MODERATE 60-69, GOOD 70-84,
HARDENED 85-94, ENTERPRISE GRADE ≥95.

---

## Composite breach economics

| Metric | Today | Post-sprint |
|---|---|---|
| 12-month breach probability | 12-18% | 3-5% |
| Mean blast radius (records exposed if a chain succeeds) | ~30-500 students/class up to entire DB | 1-30 students worst case |
| Mean attacker difficulty | MODERATE (skilled attacker + automation) | HIGH (skilled + insider or zero-day) |
| Estimated cost of successful breach | $250k-$5M (notification + lawyer + churn) | same — but at 1/4 the probability |
| Annualised loss expectancy (today) | 0.15 × $1M ≈ **$150k/yr** | 0.04 × $1M ≈ **$40k/yr** |
| Sprint cost | ~10 engineer-days ≈ $15-25k | one-time |
| Payback | < 2 months | — |

---

## Top-10 remediations, ranked by ALE delta / cost

| # | Remediation | Cost | ALE drop | Module |
|---|---|---|---|---|
| 1 | Prompt-injection input firewall + `responseSchema` JSON mode | 2 days | ↓~$25k/yr | 06 |
| 2 | Verify + add inline auth on all `QP_EVENTS.TEACHER_*` | 0.5 day | ↓~$20k/yr | 05 |
| 3 | Extend Quick Play codes 4 → 6 chars | 0.5 day | ↓~$10k/yr | 05 |
| 4 | Add Semgrep + Trivy to CI (CodeQL + GitGuardian already wired via repo-level Default Setup / App) | 1 day | ↓~$10k/yr | 10 |
| 5 | Dockerfile `USER node` + multi-stage build | 0.5 day | ↓~$5k/yr | 10 |
| 6 | Output-content sanitisation on AI responses | 0.5 day | ↓~$8k/yr | 06 |
| 7 | Fly IP allowlist (CF-only ingress) | 0.5 day | ↓~$5k/yr | 11 |
| 8 | Mid-stream socket JWT re-verification | 1 day | ↓~$3k/yr | 08 |
| 9 | Authenticated E2E in CI | 1 day | ↓~$5k/yr | 10 |
| 10 | Audit-log dashboard (per-tenant authz failures) | 1 day | ↓~$4k/yr | 02 |

Total: ~10 days, ~$110k/yr ALE reduction.

---

## Cross-cutting roadmap

### Sprint 1 (this two-week sprint)
- Items 1-5 above
- Item 2 first — operator confidence improvement

### Sprint 2 (within 60 days)
- Items 6-10
- First external pen-test of staging
- Quarterly tabletop A (Supabase compromise)

### Quarter 2
- SBOM + sigstore cosign for Worker artifacts
- CSP `report-uri` → Sentry
- Per-tenant authz failure dashboard
- nuclei API surface scan in nightly CI

### Annual
- External pen-test refresh
- DPIA refresh
- Privacy notice review with counsel
- Disaster-recovery full restore drill

---

## How to track

A small spreadsheet keyed on this scorecard:

```
| Date | Auth | Authz | API | Edge | QP | AI | Upload | WS | Client | CI | Infra | Priv | Mon | Overall |
| 2026-05-20 | 86 | 92 | 80 | 84 | 64 | 58 | 76 | 82 | 78 | 70 | 80 | 88 | 72 | 79 |
| 2026-06-XX | … | … | … | … | … | … | … | … | … | … | … | … | … | … |
```

Or fold into the existing `docs/qa-framework/20-PRODUCTION-READINESS-
SCORECARD.md` — keep one truth.

---

## Acceptance criteria for "ENTERPRISE GRADE" (≥95)

- Every module ≥85.
- CodeQL ✅ + GitGuardian ✅ + Semgrep + Trivy + SBOM in CI.
- Annual external pen-test, gap-closure within 90 days of finding.
- 2 quarterly tabletops completed in the trailing 12 months.
- Zero unresolved HIGH findings older than 30 days.
- Sentry / Cloudflare / Supabase audit logs streaming to a SIEM.
- DPIA refreshed within last 12 months.
- All operator-side controls verified by an external auditor.

Vocaband is ~4 quarters from this bar at current pace; the sprint
recommended here gets you to "HARDENED" (89), which is sufficient for
MoE certification and Series-A-grade due diligence.
