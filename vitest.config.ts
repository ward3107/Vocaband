import { defineConfig } from 'vitest/config';

// `environmentMatchGlobs` was removed in vitest v4 — switched to
// the `projects` API which lets us run tsx tests under jsdom and
// ts tests under node without per-file pragmas.
export default defineConfig({
  test: {
    env: {
      // Dummy values so supabase.ts can be imported in tests without crashing
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    // Global mocks/stubs (e.g. canvas-confetti, which can't run under jsdom
    // and otherwise throws an async unhandled error that flakes the run).
    // Inherited by both projects below via `extends: true`.
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
