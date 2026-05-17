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

## Cost model (post-rollout, monthly)

> Assumptions: **1,000 teachers + 30,000 students**, ~50% of teachers using AI features daily, 22 school days/month, audio served from R2.

### Full breakdown by tool

| Tool | What it does | Plan / spec | Monthly |
|---|---|---|---|
| **Fly.io** | Express + socket.io VMs | 8 × `performance-1x` (1 CPU, 2GB), auto-stop nights/weekends | **$140–180** |
| **Supabase Pro** | Postgres + Auth + Storage + Realtime | Pro $25 + Medium compute add-on $60 | **$85** |
| **Upstash Redis** | socket.io multi-VM adapter | Pay-as-you-go (~5M commands/day) | **$15–40** |
| **Cloudflare Workers** | Edge proxy + SPA hosting | Paid plan $5 + ~35M extra req/mo | **$15** |
| **Cloudflare R2** | Audio + image CDN (free egress!) | ~6 GB storage + 45M reads/mo | **$15** |
| **Cloudflare Pages** | Static SPA hosting | Free tier | **$0** |
| **Sentry** | Error monitoring across 8 VMs | Team plan, 50k events/mo with sampling | **$26** |
| **UptimeRobot** | `/api/health` uptime ping | Free (5-min) or Pro (1-min) | **$0–7** |
| **Gemini (Google AI)** | OCR + sentence gen + translation + TTS | ~220k Flash calls + 80k OCR + 30k TTS / mo | **$50–100** |
| **Anthropic Claude** | Bagrut test generation | Lower volume, ~10k generations/mo | **$20–50** |
| **Resend** | Parent digests + OTP emails | Pro $20 (OTP only) → Scale $90 (weekly digests) | **$20–90** |
| **Domain** | vocaband.com renewal | Amortized | **$1** |
| **GitHub** | Code + Actions | Free tier | **$0** |
| **Total** | | | **~$390–610/mo** |

**Most likely landing: ~$500/mo. Per-student: ~$0.017 (1.7¢).**

### Where it could be cheaper (with tradeoffs)

| Cut | Saves | Cost of cutting |
|---|---|---|
| 6 VMs instead of 8 | -$40 | Less spike headroom during synchronized lesson slots |
| Sentry free tier | -$26 | Single-user, no team alerts |
| UptimeRobot free | -$7 | 5-min detection vs 1-min |
| Self-host Redis on a Fly VM | -$20 | You now own ops for it |
| Aggressive AI per-teacher limits | -$50 | More support load from teachers hitting caps |

**Floor with cuts: ~$320/mo. Recommended: ~$500/mo. Buffered budget: $600/mo.**

### Cost gotchas

1. **AI APIs are the wildcard.** A teacher looping OCR on a textbook batch could spike to $300+/day with no cap. **Set hard monthly spending limits in Google Cloud + Anthropic dashboards** — this is tracked in operator-tasks.
2. **Supabase egress doubles the bill if audio stays on Storage.** Add +$100–200/mo if W3.1 (R2 migration) slips. R2 has *free* egress, which is why the migration pays for itself in ~2 months.
3. **Resend cost depends entirely on parent-digest volume.** OTP-only = $20/mo. Weekly digest to every parent = $90+/mo. Decide before launching the parent-digest feature.
4. **Upstash pay-as-you-go is unpredictable.** Once real usage is observed, switching to their **Fixed $60/mo unlimited plan** removes the variance.

### Comparison to today

| | Now (~3k users) | At 30k users | Delta |
|---|---|---|---|
| Total infra spend | ~$40 | ~$500 | +$460/mo |
| Per-user cost | ~$0.013 | ~$0.017 | flat |

At 30k students, that's **$6,000/year in infra** — well within any reasonable per-student license fee or Ministry contract.

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
