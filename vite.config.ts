import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
// Cloudflare plugin is intentionally disabled (causes white screen
// in dev) — kept as a comment so future edits don't re-import it.
// import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(() => {
  const isTest = process.env.PLAYWRIGHT_TEST === 'true';
  return {
    plugins: [
      react(),
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
              // The HTML shell — NEVER trust the cache first.  Short
              // network timeout so offline boot falls back to cache
              // quickly instead of hanging.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'vocaband-html',
                networkTimeoutSeconds: 3,
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
              urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-assets',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Fonts + small images.  CacheFirst with a generous TTL.
              urlPattern: ({ request }) => ['font', 'image'].includes(request.destination),
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
          ],
        },
      })] : []),
      tailwindcss(),
      // Cloudflare plugin disabled — causing white screen in dev
      // ...(!isTest ? [cloudflare()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('src/data/vocabulary')) return 'vocabulary';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
      },
    },
  };
});