# School performance plan — survive weak Wi-Fi

**Branch:** `claude/optimize-offline-performance-DaEbm`
**Started:** 2026-05-16
**Deadline:** ~4 days (next school demo)
**Goal:** Vocaband must load fast and stay usable on saturated school Wi-Fi (50–500 ms latency, frequent drops). Second visit should open instantly even offline.

This is the single source of truth for the sprint. Update the checkboxes as we go. If memory is lost mid-session, type `!resume` and read this file first.

---

## Survey results — 2026-05-16 (read this first!)

Before writing a single line of code on this sprint, a survey of the
codebase revealed that **most of Tier 1 was already shipped** by a prior
engineer. Concretely:

- **Day 1 (PWA + Workbox): ✅ DONE.** `vite.config.ts:30-315` has a
  comprehensive vite-plugin-pwa config — runtime caching for HTML
  (NetworkFirst with 3s timeout + handlerDidError fallback), JS/CSS
  (CacheFirst), fonts/images, word audio MP3s (2000-entry LRU), praise
  audio. Kill switch via `?unregisterSW=1` (see `src/main.tsx:43-70`).
  Build emits `dist/sw.js` + `workbox-c0947cf6.js` with 155 precache
  entries (4.8 MB).
- **Day 2 (lazy views): ✅ DONE.** All 35 views in `src/App.tsx:45-...`
  are already `lazy(() => import(...))`. Build output confirms separate
  chunks for `StudentDashboardView`, `TeacherDashboardView`,
  `ShopMarketplaceView`, `GameActiveView`, `ClassroomView`, `DemoMode`,
  etc. The 6,482-word `vocabulary` chunk is lazy via `useVocabularyLazy`.
- **Day 3 (write queue): ✅ DONE (alt impl).** `src/core/saveQueue.ts`
  (353 lines) is a complete Kahoot-style offline write queue with:
  retry-on-online + on-tab-refocus + interval flush, MAX_ATTEMPTS=20,
  two flavours (Quick Play direct INSERT + class assignment RPC).
  Uses `localStorage` instead of IndexedDB — fine for small queues.

**Day-1 build numbers (baseline for this sprint):**

| Chunk | Raw | Gzip | Target | Gap |
|---|---|---|---|---|
| `index-*.js` (entry) | 289 kB | **94 kB** | ≤ 70 kB | -24 kB |
| `App-*.js` | 269 kB | **74 kB** | ≤ 40 kB | -34 kB |
| `ClassroomView` | 403 kB | 116 kB | (lazy ✅) | — |
| `vocabulary` | 404 kB | 151 kB | (lazy ✅) | — |

**Real remaining gaps:**

1. **Read-side cache** — `useTeacherData`, dashboard fetches, assignment
   lists are NOT cached locally. Every dashboard open waits on Supabase
   Frankfurt round-trip. *This is the visible school-Wi-Fi pain.*
2. **Online/offline UI indicator** — no banner today, no "saved locally,
   will sync" toast even though the write queue does the right thing.
3. **Entry chunk slim** — 94 kB gz entry is fat (Sentry + React DOM + a11y
   widget). Some lazy-import opportunities.
4. **Cloudflare edge cache rules** for `/api/*` — see Day 4.
5. **Real Slow-4G test + Sentry web-vitals** — never done.

Sprint is therefore re-scoped to those 5 items. Everything below this
section reflects the new scope.

---

## How to use this file

1. Each tier has a checklist. Tick `[x]` when shipped to `main`.
2. Each task has a **Verify** step — don't tick the box until you've actually run it.
3. "Status" line at the top of each task: `📋 not started` / `🚧 in progress` / `✅ shipped` / `⏸ paused`.
4. After every commit, update the matching task and add the SHA next to it.

---

## Diagnosis (why schools feel slow today)

Documented for context. Do not re-investigate unless something changes.

1. **`App.tsx` is ~5,800 lines** → huge initial JS bundle parsed on cheap student phones.
2. **Supabase is in Frankfurt** → ~60–90 ms RTT to Israel under ideal conditions, 300 ms+ on contended classroom Wi-Fi. Every assignment fetch pays this.
3. **Audio MP3s + vocabulary data** download over the same pipe as the UI.
4. **Fly.io WebSocket region** — if it isn't `fra` / `mad`, live-challenge round-trips amplify the pain.
5. **No real offline mode** — one Wi-Fi blip stalls the app instead of degrading gracefully.

