import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { mockSupabase, presetLocalStorage } from '../fixtures/supabase-mock';
import { waitForAppLoad } from '../helpers/navigation';
import { PRIVACY_POLICY_VERSION, STUDENT_VISIBILITY_VERSION } from '../../src/config/privacy-config';

async function prepare(page: Page) {
  page.setDefaultTimeout(15_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ privacy, visibility }) => {
    for (const key of ['vocaband_onboarding_done', 'vocaband_student_onboarding_done', 'vocaband_welcome_seen', 'vocaband_privacy_reminder_dismissed']) localStorage.setItem(key, '1');
    for (const guide of ['library-intro', 'classroom', 'create-assignment', 'approvals', 'worksheet', 'class-show', 'quick-play-monitor']) localStorage.setItem(`vocaband_guide_seen_${guide}`, '1');
    localStorage.setItem('vocaband_consent_version', privacy);
    localStorage.setItem('vocaband_student_visibility_version', visibility);
  }, { privacy: PRIVACY_POLICY_VERSION, visibility: STUDENT_VISIBILITY_VERSION });
}

async function mockClassEntryChannel(page: Page) {
  // Keep the UI fixture independent of the deliberately unreachable test host.
  await page.route('https://test-project.supabase.co/rest/v1/class_live_sessions**', route => route.fulfill({ json: [] }));
  await page.routeWebSocket('wss://test-project.supabase.co/realtime/v1/websocket**', socket => {
    socket.onMessage(raw => {
      if (typeof raw !== 'string') return;
      const [joinRef, ref, topic, event, payload] = JSON.parse(raw);
      if (event !== 'phx_join' && event !== 'heartbeat') return;
      const response = event === 'phx_join'
        ? { postgres_changes: (payload.config?.postgres_changes ?? []).map((filter: Record<string, unknown>, index: number) => ({ ...filter, id: index + 1 })) }
        : {};
      socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response }]));
    });
  });
}

async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForAppLoad(page);
  await page.locator('[data-vocaband-view]').waitFor();
  if (url === '/') {
    await expect(page.locator('[data-vocaband-view]')).toHaveAttribute('data-vocaband-view', /^(student|teacher)-dashboard$/);
    if (await page.locator('[data-vocaband-view]').getAttribute('data-vocaband-view') === 'student-dashboard') {
      // The fixture has an unclaimed milestone. Wait for the async reward
      // state before dismissing it, rather than racing the dashboard mount.
      const close = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true });
      await close.waitFor({ state: 'visible' });
      await close.click();
      await expect(close).toBeHidden();
    }
  }
}

async function capture(page: Page, info: TestInfo, name: string) {
  // A route flag updates before its lazy module arrives. Capture the screen,
  // not the interim Suspense spinner.
  await page.locator('[data-vocaband-view]').getByRole('heading').first().waitFor({ state: 'visible' });
  await expect(page.getByText(/^Loading\b.*(?:…|\.{3})$/)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join('e2e/test-results/design', info.project.name.replaceAll(' ', '-'), `${name}.png`), fullPage: true, animations: 'disabled' });
  // Catch layouts that look fine on desktop but make the whole phone pan.
  const width = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(width.content, `${name} has horizontal overflow`).toBeLessThanOrEqual(width.viewport + 1);
}

test.beforeEach(async ({}, info) => {
  await mkdir(path.join('e2e/test-results/design', info.project.name.replaceAll(' ', '-')), { recursive: true });
});

