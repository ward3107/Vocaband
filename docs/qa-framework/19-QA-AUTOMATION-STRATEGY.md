# 19 — QA Automation Strategy

> Tool stack, layering, ownership, and rollout plan for automated tests across the Vocaband codebase.

---

## 1. Test pyramid (target)

```
                          ┌────────────────┐
                          │  E2E (Playwright)│  ~10%
                          └─────────┬──────┘
                       ┌────────────┴────────────┐
                       │  Integration (Supertest +│  ~30%
                       │  Supabase test client)  │
                       └────────────┬────────────┘
                ┌───────────────────┴───────────────────┐
                │   Unit (Vitest)                       │   ~60%
                └────────────────────────────────────────┘
```

In practice today the SPA is heavier than this; the goal is to move toward more unit + integration.

---

## 2. Tool stack

| Concern                | Tool                 | Status today | Priority |
|------------------------|----------------------|--------------|----------|
| Unit tests             | Vitest               | partial      | P0       |
| Integration tests      | Supertest + msw      | partial      | P0       |
| Contract tests         | Pact / OpenAPI       | none         | P1       |
| End-to-end             | Playwright           | partial      | P0       |
| Visual regression      | Playwright + pixel diff | none      | P2       |
| Accessibility automated | axe-core             | partial      | P0       |
| Performance budgets    | Lighthouse CI        | partial      | P1       |
| Performance profiling  | Chrome DevTools, Lighthouse RUM | partial | P2  |
| Load / stress          | k6                   | none         | P1       |
| Security DAST          | OWASP ZAP            | none         | P1       |
| Security SAST          | Semgrep              | none         | P1       |
| Secret scanning        | gitleaks             | recommended  | P0       |
| Dependency audit       | npm audit + Snyk     | partial      | P0       |
| RLS regression         | Custom SQL harness   | partial      | P0       |
| Mobile device matrix   | BrowserStack         | none         | P2       |
| Chaos                  | toxiproxy            | none         | P2       |

---

## 3. CI integration

### 3.1 PR pipeline

1. Lint + typecheck (parallel).
2. Unit tests (Vitest).
3. Integration tests (mocked Supabase + Express).
4. Build (Vite + Worker).
5. Bundle size check.
6. axe-core route audit (against static build).
7. Smoke E2E (3 critical flows).
8. Security: gitleaks + npm audit.
9. PR comment with results summary.

### 3.2 Main branch pipeline

Adds:
- Full E2E suite.
- Visual regression.
- Lighthouse CI.
- Deploy to staging.
- Smoke against staging.

### 3.3 Nightly

- RLS pen-test full matrix.
- k6 load test (medium scale).
- Semgrep SAST.
- OWASP ZAP scan against staging.
- Backup restore smoke.

### 3.4 Pre-prod release

- All of above.
- Manual smoke checklist (`18-RELEASE-GATES.md`).
- Tag release.

---

## 4. Coverage targets

| Surface                  | Unit | Integration | E2E |
|--------------------------|------|-------------|-----|
| Hooks (`src/hooks/`)     | 70%  | n/a         | n/a |
| Pure utility functions   | 90%  | n/a         | n/a |
| API endpoints             | n/a  | 100% endpoints, 80% branches | smoke |
| Critical user flows       | n/a  | n/a         | 100% top-10 |
| Components               | 30%  | n/a         | covered via E2E |

Coverage targets are guidance, not law. Critical paths beat percentages.

---

## 5. Test data strategy

- **Fixtures**: committed under `tests/fixtures/`.
- **Seeded test classes**: created by CI setup; cleaned up after.
- **Anonymized real classroom data**: never. Synthetic only.
- **Audio fixtures**: small public-domain MP3s.
- **Photos for OCR tests**: synthetic generated images with known words.

---

## 6. Flaky test policy

- Quarantine flaky tests within 24h of detection.
- Investigate within 1 sprint.
- Maximum 5 quarantined tests at any time; if exceeded, freeze flaky-test introduction.

---

## 7. Ownership

| Layer            | Owner                     |
|------------------|---------------------------|
| Unit             | Feature engineers          |
| Integration      | Feature engineers + QA     |
| E2E              | QA                          |
| Visual           | QA                          |
| Perf             | DevOps + QA                 |
| Security DAST    | AppSec                      |
| RLS              | Backend lead                |
| Mobile matrix    | QA                          |

---

## 8. Rollout plan (next 3 quarters)

**Quarter 1**
- Stand up CI gates: gitleaks, npm audit, axe-core, smoke E2E (top 3 flows).
- Cover `useStudentLogin`, `apply_game_finish`, `purchase_item` with integration tests.
- RLS regression matrix in CI.

**Quarter 2**
- Add Lighthouse CI; performance budgets enforced.
- Add k6 load test for socket.io (5000 connections).
- Add semgrep + ZAP nightly.

**Quarter 3**
- Visual regression suite (Playwright + pixel-diff) for top 15 screens × 3 languages.
- Mobile device matrix on BrowserStack.
- Chaos engineering tests (toxiproxy + planned game-day).

---

## 9. Quality KPIs

| KPI                                              | Target          |
|--------------------------------------------------|------------------|
| PRs blocked by CI defects                        | ≥ 95% catch rate |
| Defect escape rate to production                  | < 1 S2 / quarter |
| Mean time to detect (MTTD)                        | < 30 min         |
| Mean time to repair (MTTR)                         | < 4h             |
| Flaky-test rate                                   | < 2%             |

---

## 10. Self-QA validation

**Missed initially:**
- Flaky-test policy — added §6.
- Test data strategy — added §5.
- Ownership table — added §7.

**Dangerous assumptions:**
- "Coverage % equals quality" — no; critical-path E2E matters more.
- "All flakiness is environmental" — most is code; investigate root cause.
