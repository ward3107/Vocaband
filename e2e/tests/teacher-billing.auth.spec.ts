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
  subscription: null,
  emailEnabled: false,
  language: 'en',
  checkoutEnabled: true,
  quote: {
    students: 30, staff: null, covered: false, until: null, capacity: null,
    schoolId: null, schoolName: null, trialEndsAt: '2000-06-01', blocks: 0, entitlement: { tier: 'free' },
    offers: [
      { code: 'teacher_annual', tier: 'teacher', months: 12, seatLimit: 60, staffLimit: null, amount: 9900, fullAmount: 9900, available: true, upgrade: false, credit: 0 },
      { code: 'pro_annual', tier: 'pro', months: 12, seatLimit: 150, staffLimit: null, amount: 16900, fullAmount: 16900, available: true, upgrade: false, credit: 0 },
      { code: 'teacher_monthly', tier: 'teacher', months: 1, seatLimit: 60, staffLimit: null, amount: 1200, fullAmount: 1200, available: true, upgrade: false, credit: 0 },
      { code: 'pro_monthly', tier: 'pro', months: 1, seatLimit: 150, staffLimit: null, amount: 1900, fullAmount: 1900, available: true, upgrade: false, credit: 0 },
    ],
  },
};
test('teacher can choose the annual Pro plan and add 50 places', async ({ teacherPage: page }) => {
  await prepare(page);
  await page.route('**/api/teacher/billing?extra=*', (route) => {
    const extra = Number(new URL(route.request().url()).searchParams.get('extra'));
    return route.fulfill({
      json: { ...billing, quote: {
        ...billing.quote, blocks: extra, offers: billing.quote.offers.map((offer) =>
          offer.code === 'pro_annual' ? { ...offer, seatLimit: 150 + 50*extra, amount: 16900 + 4900*extra, fullAmount: 16900 + 4900*extra } : offer
        ),
      }},
    });
  });
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
  const pro = dialog.locator('section').filter({ has: page.getByRole('heading', { name: 'Teacher Pro', exact: true }) });
  await expect(dialog.getByText('30 students')).toBeVisible();
  await expect(pro.locator('strong')).toHaveText(/169/);
  await pro.getByRole('button', { name: /Add 50 places/ }).click();
  await expect(pro.locator('strong')).toHaveText(/218/);
  await expect(pro.getByText('200 students')).toBeVisible();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Save preferences' }).click();
  await expect(dialog.getByText('Preferences saved.')).toBeVisible();
  expect(preference).toEqual({ enabled: true, language: 'en' });
  await pro.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page).toHaveURL(/test-order/);
  expect(offer).toEqual({ offer: 'pro_annual', students: 30, amount: 21800, extra: 1 });
});

test('an active trial displays the prices in Hebrew before checkout opens', async ({ teacherPage: page }) => {
  await prepare(page);
  await page.route('**/api/teacher/billing?extra=*', (route) =>
    route.fulfill({ json: {
      ...billing, language: 'he', quote: {
        ...billing.quote, trialEndsAt: '2099-06-01', offers: billing.quote.offers.map((o) => ({...o, available: false})),
      },
    } })
  );
  await page.goto('/?billing=1');
  const dialog = page.getByRole('dialog', { name: 'המנוי שלי' });
  await expect(dialog).toHaveAttribute('dir', 'rtl');
  await expect(dialog.getByText(/אפשר לבחור ולשלם כשהניסיון/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'המשך לתשלום' })).toHaveCount(0);
});

test('a teacher can stop renewal and keep the date already paid through', async ({ teacherPage: page }) => {
  await prepare(page);
  let canceled = false;
  await page.route('**/api/teacher/billing?extra=*', (route) =>
    route.fulfill({
      json: {
        ...billing,
        quote: { ...billing.quote, until: '2099-09-01' },
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

test('a school manager sees the credited amount before paying', async ({ managerPage: page }) => {
  await prepare(page);
  await page.route('**/api/teacher/billing?extra=*', (route) => route.fulfill({json: {
    ...billing, quote: {
      ...billing.quote, schoolId: 'school-fixture', schoolName: 'Test School', staff: 2, students: 60,
      offers: [{
        code: 'school_annual', tier: 'school', months: 12, staffLimit: 6, seatLimit: 400,
        amount: 190000, fullAmount: 249000, credit: 59000, available: true, upgrade: false,
      }],
    },
  }}));
  await page.goto('/manager?billing=1');
  const dialog = page.getByRole('dialog', { name: 'School subscription' });
  await expect(dialog.getByText(/Pilot credit/)).toHaveText(/590.*1,900/);
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
});

test('a school manager sends one list to two classes and can download the report', async ({ managerPage: page }) => {
  await prepare(page);
  let submitted: unknown;
  const resource = { id: 'shared-list', title: 'Weather', word_count: 12, grade_level: 7 };
  const classes = [{ id: '7a', name: 'Grade 7A', teacher: 'Teacher A' }, { id: '7b', name: 'Grade 7B', teacher: 'Teacher B' }];
  await page.route('**/rest/v1/rpc/school_workspace', (route) => route.fulfill({json: {
    manager: true, resources: [resource], classes,
    batches: submitted ? [{ id: 'report-1', title: 'Weather', created_at: '2026-11-18T08:00:00Z' }] : [],
  }}));
  await page.route('**/rest/v1/rpc/assign_school_words', (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({json: 'report-1'});
  });
  await page.route('**/rest/v1/rpc/school_assignment_report', (route) => route.fulfill({json: {
    title: 'Weather', classes: [{ ...classes[0], completed: 22, enrolled: 27 }, { ...classes[1], completed: 18, enrolled: 24 }],
  }}));
  await page.goto('/');
  await page.getByRole('button', { name: 'Team library' }).click();
  const dialog = page.getByRole('dialog', { name: 'English team library' });
  await dialog.getByLabel('Choose a shared list').selectOption(resource.id);
  await dialog.getByRole('button', { name: 'Select all classes' }).click();
  await dialog.getByRole('button', { name: 'Assign practice' }).click();
  await expect(dialog.getByText(/sent to the selected classes/)).toBeVisible();
  expect(submitted).toMatchObject({ p_resource: resource.id, p_classes: ['7a', '7b'], p_title: 'Weather' });
  await dialog.getByLabel('Choose an assignment').selectOption('report-1');
  await expect(dialog.getByRole('row', { name: /Grade 7A/ })).toHaveText(/27.*22/);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toBe('vocaband-team-report.csv');
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
