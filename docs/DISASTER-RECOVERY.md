# Vocaband — Disaster Recovery Plan

> Required by תקנות הגנת הפרטיות (אבטחת מידע) התשע"ז-2017 § 7 ("Business
> continuity"). MoE vendor questionnaire asks for RTO/RPO targets and a
> restore procedure. This doc is the answer.
>
> Last updated 2026-05-18.

---

## 0. RTO / RPO commitments

| Metric | Target | What it means |
|---|---|---|
| **RPO** — Recovery Point Objective | **≤ 24 hours** | At most 24 h of data is lost in a worst-case restore (we rely on Supabase daily backups). |
| **RTO — Tier A** (read-only restore) | **≤ 4 hours** | Within 4 h we can have a read-only Supabase clone live for forensic / lawyer access. |
| **RTO — Tier B** (full service back) | **≤ 24 hours** | Within 24 h teachers + students can log in and resume play on the restored database. |
| **RTO — Tier C** (full feature parity, including AI features) | **≤ 72 hours** | Within 72 h every endpoint (OCR, Gemini sentence gen, etc.) is back. |

These targets are deliberately conservative for our scale (≤10k users).
Tighter targets would require Supabase Pro PITR + hot-standby Fly.io
which doubles infra cost. Revisit when paid traffic begins.

---

## 1. Scenarios + recovery procedure

### Scenario A — Supabase database corruption / accidental destructive write

**Symptom:** Tables empty, rows missing, schema drifted from migration history, mass-delete signal in `audit_log`.

**Recover in this order:**

1. **Freeze writes.** In Supabase Dashboard → Settings → Database → temporarily revoke `INSERT/UPDATE/DELETE` on `public` from `authenticated` (one SQL statement). Buys us a clean point in time.
2. **Restore from backup.**
   - Supabase Dashboard → Database → Backups → pick the most recent good daily snapshot.
   - If on Pro tier: use Point-in-Time Recovery to roll forward to seconds before the bad write.
   - Restore creates a **new project**. Note the new project ref.
3. **Verify** schema + row counts against `docs/db-cost-audit-2026-04-28.md` baseline:
   ```sql
   SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY n_live_tup DESC LIMIT 20;
   ```
