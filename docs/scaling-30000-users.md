# Scaling Vocaband to 30,000 students + teachers

> Live status doc. Update as items move. Keep it lean.
> Last updated: 2026-05-17.
> Supersedes `docs/scaling-5000-users.md` (5k plan).

---

## Target

**30,000 total accounts**, with worst-case planning for:
- **~15,000 concurrent users** at peak (synchronized school lesson slots)
- **~2,000 concurrent in Live Challenge** (sockets with active broadcasts)
- **~5,000 concurrent in Quick Play / solo gameplay**

Current ceiling: **3 VMs × 2000 sockets = 6000 concurrent**. Target is **5× that**, plus secondary bottlenecks become real (auth, egress, AI cost, observability).

---

## Phasing — what to ship in the next 2-3 weeks

Three waves, ordered cheapest+safest first.

### Wave 1 — Free / cheap wins (this week)
Code-only changes I can ship without operator action.

| # | Item | Why | Status |
|---|---|---|---|
| W1.1 | **Local JWT verification on Fly** | Replace `auth.getUser()` with JOSE local verify using `SUPABASE_JWT_SECRET`. Saves 1 network call per API request + per socket connect. At 30k users this is the difference between Supabase Auth holding up vs. rate-limiting us. | ⏸ Pending |
| W1.2 | **Bump `fly.toml` concurrency to 3000/5000** | Current 1000/2000 was sized for 5k users. With Node 22 + 512MB room is tight but workable for ~3000 sockets/VM if we're disciplined about memory. | ⏸ Pending |
| W1.3 | **Per-VM socket memory probe** | Add `process.memoryUsage()` logging on a 30s tick so we know when a VM is actually saturating, not guessing. | ⏸ Pending |
| W1.4 | **Tighten existing per-user rate limits** | Audit `/api/translate`, `/api/ocr`, `/api/generate-sentence` — current limits were tuned for 100 teachers, not 1000+. | ⏸ Pending |
| W1.5 | **Loadtest fixes & docs** | k6 scripts exist but target 5k. Update `sustained.js` + `spike.js` to a 30k profile. | ⏸ Pending |

### Wave 2 — Paid infra (operator action, ~$200-350/mo new spend)
| # | Item | Cost | Why | Status |
|---|---|---|---|---|
| W2.1 | **Fly: bump to `performance-1x` × 2GB, scale count 8** | ~$160/mo | Each VM holds 4000 sockets comfortably with 2GB. 8 VMs × 4000 = 32k ceiling with headroom. Current shared-cpu-1x maxes out around 2-3k sockets safely. | ⏸ Pending operator |
| W2.2 | **Upstash Redis paid tier** | ~$10/mo | Free tier = 10k commands/day. With multi-VM socket adapter, every socket event = multiple Redis ops. Free tier dies within hours at 30k. **Without this, multi-VM sockets silently break.** | ⏸ Pending operator |
| W2.3 | **Supabase compute add-on bump** | $50-120/mo | Verify current tier (likely Micro/Small). At 30k users + active RLS, recommend **Small → Medium** (~$60/mo extra). Reassess after Wave 1 ships local JWT verify (cuts Auth load 90%+). | ⏸ Verify current tier |
| W2.4 | **Sentry team plan** | ~$26/mo | Error monitoring across 8 VMs. Free tier is single-user / no team alerts. | ⏸ Pending operator |
| W2.5 | **UptimeRobot Pro (optional)** | $7/mo | Free is 5-min interval. Pro = 1-min. At this scale, 5 minutes of downtime undetected is too long. | 🔵 Optional |

