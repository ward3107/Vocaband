# Vocaband — Enterprise QA Framework

> Autonomous QA architecture covering the full Vocaband stack: React 19 SPA, Cloudflare Worker proxy, Fly.io Express + Socket.io backend, Supabase Postgres (RLS), Gemini AI for OCR, and bilingual (EN/HE/AR) UX for Israeli schools (grades 4–9).
>
> This document is the **entry point** for the framework. Every other file in `docs/qa-framework/` slots into the map below and is referenced from here.

---

## 0.1 Document index

| #  | Module / Topic                          | File                                       | Owner discipline                        |
|----|------------------------------------------|--------------------------------------------|-----------------------------------------|
| 00 | Overview, methodology, scoring rubric   | `00-OVERVIEW.md` (this file)               | QA Architect                            |
| 01 | Authentication & session                 | `01-AUTH-MODULE.md`                        | Security QA + Frontend QA               |
| 02 | Class management (teacher)               | `02-CLASS-MANAGEMENT.md`                   | Functional QA                           |
| 03 | Assignment creation + custom words + OCR | `03-ASSIGNMENT-MODULE.md`                  | Functional QA + AI QA                   |
| 04 | Game modes & gameplay loop               | `04-GAME-MODES.md`                         | Functional QA + Perf QA                 |
| 05 | Live Challenge (real-time podium)        | `05-LIVE-CHALLENGE.md`                     | Functional QA + Realtime/WebSocket QA   |
| 06 | Quick Play (QR-join guest mode)          | `06-QUICK-PLAY.md`                         | Functional QA + Realtime QA             |
| 07 | Shop / economy / boosters                | `07-SHOP-ECONOMY.md`                       | Functional QA + Anti-abuse              |
| 08 | Retention (chests, streaks, comeback)    | `08-RETENTION-SYSTEMS.md`                  | Functional QA + Data Integrity          |
| 09 | Vocabulary data + audio pipeline         | `09-VOCABULARY-DATA.md`                    | Data QA + Perf QA                       |
| 10 | i18n / RTL / accessibility text          | `10-I18N-RTL.md`                           | UX QA + Accessibility                   |
| 11 | PWA / mobile / install                   | `11-PWA-MOBILE.md`                         | UX QA + Mobile QA                       |
| 12 | Backend API (Fly.io + Socket.io)         | `12-API-BACKEND.md`                        | API QA + Security                       |
| 13 | Infrastructure (Worker, Fly, Supabase)   | `13-INFRASTRUCTURE.md`                     | SRE / DevOps QA                         |
| 14 | Security & RLS deep-dive                 | `14-SECURITY-RLS.md`                       | AppSec / Offensive QA                   |
| 15 | Accessibility (WCAG 2.1 AA)              | `15-ACCESSIBILITY.md`                      | Accessibility Auditor                   |
| 16 | Cross-module cascade failure analysis    | `16-CROSS-MODULE-FAILURE.md`               | QA Architect                            |
| 17 | Disaster recovery scenarios              | `17-DISASTER-RECOVERY.md`                  | SRE + QA Architect                      |
| 18 | Release gate checklist                   | `18-RELEASE-GATES.md`                      | Release Engineering                     |
| 19 | Automation strategy & tool stack         | `19-QA-AUTOMATION-STRATEGY.md`             | Automation Engineer                     |
| 20 | Production readiness scorecard           | `20-PRODUCTION-READINESS-SCORECARD.md`     | QA Architect                            |

---

## 0.2 System under test (SUT) — block diagram

```
                            ┌──────────────────────────────────┐
                            │   Users                          │
                            │  • Teacher (auth: Google/OTP)    │
                            │  • Student (auth: class-code)    │
                            │  • Guest (Quick Play via QR)     │
                            └──────────────┬───────────────────┘
                                           │ HTTPS
                                           ▼
                  ┌────────────────────────────────────────────┐
                  │  Cloudflare Worker (worker/index.ts)        │
                  │  • Serves SPA static assets                 │
                  │  • Proxies /api/*    → Fly.io               │
                  │  • Proxies /socket.io/* → Fly.io (upgrade)  │
                  │  • Custom domains: www.vocaband.com,        │
                  │    auth.vocaband.com (Supabase)             │
                  └──────────────┬─────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────────┐
        ▼                        ▼                            ▼
┌──────────────────┐  ┌───────────────────────┐  ┌────────────────────────┐
│ React 19 SPA     │  │ Fly.io (server.ts)    │  │ Supabase (EU/Frankfurt) │
│ Vite build       │  │ • Express REST        │  │ • Postgres + RLS        │
│ Tailwind + motion│  │ • socket.io live      │  │ • Storage (audio)       │
│ supabase-js      │  │ • Gemini OCR proxy    │  │ • Auth (OAuth/OTP)      │
│ socket.io-client │  │ • Service-role admin  │  │ • Realtime (not used    │
│                  │  │   paths               │  │   for live challenge)   │
└──────────────────┘  └──────────┬────────────┘  └────────────────────────┘
                                 │
                                 ▼
                       ┌──────────────────────┐
                       │ Google AI (Gemini)   │
                       │ • OCR custom lists   │
                       │ • Sentence generator │
                       └──────────────────────┘
```

