# Platform Consolidation & Cost Optimization Plan

> Status: **Approved**, not yet implemented
> Branch: `v2`
> Goal: reduce the monthly hosting bill and keep top performance while scaling to **1500 concurrent users**.

---

## TL;DR

| | Before | After | Change |
|---|---|---|---|
| **Supabase Pro** | $25.00 | $25.00 | Keep |
| **Supabase Custom Domain add-on** | $10.00 | **$0** | **Drop** |
| **Render Starter** | $7.00 | $7.00 | Keep (static files offloaded) |
| **Cloudflare domain** (`vocaband.com`, $10.46/yr) | $0.87 | $0.87 | Keep |
| **Cloudflare Pages** (static SPA) | — | $0 | **Add** (free tier) |
| **Cloudflare R2** (audio) | $0 | $0 | Consolidate |
| **Total** | **~$42.87/mo** (~$514/yr) | **~$32.87/mo** (~$395/yr) | **−$120/yr (23%)** |

**Bonus (not reflected in cost):** global edge performance via Cloudflare Pages and **5× Socket.IO headroom** on the same $7 Render instance, so we don't need to upgrade Render as users grow.

---

## Context

We currently pay for **Supabase + Render + Cloudflare**. The goal is:
1. **Reduce monthly cost** where it's safe
2. **Keep top performance** for 1500 concurrent users
3. **Not break anything** — no risky refactors for marginal savings

This plan is grounded in a code audit of the `v2` branch, not guesswork.

---

## Current Platform Usage (from code audit)

### Supabase — deeply used, irreplaceable
- **Auth:** email/password + Google OAuth (PKCE flow) — `src/core/supabase.ts:21-28`, `OAuthButton.tsx`, `OAuthCallback.tsx`
- **Postgres:** ~13 tables — `users`, `classes`, `assignments`, `progress`, `teacher_allowlist`, `quick_play_sessions`, `quick_play_joins`, `student_profiles`, `teacher_profiles`, `audit_log`, `consent_log`, `word_corrections` — across 43 migration files
- **RLS:** 24+ policies across core tables
- **RPCs:** `is_teacher()`, `is_admin()`, `is_teacher_allowed()`, `get_or_create_student_profile()`, `get_or_create_student_profile_oauth()` + others
- **Storage:** 2 public buckets — `sound/` (word audio) and `motivational/` (72 praise phrases), served via `{VITE_SUPABASE_URL}/storage/v1/object/public/...` — `src/hooks/useAudio.ts:10,21`
- **Realtime:** 3 channels already active — `qp-progress-${sessionId}`, `qp-session-${sessionCode}`, `qp-kick-${sessionId}-${uid}`
- **Edge Functions:** none deployed (unused capacity)

### Render — 1 Node service doing 4 things
From `render.yaml` + `server.ts`:
1. **Socket.IO live games** (stateful, in-memory: `liveSessions`, `socketSessions`, `socketRefCounts`) — `server.ts:93-393`
2. **SPA static serving** — Express serves `dist/` — `server.ts:555-580`
3. **`/api/translate`** — Google Translate proxy, teacher-only — `server.ts:405-482`
4. **`/api/ocr`** — Tesseract.js image-to-text, teacher-only, CPU-bound — `server.ts:486-547`

Only **#1 and #4** truly need a persistent Node server. **#2 and #3 don't.**

### Cloudflare — already mostly free
- **DNS + proxied CDN:** free tier
- **R2:** stores ~36 MB of motivational audio today — well inside the 10 GB free tier
- **Workers / Pages:** NOT currently used — **unused free capacity**
- **WAF / Bot management:** free tier in use

> **Key insight:** Cloudflare is not what costs money. The real costs are Supabase and Render. Cloudflare is the place to *add free capacity*, not where to cut.

---

## The Recommended Moves

### Move 1 — Drop the Supabase Custom Domain add-on (saves $10/mo = $120/yr)

This is the only line item on the bill that's purely cosmetic. It lets auth URLs look like `db.vocaband.com/auth/v1/...` instead of `xxx.supabase.co/auth/v1/...`. **Users never see this URL** — it only appears during the OAuth redirect, briefly.

**Trade-offs (small, real):**
- Google OAuth console needs the new redirect URI
- All currently-logged-in users will be logged out **once** (cookie domain changes) — they log back in normally
- Any email template link pointing at the custom domain needs to be updated

**What does NOT change:**
- `vocaband.com` (the frontend the users actually see) — unchanged
- Database, RLS, Realtime, Storage — all unaffected
- Student accounts, class codes, assignments, scores — all unaffected
- Cloudflare DNS — unchanged (the custom domain add-on was Supabase-managed)

### Move 2 — Move static SPA to Cloudflare Pages (same cost, much better performance)

Today Render serves `dist/index.html` + the JS/CSS bundle + `/assets/*`. That's 80%+ of Render's bandwidth and CPU. Cloudflare Pages serves the same files **from a global edge network** for free — faster for every user outside Render's single region.

After this move:
- `v2.vocaband.com` → Cloudflare Pages (static SPA)
- `api-v2.vocaband.com` → Render (API + Socket.IO only)
- Production (`vocaband.com`) follows the same pattern once v2 is proven stable

