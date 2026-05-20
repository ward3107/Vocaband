# 10 — CI/CD & Supply Chain

> Six GitHub Actions workflows, locked-file dependencies, no SAST.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Workflow permissions | HARDENED — `contents: read` per workflow | Low | INFO | HIGH |
| Concurrency limits | GOOD — cancel-in-progress; backup serialised | Low | INFO | HIGH |
| Typecheck ratcheting | GOOD — baseline file enforced | Low | INFO | HIGH |
| `npm audit` gate | GOOD — HIGH/CRITICAL fails CI | Low | LOW | HIGH |
| Dependency overrides for CVEs | GOOD — 7 explicit pins (`package.json:77-84`) | Low | INFO | HIGH |
| Dependabot grouped PRs | GOOD — weekly patch+minor, monthly Actions | Low | LOW | HIGH |
| Lockfile pinning | GOOD — `package-lock.json` 15866 lines, committed | Low | INFO | HIGH |
| SAST (CodeQL / Semgrep) | MISSING | Medium | MODERATE | HIGH |
| Secret scanning (gitleaks / TruffleHog) | MISSING | Medium | MODERATE | HIGH |
| SBOM generation | MISSING | Medium | LOW | HIGH |
| Artifact signing (sigstore / cosign) | MISSING | Medium | LOW | HIGH |
| Docker base + USER | MODERATE — `node:22-alpine`, runs as root, single-stage | Medium | MODERATE | HIGH |
| Secret hygiene (`.env.production` committed) | INFO — by design, public anon keys | Low | INFO | HIGH |
| E2E auth coverage | MODERATE — smoke skips login | Medium | LOW | HIGH |
| Branch protection (PR gates) | EXPECTED — verify in GitHub settings | Medium | LOW | LOW |

**Overall:** MODERATE (70/100). Sound fundamentals (locked deps,
allowlisted permissions, audit gate) but no SAST, no signing, no SBOM
— the supply-chain detection ceiling.

---

## 2. Workflow inventory

| Workflow | Triggers | Risk class |
|---|---|---|
| `ci.yml` | every PR + main push | typecheck, unit tests, build, npm audit |
| `ci-e2e.yml` | every PR + main push | Playwright smoke (3 tests, no auth) |
| `cloudflare-deploy.yml` | main push | wrangler deploy → Cloudflare Worker |
| `backup-supabase-weekly.yml` | Sunday 03:00 UTC | pg_dump → R2 |
| `supabase-migrations.yml` | main + feature push | applies new SQL migrations |
| `regen-motivational-audio.yml` | workflow_dispatch | Google AI audio regen |

---

## 3. Offensive analysis

### A. Compromised maintainer account

**Goal.** Push a malicious commit to `main`, get it deployed.

**Path 1: direct push.** Requires bypassing branch protection. **Verify**
in GitHub settings: `main` branch protection requires (a) PR with
review approval, (b) status checks pass (ci.yml + ci-e2e.yml), (c) no
force-push, (d) no admin bypass.

**Path 2: malicious PR merged.** A reviewer-approved PR. Defence:
mandatory review by a second human; PR body diff is the only firewall.
Recommendation: enforce **2-reviewer approval** for any change to
`supabase/migrations/`, `worker/index.ts`, `server.ts` security
middleware, and `.github/workflows/`.

**Path 3: malicious dependency.**
- Dependabot bumps a transitive dep to a compromised version. The
  `npm audit` gate catches **known** CVEs only — a zero-day in a
  freshly-published package slips through.
- Mitigation: add `socket.dev` GitHub app or `npm-audit-resolver` for
  behavioural review of new versions.

### B. GitHub Actions injection

`workflow_dispatch` is the only manual trigger (`regen-motivational-
audio.yml`). It accepts no user input that flows into `run: ...` blocks.
**Not vulnerable** to classic Actions injection (`${{ github.event...
}}` interpolated into shell).

Verify each `run:` block in every workflow doesn't interpolate
`github.event.pull_request.title`, `github.event.head_commit.message`
without `${{ ... }}` to env var pattern.

### C. Secret leakage in logs

Workflows expose secrets to job steps. `${{ secrets.SUPABASE_DB_URL }}`
is reachable inside any step of `backup-supabase-weekly.yml`. If a
step `echo`s an env var or `set -x` is on, the secret hits the log
masked by GitHub's auto-mask.

GitHub auto-masks known secrets in logs but not derivatives (e.g.
base64-encoding). **Verify** the backup script doesn't echo the DB URL.

### D. Docker base CVEs

`node:22-alpine` — Alpine + LTS Node. Reasonable. Add Trivy scan in CI:

```yaml
- uses: aquasecurity/trivy-action@master
  with: { image-ref: 'node:22-alpine', severity: HIGH,CRITICAL }
```

### E. Docker runs as root

Single-stage; no `USER` directive. The Express process runs as root.
**Risk:** in a hypothetical container escape, root inside container
matters less than the file-system isolation, but defence-in-depth says
drop to a non-root user:

```Dockerfile
USER node
```

`node` user pre-exists in the base image (UID 1000).

### F. `.env.production` committed

The file's comment explicitly justifies: only public anon keys. We
verified — the entries are URL + anon key + a feature flag. **Acceptable.**
The risk is **rotation flexibility**: rotating the anon key means a
commit + rebuild + redeploy across branches.

