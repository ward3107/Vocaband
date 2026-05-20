# 16 — Self-Critique

> What this audit got wrong, missed, or punted. The honest section.

---

## 0. Correction log

- **2026-05-20 (same day):** The initial PR-830 CI run revealed
  `CodeQL (javascript-typescript / actions / python)` and
  `GitGuardian Security Checks` running on every PR. Module 10
  originally marked both as MISSING — incorrect. These integrations
  are configured at the **GitHub repo level** (Code Security Default
  Setup + GitHub App), so a grep of `.github/workflows/` returned
  nothing. Modules 00, 10, 15 corrected; CI/CD score raised 70 → 78,
  composite 79 → 80. **Lesson:** repo-level controls live outside the
  workflow YAML; future audits must inspect GitHub Settings → Code
  security and analysis, and the installed GitHub Apps list.

- **2026-05-20 (same day, before merge):** When implementing the sprint
  from Module 15, deep code-read revealed TWO more audit errors:

  1. Quick Play session codes are **6 chars from a 32-char ambiguity-
     free alphabet** (~1B states), not 4 chars × 36 alphanumeric (~1.6M).
     Code: `public.generate_session_code()` in
     `supabase/migrations/20260327_quick_play_sessions.sql:65-96`.
     Brute-force concern was overblown by ~1000× in the first draft.
  2. Every `QP_EVENTS.TEACHER_*` handler **already** verifies teacher
     identity via `qpVerifyTeacherOwnsSession(token, sessionCode)`
     (server.ts:874-890) — JWT verify + `teacher_uid` DB equality.
     The HIGH-severity "may be unverified" flag was wrong.

  Modules 00, 05, 13 (chain 2), 15 corrected; Quick Play module score
  raised 64 → 87 (HARDENED). **Lesson:** grep can map names but not
  semantics; high-severity findings in code-heavy modules need a
  full handler-body read before being graded. The `Explore` agent
  doing deep code-walks before the audit is finalized would have
  caught both at draft stage.

- **2026-05-20 (deployment day):** When the operator ran `fly deploy`
  to ship PR #833's CF-only ingress middleware, the deploy succeeded
  but the middleware never enforced. Five rounds of debugging
  revealed three compounding causes:

  1. The operator's local clone was on branch
     `claude/fillblank-sentences`, not `main` — so none of the four
     merged PRs were in the deployed image.
  2. `fly deploy` without `-c fly.toml` silently used Fly defaults
     (internal_port=3000 instead of our 3002), which is reported as
     `Validating --config path unset--` in the deploy output.
  3. After fixing #2, the second deploy was a no-op for machine
     config because the image SHA was unchanged and Fly skipped the
     machine update step (output said `Cleared lease` not `update
     succeeded`).

  Resolved by `git checkout main && git pull && fly deploy
  --strategy immediate --no-cache -c fly.toml --app vocaband`. Live
  verification confirmed enforcement: `403 Forbidden` from direct
  origin probe, `200 OK` from CF-fronted path.

  **Lessons for future ops runbooks:**
  - Document the explicit `-c fly.toml` flag in every Fly command
    we publish; the silent default-fallback is a real footgun.
  - Always tell the operator to verify `git branch --show-current`
    before deploying.
  - The `[cf-ingress] enforcement enabled` boot log is the canonical
    success signal — make that the test, not the deploy output.
  - When Fly's "no diff detected" optimisation skips the machine
    update, `--strategy immediate` or `--no-cache` forces a fresh
    rollout.

---

## 1. Methodology limits

This audit is a **code-and-config review** of a snapshot at 2026-05-20.
It is **not**:

- a live penetration test (no traffic sent against staging or prod).
- a vendor audit (Supabase, Cloudflare, Fly, Google AI, Anthropic each
  have their own posture which we trust contractually).
- a social-engineering assessment (the operator's phishing resistance
  was not exercised).
- a regulatory legal opinion (lawyer + DPO have separate workstreams).
- a chaos-engineering drill (we read disaster scenarios; we didn't
  rehearse them).

A live pen-test on staging (recommended in Sprint 2) is the natural
sequel.

---

## 2. Files / paths not fully read

We grep-scanned but did not exhaustively read:

- `server.ts` — read ~30% (1000 of ~3200 lines). Specifically not
  read: the Bagrut endpoints (`/api/generate-bagrut`, `/api/submit-bagrut`,
  `/api/student-bagrut/:id`), the per-event handlers for `QP_EVENTS.
  TEACHER_*`, and the `isOriginAllowed` helper.
- `worker/index.ts` — read the proxy logic + audio-pack + lang
  rewrite shell; did not read `localizeHtmlResponse` body.
- `src/worksheet/` — listed only; the PDF/Word render path is the
  highest-risk un-audited area.
- `src/errorTracking.ts` — referenced; PII scrubber config not opened.
- Half the `supabase/migrations/` (164 files) — only the named
  security-relevant migrations + `010_privacy_compliance.sql` were
  read end-to-end.
- `e2e/tests/*` beyond `smoke.spec.ts` — checked existence, not
  content.
- `vite.config.ts` (30358 chars) — not opened; `sourcemap`
  prod-setting unconfirmed.
- `.env.production` — opened; one line.
- `eslint.config.js` — opened; no security plugins.
- `tools/` — listed only.