---

## 0.3 Severity matrix

| Severity   | Definition                                                                                                  | Examples                                                                                  | SLA to fix       |
|------------|--------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|------------------|
| **S1 — Critical**  | Loss of student data, security breach, PII exposure, payment loss, total outage. Cannot ship; rollback. | RLS bypass exposing another class's data; service-role key leak; XP economy zeroed; classroom unreachable. | <4h hotfix      |
| **S2 — High**      | Major flow broken for an entire role; significant data corruption recoverable manually.                | Teacher cannot create assignments; live challenge desync; game finish doesn't persist XP. | <24h            |
| **S3 — Medium**    | Single feature impaired; usable workaround.                                                             | One game mode crashes for empty word list; daily chest claim duplicates UI badge.         | <1 sprint       |
| **S4 — Low**       | Cosmetic / minor UX; localized strings; non-blocking layout.                                            | RTL misalignment in shop sheet; emoji medallion clipped on iOS Safari at 320px width.     | Backlog         |
| **S5 — Trivial**   | Nice-to-have polish.                                                                                    | Animation easing inconsistency; minor copy nit.                                           | Opportunistic   |

---

## 0.4 Priority × Severity matrix

|              | P0 (Now)            | P1 (This sprint) | P2 (Next sprint) | P3 (Backlog) |
|--------------|---------------------|------------------|------------------|--------------|
| **S1**       | ✅ Hotfix + RCA      | —                | —                | —            |
| **S2**       | ✅ Hotfix if regression of shipped feature | ✅ Default | —      | —            |
| **S3**       | —                   | ✅ If blocks UAT | ✅ Default       | —            |
| **S4**       | —                   | —                | ✅ If UX-flagged | ✅ Default   |
| **S5**       | —                   | —                | —                | ✅ Default   |

---

## 0.5 Risk register summary (from module files)

| Risk ID | Risk                                                                  | Module | Likelihood | Impact | Score (L×I) | Mitigation owner |
|---------|------------------------------------------------------------------------|--------|------------|--------|-------------|------------------|
| R-001   | RLS misconfigured → student reads other class data                    | 14     | 2          | 5      | 10          | Backend lead     |
| R-002   | Service-role key leaked from server.ts logs                           | 12,14  | 2          | 5      | 10          | DevOps           |
| R-003   | Socket.io disconnect storm during Live Challenge with 30+ students    | 05,12  | 4          | 4      | 16          | Realtime QA      |
| R-004   | Vocabulary data (6482 words) blocks main thread on low-end Android    | 09     | 4          | 3      | 12          | Perf QA          |
| R-005   | OCR upload fails silently on slow 3G; teacher loses prepared list     | 03     | 3          | 3      | 9           | Functional QA    |
| R-006   | XP / streak race condition in concurrent windows duplicates rewards   | 04,07  | 3          | 4      | 12          | Data Integrity   |
| R-007   | Hebrew/Arabic RTL flipping breaks game mode controls                  | 10     | 3          | 3      | 9           | UX QA            |
| R-008   | PWA stale cache pins old SPA version after deploy                     | 11,13  | 3          | 4      | 12          | DevOps           |
| R-009   | Live Challenge teacher closes tab → orphaned game state for kids      | 05     | 4          | 3      | 12          | Realtime QA      |
| R-010   | Quick Play guest spam (QR code shared on social) → unbounded sessions | 06,12  | 3          | 4      | 12          | Anti-abuse       |
| R-011   | Children's PII (names) appears in console logs / 3rd-party scripts    | 14     | 3          | 5      | 15          | Compliance       |
| R-012   | Supabase outage with no graceful degradation → blank screen for kids  | 13,17  | 2          | 5      | 10          | SRE              |
| R-013   | Custom audio R2 upload bypasses moderation → inappropriate audio      | 03,14  | 2          | 4      | 8           | Trust & Safety   |
| R-014   | i18n missing keys leak `en.fallback` text into HE/AR UI               | 10     | 4          | 2      | 8           | i18n owner       |
| R-015   | Save queue (`useSaveQueue`) drops mutations on slow 3G refresh        | 11     | 3          | 4      | 12          | Frontend QA      |

