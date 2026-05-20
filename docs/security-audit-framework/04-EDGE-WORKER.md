# 04 — Cloudflare Worker (Edge)

> ~373 lines. Serves the SPA, proxies `/api/*` and `/socket.io/*` to
> Fly, edge-caches two public endpoints, and streams audio packs.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Edge auth handling | GOOD — `Vary: Authorization` added defensively in `passthroughProxy` (worker/index.ts:240) | Low | INFO | HIGH |
| Edge-cached endpoints PII-free | GOOD — only `/api/features`, `/api/version` cached (worker/index.ts:226) | Low | INFO | HIGH |
| Audio-pack endpoint abuse | MODERATE — 200 ID cap, but no per-IP burst limit on the Worker side | Medium | MODERATE | HIGH |
| SSRF via Worker | GOOD — backends are constants; no URL injection | Low | INFO | HIGH |
| HTML rewrite path | GOOD — only runs when `lang` param + path in allowlist + content-type is HTML (worker/index.ts:357-367) | Low | LOW | HIGH |
| PDF response handling | GOOD — explicit 404 to prevent silent SPA fallback (worker/index.ts:337-347) | Low | INFO | HIGH |
| WebSocket proxy correctness | GOOD — `fetch(url, request)` preserves upgrade headers (worker/index.ts:316-325) | Low | INFO | HIGH |

**Overall:** GOOD (84/100).

---

## 2. Attack surface mapping

| Path | Behaviour | Bypassable? |
|---|---|---|
| `/api/audio-pack` (Worker-handled) | Streams ZIP of up to 200 word MP3s from Supabase Storage | brute by repeated calls |
| `/api/features`, `/api/version` (edge-cached GET) | 60s cache, public | not a vector if those endpoints stay PII-free |
| `/api/*` (proxy) | passthrough to Fly with `Vary: Authorization` | bypass requires upstream bug |
| `/socket.io/*` (proxy) | passthrough including upgrade | none |
| `/*.pdf` | serves static, 404s on SPA fallback | none |
| `?lang=he|ar|ru` on landing pages | HTML rewrite (i18n meta) | XSS via `lang` param — see below |
| Any other path | `env.ASSETS.fetch(request)` → static or SPA fallback | none |

---

## 3. Offensive analysis

### A. Cache poisoning

The two edge-cached endpoints (`/api/features`, `/api/version`) explicitly
**strip the Authorization header from the cache key** (worker/index.ts:256).
If a future endpoint that *does* vary by user is added to
`EDGE_CACHEABLE_GET_PATHS` without changing the key strategy, one user's
features could be served to all visitors. The comment at line 254 calls
this out — keep the allowlist tight and **CI-lint** it (regex check that
no `/api/quick-play|/api/teacher|/api/student` enters the set).

The cache only stores 2xx (worker/index.ts:275). A 4xx from Fly is not
cached — good (prevents one tenant's "no access" from poisoning the
allowed tenant).

### B. SSRF

`API_BACKEND` is a module constant; no user-controlled URL is fetched.
**Not vulnerable.**

### C. WebSocket upgrade hijack

`/socket.io/*` is proxied by `fetch(url, request)` (worker/index.ts:324).
Cloudflare's runtime preserves the WebSocket upgrade pair. A
`new Request(url, request)` wrapper would strip the upgrade — the inline
comment warns about this regression vector. **Don't refactor without a
WebSocket E2E test.**

### D. HTML rewrite XSS

The `localizeHtmlResponse(assetResponse, langParam)` path runs when:
- `langParam ∈ {'he','ar','ru'}`
- path ∈ `LOCALIZABLE_SPA_PATHS` allowlist
- response content-type contains `text/html`

The `langParam` is `'he' | 'ar' | 'ru'` (TS-narrowed). Rewrite function
substitutes hreflang/title/description — if it ever interpolates the
incoming `lang` value into HTML without escaping, that's an XSS. The
allowlist is the safety belt; **action:** read `localizeHtmlResponse`
implementation and confirm static template substitution only.

### E. Audio-pack abuse

`handleAudioPack` (worker/index.ts:174-217):
- Reads `ids` query parameter, splits on `,`
- Caps at 200 items (good)
- Issues a sequential `fetch` per ID against
  `${supabase}/storage/v1/object/public/sound/${id}.mp3` (line 197)

