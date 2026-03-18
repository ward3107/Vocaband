import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Vocaband',
          short_name: 'Vocaband',
          description: 'A gamified vocabulary learning app for EFL students',
          theme_color: '#059669',
          background_color: '#f5f5f4',
          display: 'standalone',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Always fetch the HTML document from the network so a refresh never
          // serves a stale shell that blocks auth from resolving.
          navigateFallback: 'index.html',
          navigationPreload: true,
          runtimeCaching: [
            {
              // Navigation requests (the HTML page itself) — network first,
              // fall back to cache only when fully offline.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 5,
              },
            },
            {
              // Static assets (JS, CSS, images) — cache first for speed.
              urlPattern: ({ request }) =>
                ['script', 'style', 'image', 'font'].includes(request.destination),
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets',
                expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
