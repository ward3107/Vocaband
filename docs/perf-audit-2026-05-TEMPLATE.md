# Performance audit — 2026-05-XX (post school-Wi-Fi sprint)

> **Status: TEMPLATE.** Numbers below are placeholders. Fill them in
> from a real measurement session before / during / after the school
> demo. Procedure at the bottom.

## TL;DR

This audit follows the **school-Wi-Fi survival** sprint shipped in PR #698
(R1 read cache, R2 offline UI, R4 edge cache + Supabase preconnect) and
the R5 follow-up commit `2bf3831` (Sentry web-vitals + lazy replay +
CSP unblock). The plan is in `docs/SCHOOL-PERFORMANCE-PLAN.md`.

Replace the placeholders below once a real measurement is captured.

## Headline numbers — Slow 4G, mobile profile

| Metric | Before sprint | After sprint | Target | Pass? |
|---|---|---|---|---|
| Landing page TTI (first visit) | _____ s | _____ s | ≤ 4 s | ⬜ |
| Landing page TTI (repeat visit) | _____ s | _____ s | ≤ 1 s | ⬜ |
| Dashboard render after login | _____ ms | _____ ms | ≤ 1 s | ⬜ |
| Dashboard render (cached, repeat) | n/a | _____ ms | ≤ 100 ms | ⬜ |
| Game finish → score saved offline | broken | works | works | ⬜ |
| Lighthouse mobile performance | _____ | _____ | ≥ 85 | ⬜ |
| Lighthouse PWA | _____ | _____ | ≥ 90 | ⬜ |

## Web Vitals — production, from Sentry

Pull these from the Sentry **Performance → Web Vitals** dashboard
after at least 24 h of real traffic against the post-merge build.

| Metric | p50 | p75 | p95 | Threshold (good) |
|---|---|---|---|---|
| LCP | _____ ms | _____ ms | _____ ms | ≤ 2,500 ms |
| INP | _____ ms | _____ ms | _____ ms | ≤ 200 ms |
| CLS | _____ | _____ | _____ | ≤ 0.10 |
| TTFB | _____ ms | _____ ms | _____ ms | ≤ 800 ms |

## What the sprint actually changed

### R1 — Read cache (`46b5ac8`)
`localStorage` SWR cache, namespaced by user uid. Teacher classes
(5 min TTL) and student assignment lists (2 min TTL). Wiped on
logout. Survives reloads and offline.

**Expected effect:** dashboard renders from cache (~10 ms) instead
of waiting on Supabase Frankfurt RTT (~80 ms ideal, 300 ms+ on
contested classroom Wi-Fi). First visit unchanged.

### R2 — Offline UI (`ec0c4eb`)
Amber pill when `navigator.onLine === false` plus "Saved locally /
All synced" toasts driven by `subscribeQueueDepth` on the existing
write queue. Doesn't change behaviour — makes the behaviour visible.

**Expected effect:** teachers/students stop reporting "the app froze"
during Wi-Fi blips because they can see what's happening.

### R4 — Edge cache + preconnect (`a309557`)
- `<link rel="preconnect">` to `auth.vocaband.com`: pre-warms the
  TLS handshake to Supabase so the first `auth.getSession()` call
  doesn't pay the full round-trip on cold load.
- Cloudflare Worker edge-caches `GET /api/features` and
  `/api/version` (60 s, 300 s stale-while-revalidate). All other
  `/api/*` get `Vary: Authorization` as defence-in-depth.

**Expected effect:** TTFB drops ~50–100 ms for the first Supabase
call on cold visits; trivial overhead on subsequent calls.

### R5 — Observability (`2bf3831`)
- `browserTracingIntegration` capturing LCP / CLS / INP / TTFB +
  page-load + navigation transactions.
- `replayIntegration` lazy-loaded from sentry-cdn AFTER first
  paint, with `maskAllText: true` and `blockAllMedia: true` so
  recordings are PII-safe.
- CSP unblock: ingest host added to `connect-src` and sentry-cdn
  to `script-src` / `script-src-elem`. **NB:** this fixed a
  pre-existing silent bug where every Sentry event was being
  CSP-blocked in production.

**Expected effect:** post-deploy, we can see real classroom sessions
instead of guessing.

## Bundle changes

From `npm run build` (raw / gzipped):

| Chunk | Before sprint | After R1-R4 | After R5 |
|---|---|---|---|
| `index-*.js` (entry) | 289 kB / 94 kB | 289 kB / 94 kB | 340 kB / **111 kB** |
| `App-*.js` | 268 kB / 74 kB | 272 kB / 75 kB | 272 kB / 75 kB |

The +17 kB gz on the entry chunk is the cost of browser-tracing
(needed to capture web-vitals at page-load time — it can't ride a
lazy-load without missing the most valuable transaction). Replay's
~50 kB is OFF the entry chunk entirely because it loads from
sentry-cdn at idle.

Plan target was ≤ 70 kB gz on the entry chunk. We're at 111 kB.
The gap is mostly React + ReactDOM + Sentry; see R3 in
`docs/SCHOOL-PERFORMANCE-PLAN.md` for the deferred entry-trim work
(skipped because it's polish, not a school-demo unblocker).

## How to measure (procedure for the operator)

1. Open Chrome on a clean profile (or Incognito + Service Workers
   unregistered).
2. DevTools → Network → throttle dropdown → **Slow 4G**. Also tick
   **Disable cache** on the first visit, then untick for the
   repeat-visit run.
3. Open https://www.vocaband.com and walk the full flow:
   - landing → click Sign In → OAuth → dashboard → open assignment →
     play one game → finish.
   - Record timestamp at each step from DevTools' performance trace.
4. Run Lighthouse (mobile profile, "Performance" + "PWA" categories).
   Note the scores.
5. Repeat steps 3-4 once more — that's the "repeat visit" column.
6. For Web Vitals: wait 24 h after deploy, then pull p50/p75/p95
   for LCP/INP/CLS/TTFB from Sentry → Insights → Web Vitals.
7. Fill in the tables at the top of this doc and rename to
   `perf-audit-2026-05-DD.md`.

## Known limitations of the measurement

- Slow 4G is a synthetic profile; classroom Wi-Fi behaves
  differently (intermittent drops, not just slow). The offline UI
  + write queue cover the drop case but aren't visible in this
  measurement — verify them by toggling **Offline** mid-game.
- Sentry web-vitals sample at 5% — you need real traffic to populate
  the dashboard.
- The Cloudflare Worker edge cache only helps cold visits to
  `/api/features` and `/api/version`; everything else is unchanged.

## Follow-ups parked for later

| Item | Why parked |
|---|---|
| Entry-chunk trim to ≤ 70 kB gz (R3) | Polish, not a demo blocker |
| Move Sentry init to lazy `requestIdleCallback` | Loses errors during bootstrap (the time Safari weirdness fires) |
| Tier 2 paid items (Supabase Pro read replica, Durable Objects, R2/Images, Upstash) | Need to see classroom-session data first |
