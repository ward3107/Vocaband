import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  // 60s per test — first test pays the cold-start cost (preview server
  // wakeup + first navigation); subsequent tests are fast.  30s was
  // too tight on slower runners.
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Use a built bundle + `vite preview` rather than `vite dev`.
    // Reason: `vite dev` transforms files on-demand on the FIRST
    // request, and on a 2-vCPU GitHub runner the 5800-line App.tsx
    // plus its lazy children can take >25s to compile, blowing past
    // the 30s test timeout before React ever mounts.  A pre-built
    // bundle skips the compile step entirely and also matches what
    // ships to production, which is what the smoke test should be
    // verifying anyway.
    command: 'PLAYWRIGHT_TEST=true VITE_SUPABASE_URL="" VITE_SUPABASE_ANON_KEY="" VITE_API_URL="" npm run build && npx vite preview --port 5173 --strictPort',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    // Allow up to 3 min for the production build to finish on CI
    // before vite preview comes up.  Local re-runs hit the cache and
    // typically finish in 10-15s.
    timeout: 180_000,
  },
});