### Wave 3 — Storage & egress (1-2 weeks engineering)
| # | Item | Why | Status |
|---|---|---|---|
| W3.1 | **Move audio MP3s → Cloudflare R2 + CDN** | Currently served from Supabase Storage. At 30k students × ~50 audio plays/day = 1.5M MP3 fetches/day. Supabase egress at scale costs 10× what R2 + CDN does. Setup doc already exists: `docs/CLOUDFLARE_R2_SETUP.md` | ⏸ Pending |
| W3.2 | **Avatar / badge images → WebP/AVIF + R2** | ~6× smaller than PNG, served from same R2 bucket as audio. | ⏸ Pending |
| W3.3 | **Cache vocabulary JSON at Cloudflare edge** | `ALL_WORDS` is 6482 entries, currently lazy-loaded but hits origin. Cache at the Worker for 7 days. | ⏸ Pending |

### Wave 4 — Load test & verify (week 3)
| # | Item | Why | Status |
|---|---|---|---|
| W4.1 | **Provision staging Fly app + staging Supabase** | k6 scripts trip Cloudflare WAF against prod. Need real staging. | ⏸ Pending operator |
| W4.2 | **Run k6 `sustained.js` at 15k concurrent** | Validates Wave 1+2 changes hold up. | ⏸ Pending |
| W4.3 | **Run k6 `socket.js` at 5k concurrent Live Challenge** | Validates Redis adapter + throttled broadcasts. | ⏸ Pending |
| W4.4 | **Run k6 `spike.js` (5k → 25k in 30s)** | Validates Fly autoscale + concurrency thresholds. | ⏸ Pending |
| W4.5 | **Document findings + tune** | Wherever something breaks first, fix that. Iterate. | ⏸ Pending |

---

## Cost estimate (post-rollout, monthly)

| Service | Current | After |
|---|---|---|
| Fly.io (compute) | ~$10 (3× shared-cpu-1x) | ~$160 (8× performance-1x) |
| Supabase | $25 (Pro) | $25 + ~$60 compute add-on = $85 |
| Upstash Redis | $0 (free) | $10 |
| Cloudflare R2 + CDN | ~$0 | ~$15 (storage + 1.5M egress requests/day) |
| Sentry | $0 | $26 |
| Cloudflare Workers + Pages | bundled | bundled |
| **Total** | **~$35/mo** | **~$295/mo** |

At 30k students, that's **$0.01/student/month** in infra cost. Healthy.

---

## Key bottlenecks (ranked by blast radius)

1. **Supabase Auth `getUser()` per request** — at current call patterns, Supabase Auth becomes the bottleneck before compute does. Fix in W1.1 (local JWT verify).
2. **Redis quota** — free tier dies at multi-VM × any real traffic. Fix in W2.2.
3. **Socket memory per VM** — shared-cpu-1x at 2000+ sockets is right at the edge. Fix in W2.1 (bigger VMs).
4. **Audio egress** — Supabase egress at 1.5M reqs/day is expensive. Fix in W3.1 (R2).
5. **AI API spend spikes** — no hard caps today. Fix via operator spending limits + W1.4 per-user limits.

---

## What we already have working in our favor

- ✅ `@socket.io/redis-adapter` wired and tested (PR #549) — just needs paid Redis tier
- ✅ Throttled leaderboard broadcasts (max 1/sec per class, batched)
- ✅ Per-user (not per-IP) socket rate limiting — survives shared-NAT classroom scenarios
- ✅ k6 load test harness in `scripts/loadtest/` (smoke/sustained/spike/socket)
- ✅ Fly auto-stop/start — idle VMs cost ~$0 during nights, weekends, holidays
- ✅ Cloudflare Workers in front of everything — absorbs L3/L4 attacks
- ✅ Supabase RLS init-plan optimization already merged (`20260511160000_`)
- ✅ Duplicate permissive policies consolidated
- ✅ FK indexes added on `student_profiles`

---

## Decision log

- **2026-05-17:** Raised target from 5k → 30k. Operator confirmed 3 VMs already running. Promoted from `scaling-5000-users.md`. Ship in 2-3 weeks, prioritizing cheap+safe first.

---

## Legend
- ✅ Done
- ❓ To verify / audit
- ⏸ Pending action
- 🔵 Optional / defer
