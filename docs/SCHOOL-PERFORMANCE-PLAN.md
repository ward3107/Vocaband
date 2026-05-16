# School performance plan — survive weak Wi-Fi

**Branch:** `claude/optimize-offline-performance-DaEbm`
**Started:** 2026-05-16
**Deadline:** ~4 days (next school demo)
**Goal:** Vocaband must load fast and stay usable on saturated school Wi-Fi (50–500 ms latency, frequent drops). Second visit should open instantly even offline.

This is the single source of truth for the sprint. Update the checkboxes as we go. If memory is lost mid-session, type `!resume` and read this file first.

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

## Tier 1 — Free wins (this week, ship before the demo)

These are the must-do items. Everything in Tier 1 must be live before we touch Tier 2.

### Day 1 — PWA shell + Workbox service worker

**Status:** 📋 not started

- [ ] Install `vite-plugin-pwa` and `workbox-window`.
- [ ] Configure `vite.config.ts` with `VitePWA({ registerType: 'autoUpdate', workbox: { ... } })`.
- [ ] Precache the app shell (`index.html`, entry JS, CSS, fonts, logo).
- [ ] Runtime caching rules:
  - `/api/*` GETs → `StaleWhileRevalidate`, 5 min max-age, network timeout 3 s.
  - `*.mp3` (word audio) → `CacheFirst`, 30-day expiration, max 500 entries.
  - Supabase REST `*.supabase.co/rest/v1/*` GETs → `StaleWhileRevalidate`, 1 min.
  - Images / avatars → `CacheFirst`, 30 days.
- [ ] Add a "new version available" toast that triggers `skipWaiting` so users don't get stuck on old builds.
- [ ] Update `manifest.webmanifest` — icons, theme color, display `standalone`, scope `/`, start_url `/`.
- [ ] Make sure the worker is scoped only to production (`devOptions.enabled: false` unless we want to test).

**Verify:**
1. `npm run build && npm run preview` → DevTools → Application → Service Workers shows the SW registered.
2. Reload with **Offline** checked in Network panel — landing page still renders.
3. Lighthouse PWA score ≥ 90 on production build.
4. Visit the live URL from a phone, airplane-mode, reopen — app shell loads.

**Commit:** `feat(pwa): vite-plugin-pwa + workbox runtime caching` — SHA: `____`

---

### Day 2 — Code-split `App.tsx` + lazy-load heavy data

**Status:** 📋 not started

`App.tsx` ships as one giant chunk today. Break it up so the landing page doesn't pull teacher/student/shop code.

- [ ] Convert all view imports in `App.tsx` to `React.lazy(() => import('./views/...'))`:
  - `StudentDashboardView`, `TeacherDashboardView`, `ShopView`, `GameModeSelectionView`, `GameActiveView`, `LiveChallengeView`, `QuickPlayStudentView`, `DemoMode`, `WorksheetAttemptsView`.
- [ ] Wrap each `<Suspense fallback={<ViewSkeleton />}>` — build a tiny skeleton component (`components/ViewSkeleton.tsx`) so users see structure, not blank screen.
- [ ] Audit `data/vocabulary.ts` and `data/sentence-bank.ts` — confirm both are still imported lazily via the existing `useVocabularyLazy` hook. Add `sentence-bank` lazy hook if missing.
- [ ] Pre-warm likely next views on idle: `requestIdleCallback(() => import('./views/GameActiveView'))` after dashboard mounts.
- [ ] Manually check there are no `import type` violations re-introducing eager loads (the Apr-28 audit lesson).

**Verify:**
1. `npm run build` → entry chunk under **70 kB gzipped** (today it's bigger).
2. `App-*.js` chunk ≤ **40 kB gzipped** (was 79 kB on Apr-28).
3. Network tab on landing page: only entry + landing chunks load, nothing teacher/shop.
4. Lighthouse mobile performance score ≥ 80 on `https://www.vocaband.com`.

**Commit:** `perf(routing): lazy-load views + suspense skeletons` — SHA: `____`

---

### Day 3 — Offline data + write queue (IndexedDB via Dexie)

**Status:** 📋 not started

Right now if Wi-Fi blips during a class, students lose progress mid-game. Fix with a local-first cache.

- [ ] `npm i dexie` and create `src/core/db.ts` (Dexie schema with tables: `assignments`, `classRoster`, `progressQueue`, `vocabularyCache`).
- [ ] Wrap Supabase reads for these tables in a "cache-then-network" helper:
  ```ts
  const cached = await db.assignments.where({ classId }).toArray();
  if (cached.length) render(cached);              // instant
  const fresh = await supabase.from('assignments')...;
  if (fresh) { db.assignments.bulkPut(fresh); render(fresh); }
  ```
- [ ] Outbound writes (progress save, leaderboard updates) → enqueue in `progressQueue` first, then attempt POST. On failure, retry with exponential backoff (2/4/8/16 s). Drain queue on `online` event.
- [ ] Add a top-bar offline indicator (existing `useOnlineStatus` hook? — search; if missing, write one in `hooks/useOnlineStatus.ts`).
- [ ] Show "saved locally, will sync" toast when a write was queued.

**Verify:**
1. Throttle to "Offline" mid-game → game still completes, no error.
2. Reconnect → check Supabase row appears with the right `score` and `created_at`.
3. Reload page offline → assignment list still renders from Dexie.
4. No duplicate rows in Supabase after replay.

**Commit:** `feat(offline): dexie cache + write queue with retry` — SHA: `____`

---

### Day 4 — Edge caching + observability + real-network test

**Status:** 📋 not started

Final layer of polish + measurement.

- [ ] Add Cloudflare cache rules for read-mostly endpoints. In `worker/index.ts`:
  - Cache `/api/class/:id/roster` and `/api/assignments/:classId` for 60 s with `s-maxage=60, stale-while-revalidate=300`.
  - Make sure auth-bearing requests bypass cache (vary on `Authorization`).
- [ ] Turn on Sentry **web-vitals** + **session replay-on-error** (Sentry MCP is already configured — confirm DSN + sample rate).
- [ ] Add a `<link rel="preconnect">` for `*.supabase.co` and the Cloudflare R2 audio bucket in `index.html`.
- [ ] Brotli/gzip — confirm Cloudflare is compressing `*.js` and `*.json`. Manual check: response headers should show `content-encoding: br`.
- [ ] **Real-network test.** Chrome DevTools → Network → throttle to "Slow 4G" → run the full flow: landing → login → assignments → play one game → finish. Record metrics.
- [ ] Update `docs/perf-audit-2026-04-28.md` with new before/after numbers (or create a follow-up audit doc).

**Verify:**
1. On Slow 4G, landing page interactive in ≤ 3 s.
2. Assignment list shows within 1 s of dashboard mount (cache hit).
3. Lighthouse mobile performance ≥ 85 on production.
4. Web-vitals appearing in Sentry dashboard.

**Commit:** `perf(edge): cache rules + preconnect + web-vitals` — SHA: `____`

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
