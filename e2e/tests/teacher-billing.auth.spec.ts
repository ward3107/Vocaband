import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import {
  PRIVACY_POLICY_VERSION,
  STUDENT_VISIBILITY_VERSION,
} from '../../src/config/privacy-config';

async function prepare(page: Page) {
  await page.addInitScript(
    ([privacy, visibility]) => {
      for (const key of [
        'onboarding_done',
        'student_onboarding_done',
        'welcome_seen',
        'privacy_reminder_dismissed',
        'guide_seen_classroom',
        'guide_seen_library-intro',
      ])
        localStorage.setItem('vocaband_' + key, '1');
      localStorage.setItem('vocaband_consent_version', privacy);
      localStorage.setItem('vocaband_student_visibility_version', visibility);
    },
    [PRIVACY_POLICY_VERSION, STUDENT_VISIBILITY_VERSION]
  );
}
const trial = {
  covered: false,
  until: null,
  trialEndsAt: '2099-06-01',
  subscription: null,
  emailEnabled: false,
  language: 'en',
  offers: [
    { code: 'month', months: 1, agorot: 2900, recurring: true, endsAt: null },
    { code: 'year', months: 12, agorot: 29000, recurring: true, endsAt: null },
    { code: 'launch', months: 12, agorot: 24900, recurring: false, endsAt: '2098-01-01' },
  ],
};
test('teacher can choose an ILS plan and save explicit email consent', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  await page.route('**/api/teacher/billing', (route) => route.fulfill({ json: trial }));
  let preference: unknown;
  await page.route('**/api/teacher/billing/preferences', (route) => {
    preference = route.request().postDataJSON();
    return route.fulfill({ status: 204 });
  });
  let offer: unknown;
  await page.route('**/api/teacher/billing/checkout', (route) => {
    offer = route.request().postDataJSON();
    return route.fulfill({ json: { url: new URL('/test-order', route.request().url()).href } });
  });
  await page.route('**/test-order', (route) => route.fulfill({ body: 'Test checkout' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage subscription' }).click();
  const dialog = page.getByRole('dialog', { name: 'My subscription' });
  await expect(dialog.getByRole('heading', { name: 'Yearly Pro' })).toBeVisible();
  await expect(
    dialog.getByText('One payment, no automatic renewal', { exact: false })
  ).toBeVisible();
  const emails = dialog.getByRole('checkbox');
  await expect(emails).not.toBeChecked();
  await emails.check();
  await dialog.getByRole('button', { name: 'Save preferences' }).click();
  await expect(dialog.getByText('Preferences saved.')).toBeVisible();
  expect(preference).toEqual({ enabled: true, language: 'en' });
  await dialog
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Monthly Pro' }) })
    .getByRole('button')
    .click();
  await expect(page).toHaveURL(/test-order/);
  expect(offer).toEqual({ offer: 'month' });
});
test('a teacher can stop renewal and keep the date already paid through', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  let canceled = false;
  await page.route('**/api/teacher/billing', (route) =>
    route.fulfill({
      json: {
        ...trial,
        until: '2099-09-01',
        subscription: { recurring: true, canceled_at: canceled ? '2026-11-18' : null },
      },
    })
  );
  await page.route('**/api/teacher/billing/cancel', (route) => {
    canceled = true;
    return route.fulfill({ status: 204 });
  });
  await page.goto('/?billing=1');
  const dlg = page.getByRole('dialog', { name: 'My subscription' });
  page.once('dialog', (d) => d.accept());
  await dlg.getByRole('button', { name: 'Cancel renewal' }).click();
  await expect(dlg.getByText('Automatic renewal is canceled.')).toBeVisible();
  await expect(dlg.getByText(/Paid access through/)).toBeVisible();
});
test('a student cannot enter the teacher subscription dialog by URL', async ({
  studentPage: page,
}) => {
  await prepare(page);
  let billingRequests = 0;
  await page.route('**/api/teacher/billing**', (route) => {
    billingRequests++;
    return route.fulfill({ status: 403 });
  });
  await page.goto('/?billing=1');
  await expect(page.getByRole('heading', { name: 'Your learning space' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Manage subscription' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'My subscription' })).toHaveCount(0);
  expect(billingRequests).toBe(0);
});
