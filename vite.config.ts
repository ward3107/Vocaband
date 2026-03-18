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
          cleanupOutdatedCaches: true,
          // Block the default NavigationRoute that always serves cached HTML.
          // Our NetworkFirst runtimeCaching handler below will handle navigation
          // requests instead, ensuring the user always gets fresh HTML on refresh.
          navigateFallbackDenylist: [/./],
          runtimeCaching: [
            {
              // Navigation requests — always try network first so the user
              // gets the latest HTML.  Falls back to cache only when offline.
              urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 3,
              },
            },
            {
              // Same-origin static assets only — serve from cache while revalidating.
              // Restricting to same-origin prevents the SW from trying to fetch
              // external images (e.g. google.com/favicon.ico) which would be
              // blocked by the connect-src CSP and produce console errors.
              urlPattern: ({ request, url }: { request: Request, url: URL }) =>
                ['script', 'style', 'image', 'font'].includes(request.destination) &&
                url.origin === location.origin,
              handler: 'StaleWhileRevalidate',
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
