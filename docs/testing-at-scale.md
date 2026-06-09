# Testing at scale — confidence before a classroom hits it

> Goal: catch the "many students × cheap phones × bad Wi-Fi × a dependency
> hiccup" failures on a laptop and in CI, **before** production — then make
> the unavoidable surprises cheap to detect and roll back.
>
> Reality check: **100% certainty is not achievable** for any web app. The
> target is *high pre-launch confidence + detect-in-seconds + instant
> rollback*. The layers below are how you get there.

---

## The layers (what runs where)

| Layer | Catches | Tool | Runs |
|---|---|---|---|
| Unit + **property/fuzz** | logic bugs, malformed-input crashes | Vitest + fast-check | **CI, every PR** (automatic) |
| End-to-end | "does the flow work in a browser" | Playwright | CI + on demand |
| **Device matrix** | iPhone/Android layout & touch | Playwright emulation + real-device cloud | on demand |
| **Slow network** | bad school Wi-Fi | Playwright CDP throttling | on demand |
| **Load / concurrency** | "200 kids at once" | k6 | manual, against **staging** |
| **Chaos** | dependency slow/down mid-class | Toxiproxy + Fly drills | manual, against **staging** |
| Rollout safety | limit blast radius | feature flags + Sentry | production |

What's **automatic** (no action from you): the unit + fuzz tests run on
every PR via the existing `npm run test` CI job. The rest are tools you
*invoke* — that's what this doc is for.

---

## 1. Property / fuzz tests — DONE, runs in CI

Throws thousands of random/adversarial inputs at the pure logic and
asserts it never throws and always returns a well-formed result. This is
the guard against the worksheet white-screen / scoring-crash class of bug.

- Files: `src/__tests__/fuzz-category-race.test.ts`, `src/__tests__/fuzz-worksheet.test.ts`
- Run locally: `npm run test`
- **Manual step: none.** Already in CI.
- To extend: add a `fc.property(...)` for any new pure function (parsers,
  validators, score math) — that's where fuzzing pays off most.

---

## 2. Full-classroom load test (k6) — the "200 kids at once" test

Simulates many students joining ONE live session and all submitting in the
same window (the thundering herd a real class creates). Targets the Fly
origin directly, **staging only** (it will trip Cloudflare's WAF against
production).

- Script: `scripts/loadtest/classroom-race.js` (plus the existing
  `socket.js` / `spike.js` / `sustained.js`).

### Manual setup (one-time)
1. **Install k6**: `brew install k6` (mac) · `winget install k6` (Windows) · or grafana.com/docs/k6.
2. **Stand up a staging Fly app** pointed at a *staging* Supabase project
   (no real student data). See `scripts/loadtest/README.md` and
   `docs/PENTEST-SOW.md` §8.
3. On staging, **open a Category Race** as a teacher and note the 6-char
   session code.

### Run
```bash
k6 run \
  -e STAGING_ORIGIN=https://vocaband-staging.fly.dev \
  -e SESSION_CODE=ABCDEF \
  -e STUDENTS=200 \
  scripts/loadtest/classroom-race.js
```
Then **start rounds from the teacher device** — the virtual students
auto-answer. Pass criteria (enforced as k6 thresholds): <2% joins fail,
JOINED ack p95 < 1.5s, RACE_RESULT p95 < 2s.

### Go deeper
- **Soak test**: bump the hold stage to 1–3 hours to surface memory/
  socket/connection-pool leaks that a 4-minute run misses.
- **Breakpoint test**: ramp `STUDENTS` up (300 → 500 → 1000) until
  thresholds break — now you know your ceiling and *how* it fails.

---

## 3. Device matrix + slow network (Playwright)

Same e2e specs, run on the phones students bring + a throttled connection.

- Config: `e2e/playwright.config.ts` (projects: chromium, Mobile Chrome,
  Mobile Safari, Small Android).
- Slow-network spec: `e2e/tests/slow-network.spec.ts`.