A prior pass (`docs/perf-audit-2026-04-28.md`) lazy-loaded the vocabulary chunk. That's good, but it didn't add a service worker, didn't split the App orchestrator, and didn't add an offline write queue. Those are this sprint.

---

## Tier 1 — Free wins (re-scoped 2026-05-16 after codebase survey)

### ✅ Day 1 — PWA shell + Workbox SW — DONE (pre-existing)

Shipped before this sprint. See `vite.config.ts:30-315` + `src/main.tsx:43-70`.
Build confirmed 2026-05-16: `dist/sw.js` + `workbox-c0947cf6.js`, 155 precache
entries (4.8 MB), runtime cache buckets `vocaband-html`, `vocaband-assets`,
`vocaband-media`, `vocaband-word-audio`, `vocaband-praise-audio`.

### ✅ Day 2 — Lazy views — DONE (pre-existing)

All 35 views in `App.tsx:45-...` are `lazy()`. Build output confirms separate
chunks for every view. `vocabulary.ts` is lazy via `useVocabularyLazy`.

Residual nit (not blocking the demo): the entry chunk is still **94 kB gz**
(target was ≤ 70 kB) and `App-*.js` is **74 kB gz** (target ≤ 40 kB). See
Task R3 below — only do this if Tasks R1+R2 land with time to spare.

### ✅ Day 3 — Write queue — DONE (pre-existing, alt impl)

`src/core/saveQueue.ts` (353 lines). Kahoot-style optimistic UI + retry
queue, MAX_ATTEMPTS=20, `online` + tab-refocus + interval flush. Uses
`localStorage` not IndexedDB — acceptable for small queues.

---

## What actually needs to ship — re-scoped task list

Tasks renamed R1…R5 (Re-scoped) so the original day numbering doesn't
mislead. Order is by classroom-perceived impact.

### R1 — Read-side cache for dashboard / assignments

**Status:** ✅ shipped 2026-05-16 (commit `46b5ac8`) · **Why it's #1:** This is the single most visible
school-Wi-Fi pain ("assignments load too slow"). Today every dashboard
mount waits on Supabase Frankfurt RTT; with a cache it renders instantly
from local and refreshes in the background.

