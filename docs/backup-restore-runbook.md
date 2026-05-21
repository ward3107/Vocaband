# Backup-Restore Drill Runbook

> Closes QA framework item #8 — verify the Supabase backup pipeline
> actually produces restorable snapshots, end-to-end, before you need
> one for real.  Quarterly cadence.  ~2 hours.

---

## Why we drill

Supabase makes backups automatically.  We trust that, the same way we
trust Cloudflare runs DNS.  What we don't yet have evidence for:

1. The most recent **PITR snapshot** can be restored into a working
   Postgres without manual fix-up.
2. All `public.*` tables come back **populated** (no silently-dropped
   tables).
3. RLS posture survives — every sensitive table still has
   `rowsecurity = TRUE`.
4. SECURITY DEFINER RPCs are intact.
5. We know how long the full restore takes — our real RTO (recovery
   time objective).

The drill answers all five in ~2 hours.

---

## Prereqs

- Supabase **Pro tier or higher** on the prod project (PITR is a
  Pro+ feature).  Vocaband is on Pro per `docs/SECURITY-OVERVIEW.md`.
- A **second Supabase project** to restore INTO (Free tier is fine
  for the drill — we tear it down at the end).
- This repo cloned locally with `psql` available (`brew install
  libpq` on macOS, or use the Supabase dashboard's SQL editor).

---

## The drill

### Step 1 — Set the restore point (5 min)

Pick a point you want to recover to.  For the drill, choose
**7 days ago at noon UTC** — recent enough that data shapes match
today, old enough to confirm the 7-day retention is honest.

Write the exact timestamp here:

```
DRILL_RESTORE_POINT_UTC = 2026-MM-DD 12:00:00+00
```

Open `docs/backup-restore-drill-YYYY-MM-DD.md` (create a new file
each drill — keep the history).

### Step 2 — Create the temp project (5 min)

In the [Supabase dashboard](https://supabase.com/dashboard):

1. New project → name it `vocaband-restore-drill-YYYY-MM-DD`
2. Region: same as prod (Frankfurt / `eu-central-1`)
3. Wait for provisioning (~1 min)
4. Note the new project's `ref` (the random 20-char ID in the URL)

### Step 3 — Trigger the PITR restore (15 min)

In the dashboard, open the **prod** project, not the temp:

1. **Database → Backups → Point in time recovery**
2. Pick the timestamp from Step 1
3. **Target:** select the temp project from Step 2
4. **Confirm**

Start a stopwatch.  Note: `restore_started_at_utc`.

### Step 4 — Wait + watch (30-60 min)

Restore is opaque from the dashboard — you'll see "in progress" until
it isn't.  When it finishes, the dashboard shows the success
notification.  Note: `restore_completed_at_utc`.

### Step 5 — Verify (15 min)

Open the **temp project's** SQL editor and run
`scripts/verify-restore.sql`:

```bash
# Option A: paste-into-editor (no local Postgres needed)
#   Supabase dashboard → temp project → SQL editor → paste + run

# Option B: psql from your machine
psql "postgresql://postgres.<TEMP_REF>:<TEMP_PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f scripts/verify-restore.sql
```

Walk through each section's output (the script labels them 1–8).
Anything in the `bad_rows` column of section 3 = critical; anything
with `rowsecurity = false` in section 5 = critical.  Critical
findings get a same-day investigation regardless of how the rest
of the drill went.

### Step 6 — Document the timings (5 min)

In your `docs/backup-restore-drill-YYYY-MM-DD.md`, fill in:

```markdown
# Backup-restore drill — YYYY-MM-DD

## Drill parameters
- Restore point: 2026-MM-DD 12:00:00+00
- Temp project ref: <ref>
- Operator: <name>

## Timings
- Restore started: 2026-MM-DD HH:MM:SS+00
- Restore completed: 2026-MM-DD HH:MM:SS+00
- Total wall-clock: NN minutes (this is your RTO)

## Verification output
<paste section 1-8 output from verify-restore.sql>

## Findings
- [ ] All sections of verify-restore.sql passed
- [ ] No orphaned-FK rows
- [ ] All RLS = TRUE
- [ ] All expected RPCs present
- [ ] Activity timestamps within ±2 hours of restore point

## Next drill
Quarterly cadence — schedule on the calendar.
```

### Step 7 — Tear down (5 min)

In the dashboard:
1. Temp project → Settings → General → **Delete project**
2. Confirm by typing the project name

This stops the temp project's billing meter.  Do **not** skip this
step — the temp project costs real money sitting idle.

---

## What to do if anything fails

### A. PITR target picker doesn't show the date you want

The PITR window is bounded by your Supabase plan:
- **Pro**: 7 days
- **Team / Enterprise**: 14-30 days

If the date you want falls outside the window, the daily snapshot
in **Database → Backups → Backups** is still available — but those
restore by triggering a `pg_restore` job into a new project, not via
the dashboard UI.  Open a support ticket OR upgrade the plan if
30-day recovery is a hard requirement.

### B. Verify script shows `EMPTY` on a table that has data in prod

The restore didn't fully drain the snapshot.  Try again with a
different restore point first.  If it repeats, escalate to Supabase
support with the timestamps — this is a vendor issue, not yours.

### C. Verify script shows `rowsecurity = false` on a sensitive table

A migration's `ENABLE ROW LEVEL SECURITY` didn't take in the restore.
**This is critical** — open the temp project's `Database → Tables →
<table> → Policies` and re-enable RLS manually, then file a
post-mortem.  The prod project is presumed safe (it's been running
on the same migrations) but verify before closing the ticket.

### D. Restore takes >2 hours

Document the actual elapsed time and revise the published RTO in
`docs/SECURITY-OVERVIEW.md`.  Consider:
- Whether the schema has grown faster than expected
- Whether Supabase tier upgrade would speed up restore
- Whether dropping large append-only tables (audit_log,
  authz_failures) from the backup scope would be safer

---

## Cadence + ownership

| When | Action |
|---|---|
| Quarterly | Full drill (this runbook) |
| After any major schema migration | Mini-drill — restore + verify section 8 only |
| Annually | Revise the runbook based on platform changes |

**Default owner:** the operator (the person who has the Supabase
dashboard credentials).  No engineering involvement needed to run
the drill once the runbook exists.