### Manual setup (one-time)
- `npx playwright install` — pulls the WebKit/Chromium engines the matrix
  needs (Mobile Safari = WebKit).

### Run
```bash
npm run test:e2e                              # all devices
npx playwright test --project="Mobile Safari" # one device
npx playwright test slow-network              # the throttled-network test
```

### Real devices (emulation's blind spot)
Emulation reproduces viewport/touch/UA but **not** the real Safari/Android
rendering engine, where most genuine mobile bugs live. For the last mile,
run the same suite on a **real-device cloud** — **BrowserStack** or
**LambdaTest** (drive an actual iPhone from your browser; both have free
tiers + Playwright integration). Do this before a major release, not every
PR.

---

## 4. Chaos / fault injection (Toxiproxy + Fly drills)

Deliberately break a dependency and confirm the app degrades gracefully
(reconnects, shows a friendly state) instead of hanging or white-screening.

- Driver script: `scripts/chaos/network-chaos.sh` (+ `scripts/chaos/README.md`).

### Manual setup (one-time)
- Install Toxiproxy: `brew install toxiproxy` (mac) or download from
  github.com/Shopify/toxiproxy. Start the daemon: `toxiproxy-server`.

### Best scenarios for this app
1. **Supabase goes slow/down mid-class.** Put Toxiproxy between the
   staging `server.ts` and Supabase, then:
   ```bash
   ./scripts/chaos/network-chaos.sh create db.<ref>.supabase.co:5432 127.0.0.1:6543
   # point the staging server's DB host at 127.0.0.1:6543, then:
   ./scripts/chaos/network-chaos.sh latency   # or: slow | timeout | down
   # run a live round; watch students stay usable, then:
   ./scripts/chaos/network-chaos.sh clear
   ```
   (TLS note: Toxiproxy is raw TCP — see `scripts/chaos/README.md` for
   which hops can be proxied without a cert mismatch.)
2. **A Fly VM dies mid-round.** With a load test running against staging:
   ```bash
   fly machine list -a vocaband-staging
   fly machine stop <machine-id> -a vocaband-staging   # pull the rug
   ```
   Confirm students reconnect and the leaderboard re-converges (this is
   exactly the failure behind `docs/POSTMORTEM-infinite-loop-freeze.md`).
3. **Client-side bad Wi-Fi** is already covered by the Playwright
   slow-network test (#3) — no Toxiproxy needed there.

---

## Pre-release checklist (run before shipping a risky change)

1. ☐ `npm run test` green (unit + fuzz) — automatic in CI.
2. ☐ `npm run test:e2e` green across the device matrix.
3. ☐ `classroom-race.js` against staging at expected class size — thresholds pass.
4. ☐ One chaos run (Supabase latency OR Fly VM stop) — app degrades gracefully.
5. ☐ Sentry has no new error types from the staging session.
6. ☐ Feature-flag the new thing **off** by default.

## Pilot rollout (the safe "test in production")

You already have `useFeatureFlags`. Use it as the blast-radius limiter:

1. Ship the change **flagged off**.
2. Turn it **on for one friendly teacher's class**. Watch Sentry + the
   live leaderboard during their lesson.
3. Clean run → widen to a few classes → then everyone. Problem → flip the
   flag **off instantly** (no redeploy).

## Detection in production (the surviving 1%)

- **Sentry** (already wired, `src/core/sentry.ts`): add an **alert** on a
  new-error spike so you hear it from the dashboard, not a teacher.
- **Synthetic uptime monitor**: a robot hitting `/api/health` + a fake
  login every minute (UptimeRobot / Checkly / Cloudflare) that pages you
  on failure.
- **Real User Monitoring**: Cloudflare Web Analytics gives you real
  device/network/Core-Web-Vitals from the field for free.

---

## What's overkill for now (know it exists, skip it)
- Mutation testing (Stryker), full chaos platforms (Gremlin), automated
  canary analysis, shadow-traffic replay, distributed tracing
  (OpenTelemetry). Revisit only when the basics above are routine.
