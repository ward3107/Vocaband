import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {defineConfig, type Plugin} from 'vite';
// Cloudflare plugin is intentionally disabled (causes white screen
// in dev) — kept as a comment so future edits don't re-import it.
// import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// ─── Slow-4G HTML perf plugin ──────────────────────────────────────────
// Production-only transforms on index.html:
//   1. Inline /public/boot.css as a <style> block to remove one render-
//      blocking network round-trip on first paint.
//   2. Inline /public/boot-debug.js as a <script> block to remove the
//      remaining pre-React network round-trip. The script is a tiny
//      pre-React diagnostic + RTL font loader and is CSP-allowlisted by
//      SHA-256 hash (see public/_headers). When boot-debug.js changes,
//      recompute the hash and update _headers — same maintenance
//      pattern as the Cloudflare Insights bootstrap inlines.
//   3. Inject <link rel="modulepreload"> hints for App-*.js and
//      LandingPage-*.js — the chunks every cold landing-page visit
//      dynamically imports in series. Without these hints the browser
//      only discovers them after parsing the entry chunk, paying RTT × 3.
//      With them the chunks fetch in parallel with the entry, which lops
//      400-800 ms off the time-to-interactive on Slow 4G.
//
// Dev mode is intentionally a no-op — the perf wins only matter under
// production network latency, and skipping in dev keeps HMR uncluttered.
function vocabandHtmlPerf(): Plugin {
  const INLINE_BOOT_CSS_MARKER = '<!-- VOCABAND_INLINE_BOOT_CSS -->';
  // The fallback <link rel="stylesheet" href="/boot.css"> sits directly
  // after the marker; the plugin removes BOTH and replaces them with a
  // <style> block. This keeps dev mode working (link tag still serves
  // boot.css through Vite's middleware) and prod fast (inlined CSS).
  const BOOT_CSS_FALLBACK_LINK = '<link rel="stylesheet" href="/boot.css" />';

  const INLINE_BOOT_DEBUG_MARKER = '<!-- VOCABAND_INLINE_BOOT_DEBUG -->';
  // External <script> for boot-debug.js sits directly after the marker
  // (or in dev, the marker is absent and the external script serves
  // through Vite's middleware). Same pattern as boot.css above.
  const BOOT_DEBUG_FALLBACK_SCRIPT = '<script src="/boot-debug.js"></script>';

  // Chunk prefixes whose `.js` outputs deserve a modulepreload hint on
  // the landing page.
  //
  // Tuning history:
  //  v1 — preloaded 5 chunks (App, LandingPage, landing-page, PublicNav,
  //       FloatingButtons). Slow-4G field test regressed DCL ~800 ms;
  //       too much parallel pressure on a bandwidth-bound pipe.
  //  v2 — empty (no extras). Better on Slow 4G, but a Slow-3G test
  //       showed DCL 8.2 s because the serial dynamic-import chain
  //       (entry → App → LandingPage) paid 3 × 2 s RTT.
  //  v3 — narrow: App and LandingPage only. The two biggest serial
  //       RTT saves in the chain, picked because Israeli school Wi-Fi
  //       is typically latency-bound (50-500 ms RTT, many devices
  //       contending) more than bandwidth-bound. The asymmetry
  //       favours preload: ~4 s win on high-latency profiles costs
  //       ~200-500 ms on bandwidth-bound profiles. We accept the
  //       smaller loss on the better network to fix the worse case.
  //
  // landing-page-*, PublicNav-*, FloatingButtons-* deliberately
  // skipped — they're smaller chunks whose RTT savings are modest
  // and they ride App's parallel-import wave once App resolves.
  // NOTE: logged-out visitors on a public view now boot the lightweight
  // PublicShell (see main.tsx), so the landing critical chunk is
  // PublicShell-*, not App-*. App + supabase are kept OFF the landing
  // modulepreload entirely (see build.modulePreload.resolveDependencies)
  // and load on-demand only when a visitor logs in or has a session.
  const PRELOAD_CHUNK_PREFIXES = [
    'PublicShell-',
    'LandingPage-',
  ];

  return {
    name: 'vocaband-html-perf',
    apply: 'build',
    enforce: 'post',
    // After Vite finishes writing dist, rewrite dist/_headers so its CSP
    // hash for boot-debug.js matches whatever bytes we actually inlined
    // into dist/index.html. The checked-in public/_headers carries a
    // hand-maintained hash for documentation, but the hash that ships is
    // computed here from the same source the plugin inlined above. This
    // closes the recurring drift bug where editing boot-debug.js without
    // bumping the hash silently broke prod CSP — the browser refused the
    // inline script and the loading spinner never cleared on cold visits.
    writeBundle: {
      sequential: true,
      handler(options) {
        const outDir = options.dir ?? path.resolve(__dirname, 'dist');
        const headersPath = path.join(outDir, '_headers');
        const bootDebugPath = path.resolve(__dirname, 'public/boot-debug.js');
        let headers: string;
        let bootDebugJs: string;
        try {
          headers = fs.readFileSync(headersPath, 'utf8');
          bootDebugJs = fs.readFileSync(bootDebugPath, 'utf8');
        } catch {
          // Either file missing — likely a custom build pipeline.
          // Leave dist alone so we don't break it; the checked-in hash
          // is still the right fallback.
          return;
        }
        const hash = crypto.createHash('sha256').update(bootDebugJs).digest('base64');
        // Every existing sha256-* token in the CSP today is the
        // boot-debug hash (Cloudflare Insights retired its rotating
        // hashes — see the 2026-05-23 note in public/_headers). Replace
        // them all so script-src and script-src-elem stay in lockstep.
        // base64 may or may not pad with `=`; match any base64 chars
        // (including `=` padding) up to the closing single quote.
        const cspHashRe = /'sha256-[A-Za-z0-9+/=]+'/g;
        const matches = headers.match(cspHashRe);
        if (!matches || matches.length === 0) return;
        const replacement = `'sha256-${hash}'`;
        const rewritten = headers.replace(cspHashRe, replacement);
        if (rewritten === headers) return;
        fs.writeFileSync(headersPath, rewritten, 'utf8');
        const checkedIn = matches[0];
        if (checkedIn !== replacement) {
          this.warn(
            `[vocaband-html-perf] _headers boot-debug.js hash drifted ` +
              `(checked-in ${checkedIn}, actual ${replacement}). ` +
              `dist/_headers has been corrected; please update public/_headers ` +
              `to match so source-of-truth stays in sync.`,
          );
        }
      },
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let next = html;

        // 1) Inline boot.css.
        try {
          const bootCssPath = path.resolve(__dirname, 'public/boot.css');
          const bootCss = fs.readFileSync(bootCssPath, 'utf8');
          // Strip CSS comments + collapse whitespace to shave a few hundred
          // bytes off the inlined block. Tiny but free.
          const minified = bootCss
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}:;,])\s*/g, '$1')
            .trim();
          const styleTag = `<style data-vocaband-inlined="boot">${minified}</style>`;
          if (next.includes(INLINE_BOOT_CSS_MARKER)) {
            // Replace marker line; drop the fallback link that follows it.
            next = next.replace(INLINE_BOOT_CSS_MARKER, styleTag);
            next = next.replace(BOOT_CSS_FALLBACK_LINK, '');
          } else if (next.includes(BOOT_CSS_FALLBACK_LINK)) {
            // Defensive: index.html hand-edited without the marker. Still
            // inline; just don't crash.
            next = next.replace(BOOT_CSS_FALLBACK_LINK, styleTag);
          }
        } catch {
          // boot.css missing or unreadable — fall through, leave the
          // <link> in place. Site stays correct, just one extra RTT.
        }

        // 2) Inline boot-debug.js. CSP allows this inline script via its
        // SHA-256 hash listed in public/_headers (script-src + script-src-elem).
        // If you edit public/boot-debug.js, recompute the hash:
        //   openssl dgst -sha256 -binary public/boot-debug.js | openssl base64 -A
        // and update _headers to match — otherwise the browser refuses to
        // execute the inlined script and the pre-React error UI breaks.
        try {
          const bootDebugPath = path.resolve(__dirname, 'public/boot-debug.js');
          const bootDebugJs = fs.readFileSync(bootDebugPath, 'utf8');
          // Inline VERBATIM — no minification, no trim. The CSP hash is
          // computed against the exact file bytes so any transform here
          // (even whitespace) would force a hash update on every change.
          const scriptTag = `<script data-vocaband-inlined="boot-debug">${bootDebugJs}</script>`;
          if (next.includes(INLINE_BOOT_DEBUG_MARKER)) {
            next = next.replace(INLINE_BOOT_DEBUG_MARKER, scriptTag);
            next = next.replace(BOOT_DEBUG_FALLBACK_SCRIPT, '');
          } else if (next.includes(BOOT_DEBUG_FALLBACK_SCRIPT)) {
            next = next.replace(BOOT_DEBUG_FALLBACK_SCRIPT, scriptTag);
          }
        } catch {
          // boot-debug.js missing or unreadable — fall through, leave the
          // external <script> in place. Site stays correct, just one extra RTT.
        }

        // 3) modulepreload hints for landing-page critical chunks.
        // `ctx.bundle` is the rolldown/rollup bundle map keyed by output
        // file name (e.g. "assets/App-abc123.js"). Empty in dev (`apply:
        // 'build'` guards us from running there anyway). Look up each
        // critical chunk by its prefix and emit a <link rel=modulepreload>
        // so the browser parallelises the otherwise-serial dynamic-import
        // chain (entry → App → LandingPage → locales).
        const bundleFileNames = ctx.bundle ? Object.keys(ctx.bundle) : [];
        const hints: string[] = [];
        for (const prefix of PRELOAD_CHUNK_PREFIXES) {
          const match = bundleFileNames.find(
            (name) => name.startsWith(`assets/${prefix}`) && name.endsWith('.js'),
          );
          if (match) {
            hints.push(`    <link rel="modulepreload" crossorigin href="/${match}">`);
          }
        }
        if (hints.length > 0) {
          // Insert before the </head> close tag so they sit alongside the
          // existing modulepreload hints Vite injected for the entry chunk.
          next = next.replace('</head>', `${hints.join('\n')}\n  </head>`);
        }

        return next;
      },
    },
  };
}

