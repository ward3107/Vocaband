import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Authenticated e2e config — DELIBERATELY SEPARATE from playwright.config.ts.
 *
 * Why a second config (the "multi-day workstream" auth-flow.spec.ts flagged):
 * the default suite builds with VITE_SUPABASE_URL="" so the public/smoke
 * tests exercise the config-error path. But src/core/supabase.ts FALLS BACK
 * to the production Supabase URL when the env is empty — so the client there
 * talks to the real project, which the route mock (test-project.supabase.co)
 * never intercepts. Logged-in flows are therefore undrivable in that build.
 *
 * This config builds a bundle pointed at TEST_SUPABASE_URL so every Supabase
 * call hits mockSupabase()'s route handlers, and the persisted-session key
 * becomes `sb-test-project-auth-token` (seeded by the auth fixture). It runs
 * on its own port + only the *.auth.spec.ts files, so it can't destabilise
 * the public suite. Run with `npm run test:e2e:auth`.
 */
const PORT = 5175;
const TEST_SUPABASE_URL = 'https://test-project.supabase.co';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.auth.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 60_000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The back-button trap is a mobile/PWA concern first, so cover a phone
    // viewport too (chromium engine — no extra browser download in CI).
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    // Build a bundle pointed at the MOCK Supabase URL (not the empty-env
    // build the default config uses) so the route mock actually intercepts
    // the client's calls and the auth fixture's seeded session restores.
    command: `PLAYWRIGHT_TEST=true VITE_SUPABASE_URL="${TEST_SUPABASE_URL}" VITE_SUPABASE_ANON_KEY="test-anon-key" VITE_API_URL="" npm run build && npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    cwd: path.resolve(__dirname, '..'),
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