> Likelihood and Impact each scored 1–5. Score ≥ 12 = treat as **High** risk and add to release gate.

---

## 0.6 Methodology — how each module file is structured

Every module document follows the same 16-section template defined in the master prompt:

1. **Purpose** — what / who / why / criticality
2. **User flow mapping** — happy + alternate + failure + recovery
3. **Functional QA scenarios** — table with ID / Scenario / Steps / Expected / Severity / Priority
4. **Edge cases & failure injection** — data, behavior, infrastructure, AI
5. **Security QA** — exploitation paths + expected secure behavior
6. **Accessibility QA (WCAG 2.1 AA)**
7. **Responsive & device QA**
8. **Performance QA** — measurable thresholds
9. **Database integrity QA**
10. **API QA** — endpoint by endpoint
11. **State management QA**
12. **Observability & monitoring QA**
13. **QA automation strategy** — tooling per layer
14. **Production readiness score**
15. **QA success metrics** — measurable KPIs with thresholds
16. **Self-QA validation** — what was missed, then patched

---

## 0.7 Test ID naming convention

`<MODULE_PREFIX>-<CATEGORY>-<3-digit>` — e.g. `AUTH-FUNC-014`, `LIVE-SEC-003`, `SHOP-PERF-002`.

| Category | Code   | Meaning                            |
|----------|--------|------------------------------------|
| Func     | FUNC   | Functional scenario                |
| Edge     | EDGE   | Edge case / failure injection      |
| Sec      | SEC    | Security / abuse                   |
| A11y     | A11Y   | Accessibility                      |
| Resp     | RESP   | Responsive / device                |
| Perf     | PERF   | Performance / load                 |
| DB       | DB     | Database integrity                 |
| API      | API    | API contract                       |
| State    | STATE  | State management                   |
| Obs      | OBS    | Observability                      |

Module prefixes: `AUTH`, `CLASS`, `ASGN`, `GAME`, `LIVE`, `QP`, `SHOP`, `RET`, `VOCAB`, `I18N`, `PWA`, `API`, `INFRA`, `RLS`.

---

## 0.8 Production readiness scorecard (global)

| Dimension              | Score 0–5 | Notes                                                                                                      |
|------------------------|-----------|------------------------------------------------------------------------------------------------------------|
| Functional coverage    | 3         | Many flows covered ad-hoc; needs the test cases in this framework formalized in CI.                        |
| Security posture       | 3         | RLS is in place; pen-test docs exist (`SECURITY-OVERVIEW.md`); external pen-test still pending (operator). |
| Performance            | 3         | Lazy vocab and image opt; remaining 6482-word list mounts on low-end Android need budget guards.           |
| Accessibility (WCAG)   | 3         | `AccessibilityWidget`, RTL hooks, statement page exist; comprehensive screen-reader pass pending.          |
| Reliability / SRE      | 2         | Health check exists; no formal SLO/error-budget tracking yet; alerting incomplete.                         |
| Observability          | 2         | App-level logs only; no centralized error tracking enabled (Sentry panel exists but is opt-in).            |
| Disaster recovery      | 3         | DR docs exist (`DISASTER-RECOVERY.md`); RPO/RTO not yet measured under fire-drill.                         |
| Data integrity         | 4         | Supabase + RLS strong; save-queue + retry hardening in `useSaveQueueResilience`.                           |
| Internationalization   | 4         | HE/AR coverage strong for student flows (per `I18N-MIGRATION.md`); teacher flows partial.                  |
| Mobile UX              | 4         | PWA install banner, touch optimizations, in-page camera.                                                   |

**Overall readiness: 3.1 / 5 — “Beta-ready for pilots, needs hardening before MoE rollout.”**

The per-module scorecards in files 01–13 roll up into the final scorecard in `20-PRODUCTION-READINESS-SCORECARD.md`.

---

## 0.9 How to use this framework

1. **For a code review** — read the relevant module file and reference test-case IDs in PR description.
2. **For a release** — execute `18-RELEASE-GATES.md`; gate exit on green release checklist.
3. **For an incident** — start at `17-DISASTER-RECOVERY.md`, then drill into the failing module file.
4. **For onboarding QA hires** — read `00`, `14`, `15`, `19`, then any module they own.
5. **For test automation planning** — read `19-QA-AUTOMATION-STRATEGY.md` for priorities + tool stack.

---

## 0.10 Living document policy

- Every PR that ships a behavior change MUST update at least the module file(s) it touches.
- Every S1/S2 incident MUST add at least one regression test case to the affected module file.
- Quarterly review by QA lead; archive snapshot under `docs/quarterly-audit-<YYYY-MM>.md`.
- All test IDs are immutable once published — if a scenario changes, add a new ID and supersede the old one.