export default defineConfig(() => {
  const isTest = process.env.PLAYWRIGHT_TEST === 'true';
  const analyze = process.env.ANALYZE === 'true';
  return {
    plugins: [
      react(),
      vocabandHtmlPerf(),
      // Service Worker — re-enabled 2026-04 with a much safer config than
      // the previous attempt.  History: the earlier setup cached
      // index.html aggressively, so when a new deploy shipped, returning
      // users kept their old HTML which referenced JS chunks that no
      // longer existed on the server -> white screen.  This config
      // specifically avoids that by using NetworkFirst for HTML (so the
      // network copy always wins when online, cache is only a fallback
      // when offline) and CacheFirst for the content-hashed JS/CSS
      // bundles (which are immutable — new deploys change the hash and
      // therefore the cache key).
      //
      // Kill switch: visiting /?unregisterSW=1 triggers the registrar
      // in main.tsx to unregister the SW and hard-reload.  If something
      // goes wrong in the wild, teachers can recover in one URL.
      ...(!isTest ? [VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: [
          'favicon.ico',
          'robots.txt',
        ],
        manifest: {
          name: 'Vocaband',
          short_name: 'Vocaband',
          description: 'Gamified English vocabulary for Israeli classrooms',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            // A dedicated maskable asset can be added later; for now we
            // reuse the 512 with purpose 'any maskable' which works on
            // most Android launchers, just without bleed into the
            // 'safe zone' that a true maskable PNG would give.
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          // Suppress the noisy "IDBDatabase: connection is closing"
          // unhandled rejections that fire from workbox-expiration when
          // the page is navigating away mid-cache-write.  See
          // public/sw-error-suppress.js for the listener — importScripts
          // injects it BEFORE workbox boots so every subsequent
          // expiration update is covered.
          importScripts: ['/sw-error-suppress.js'],
          // Precache ONLY the SPA bootstrap shell.
          //
          // History: a previous config precached every file under dist/
          // (~162 entries, ~4.8 MB) and relied on globIgnores to carve
          // out the obvious heavies (jspdf, pptxgen, exceljs, …). That
          // worked but background-fetched 30+ s of asset traffic on a
          // school's first cold install over Slow-4G, which crowded
          // every other student's download on saturated classroom
          // Wi-Fi. Most precached chunks were never used by 99 % of
          // visitors (teacher dashboard, gradebook, classroom drilldowns,
          // hebrew modes, gameplay screens, the 404 kB vocabulary
          // dataset, the 497 kB pptxgen XML core, …).
          //
          // New approach — allowlist instead of denylist:
          //   1. Precache the absolute minimum needed to bootstrap the
          //      landing page + offline-second-visit shell.
          //   2. Trust the runtime CacheFirst handler below (now bumped
          //      from 60 → 200 entries) to cache everything else on
          //      first encounter. Returning users get the same offline
          //      experience for any view they've already visited.
          //   3. Standalone static pages (poster, terms, privacy,
          //      answers/*, jobs/*, security-policy, acknowledgements)
          //      are NOT in the SPA shell and fetched on demand.
          //
          // Result: precache shrinks from ~4.8 MB → ~250 kB.
          globPatterns: [
            // Static SPA shell
            'index.html',
            'boot.css',
            // boot-debug.js is inlined into index.html by vocabandHtmlPerf,
            // so it never ships as a separate request — precaching the
            // file is dead weight.
            'sw-error-suppress.js',
            'manifest.webmanifest',
            'favicon.ico',
            'icon-*.png',
            // Critical bootstrap chunks (always loaded on every page)
            'assets/index-*.js',
            'assets/rolldown-runtime-*.js',
            'assets/react-vendor-*.js',
            // App orchestrator + landing page — React.lazy targets
            // resolved within ms of first paint.
            'assets/App-*.js',
            'assets/LandingPage-*.js',
            // motion + lucide ship in App.tsx's modulepreload chain so
            // they fetch in parallel with App. Keep them precached so
            // offline second visits don't fall back to network for the
            // landing page's animations / icons.
            'assets/motion-*.js',
            'assets/lucide-*.js',
            // Above-the-fold landing dependencies
            'assets/PublicNav-*.js',
            'assets/landing-page-*.js',
            'assets/FloatingButtons-*.js',
            // Main Tailwind stylesheet
            'assets/index-*.css',
          ],
          // Cap precached file size to keep accidental wildcard matches
          // from pulling in heavy chunks. The index Tailwind stylesheet
          // is the heaviest legitimate precached entry and grows with
          // the app (~400 kB and climbing); 460 kB clears it with room
          // to breathe while still excluding the big lazy chunks if a
          // glob ever accidentally matches them — lib (~497 kB),
          // vocabulary (~596 kB), html2pdf (~736 kB), exceljs (~930 kB).
          maximumFileSizeToCacheInBytes: 460_000,
          // Clean up any caches left behind by the previous (broken)
          // SW so returning users don't carry stale entries forward.
          cleanupOutdatedCaches: true,
          // Activate new SW immediately on the next page load instead
          // of waiting for every tab to close.  Combined with
          // clientsClaim, this means a fresh deploy reaches users
          // within ONE navigation rather than days later.  Teachers
          // were having to "clear cache" after every deploy because
          // the old SW kept serving cached HTML — these two flags
          // are the proper fix.
          skipWaiting: true,
          clientsClaim: true,
          // Treat navigation requests network-first (see runtimeCaching
          // below); the fallback is the last-cached shell so offline
          // students can still open the app.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/socket\.io/,
            /^\/auth/,
            /^\/rest\/v1/,
            /^\/realtime\/v1/,
            // Standalone static HTML pages — not part of the SPA shell.
            // Match BOTH the plain and .html forms, because Cloudflare
            // Workers Assets defaults to auto-trailing-slash handling
            // which 301-redirects /foo.html → /foo.  Matching only
            // `.html` meant the redirected target was still intercepted
            // by the SW, defeating the fix.  Using a non-anchored
            // optional `.html` suffix covers every combination.
            /^\/poster(\.html)?(\?|$)/,
            /^\/terms(\.html)?(\?|$)/,
            /^\/privacy(\.html)?(\?|$)/,
            // Quick Play join URL. Same "redirected response" bug as
            // poster/privacy/terms — the SW cached a navigation that
            // went through the Cloudflare apex→www redirect, then
            // tried to serve that cached redirect response back to a
            // navigation whose redirect mode is "manual". Browser
            // rejects it with "a redirected response was used for a
            // request whose redirect mode is not 'follow'" and the
            // entire page fails to load. Denylisting + NetworkOnly
            // (below) keeps the SW out of this path entirely.
            /^\/quick-play(\?|$)/,
            // OAuth + magic-link callbacks — Google OAuth, Supabase
            // OTP / magic link, etc. all return the user to
            // `vocaband.com/?code=...` (or with token_hash /
            // access_token / refresh_token query params).  Same SW +
            // redirect bug bites these: Cloudflare may redirect
            // apex→www, the SW caches the redirect, and the next
            // top-level navigation refuses to consume the cached
            // redirect.  Symptom in the wild: signing in with Google
            // hits a Chrome error page with "a redirected response
            // was used for a request whose redirect mode is not
            // 'follow'".  Denylisting these patterns means the SW
            // never sees the navigation in the first place — the
            // browser handles it directly, redirect follows cleanly,
            // Supabase JS picks up the session.
            /\?.*\bcode=/,
            /\?.*\btoken_hash=/,
            /\?.*\baccess_token=/,
            /\?.*\brefresh_token=/,
            // PDF downloads (school decks + teacher/parent guides linked
            // from the landing-page footer).  Without this denylist + the
            // matching NetworkOnly runtime rule below, opening a PDF in a
            // new tab is a `navigate` request that the SW captured with
            // NetworkFirst.  On any transient network hiccup the
            // handlerDidError plugin fell back to /index.html, so teachers
            // saw the SPA shell instead of the PDF and reported "the PDFs
            // don't open".  Keeping the SW out of `.pdf` navigations lets
            // the browser handle them directly.
            /\.pdf(\?|$)/,
          ],
          runtimeCaching: [
            {
              // Standalone static HTML pages.  Handled BEFORE the
              // generic navigate rule below so we bypass SW caching
              // entirely.  Reason: cached navigation responses that
              // went through a redirect (e.g. apex→www, or Cloudflare
              // auto-trailing-slash's /poster.html → /poster) can't be
              // served back to a navigation request whose redirect
              // mode is "manual" — the browser rejects them with
              // "a redirected response was used for a request whose
              // redirect mode is not 'follow'", and the teacher sees
              // a broken page until they hard-refresh.  NetworkOnly +
              // don't-cache sidesteps the whole class of bugs, for
              // both the .html and no-extension URL forms.
              // Include /quick-play here too — see the matching comment
              // in navigateFallbackDenylist above. NetworkOnly means the
              // SW never touches the response, so there's no cached
              // redirect for it to re-serve and choke on.
              urlPattern: /\/(poster|privacy|terms|quick-play)(\.html)?(\?|$)/,
              handler: 'NetworkOnly',
            },
            {
              // PDF downloads — landing-page footer links open
              // /Vocaband-Presentation-{HE,AR}.pdf and
              // /docs/{teacher-guide,quick-start,student-guide,parent-letter}-{en,he,ar}.pdf
              // in a new tab.  Without this rule the generic navigate
              // handler below captured them as NetworkFirst and, on any
              // network hiccup, the handlerDidError fallback returned
              // /index.html instead of the PDF (teacher report: "the
              // PDFs don't open").  NetworkOnly keeps the SW out of the
              // request path entirely so the browser handles
              // application/pdf responses directly.
              urlPattern: /\.pdf(\?|$)/,
              handler: 'NetworkOnly',
            },
            {
              // Root path with any query string — the Classroom v2
              // tab routing produces URLs like `/?tab=reports`, and
              // the same redirect-cache bug bit those: SW captures a
              // redirected response (apex→www, etc.), then a popstate
              // navigation later refuses to consume it because the
              // browser's redirect mode is "manual".  Teacher saw
              // "This site can't be reached / a redirected response
              // was used …".  NetworkOnly skips the SW for any
              // navigation carrying a query string, which has no
              // sane cacheable shape anyway.
              urlPattern: ({ request, url }) =>
                request.mode === 'navigate' && url.search.length > 0,
              handler: 'NetworkOnly',
            },
            {
              // The HTML shell — NEVER trust the cache first.  Network
              // timeout so offline boot falls back to cache instead of
              // hanging.  Bumped 3s → 6s after field reports that Israeli
              // school Wi-Fi often responds in 4–5s; at 3s we aborted and
              // either served stale cache (fine) or fell into the
              // handlerDidError path that surfaces a 503 recovery shell on
              // a fresh install (not fine).  6s lets the network finish on
              // borderline-slow connections; offline visitors still get
              // their fallback within an extra 3s of waiting.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'vocaband-html',
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
                // Last-resort fallback when BOTH network and runtime
                // cache miss.  Without this plugin, NetworkFirst
                // throws "TypeError: Failed to fetch" on transient
                // connectivity blips (network errored AND we hadn't
                // cached the page yet, e.g. right after a fresh
                // install or after cleanupOutdatedCaches), and the
                // browser surfaces the rejected promise as a broken
                // page.  Searching all Cache Storage buckets pulls
                // the precached /index.html that vite-plugin-pwa
                // ships in its precache manifest — that's the SPA
                // shell, which is enough to bootstrap the app and
                // re-fetch dynamic data.  If even the precache is
                // empty (very rare — install failed?) we synthesize
                // a tiny HTML page with a recovery link so the user
                // is never left with a broken navigation.
                plugins: [
                  {
                    handlerDidError: async () => {
                      const cached = await caches.match('/index.html', { ignoreSearch: true });
                      if (cached) return cached;
                      return new Response(
                        '<!doctype html><meta charset="utf-8"><title>Vocaband — connection issue</title>' +
                          '<style>body{font-family:system-ui;padding:2rem;color:#1c1917;background:#fafaf9}a{color:#4f46e5}</style>' +
                          '<h1>Connection issue</h1>' +
                          '<p>Vocaband couldn\'t reach the network and there\'s no cached copy on this device yet. ' +
                          'Check your connection and reload, or <a href="/?unregisterSW=1">reset the app</a>.</p>',
                        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                      );
                    },
                  },
                ],
              },
            },
            {
              // Content-hashed JS/CSS — immutable, CacheFirst is safe
              // because a new deploy changes the hash (and therefore
              // the cache key) automatically.
              //
              // Bumped maxEntries 60 → 200 in tandem with the precache
              // slim (see workbox.globPatterns above). With the
              // bootstrap shell as the only precached set, the runtime
              // cache now has to hold every view/hook/vendor chunk a
              // returning user has ever loaded. 200 × ~30 kB gz avg ≈
              // 6 MB on disk — well inside the SW storage budget on
              // every modern device, and protects offline access to
              // any view the user has opened.
              urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-assets',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Fonts + small images.  CacheFirst with a generous TTL.
              //
              // Scope intentionally limited to same-origin + fonts.gstatic.com.
              // Previously this matched ANY image destination, which meant
              // third-party icons (e.g. ssl.gstatic.com/ui/v1/icons/common/x_8px.png
              // loaded by Google Sign-In) hit the SW's fetch path.  CSP
              // `connect-src` doesn't allowlist those hosts (correctly — we
              // don't make API calls there), so workbox's fetch was blocked,
              // which then cascaded into "IDBDatabase: The database connection
              // is closing" errors as the cache-put plugin spammed
              // updateTimestamp against an aborted transaction.  Leaving the
              // request unhandled lets the browser fetch it directly under
              // `img-src 'self' data: blob: https:`, which permits it.
              urlPattern: ({ request, url, sameOrigin }) =>
                ['font', 'image'].includes(request.destination) &&
                (sameOrigin || url.hostname === 'fonts.gstatic.com'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-media',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
            {
              // Word-audio MP3s served from Supabase Storage.  Cache
              // so a repeat game on weak Wi-Fi has the clip already.
              // Bumped 500 → 2000 on 2026-04-25 — the dataset has
              // ~9000 unique words, so a 500-entry LRU evicted half
              // the cache for any teacher who used multiple
              // assignments in a session, forcing re-fetches against
              // Supabase Storage on every replay.  ~30 KB per MP3 ×
              // 2000 = ~60 MB of cache, well within the SW budget.
              urlPattern: /\/storage\/v1\/object\/public\/sound\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-word-audio',
                expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 180 },
              },
            },
            {
              // Motivational praise phrases — same reasoning.
              urlPattern: /\/storage\/v1\/object\/public\/motivational\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-praise-audio',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 180 },
              },
            },
            {
              // In-game background music — ~10 same-origin MP3s shipped in
              // public/game-music/.  Without this rule the 'fonts + small
              // images' handler above ignores them (request.destination ===
              // 'audio' doesn't match the font/image filter), so every game
              // session re-fetches the BGM from origin on weak Wi-Fi.
              // CacheFirst with 20 entries comfortably covers the asset set.
              urlPattern: /\/game-music\/.*\.mp3$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-game-music',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 180 },
              },
            },
          ],
        },
      })] : []),
      tailwindcss(),
      // Bundle analyzer — opt-in via ANALYZE=true npm run build.
      // Writes dist/stats.html with a treemap of every chunk so we can
      // see what's shipping (heavy deps, dead exports, unintended top
      // level imports).  Not in the default plugin list because the
      // post-build write adds ~1s to every build.
      ...(analyze ? [visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      })] : []),
      // Cloudflare plugin disabled — causing white screen in dev
      // ...(!isTest ? [cloudflare()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // html2pdf.js bundles html2canvas v1.x, which doesn't support
        // CSS oklch() colors — Tailwind v4's entire palette is oklch,
        // so the certificate rendered as black-on-white nonsense in the
        // PDF.  html2canvas-pro is a drop-in fork that handles oklch
        // (plus oklab and color()) correctly.  Aliasing here means
        // every internal `require('html2canvas')` resolves to the pro
        // build without forking html2pdf.js itself.
        'html2canvas': path.resolve(__dirname, 'node_modules/html2canvas-pro'),
      },
    },
    build: {
      modulePreload: {
        // Keep App + the supabase client + Sentry OUT of the auto-injected
        // modulepreload graph. The landing now boots PublicShell (which
        // is supabase-free); preloading App/supabase/sentry in the shared
        // static <head> would force every public visitor to download
        // ~150 kB gz they don't need on first paint. They all load on
        // demand — App on login/session-restore, Sentry on idle after
        // first paint, supabase on the OAuth ?code= callback or once App
        // mounts. One extra RTT on a deliberate action, in exchange for a
        // much lighter cold landing.
        //
        // Lighthouse field test (2026-05-28) showed an older deploy still
        // dragging supabase-* and sentry-* onto the landing critical
        // path's chunk dependency tree even though main.tsx already
        // dynamic-imports them. The sentry-* filter below makes the
        // exclusion explicit so a future refactor that re-introduces an
        // eager import doesn't silently regress cold-load.
        resolveDependencies(_filename, deps) {
          return deps.filter(
            (dep) =>
              !/\/App-[\w-]+\.js$/.test(dep) &&
              !/\/supabase-[\w-]+\.js$/.test(dep) &&
              !/\/sentry-[\w-]+\.js$/.test(dep),
          );
        },
      },
      // Motion was previously filtered out of the HTML modulepreload
      // list while we were removing motion.div usage from LandingPage.
      // The filter is now removed: rolldown wraps react/jsx-runtime
      // inside the motion chunk (CJS interop in framer-motion's
      // require('react/jsx-runtime')), so LandingPage's bundle still
      // statically imports motion-*.js to grab the JSX runtime. With
      // motion unavoidable, preloading it in parallel with App +
      // react-vendor + lucide is strictly faster than fetching it
      // serially after LandingPage requests it.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('src/data/vocabulary')) return 'vocabulary';
            // Pin Sentry to its own chunk.  Bundled into `index` it
            // bloated the entry by ~40 kB gz and any change to main.tsx
            // busted the Sentry cache.  Splitting it means cold-load
            // is one extra parallel request but warm-load reuses the
            // long-cached Sentry chunk across deploys.
            if (id.includes('node_modules/@sentry/')) return 'sentry';
            // React + react-dom — 130 kB raw, never changes; pin so
            // upgrades to other deps don't invalidate React's cache.
            //
            // ORDER MATTERS: this rule MUST come BEFORE the motion
            // rule below. motion's source files transitively import
            // react/jsx-runtime; if we let the motion matcher catch
            // first, it pulls jsx-runtime into the motion chunk and
            // every JSX-using component (including LandingPage,
            // which no longer animates anything) ends up with a
            // static `import` from motion-*.js to grab the JSX
            // runtime. Putting react first keeps the runtime in the
            // react-vendor chunk where it belongs, so non-animated
            // components don't need to load motion at all.
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) return 'react-vendor';
            // motion/framer-motion — deliberately NOT force-chunked.
            //
            // React's jsx-runtime is CommonJS (react/jsx-runtime.js ->
            // cjs/react-jsx-runtime.production.js). When motion got its own
            // manualChunk, rolldown's CJS interop made that motion chunk the
            // canonical holder of jsx/jsxs, so EVERY JSX-using page (incl.
            // the public landing) had to statically import the ~42 kB motion
            // chunk just to render — it sat on the cold first-paint path and
            // resisted every attempt to pin jsx-runtime elsewhere (rolldown
            // overrides manualChunks for CJS-interop modules).
            //
            // Letting rolldown auto-split motion instead: jsx-runtime settles
            // into react-vendor (where it belongs, +0.1 kB), and motion lands
            // in a single shared chunk pulled in ONLY by the lazy views that
            // animate. No duplication, total weight unchanged, and motion is
            // off the landing critical path. (The lazy boundaries in App.tsx /
            // TeacherDashboard* are what keep eager importers from dragging it
            // back on.)
            // supabase-js was already a chunk via natural splitting
            // but pin it so the chunk name is stable across builds.
            if (id.includes('node_modules/@supabase/')) return 'supabase';
            return undefined;
          },
        },
      },
    },
    server: {
      // Vite on 5173 (already on Supabase's OAuth allowlist) so Google
      // OAuth can bounce back to localhost. 3000/3001 collide with
      // sibling projects on this dev machine, so we settled on the
      // Vite default and pushed the backend to 3002 below.
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});