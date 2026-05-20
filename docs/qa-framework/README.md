# Vocaband QA Framework

Enterprise-grade QA architecture for the Vocaband product, covering every module with a consistent 16-section template. Start with [`00-OVERVIEW.md`](./00-OVERVIEW.md).

## Reading order

1. **Architecture overview, severity matrix, risk register** — [00-OVERVIEW](./00-OVERVIEW.md)
2. **Auth & sessions** — [01-AUTH-MODULE](./01-AUTH-MODULE.md)
3. **Class management** — [02-CLASS-MANAGEMENT](./02-CLASS-MANAGEMENT.md)
4. **Assignment + OCR pipeline** — [03-ASSIGNMENT-MODULE](./03-ASSIGNMENT-MODULE.md)
5. **Game modes & gameplay loop** — [04-GAME-MODES](./04-GAME-MODES.md)
6. **Live Challenge (real-time)** — [05-LIVE-CHALLENGE](./05-LIVE-CHALLENGE.md)
7. **Quick Play (QR-join guest mode)** — [06-QUICK-PLAY](./06-QUICK-PLAY.md)
8. **Shop & economy** — [07-SHOP-ECONOMY](./07-SHOP-ECONOMY.md)
9. **Retention systems** — [08-RETENTION-SYSTEMS](./08-RETENTION-SYSTEMS.md)
10. **Vocabulary data + audio** — [09-VOCABULARY-DATA](./09-VOCABULARY-DATA.md)
11. **i18n / RTL** — [10-I18N-RTL](./10-I18N-RTL.md)
12. **PWA, mobile, save queue** — [11-PWA-MOBILE](./11-PWA-MOBILE.md)
13. **API backend** — [12-API-BACKEND](./12-API-BACKEND.md)
14. **Infrastructure** — [13-INFRASTRUCTURE](./13-INFRASTRUCTURE.md)
15. **Security & RLS deep-dive** — [14-SECURITY-RLS](./14-SECURITY-RLS.md)
16. **Accessibility (WCAG 2.1 AA)** — [15-ACCESSIBILITY](./15-ACCESSIBILITY.md)
17. **Cross-module failure analysis** — [16-CROSS-MODULE-FAILURE](./16-CROSS-MODULE-FAILURE.md)
18. **Disaster recovery scenarios** — [17-DISASTER-RECOVERY](./17-DISASTER-RECOVERY.md)
19. **Release gate checklist** — [18-RELEASE-GATES](./18-RELEASE-GATES.md)
20. **Automation strategy** — [19-QA-AUTOMATION-STRATEGY](./19-QA-AUTOMATION-STRATEGY.md)
21. **Production readiness scorecard** — [20-PRODUCTION-READINESS-SCORECARD](./20-PRODUCTION-READINESS-SCORECARD.md)

## How each module file is organized

1. Purpose
2. User flow mapping
3. Functional QA scenarios
4. Edge cases & failure injection (data, behavior, infrastructure, AI)
5. Security QA
6. Accessibility QA (WCAG 2.1 AA)
7. Responsive & device QA
8. Performance QA
9. Database integrity QA
10. API QA
11. State management QA
12. Observability & monitoring QA
13. QA automation strategy
14. Production readiness score
15. QA success metrics
16. Self-QA validation

## Common usage

| Goal                          | Start here                                                            |
|-------------------------------|------------------------------------------------------------------------|
| Reviewing a PR                | The module file(s) touched + `18-RELEASE-GATES` checklist             |
| Shipping a release             | `18-RELEASE-GATES`                                                    |
| Triaging an incident           | `17-DISASTER-RECOVERY`, then drill into the failing module file       |
| Onboarding a QA hire           | `00-OVERVIEW`, `14-SECURITY-RLS`, `15-ACCESSIBILITY`, `19-AUTOMATION`  |
| Quarterly readiness review     | `20-PRODUCTION-READINESS-SCORECARD`                                   |

## Living document policy

- Every PR with a behavior change updates at least the module file it touches.
- Every S1/S2 incident adds at least one regression test case to the affected module file.
- Quarterly review by QA lead; snapshot under `docs/quarterly-audit-<YYYY-MM>.md`.
- Test IDs are immutable once published.

## Scope vs `docs/` siblings

This framework complements existing docs:

- [`SECURITY-OVERVIEW.md`](../SECURITY-OVERVIEW.md) — security architecture (this framework adds offensive test cases).
- [`DISASTER-RECOVERY.md`](../DISASTER-RECOVERY.md) — DR baseline (this framework adds scenario-by-scenario test cases).
- [`WCAG_COMPLETION_SUMMARY.md`](../WCAG_COMPLETION_SUMMARY.md) — WCAG status (this framework adds per-criterion test scenarios).
- [`open-issues.md`](../open-issues.md) — engineering backlog.
- [`operator-tasks.md`](../operator-tasks.md) — human-side tasks.
