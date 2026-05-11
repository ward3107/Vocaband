# Vocaband — Load testing (k6)

> Three scenarios for stress-testing the Fly.io origin: smoke,
> sustained load, and spike. Run against **staging only** — these
> scripts will trip Cloudflare WAF if pointed at production.
>
> Last updated 2026-05-10.

---

## What this exercises

Cloudflare absorbs the edge — connection floods, SYN attacks,
volumetric L3/L4 DDoS. What can still kill us is **L7 application
load** that survives the Worker proxy and lands on `server.ts` /
Supabase: socket connections, `/api/*` calls, especially the
expensive ones (`/api/submit-bagrut`, `/api/ocr/*`, Gemini calls).

The k6 scripts target the Fly origin **directly** (bypassing
Cloudflare) so we're measuring what the origin can take, not what
Cloudflare drops.

---

## Setup (one-time)

### Install k6

- macOS: `brew install k6`
- Windows: `winget install k6` (or download from https://grafana.com/docs/k6/)
- Linux: package from https://grafana.com/docs/k6/

Verify: `k6 version` should print 0.50.0+.

### Provision a staging Fly app

You need a Fly app **separate** from production, pointing at a
staging Supabase project (no real student data). See
`docs/PENTEST-SOW.md` §8 for the staging-setup checklist.

Get the staging origin URL — looks like `https://vocaband-staging.fly.dev`.

### Generate test JWTs

Each scenario runs as a real Supabase-authenticated user. Create
test accounts on the staging Supabase project:

```bash
# In the staging Supabase SQL editor:
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES
  ('loadtest-student-1@vocaband.test', crypt('test-password', gen_salt('bf')), now()),
  ('loadtest-student-2@vocaband.test', crypt('test-password', gen_salt('bf')), now()),
  ('loadtest-teacher-1@vocaband.test', crypt('test-password', gen_salt('bf')), now());
```

Then mint JWTs by hitting the staging Supabase auth endpoint:

```bash
curl -X POST "$STAGING_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $STAGING_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"loadtest-student-1@vocaband.test","password":"test-password"}' \
  | jq -r '.access_token' > .jwt-student-1.txt
```

Save the JWTs in `.jwt-*.txt` files in this directory. **Do NOT
commit them — already in `.gitignore` via `*.txt` if not, add it.**

---

## Scenarios

| Script | Purpose | Duration | Peak load |
|---|---|---|---|
| `smoke.js` | Verify the test harness works + sanity-check origin | 1 min | 1 VU |
| `sustained.js` | Realistic peak — 200 students playing during a class | 10 min | 200 VUs |
| `spike.js` | Simulate "release-day" traffic — 1000 students hitting at once | 5 min | 0 → 1000 → 0 VUs |
| `socket.js` | Live-challenge stress — 100 concurrent WebSocket clients | 5 min | 100 sockets |

### Run

```bash
# from repo root:
export STAGING_ORIGIN="https://vocaband-staging.fly.dev"
export STAGING_SUPABASE_URL="https://staging-auth.vocaband.com"
export STAGING_ANON_KEY="sb_publishable_..."
export STUDENT_JWT="$(cat scripts/loadtest/.jwt-student-1.txt)"
export TEACHER_JWT="$(cat scripts/loadtest/.jwt-teacher-1.txt)"

k6 run scripts/loadtest/smoke.js
k6 run scripts/loadtest/sustained.js
k6 run scripts/loadtest/spike.js
k6 run scripts/loadtest/socket.js
```

### Acceptance thresholds

Each script defines `thresholds` — k6 exits non-zero if any fail.

| Metric | Smoke | Sustained | Spike |
|---|---|---|---|
| `http_req_duration` p95 | < 500 ms | < 1500 ms | < 5000 ms (degradation OK) |
| `http_req_failed` rate | < 1 % | < 5 % | < 20 % (degradation OK) |
| Errors by status | 0 × 5xx | < 1 % 5xx | < 5 % 5xx |

If `sustained.js` fails p95 < 1500ms or 5xx < 1%, the Fly app
needs scaling (more memory, more instances, or move off Starter).

---

## What "passing" means

- **Smoke** — origin reachable, JWTs work, RLS allows the
  authenticated reads. If this fails, fix the harness before
  running anything heavier.
- **Sustained** — current Fly tier survives one classroom of
  students. Pass = we can ship to a single school.
- **Spike** — Fly absorbs a 0 → 1000 ramp without complete
  origin collapse. Pass = a viral teacher-share won't take us
  down. Failure here triggers an autoscaler config change, not
  a code change.
- **Socket** — Live Challenge survives 100 concurrent clients.
  Pass = a single live game with the largest reasonable class.

---

## What this is NOT

- **Not a DDoS test against Cloudflare.** Cloudflare's WAF would
  block this traffic instantly. We're testing what the origin can
  take, not whether Cloudflare protects it. Cloudflare protection
  is verified separately (run a small `hey -n 100000` against
  `vocaband.com` from a single IP — it should get rate-limited
  within ~30 seconds).
- **Not pen-testing.** k6 measures throughput + latency, not
  vulnerabilities. See `docs/PENTEST-SOW.md`.
- **Not realistic in every dimension.** k6 generates synthetic
  request patterns; real students cluster in pulses (everyone
  hits "submit" at once when the bell rings). Pad capacity 2×
  beyond what these scripts say is "enough."

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| All requests 401 | JWT expired (Supabase tokens are 1h by default). Re-mint. |
| All requests 403 | Test account isn't in the staging class / lacks role. Re-seed staging. |
| All requests time out | Fly app is asleep on cold-start. Hit it once with curl, wait 10s, re-run. |
| WebSocket scenario can't connect | Fly app's `wss://` not configured, or CF Worker not proxying staging path. Test with `wscat -c wss://...`. |
| `http_req_failed` rate spikes after 30s | Hit Fly's per-IP connection cap. Run from multiple sources or use k6 cloud. |

---

## CI integration (optional)

Once the scripts run cleanly, hook `smoke.js` into GitHub Actions
for regression detection:

```yaml
# .github/workflows/loadtest-smoke.yml
on:
  pull_request:
    paths: [server.ts, worker/**, supabase/migrations/**]
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run scripts/loadtest/smoke.js
        env:
          STAGING_ORIGIN: ${{ secrets.STAGING_ORIGIN }}
          STUDENT_JWT:    ${{ secrets.LOADTEST_STUDENT_JWT }}
```

Don't run `sustained` / `spike` in CI — they'd burn Fly minutes
and accomplish nothing on a per-PR basis. Run those manually
before each major release.
