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
const billing = {
  covered: false,
  until: null,
  trialEndsAt: '2000-06-01',
  subscription: null,
  emailEnabled: false,
  language: 'en',
  checkoutEnabled: true,
  quote: {
    students: 30,
    monthlyAgorot: 1500,
    annualAgorot: 6000,
    monthlyUnitAgorot: 50,
    annualUnitAgorot: 200,
    annualCapAgorot: 6900,
  },
};
test('teacher compares prices for the approved roster and sends the selected quote', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  let rosterChanged = false;
  await page.route('**/api/teacher/billing', (route) =>
    route.fulfill({
      json: rosterChanged
        ? {
            ...billing,
            quote: { ...billing.quote, students: 31, monthlyAgorot: 1550, annualAgorot: 6200 },
          }
        : billing,
    })
  );
  let preference: unknown;
  await page.route('**/api/teacher/billing/preferences', (route) => {
    preference = route.request().postDataJSON();
    return route.fulfill({ status: 204 });
  });
  let offer: unknown;
  await page.route('**/api/teacher/billing/checkout', (route) => {
    offer = route.request().postDataJSON();
    if (!rosterChanged) {
      rosterChanged = true;
      return route.fulfill({ status: 409, json: { error: 'Student count changed' } });
    }
    return route.fulfill({ json: { url: new URL('/test-order', route.request().url()).href } });
  });
  await page.route('**/test-order', (route) => route.fulfill({ body: 'Test checkout' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage subscription' }).click();
  const dialog = page.getByRole('dialog', { name: 'My subscription' });
  const annual = dialog
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Yearly Pro' }) });
  const monthly = dialog
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Monthly Pro' }) });
  await expect(dialog.getByText('30 approved students in your classes')).toBeVisible();
  await expect(annual.locator('strong')).toHaveText(/₪60/);
  await expect(annual.getByText(/Yearly cap/)).toHaveText(/₪69/);
  await expect(annual.getByText(/Savings/)).toHaveText(/₪120/);
  await expect(monthly.locator('strong')).toHaveText(/₪15/);
  const emails = dialog.getByRole('checkbox');
  await expect(emails).not.toBeChecked();
  await emails.check();
  await dialog.getByRole('button', { name: 'Save preferences' }).click();
  await expect(dialog.getByText('Preferences saved.')).toBeVisible();
  expect(preference).toEqual({ enabled: true, language: 'en' });
  await annual.getByRole('button').click();
  await expect(dialog.getByText(/Your student count changed/)).toBeVisible();
  expect(offer).toEqual({ offer: 'annual', students: 30, amount: 6000 });
  await expect(annual.locator('strong')).toHaveText(/₪62/);
  await annual.getByRole('button').click();
  await expect(page).toHaveURL(/test-order/);
  expect(offer).toEqual({ offer: 'annual', students: 31, amount: 6200 });
});
test('teacher can review the capped annual price in Hebrew during the free trial', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  await page.route('**/api/teacher/billing', (route) =>
    route.fulfill({
      json: {
        ...billing,
        language: 'he',
        trialEndsAt: '2099-06-01',
        quote: { ...billing.quote, students: 60, monthlyAgorot: 3000, annualAgorot: 6900 },
      },
    })
  );
  await page.goto('/?billing=1');
  const dialog = page.getByRole('dialog', { name: 'המנוי שלי' });
  await expect(dialog).toHaveAttribute('dir', 'rtl');
  await expect(dialog.getByText('60 תלמידים מאושרים בכיתות שלך')).toBeVisible();
  await expect(dialog.getByText(/תקרה שנתית לכל הכיתות יחד/)).toHaveText(/69/);
  await expect(dialog.getByText(/אפשר לבחור ולשלם כשהניסיון/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'המשך לתשלום' })).toHaveCount(0);
});
test('a teacher can stop renewal and keep the date already paid through', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  let canceled = false;
  await page.route('**/api/teacher/billing', (route) =>
    route.fulfill({
      json: {
        ...billing,
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
