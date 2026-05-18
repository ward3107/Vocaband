# Quarterly internal audit — <YYYY-Qn>

> Copy this file to `docs/quarterly-audit-<YYYY-Qn>.md` and fill it in.
> Triggered by the calendar reminder in `docs/OPERATOR-PLAYBOOK-MOE.md`
> Task 7. Total time: ~30 minutes if nothing has drifted.

| Field | Value |
|---|---|
| Quarter | <YYYY-Qn> |
| Date run | <YYYY-MM-DD> |
| Auditor (operator) | <name> |
| Previous audit | `docs/quarterly-audit-<previous>.md` (or "first audit") |

---

## 1. Dependency scan (`npm audit`)

```
$ npm audit --omit=dev
```

- Total advisories: <n>
- HIGH or CRITICAL: <n>

| Severity | Package | CVE | Action |
|---|---|---|---|
| | | | |

If any HIGH/CRITICAL: open a GitHub issue tagged `security-quarterly-<YYYY-Qn>`, patch within 30 days.

---

## 2. Pen-test script (`scripts/security-pen-test.sh`)

```
$ SUPABASE_URL="https://auth.vocaband.com" \
  ANON_KEY="sb_publishable_..." \
  APP_URL="https://www.vocaband.com" \
  ./scripts/security-pen-test.sh
```

Expected: `Results: 19 passed, 0 failed.` (17 RLS + DB gates, plus checks 17+18 for audit-log immutability if Operator Task 1 of the playbook is applied.)

- Result: <n passed, n failed>
- Any failures: <copy the failure lines here>

If any failure: that gate is open. Stop, fix, re-run. Do not pass the audit until all green.

---

## 3. Audit-log immutability verification (SQL)

Paste into Supabase Dashboard → SQL Editor:

```sql
-- a) UPDATE should fail
DO $$
BEGIN
  BEGIN
    UPDATE public.audit_log SET action = 'tampered'
      WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
    RAISE EXCEPTION 'AUDIT IMMUTABILITY BROKEN — UPDATE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: UPDATE rejected with insufficient_privilege';
  END;
END$$;

-- b) DELETE should fail
DO $$
BEGIN
  BEGIN
    DELETE FROM public.audit_log
      WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
    RAISE EXCEPTION 'AUDIT IMMUTABILITY BROKEN — DELETE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: DELETE rejected with insufficient_privilege';
  END;
END$$;

-- c) Retention purge should still succeed
SELECT public.cleanup_expired_data(365, 90, 730);
```

- Result a (UPDATE): <"OK rejected" / "BROKEN">
- Result b (DELETE): <"OK rejected" / "BROKEN">
- Result c (purge): <JSONB returned, with deleted_audit count>

If a or b shows BROKEN: re-apply `supabase/migrations/20260518120000_audit_log_immutability.sql` immediately. File a SEV-2 incident.

---

## 4. SSL Labs scan

URL: https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com

- Grade: <A+ / lower>
- TLS 1.0 disabled: <yes/no>
- TLS 1.1 disabled: <yes/no>
- Forward Secrecy: <ROBUST / partial / no>

If anything below A+: check Cloudflare SSL/TLS → Edge Certificates settings haven't drifted; re-enable "Always Use HTTPS" + minimum TLS 1.2.

---

## 5. HSTS preload status

URL: https://hstspreload.org/?domain=vocaband.com

- Status: <"Preloaded" / "Pending" / "Not eligible">
- Header present on https://vocaband.com: <yes/no>
- `includeSubDomains` + `preload` directives present: <yes/no>

If status regressed: re-submit at https://hstspreload.org/ and verify the header in `public/_headers`.

---

## 6. Open security issues age check

```
$ gh issue list --label security --state open --json number,title,createdAt
```

- Open security issues: <n>
- Any > 90 days old: <list with number + age>

Issues over 90 days old without action: triage now — either close as "won't fix" with rationale, or schedule a fix in the next sprint.

---

## 7. DR tabletop exercise

Pick one scenario per quarter from `docs/DISASTER-RECOVERY.md` § 3:

- Q1: Scenario A (DB corruption)
- Q2: Scenario B (Fly.io down)
- Q3: Scenario D (key leak)
- Q4: Scenario C (Cloudflare compromise) OR Scenario E (Supabase total loss)

This quarter: **<scenario letter + name>**

- Time to "stop the bleeding": <minutes>
- Time to "full recovery": <minutes / hours>
- RTO target met?: <yes / no — explain>
- Runbook gaps found: <list>

If gaps found: open a PR to edit `docs/DISASTER-RECOVERY.md`.

---

## 8. Restore-test (every other quarter)

Run on Q1 + Q3 (or whenever ≥6 months since last drill).

```
$ SUPABASE_DB_URL_TARGET="<staging-postgres-uri>" \
  R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." R2_SECRET_ACCESS_KEY="..." \
  R2_BACKUP_BUCKET="vocaband-backups" \
  ./scripts/restore-from-r2-backup.sh
```

- Backup selected: <key>
- Backup size: <MiB>
- Restore time: <minutes>
- Row counts in `users` / `classes` / `progress`: <numbers>
- All key tables present: <yes/no>

If failed: file SEV-2 incident. Until restore works, the off-Supabase backup is theatre.

---

## 9. Off-Supabase backup recency

Open Cloudflare R2 → bucket `vocaband-backups` → `db-backups/<year>/`

- Most recent backup: <YYYY-MM-DD>
- Days since last backup: <n> (expected ≤ 8)
- File size growing reasonably (not zero, not 10×): <yes/no>

If older than 8 days: GitHub Actions cron may have failed. Check workflow run history at `https://github.com/<owner>/Vocaband/actions/workflows/backup-supabase-weekly.yml`.

---

## 10. Cross-document drift

| Tracker | Last updated | Drift vs reality? |
|---|---|---|
| `docs/SECURITY-OVERVIEW.md` | | |
| `docs/MOE-REQUIREMENTS.md` | | |
| `docs/RISK-REGISTER.md` | | |
| `docs/INFORMATION-SECURITY-POLICY.md` | | |
| `docs/PRIVACY_CHECKLIST.md` | | |
| `docs/SUBPROCESSORS.md` (any new processor since last audit?) | | |

If any drift: open a PR with the fix this week.

---

## 11. Summary

| Check | Status |
|---|---|
| 1. npm audit clean | ✅ / ❌ |
| 2. pen-test 19/19 | ✅ / ❌ |
| 3. audit-log immutability | ✅ / ❌ |
| 4. SSL Labs A+ | ✅ / ❌ |
| 5. HSTS preload OK | ✅ / ❌ |
| 6. No stale security issues | ✅ / ❌ |
| 7. DR tabletop run | ✅ / ❌ |
| 8. Restore-test (if quarter) | ✅ / ❌ / skipped |
| 9. Backup recency OK | ✅ / ❌ |
| 10. No tracker drift | ✅ / ❌ |

**Overall:** <PASS / FAIL>

Action items for next quarter:
- [ ] <task>
- [ ] <task>

---

## 12. File this report

Once filled in:
1. Commit at `docs/quarterly-audit-<YYYY-Qn>.md`.
2. Update `docs/SECURITY-OVERVIEW.md` § "What we audited and when" with one line referencing this report.
3. Set the next quarter's calendar reminder if missing.