### Move 3 — Consolidate audio on Cloudflare R2 (optional, can defer)

Today motivational audio is on R2, word audio is on Supabase Storage. Moving the word audio (`sound/` bucket) to R2 too:
- Frees up Supabase Storage quota (room to grow without upgrading)
- Uses Cloudflare's zero-egress pricing (students download lots of audio)
- Keeps everything behind one CDN

---

## Why We're NOT Eliminating Render

Theoretically you could drop to 2 platforms (Supabase + Cloudflare) by:
- Replacing Socket.IO with Supabase Realtime broadcast channels
- Moving `/api/translate` and `/api/ocr` to Supabase Edge Functions

That's a **2–3 week refactor** for only **$7/mo more savings** on top of the $10/mo above. At your current scale, the risk-to-reward ratio is bad:
- Tesseract.js is CPU-heavy; Supabase Edge Functions cap at 250 MB Deno memory
- Socket.IO's server-side logic (SUM aggregation, rate limiting, token validation) would need to become Postgres functions — more complexity, more RLS gotchas
- Live games are the core product — refactoring them blind is dangerous

**Verdict:** Don't do it now. Revisit only if you outgrow Render Starter AND the $7 gap starts to matter.

---

## Scaling to 1500 Concurrent Users (per-platform headroom)

