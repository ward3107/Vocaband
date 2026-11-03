/** Public class-code entry against a synthetic Supabase roster. No real students or PINs. */
import { test, expect } from '@playwright/test';
import { disableAnimations, mockSupabase, presetLocalStorage } from '../fixtures/supabase-mock';
import { TEST_CLASS, TEST_STUDENTS, TEST_SUPABASE_URL } from '../fixtures/test-data';
import { goToLanding } from '../helpers/navigation';

test('class code opens the matching synthetic roster and PIN step', async ({ page }) => {
  await disableAnimations(page);
  await presetLocalStorage(page);
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

  await goToLanding(page);
  await page.getByRole('button', { name: /enter my class/i }).first().click();
  const code = page.getByRole('textbox', { name: /class code or link from your teacher/i });
  await code.fill(TEST_CLASS.code);
  await page.getByRole('button', { name: /continue to my class/i }).click();
  await expect(page.getByRole('button', { name: /Alice/ })).toBeVisible();
  await page.getByRole('button', { name: /Alice/ }).click();
  await expect(page.getByRole('textbox', { name: /pin/i })).toBeVisible();
});
