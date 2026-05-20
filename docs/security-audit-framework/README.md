# Vocaband — Enterprise Cybersecurity Audit Framework

> Red team / Blue team / Security architecture intelligence — produced 2026-05-20.
>
> Branch: `claude/security-audit-framework-fExZE`
> Operating mode: **elite attacker + elite defender, simultaneously**.

---

## What this framework is

A forward-looking offensive + defensive security assessment of the Vocaband
platform — module by module — with attacker reasoning, exploit paths,
detection engineering, automated testing strategy, and incident readiness.

This **does not replace** existing point-in-time audits — it complements them:

| Existing artefact | Role | This framework adds |
|---|---|---|
| `docs/SECURITY-OVERVIEW.md` | TL;DR posture page | Red-team perspective, attack chains |
| `docs/security-audit-2026-04-28.md` | Phase 1+2 findings | Forward-looking threats + KPIs |
| `docs/security-phase3-2026-04-28.md` | CSP + secrets sweep | Continuous-monitoring blueprint |
| `docs/qa-framework/14-SECURITY-RLS.md` | RLS test matrix | Adversarial RLS abuse chains |
| `docs/SECURITY-SELF-TEST.md` | DIY pen-test runbook | Automated tooling integration |
| `scripts/security-pen-test.sh` | 4-check RLS probe | Extended attacker playbook |
| `docs/DISASTER-RECOVERY.md` | DR runbook | Breach-economics + recovery time targets |

The framework's value is **the lens, not the data**: same code, viewed
through an attacker's eyes.

---

## How to read it

1. **Start with `00-OVERVIEW.md`** — executive summary + scorecard.
2. **Per-module deep-dives** — 12 modules covering the full stack.
3. **Cross-cutting** — attack chains, disaster scenarios, KPIs.
4. **Self-critique** — what this audit missed and how to find it.

Each module follows the same 13-section template (auth attacks, injection,
infra attacks, AI/LLM attacks, browser attacks, file-upload attacks, testing
strategy, tooling, architecture review, DevSecOps, monitoring, IR, edge cases).
Where existing docs already cover a section comprehensively (e.g. RLS in
module 02), this framework links rather than duplicates.

---

## File map

| File | Module | Risk class |
|---|---|---|
| [00-OVERVIEW.md](./00-OVERVIEW.md) | Executive summary + scorecard | — |
| [01-AUTH-IDENTITY.md](./01-AUTH-IDENTITY.md) | Authentication, session, OAuth | S1 |
| [02-AUTHORIZATION-RLS.md](./02-AUTHORIZATION-RLS.md) | RLS, RBAC, role escalation | S1 |
| [03-API-BACKEND.md](./03-API-BACKEND.md) | Express REST surface | S1 |
| [04-EDGE-WORKER.md](./04-EDGE-WORKER.md) | Cloudflare Worker | S2 |
| [05-QUICK-PLAY-ANON.md](./05-QUICK-PLAY-ANON.md) | Anonymous-user attack surface | S1 |
| [06-AI-LLM.md](./06-AI-LLM.md) | Gemini + Claude prompt-injection | S1 |
| [07-UPLOADS-MEDIA.md](./07-UPLOADS-MEDIA.md) | OCR, camera, audio pipeline | S2 |
| [08-REALTIME-WEBSOCKET.md](./08-REALTIME-WEBSOCKET.md) | socket.io security | S1 |
| [09-CLIENT-BROWSER.md](./09-CLIENT-BROWSER.md) | XSS, CSP, storage, PWA | S2 |
| [10-CICD-SUPPLY-CHAIN.md](./10-CICD-SUPPLY-CHAIN.md) | GitHub Actions, npm, Docker | S1 |
| [11-INFRASTRUCTURE.md](./11-INFRASTRUCTURE.md) | Fly.io, Cloudflare, R2, Supabase | S2 |
| [12-PRIVACY-COMPLIANCE.md](./12-PRIVACY-COMPLIANCE.md) | Minors data, PPA-13, MoE | S1 |
| [13-CROSS-SYSTEM-ATTACK-CHAINS.md](./13-CROSS-SYSTEM-ATTACK-CHAINS.md) | Multi-stage breach scenarios | — |
| [14-DISASTER-SCENARIOS.md](./14-DISASTER-SCENARIOS.md) | Ransomware, supply-chain, AI compromise | — |
| [15-SECURITY-READINESS-SCORECARD.md](./15-SECURITY-READINESS-SCORECARD.md) | Final scores + breach probability | — |
| [16-SELF-CRITIQUE.md](./16-SELF-CRITIQUE.md) | What this audit missed | — |

---

## Methodology

- **Evidence-based.** Every finding cites a file path + line. No
  hand-wavy "you might want to...".
- **Attacker-first.** We assume hostile, automated, persistent adversaries
  — students with Burp Suite, abusive teachers, nation-state grade
  scanners hitting the public surface, and curious minors.
- **Defender-second.** Each attack has a paired blue-team control:
  detection signal, alerting threshold, IR playbook entry.
- **Severity rubric.**

  | Tier | Definition | Example |
  |---|---|---|
  | **CRITICAL** | Active mass exploitation possible today | RLS bypass on minors' PII |
  | **HIGH** | Single-bug catastrophic compromise | Service role key in client |
  | **MODERATE** | Requires combination or insider access | Logged token preview + log access |
  | **LOW** | Defence-in-depth gap, hardening | Missing SBOM |
  | **INFO** | Posture observation | "Helmet version is current" |

- **Confidence rubric.** HIGH = code-confirmed; MEDIUM = inferred from
  config/docs; LOW = theoretical pattern.

---

## How to extend this framework

1. **New module?** Copy any per-module file, adjust the title, keep the
   13-section structure intact so cross-module diffing stays meaningful.
2. **Refresh cadence:** quarterly full re-audit, monthly delta
   (changed migrations + new dependencies + new endpoints).
3. **Pen-test cadence:** annual external + on every major release.
4. **Threat-model refresh:** when adding a new trust boundary (e.g.
   parent app, payment, new MoE integration).

---

## Stewardship

- **DRI:** Application security engineer (currently the founding eng).
- **Reviewers:** External pen-tester (annual), DPO, legal counsel for
  PPA-13 / MoE compliance.
- **Escalation:** Security incidents → `docs/INCIDENT-RESPONSE.md`.
- **Customer-facing:** see `/.well-known/security.txt` + `docs/SECURITY.md`.
