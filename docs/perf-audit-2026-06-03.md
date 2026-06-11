# Performance audit — 2026-06-03 (landing eager-closure analysis)

> ✅ **RESOLVED 2026-06-09.** The entry-closure artifact described below is
> fixed — closure cut **132 kB gz → 66 kB gz (−50 %)**. Root cause was
> rolldown overriding the `manualChunks` *names* for shared CJS-interop
> modules (React core leaked via `lucide`; the `__vitePreload` helper via
> `supabase`). Fix: moved `rollupOptions.output` to `codeSplitting.groups`,
> which has real placement authority. Guarded by
> `scripts/check-entry-closure.mjs`. See `docs/open-issues.md` for the
> summary. The diagnosis below is kept for the historical record.

## TL;DR

The landing page is **already heavily optimized** — the prior sprints
(`perf-audit-2026-04-28.md`, `perf-audit-2026-05-16.md`) shipped lazy
loading, code-splitting, deferred Sentry/howler/RTL-fonts, the supabase-free
`PublicShell`, inlined boot CSS, and a slimmed service-worker precache. Most
generic "make the landing fast" advice is therefore already done.

This audit went looking for what's **left** and found one real, high-value
gap that the previous sprints *tried* to close but didn't fully:

> **The entry chunk statically imports the Supabase client (~200 kB raw /
> 51 kB gz) and the shared lucide icon chunk (~56 kB / 19 kB gz) even though
> no entry-level source module imports either.** They load on *every* page,
> including the cold logged-out landing, as a rolldown `manualChunks`
> hoisting artifact.

| Metric (clean prod build) | Value |
|---|---|
| Entry static closure (loads before any dynamic import, **every page**) | **131.4 kB gz** / 5 chunks |
| ├─ react-vendor (legit — React/ReactDOM) | 56.7 kB gz |
| ├─ **supabase (hoisting artifact)** | **51.2 kB gz** |
| ├─ **lucide (hoisting artifact)** | **19.1 kB gz** |
| ├─ index (entry) | 6.9 kB gz |
| └─ rolldown-runtime | 0.7 kB gz |
| Entry closure if the artifact were removed | **~64 kB gz** (−51 %) |

Removing the two hoisted chunks would roughly **halve the every-page JS that
the browser must fetch + parse before the app boots** — the single biggest
remaining landing/TBT win available.

