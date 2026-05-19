# Performance audit — 2026-05-16 (DCL critical-path sprint)

## TL;DR

Starting from the post-school-Wi-Fi-sprint baseline (`docs/perf-audit-2026-04-28.md` + the R1–R5 school-Wi-Fi survival tasks), this session pushed the **cold-load critical path** down from 2.61 s DCL to **112 ms DCL** on Slow 4G + warm cache, and **286 ms DCL** on Slow 4G + cold install. Six PRs shipped, all merged.

| Scenario | Before | After |
|---|---|---|
| Slow 4G warm cache DCL | 2.61 s | **112 ms** |
| Slow 4G warm cache Finish | 8.11 s | 5.65 s |
| Slow 4G cold DCL | 2.39 s | **286 ms** |
| Slow 4G cold Finish | 41.68 s | 21.02 s |
| Fast 3G cold DCL | — | 9.33 s |
| Cold-load JS preload bundle | ~155 kB gz | ~75 kB gz |
| SW precache size | 4.8 MB / 162 entries | 1.05 MB / 24 entries |

## What shipped (in merge order)

### PR #703 — `perf: defer Sentry/howler/RTL fonts off DCL critical path`

- **Sentry → after first paint via `requestIdleCallback`.** Was called synchronously at the top of `main.tsx`, putting the ~41 kB gz `@sentry/react` chunk in the modulepreload chain on every page load. Now dynamic-imported in idle time after `createRoot`. A bounded pre-Sentry error buffer (10 events) catches anything that throws in the gap and replays via `reportError` once the chunk resolves. `ErrorBoundary`'s `reportError` is likewise dynamic-imported inside `componentDidCatch`.
- **howler → first audio call.** `useAudio.ts` used `import { Howl } from 'howler'`, dragging the ~35 kB raw / 10 kB gz module into App.tsx's preload chain even on landing where no audio plays. Wrapped behind an `ensureHowl()` singleton.
- **RTL fonts → injected by `boot-debug.js` when language is HE/AR.** `index.html` only blocks on Plus Jakarta Sans + Be Vietnam Pro now. Heebo + Fredoka (10 weight files) loaded on demand. Dropped weight 800 (font-extrabold) — grep confirmed zero usages.

### PR #705 — `perf(sw): shrink precache 4.8 MB → 1.05 MB on cold install`

- Switched precache from "everything minus known-heavies denylist" to an **explicit allowlist of bootstrap-only files**: HTML, CSS, entry chunk, react-vendor, App, LandingPage, motion, lucide, PublicNav, FloatingButtons, manifest, icons. Everything else (supabase, sentry, howler, view chunks, hook chunks, below-fold landing sections, heavy export libs) falls to the runtime CacheFirst handler.
- Bumped script/style runtime cache maxEntries 60 → 200 so a returning user's cumulative offline footprint isn't bounded by a too-small LRU.
- Added `maximumFileSizeToCacheInBytes: 400_000` as a guardrail against future wildcard creep.

### PR #706 — `perf: drop motion (43 kB gz) from the cold-load modulepreload`

- Dropped dead `import { motion, AnimatePresence }` from `App.tsx`.
- Lazy-loaded three eager motion consumers (`CookieBanner`, `QuickPlayResumeBanner`, `ImageCropModal`) via `React.lazy` + null Suspense fallback.
- Set `build.modulePreload.resolveDependencies` to filter motion out of the HTML preload list. App chunk shrank 200 → 180 kB raw / 58.5 → 52.7 kB gz.

### PR #708 — `perf: strip motion/react animations from the public-landing path`

- Removed all 80 motion/react usages from the components that render on the landing page above the fold: `LandingPage.tsx` (21 motion elements), `CookieBanner.tsx`, `QuickPlayResumeBanner.tsx`, `FloatingButtons.tsx`, `TeacherResourcesSection.tsx`, `NavLanguageToggle.tsx`.
- Interactive affordances kept via Tailwind utilities (`hover:scale-110`, `active:scale-95`, `transition-transform`, `transition-colors`).
- Lazy modals (`SubjectRequestModal`, `FeatureRequestModal`, `SchoolInquiryModal`, `ImageCropModal`) still use motion — they load on user action, not in the cold-paint path.

### PR #710 — `fix(landing): replace motion.button with plain button — production was crashing`

**Regression fix.** PR #709 (sticky Teacher Sign In) was authored from main BEFORE PR #708 stripped motion, so its branch tip still had the motion import. The two merged cleanly textually (different sections of the file, no git conflict) but the combined main branch was unbuildable at runtime:

