# 14 — Disaster Scenarios

> What if everything goes wrong on the same day? Tabletop the worst
> cases so the operator playbook is muscle memory, not improv.
>
> See also `docs/DISASTER-RECOVERY.md` for the operational runbook.

---

## Scenario A: Supabase project compromise

**Trigger.** Adversary obtains Supabase dashboard credentials (phishing
+ MFA bypass, or stolen session). Adds a malicious migration, exfiltrates
the DB.

**Detection.**
- Supabase audit log: unfamiliar IP/ASN dashboard login.
- `pg_policies` count drops or `relrowsecurity=false` appears on a
  table → CI guard fires (after the recommended addition in module 02).
- Anomalous outbound from Supabase metrics.

**Containment.**
1. Operator changes Supabase password + revokes all sessions.
2. Disable the `service_role` key; mint a new one; redeploy Fly with
   the new key.
3. Run `pg_dump` snapshot for forensics; pause writes.
4. Restore from R2 backup to a **new** project; flip DNS for
   `auth.vocaband.com`.

**Recovery time targets.**
- Detection-to-containment: 1h.
- Containment-to-restore: 4h (R2 → fresh Supabase project).
- Restore-to-students-playing: 8h.

**Communications.**
- DPO + lawyer engaged.
- PPA-13 / GDPR 72h notification clock starts.
- Schools notified within 12h with status page; parents within 48h
  via school.

---

## Scenario B: Cloudflare account takeover

**Trigger.** Phished Cloudflare admin → DNS records swapped to attacker
infra; Workers code replaced.

