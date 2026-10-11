import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';
import { PRIVACY_POLICY_VERSION, STUDENT_VISIBILITY_VERSION } from '../../src/config/privacy-config';

async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ privacy, visibility }) => {
    for (const key of ['vocaband_onboarding_done', 'vocaband_student_onboarding_done', 'vocaband_welcome_seen', 'vocaband_privacy_reminder_dismissed']) localStorage.setItem(key, '1');
    localStorage.setItem('vocaband_consent_version', privacy);
    localStorage.setItem('vocaband_student_visibility_version', visibility);
  }, { privacy: PRIVACY_POLICY_VERSION, visibility: STUDENT_VISIBILITY_VERSION });
}

async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForAppLoad(page);
  await page.locator('[data-vocaband-view]').waitFor();
  // A seeded student's newly available companion milestone can open a
  // nonessential dialog. Dismiss that dialog through its real close control.
  for (let i = 0; i < 3; i++) {
    const close = page.getByRole('button', { name: /^Close$|^Skip onboarding$|^Got it$/i }).first();
    if (!await close.isVisible().catch(() => false)) break;
    await close.click();
  }
}

async function capture(page: Page, info: TestInfo, name: string) {
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
  await prepare(page);
  await open(page, '/');
  await expect(page.getByRole('heading', { name: /Ready for a great lesson/ })).toBeVisible();
  await capture(page, info, 'teacher-home');
  await page.getByRole('button', { name: 'Create a class', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture(page, info, 'teacher-create-class');
  await page.keyboard.press('Escape');

  for (const [tour, name] of [['classroom', 'teacher-classroom'], ['quick-play', 'teacher-quick-play'], ['category-race', 'teacher-race'], ['speed-round', 'teacher-speed'], ['word-hunt-arena', 'teacher-arena']] as const) {
    await open(page, '/');
    await page.locator(`[data-tour="${tour}"]`).first().click();
    await expect(page.locator('[data-vocaband-view]')).not.toHaveAttribute('data-vocaband-view', 'teacher-dashboard');
    await waitForAppLoad(page);
    await capture(page, info, name);
  }
  for (const [url, name] of [['/vocabulary-library', 'teacher-library'], ['/create-assignment?classId=class-001', 'teacher-assignment'], ['/class-show?assignmentId=assignment-001', 'teacher-class-show'], ['/worksheet?assignmentId=assignment-001', 'teacher-worksheet'], ['/vocabagrut', 'teacher-vocabagrut']] as const) {
    await open(page, url);
    await capture(page, info, name);
  }
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
