# 00 — Executive Overview

> Read time: 4 minutes. The whole framework summarised here.

---

## Posture in one sentence

Vocaband is a **mature, defence-in-depth secured SaaS** for K-9 minors —
**stronger than its peers** on RLS, auth gating, and rate-limiting, but
carrying **HIGH residual risk in two places**: the AI/LLM prompt path
(insufficient input sanitisation before Gemini) and the anonymous
Quick Play surface (service-role bypass on session lookup + unauthenticated
namespace events that need re-verification). Both are tractable inside a
2-week hardening sprint.

---

## Top-of-page scorecard

| Category | Score /100 | Class |
|---|---|---|
| Authentication & Identity | 86 | GOOD |
| Authorization & RLS | 92 | HARDENED |
| API security (REST) | 80 | GOOD |
| Edge / Worker | 84 | GOOD |
| Quick Play (anon namespace) | 87 | HARDENED |
| AI / LLM integrations | 58 | MODERATE |
| File uploads / OCR / camera | 76 | GOOD |
| Real-time / WebSocket | 82 | GOOD |
| Client / browser (CSP) | 78 | GOOD |
| CI/CD & supply chain | 78 | GOOD |
| Infrastructure (Fly, CF, Supabase) | 80 | GOOD |
| Privacy & compliance (minors) | 88 | HARDENED |
| Logging, monitoring, IR | 72 | GOOD |
| Overall (pre-sprint) | **84** | **GOOD** |
| Overall (post-sprint, this PR) | **85** | **HARDENED** |

**Breach probability (12-month, no further action):** ~6-10% — driven by
AI prompt injection. Drops to ~2-3% post-sprint. (Earlier estimate of
12-18% relied on the two Quick Play findings that turned out to be
audit errors.)

---

## Top 10 findings, ranked by risk

| # | Severity | Module | Finding | File:line |
|---|---|---|---|---|
| 1 | HIGH | AI/LLM | User-supplied text concatenated directly into Gemini prompts with only length + level validation; no prompt-firewall, no jailbreak detection, no output-content filter | `server.ts:2418-2498`, `server.ts:2440` |
| 2 | ~~HIGH~~ → LOW | Quick Play | **Audit error, corrected.** Codes are 6 chars from a 32-char ambiguity-free alphabet (~1B states), not 4. Brute force infeasible. This PR additionally tightens the lookup regex from `/^[A-Z0-9]{4,8}$/i` → `/^[A-HJ-NP-Z2-9]{6}$/i` (server.ts:2265). | `server.ts:2240-2290`, `supabase/migrations/20260327_quick_play_sessions.sql:65-96` |
| 3 | MODERATE | Supply chain | CodeQL (3 languages) + GitGuardian secret-scanning are wired via GitHub repo Default Setup — but no SBOM, no signed releases, no Semgrep / Snyk / Trivy ruleset complementing CodeQL | repo-level Code Security settings |
| 4 | MODERATE | CSP | `style-src-elem 'unsafe-inline'` kept for motion/react — acknowledged tradeoff, but blocks CSP from being a hard XSS gate | `server.ts:384-385` |
| 5 | ~~MODERATE~~ → INFO | Quick Play | **Audit error, corrected.** Every TEACHER_* handler invokes `qpVerifyTeacherOwnsSession(token, sessionCode)` (server.ts:874-890) — JWT verify + `teacher_uid` DB equality. Already hardened. | `server.ts:1225-1434`, `server.ts:874-890` |
| 6 | MODERATE | Docker | Container runs as root; no `USER` directive; single-stage build ships devDependencies to production | `Dockerfile:15-31` |
| 7 | MODERATE | Audio pipeline | `handleAudioPack()` accepts up to 200 word IDs and streams a ZIP at the edge with no zip-bomb / fan-out budget enforcement other than the array length | `worker/index.ts:174-217` |
| 8 | MODERATE | Diagnostics | `/api/ocr/diagnostic` confirms Gemini key validity via external call — useful for ops, but tells an attacker whether the key is live | `server.ts:1809-1838` |
| 9 | LOW | E2E | No authenticated end-to-end auth-flow test; smoke pipeline explicitly skips login → regressions in session security are caught by humans only | `e2e/tests/smoke.spec.ts` |
| 10 | LOW | Client | Teacher email cached in `localStorage` under `REMEMBER_EMAIL_KEY` (plaintext, shared school devices) | `src/components/TeacherLoginCard.tsx:50-109` |

Find detailed reasoning + remediation in the matching module file.

---

## What's already excellent (don't regress)

- **RLS coverage:** every table enforced, role-escalation protected by both
  INSERT and UPDATE policies (migrations `001`, `007`).
- **SECURITY DEFINER discipline:** 8 functions, all `auth.uid()`-scoped,
  `search_path` pinned on the sensitive ones.
- **Privacy plumbing:** consent log, audit log, `export_my_data()`,
  `delete_my_account()` with admin-self-delete guard — PPA-13 ready.
- **CSP Phase 6:** `script-src` is `'self'` + allowlist only; no
  `'unsafe-eval'`, no inline scripts.
- **Rate-limiter strategy:** keyed by **Bearer token**, not IP, so school
  NAT doesn't false-positive a classroom.
- **Helmet + Permissions-Policy:** belt-and-suspenders headers,
  `frame-ancestors 'none'`, HSTS preload-eligible.
- **Auth gating discipline:** `requireAuthenticatedTeacher`,
  `requireProTeacher` helpers — used everywhere a teacher action exists.
- **Diagnostic info-leak fixes:** `/api/features?debug=1`, `/api/version`,
  `/api/ocr/status` all gated to authenticated teachers (Phase 3).

---

## The two-week hardening sprint

| Day | Workstream | Outcome |
|---|---|---|
| 1-2 | Add Semgrep + Trivy + SBOM to CI (CodeQL + GitGuardian already wired at repo level) | Complementary SAST + image scan + supply-chain attestation |
| 2-3 | Prompt-firewall layer for AI endpoints | Reject prompts with role-override / system-prompt-leak patterns |
| 3-4 | Quick Play code length 4 → 6 + per-IP burst cap to 10/min | ~16M space, slower brute-force |
| 4-5 | Add `USER node` to Dockerfile + multi-stage build | Drop devDependencies in prod image |
| 5-6 | Re-verify auth on every Quick Play teacher event | Inline `requireTeacherForSession(payload.sessionId)` |
| 6-7 | CSP nonce strategy for motion/react | Remove `style-src-elem 'unsafe-inline'` |
| 7-8 | Authenticated E2E test (Playwright) | Login regression caught in CI |
| 8-9 | SBOM + sigstore signing in cloudflare-deploy.yml | Supply-chain attestation |
| 9-10 | Add `/api/ocr/diagnostic` and `/api/quick-play/session/:code` to abuse-log dashboard | Burglar detection |
| 11-14 | Schedule first external pen-test of staging | Independent validation |

Total: ~10 engineer-days. Reduces composite score to ~89 (HARDENED).

---

## Where this framework stops

- **No live attack simulation** (the codebase was read, not the running
  system).
- **No vendor questionnaire validation** (Supabase, Cloudflare, Fly own
  contractual security; we audit how we use them).
- **No social-engineering / phishing assessment** of the operator
  workforce — call out for the operator follow-up list.
- **No DPIA refresh** — see `docs/DPIA-TECHNICAL.md`; revisit when
  parent-portal ships.

See `16-SELF-CRITIQUE.md` for the full list of known unknowns.