For each, the **next reviewer should pair-walk one screenful** before
adding new endpoints to those areas.

---

## 3. Findings of uncertain confidence

Findings labelled with confidence MEDIUM or LOW in the module
maturity tables are the ones to verify before relying on them.

The most consequential MEDIUM-confidence items:

1. **`QP_EVENTS.TEACHER_*` handler auth** (module 05). We *inferred*
   from grep that they live on the anon namespace. We did not confirm
   each handler re-verifies teacher identity. **Action P0.**
2. **Worksheet generator template engine** (module 07). We do not
   know whether AI strings ever land in an HTML render path. **Action P1.**
3. **Sentry PII scrubber** (module 12). Configuration not read.
   **Action P1.**
4. **`isOriginAllowed` CORS pattern** (module 03). Not directly
   opened. **Action P2.**
5. **Service-worker scope and cache strategy** (module 09). Not
   directly opened. **Action P2.**

---

## 4. Attack chains we may have missed

The chain catalogue (module 13) is illustrative, not exhaustive. Chains
not modelled but plausible:

- **OAuth open-redirect via Supabase** if the project's redirect
  allowlist is loose. (Operator concern, not code.)
- **Quick Play to authenticated namespace pivot.** If a teacher
  account is compromised and the teacher also hosts a Quick Play
  session, can the attacker tie the two together to learn things
  about the teacher's students? Probably no — but un-modelled.
- **Race conditions in `award_reward` / shop purchase paths.** The
  `009_atomic_shop_purchase.sql` migration suggests an atomicity fix
  shipped — we did not verify the *new* version is race-free under
  load.
- **Time-based attacks on `is_teacher_allowed`.** If the function's
  query against `teacher_allowlist` is non-constant-time and an
  attacker can measure (network-side), email enumeration becomes
  possible. Low likelihood (one-shot signup; not an oracle).
- **Bagrut answer-key tampering during PDF generation.** Not modelled;
  see file paths above.
- **Anonymous → teacher pivot via a malformed JWT.** Should be
  impossible (Supabase signs the role claim) but worth a Burp probe.

---

## 5. Assumptions we baked in

- **The operator follows `docs/operator-tasks.md`.** Many controls live
  there; we did not audit operator behaviour.
- **Cloudflare, Supabase, Fly are not nation-state compromised.** A
  vendor compromise is in `docs/DISASTER-RECOVERY.md`; we don't
  underwrite the providers.
- **The DPO and lawyer have separate workstreams.** The PPA-13 / MoE
  legal posture is summarised in `docs/MOE-COMPLIANCE-BRIEF-HE.md`;
  this audit doesn't substitute for counsel.
- **The npm registry is not currently compromised** for the dependency
  set we shipped. Supply-chain assessment in module 10 is moot if
  the registry itself is compromised — that's a wider industry concern.
- **The CSP `report-uri` will be added.** Several controls (CSP
  monitoring, output-content lint) lean on it.

---

## 6. What the next reviewer should test first

If you have one day:

1. Pair-walk every `socket.on(QP_EVENTS.TEACHER_*)` handler in
   `server.ts` — confirm teacher identity is re-verified inside, not
   trusted from the payload.
2. Open `src/worksheet/` — read every template; assert AI strings are
   escaped.
3. Open `src/errorTracking.ts` — confirm `beforeSend` strips emails
   from event messages.
4. Open `isOriginAllowed` — confirm pattern is tight.
5. Run `scripts/security-pen-test.sh` against staging — does it pass?
6. Verify on Cloudflare: WAF rules, Bot Fight Mode, audit log
   subscription.
7. Verify on Supabase: OAuth redirect-allowlist contains only
   Vocaband origins; 2FA on operator accounts.

If you have one week, do everything in section 4 of this file plus the
prompt-injection garak run against staging.

---

## 7. What this framework should not be used for

- It is **not a marketing artefact**. Don't paste the scorecard into a
  sales deck; let an external auditor's report play that role.
- It is **not a regulatory submission**. PPA-13 / MoE expect
  independent assessment.
- It is **not a substitute for live pen-testing**. It is a *map* of
  where to point the pen-test.
- It is **not a one-time deliverable**. Refresh quarterly (full) +
  monthly delta (changed modules) at minimum.

---

## 8. Acknowledged personal blind spots

I read the code statically. I did not run it, observe it under load,
or watch it fail. Static analysis missed:

- **Runtime configuration** — what helmet actually emits on the live
  origin. Verify via `curl -I https://www.vocaband.com/api/health`.
- **Race conditions** — concurrent reads/writes under realistic load.
- **Latency-sensitive paths** — e.g., does the rate-limiter add
  noticeable per-request latency at 5000 sockets?
- **Real attacker behaviour** — adversaries adapt; this audit is a
  snapshot.

The biggest meta-risk: **complacency**. A scorecard of 79 is GOOD —
not "done". Re-run the framework quarterly; pair with external
auditors annually.

---

Final note: the strongest signal in this audit is how much was
*already* done well. RLS, helmet, CSP Phase 6, audit/consent logs,
retention cleanup, rate-limit keying by token, anonymous-user
lifecycle, EU residency, R2 backups — these are all mature decisions.
The sprint recommendations are about closing the last 15-20% to reach
HARDENED, not patching critical exposure.
