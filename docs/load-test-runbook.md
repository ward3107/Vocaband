# Live Challenge Load-Test Runbook

> Closes the engineering half of QA framework item #3 — drive N
> concurrent socket.io connections at the Fly origin and find where
> the platform breaks.  Ad-hoc cadence (before MoE rollout, before
> the new school year, after any socket-layer change).

---

## What this answers

1. How many simultaneous sockets can a single Fly machine sustain
   before connect-time p95 blows past 1.5 s?
2. Does Fly's `auto_stop_machines = 'stop'` setting trip the
   1-machine auto-scale ceiling correctly under burst?
3. Does `@socket.io/redis-adapter` actually fan out broadcasts
   across all 3 machines in `fly scale count 3` mode?
4. What's the realistic ceiling we should publish in the
   pricing page / pilot doc?

The script in `scripts/loadtest-socket.ts` covers #1.  Items
#2–#4 need follow-on work documented at the bottom of this file.

---

## Prereqs

- Node 22 available on the load-driver machine (`node --version`
  should print `v22.*`)
- This repo cloned + `npm ci` run on the load-driver
- A **JWT for a real signed-in user** — operator captures it once
  in the browser:

  1. Open https://www.vocaband.com in DevTools
  2. Sign in as a test teacher (any account works)
  3. In the console:
     ```js
     (await window.supabase.auth.getSession()).data.session.access_token
     ```
  4. Copy the long `eyJhbGc…` string — that's your `TEST_JWT`

  The JWT expires after 1 hour.  Re-capture between rounds if a
  test session runs long.

---

## Where to run from

Three options, pick by load level:

| Load level | Where to run | Why |
|---|---|---|
| ≤ 500 sockets | Your laptop | Fits in a single Node process; ephemeral-port budget is fine |
| 500 – 2000 sockets | A $5 DigitalOcean droplet in `fra1` (same region as Fly) | Removes the home-NAT bottleneck + clean network to Fly |
| 2000 – 5000 sockets | A second droplet (split across two, 2500 each) | Single droplet hits ~3000 ephemeral-port ceiling without sysctl tuning |

For the droplet path:

```bash
# Provision (~30s on DigitalOcean)
doctl compute droplet create voca-loadtest \
  --region fra1 --size s-1vcpu-1gb --image ubuntu-22-04-x64 \
  --ssh-keys $YOUR_KEY_ID

ssh root@<droplet-ip>
apt update && apt install -y nodejs npm git
git clone https://github.com/ward3107/Vocaband.git
cd Vocaband
npm ci --legacy-peer-deps --include=dev
```

---

## Running a single round

```bash
# Smoke (100 sockets, 30s hold) — should always pass
TEST_JWT='<the-jwt>' \
  CONNECTIONS=100 \
  HOLD_SECONDS=30 \
  npx tsx scripts/loadtest-socket.ts | tee /tmp/run-100.log

# Ramp the load (one round per level)
CONNECTIONS=500   HOLD_SECONDS=60  TEST_JWT='<jwt>' npx tsx scripts/loadtest-socket.ts | tee /tmp/run-500.log
CONNECTIONS=1000  HOLD_SECONDS=60  TEST_JWT='<jwt>' npx tsx scripts/loadtest-socket.ts | tee /tmp/run-1000.log
CONNECTIONS=2500  HOLD_SECONDS=60  TEST_JWT='<jwt>' npx tsx scripts/loadtest-socket.ts | tee /tmp/run-2500.log
CONNECTIONS=5000  HOLD_SECONDS=60  TEST_JWT='<jwt>' npx tsx scripts/loadtest-socket.ts | tee /tmp/run-5000.log
```

Leave **5 minutes between rounds** so Fly's auto-stop has time to
settle.  Don't run two ramps in parallel — they'll race for the
same connection budget.

If you're hitting an ephemeral-port ceiling locally (rejection
messages like `EADDRNOTAVAIL`), bump the OS limit:

```bash
# Linux droplet
sysctl -w net.ipv4.ip_local_port_range='10000 65535'
ulimit -n 65535
```

---

## Pass criteria

Per round, the report at the bottom of the script's output is
PASS if:

- **Success rate ≥ 99 %** (4950 / 5000 at the 5000-socket round)
- **p95 connect time < 1500 ms** under steady state
- **No rejection messages** after the warmup window (first 30s)

A failure on ANY of these at the 5000 level means we should NOT
publish "supports 5000 concurrent students" — back off to the
ceiling that did pass.

---

## What to watch on the server side

While the test runs, in another terminal:

```bash
fly logs --app vocaband | grep -E '\[Socket\]|\[QP|\[redis-adapter\]|memory'
```

Red flags:

- `out of memory` / OOM-kill → bump fly.toml's `memory` from 512mb
- `[redis-adapter] pub error` repeating → Upstash quota or network issue
- `Health check ... has failed` → machine is overloaded, Fly is
  about to evict it
- Sustained `cpu = 100%` on a single machine → look at
  `fly scale count 3` if not already

---

## Capturing the round report

Create `docs/load-test-report-YYYY-MM-DD.md` and paste:

```markdown
# Load-test report — YYYY-MM-DD

## Environment
- Target: https://www.vocaband.com  (prod, off-hours)
- Driver: DO droplet in fra1
- Fly app: vocaband, 3 machines, auto-stop on
- Started by: <name>

## Round summary

| Round | Sockets | Success | p50 | p95 | p99 | Peak concurrent | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | 100  | … | … | … | … | … | PASS |
| 2 | 500  | … | … | … | … | … | PASS |
| 3 | 1000 | … | … | … | … | … | PASS |
| 4 | 2500 | … | … | … | … | … | … |
| 5 | 5000 | … | … | … | … | … | … |

## Ceiling
Published ceiling: <max-PASS-round>

## Followups
- <anything weird that came up>
```

Commit the file in the next routine push.

---

## Off-hours window

Run against **prod** only when school is out of session in Israel:

- **Best window**: Fridays 14:00 – Sundays 06:00 UTC (Israel weekend
  + sleep hours)
- **Avoid**: Sun–Thu 06:00 – 14:00 UTC (Israel school hours)
- **One-classroom-equivalent rule**: 500 sockets ≈ one large
  classroom.  If real classes are mid-game during your test, you'll
  show up on their leaderboards.

Or — once we have a staging Fly app, point `TARGET` there and run
anytime.

---

## What this script doesn't cover yet

- **Full game loop**: no `JOIN_CHALLENGE` / `SUBMIT_ANSWER` events.
  Adding these means provisioning N distinct test users with
  matching JWT uids and a class they're all enrolled in.  That's
  ~half a day of follow-on work.  Track in
  `docs/qa-framework/05-LIVE-CHALLENGE.md` and pick it up after
  the connection-layer ceiling is published.
- **Redis broadcast fan-out**: requires emitting one event from a
  single connection and counting receivers across N others.  Same
  follow-on workstream as the full game loop.
- **Recovery**: how the platform behaves when 5000 sockets DROP at
  once (school WiFi dies).  Chaos-engineering scenario — separate
  drill.

The MVP scope is justified by `docs/qa-framework/05-LIVE-CHALLENGE.md`
calling out the connection layer as the primary unknown.