> ⚠️ Not fixed in this pass: the fix is build-tooling surgery (rolldown
> chunking) on the auth-critical supabase boundary, and a quick experiment
> (removing lucide's `manualChunks` pin) regressed badly — see "Attempted &
> rejected". It needs a focused effort with browser-Network verification,
> not a blind config change. This audit documents the precise diagnosis so
> that effort can start from the answer.

## What shipped this pass

### `perf(pwa): drop two dead precache globs`

`workbox.globPatterns` listed `assets/motion-*.js` and
`assets/landing-page-*.js`. Neither matches any built file:

- `motion-*` — motion is no longer force-chunked (it auto-splits into the
  lazy views that animate; see the `manualChunks` comment), so no
  `motion-*.js` is emitted.
- `landing-page-*` — the real chunk is `LandingPage-*.js` (capitalised),
  already precached one block above. The lowercase glob was a dead
  duplicate.

Both produced a `workbox` "glob pattern doesn't match any files" warning on
every build. Removed. No behavioural change (they matched nothing); the
precache stays at 25 entries / ~1.07 MB and the build is now warning-clean.

## The finding in detail

### Evidence

1. **Entry chunk has top-level static imports of both vendors.** In the
   built `assets/index-*.js`:
   ```js
   …}from"./react-vendor-*.js";import{n as i}from"./supabase-*.js";import{…}from"./lucide-*.js";…
   ```
   Top-level ESM `import` is unconditional: the browser fetches + parses
   these before `index-*.js` executes.

2. **No entry-level source module imports them.** The entry chunk's source
   modules (via a `--sourcemap` build's `sources` list) are exactly:
   `main.tsx`, `ErrorBoundary.tsx`, `utils/{chunkReload, lazyWithRetry,
   safariDiagnostics, persistStorage, resolveInitialView, authViews,
   hasRestorableSession}`, `hooks/useCookieConsent`. A static (non-type,
   non-dynamic) import trace from `main.tsx` reaches **neither**
   `core/supabase` nor `lucide-react`. `core/views.ts` (imported widely) is
   type-only and erased.

3. **It's a hoisting artifact, consistent across clean builds.** The
   `supabase` manualChunk even splits into two files —
   `supabase-<a>.js` (~200 kB, statically reachable from the entry) and a
   small `supabase-<b>.js` (~11 kB, reached only dynamically) — which is the
   tell-tale of rolldown promoting part of a dynamically-imported, manually-
   named vendor chunk into the static graph.

### Why the previous mitigation didn't catch it

`vite.config.ts` → `build.modulePreload.resolveDependencies` filters
`supabase-*`, `App-*`, and `sentry-*` out of the **modulepreload hint list**
(comment dated 2026-05-28: "an older deploy still dragging supabase-* and
sentry-* onto the landing critical path's chunk dependency tree"). That
removes the `<link rel="modulepreload">`, which is what Lighthouse's
"preload bundle" measures — so the metric looked fixed. But it does **not**
remove the static `import` in the entry chunk, so the browser still fetches
supabase; it just discovers it *after* parsing the entry instead of in
parallel (arguably worse for that chunk's own timing).

`main.tsx`'s single-lazy-`RootApp` pattern (`() => cond ? import('PublicShell')
: import('App')`) was likewise designed to keep `App` + its supabase client
off the static graph. It works for `App`, but supabase/lucide still leak in
via the artifact.

### Recommended fix direction (for a focused follow-up)

1. **Reproduce with a browser Network tab** on the deployed build (cold,
   logged-out, `?lang=en`) to confirm `supabase-*.js` and `lucide-*.js`
   are fetched on first load. (Static-import analysis says yes; confirm the
   real number before/after.)
2. **Find the rolldown trigger.** The artifact is config-level, not source-
   level. Likely candidates: the interaction between `manualChunks` pinning
   (`@supabase/*` → `supabase`, `lucide-react` → `lucide`) and the dynamic
   imports of `core/supabase` / `core/sentry` / `App` in `main.tsx`. Try,
   one at a time with a clean build + the entry-closure check below:
   - dropping the `supabase` `manualChunks` pin (the comment says it splits
     naturally anyway — but note `resolveDependencies` matches it by the
     `supabase-` name, so re-verify the modulepreload filter still applies);
   - `build.rollupOptions.output.experimentalMinChunkSize` / hoisting opts;
   - upgrading rolldown/vite if a fixed release exists.
3. **Guardrail:** add the entry-closure assertion (below) to CI so a future
   refactor can't silently re-hoist a vendor onto every page.

### Reproduction — entry static-closure check

```js
// node this against ./dist after `npm run build`
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const dir = 'dist/assets';
const html = fs.readFileSync('dist/index.html', 'utf8');
const entry = [...html.matchAll(/src="\/assets\/(index-[\w-]+\.js)"/g)].map(m => m[1]);
const RE = /(?:^|[;{}\s])(?:import|export)\s*(?:[\w*{}\s,]+from\s*)?["']\.\/([\w.-]+\.js)["']/g;
const seen = new Set(), q = [...entry]; let gz = 0;
while (q.length) { const n = q.shift(); if (seen.has(n)) continue; seen.add(n);
  let c; try { c = fs.readFileSync(path.join(dir, n), 'utf8'); } catch { continue; }
  gz += zlib.gzipSync(c).length;
  for (const m of c.matchAll(RE)) if (!seen.has(m[1])) q.push(m[1]); }
console.log((gz/1024).toFixed(1)+' KB gz across '+seen.size+' chunks:', [...seen].join(', '));
// Expect: NO supabase-*/lucide-* in the list once fixed.
```

## What was deliberately *not* changed (and why)

Most items in a generic "optimise the landing" checklist are already done or
not worth the risk here:

- **Lazy-load non-critical components** — already done: `CookieBanner`,
  `AccessibilityWidget`, `GlobalOverlays`, all below-fold landing sections
  (via `DeferredSection` + `IntersectionObserver`), the three request
  modals (conditional render), `App` itself (behind `PublicShell`).
- **Defer Supabase** — *intended* and mostly done (only dynamic-imported on
  `?code=` / App mount) **except for the entry hoisting artifact above** —
  the one thing actually left to fix.
- **Defer Sentry / analytics to `requestIdleCallback`** — already done
  (`main.tsx` `loadSentryDeferred`, consent-gated).
- **lucide: ship only landing icons** — *attempted* (inline-SVG barrel) and
  **reverted**: it added a 2 kB chunk but did **not** remove lucide from the
  landing, because lucide is pulled in by the same entry-hoisting artifact,
  not by the landing's own icon imports. Fix the artifact first; then the
  landing's icons (~15) can be inlined for a real ~19 kB gz win.
- **Fonts** — already self-hosted, `font-display: swap`, latin subset,
  critical weights preloaded. Be Vietnam Pro weights are already pruned by
  grep (weight 800 was dropped in PR #703). Dropping 500/900 would change
  the hero/CTA rendering for ~21 kB each of *already-not-downloaded-if-unused*
  woff2 — net zero, visual risk. Skipped.
- **`unicode-range`** — the families are single-subset (latin) already, so
  `unicode-range` yields ~nothing and risks a Lighthouse "preloaded font
  unused" warning on pure HE/AR pages. Skipped.
- **Images** — `logo.webp` already WebP; only a handful of small PNGs
  (icons for the PWA install, not rendered on the landing); `og-image.png`
  is social-share metadata, never fetched on page render. Nothing to do.
- **Brotli / HTTP-2/3 / CDN / 1-year cache headers** — handled at the edge
  by Cloudflare (`public/_headers`); not a build concern.
- **`content-visibility: auto`** — redundant: `DeferredSection` already
  renders below-fold sections as `null` until they intersect.

## Attempted & rejected

- **Remove lucide's `manualChunks` pin** (let rolldown split naturally):
  exploded into **one chunk per icon** (~291 total chunks); the landing then
  made ~11 extra tiny icon requests — worse on the request-count metric, no
  net win. Reverted.
- **Inline the landing's ~15 icons as local SVGs** (matching the existing
  `FloatingButtons` Facebook/Instagram pattern): correct in principle, but
  the landing *still* statically imported the `lucide` chunk via the entry
  artifact, so it only added 2 kB. Reverted — revisit once the artifact is
  fixed.
