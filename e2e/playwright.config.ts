import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname doesn't exist in ESM; recreate it from import.meta.url so
// webServer.cwd below can resolve the project root portably.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // *.auth.spec.ts belong to playwright.auth.config.ts — they need the
  // Supabase-mock build (VITE_SUPABASE_URL=test) to drive logged-in flows.
  // This default suite builds with VITE_SUPABASE_URL="" (config-error path),
  // where a seeded session can't restore, so they'd fail here. Excluded.
  testIgnore: '**/*.auth.spec.ts',
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

  // Device matrix: the same specs run on desktop + the phones students
  // actually bring to class. Emulation (viewport, touch, UA, device
  // scale) catches the bulk of mobile layout/touch breakage on your
  // laptop. For the real Safari/Android ENGINE quirks emulation can't
  // reproduce, run the same suite on a real-device cloud
  // (BrowserStack/LambdaTest) — see docs/testing-at-scale.md.
  //
  // The three default projects all use the CHROMIUM engine (Desktop +
  // two mobile viewports), so they run anywhere the CI already installs
  // chromium — no extra browser download needed.
  //
  // Mobile Safari uses the separate WebKit engine, which CI doesn't
  // install, so it's OPT-IN: run `npx playwright install` once, then set
  // PLAYWRIGHT_WEBKIT=1 (or just `--project="Mobile Safari"`). This keeps
  // CI green while still giving real iOS coverage locally / before a
  // release. See docs/testing-at-scale.md.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      // A small, low-end Android viewport — the cheap phones that show
      // layout overflow first. Chromium engine.
      name: 'Small Android',
      use: { ...devices['Galaxy S9+'] },
    },
    // WebKit/iOS — only when explicitly opted in (needs `npx playwright
    // install`). Excluded by default so CI (chromium-only) stays green.
    ...(process.env.PLAYWRIGHT_WEBKIT
      ? [{ name: 'Mobile Safari', use: { ...devices['iPhone 13'] } }]
      : []),
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
    // Pin the cwd to the project root.  Playwright's webServer cwd
    // defaults to the directory of THIS config file (e2e/), so
    // `npx vite preview` would look for `e2e/dist/` and 404 on every
    // route -- vite preview resolves outDir relative to its cwd.
    // `npm run build` happens to work either way because npm walks
    // up to find package.json, but vite preview doesn't.  This was
    // the root cause of the smoke-test failures on every PR from
    // 2026-05-08 onward (network trace showed GET / → 404, body=0).
    cwd: path.resolve(__dirname, '..'),
    reuseExistingServer: !process.env.CI,
    // Allow up to 3 min for the production build to finish on CI
    // before vite preview comes up.  Local re-runs hit the cache and
    // typically finish in 10-15s.
    timeout: 180_000,
  },
});
