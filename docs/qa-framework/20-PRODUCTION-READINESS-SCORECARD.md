# 20 — Production Readiness Scorecard

> Roll-up of per-module scores from files 01–14. Where each dimension stands today and what would change to raise it.
>
> **REFRESHED 2026-05-20** to reflect the 4 security PRs that shipped + the operator action that went live (`fly secrets set CLOUDFLARE_INGRESS_ONLY=1`). Module scores re-weighted and Top-10 blocker shortlist re-checked against actual code state. See `docs/security-audit-framework/` for the full module-by-module security audit that drove these updates.

---

## 1. Per-module summary

| #   | Module                | Score | Δ | Headline gap to close                                                                  |
|-----|-----------------------|-------|---|----------------------------------------------------------------------------------------|
| 01  | Auth                  | **4.0**   | +0.6 | Mid-stream JWT re-verify shipped; rate-limit on class-code login still wanted        |
| 02  | Class management      | 3.6   | — | Audit log on archive/unarchive; rate limit on rotate                                  |
| 03  | Assignment + OCR      | 3.1   | — | OCR rate-limit + cost cap; image retention verification                                |
| 04  | Game modes            | **3.8**   | +0.5 | Score validation explicit (`20260606_f3_progress_score_cap.sql`); observability gap remains |
| 05  | Live challenge        | 2.7   | — | Load test at 5000 sockets; sticky session / Redis adapter; multi-region plan          |
| 06  | Quick Play             | **4.0**   | +0.9 | Code regex tightened + TEACHER_* handlers verified; both audit-error findings closed   |
| 07  | Shop + economy         | 3.6   | — | Booster-stacking policy explicit; economy inflation dashboard                          |
| 08  | Retention              | 3.4   | — | DST/TZ edge handling test; lazy compute for missed crons                              |
| 09  | Vocabulary + audio     | 3.6   | — | IndexedDB eviction test; audio 404 alarms                                              |
| 10  | i18n / RTL             | 3.9   | — | BIDI test cases; visual regression × 3 languages                                       |
| 11  | PWA + mobile           | 3.6   | — | Save-queue depth metric; service-worker stale rollout                                  |
| 12  | API backend            | **3.6**   | +0.8 | AI input firewall + entity-encoded output + Gemini responseSchema all shipped; OpenAPI spec still missing |
| 13  | Infrastructure         | **4.2**   | +0.9 | Fly CF-only ingress live in prod; backup restore drill still on the operator's list   |
| 14  | Security               | **4.4**   | +1.0 | Full security audit framework + per-tenant authz-failure dashboard shipped; external pen-test still outstanding |
| 15  | Accessibility          | 3.2   | — | axe-core CI enforcement; manual SR pass per release                                    |

**Weighted average: 3.66 / 5** (was 3.34) — **"pilot-hardened; one operator-side push from MoE-wide rollout."**

---

## 2. Top 10 blocker / vulnerability shortlist — refreshed status

| #  | Severity | Owner | Item | Status (2026-05-20) |
|----|----------|-------|------|---------------------|
| 1  | S1 | AppSec | External pen-test outstanding | 🔴 still open — operator action |
| 2  | S1 | Backend / DevOps | Confirm CSP / HSTS / Permissions-Policy headers | ✅ shipped — `server.ts:697` helmet config + custom permissions-policy middleware; production response confirmed live (audit module 11) |
| 3  | S1 | Realtime QA | Load test Live Challenge to 5000 sockets | 🟡 harness + runbook shipped (`scripts/loadtest-socket.ts`, `docs/load-test-runbook.md`); operator runs the rounds against a droplet |
| 4  | S1 | Backend | RLS regression suite in CI on every PR | 🟡 partial — `scripts/security-pen-test.sh` exists but is not yet wired into a workflow file |
| 5  | S1 | Backend | Server-side score validation on `apply_game_finish` | ✅ shipped — `supabase/migrations/20260606_f3_progress_score_cap.sql` (RPC + CHECK constraint, cap = 1000) |
| 6  | S2 | Backend | Centralized rate-limit middleware on Fly Express | ✅ shipped — `server.ts:751` global limiter + per-endpoint limiters (OCR, translate, TTS, AI) |
| 7  | S2 | Backend | OpenAPI spec + client type generation | 🔴 still open — no spec |
| 8  | S2 | DevOps | Backup restore drill executed | 🟡 runbook + verify script shipped (`docs/backup-restore-runbook.md`, `scripts/verify-restore.sql`); operator runs the drill quarterly |
| 9  | S2 | Compliance | PII-in-logs audit + Sentry `beforeSend` filter | 🟡 partial — `ignoreErrors` configured; `beforeSend` PII scrubber not yet added |
| 10 | S2 | QA | Smoke E2E suite wired into CI | ✅ shipped — `smoke.spec.ts` + `auth-flow.spec.ts` on every PR via `ci-e2e.yml` |
| 11 | S2 | Infra | Fly origin protection (CF-only ingress) | ✅ shipped + live in prod 2026-05-20 09:24 UTC — direct hits return 403 |
| 12 | S2 | AppSec | Per-tenant authz-failure dashboard | ✅ shipped — `authz_failures` table + RPC + admin view (`?view=admin-security`) |
| 13 | S2 | AppSec | AI prompt-injection input firewall + output sanitiser | ✅ shipped — applies to all 4 Gemini endpoints + sentence generator |
| 14 | S2 | AppSec | Gemini `responseSchema` JSON mode | ✅ shipped — all 4 endpoints use SchemaType-constrained outputs |
| 15 | S2 | AppSec | Mid-stream socket JWT re-verification | ✅ shipped — every 5 min, forced disconnect on revocation |