```
ReferenceError: motion is not defined
   at LandingPage-*.js
```

Production froze on `Loading Vocaband...` because `LandingPage` threw before render. Reimplemented the sticky CTA as a plain `<button>` with CSS `transform`/`opacity` transition.

**Lesson:** CI's "two PRs both pass independently" doesn't guarantee the combined main passes. The Playwright smoke on PR #709 ran against #709's branch tip (with motion still imported), not the post-merge state. Worth considering: re-run smoke on `main` after merge before declaring green, or use merge queue.

### PR #712 — `perf: inline eager lucide icons + lazy-load QuickPlaySessionEndScreen`

- App.tsx's three eager icons (RefreshCw, AlertTriangle, ArrowLeftRight) → inline `<svg>` using lucide v0.546.0's exact path data. App.tsx no longer imports from `lucide-react`.
- `SuspenseWrapper` + `LazyComponents` → same inline-SVG treatment for their loading spinner (`Loader2`).
- `QuickPlaySessionEndScreen` → `React.lazy` with `<Suspense fallback={null}>`. Only fetches when a Quick Play session ends, not on every cold load.
- App chunk: 181.83 → 177.89 kB raw / 52.76 → 52.34 kB gz.

## Known limitations

- **One lucide symbol still leaks into the App chunk.** A dead `import{nr as t}from"./lucide-..."` survives tree-shaking after PR #712. Investigated via sourcemaps — couldn't isolate the transitive source without invasive bundle tracing. The chunk's actual usage of `t` doesn't appear in any source file (confirmed by mapping all 501 occurrences). Likely a re-export chain rolldown can't statically prove unused. The lucide chunk stays in modulepreload regardless, because `LandingPage` (lazy) legitimately uses 11 lucide icons.
- **Motion chunk (133 kB / 43.66 kB gz) still ships** even after stripping motion from the entire public-landing path. Reason: rolldown's CJS interop for framer-motion's `require('react/jsx-runtime')` co-locates a copy of the JSX runtime in the motion chunk, and LandingPage's JSX still has a `static import { a as h } from "./motion-..."` to pull that runtime. Workaround would require either eliminating motion across the whole codebase or forcing ESM-only resolution at the rolldown level — both medium-large refactors with cross-app risk.
- **Service Worker boot adds ~50–100 ms** to the warm cache Finish time. Can't be fixed without sacrificing offline capability.

## What's NOT done (deliberate)

- **No Preact swap.** Would save ~50 kB gz on cold but introduces real risk for third-party React libs and Suspense behavior. Not justified without real-user signal that current LCP is bad.
- **No SSR for the landing page.** Would drop cold DCL from ~286 ms → ~50 ms but doubles deployment complexity (Cloudflare Worker rendering).
- **No critical-CSS inlining.** Would save one round-trip but requires loosening CSP `style-src` from the recently-hardened state.
- **No motion eradication across game/dashboard views.** Would shrink the motion chunk to nothing but kills the "alive" feel that makes the game engaging for students.

## Next signal to watch

Sentry **Performance → Web Vitals** dashboard, after 24 h of post-merge production traffic. Specifically:

| Metric | Threshold to keep optimizing | Action if exceeded |
|---|---|---|
| P75 LCP | > 2,500 ms | Pursue Preact swap or SSR |
| P75 INP | > 200 ms | Profile main-thread hot paths in DevTools |
| P75 TTFB | > 800 ms | Investigate Cloudflare edge cache hit ratio (R4 in main plan) |

If all three stay green for a week, this lane is done. Move attention to other perf surfaces (Supabase query patterns, audio MP3 prefetch, etc.).

## Procedure used for the headline numbers

1. Production deploy of branch under measurement (Cloudflare auto-deploys on merge to `main`).
2. Chrome incognito + DevTools open.
3. Network panel → **Disable cache** + throttling profile (Slow 4G / Fast 3G).
4. **For warm-cache:** load `vocaband.com` once, then reload. Note the second-load numbers.
5. **For cold-install:** Application → Service Workers → Unregister; Application → Storage → Clear site data (include unregistered SW); close + reopen incognito; load `vocaband.com` once. Note the first-load numbers.
6. Read bottom-bar Network summary: requests, transferred, resources, Finish, DOMContentLoaded, Load.

Numbers in TL;DR above came from this procedure on `main` at SHA `0ad5edc` (post-PR #712 merge).
