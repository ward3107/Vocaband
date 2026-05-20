# 18 — Release Gate Checklist

> Authoritative gate for shipping a release. Every release must pass — or have explicit waiver from QA lead — before deploy.

---

## 1. Pre-flight (developer)

- [ ] Branch up-to-date with main; merge conflicts resolved.
- [ ] All CI checks green (lint, typecheck, unit, integration, e2e).
- [ ] No secrets committed (gitleaks).
- [ ] Bundle size diff < +5% (size-limit).
- [ ] No new `console.log` in production code paths.
- [ ] Translation keys for new strings present in en + he + ar (or noted in `docs/TRANSLATIONS-PENDING.md`).
- [ ] New components / hooks under 200 lines per project convention.

---

## 2. Functional

- [ ] Smoke suite (CROSS-001 to CROSS-010 in `16-CROSS-MODULE-FAILURE.md`) green.
- [ ] No new S1/S2 bugs in module test plans.
- [ ] Manual exploratory: teacher full flow + student full flow + Quick Play.

---

## 3. Security

- [ ] RLS regression suite green.
- [ ] No new vulnerabilities (Snyk / npm audit high+critical).
- [ ] CSP headers unchanged or strengthened.
- [ ] Service-role key not referenced anywhere in client bundle.
- [ ] gitleaks scan clean.
- [ ] Privacy review checked for any new field that touches PII (`docs/PRIVACY_CHECKLIST.md`).

---

## 4. Accessibility

- [ ] axe-core CI green (no new violations).
- [ ] Lighthouse a11y score ≥ 95 on landing + dashboard.
- [ ] Manual keyboard tab pass on changed screens.

---

## 5. Performance

- [ ] Lighthouse perf score ≥ 80 on landing.
- [ ] Bundle size budget honored.
- [ ] No new render bottleneck flagged in profiler.
- [ ] Audio + image asset budget.

---

## 6. Database

- [ ] Migrations idempotent + reversible.
- [ ] New indexes verified with `EXPLAIN`.
- [ ] No `ALTER TABLE ADD COLUMN NOT NULL DEFAULT` on large tables without expand-contract.
- [ ] Rollback rehearsed if change is high-risk.

---

## 7. Internationalization

- [ ] No missing keys in `useTranslate` audit script.
- [ ] RTL layouts verified on changed screens (visual regression suite).

---

## 8. Infrastructure

- [ ] No untracked env var or Fly secret changes.
- [ ] Cloudflare Worker config unchanged or reviewed.
- [ ] Backups verified within 24h.
- [ ] PITR enabled.

---

## 9. Observability

- [ ] New code paths log at appropriate levels.
- [ ] No PII in new logs (server-side spot check).
- [ ] Sentry / error tracking captures new flows.
- [ ] If a new metric is added, dashboard updated.

---

## 10. Documentation

- [ ] CLAUDE.md updated if architecture changed.
- [ ] Module file(s) in `docs/qa-framework/` updated for any behavior change.
- [ ] `docs/open-issues.md` reflects current state.
- [ ] If shipping a flagged feature, `docs/operator-tasks.md` updated.

---

## 11. Rollout strategy

- [ ] Feature flag (if risky) in place.
- [ ] Canary group identified (e.g. internal teachers).
- [ ] Rollback plan documented.
- [ ] Monitoring dashboards open for the first 30 min post-deploy.

---

## 12. Communication

- [ ] If user-visible: changelog entry / in-app announcement.
- [ ] If teachers training needed: operator playbook updated.
- [ ] If contract / DPIA-affecting: legal review.

---

## 13. Release sign-off

| Role               | Owner             | Signed (date) |
|--------------------|-------------------|---------------|
| Engineering lead   | name              |               |
| QA lead            | name              |               |
| Security reviewer  | name              |               |
| Product            | name              |               |

Once signed: tag release, deploy, monitor.

---

## 14. Self-QA validation

**Missed initially:**
- Rollback rehearsal step — added §6.
- Translation gating — added §1 and §7.
- Operator playbook update — added §12.

**Dangerous assumptions:**
- "CI catches everything" — manual smoke remains essential.
- "Feature flags are free" — they accumulate; track and clean up.
