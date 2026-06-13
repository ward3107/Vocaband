import { test as base, expect, Page } from '@playwright/test';
import { disableAnimations, presetLocalStorage, mockSupabase } from './supabase-mock';
import { FAKE_AUTH_SESSION, FAKE_TEACHER_SESSION } from './test-data';

/**
 * Authenticated fixtures — only usable under playwright.auth.config.ts,
 * whose build points VITE_SUPABASE_URL at the mock (test-project.supabase.co).
 *
 * supabase-js v2 persists its session under `sb-<project-ref>-auth-token`
 * and restores it on init (emitting INITIAL_SESSION), which drives the
 * app's useAuthRestore. We seed that key before any page script runs so
 * the app boots already "logged in", then mockSupabase answers the
 * follow-up REST/RPC calls (user row, classes, consent, …).
 */
const SESSION_STORAGE_KEY = 'sb-test-project-auth-token';

async function seedSession(page: Page, session: unknown): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key as string, value as string);
      } catch {
        /* storage blocked — the test will fail loudly at the assertion */
      }
    },
    [SESSION_STORAGE_KEY, JSON.stringify(session)] as [string, string],
  );
}

type AuthFixtures = {
  /** Page that boots as a logged-in student (TEST_STUDENT_USER). */
  studentPage: Page;
  /** Page that boots as a logged-in teacher (TEST_TEACHER). */
  teacherPage: Page;
};

export const test = base.extend<AuthFixtures>({
  studentPage: async ({ page }, use) => {
    await disableAnimations(page);
    await presetLocalStorage(page);
    await seedSession(page, FAKE_AUTH_SESSION);
    await mockSupabase(page, 'student');
    await use(page);
  },
  teacherPage: async ({ page }, use) => {
    await disableAnimations(page);
    await presetLocalStorage(page);
    await seedSession(page, FAKE_TEACHER_SESSION);
    await mockSupabase(page, 'teacher');
    await use(page);
  },
});

export { expect };