**Score:** 9 closed ✅ · 2 partial 🟡 · 4 still open 🔴.

The 4 still-open are mostly **operator actions** (pen-test, backup drill) or **multi-day engineering** (load test, OpenAPI). The 2 partial items (#4 + #9) are each ~half-day fixes.

---

## 3. Recommended next steps

### Sprint 1 — finish the partials (~1 day combined)
- Wire `scripts/security-pen-test.sh` into `.github/workflows/ci.yml` on every PR (item #4)
- Add `beforeSend` PII scrubber to `server.ts` Sentry init that strips emails, JWTs, IPs from event payloads (item #9)

### Sprint 2 — close the operational blockers (~1 week, mostly operator)
- Schedule first external pen-test of staging (item #1)
- Run a backup-restore drill end-to-end (item #8)
- Build a k6 / artillery script for the 5000-socket load test (item #3)

### Sprint 3 — long tail (multi-day each)
- OpenAPI spec for `/api/*` endpoints + client codegen (item #7)
- axe-core CI enforcement (module 15)
- Live Challenge Redis-adapter multi-region plan (module 05)

---

## 4. Sign-off matrix for MoE-wide rollout

Each row below must be GREEN before serving any school beyond pilot scale.

| Area                        | Required to ship       | Status |
|-----------------------------|------------------------|--------|
| External pen-test resolved | Critical findings closed | 🔴 not started |
| RLS regression in CI        | Yes                    | 🟡 script exists, not wired |
| Load test passes 5000 sockets | Yes                  | 🟡 harness ready; first ramp not yet executed |
| Save-queue resilience tests | Yes                    | 🟡 partial |
| PII audit clean             | Yes                    | 🟡 partial |
| Backup restore drilled      | Yes                    | 🟡 runbook ready; first drill not yet executed |
| OpenAPI + contract tests    | Yes                    | 🔴 not started |
| Observability dashboards live | Yes                  | 🟡 Sentry only |
| Incident response drill done | Yes                  | 🔴 not started |
| Privacy / DPIA approved     | Yes                    | 🟡 `docs/DPIA-TECHNICAL.md` exists |
| Accessibility statement + WCAG AA | Yes              | 🟡 statement exists; AA audit not done |

---

## 5. Final word

After the May-2026 security sprint, the codebase moved from **"beta-ready for pilots"** to **"pilot-hardened"**. The remaining gap to MoE-wide rollout is now overwhelmingly **operational + contractual** (pen-test, load test, drills, OpenAPI), not architectural.

**Recommendation:** the partials in §3 Sprint 1 are 1 day of engineering and close 2 of the remaining 6 ungreen rows in §4. Do those first; everything else above is either operator-driven or multi-day work that warrants its own scoping.

---

## 6. Self-QA validation

**Refreshed 2026-05-20:** the original scorecard predated the security sprint. Item-by-item re-check against the codebase moved 9 of the original 10 blockers (plus 5 new line items that emerged from the audit) out of the "open" column. Per-module scores raised on items 01, 04, 06, 12, 13, 14.

**Still-honest gaps:**
- The accessibility module (15) hasn't been touched in this refresh — score and gap unchanged.
- Live Challenge module (05) score reflects the load-test absence, not new work.
- This doc is the **roll-up**, not the source of truth. The per-module doc owns its score; this file aggregates.

**Dangerous assumptions to flag for future readers:**
- "Pilot success = MoE-ready" — false; pilots run forgiving traffic patterns.
- "Scoring is objective" — it is opinionated; keep weights documented and adjustable.
- "All operator items can be deferred indefinitely" — pen-test + backup drill are time-sensitive once the user base grows.
