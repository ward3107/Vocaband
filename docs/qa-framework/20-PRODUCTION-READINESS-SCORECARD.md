# 20 — Production Readiness Scorecard

> Roll-up of per-module scores from files 01–14. Where each dimension stands today and what would change to raise it.

---

## 1. Per-module summary

| #   | Module                | Score | Headline gap to close                                                                  |
|-----|-----------------------|-------|----------------------------------------------------------------------------------------|
| 01  | Auth                  | 3.4   | CSP/HSTS header verification; rate-limit enforcement on class-code login              |
| 02  | Class management      | 3.6   | Audit log on archive/unarchive; rate limit on rotate                                  |
| 03  | Assignment + OCR      | 3.1   | OCR rate-limit + cost cap; image retention verification                                |
| 04  | Game modes            | 3.3   | Server-side score validation explicit; observability for crash-free sessions          |
| 05  | Live challenge        | 2.7   | Load test at 5000 sockets; sticky session / Redis adapter; multi-region plan          |
| 06  | Quick Play             | 3.1   | Anonymous join rate-limit; auto-end idle sessions                                      |
| 07  | Shop + economy         | 3.6   | Booster-stacking policy explicit; economy inflation dashboard                          |
| 08  | Retention              | 3.4   | DST/TZ edge handling test; lazy compute for missed crons                              |
| 09  | Vocabulary + audio     | 3.6   | IndexedDB eviction test; audio 404 alarms                                              |
| 10  | i18n / RTL             | 3.9   | BIDI test cases; visual regression × 3 languages                                       |
| 11  | PWA + mobile           | 3.6   | Save-queue depth metric; service-worker stale rollout                                  |
| 12  | API backend            | 2.8   | OpenAPI spec; distributed tracing; multi-region failover                              |
| 13  | Infrastructure         | 3.3   | Backup restore drill; origin protection via Authenticated Origin Pulls                |
| 14  | Security               | 3.4   | External pen-test; PII-in-logs audit                                                  |
| 15  | Accessibility          | 3.2   | axe-core CI enforcement; manual SR pass per release                                    |

**Weighted average: 3.34 / 5 — “beta-ready for pilots, not for MoE-wide rollout.”**

---

## 2. Top 10 blocker / vulnerability shortlist

| #  | Severity | Owner discipline       | Item                                                                                          |
|----|----------|------------------------|-----------------------------------------------------------------------------------------------|
| 1  | S1       | AppSec                 | External pen-test outstanding (operator task)                                                  |
| 2  | S1       | Backend / DevOps        | Confirm CSP / HSTS / Permissions-Policy headers on Cloudflare Worker                          |
| 3  | S1       | Realtime QA             | Load test Live Challenge to 5000 concurrent sockets                                            |
| 4  | S1       | Backend                | Verify RLS regression suite in CI on every PR                                                 |
| 5  | S1       | Backend                | Server-side score validation on `apply_game_finish` (cap, re-derive, idempotent)              |
| 6  | S2       | Backend                | Centralized rate-limiting middleware on Fly Express (per-IP, per-token, per-endpoint)         |
| 7  | S2       | Backend                | OpenAPI spec + client type generation                                                          |
| 8  | S2       | DevOps                 | Backup restore drill executed (quarterly cadence)                                              |
| 9  | S2       | Compliance              | PII-in-logs audit + Sentry beforeSend filter                                                  |
| 10 | S2       | QA                     | Smoke E2E suite (CROSS-001..010) wired into CI                                                |

---

## 3. Recommended order of operations

1. **Stabilization sprint**: items #2, #4, #5, #6, #10 — minimal feature work, focus on hardening.
2. **Observability sprint**: dashboards + alerts per module (`12-OBS-*` in each file).
3. **Load + reliability sprint**: item #3, item #8.
4. **AppSec sprint**: item #1 (kick off pen-test), item #9.
5. **Documentation + contracts**: item #7.

---

## 4. Sign-off matrix for MoE-wide rollout

Each row below must be GREEN before serving any school beyond pilot scale.

| Area                        | Required to ship       |
|-----------------------------|------------------------|
| External pen-test resolved | Critical findings closed |
| RLS regression in CI        | Yes                    |
| Load test passes 5000 sockets | Yes                  |
| Save-queue resilience tests | Yes                    |
| PII audit clean             | Yes                    |
| Backup restore drilled      | Yes                    |
| OpenAPI + contract tests    | Yes                    |
| Observability dashboards live | Yes                  |
| Incident response drill done | Yes                  |
| Privacy / DPIA approved     | Yes                    |
| Accessibility statement + WCAG AA | Yes              |

---

## 5. Final word

The codebase is in good shape for an early-pilot product — many of the right primitives (RLS, save-queue, lazy vocab, accessibility widget, i18n hooks) are in place. The gap to enterprise / MoE rollout is mostly **operational**: load testing, dashboards, formal sign-offs, and explicit policies (rate limits, booster stacking, role re-evaluation).

**Recommendation**: spend one stabilization sprint on the top-10 blockers in §2 before adding any new feature surface. The cost of fixing them after the first MoE failure is orders of magnitude higher.

---

## 6. Self-QA validation

**Missed initially:**
- Sign-off matrix for MoE rollout — added §4.
- Recommended sequencing — added §3.

**Dangerous assumptions:**
- "Pilot success = MoE-ready" — false; pilots run forgiving traffic patterns.
- "Scoring is objective" — it is opinionated; keep weights documented and adjustable.
