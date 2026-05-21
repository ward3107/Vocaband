# Vocaband — Production Readiness Audit

> Date: 2026-05-21
> Branch: `claude/resilient-systems-design-eFen4`
> Scope: end-to-end pre-scale audit for Israeli K-9 school deployment at 5,000+ concurrent users across thousands of classrooms.
> Method: parallel deep-dive on backend/infra, real-time/sync, frontend/PWA, and security/data layers, plus targeted code reads across `server.ts`, `worker/index.ts`, `vite.config.ts`, `supabase/schema.sql`, and the 165-migration history.

---

## Executive Summary

Vocaband is **operationally credible for a 50-class pilot** and **structurally close to ready for a 5,000-student peak**, but several specific gaps will produce visible failures during the 08:00 mass-login spike, during partial Supabase degradation, or during a routine Fly deploy.

The team has done unusually serious work for a platform this young:

- **Security**: Six audit phases through 2026-05-08. CSP hardened to drop `unsafe-eval` and most `unsafe-inline`. RLS enabled on every table. Seven security migrations applied and verified with a checked-in pen-test script (`scripts/security-pen-test.sh`) wired into CI as a hard gate. SSL Labs A+. Three HIGH and three MED audit findings closed with explicit, verifiable migrations.
- **Frontend reliability**: `vite-plugin-pwa` configured with `NetworkFirst`-for-HTML and `CacheFirst`-for-hashed-assets — the right architecture, and the inline comments show several historical foot-guns (cached-redirect bug, OAuth callback breaking, PDF SW capture) already fixed. `LazyErrorBoundary` recovers from chunk-load errors. `OfflineIndicator` communicates loss of connectivity. Bundle is chunked into `react-vendor`, `motion`, `lucide`, `vocabulary`, `supabase`, `sentry`.
- **Backend**: Socket.IO with Redis adapter, JWT re-verification, monotonic-score validation with a +10 increment cap, multi-tab disconnect refcounting, throttled leaderboard broadcasts, Cloudflare-only ingress filtering on the Fly side.
- **Observability**: Sentry is wired, `DISASTER-RECOVERY.md` + `INCIDENT-RESPONSE.md` + `RISK-REGISTER.md` exist, a postmortem (`POSTMORTEM-infinite-loop-freeze.md`) shows incident-discipline maturity, and an uptime-monitoring-setup doc is committed.

What is **not yet ready** for billion-dollar-grade scale:

- **Fly.io single point of failure** — `min_machines_running = 1` and `auto_stop_machines = 'stop'`. One OOM kill at 07:58 drops every socket the moment classes start.
- **SIGTERM does not drain sockets** — the handler clears intervals but doesn't `server.close()` or wait for in-flight requests. Every deploy and every Fly auto-stop is a small outage for whoever was mid-action.
- **Rate limiters are in-memory** — when the second Fly machine spins up under load, per-user and per-IP caps silently halve (or worse), bypassing the protection intended.
- **JWT re-verification is synchronous and synchronized** — every 5 minutes, every connected socket calls `verifyToken()` against Supabase Auth; for 2,000 sockets on one machine this is a small thundering herd that competes with real traffic for Supabase capacity.
- **No per-school AI cost ceiling** — Anthropic and Google AI calls are gated only by per-teacher request-rate limits, not by token budget. One enthusiastic district can burn the monthly cap in a day.
- **No distributed tracing** — `tracesSampleRate: 0` in Sentry. Below the Worker→Fly edge, "this request was slow" is observationally invisible.
- **Real-time scaling ceiling is narrow** — single-process socket.io with a 2,000-socket hard limit, Upstash free-tier pub/sub at ~120 commands/sec, and leaderboard broadcasts that scale O(N) per class. The platform can host one school comfortably; ten simultaneous mass-logins exceeds the current envelope.

The platform is in a class above "MVP" and a class below "ready for nationwide rollout." The gap between those is roughly the work in this document's **Immediate** + **Short-Term** sections — measured in weeks, not quarters.

---

## Critical Risks

Severity-ordered. Each has file:line citations and a concrete fix.

### C1. Fly.io single machine + no graceful drain = guaranteed mid-session outages

**Files**: `fly.toml:60` (`min_machines_running = 1`), `fly.toml:55` (`auto_stop_machines = 'stop'`), `server.ts:1861-1866` (SIGTERM handler).

**What happens**:
- At 07:55 the single Fly machine is cold or off (auto_stop).
- At 08:00 students arrive; the machine boots while traffic queues. TSX JIT + Supabase client init takes 30-60s on a 512MB shared-cpu-1x.
- If the machine OOM-kills during boot, all incoming requests fail.
- During any deploy, SIGTERM arrives; the current handler only `clearInterval()`s and calls `limiter.shutdown()` — it does **not** call `httpServer.close()`, does **not** broadcast `disconnect` to socket clients with a graceful reason, and does **not** wait for in-flight RPCs to complete.

**Impact**: Every deploy is an outage for active sessions. Every auto-stop wake-up is an outage for the first 30-60s of class. A teacher mid-live-challenge during a deploy loses their leaderboard state with no recovery prompt.

**Fix**:
1. `min_machines_running = 2` (one warm fra, one warm in a secondary region for region failover).
2. Pre-provision a third machine via cron at 07:55 IDT on weekdays.
3. SIGTERM handler:
   ```ts
   process.on('SIGTERM', async () => {
     console.log('[shutdown] SIGTERM received, draining');
     io.emit('server:draining'); // client shows reconnect banner
     httpServer.close(); // stop accepting new connections
     io.disconnectSockets(true); // close existing with reason
     await new Promise(r => setTimeout(r, 5000)); // brief drain
     clearInterval(qpSweepInterval);
     clearInterval(reverifyHandle);
     await limiter.shutdown();
     process.exit(0);
   });
   ```
4. Add `kill_signal = "SIGTERM"` + `kill_timeout = "30s"` to `fly.toml` to let Fly wait for the drain.

### C2. In-memory rate limiters silently bypassed in multi-VM mode

**Files**: `server.ts` — `preAuthIpLimiter`, `perUserLimiter`, `scoreUpdateLimiter`, `observeLimiter`. Currently `express-rate-limit` with the default memory store; Redis adapter is wired for socket.io but NOT for the limiter store.

