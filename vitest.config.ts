import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Use jsdom for React component tests (.tsx)
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom'],
    ],
    env: {
      // Dummy values so supabase.ts can be imported in tests without crashing
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