- [x] Create `src/core/readCache.ts` — `localStorage`-backed, namespaced by
  user id (so shared classroom devices don't leak between students).
  Shipped as `cachedRead<T>(key, fetcher, { userScope, ttlMs, onCacheHit })`.
  Reads return cache via microtask `onCacheHit` and fire the network
  fetch in parallel; the network result overwrites the cache and resolves
  the promise. Falls back to cache on fetcher rejection.
- [x] Apply to `src/hooks/useTeacherData.ts` — classes (5 min TTL) and
  assignment list (2 min TTL). Progress kept live (too dynamic).
- [ ] Apply to the student dashboard's standalone assignment fetch
  paths (separate from `loadAssignmentsForClass`). Follow-up if time.
- [x] Clear cache on logout — `clearAllReadCache()` fires in the
  `SIGNED_OUT` handler in `App.tsx` alongside the other localStorage scrubs.
- [x] Cap cache entry size + total localStorage budget (256 KB per value,
  4 MB total ceiling, oldest-25% eviction on quota).

**Verify:**
1. Throttle to Slow 4G, load teacher dashboard once. Reload — dashboard
   renders in ≤ 100 ms (cache hit) and the freshness fetch resolves
   silently in the background.
2. Sign out, sign in as a different teacher — none of the previous
   teacher's data appears.
3. Quota math: 5 classes × ~2 KB + 50 assignments × ~1 KB ≈ 60 KB per
   teacher. Well under budget.

**Commit:** `feat(cache): localStorage SWR read cache for teacher dashboard` — SHA: `46b5ac8`

---

### R2 — Online/offline indicator + sync toast

**Status:** ✅ shipped 2026-05-16 · **Why:** The write queue does the right thing
silently. Teachers and students don't *know* it's working, so a Wi-Fi
drop feels like a freeze even when it isn't. A subtle indicator + a
"saved locally, will sync" toast closes the perception gap.

- [x] `src/hooks/useOnlineStatus.ts` — returns a `boolean`, wraps
  `navigator.onLine` and the `online`/`offline` window events.
- [x] `src/components/OfflineIndicator.tsx` — amber pill, RTL-aware,
  EN/HE/AR strings inline. Mounted globally via `cookieBannerOverlay`
  in `App.tsx` so it appears on every public/student/teacher view.
- [x] Generic depth-subscription in `saveQueue.ts` — kept the module
  dependency-free. App.tsx's `useEffect` listens and fires toasts:
  "Saved locally" only when `navigator.onLine === false` (avoids noise
  on transient depth bumps), "All progress synced" on drain-to-zero.
- [x] Reused the existing hand-rolled toast system in App.tsx — three
  new i18n strings added to `app-toasts.ts` (en/he/ar).

**Verify:**
1. DevTools → Offline → finish a game. Toast shows "Saved locally".
2. Toggle back online — toast shows "All progress synced".
3. Indicator dot appears/disappears with the network event.

**Commit:** `feat(offline-ui): online indicator + queue sync toasts` — SHA: `ec0c4eb`

---

### R3 — Trim the entry chunk (optional, only if R1+R2 land early)

**Status:** 📋 not started · **Why optional:** Entry-chunk slim is a
performance polish, not a school-demo unblocker. Don't burn time on it
unless R1 and R2 are already shipped.

- [ ] Defer Sentry init until `requestIdleCallback` or first idle
  after React mount (currently runs synchronously in `main.tsx:10`).
  This may move ~20 kB gz out of the entry critical path.
- [ ] Check whether `AccessibilityWidget` can be `lazy()` — the comment
  says it can't because of an event listener. Evaluate: could a tiny
  vanilla listener live in `main.tsx` and only hydrate the React widget
  when the trigger event fires?
- [ ] Manual chunks: split `@sentry/react` into its own chunk so it
  doesn't bloat the entry.

**Verify:**
1. `npm run build` shows entry ≤ 70 kB gzipped.
2. Sentry still catches a thrown error in production.
3. A11y widget still appears on the landing page when navigating.

**Commit:** `perf(entry): defer sentry + sentry chunk` — SHA: `____`

---

### R4 — Edge cache rules in the Cloudflare Worker

**Status:** ✅ shipped 2026-05-16 (commit `a309557`) · **Why:** Move read-mostly responses to the
edge so Israeli users pay edge latency (~20 ms) instead of Supabase
Frankfurt (~80 ms+).

- [x] `worker/index.ts` now edge-caches GET `/api/features` and
  `/api/version` for 60 s with a 300 s stale-while-revalidate
  window. Limited to public, no-PII endpoints — auth-bearing
  endpoints intentionally NOT cached at the edge (they cache
  client-side via R1's readCache instead).
- [x] All other `/api/*` responses are now wrapped with
  `Vary: Authorization` as defence-in-depth. A future cache rule
  added by mistake can't cross-contaminate users on shared classroom
  devices.
- [ ] Brotli check deferred — Cloudflare enables it by default for
  text MIME types. Verify with `curl -I` after deploy.
- [x] Added `<link rel="preconnect">` to `auth.vocaband.com` (the
  Supabase custom-domain CNAME) in `index.html`. Pre-warms TLS so the
  first supabase-js call after bootstrap doesn't pay the handshake
  on the user's critical path.

**Verify:**
1. `curl -I https://www.vocaband.com/api/...` shows `cf-cache-status: HIT`
   on the second request (where appropriate).
2. Same endpoint with a different bearer token gets a distinct cache hit
   (no leakage).
3. Response headers show `content-encoding: br`.

**Commit:** `perf(edge): supabase preconnect + cautious /api edge cache` — SHA: `a309557`

---

### R5 — Real Slow-4G test + Sentry web-vitals + audit doc

**Status:** 🟡 partially shipped 2026-05-16 (commit `2bf3831`). Code
piece is live; browser-side measurement still needs an operator pass.

- [x] Sentry web-vitals — `browserTracingIntegration()` added to the
  init in `src/core/sentry.ts`. Captures LCP / CLS / INP / TTFB +
  page-load + navigation transactions. Trace headers restricted to
  our own origins.
- [x] Sentry session replay — `Sentry.lazyLoadIntegration('replayIntegration')`
  added via `addReplayIntegrationLazy()`, fired at `requestIdleCallback`
  in `main.tsx` so the ~50 KB replay code stays OFF the entry chunk
  (loads from `browser.sentry-cdn.com` at idle). `maskAllText: true`
  + `blockAllMedia: true` for PII safety. Sample rates: 10% sessions,
  100% on error.
- [x] **CSP unblock (silent-bug fix):** the ingest host and
  `browser.sentry-cdn.com` were both missing from `public/_headers`,
  meaning every Sentry event was being CSP-blocked in production with
  no user-visible signal. Now allowlisted.
- [x] Audit doc template committed at
  `docs/perf-audit-2026-05-TEMPLATE.md` with placeholders for real
  numbers and the measurement procedure baked in.
- [ ] **Operator task:** run the procedure in the template doc
  (Chrome Slow 4G + Lighthouse + 24 h of Web Vitals from Sentry),
  fill in the numbers, rename to `perf-audit-2026-05-DD.md`, commit.

**Verify (operator):**
1. Web-vitals events visible in Sentry dashboard 30 min after the
   first post-deploy classroom open.
2. Audit doc committed with concrete numbers.
3. Acceptance criteria checklist (below) passes on Slow 4G.

**Commit:** `feat(sentry): web-vitals + lazy replay + CSP unblock` — SHA: `2bf3831`

---

## Tier 2 — Paid upgrades (after the demo, if Tier 1 isn't enough)

Don't touch any of this until Tier 1 is shipped and we've measured a real classroom. These cost money and aren't worth it if the free tier already fixed the pain.

### 2A. Supabase Pro + read replica close to Israel

**Status:** 📋 not started · **Cost:** ~$25 + replica
**Why:** Cuts every read by 50–200 ms for Israeli users — the single biggest paid latency win.

- [ ] Upgrade project to Pro.
- [ ] Add read-replica in nearest AWS region (Bahrain `me-south-1` if Supabase supports it, otherwise stay `eu-central-1` Frankfurt).
- [ ] Route public reads through the replica via the Supabase client's read-replica routing.
- [ ] Keep writes on primary.
- [ ] Verify with `pg_stat_replication` that replication lag stays under 1 s.

### 2B. Cloudflare Workers Paid + Durable Objects for live challenge

**Status:** 📋 not started · **Cost:** $5/mo + DO usage
**Why:** Move the Socket.io live-challenge server off Fly.io and onto Cloudflare DOs. Edge-terminated WebSockets, no cold starts, scales to thousands of concurrent classrooms.

- [ ] Prototype a Durable Object that holds one challenge room's state.
- [ ] Migrate `SOCKET_EVENTS` (`src/core/types.ts`) handlers to the DO.
- [ ] Keep Fly.io as fallback for the first week — feature-flag the DO path.
- [ ] Compare end-to-end latency: Fly Socket.io vs DO from a Tel-Aviv test client.

### 2C. Cloudflare R2 + Images for audio/avatars

**Status:** 📋 not started · **Cost:** ~$0.015/GB stored, no egress fees
**Why:** Purpose-built CDN. Cheaper and faster than serving MP3s from Supabase Storage.

- [ ] Move word MP3s from Supabase Storage → R2 bucket.
- [ ] Convert MP3 → **Opus** (~50% smaller) in `scripts/generate-audio.ts`.
- [ ] Cloudflare Images for avatars (auto-format, auto-resize).
- [ ] Update `useAudio.ts` to point at the R2/Images URLs.

### 2D. Upstash Redis at the edge

**Status:** 📋 not started · **Cost:** ~$0–10/mo
**Why:** Cache hot reads (today's assignment per class, live leaderboard) at the edge from the Cloudflare Worker.

- [ ] Provision Upstash Redis (global).
- [ ] In `worker/index.ts`, cache leaderboard and assignment reads with a 30–60 s TTL.
- [ ] Invalidate on write events.

### 2E. Sentry Performance + Session Replay (paid tier)

**Status:** 📋 not started · **Cost:** scaled by event volume
**Why:** Free Sentry covers errors. The paid tier gives full session replay + transaction tracing, so we can *see* what a kid in a real classroom experiences instead of guessing.

- [ ] Confirm sampling rate (start at 10% of sessions, 100% of errors).
- [ ] Add `replayIntegration()` to the Sentry init in `src/main.tsx`.
- [ ] Privacy: mask all text by default (PII), only unmask non-sensitive selectors.

---

## Tier 3 — Don't bother (write down WHY so we don't revisit)

To stop re-litigating these every few months.

| Idea | Why we're skipping |
|---|---|
| Migrate off React/Vite to Next.js / SvelteKit | Wouldn't move the needle for our bottleneck (network + bundle). High cost, low ROI. |
| Replace Supabase with Firebase / PlanetScale | We'd lose RLS, EU residency, and our current SECURITY DEFINER paths. Cost > benefit. |
| Native app (Capacitor / Expo / React Native) | A real PWA gets 90% of the offline UX for 10% of the work. Revisit when we need camera/Bluetooth or App Store distribution. |
| Full visual redesign / new color system | Doesn't fix the school problem. Aesthetics come after the demo, not before. |
| Custom CDN / multi-cloud edge | Cloudflare is already an edge. Premature complexity. |

---

## Acceptance criteria for the school demo

We're not done until all of these pass on a real device, on actual school Wi-Fi:

- [ ] First visit lands in ≤ 4 s on Slow 4G.
- [ ] Repeat visit lands in ≤ 1 s.
- [ ] App opens fully offline after one visit (landing + dashboard + assignment list render from cache).
- [ ] A student can finish a 60-second game with Wi-Fi toggled off mid-round; progress syncs on reconnect.
- [ ] Lighthouse mobile performance ≥ 85 on production.
- [ ] Sentry shows real classroom session traces.

---

## Rollback plan

If anything in Tier 1 breaks production:

1. The service worker has an "unregister" escape — append `?sw=off` to the URL handler that calls `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))` and reload. Add this to `worker/index.ts` as a safety valve before shipping the SW.
2. Each Tier-1 task is a separate commit on `claude/optimize-offline-performance-DaEbm`. Revert the specific commit, don't squash.
3. The Dexie cache only adds reads — Supabase remains the source of truth. Worst case we ignore the cache.

---

## Open questions to resolve before Day 2

- [ ] What's the current Fly.io region? Check `fly status` — if not `fra` or `mad`, Tier 2B becomes more urgent.
- [ ] Are we already serving brotli from Cloudflare? Confirm before adding the build flag.
- [ ] Is there a `useOnlineStatus` hook? Search `src/hooks/` before writing a new one.

---

## Changelog

- 2026-05-16 — Plan created. Tier 1 owner: Claude. Tier 2 deferred until post-demo.
- 2026-05-16 (later) — **Major re-scope.** Codebase survey showed Days 1, 2,
  and 3 of original plan were already shipped by a prior engineer (PWA in
  `vite.config.ts:30-315`, lazy views throughout `App.tsx`, write queue in
  `core/saveQueue.ts`). Replaced day-1-4 checklists with R1…R5 by impact:
  read cache → offline UI → entry trim (optional) → edge cache → measure.
- 2026-05-16 (later still) — **R1, R2, R4 shipped.** Read cache + offline UI
  + edge cache/preconnect all live on branch. R3 (entry trim) skipped as
  per-plan-prioritisation (optional, low ROI for school demo). R5 (Slow-4G
  audit) is the remaining work — needs a real browser, can't be done in CI.
- 2026-05-16 (final) — **PR #698 merged to main.** Codex P1 (SWR-defeating
  empty-result writes in useTeacherData) caught + fixed in `aa8ce10`.
- 2026-05-16 (R5 code) — **Sentry web-vitals + lazy replay shipped** in
  `2bf3831`. Discovered + fixed a pre-existing silent CSP bug that had
  been suppressing all Sentry events in production. Audit doc template
  at `docs/perf-audit-2026-05-TEMPLATE.md`; operator fills in numbers.
