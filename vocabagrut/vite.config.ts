import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Standalone build — no proxy, no backend. AI grading is stubbed in
// src/lib/aiGrading.ts; wire it to an Edge Function / serverless route
// when you extract this into its own repo (see README).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
});
