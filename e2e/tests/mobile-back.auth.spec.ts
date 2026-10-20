import { test, expect } from '../fixtures/auth.fixture';
import { mockSupabase, presetLocalStorage } from '../fixtures/supabase-mock';
import { waitForAppLoad } from '../helpers/navigation';
import type { Page } from '@playwright/test';
import {
  PRIVACY_POLICY_VERSION,
  STUDENT_VISIBILITY_VERSION,
} from '../../src/config/privacy-config';

async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ({ privacy, visibility }) => {
      for (const key of [
        'vocaband_onboarding_done',
        'vocaband_student_onboarding_done',
        'vocaband_welcome_seen',
        'vocaband_privacy_reminder_dismissed',
      ])
        localStorage.setItem(key, '1');
      localStorage.setItem('vocaband_consent_version', privacy);
      localStorage.setItem('vocaband_student_visibility_version', visibility);
    },
    { privacy: PRIVACY_POLICY_VERSION, visibility: STUDENT_VISIBILITY_VERSION }
  );
}
async function back(page: Page) {
  await page.evaluate(() => history.back());
}

test('personal entry Back walks PIN → names → class code → home, keeping the invite URL until home', async ({
  page,
}) => {
  await presetLocalStorage(page);
  await mockSupabase(page, 'public');
  await prepare(page);
  const id = '5f7b1234-1111-2222-3333-123456789abc';
  await page.route('https://test-project.supabase.co/rest/v1/rpc/class_roster_for_login', (route) =>
    route.fulfill({
      json: [
        { id, display_name: 'Maya', email: 'maya@example.test', avatar: '🦊' },
        { id: 'ali', display_name: 'Ali', email: 'ali@example.test', avatar: '🐻' },
      ],
    })
  );
  const invite = `/student?class=ABCD2345&className=Year+7&s=${id}&assignment=task-1`;
  await page.goto(invite);
  await waitForAppLoad(page);
  await expect(page.getByLabel('Type your PIN', { exact: true })).toBeVisible();
  await page.getByLabel('Type your PIN', { exact: true }).fill('PQRS78');
  await back(page);
  await expect(page.getByRole('button', { name: 'Maya', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('assignment')).toBe('task-1');
  expect(new URL(page.url()).pathname).toBe('/student');
  await back(page);
  const code = page.getByLabel('Class code or link from your teacher', { exact: true });
  await expect(code).toHaveValue('ABCD2345');
  await page.getByRole('button', { name: 'Continue to my class', exact: true }).click();
  // Going back and re-entering a class must not silently reselect the invite's child.
  await expect(page.getByRole('button', { name: 'Maya', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Maya', exact: true }).click();
  await expect(page.getByLabel('Type your PIN', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Maya', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(code).toBeVisible();
  await page
    .getByRole('button', { name: 'Did your teacher give you a game code?', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await back(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/student\\?class=ABCD2345`));
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Level Up Your Vocabulary/ })).toBeVisible();
});

test('teacher Back dismisses the exit confirmation and never sends a logout request', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  let logouts = 0;
  await page.route('https://test-project.supabase.co/auth/v1/logout**', (route) => {
    logouts++;
    return route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await waitForAppLoad(page);
  await expect(page.getByRole('heading', { name: /Ready for a great lesson/ })).toBeVisible();
  await back(page);
  await expect(page.getByRole('heading', { name: 'Leave Vocaband?', exact: true })).toBeVisible();
  await back(page);
  await expect(page.getByRole('heading', { name: 'Leave Vocaband?', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Ready for a great lesson/ })).toBeVisible();
  expect(logouts).toBe(0);
});

test('Back closes the student Tasks sheet before navigating and a deep link returns home', async ({
  studentPage: page,
}) => {
  await prepare(page);
  await page.goto('/');
  await waitForAppLoad(page);
  // The synthetic student has an unclaimed pet milestone on first mount.
  const reward = page.getByRole('dialog');
  await reward.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(reward).toHaveCount(0);
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Assignments', exact: true })).toBeVisible();
  await back(page);
  await expect(page.getByRole('dialog', { name: 'Assignments', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Your learning space', exact: true })
  ).toBeVisible();
  await page.goto('/privacy-settings');
  await waitForAppLoad(page);
  await expect(
    page.getByRole('heading', { name: 'Privacy & Data Settings', exact: true })
  ).toBeVisible();
  await back(page);
  await expect(
    page.getByRole('heading', { name: 'Your learning space', exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('Back asks before leaving an unfinished round and repeated cancel keeps the question', async ({
  studentPage: page,
}) => {
  await prepare(page);
  await page.goto('/');
  await waitForAppLoad(page);
  const reward = page.getByRole('dialog');
  await reward.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(reward).toHaveCount(0);
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Assignments', exact: true })
    .getByRole('button')
    .filter({ hasText: 'Week 1 Vocabulary' })
    .click();
  await page.getByRole('button', { name: /^Classic Mode/ }).click();
  await page.getByRole('button', { name: "Let's Go! →", exact: true }).click();
  await page
    .locator('[data-vocaband-view]')
    .getByRole('button', { name: 'Exit', exact: true })
    .waitFor({ state: 'visible' });
  const screen = await page.locator('[data-vocaband-view]').innerText();
  for (let attempt = 0; attempt < 2; attempt++) {
    await back(page);
    const confirm = page.getByRole('dialog', { name: 'Leave this round?', exact: true });
    await expect(confirm).toBeVisible();
    await back(page);
    await expect(confirm).toHaveCount(0);
    expect(await page.locator('[data-vocaband-view]').innerText()).toBe(screen);
  }
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Leave this round?', exact: true })
    .getByRole('button', { name: 'Exit', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /choose your mode/i })).toBeVisible();
});
