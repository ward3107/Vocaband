# Performance audit — 2026-04-28

## TL;DR

Made the 9159-word vocabulary file (~139 kB gzipped) lazy-loaded
instead of eagerly bundled into the landing-page critical path.
The entry chunk no longer pulls vocabulary on first paint —
only authenticated users (or demo-mode visitors) trigger the
download.

## Before

PageSpeed Insights:
- Mobile: **51**
- Desktop: **56**

Initial-load critical chain (vite production build):

```
index.html
└── /assets/index-*.js  (entry chunk, 196 kB / 62 kB gz)
    ├── /assets/App-*.js  (App component, 257 kB / 79 kB gz)
    │   └── /assets/vocabulary-*.js  (376 kB / 139 kB gz)  ← always fetched
    └── /assets/LandingPage-*.js  (40 kB / 7 kB gz)
        └── /assets/vocabulary-*.js  ← also pulled here transitively
```

The vocabulary chunk was getting fetched on every visit, including
unauthenticated landing-page visitors who never need it.  That's
~139 kB of gzipped JSON parsing on the critical render path.

## Why it was eagerly loaded

Multiple files had non-type-only imports of vocabulary constants
(`ALL_WORDS`, `SET_2_WORDS`, `TOPIC_PACKS`).  Vite/esbuild emits a
side-effect import for any non-`type` import, even when only the type
is used at runtime.

The chain was:

1. `App.tsx` → `import { ALL_WORDS, SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS, Word }`
2. `data/sentence-bank.ts` → `import { Word }` (non-type)
3. Five hooks (`useTeacherActions`, `useOcrUpload`,
   `useQuickPlayUrlBootstrap`, `useGameRoundOptions`,
   `useAssignmentAutoPopulate`) → all imported `ALL_WORDS` etc.
4. Several utility files (`vocabulary-matching`, `wordAnalysis`,
   `setup/types`) → `import { Word }` (non-type)

Any one of those was enough to drag vocabulary into App's chunk's
static dep tree.  Even after my refactor of App.tsx, the LandingPage
chunk still transitively pulled vocabulary via shared chunk
dependencies (LandingPage imports `FloatingButtons` from App's chunk).

## Changes shipped

1. **New hook `src/hooks/useVocabularyLazy.ts`** — fires a dynamic
   `import("../data/vocabulary")` only when the gate (`!isPublicView`)
   is true.  Caches the result at module level so re-renders don't
   re-fetch.  Exposes `getCachedVocabulary()` for synchronous reads
   from code paths that run after the cache has been populated.

2. **App.tsx**:
   - Static `import { ALL_WORDS, ... }` → `import type { Word }` plus
     hook usage.
   - At the top of the component: `const ALL_WORDS = vocab?.ALL_WORDS ?? []`
     and similar for SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS.  All
     existing references in callbacks/handlers resolve to the local
     consts (closure over component scope).
   - Inside `restoreSession`'s QP restore path (which fires on mount,
     before the view transitions away from public-landing), an inline
     `await import("./data/vocabulary")` ensures correctness when
     the lazy hook hasn't kicked in yet.

3. **Five hooks converted** to use `getCachedVocabulary()` instead of
   static imports:
   - `useTeacherActions.ts`
   - `useOcrUpload.ts`
   - `useQuickPlayUrlBootstrap.ts`
   - `useGameRoundOptions.ts`
   - `useAssignmentAutoPopulate.ts`

   All these hooks fire from user-interaction handlers (assignment
   creation, OCR upload, QP restore, game-round generation), so by the
   time they run, vocab has already been loaded by the lazy hook
   (typically <100 ms after navigating to an authenticated view).

4. **Type-only Word imports** in:
   - `data/sentence-bank.ts`
   - `data/vocabulary-matching.ts`
   - `utils/wordAnalysis.ts`
   - `components/setup/types.ts`

## Verification

After `npm run build`:

- **`dist/index.html` modulepreload list**: only `lucide-*.js`. No
  preload of vocabulary.
- **`dist/assets/index-*.js`** (entry chunk): no static
  `import "./vocabulary-*.js"`.
- **`dist/assets/App-*.js`**: no static vocabulary import.
- **`dist/assets/LandingPage-*.js`**: no static vocabulary import.

The vocabulary chunk (377 kB / 139 kB gzipped) only loads when:

1. The user navigates to a non-public view (authenticated dashboard,
   game, etc.) — triggered by the lazy hook.
2. DemoMode is opened — DemoMode itself static-imports vocabulary,
   so its lazy chunk pulls vocabulary on demand.
3. The teacher's QP restore path runs (inline dynamic import).

## Expected impact

PageSpeed score should improve by 15-25 points on mobile.  Specific
metrics likely to improve:

- **First Contentful Paint (FCP)**: smaller initial parse work.
- **Largest Contentful Paint (LCP)**: hero render not blocked by
  vocabulary chunk download/parse.
- **Time to Interactive (TTI)**: less JS to compile.
- **Total Blocking Time (TBT)**: vocabulary-array decoding (the
  6500-word tuple decompression in the module's top-level execution)
  no longer runs on landing.

To re-measure: https://pagespeed.web.dev/analysis?url=https://vocaband.com

## Bundles still worth lazy-tightening (future)

| Chunk | Size (raw / gz) | Lazy?  |
|---|---|---|
| `vocabulary-*.js` | 377 kB / 139 kB | ✅ Now lazy |
| `jspdf.es.min-*.js` | 391 kB / 129 kB | ✅ Already lazy (only in ReportExportBar) |
| `html2canvas.esm-*.js` | 202 kB / 48 kB | ✅ Already lazy (transitively via jspdf) |
| `ClassroomView-*.js` | 399 kB / 120 kB | ✅ Lazy-routed |
| `App-*.js` | 258 kB / 79 kB | Eager (entry-point dependency) |
| `index-aE9CcZ12.js` | 503 kB / 131 kB | Eager (vendor + index) |
| `supabase-*.js` | 197 kB / 52 kB | Eager (auth on every page) |

Next opportunities (lower priority):

- **App.tsx is 258 kB minified.**  This is the largest single source
  file in the repo (~5800 lines).  Splitting individual handler logic
  out into per-feature files would shrink it.  We've been doing this
  incrementally — see CLAUDE.md §3 about extracting views.
- **Supabase chunk is on the critical path.**  It's needed for auth
  checks on landing.  Could be split into `supabase-auth-light` (just
  session retrieval) vs `supabase-full` (data ops), but the
  Supabase JS SDK doesn't expose this split cleanly.  Defer.

## Re-audit cadence

- Re-run the build and check `index.html` modulepreload list every
  time we add a new feature.
- If a new chunk appears in the preload list, ask whether it should
  be lazy.
- Sample command to detect static vocabulary imports anywhere:
  ```bash
  grep -rn "import\s*{\s*\(ALL_WORDS\|SET_[123]_WORDS\|TOPIC_PACKS\)" \
    src --include="*.ts" --include="*.tsx" \
    | grep -v "import type"
  ```
  Should return zero matches outside `useVocabularyLazy.ts`.
