import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      // VitePWA disabled — service worker was causing white screens from stale cache
      // Will re-enable with proper config after cache is cleared from all devices
      tailwindcss(),
      cloudflare()
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
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});