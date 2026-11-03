/** Public class-code entry against a synthetic Supabase roster. No real students or PINs. */
import { test, expect } from '@playwright/test';
import { disableAnimations, mockSupabase, presetLocalStorage } from '../fixtures/supabase-mock';
import { FAKE_AUTH_SESSION, TEST_ASSIGNMENT, TEST_CLASS, TEST_STUDENTS, TEST_SUPABASE_URL } from '../fixtures/test-data';
import { goToLanding } from '../helpers/navigation';

test('class code and synthetic PIN lead to the assigned first game', async ({ page }) => {
  await disableAnimations(page);
  await presetLocalStorage(page);
  // Keep this first-login test entirely offline from real services.
  // The later, more specific Supabase routes fulfill the synthetic requests.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.origin === TEST_SUPABASE_URL) {
      return route.continue();
    }
    return route.abort();
  });
  await mockSupabase(page, 'public');
  // Register after the shared mock so this endpoint takes precedence.
  await page.route(`${TEST_SUPABASE_URL}/rest/v1/rpc/class_roster_for_login`, async route => {
    expect(route.request().postDataJSON()).toMatchObject({ p_class_code: TEST_CLASS.code });
    await route.fulfill({ json: TEST_STUDENTS.map(student => ({
      id: student.id,
      display_name: student.display_name,
      email: `${student.id}@example.invalid`,
      avatar: student.avatar,
    })) });
  });
  const syntheticPin = 'ABC234';
  let signInRequests = 0;
  await page.route(`${TEST_SUPABASE_URL}/auth/v1/token**`, async route => {
    expect(new URL(route.request().url()).searchParams.get('grant_type')).toBe('password');
    expect(route.request().postDataJSON()).toMatchObject({
      email: `${TEST_STUDENTS[0].id}@example.invalid`,
      password: syntheticPin,
    });
    signInRequests += 1;
    await route.fulfill({ json: FAKE_AUTH_SESSION });
  });

  await goToLanding(page);
  await page.getByRole('button', { name: /enter my class/i }).first().click();
  const code = page.getByRole('textbox', { name: /class code or link from your teacher/i });
  await code.fill(TEST_CLASS.code);
  await page.getByRole('button', { name: /continue to my class/i }).click();
  await expect(page.getByRole('button', { name: /Alice/ })).toBeVisible();
  await page.getByRole('button', { name: /Alice/ }).click();
  await page.getByRole('textbox', { name: /pin/i }).fill(syntheticPin);
  await page.getByRole('button', { name: /let.s go/i }).click();
  await expect(page.getByRole('heading', { name: 'Your learning space' })).toBeVisible({ timeout: 15_000 });
  expect(signInRequests).toBe(1);

  const consent = page.getByRole('dialog', { name: 'Before you start playing' });
  await expect(consent).toBeVisible();
  await consent.getByRole('checkbox').check();
  await consent.getByRole('button', { name: /continue playing/i }).click();
  await expect(consent).toHaveCount(0);
  const companion = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Hatchling' }) });
  if (await companion.count()) await companion.getByRole('button', { name: 'Close' }).click();
  const onboarding = page.getByRole('dialog', { name: 'Welcome to Vocaband!' });
  if (await onboarding.count()) await onboarding.getByRole('button', { name: 'Skip onboarding' }).click();
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  const assignments = page.getByRole('dialog', { name: 'Assignments', exact: true });
  await expect(assignments).toBeVisible();
  await assignments.getByRole('button').filter({ hasText: TEST_ASSIGNMENT.title }).click();
  await expect(page.getByRole('heading', { name: /your word adventure/i })).toBeVisible();
  await page.getByRole('button', { name: /^Classic Mode/ }).click();
  await expect(page.getByRole('status').filter({ hasText: /question 1 of 5/i }))
    .toBeVisible({ timeout: 15_000 });
});
