import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { cloudflare } from "@cloudflare/vite-plugin";
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
              // The HTML shell — NEVER trust the cache first.  Short
              // network timeout so offline boot falls back to cache
              // quickly instead of hanging.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'vocaband-html',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
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
              urlPattern: /\/storage\/v1\/object\/public\/sound\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vocaband-word-audio',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 180 },
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