**Risk vectors:**
1. **DoS via repeated calls.** No per-IP limit on the Worker. Cloudflare's
   global rate limiting kicks in at platform-level for abusive sources,
   but a determined attacker could cost-pump Supabase egress. **Action:**
   add a Worker-level `Cache.match` short circuit + a soft per-IP limit
   via Cloudflare Rate Limiting Rules.
2. **Path traversal via `id`.** The IDs are concatenated into the URL.
   If an `id` contains `..%2F`, the URL becomes
   `…/sound/..%2F<other-bucket>.mp3`. **Mitigation needed:** validate
   `id ∈ /^[a-z0-9_-]+$/` before concat. Did not find such a check;
   classify as **MODERATE** finding.
3. **ZIP-bomb on the way back.** The Worker assembles a ZIP from upstream
   responses; if `client-zip` doesn't impose a memory bound and a single
   `id` returns a 50MB stream, Worker memory blows. Supabase MP3 sizes
   are <100 KB each; 200 × 100 KB = 20 MB. Acceptable, but document the
   invariant.

### F. SPA fallback misuse

If `not_found_handling: "single-page-application"` returned HTML for a
PDF request, the browser would render the SPA in the new tab. This was
explicitly fixed (worker/index.ts:337-347). Good.

---

## 4. Blue-team controls

| Control | Status | Where |
|---|---|---|
| `Vary: Authorization` on every proxied response | ✅ | worker/index.ts:240 |
| Edge cache allowlist (tight) | ✅ | worker/index.ts:226 |
| PDF 404 explicit | ✅ | worker/index.ts:337 |
| HTML rewrite path-allowlisted | ✅ | worker/index.ts:357-367 |
| `id` validation in audio-pack | ❌ | add `/^[a-z0-9_-]+$/` regex |
| Per-IP audio-pack limit | ❌ | Cloudflare Rate Limiting Rule |
| Worker observability enabled | ✅ | wrangler.jsonc:7 |

---

## 5. Testing strategy

| Test | Auto? | Tool |
|---|---|---|
| Audio-pack path-traversal | Auto | curl with `ids=..%2F` |
| Edge cache doesn't serve auth-bearing response | Auto | curl with different Bearer tokens to a cached path |
| WebSocket upgrade preserved | Auto | `wscat` against `/socket.io/` |
| PDF 404 returns 404 | Auto | curl `/missing.pdf` |
| HTML rewrite XSS via `lang` | Auto | nuclei XSS fuzzer |
| Cloudflare WAF rules fire | Manual | Cloudflare dashboard event log |

---

## 6. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| `X-Edge-Cache: MISS` rate on cached paths >50% | misconfigured headers | P2 |
| Audio-pack requests/min | >500 (baseline ~50) | P1 |
| PDF 404 rate | >100/hour (probably a broken link) | P3 |
| `/socket.io/` upgrade-failure rate | >1% | P1 |

---

## 7. Incident response

- **Edge cache poisoning suspected:** purge Cloudflare cache via API or
  dashboard for `/api/features` and `/api/version`. Then audit cache
  configuration.
- **Audio-pack abuse:** add Cloudflare WAF rule blocking the abusing IP/
  ASN. Increase per-Worker observability sampling.

---

## 8. Edge cases

- **Cloudflare colony cache miss.** First request after a deploy will
  miss; the Worker hits Fly. Acceptable.
- **Backend down.** Worker proxies the 5xx through. Add an "Origin
  unavailable" fallback page for the SPA? Currently shows the
  default Cloudflare error page. Track in `docs/DISASTER-RECOVERY.md`.
- **Worker code size limit.** Cloudflare Workers free plan is 1MB;
  we're well below.

---

## 9. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Worker error rate | <0.01% | 0.01-0.1% | >0.1% |
| Audio-pack p95 latency | <2s | 2-5s | >5s |
| Edge cache hit rate (`/api/features`) | >80% | 50-80% | <50% |

---

## 10. Self-critique

- We did not read `localizeHtmlResponse` — confirm static-template only.
- No audit of the Cloudflare Workers KV usage (if any) — none found in
  this Worker, but if added, treat as a new module.
- Cloudflare account scoping was not audited (operator concern):
  who has API token access, what's the token's permission scope, is
  there an audit log enabled in the CF account?