test('teacher workspace and creation screens share the new frame', async ({ teacherPage: page }, info) => {
  test.setTimeout(180_000);
  await mockClassEntryChannel(page);
  await page.route('https://test-project.supabase.co/rest/v1/rpc/create_quick_play_session', route => route.fulfill({ json: { id: 'design-session', session_code: 'DESIGN01' } }));
  await prepare(page);
  await open(page, '/');
  await expect(page.getByRole('heading', { name: /Ready for a great lesson/ })).toBeVisible();
  await capture(page, info, 'teacher-home');
  await page.getByRole('button', { name: 'Create a class', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture(page, info, 'teacher-create-class');
  await page.keyboard.press('Escape');

  for (const [tour, name, view] of [['classroom', 'teacher-classroom', 'classroom'], ['quick-play', 'teacher-quick-play', 'quick-play-setup'], ['category-race', 'teacher-race', 'category-race-host'], ['speed-round', 'teacher-speed', 'speed-round-host'], ['word-hunt-arena', 'teacher-arena', 'word-hunt-arena-host']] as const) {
    await open(page, '/');
    await page.locator(`[data-tour="${tour}"]`).first().click();
    await expect(page.locator('[data-vocaband-view]')).toHaveAttribute('data-vocaband-view', view);
    await waitForAppLoad(page);
    if (view.endsWith('-host')) await expect(page.getByRole('button', { name: 'Open for this class', exact: true })).toBeVisible();
    await capture(page, info, name);
  }
  for (const [url, name] of [['/vocabulary-library', 'teacher-library'], ['/create-assignment?classId=class-001', 'teacher-assignment'], ['/class-show?assignmentId=assignment-001', 'teacher-class-show'], ['/worksheet?assignmentId=assignment-001', 'teacher-worksheet'], ['/vocabagrut', 'teacher-vocabagrut']] as const) {
    await open(page, url);
    await capture(page, info, name);
  }
});

test('teacher can open class entry with clear Hebrew instructions', async ({ teacherPage: page }, info) => {
  await mockClassEntryChannel(page);
  await page.route('https://test-project.supabase.co/rest/v1/rpc/create_quick_play_session', route => route.fulfill({ json: { id: 'design-live-session', session_code: 'ABCD23' } }));
  await page.route('https://test-project.supabase.co/rest/v1/rpc/set_class_live_session', route => route.fulfill({ json: null }));
  await prepare(page);
  await open(page, '/');
  await page.getByRole('button', { name: 'Change language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'עברית' }).click();
  await page.locator('[data-tour="category-race"]').first().click();
  await page.getByRole('button', { name: 'פתיחה לכיתה הזו', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'המשחק פתוח לכיתה' })).toBeVisible();
  await expect(page.getByText(/היכנסו לכיתה שלכם ב־Vocaband/)).toBeVisible();
  await capture(page, info, 'teacher-live-entry-he');
});

test('PIN student discovers a live lesson without teacher class state', async ({ studentPage: page }, info) => {
  await mockClassEntryChannel(page);
  await page.route('https://test-project.supabase.co/rest/v1/rpc/get_my_live_class_session', route => route.fulfill({ json: [{
    class_id: 'class-001', class_name: 'Test English Class', session_id: 'design-live-session',
    session_code: 'ABCD23', allowed_modes: ['classic'], expires_at: new Date(Date.now() + 3600000).toISOString(),
  }] }));
  await prepare(page);
  await open(page, '/');
  await page.getByRole('button', { name: 'Change language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'עברית' }).click();
  await expect(page.getByRole('button', { name: 'הצטרפות לשיעור', exact: true })).toBeVisible();
  await expect(page.getByText('נשתמש אוטומטית בשם ובדמות שלך מהכיתה.')).toBeVisible();
  await capture(page, info, 'student-live-entry-he');
});

test('student destinations and card geometry work on desktop and phone', async ({ studentPage: page }, info) => {
  test.setTimeout(120_000);
  await prepare(page);
  await open(page, '/');
  await expect(page.getByRole('heading', { name: 'Your learning space' })).toBeVisible();
  await capture(page, info, 'student-home');
  const cards = page.locator('[aria-labelledby="student-space-title"] button');
  for (const card of await cards.all()) {
    const bounds = await card.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Assignments', exact: true })).toBeVisible();
  await capture(page, info, 'student-tasks');
  await page.getByRole('dialog', { name: 'Assignments', exact: true }).getByRole('button').filter({ hasText: 'Week 1 Vocabulary' }).click();
  await expect(page.getByRole('heading', { name: /choose your mode/i })).toBeVisible();
  await capture(page, info, 'student-game-picker');
  await page.getByRole('button', { name: /^Classic Mode/ }).click();
  await capture(page, info, 'student-game-instructions');

  for (const name of ['Practice', 'Daily'] as const) {
    await open(page, '/');
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await capture(page, info, `student-${name.toLowerCase()}`);
  }
  for (const [url, name] of [['/shop', 'student-shop'], ['/leaderboard', 'student-ranks'], ['/privacy-settings', 'student-settings']] as const) {
    await open(page, url);
    await capture(page, info, name);
  }
});

test('Hebrew and Arabic keep the student layout within the viewport', async ({ studentPage: page }, info) => {
  await prepare(page);
  await open(page, '/');
  await expect(page.getByRole('heading', { name: 'Your learning space' })).toBeVisible();
  await page.getByRole('button', { name: 'Change language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'עברית' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await capture(page, info, 'student-home-he');
  await page.getByRole('button', { name: 'החלף שפה', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'العربية' }).click();
  await expect(page.getByRole('heading', { name: 'مساحة تعلّمك' })).toBeVisible();
  await capture(page, info, 'student-home-ar');
});

test('legacy iOS controls and shared cards use one palette in light and dark', async ({ studentPage: page }, info) => {
  await prepare(page);
  await open(page, '/privacy-settings');
  await expect(page.getByRole('heading', { name: 'Privacy & Data Settings' })).toBeVisible();
  for (const dark of [false, true]) {
    // Exercise the exact root flag used by an equipped student dark theme.
    await page.evaluate(value => { if (value) document.documentElement.dataset.themeDark = 'true'; else delete document.documentElement.dataset.themeDark; }, dark);
    const palette = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const token = (key: string) => style.getPropertyValue(key).trim();
      return { surface: token('--vb-surface'), ios: token('--ios-grouped-card'), text: token('--vb-text-primary'), iosText: token('--ios-label') };
    });
    expect(palette.ios).toBe(palette.surface);
    expect(palette.iosText).toBe(palette.text);
    await capture(page, info, `student-settings-${dark ? 'dark' : 'light'}`);
  }
});


test('role entry screens stay readable without horizontal scrolling', async ({ page }, info) => {
  await presetLocalStorage(page);
  await mockSupabase(page, 'public');
  await prepare(page);
  for (const role of ['teacher', 'student']) {
    await open(page, `/${role}`);
    await capture(page, info, `${role}-login`);
  }
  await page.getByRole('button', { name: 'עברית', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'קוד הכיתה או הקישור מהמורה', exact: true })).toBeVisible();
  await capture(page, info, 'student-login-he');
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'رمز الصف أو الرابط من معلمك', exact: true })).toBeVisible();
  await capture(page, info, 'student-login-ar');
});
