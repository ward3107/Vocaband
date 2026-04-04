import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // VitePWA disabled — service worker was causing white screens from stale cache
      // Will re-enable with proper config after cache is cleared from all devices
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            lucide: ['lucide-react'],
            motion: ['motion', 'motion/react'],
            vendor: ['react', 'react-dom', '@supabase/supabase-js'],
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
