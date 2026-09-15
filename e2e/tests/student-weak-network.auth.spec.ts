/**
 * Authenticated student resilience on poor classroom Wi-Fi.
 *
 * This stays in the authenticated mock suite so it exercises the student
 * dashboard, assignment picker and a real game without writing test progress
 * to Supabase. The live-challenge transport has a separate staging protocol
 * test because mixing teacher sockets into this browser test would hide which
 * side failed.
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';
import { TEST_ASSIGNMENT, TEST_STUDENT_USER } from '../fixtures/test-data';

const BAD_SCHOOL_WIFI = {
  offline: false,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
  latency: 400,
};

async function dismissStudentGates(page: import('@playwright/test').Page) {
  const backdrop = page.locator('div.fixed.inset-0[class*="bg-black/"]');
  for (let attempt = 0; attempt < 8 && (await backdrop.count()); attempt++) {
    const consent = page.getByRole('checkbox').and(page.locator(':not(:checked)')).first();
    if (await consent.count()) {
      await consent.check({ force: true });
      await page
        .getByRole('button', { name: /continue playing/i })
        .first()
        .click({ force: true });
      continue;
    }

    const close = page
      .getByRole('button', {
        name: /^skip onboarding$|^close$|got it|done|let.?s go/i,
      })
      .first();
    if (await close.count()) {
      await close.click({ force: true });
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(250);
  }
}

test.describe('Student game — weak network', () => {
  test.setTimeout(150_000);

  test('opens an assignment and keeps the game usable across a network drop', async ({
    studentPage: page,
  }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', BAD_SCHOOL_WIFI);

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppLoad(page);
      await dismissStudentGates(page);

      await expect(
        page.getByText(TEST_STUDENT_USER.display_name, { exact: false }).first()
      ).toBeVisible({ timeout: 45_000 });

      await page.getByLabel('Tasks').first().click();
      await expect(page.getByText(TEST_ASSIGNMENT.title, { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });

      await page
        .getByRole('button', { name: /Start Assignment|Start Learning/i })
        .first()
        .click();
      await expect(page.getByRole('heading', { name: /Choose Your Mode/i })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole('button', { name: /Flashcards/i }).click();
      const flashcardsSheet = page.getByRole('dialog', { name: 'Flashcards' });
      await expect(flashcardsSheet).toBeVisible();
      await flashcardsSheet.getByRole('button', { name: /^Play$/i }).click();

      await expect(page.getByRole('heading', { name: 'Flashcards' })).toBeVisible();
      await page.getByRole('button', { name: /Let's Go/i }).click();

      const gotIt = page.getByRole('button', { name: /Got It/i });
      await expect(gotIt).toBeVisible({ timeout: 30_000 });

      // A short Wi-Fi outage must not log the student out or tear down the
      // already-running game. Answering a flashcard is local interaction, so
      // it should remain responsive while persistence waits for connectivity.
      await cdp.send('Network.emulateNetworkConditions', {
        ...BAD_SCHOOL_WIFI,
        offline: true,
      });
      await page.waitForTimeout(1_000);

      await expect(gotIt).toBeEnabled();
      await gotIt.click();
      await expect(page.getByRole('button', { name: /Got It/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /class code/i })).toHaveCount(0);

      await cdp.send('Network.emulateNetworkConditions', BAD_SCHOOL_WIFI);
      await expect(page.getByRole('button', { name: /Got It/i })).toBeEnabled();
    } finally {
      await cdp
        .send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        })
        .catch(() => {});
      await cdp.detach().catch(() => {});
    }
  });
});
