import { test as base, expect, Page } from '@playwright/test';
import { disableAnimations, presetLocalStorage } from './supabase-mock';

type AppFixtures = {
  /** Page ready for public (unauthenticated) scenarios — no Supabase needed */
  publicPage: Page;
};

export const test = base.extend<AppFixtures>({
  publicPage: async ({ page }, use) => {
    await disableAnimations(page);
    await presetLocalStorage(page);
    await use(page);
  },
});

export { expect };