**Detection.**
- Cloudflare audit log alert (operator subscription).
- Customer reports: "site shows wrong content".
- Sentry sees zero clients (because traffic doesn't hit us).

**Containment.**
1. Operator regains CF account (recovery codes / support escalation).
2. Revert DNS records; restore the legitimate Worker.
3. Rotate CF API tokens used in `cloudflare-deploy.yml`.

**Recovery time targets.**
- CF account recovery: 1-24h depending on support.
- DNS propagation post-revert: 5-60min (low TTL recommended).

**Mitigation pre-incident.**
- CF account has FIDO2 hardware-key MFA.
- Registrar (separate provider) has independent 2FA + registry lock.
- Cloudflare audit-log webhooks fire on critical events.

---

## Scenario C: Ransomware on operator laptop

**Trigger.** Operator clicks a malicious doc, ransomware encrypts the
laptop including `~/.config/flyctl`, `~/.npmrc`, `.env.local`,
SSH keys, browser session cookies.

**Detection.**
- EDR alert (assume present on operator's machine).
- File-modification anomaly.
- Unable to access work files.

**Containment.**
1. Isolate the laptop (airplane mode).
2. Rotate every credential the laptop touched:
   - Fly API tokens
   - Cloudflare API tokens
   - Supabase service-role key + dashboard password
   - GitHub PAT
   - npm token
3. Reimage laptop.
4. Restore from cloud backup.

**Recovery time targets.**
- Credential rotation: 2-4h.
- Laptop reimage: 4-8h.
- Total ops downtime: 1 working day.

**Mitigation pre-incident.**
- FileVault / BitLocker on disk.
- 1Password or similar for credential vault (encrypted, recoverable).
- Cloud backups of source-of-truth docs.
- No long-lived API tokens in `~/.bash_history` or unencrypted files.

---

## Scenario D: Malicious npm dependency lands in production

**Trigger.** Trusted transitive dep updated to a compromised version.
Dependabot opens PR; reviewer approves; CI passes (`npm audit` lacks
zero-day signature); Fly auto-deploys.

**Detection.**
- Sentry: unusual outbound (egress to attacker host).
- Fly metrics: process CPU/memory anomaly.
- Cloudflare WAF: requests/sec abnormal on Fly origin.
- Crowdsourced vuln feed (Snyk, socket.dev) flags within hours.

**Containment.**
1. Revert the offending commit; `git revert <sha>`; push to main; Fly
   auto-deploys clean.
2. Pin the affected package to the last-known-good version via
   `overrides` in `package.json`.
3. Rotate any secret exposed to the prod env during the malicious
   window: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`,
   `ANTHROPIC_API_KEY`, `SUPABASE_JWT_SECRET`.
4. Investigate `audit_log` for service-role-driven changes during the
   window.
5. If data exfiltrated → PPA-13 reportable.

**Recovery time targets.**
- Detection: depends on monitoring. With socket.dev: <24h. Without: days.
- Revert + rotate: 1-2h.

**Mitigation pre-incident.**
- CodeQL + Semgrep in CI.
- socket.dev behavioural review.
- 2-reviewer rule for `package*.json` changes (CODEOWNERS).
- Fly egress allowlist (host firewall).

---

## Scenario E: AI provider compromised, returns malicious content

**Trigger.** Google AI / Anthropic infrastructure compromised;
attacker injects malicious payloads into responses to specific
prompts.

**Detection.**
- Output-content lint: AI responses containing `<script>`, `javascript:`,
  control chars (recommended in module 06).
- Provider security bulletin.

**Containment.**
1. Disable the AI feature flag (`/api/features` returns
   `aiSentences:false`).
2. Switch provider for endpoints that support fallback
   (`/api/generate-sentences` has both).
3. If content reached students: catalog affected assignments, recall.

**Recovery time targets.**
- Feature-flag flip: minutes.
- Provider failover for fallback-supporting endpoints: minutes.
- Sole-provider endpoints: dark until provider remediates.

**Mitigation pre-incident.**
- Multi-provider support for critical endpoints.
- Output-content firewall.
- Gemini `responseSchema` JSON mode where supported.

---

## Scenario F: GitHub Actions / npm token theft

**Trigger.** Phished GitHub maintainer → PAT leaked → attacker pushes
to `main` directly (bypassing branch protection only if admin role).

**Detection.**
- GitHub audit log: unfamiliar push to `main`.
- Force-push on `main` (should never happen).
- New collaborator added without operator action.

**Containment.**
1. Revoke all PATs in GitHub Settings.
2. Re-issue 2FA.
3. Force-push to revert; if attacker disabled force-push protection,
   restore from a fork or local clone.
4. Rotate every secret accessible to CI: Cloudflare, Supabase, R2.

**Mitigation pre-incident.**
- All maintainers on FIDO2 keys.
- Branch protection: require PR + review + status checks + no admin
  bypass.
- PAT minimum scope.
- GitHub audit log alerts → Slack.

---

## Scenario G: DDoS during MoE certification week

**Trigger.** A "competitor" (or anonymous troll) launches L7 DDoS
during a public demo / MoE evaluation.

**Detection.**
- Cloudflare analytics: traffic spike from N ASNs.
- Sentry: 5xx spike.

**Containment.**
1. Cloudflare "Under Attack" mode (managed challenge for all
   non-allowlisted traffic).
2. Tighten WAF rate limits.
3. Worker-level rate limit on `/api/quick-play/session/:code` reduced
   to 10/min/IP.

**Recovery time targets.**
- Flip Under Attack: <5min.
- Restore normal mode after attack subsides: hours.

**Mitigation pre-incident.**
- Cloudflare Pro plan (or Enterprise for guaranteed SLA).
- WAF "managed challenge" rules pre-staged.
- Test the "Under Attack" toggle quarterly so the operator's muscle
  memory works under pressure.

---

## Scenario H: Insider threat — disgruntled engineer

**Trigger.** A contributor (current or recently departed) with prior
write access misuses retained access or a stolen credential.

**Detection.**
- Audit log shows access pattern outside normal hours.
- New commits to a branch from an unexpected location.

**Containment.**
1. Revoke all access: GitHub, Supabase dashboard, Fly, Cloudflare, R2.
2. Rotate every secret they could have read.
3. Snapshot the repo + DB; consult lawyer if intent suspected.

**Mitigation pre-incident.**
- Departure checklist: revoke all access, rotate shared credentials.
- Least-privilege from day one: most contributors don't need prod
  access.
- Two-person rule for production deploys (PR review).

---

## Scenario I: Total Fly.io regional outage

**Trigger.** Fly's Frankfurt region goes dark for hours.

**Detection.**
- Fly status page.
- Cloudflare Worker returns upstream 5xx.

**Containment.**
1. Status page banner ("Live Challenge temporarily unavailable").
2. Direct teachers to async modes (which don't need Fly — they hit
   Supabase directly).
3. If outage extends, redeploy Fly app to alternate region.

**Recovery time targets.**
- Single-region outage: typically Fly resolves within hours.
- Failover to alternate region: 1-2h with prepared playbook.

**Mitigation pre-incident.**
- Documented `flyctl regions set` runbook.
- Health-check endpoint already in place.
- Async game modes don't depend on Fly (they go Supabase-direct).

---

## Quarterly tabletop calendar

| Quarter | Scenario | Lead |
|---|---|---|
| Q1 | A (Supabase compromise) | DPO + Eng |
| Q2 | D (Supply-chain) | Eng |
| Q3 | C (Operator laptop) | Operator |
| Q4 | B (Cloudflare takeover) | Operator + Eng |

Each tabletop: 90-minute session, walk the runbook end-to-end on a
staging environment, log gaps in `docs/operator-tasks.md`.