### Supabase Pro — already sized for it
- 50,000 MAU included (you'd use ~1,500–3,000)
- 200 concurrent Realtime connections included on Pro
- 8 GB DB included (you're using <100 MB)
- **No upgrade needed** unless Realtime concurrency becomes the bottleneck — add-on is ~$10/mo per +200 connections

### Render Starter — needs tuning, not upgrading
With static files moved to Cloudflare Pages, a single 512 MB Starter instance can handle 1500 sockets if you:
1. Raise `pingInterval` from 15s → 30s (`server.ts:99`) — halves heartbeat traffic
2. Ensure `/assets/*` is never served from Render (Pages owns it)
3. Keep the current throttling (2 score updates/sec per socket, 1.5s broadcast batching in `server.ts:210`)
4. Add `--max-old-space-size=400` to the Node start command to avoid GC thrash

**If Socket.IO becomes the bottleneck later**, the cheapest next step is:
- Add Upstash Redis (free tier = 10k commands/day; ~$0.20/100k after)
- Move `liveSessions` to Redis, add `@socket.io/redis-adapter`
- Run 2× Render Starter instances behind Render's load balancer (~$14/mo total)
- This gets you to ~3000 concurrent sockets

### Cloudflare Pages — effectively unlimited at this scale
- Unlimited bandwidth (free tier)
- 500 builds/mo (you'd use ~30)
- Global edge network — 1500 users get local latency instead of single-region-Render latency

---

## Critical Files to Change

| File | Change |
|---|---|
| `render.yaml` | Unchanged (still the Node server) |
| `server.ts:555-580` | Remove static file serving in prod (Pages handles it); keep Vite middleware in dev |
| `server.ts:106-144` | Update CORS to accept `https://v2.vocaband.com` as a cross-origin request source |
| `server.ts:99` | Raise Socket.IO `pingInterval` 15000 → 30000 |
| `src/hooks/useAudio.ts:10,15,21` | Route `sound/` bucket through R2 with Supabase fallback (already done for `motivational/`) |
| Client-side Socket.IO init | Point at `VITE_API_URL` (new env var) instead of same-origin |
| Client-side fetch for `/api/translate` and `/api/ocr` | Prefix with `VITE_API_URL` |
| `.env.example` | Document new `VITE_API_URL` |
| `src/core/supabase.ts` (env usage) | No code change — just the value of `VITE_SUPABASE_URL` changes on Render |

---

## Implementation Steps

### Phase 1 — Drop the Supabase Custom Domain (~30 min, saves $10/mo)

**User dashboard work:**
1. **Supabase Dashboard** → Settings → API → copy the default `.supabase.co` project URL (e.g., `https://abcdefgh.supabase.co`)
2. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client → Vocaband client → **Authorized redirect URIs** → add `https://<project-ref>.supabase.co/auth/v1/callback` (keep the old one temporarily). Save.
3. **Supabase Dashboard** → Auth → URL Configuration → confirm Site URL + Redirect URLs point at `https://vocaband.com` and `https://v2.vocaband.com` (these are frontend URLs, unrelated to the Supabase custom domain)
4. **Supabase Dashboard** → Auth → Email Templates → search for any hard-coded custom domain reference, replace with the default `.supabase.co` URL
5. **Render Dashboard** → both `vocaband` and `vocaband-v2` services → Environment → update:
   - `SUPABASE_URL` → `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_URL` → `https://<project-ref>.supabase.co`
   Save → Render auto-redeploys
6. **Verify:** log into `v2.vocaband.com` with Google OAuth + email/password; both must work. If they don't, roll back env vars (don't cancel the add-on yet) and investigate.
7. **Supabase Dashboard** → Settings → Custom Domains → **Remove custom domain**. Billing drops at next invoice.
8. **Google Cloud Console** → remove the old custom-domain redirect URI, keep only the `.supabase.co` one.

**Expected downtime:** ~1 minute while Render redeploys. Active users log in once more.

**Rollback:** re-enable the custom domain add-on (instant), revert env vars, redeploy. ~2 minutes total.

---

### Phase 2 — Move static SPA to Cloudflare Pages (performance win)

**User dashboard work:**
9. **Cloudflare Dashboard** → Pages → Create project → connect `ward3107/Vocaband` repo, branch `v2`, build command `npm ci --legacy-peer-deps && npm run build`, output directory `dist`. Save & deploy. First build ~3–5 min.
10. **Cloudflare DNS** → add `api-v2.vocaband.com` CNAME → `vocaband-v2.onrender.com` (**DNS only**, gray cloud — WebSockets don't play nicely with the orange cloud without extra config)
11. **Cloudflare DNS** → when ready to cut over: change the existing `v2.vocaband.com` CNAME from `vocaband-v2.onrender.com` → `<pages-project>.pages.dev` (orange cloud, proxied)
12. **Render Dashboard** → `vocaband-v2` → Settings → remove the `v2.vocaband.com` custom domain, add `api-v2.vocaband.com` instead
13. **Render Dashboard** → `vocaband-v2` → Environment → `ALLOWED_ORIGIN=https://v2.vocaband.com`

**Code work (`v2` branch):**
14. Add `VITE_API_URL` env var (default `http://localhost:3000` in dev, `https://api-v2.vocaband.com` in prod)
15. Update client Socket.IO init to use `VITE_API_URL`
16. Update fetch calls for `/api/translate` and `/api/ocr` to prefix with `VITE_API_URL`
17. `server.ts:555-580` — skip static serving in prod (Pages owns it); keep Vite middleware in dev
18. `server.ts:106-144` — CORS accepts `https://v2.vocaband.com` as a cross-origin source for API + Socket.IO
19. `server.ts:99` — Socket.IO `pingInterval` 15000 → 30000
20. `npm run build` locally, verify `dist/`, push to `v2`

---

### Phase 3 — Consolidate audio on R2 (optional, can defer)

21. One-time migration script to upload `sound/` bucket from Supabase Storage → Cloudflare R2
22. `src/hooks/useAudio.ts` — word audio tries R2 first, Supabase as fallback (same pattern as motivational audio already uses)
23. Verify in browser Network tab: `sound/*.mp3` loading from R2 domain, not Supabase

---

### Phase 4 — Verify

24. Load test with `k6` — 500 concurrent simulated sockets against `api-v2.vocaband.com` for 5 minutes
25. Lighthouse comparison: `v2.vocaband.com` (Pages) vs `vocaband.com` (Render) — expect Pages to win on FCP + LCP by 200–800 ms
26. Full smoke test: log in, play a Quick Play game, submit scores, watch WSS frames in devtools
27. ~24h after Phase 1 — confirm Supabase billing dashboard no longer shows the Custom Domain add-on

---

### Phase 5 — Cutover production (do AFTER the App.tsx refactor is done, separate decision)

28. Repeat Phases 2–3 for `vocaband.com`: second Pages project on `main` branch, `api.vocaband.com` for Render, DNS swap
29. Keep old Render configuration for 1 week as rollback, then spin it down

---

## Verification Checklist

- [ ] `curl -I https://v2.vocaband.com/` returns Cloudflare headers
- [ ] `curl -I https://api-v2.vocaband.com/api/health` returns `{ok:true}` from Render
- [ ] Browser devtools show WSS connection from `v2.vocaband.com` → `api-v2.vocaband.com` with no CORS errors
- [ ] Word audio (`sound/*.mp3`) loads from R2 domain (Phase 3 only)
- [ ] Lighthouse Performance on `v2.vocaband.com` beats `vocaband.com` by ≥10 points on FCP and LCP
- [ ] 500 concurrent simulated sockets hold for 5 min with <200 ms median broadcast latency
- [ ] Render CPU stays under 50% during load test (headroom for 1500)
- [ ] Supabase billing dashboard no longer shows the Custom Domain add-on (24h after Phase 1)
- [ ] Next Supabase invoice is **$10 lower**

---

## Confirmed Decisions

- **Current spend:** $25 + $10 + $7 + $0.87 = **~$42.87/mo** (~$514/yr)
- **Scope:** Path A only — (a) drop Supabase Custom Domain, (b) Cloudflare Pages for static SPA, (c) keep Render Starter for API + Socket.IO, (d) consolidate audio on R2
- **Explicitly NOT doing:** full Render elimination via Supabase Edge Functions (savings too small for the risk at current scale)
- **Timing:** Pause the App.tsx view-extraction refactor, do this consolidation first, then resume view extraction
- **Bill after:** **~$32.87/mo** (~$395/yr) — saves **$120/yr (23%)**
- **Bonus:** global edge perf + 5× Socket.IO headroom on the same $7 Render instance

## Still To Confirm (not blocking)

- Is `VITE_CLOUDFLARE_URL` currently set in Render production? Will check together during Phase 2 dashboard work.