### G. Supply-chain pin diff

`package.json:77-84` overrides:
- `serialize-javascript@7.0.4`
- `@xmldom/xmldom@0.8.13`
- `ws@8.20.1`
- `brace-expansion@5.0.6`
- `fast-uri@3.1.2`
- `postcss@8.5.10`
- `ip-address@10.1.1`

Each addresses a known CVE. **Maintenance burden:** when a transitive
dep moves past the pinned version, the override may pin to a *lower*
version than the rest of the tree. Audit annually with `npm ls <pkg>`.

### H. Build-time secret exposure

Vite bundles `VITE_*` env vars into the output. We confirmed only
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SOCKET_URL`,
`VITE_CLASSROOM_V2` ship to the client. Add a CI lint:

```bash
# fail if any VITE_*SECRET, VITE_*KEY (except _ANON_KEY), VITE_*TOKEN sneaks in
grep -E 'VITE_[A-Z_]*(SECRET|TOKEN|PRIVATE)' .env.production && exit 1
```

---

## 4. Blue-team controls

| Control | Status | Priority |
|---|---|---|
| Workflow `permissions: contents: read` | ✅ | — |
| `npm audit` HIGH gate | ✅ | — |
| Lockfile pinned | ✅ | — |
| Dependabot | ✅ | — |
| 2-reviewer approval for security-sensitive paths | ❌ | P1 (CODEOWNERS) |
| CodeQL in CI | ❌ | P0 (sprint) |
| Gitleaks pre-commit + CI | ❌ | P0 (sprint) |
| Semgrep ruleset | ❌ | P1 |
| Trivy on Docker image | ❌ | P1 |
| SBOM (`@cyclonedx/bom`) | ❌ | P2 |
| sigstore cosign on wrangler artifact | ❌ | P2 |
| Dockerfile `USER node` | ❌ | P1 |
| Multi-stage Dockerfile (drop devDeps) | ❌ | P2 |
| Authenticated E2E in CI | ❌ | P2 |
| Branch protection verified in GitHub | ❓ | operator |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| Dependency vulnerability scan (npm audit) | ✅ Auto |
| CodeQL JS/TS scan | will be Auto |
| Secret-string scan on every commit | will be Auto (gitleaks) |
| Container vulnerability scan | will be Auto (trivy) |
| `npm ls <pinned-package>` agrees with override | Manual quarterly |
| Authenticated login flow doesn't regress | will be Auto (Playwright + Supabase test user) |

---

## 6. Architecture review

- **Two deploy targets** (Cloudflare + Fly) with different deploy
  cadences. Document the contract — what each deploys, who signs off.
- **Secrets live in three places**: GitHub Actions secrets, Fly secrets,
  Supabase env. **Action:** keep a `docs/secrets-inventory.md` that
  lists each secret + where it lives + rotation cadence.
- **Backup pipeline** is the highest-value automation: weekly pg_dump
  to R2. Verify R2 bucket has:
  - Object versioning enabled (point-in-time recovery)
  - Bucket-level deny on public read
  - Cross-account replication or copy to a secondary region

---

## 7. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| CI fails on main | always (block merge) | P1 |
| Dependabot PR open >7 days | reminder | P3 |
| `npm audit` regression introduced | always | P1 |
| GitHub audit log: new collaborator added | always | P0 |
| GitHub audit log: secret rotated | always | P1 |
| Fly deploy fails | always | P1 |
| Backup R2 write success | weekly | P0 (no backup = severity-up) |

---

## 8. Incident response

- **Compromised maintainer token (PAT / GitHub):** revoke in GitHub
  Settings → Personal Access Tokens; audit recent activity; rotate
  any secrets the token could read; force-push fixes to a clean
  branch.
- **Malicious dependency landed in `package-lock.json`:** revert the
  commit; run `npm audit --production`; deploy hotfix; reach out to
  `npm` to report.
- **CI runner compromised:** disable `pull_request_target` workflows
  (we don't use any — verify); rotate all secrets exposed to that
  runner.

---

## 9. Edge cases

- **Public fork raises PR with workflow change** — `pull_request`
  trigger (which Vocaband uses) runs from the fork's HEAD with
  read-only secrets; `pull_request_target` would be dangerous. We
  did not find any `pull_request_target` in the workflows. **Safe.**
- **Dependabot PR runs full CI with secret access** — Dependabot PRs
  in GitHub default to read-only secrets unless explicitly granted.
  **Safe** by default.
- **`workflow_dispatch` accidentally triggered by anyone** — limited
  by repository write access; OK.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Time to merge Dependabot PR | <3 days | 3-14 | >14 |
| `npm audit` HIGH+ CVEs in production | 0 | 1-2 | ≥3 |
| Mean PR review time | <24h | 24-72h | >72h |
| Backup success rate | 100% | 90-99% | <90% |
| CI green rate on main | >98% | 90-98% | <90% |

---

## 11. Self-critique

- We did not view the actual GitHub branch-protection rules — operator
  confirmation needed.
- We did not audit the contents of every `run:` block in every workflow
  — recommend a one-pass `grep -nE 'echo .*\\\$\\{\\{' .github/workflows/`.
- The R2 backup integrity has no automated restore test — recommend
  monthly restore-into-staging drill.