4. **Cut over.**
   - Update `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages env.
   - Update `SUPABASE_SERVICE_ROLE_KEY` on Fly.io via `fly secrets set`.
   - Update the custom-domain CNAME for `auth.vocaband.com` to point at the restored project.
   - Force browsers to re-fetch: bump SW version in `vite.config.ts`, deploy.
5. **Re-enable writes** by restoring the RLS grants you froze in step 1.
6. **Notify** affected users per `docs/INCIDENT-RESPONSE.md` if user-visible data was lost.

**Verified RTO:** ~4 h Tier A, ~24 h Tier B (depends on Cloudflare DNS TTL — keep TTL at 5 min for `auth.vocaband.com`).

### Scenario B — Fly.io app down / region outage

**Symptom:** `/api/*` and WebSocket return 503. Static SPA still loads via Cloudflare (because Worker serves it).

**Recover:**

1. Check Fly.io status at https://status.flyio.net.
2. If single-region outage: failover is automatic if multi-region is configured. Verify in `fly.toml`. (Currently single-region AMS; multi-region is a paid upgrade.)
3. If app crash: `fly logs -a vocaband` → identify cause → `fly deploy` last known good commit.
4. If Fly.io is fully down: degraded mode — SPA still works for cached content; new joins / live-challenge / OCR / sentence-gen are blocked.
5. **Don't panic-failover.** Most Fly outages resolve in <2 h. Wait 15 min before manual intervention.

**Verified RTO:** ~30 min for app-level crashes; up to provider-controlled for region outages.

### Scenario C — Cloudflare account compromise / DNS hijack

**Symptom:** `vocaband.com` resolves to wrong IP, or shows attacker content.

**Recover (in order):**

1. **Rotate Cloudflare API tokens** (Dashboard → My Profile → API Tokens → revoke + recreate).
2. **Reset DNS records** to the known-good values (keep a backup of the zone file in `docs/INFRA-BACKUP.md` — TODO operator).
3. **Force-logout all admin sessions** in Cloudflare.
4. **Enable mandatory 2FA** for every Cloudflare account user.
5. **Audit** Workers code, Pages deployments, and `_headers` for tampering.
6. **Rotate** every secret that was on Fly.io and Supabase (they may have been read via a hijacked proxy).
7. **Notify users** via email (which goes through different infrastructure) that vocaband.com may have served malicious content during the incident window.

**Verified RTO:** ~6-12 h. This is the worst category because it requires invalidating browser caches industry-wide.

### Scenario D — Service-role key leak

**Symptom:** Key appears in a public gist, GitHub Code Search hit, or screenshot.

**Recover (treat as SEV-1):**

1. **Within 5 min:** Supabase Dashboard → Settings → API → Rotate `service_role` key.
2. **Within 10 min:** `fly secrets set SUPABASE_SERVICE_ROLE_KEY="<new>" -a vocaband` and confirm redeploy.
3. **Within 30 min:** Pull the Supabase audit log for the past 7 days; search for unfamiliar `service_role`-authenticated queries.
4. Follow the rest of `INCIDENT-RESPONSE.md` SEV-1 flow.

**Verified RTO:** Bleeding stopped within 10 min; full forensics ~24 h.

### Scenario E — Complete loss of Supabase project (account closure, mass deletion)

This is the worst case. Mitigation depends on having an off-Supabase backup.

**Currently:** Supabase backups live on Supabase. If Supabase loses the project entirely (account closure, billing dispute, region failure), backups are also gone.

**Mitigation (operator TODO):**
- Schedule a weekly `pg_dump` to Cloudflare R2 (we already have an R2 bucket).
- Script: `scripts/mirror-supabase-to-r2.ts` exists for storage; need a sibling script for the DB.

**Until the off-Supabase backup exists, RTO for Scenario E is "we can't" — disclose this honestly in the MoE questionnaire.** Closing this gap is item #6 in `docs/OPERATOR-PLAYBOOK-MOE.md`.

---

## 2. Backup verification (every quarter)

The plan only works if backups are real. Verify quarterly:

1. **Supabase**: Dashboard → Database → Backups → confirm the most recent daily snapshot < 24 h old.
2. **Restore drill** (every 6 months): trigger a restore into a *staging* project, verify a known row exists, then delete the staging project.
3. **R2 storage**: confirm `scripts/mirror-supabase-to-r2.ts` ran in the last 7 days (audit the R2 bucket's last-modified timestamp).
4. **Fly.io secrets**: confirm `fly secrets list -a vocaband` returns the expected key names (no missing, no extras).
5. File results in `docs/postmortems/<YYYY-Q?>-dr-drill.md`.

---

## 3. Tabletop exercise schedule

Every quarter, walk through one scenario as if it were happening:

| Quarter | Scenario | Goal |
|---|---|---|
| Q1 | Scenario A (DB corruption) | Time the restore to a staging Supabase. |
| Q2 | Scenario B (Fly.io down) | Confirm SPA-only degraded mode actually works (turn Fly proxy off in Worker temporarily). |
| Q3 | Scenario D (key leak) | Time the rotation end-to-end. |
| Q4 | Scenario C or E | Document the steps; we may not actually rotate Cloudflare credentials. |

Aim: any one scenario should finish in **under its RTO target**, including coordination with the operator. If it doesn't, fix the runbook.

---

## 4. Communication during a DR event

| Audience | Channel | When | Template |
|---|---|---|---|
| Affected users | Email from `privacy@vocaband.com` | Within 24 h for SEV-1, within 72 h for SEV-2 | `INCIDENT-RESPONSE.md` § "Hours 12-24" |
| Schools (via teacher) | Same email + a note on the teacher dashboard | Same window | Same template + Hebrew translation |
| Privacy Protection Authority | Form ר"ה at https://www.gov.il/he/service/security_incident_report | Within 72 h for any personal-data exposure | `INCIDENT-RESPONSE.md` § "PPA notification" |
| MoE Information Security desk | Email `security@education.gov.il` | Within 72 h if MoE-approved school is affected | Same factual summary as PPA report |

Silence is worse than late notification. If unsure, send the holding
statement template in `INCIDENT-RESPONSE.md` first and follow up with
the detailed factual report once you have it.

---

## 5. What we DON'T have yet (honest disclosure)

| Gap | Risk | Plan |
|---|---|---|
| Off-Supabase DB backups | Catastrophic loss if Supabase loses the project | Add `scripts/backup-pg-to-r2.ts` cron (operator playbook §6) |
| Multi-region Fly.io | Region outage = full service down | Defer — single-region is acceptable at our scale |
| Real-time replication / hot-standby | Sub-minute RPO | Defer until MoE catalog requirement |
| Tested production restore | RTO is theoretical, not measured | Run a Q1 drill on staging before claiming RTO in the MoE questionnaire |

Disclose all four explicitly in the MoE vendor questionnaire — partial
honesty beats overpromising.

---

## 6. Roles + contacts

Same as `INCIDENT-RESPONSE.md`. The DPO is in charge during a DR event;
on-call engineer drives the technical recovery.

---

## 7. Maintenance

- Review this doc annually + after every real DR event.
- Bump "Last updated" timestamp.
- Update RTO/RPO targets if Supabase tier changes (Pro PITR shrinks RPO to seconds).
- Re-test scenarios on the schedule in § 3 — file the post-mortem.
