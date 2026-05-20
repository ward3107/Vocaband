# 17 — Disaster Recovery (DR) Scenarios

> Companion to `docs/DISASTER-RECOVERY.md` and `docs/INCIDENT-RESPONSE.md`. Defines expected behavior when a hard dependency fails.

---

## 1. RPO / RTO targets

| Scenario                          | RPO (data loss budget)         | RTO (recovery time budget)              |
|-----------------------------------|--------------------------------|-----------------------------------------|
| Total Supabase outage             | 0 (cached writes via save queue) | 30 min |
| Single-region Fly outage          | 0                              | 5 min (DNS failover or banner)          |
| Cloudflare incident               | 0 (existing PWA users continue) | 1h                                      |
| R2 outage                         | 0 audio (cached on client)     | 1h                                      |
| Gemini outage                     | 0 (no critical dependency)     | n/a (degraded features only)            |
| DDoS                              | 0                              | 5 min (WAF rule applied)                |
| Database corruption (single-record) | < 24h (last backup)            | 1h                                     |
| Database corruption (catastrophic) | < 24h (last backup)            | 4h via PITR + restore                  |

---

## 2. Scenario-by-scenario response

### 2.1 Supabase down (entire project)

**Detect:** uptime monitor + Sentry spike + manual report.

**Response (within 5 min):**
1. Banner deploy via Cloudflare Worker: "We are experiencing a service issue."
2. Verify in Supabase status page; open Supabase support ticket.
3. Disable new student signups (block /api/student/login at Worker).
4. Confirm save-queue is functioning for active users.

**Recovery:**
1. Supabase returns; cached writes flush automatically.
2. Smoke test critical paths.
3. Remove banner.
4. Post-incident review within 7 days.

### 2.2 Fly.io region outage

**Detect:** uptime monitor; Live Challenge errors.

**Response:**
1. Scale to alternate Fly region (if pre-warmed).
2. Update DNS / Fly app routing.
3. Cloudflare Worker may route to backup origin via env var swap.

**Recovery:**
1. Once primary back, drain alternate.
2. Validate socket continuity.

### 2.3 Cloudflare incident

**Detect:** site unreachable.

**Response:**
1. Confirm via Cloudflare status.
2. Wait it out — limited options unless alternative DNS already provisioned.
3. Communicate via status page (hosted off-Cloudflare).

### 2.4 R2 outage

**Detect:** audio 404 spikes.

**Response:**
1. Switch audio URL prefix to Supabase Storage fallback.
2. Confirm Service Worker continues serving cached audio for active users.

### 2.5 Gemini outage

**Detect:** /api/ocr 5xx rate.

**Response:**
1. Hide "Upload photo" CTA temporarily via feature flag.
2. Sentence Builder uses pre-vetted bank only.
3. Custom audio queued for retry.

### 2.6 DDoS

**Detect:** traffic anomaly in Cloudflare; 4xx/5xx spike.

**Response:**
1. Enable Cloudflare "I'm Under Attack" mode.
2. Tune WAF; add rate limits for offending patterns.
3. Block known bad ASNs if necessary.

### 2.7 Database corruption (one record)

**Detect:** user report, audit log anomaly.

**Response:**
1. Capture current state.
2. Read latest backup; identify the record.
3. Patch via service-role with audit entry.
4. Add regression test.

### 2.8 Database corruption (catastrophic)

**Detect:** wide-scale errors, audit anomalies.

**Response:**
1. Freeze writes via maintenance mode.
2. Restore from PITR to a parallel project.
3. Validate.
4. Switch DNS/connection to new project.
5. Post-incident review + RCA.

### 2.9 Mass account compromise (credential leak)

**Detect:** Have-I-Been-Pwned, social media, login pattern anomalies.

**Response:**
1. Force password / session reset for affected accounts.
2. Notify users.
3. Investigate scope.
4. File breach notification per local law if PII involved.

### 2.10 Live Challenge mass disconnect

**Detect:** disconnect spike > 5%.

**Response:**
1. Inspect Fly memory + CPU.
2. Scale up.
3. Toggle feature flag to limit new sessions until stable.
4. Communicate via in-app banner.

---

## 3. Drill schedule

| Drill                              | Cadence         | Owner            |
|-----------------------------------|------------------|------------------|
| Supabase failover (read-only mode)| Quarterly        | DevOps           |
| Backup restore                     | Quarterly        | DevOps + DB      |
| DDoS WAF rule application          | Semi-annual      | DevOps           |
| Pen-test                           | Annual           | External         |
| Incident-response tabletop         | Semi-annual      | Eng leadership   |
| Save-queue resilience              | Per release      | QA               |

---

## 4. Communication channels

- **Internal**: dedicated Slack channel + paging (PagerDuty/equivalent).
- **External — teachers**: status page (off-Cloudflare host), email via Resend.
- **External — parents** (if relevant): via teachers.
- **Regulatory**: as required by Israeli Privacy Protection Law + MoE incident reporting.

---

## 5. Post-incident review template

1. Timeline (when, what, who).
2. Detection delay.
3. Customer impact.
4. Root cause.
5. Contributing factors.
6. Action items + owners + due dates.
7. Update of risk register.
8. New test cases added to this framework.

---

## 6. Self-QA validation

**Missed initially:**
- Mass account compromise scenario — added §2.9.
- Live Challenge mass disconnect — added §2.10.

**Dangerous assumptions:**
- "Backups will work on first restore" — only true if drilled.
- "Cloudflare is highly available" — they have incidents too; document fallback plan.

**Hidden failures:**
- Status page itself hosted on the failing infra — must be off-Cloudflare.
- Paging only working from corporate Wi-Fi — must work from mobile.