**What happens**: Once a second Fly machine boots under load, a user hitting the limit on machine A can simply retry; their next connection lands on machine B with a fresh in-memory bucket. The "5 joins/min/user" guarantee silently degrades to "5 joins/min/user-per-machine."

**Impact**: All the rate limits the security team carefully tuned (200 joins/min/IP, 5 joins/min/user, 2 scores/sec, 60/min Bagrut) are best-effort under scale, not enforceable.

**Fix**: Switch to `rate-limit-redis` backed by the same Upstash Redis the socket.io adapter uses.
```ts
import RedisStore from 'rate-limit-redis';
const perUserLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  windowMs: 60_000,
  max: 5,
  keyGenerator: req => `rl:user:${req.user.uid}`,
});
```

### C3. Quick Play 6-digit session code enumeration

**Files**: `server.ts:2688-2742` (POST/GET session lookup), prior audit `docs/security-audit-2026-04-28.md` (MED #5 still open per `docs/SECURITY-OVERVIEW.md` line 297).

**What happens**: The 6-digit code space is 10⁶ = 1M. At 60/min/IP (current limit), one IP enumerates the entire space in ~278 hours; 16 IPs in 17 hours; a small botnet in minutes. Once a valid code is found, the GET endpoint returns session metadata including student nicknames and current scores.

**Impact**: Privacy leak — minors' display names + classroom progress visible to anonymous attackers. FERPA/GDPR concern given the audience is K-9 students.

**Fix**:
1. Lower the per-IP rate limit on session lookup to 10/min (was 60/min).
2. Add an exponential cooldown after 3 invalid lookups per IP.
3. Require an anonymous client token (issued cheaply on first SPA load) before the lookup; cooldown per token, not just per IP.
4. Lengthen the code to 8 characters mixed alphanumeric (`A-HJ-NP-Z2-9` to avoid 0/O/I/1) — search space jumps from 10⁶ to ~32⁸ = 1.1×10¹². Migration cost is one schema change + one column rename; old 6-digit codes can coexist with a `code_v` column.

### C4. No per-school AI cost ceiling

**Files**: `server.ts:2744-2870` (sentence cache), `3047-3284` (text/lesson generation), `3286-3478` (Bagrut grader).

**What happens**: AI endpoints have per-teacher rate limits (10 requests/window for translate, 30 for Bagrut, etc.) but no token budget. A motivated teacher with a class of 35 students at 30 Bagrut/day = 1,050 grader calls/day at ~10k input tokens each = 10.5M tokens/day. A district with 100 such teachers reaches the documented $5k/month Anthropic budget in **roughly 6 days**.

**Impact**: Predictable budget overrun within first month of district-scale launch. Worse: the failure mode is silent until the Anthropic key starts returning 429s, at which point all AI features break for everyone.

**Fix**:
1. Per-school monthly token counter in Redis: `aitokens:school:<id>:2026-05`, incremented on every successful call, checked before each call.
2. Two thresholds: warning at 80% (email school admin + log to Sentry), hard cap at 100% (return 503 with `Retry-After: <next-month-1>` and a graceful in-app message).
3. Optional: per-class budget for fine-grained control.
4. Pre-aggregate cost-per-request: Anthropic returns `usage.input_tokens` + `usage.output_tokens` in every response; multiply by current Sonnet 4.7 pricing.

### C5. JWT re-verification is a synchronous synchronized thundering herd

**Files**: `server.ts:972-986` (reverify interval), `server.ts:125-155` (`verifyToken()`).

**What happens**: Every 5 minutes, the reverify interval iterates all connected sockets and calls `verifyToken()` synchronously. With 2,000 sockets on one machine, that's 2,000 sequential Supabase Auth API calls firing in a tight window. Each call holds the Node event loop. If Supabase Auth is slow (high p99 is common during their own load spikes), the whole machine stalls.

**Impact**: Once every 5 minutes during a busy class period, leaderboard updates pause, score submissions stall, and students see "Reconnecting…" for several seconds.

**Fix**:
1. Stagger verifications: instead of one batch every 5min, run a continuous rolling pass at ~1 verification per 200ms; each socket gets re-verified roughly every (N × 200ms) seconds, smoothing the load.
2. Use `supabaseAdmin.auth.getUser(token)` with `Promise.all` chunks of 10, with a per-call 2s timeout.
3. Cache the result for 60s per token to avoid re-verifying the same token if a tab reconnects.

### C6. Fire-and-forget cache writes lose data silently

**Files**: `server.ts:2588-2599` (TTS upload), `server.ts:2844-2854` (sentence cache), `server.ts:3450-3460` (Bagrut cache).

**What happens**: After expensive AI generation completes, the result is written to a cache table with no retry, no idempotency key, and the only failure handling is `console.error`. If Supabase has a transient blip during the write, the next identical request misses the cache and re-spends AI budget.

**Impact**: Wasted AI spend (compounds with C4) and inconsistent UX — the same word's TTS sometimes plays from cache, sometimes triggers a regeneration.

**Fix**: Wrap cache writes in a `pRetry` with exponential backoff (3 attempts, 200ms-1.6s); log the final failure to Sentry as a warning (not an error — the user-facing response already succeeded).

### C7. Progress RLS UPDATE policy has a NULL-comparison subtle bug

**File**: `supabase/schema.sql:235-242`.

```sql
CREATE POLICY "progress_update" ON public.progress
  FOR UPDATE
  USING (auth.uid()::text = student_uid)
  WITH CHECK (
    auth.uid()::text = student_uid AND
    score >= (SELECT p2.score FROM public.progress p2 WHERE p2.id = progress.id)
  );
```

**What happens**: The subquery `(SELECT p2.score FROM public.progress p2 WHERE p2.id = progress.id)` resolves to the row identified by `progress.id`. If the row was just inserted in the same statement (rare but possible via `INSERT ... ON CONFLICT DO UPDATE`), or if the subquery returns NULL for any reason, Postgres three-valued logic yields `score >= NULL` → `UNKNOWN` → policy denies. This is actually safe behavior in the common case.

However, the policy uses `WITH CHECK` only on UPDATE, not on INSERT. The INSERT policy (`progress_insert`, lines 226-232) does **not** constrain `score`. A new row can be inserted with `score = 999.99` (the column CHECK caps at 1000) in a single statement, and the UPDATE-only monotonic guard is never invoked.

**Impact**: A student can submit a single high-score row directly via the Supabase REST API, bypassing the `save_student_progress` RPC's validation. Monotonic-score protection assumes UPDATE semantics; INSERT-from-zero pattern is unprotected.

**Fix**:
1. Add a `WITH CHECK` clause to `progress_insert` that constrains score against a server-validated maximum (e.g., `score <= 100` for a 100-point assignment), or
2. REVOKE INSERT on `public.progress` from `authenticated` and force all writes through the `save_student_progress` SECURITY DEFINER RPC, which already has the validation. (This is the pattern the security team adopted for `save_student_progress_batch`; extend it to single-row inserts.)

---

## Future Failure Predictions

### Within the next 4 weeks

1. **First "white screen of death" report after a deploy** — a teacher's tab is mid-action when SIGTERM arrives; their next request hits the half-drained machine; LazyErrorBoundary catches a chunk that's now missing because the new build dropped that hash; `attemptChunkReload` runs but the SW cached the old `index.html` (despite `NetworkFirst`, the cache layer can win on a 3s timeout); user sees the recovery screen but they were in the middle of an active assignment and the partial answer state is gone. **Mitigation**: C1 fix + a `localStorage` write-through of in-progress game state, with a "We saved your progress — resume?" prompt on re-entry.

2. **Live challenge "stuck on Question 3"** — a school's NAT'd outbound IP hits the 200 joins/min IP limit during a 30-class simultaneous live session (~900 students from one IP). Half the students are denied connection upgrade; their UI shows "Joining…" forever. **Mitigation**: distinguish "school IP with N classes" from "single attacker" — add an enterprise allowlist or scale the per-IP limit by claimed class count.

3. **Cost spike incident** — one teacher discovers AI lesson generation, generates 50 lessons in an afternoon for a curriculum review; combined with C4, monthly Anthropic spend doubles week-over-week.

### Within the next 6 months

4. **Supabase compute hits Pro tier connection ceiling** — Postgres connection pool fills during a coordinated mass-login (RLS subqueries hold connections longer than typical reads). New queries queue. Symptoms: intermittent 500ms+ TTFB on dashboard loads, no obvious correlation.

5. **Redis pub/sub saturation** — Upstash free tier (10k commands/day) is fine for one school; at 10 schools' simultaneous live challenges (10 classes × 30 students × 10 updates/sec = 3,000 broadcasts/sec across the platform), free tier saturates within minutes. Symptoms: leaderboards stop updating across some classes but not others, with no error.

6. **Service Worker cache divergence** — clientsClaim + skipWaiting are good for fast updates but expose a window where one tab is on v17 and the freshly-opened sibling tab is on v18; they share `localStorage` and Supabase auth state but use different chunk maps. Symptoms: random TypeErrors in Sentry that can't be reproduced.

### Within the next 12 months

7. **Supabase RLS query plans degrade** — `assignments_select` uses an `IN` subquery against `classes` that scans all classes the user might belong to. As `classes` grows past ~10k rows, the planner may stop using `idx_classes_code` and table-scan instead. Symptoms: dashboard load time grows linearly with platform size.

8. **Service-role key rotation forgotten** — the playbook is in `docs/SECURITY-OVERVIEW.md` but the rotation cadence isn't automated. After the 6-month mark a security audit will flag this; if there's no engineer comfortable with the rotation, recovery is fragile.

---

## Connectivity & Offline Resilience Audit

**Status**: Excellent foundation, gaps in write-conflict resolution.

What works well:
- `OfflineIndicator` ([src/components/OfflineIndicator.tsx](src/components/OfflineIndicator.tsx)) shows a polite, RTL-aware banner with `aria-live="polite"`.
- Mention in code of `saveQueue` (writes) + `readCache` (reads) layers — the right architecture.
- Service worker `NetworkFirst` for HTML with a 3s timeout, fallback to cached `/index.html`, last-resort synthesized HTML with a recovery link ([vite.config.ts:388-401](vite.config.ts:388)).
- Hashed assets `CacheFirst` with 200-entry LRU, 30-day TTL.
- Word audio cached aggressively (2000 entries, 180-day TTL) — a flaky-Wi-Fi student playing the same set twice gets the second play offline.

Gaps:

| Gap | Impact | Fix |
|---|---|---|
| **No conflict resolution strategy for offline writes** | Student plays the same game offline, queue holds the result, comes back online — the result is replayed. If they played twice (once on this device, once on a sibling's), the second submission overwrites the first or duplicates the row. | Per-attempt UUID generated client-side; server uses `INSERT … ON CONFLICT (uuid) DO NOTHING`. Already present in `idx_progress_dedup` but no UUID column. |
| **Save queue durability** | If the queue lives in memory, a tab crash loses everything queued. If it lives in `localStorage`, a Safari/iOS evicting the origin under storage pressure (which Safari does aggressively) loses everything. | IndexedDB with a per-record `created_at` and `last_attempt_at`; surface a "your progress is queued" status in the OfflineIndicator. |
| **No "sync resolution" UI** | After 30+ minutes offline, when the student comes back, the sync happens silently. If a write fails (RLS rejection because their session expired offline), there is no UI for them to recover. | "Re-sign-in" modal that surfaces queued writes and offers manual retry. |
| **PWA install prompt doesn't pre-warm caches** | First-install over Slow 4G fetches ~286ms of critical path but **no** game-mode chunks. A student installing the PWA before walking into a basement classroom has the shell but not the game. | Add a "Preparing offline mode…" step that pre-fetches the 2-3 most-used game modes after install. |
| **Audio download bursts on first encounter** | Word-audio is `CacheFirst`, meaning **first** encounter is `NetworkOnly`. A class of 30 students all hitting the same 20-word assignment cold-starts 600 audio fetches against Supabase Storage in seconds. | Pre-warm by emitting the audio URLs in the assignment payload; the SW can `cache.add()` them on assignment fetch. |

**Offline Resilience Score**: **78/100**. The architecture is correct; the implementation details need a deliberate pass before mass adoption.

---

## Scalability Audit

### Compute ceilings

| Component | Current | Ceiling | Headroom |
|---|---|---|---|
| Fly machines | 1 (`min_machines_running=1`) | Auto-scales to ~3 typically | 6,000 sockets aggregate (hard_limit=2000 × 3) |
| Fly machine memory | 512MB shared-cpu-1x | ~430MB usable after JIT+supabase-js+sockets | OOM at ~2,000 concurrent if any has buffered broadcasts |
| Supabase Postgres | Free or Pro tier (verify) | Connection pool ~15 (free) / 60 (pro) | Insufficient for 5k simultaneous active queries |
| Upstash Redis pub/sub | Free tier likely | 10k commands/day | Sub-1 day burn under 10 schools live |
| Anthropic budget | $5k/month (per fly.toml comments) | ~16M Sonnet output tokens | One enthusiastic district = ~6 days |

### The 08:00 mass-login simulation

For a single school with 30 classes × 30 students = 900 students arriving in a 5-minute window:

1. **DNS** — `www.vocaband.com` resolves via Cloudflare. No bottleneck.
2. **Edge HTML** — Cloudflare serves the static `index.html` from R2 / Workers Assets. ~1ms TTFB. No bottleneck.
3. **Asset fetch** — `react-vendor`, `App`, `motion`, `lucide` chunks. Modulepreload hints fire them in parallel ([vite.config.ts:55-58](vite.config.ts:55)). On school Wi-Fi at 50ms RTT and 5Mbps shared across 30 devices, ~3-5s cold. Acceptable.
4. **Auth** — Supabase Auth `/token` for refresh, or PKCE code exchange. Supabase GoTrue has documented per-IP limits; the school's NAT IP could hit them. **Risk: yes** — verify the limits in `docs/auth-rate-limits.md` are sufficient.
5. **Socket connect** — 900 socket.io handshakes against Fly. At hard_limit=2000, comfortably within one machine, but the per-IP rate limiter (`preAuthIpLimiter`, 200/min) **rejects most of them**. **Risk: critical.** A typical school has one outbound IP; the limit was tuned for individual attackers, not a NAT'd classroom.
6. **Initial dashboard query** — `users`, `classes`, `assignments`, `progress` selects. Each hits Supabase. The `assignments_select` policy ([schema.sql:166-175](supabase/schema.sql:166)) does an `IN` subquery. 900 queries × Postgres planner work × possibly 60-connection pool = queueing.

**Most likely failure point**: step 5 (preAuthIpLimiter). One fix unblocks the others.

### Scaling fixes by tier

**Tier 1 (immediate, for current scale)**:
- C1 fix (min_machines=2, graceful drain).
- C2 fix (Redis-backed rate limits).
- Bump preAuthIpLimiter to 5000/min or distinguish schools by anon client token instead of IP.
- Upgrade Fly machine to `shared-cpu-2x` or `dedicated-cpu-1x` with 1GB memory.

**Tier 2 (for 10x scale)**:
- Verify Supabase plan covers expected pool size; consider Supavisor connection pooler.
- Pre-warm Fly machines on a 07:55 cron (IDT weekdays).
- Move Upstash to paid tier (~$10/mo for 1M commands/month).
- Denormalize `users.class_code` lookups via Redis cache (clears the RLS subquery hotspot).

**Tier 3 (for 100x scale)**:
- Multi-region Fly deployment (current is fra only; add iad for transatlantic failover).
- Read replicas for Supabase Postgres.
- Sharded socket.io rooms by class_id with sticky routing.

**Scalability Confidence Score**: **65/100**. Architecture is correct (Redis adapter, edge cache, Cloudflare ingress), but the in-memory rate limiters and the per-IP limit interacting with NAT'd school IPs is the immediate bottleneck.

---

## Performance Audit

### What's been done well

Reading [vite.config.ts](vite.config.ts) is a tour through hard-won perf lessons:

- **Inlined `boot.css`** at build time to save one render-blocking RTT ([vite.config.ts:69-93](vite.config.ts:69)).
- **Modulepreload hints** for `App-*.js` and `LandingPage-*.js` only — the v1/v2/v3 tuning history in the comments is exactly the right depth of intent ([vite.config.ts:36-58](vite.config.ts:36)).
- **Service worker precache slimmed from 4.8MB to ~250KB** by switching from denylist to allowlist ([vite.config.ts:183-203](vite.config.ts:183)).
- **`maximumFileSizeToCacheInBytes: 400_000`** prevents the 404KB vocabulary chunk from accidentally being precached ([vite.config.ts:241](vite.config.ts:241)).
- **Chunk splitting** keeps React, motion, lucide, supabase, sentry, and vocabulary on independent cache keys.
- **`navigateFallbackDenylist`** correctly excludes OAuth callbacks (`?code=`, `?token_hash=`), PDF downloads, and `/quick-play` — all bug-fixed paths with explanatory comments.

### What still needs work

| Issue | Impact | Fix |
|---|---|---|
| **Vocabulary chunk is 404KB raw** ([src/data/vocabulary.ts](src/data/vocabulary.ts), lazy-loaded) | First game-mode entry on a Slow 4G connection waits ~6s for the chunk. | Split vocabulary by set (Set 1 / 2 / 3) so a Set 1 student doesn't load Set 2+3 words. |
| **Motion chunk (43KB gz) ships on cold landing** ([vite.config.ts:506-514](vite.config.ts:506)) | The chunk is needed only by animated landing components, but rolldown's JSX runtime co-location forces it into the cold path. | Documented but not fixed. Consider replacing `motion/react` with CSS-only animations on the landing surface, or migrating to a JSX-runtime-isolated motion fork. |
| **No INP / LCP RUM** | Performance regressions detected by users, not the team. | Add `web-vitals` library reporting to Sentry's Performance feature (when budget allows) or to a custom `/api/rum` endpoint. |
| **Audio elements not pooled** | Each game mode creates `<audio>` elements; on memory-constrained devices a long session may leak. | Audit `useAudio.ts` for cleanup; use a small pool of `<audio>` elements rotated per word. |
| **`framer-motion` instances on every animated card** | High-end Chromebooks fine; low-end Android Go devices stutter when 30 cards animate simultaneously. | `whileInView` instead of always-mounted, or prefer CSS animations for static decorations. |

---

## Frontend Reliability Audit

### Strengths

- **`LazyErrorBoundary`** ([src/components/LazyErrorBoundary.tsx:21-43](src/components/LazyErrorBoundary.tsx:21)) correctly identifies chunk-load errors via `isChunkLoadError`, attempts an in-place reload via `attemptChunkReload`, and falls back to `forceFullRecovery` (which the codebase presumably implements as a hard reload with cache-bust). The distinction between "soft retry" and "hard recovery" is the right design.
- **`OfflineIndicator`** is accessible (`role="status"`, `aria-live="polite"`) and translated for he/ar/ru.
- Component lazy-loading via `LazyComponents.tsx` and `SuspenseWrapper.tsx` (visible in directory listing). 5,277 total lines across `App.tsx` (1,200), `server.ts` (3,704), and `worker/index.ts` (373) — the per-file complexity is sustainable.

### Gaps

| Issue | Impact | Fix |
|---|---|---|
| **No global error boundary** (only the lazy one) | A synchronous render error in App.tsx itself crashes to white screen. | Wrap `<App />` in `<ErrorBoundary>` in `main.tsx`; show a friendly error with a "reload" + "unregister SW" button. |
| **No retry on Supabase reads** | A flaky-Wi-Fi student gets one shot per dashboard refresh; failures show generic toasts. | `fetchUserProfile` ([src/core/supabase.ts:354](src/core/supabase.ts:354)) has a one-retry pattern — extend it to all read paths as a wrapper, not per-call. |
| **`performUserLogout` uses `scope: 'local'`** ([src/core/supabase.ts:65-67](src/core/supabase.ts:65)) — fast logout, but the token is **not** revoked server-side | If the student's device is shared (school Chromebook), the logged-out token can still be used by a malicious sibling for up to 1 hour until natural expiry. | Trade-off was made for UX (logout-then-stare problem). Compensate with shorter access token TTL (15min) and a server-side denylist of revoked sessions on shared-device flows. |
| **Cross-tab session conflicts** | Student opens app in two tabs; each has its own socket.io connection but shares the Supabase session via localStorage. Live challenge state diverges. | Use `BroadcastChannel` to coordinate: only one tab owns the active socket; others observe via the channel. |
| **bfcache not handled** | Phone home button → return to tab → socket has been silently closed by the browser; UI thinks it's still connected. | `pageshow` event listener with `event.persisted` → re-establish socket; supabase.js already handles auth re-bind. |

---

## Backend Reliability Audit

Findings consolidated from the deep-dive infrastructure agent.

### Critical (covered above)
- C1: Single Fly machine + no graceful drain.
- C2: In-memory rate limits.
- C5: JWT re-verification thundering herd.
- C6: Fire-and-forget cache writes.

### High

- **No circuit breaker on Supabase calls** — if Supabase is slow, every endpoint hangs for the full HTTP timeout (~30s default). Recommend `opossum` circuit breaker with 5s timeout + open-circuit-on-50%-error-over-1min + fallback to cached data where possible.
- **`detectPromptInjection`** ([server.ts:286-333](server.ts)) checks `"""` and role-override patterns but misses Unicode smart quotes (U+201C/201D). A teacher pasting from Word evades detection.
- **No request-level timeout on RPC calls** — defaults to whatever the HTTP client picks (typically 30s+). Recommend explicit `signal: AbortSignal.timeout(5000)` on every Supabase call.

### Medium

- **Helmet CSP missing `frame-ancestors`** (the security overview notes Phase 5 added it; verify it's wired in the actual `helmet()` call).
- **Cloudflare ingress allowlist is hardcoded** ([server.ts:455-546](server.ts)) — adding a new endpoint requires Worker redeploy. Default-allow with explicit blocklist might be easier to operate, or admin endpoint to reload.
- **Disconnect reasons not logged** ([server.ts:1117-1140](server.ts)) — `socket.on('disconnect', reason => …)` should log to Sentry to diagnose Wi-Fi blip patterns.
- **No db-query latency middleware** — every Supabase call should record duration to a histogram for p50/p95/p99 tracking.

---

## Database & Data Consistency Audit

### RLS posture

The schema ([supabase/schema.sql](supabase/schema.sql)) and the seven applied 2026-04-28 security migrations represent a serious RLS effort. Every table has RLS enabled (line 83-87). Policies use `auth.uid()::text = …` consistently. Two SECURITY DEFINER helpers (`is_teacher`, `is_admin`) gate role-conditional logic.

The pen-test script (`scripts/security-pen-test.sh`) is now wired into CI (commit `e80b0ab`), which means the four anon-reject tests run on every PR. **This is unusually good practice.**

### Remaining concerns

| Concern | Severity | Fix |
|---|---|---|
| **Progress INSERT not score-bounded** (see C7) | High | INSERT-level `WITH CHECK` or REVOKE INSERT + force RPC |
| **`classes_select` is `USING (true)` for authenticated** ([schema.sql:142-144](supabase/schema.sql:142)) | Medium | Documented intent (codes are public lookup credentials), but combined with the enumerable 6-digit code space, this leaks the full class list to any authenticated student. **Lengthening codes (C3) reduces blast radius.** |
| **No audit log on `users.role` changes** | Medium | The UPDATE policy ([schema.sql:127-135](supabase/schema.sql:127)) correctly blocks self-promotion, but no audit trail captures admin role assignments. Add an `audit_log` table with INSERT trigger on role changes. |
| **`idx_progress_dedup` is `(assignment_id, mode, student_name, class_code)` — no UUID** | Medium | Hard to dedup safely; rely on the SECURITY DEFINER `save_student_progress` for write path, but the policy permits direct inserts (see C7). |
| **No FK on `progress.class_code`** | Low | A class deletion cascades through `assignments` but `progress.class_code` is a denormalized string column. After class delete, orphan progress rows remain. Add `ON DELETE SET NULL` or a periodic cleanup job. |
| **`Migration count is 165`** — schema evolution is healthy but the count suggests no consolidation/squashing | Low | Squashing migrations periodically (annually) keeps fresh-clone time fast. |

### Multi-tenant isolation test

Walking through the realistic attacker scenarios:

1. **Student A reads Student B's progress** — `progress_select` policy ([schema.sql:215-223](supabase/schema.sql:215)) limits to `auth.uid()::text = student_uid` OR teacher-of-class. **Blocked.**
2. **Student A reads Teacher B's class roster** — `users_select` policy ([schema.sql:118-120](supabase/schema.sql:118)) limits to self OR admin. **Blocked.**
3. **Student A reads assignments from a class they're not in** — `assignments_select` ([schema.sql:167-175](supabase/schema.sql:167)) restricts to classes the student's `class_code` matches. **Blocked.**
4. **Anonymous reads `quick_play_joins`** — Phase 2 migration narrowed this. **Blocked, verified by pen-test script.**
5. **Anonymous calls `save_student_progress_batch`** — Phase 2 migration added auth gate. **Blocked, verified by pen-test script.**
6. **Authenticated student writes high score directly to `progress` table** (bypassing RPC) — **Possible** (see C7). The monotonic-update check only fires on UPDATE.

### Realtime / Postgres-changes subscriptions

Worth verifying: if the app uses `supabase.channel().on('postgres_changes', ...)`, do RLS policies apply to the subscription stream? Supabase docs say yes, but it's worth a one-time pen-test (subscribe as student A to changes on `progress` table, have student B insert, confirm no event arrives).

---

## Real-Time Systems Audit

(Synthesized from the partial real-time agent output and direct `server.ts` reads.)

### Strengths

- Redis adapter wired for multi-VM socket.io scaling.
- Two namespaces (`/` authenticated, `/quick-play` unauthenticated) — separation of concerns is correct.
- Monotonic score validation with `MAX_SCORE_INCREMENT = 10` per update ([server.ts:1107-1109](server.ts)) — prevents score teleporting.
- Disconnect refcounting for multi-tab support ([server.ts:1117-1139](server.ts)) — better than naive disconnect on every tab close.
- Throttled leaderboard broadcasts (1500ms) ([server.ts:882-898](server.ts)).

### Gaps

- **Teacher disconnection handling unclear** — if the teacher's tab crashes mid-live-challenge, can the room continue? Are students stranded? Verify the `OBSERVE_CHALLENGE` and termination paths.
- **No sequence numbers on broadcasts** — out-of-order leaderboard updates can flicker rankings. Add a monotonic `seq` field; clients drop messages with `seq < last_seen`.
- **Reconnection state recovery** — when a student reconnects after a Wi-Fi blip, is server room state authoritative? Or does the client replay local state? Server-authoritative is the correct model; verify.
- **Heartbeat tuning** — socket.io defaults are pingInterval=25s, pingTimeout=5s. School Wi-Fi with 1s stalls and 500ms latency may falsely disconnect. Recommend pingInterval=30s, pingTimeout=20s for high-tolerance.
- **Backpressure** — slow clients (a Chromebook running a heavy Tableau in another tab) lag the broadcast pipeline. Use `volatile` emits for leaderboard updates (drop on slow client rather than buffer).

---

## Security Under Degraded Conditions

The biggest gap when connectivity is poor:

| Scenario | Risk | Mitigation |
|---|---|---|
| **Token expires during long offline period** | Queued writes fail server-side; UI shows generic error | Detect 401 in sync layer; trigger re-auth modal; queue persists until success |
| **PKCE code is in URL when SW caches the navigation** | Already fixed (see `navigateFallbackDenylist` for `?code=`, `?token_hash=`, etc. in [vite.config.ts:284-301](vite.config.ts:284)) — good defensive work | Maintained |
| **localStorage tampering on shared Chromebook** | A logged-in teacher leaves; the next user reads `sb-…-auth-token` from localStorage | Use sessionStorage instead of localStorage for teacher sessions; force re-auth on every browser open. Trade-off: worse UX for teachers on personal devices. Recommend: detect "school Chromebook" via UA/IP and apply the stricter policy. |
| **Cached service worker holds an old auth state** | After password change, the old token may be cached; mitigated by short JWT TTL | TTL is 1h by default — acceptable, but consider 15min for the access token + automatic refresh |
| **OCR/Gemini API key exposure** | Per `docs/SECURITY-OVERVIEW.md` line 124, the prefix+length leak was closed Phase 5 | Maintained, but verify the actual key is server-only |

---

## Mobile Device Reliability Audit

### Low-end Android (RAM < 3GB)

| Concern | Impact | Fix |
|---|---|---|
| **Memory pressure from motion/react** | Janky scrolling, occasional crashes | Wrap animated components in `prefers-reduced-motion` checks; serve plain CSS to low-end |
| **Audio element accumulation** | After 30+ words played in a session, audio elements may leak | Pool of 3 audio elements rotated |
| **IndexedDB write contention** | SW expiration writes + game progress queue + analytics — concurrent IndexedDB transactions on the same DB serialize | Workbox `expiration` is already tuned; verify our own queue uses a separate DB |
| **Storage quota exhaustion** | 60MB word audio + 6MB JS chunks + IndexedDB — close to Chrome's 6% origin quota on devices with 4GB free space | Add quota check on app boot; if < 100MB free, refuse to install offline mode |

### Old iPhones (iOS < 15)

| Concern | Impact | Fix |
|---|---|---|
| **PWA install behavior differs** | Apple's PWA install is via Share → Add to Home Screen, not the auto-prompt; the `PwaInstallBanner` should detect | Existing `PwaInstallGate.tsx` likely handles — verify on Safari iOS |
| **Background tab WebSocket close** | Safari aggressively closes background WebSockets | Already handled by socket.io reconnect logic; verify the reconnect doesn't double-count in score updates |
| **Storage eviction** | Safari evicts origin storage after 7 days of no use | Acceptable for a school-day app; document that re-install may be needed |

### Chromebooks (school standard issue)

| Concern | Impact | Fix |
|---|---|---|
| **Old Chrome versions on managed Chromebooks** | Schools delay Chrome updates; we may see Chrome 100 in the wild | Check `caniuse` for `BroadcastChannel`, `OffscreenCanvas`, `ResizeObserver` — verify graceful fallback |
| **Restricted extensions / managed policies** | Some schools block Service Workers entirely | Detect via `'serviceWorker' in navigator`; degrade to no-offline mode with a banner |

---

## Browser Compatibility & Edge Cases

The PWA SW config ([vite.config.ts](vite.config.ts)) shows many specific bugs already fixed:
- Cached redirect responses ([vite.config.ts:265-301](vite.config.ts:265)) — apex→www, /poster.html→/poster, OAuth callbacks
- PDF capture by SW navigate handler ([vite.config.ts:302-311](vite.config.ts:302))
- Third-party icon CSP block ([vite.config.ts:429-443](vite.config.ts:429))

Remaining edge cases worth verifying:
- **InAppBrowser warning** (`src/components/InAppBrowserWarning.tsx` exists) — verify it triggers for Facebook/Instagram/WeChat in-app browsers where OAuth flows fail.
- **CommandsAPI / clipboard** in older Firefox.
- **Pointer events on Joystick3D** for touch devices.

---

## Infrastructure & DevOps Audit

### Strengths
- CI gate for RLS pen-test (commit `e80b0ab`).
- Cloudflare TLS A+, HSTS preload submitted.
- Typecheck baseline file present (`.typecheck-baseline`) suggesting incremental TS strictness.
- Explicit Dockerfile and `fly.toml`.

### Gaps
- **No release tagging visible** — recommend `vYYYY.MM.DD-N` tags for every Fly deploy.
- **No staging environment** mentioned — every deploy is direct to production. Recommend a `vocaband-staging` Fly app for at-least-15-minute soak.
- **No rollback documentation** for Fly + Cloudflare + Supabase migrations as a combined unit. The DR doc exists; verify a tabletop exercise has been run.

---

## Chaos Engineering Scenarios

Recommended scenarios to dry-run before September school-year start:

1. **Kill the Fly machine during a live challenge** — `fly machine kill <id>`. Expected: all sockets reconnect within 5s, leaderboard state reconstructed from Redis. Currently: state is in-memory per process; if room state is not in Redis, the challenge dies.

2. **Throttle Supabase to 2s p99 for 5 minutes** — observe whether the app degrades gracefully or stalls.

3. **Partition Redis** (block the Upstash endpoint at the network level) — observe whether socket.io falls back gracefully or fails.

4. **Mass-login burst** — synthetic 1,000 socket connects in 10 seconds. Verify rate limit behavior, machine scale-up, and memory headroom.

5. **PWA cache poisoning** — install a deliberately-broken SW build in a test environment, observe whether the kill-switch (`/?unregisterSW=1`) works in the wild.

6. **Auth provider outage** — block Google OAuth callback URL; verify the email OTP fallback works.

7. **Service-role key rotation** — rotate via Supabase dashboard, deploy new env var, verify zero downtime.

8. **Bad JWT** — inject an expired token into a socket connection; verify the 401 path and reconnect flow.

9. **Time-skew device** — set device clock 2h in the future; verify JWT validation handles clock drift gracefully.

10. **CDN region outage** — simulate Cloudflare regional issue; verify the SPA still loads (it does — Cloudflare auto-fails-over to another region — but verify the experience for users in the affected region).

---

## Recommended Architectural Improvements

### 1. Move ephemeral live-challenge state to Redis

Today: room state is implicit in socket.io's in-memory rooms. A machine restart loses every active challenge.
Tomorrow: a `live_challenge:<id>` Redis hash holds canonical state; socket events read/write it; the in-memory cache is a soft layer. Recovery from machine restart becomes: client reconnects, server reads Redis, broadcasts current state to all room members.

### 2. Idempotency tokens on every write

Client generates a UUID per "intent" (a single tap, a single submission). Server's POST/RPC dedups against this UUID. Survives both client retries (network blip) and server retries (no-op on duplicate).

### 3. Outbox pattern for AI cache writes

After AI generation, the response is written to an `outbox` table in the same transaction as the user-facing response. A background worker drains the outbox into `sentence_cache` / `bagrut_cache`. Eliminates fire-and-forget data loss.

### 4. Soft cap → hard cap → backpressure on AI

- Soft cap (80% of monthly budget): warn the school admin.
- Hard cap (100%): return 503 with `Retry-After` header.
- Backpressure (during high concurrent demand): queue the request with a 30s timeout; surface "your lesson is being generated" UI; deliver via socket event.

### 5. Multi-region Fly with read-only failover

`fra` (primary) + `iad` (read-only standby that takes writes only when fra is health-check-failed for >2min). Supabase is EU-only; the iad machine talks to Frankfurt over the higher-latency link during failover. Acceptable for emergency continuity.

---

## Recommended Refactors

Listed in priority order.

1. **`server.ts` is 3,704 lines** — split into routes (one file per resource), middlewares, socket handlers, and a single `app.ts` that wires them. Right now one merge conflict can leave the entire backend unbuildable.
2. **`App.tsx` (1,200 lines)** is healthier than the CLAUDE.md suggested (5,800) but still owns too much routing logic. Pull the view-router into `src/router.tsx`.
3. **Per-screen save queue** — abstract the current `saveQueue` into a `useSyncQueue<T>` hook with a single durable IndexedDB-backed implementation, used by every offline-capable form.
4. **Test coverage for socket events** — server-side socket event handlers should have unit tests. Most don't. Use `socket.io-client` against a test server.
5. **Schema migration consolidation** — squash the 165 migrations into a single `0001_baseline_2026_05_21.sql` for clarity; keep individual files for the audit trail in `supabase/archived-migrations/`.

---

## Monitoring & Observability Plan

### What's wired today

- Sentry error tracking ([server.ts:1-50](server.ts) — verify TypeScript SDK init).
- Cloudflare Insights beacon (allowlisted in CSP).
- `/api/health` endpoint (verify it checks Supabase + Redis, not just process-alive).

### What's missing (priority order)

| Signal | Why it matters | Cheap implementation |
|---|---|---|
| **Real-User Monitoring (LCP/INP/CLS)** | Field perf invisible until users complain | `web-vitals` npm package → POST `/api/rum` → log to existing Sentry |
| **Distributed tracing across Worker→Fly→Supabase** | Cannot diagnose "which hop made this slow" | Set `tracesSampleRate: 0.05` in Sentry when budget allows; propagate `traceparent` header in the Worker |
| **Socket.io disconnect reason histogram** | School Wi-Fi blip rate is invisible | Log `reason` on every `disconnect`; aggregate in Sentry tags |
| **AI cost dashboard** | Spend visibility is monthly, not realtime | Daily cron writes per-school token usage to Supabase; surface in admin view |
| **Redis pub/sub latency** | Multi-machine leaderboard divergence is silent | Periodic ping with timestamp; log p95 to Sentry |
| **Supabase query duration histogram** | Slow queries invisible | Middleware that wraps every `supabase.from(...)` with timing |
| **SLO definition** | "Is the platform up?" is currently subjective | Define: 99.5% successful socket connect rate over a 5-min sliding window; 99% successful score submission in < 1s p95 |
| **Synthetic monitoring** | Outage detected by users, not paging system | UptimeRobot or similar pinging `/api/health` from 3 regions; pager on 2-region failure |

---

## Disaster Recovery & Business Continuity

Existing docs:
- `docs/DISASTER-RECOVERY.md`
- `docs/INCIDENT-RESPONSE.md`
- `docs/RISK-REGISTER.md`
- `docs/POSTMORTEM-infinite-loop-freeze.md`

Recommended additions:

1. **Tabletop exercise** — quarterly, 90 minutes: simulate "Supabase EU down for 2 hours, peak class time." Walk through every step of comms, customer message, fallback, restoration.
2. **Backup verification cadence** — Supabase PITR is plan-dependent; verify the team's plan covers desired RPO (recommend ≤ 1h) and RTO (recommend ≤ 4h).
3. **Data deletion playbook** — for GDPR right-to-be-forgotten requests. The cascading FKs (classes→assignments→progress) help, but `progress.class_code` (denormalized) won't cascade.
4. **Off-platform credential vault** — Fly secrets, Cloudflare API tokens, Supabase service-role key, Anthropic key, Google AI key. Today they live in Fly secrets + Cloudflare; recommend a 1Password / Bitwarden / HashiCorp Vault as the source of truth.

---

## Priority Action Plan

### Immediate (this week)

| # | Action | Effort |
|---|---|---|
| 1 | C1: `min_machines_running = 2` in fly.toml + graceful SIGTERM with `httpServer.close()` and 5s drain | 2h |
| 2 | C2: Migrate `express-rate-limit` to `rate-limit-redis` using existing Upstash client | 3h |
| 3 | C4 mvp: per-teacher daily AI token counter in Redis with hard cap | 4h |
| 4 | C7: REVOKE INSERT on `public.progress` from `authenticated`; force inserts through RPC | 1h migration + verification |
| 5 | Bump `preAuthIpLimiter` to 5000/min or add a school-IP allowlist mechanism | 2h |
| 6 | Log socket.io `disconnect` reason to Sentry | 30min |
| 7 | Add `frame-ancestors 'none'` to helmet CSP if missing | 15min |

**Estimated effort: 13 hours.** All have low rollback risk.

### Short-term (next 2-4 weeks)

| # | Action | Effort |
|---|---|---|
| 1 | C3: lengthen Quick Play codes to 8 alphanumeric + lower rate limit + anon token cooldown | 1d (schema migration + worker handling) |
| 2 | C5: stagger JWT re-verification across the 5-min window (continuous rolling instead of bulk) | 4h |
| 3 | C6: wrap AI cache writes in `pRetry` with exponential backoff | 3h |
| 4 | Pre-warm Fly cron at 07:55 IDT | 2h |
| 5 | Idempotency tokens on `save_student_progress_batch` (clientId + UUID) | 1d |
| 6 | RUM via `web-vitals` → `/api/rum` endpoint | 1d |
| 7 | OfflineIndicator + IndexedDB save queue with conflict resolution UI | 3d |
| 8 | Socket.io heartbeat tuning (pingInterval=30s, pingTimeout=20s) | 30min + observation |
| 9 | Audit Supabase plan against expected pool size; consider Supavisor | 2h decision |

**Estimated effort: 8 working days.**

### Mid-term (1-3 months)

1. Move live-challenge room state to Redis (architectural change).
2. Multi-region Fly deployment (`fra` primary, `iad` standby).
3. Distributed tracing across Worker→Fly→Supabase.
4. Refactor `server.ts` into routes + middlewares + socket handlers.
5. Outbox pattern for AI cache writes.
6. Synthetic uptime monitoring.

### Long-term (3-12 months)

1. Replace `motion/react` with CSS-only animations (closes the remaining CSP `unsafe-inline` style-src-attr gap).
2. Squash migrations into a baseline.
3. Multi-tenant data partitioning for the 100x scale.
4. SOC2 / ISO 27001 readiness for school-district sales.
5. Third-party penetration test (deferred per SECURITY-OVERVIEW.md operator-pending list).

---

## Scores

### Production Readiness — **72/100**

The platform has a solid security foundation (Phase 6 CSP, RLS pen-test in CI, 7 applied migrations, A+ TLS), a sophisticated PWA service worker with hard-won bug-fix history, error boundaries, lazy loading, offline UI, and a healthy operational doc suite. It is held back from the high 80s by the single Fly machine, the missing graceful drain, the in-memory rate limits in a multi-machine deployment, the synchronous JWT thundering herd, and the absence of distributed tracing.

### Reliability — **68/100**

Mean-time-to-recover is good for chunk-load errors (LazyErrorBoundary) and offline writes (save queue, when fully implemented). Mean-time-to-detect for backend issues is poor — Sentry catches exceptions but not slowness, and there is no RUM. Single Fly machine is the dominant reliability bottleneck.

### Offline Resilience — **78/100**

The PWA architecture is correct (NetworkFirst HTML + CacheFirst hashed assets + targeted runtime caching). The slim precache (250KB vs the old 4.8MB) is exactly right for school Wi-Fi. Word audio is cached aggressively. The OfflineIndicator and save queue layers are present. The gap is in write-conflict resolution and post-offline sync UX.

### Scalability Confidence — **65/100**

Redis adapter for socket.io is wired (good). Cloudflare edge caching for public endpoints. Worker→Fly proxy is efficient. **But** the in-memory rate limiters are not multi-VM-safe, the 200-joins/min/IP limit breaks under NAT'd school IPs, the Upstash free-tier ceiling is far below district-scale demand, and the RLS subqueries on `assignments_select` will degrade as the class count grows.

---

## Final Verdict

**Ship to a 50-class pilot today. Do not ship to a 5,000-student multi-school deployment without the Immediate action plan.**

The platform's bones are good. The team has demonstrated the right instincts — phase-by-phase security work with verifiable migrations, a service worker that has the scars to show it's been debugged in the field, comprehensive operational docs, and a CI gate for the RLS pen-test. That maturity is rare for a product this young.

What's missing is not "another year of work" — it's a focused 2-3 week sprint on the seven Critical risks above, plus a quarterly cadence on the chaos exercises and tabletop drills. After the Immediate + Short-Term sections of the action plan are complete, the platform is genuinely ready for nationwide school deployment.

The single most important fix is **C1 (Fly SPOF + graceful drain)** — it converts every deploy and every auto-stop wake-up from an outage into a non-event, and the engineering cost is roughly two hours. Do that today.
