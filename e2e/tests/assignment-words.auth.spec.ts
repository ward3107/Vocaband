/**
 * The test that would have caught the incident.
 *
 * Teachers reported that students opening an assignment were sometimes
 * served a short list of generic words they were never assigned. The
 * cause was a chain of defects that each left the resolved word list
 * empty, at which point the game substituted GAME_FALLBACK_WORDS
 * (`SET_2_WORDS.slice(0, 12)`) and scored the round against the
 * teacher's assignment anyway.
 *
 * Every layer of that chain now has unit coverage, but nothing asserted
 * the property that actually matters end to end: THE STUDENT SEES THE
 * TEACHER'S WORDS. The existing student-flow spec stops at "the
 * assignment appears in the Tasks sheet" and never opens it, so a
 * regression anywhere past that point stayed invisible.
 *
 * TEST_ASSIGNMENT is the curriculum shape — `words: null`, list carried
 * in `word_ids` — which is exactly the shape the broken paths mishandled.
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';
import { TEST_ASSIGNMENT } from '../fixtures/test-data';


/**
 * Auto-opening modals (consent gate, pet-milestone claim, onboarding)
 * stack on a bg-black/40 backdrop and intercept clicks. Same shape as
 * student-flow.auth.spec.ts; kept local so this file is self-contained.
 */
async function dismissModals(page: import('@playwright/test').Page) {
  const backdrop = page.locator('div.fixed.inset-0[class*="bg-black/"]');
  const names = [/^skip onboarding$/i, /^close$/i, /got it|done|let.?s go/i];
  for (let i = 0; i < 8; i++) {
    if ((await backdrop.count()) === 0) return;
    const consent = page.getByRole('checkbox').and(page.locator(':not(:checked)'));
    if (await consent.count()) {
      await consent.first().check({ force: true, timeout: 1500 }).catch(() => {});
      const cont = page.getByRole('button', { name: /continue playing/i }).first();
      if (await cont.count()) {
        await cont.click({ force: true, timeout: 1500 }).catch(() => {});
        await backdrop.first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
        continue;
      }
    }
    let clicked = false;
    for (const name of names) {
      const btn = page.getByRole('button', { name }).first();
      if (await btn.count()) {
        await btn.click({ force: true, timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(300);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(250);
    }
  }
}

/** The words TEST_ASSIGNMENT.word_ids resolve to in ALL_WORDS. */
const ASSIGNED_WORDS = [
  'in a hurry',
  'worth a fortune',
  'worth it',
  'get along',
  'skiing',
];

/**
 * The head of GAME_FALLBACK_WORDS (`SET_2_WORDS.slice(0, 12)`) — the
 * generic sample the game substitutes when the word list resolves empty.
 * None of these belong to TEST_ASSIGNMENT, so seeing any of them inside
 * this assignment's round is the bug reproducing.
 */
const FALLBACK_WORDS = [
  'a variety of sth/sb',
  'abroad',
  'admire',
  'afterwards/afterward',
  'all the best',
];

async function openSeededAssignment(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForAppLoad(page);
  await dismissModals(page);

  const tasksBtn = page.getByLabel('Tasks').first();
  await tasksBtn.waitFor({ state: 'attached', timeout: 15_000 });
  await dismissModals(page);
  await tasksBtn.click({ force: true });

  // The home NextUpCard also names this assignment. Only interact with
  // the open sheet: a forced click on the background title hits its overlay.
  const assignments = page.getByRole('dialog', { name: 'Assignments', exact: true });
  await expect(assignments).toBeVisible({ timeout: 15_000 });
  const card = assignments.getByRole('button').filter({ hasText: TEST_ASSIGNMENT.title });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();

  // One-tap adventure map.
  await expect(
    page.getByRole('heading', { name: /your word adventure/i }),
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * Launch a mode from the adventure map and land in the round.
 *
 * The mode tiles are buttons whose accessible name carries a status
 * suffix ("Classic Mode — to play", "Flashcards — recommended next"), and
 * the visible label sits in a sibling div — so a text locator matches the
 * wrapper, not the control, and the click goes nowhere. Match the ROLE.
 * The student flow launches the round with one tap.
 */
async function startMode(page: import('@playwright/test').Page, name: RegExp) {
  await page.getByRole('button', { name }).first().click({ force: true });

  // The mode tile should leave the map immediately; coaching appears in-game.
  await expect(page.getByRole('heading', { name: /your word adventure/i }))
    .toHaveCount(0, { timeout: 15_000 });
}

test.describe('assignment word delivery', () => {
  test('the adventure map launches with the teacher\'s own words, not a sample', async ({
    studentPage: page,
  }) => {
    await openSeededAssignment(page);

    // Flashcards is in TEST_ASSIGNMENT.allowed_modes and shows the word
    // itself immediately, with no answer options to disambiguate.
    await startMode(page, /flashcards/i);

    // At least one of the teacher's words must be on screen.
    const body = page.locator('body');
    await expect(body).toContainText(
      new RegExp(ASSIGNED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i'),
      { timeout: 20_000 },
    );
  });

  test('no generic fallback word ever appears inside the assignment round', async ({
    studentPage: page,
  }) => {
    await openSeededAssignment(page);

    await startMode(page, /flashcards/i);

    // Let the round settle so a late word-list swap would still be caught.
    await page.waitForTimeout(1500);

    const text = (await page.locator('body').innerText()).toLowerCase();
    const leaked = FALLBACK_WORDS.filter(w => text.includes(w.toLowerCase()));
    expect(
      leaked,
      `GAME_FALLBACK_WORDS leaked into the assignment round: ${leaked.join(', ')}`,
    ).toEqual([]);
  });

  test('the round is sized to the assignment, not to the 12-word sample', async ({
    studentPage: page,
  }) => {
    await openSeededAssignment(page);

    await startMode(page, /classic mode/i);

    // The round renders "QUESTION 1 OF 5"; other modes use "1 / 5". Match
    // both, and ignore the map's "Round 1/3" replay counter and its
    // "0/4 modes" tally, which are different numbers entirely.
    await expect(page.getByRole('status').filter({ hasText: /question\s+\d+\s+of\s+\d+/i }))
      .toBeVisible({ timeout: 15_000 });
    const text = await page.locator('body').innerText();
    expect(text, 'still on the adventure map - the mode never launched')
      .not.toMatch(/your word adventure/i);
    await expect(page.getByRole('complementary', { name: 'How to play' }))
      .toBeVisible();

    const ofMatch = text.match(/question\s+\d+\s+of\s+(\d+)/i);
    const slashTotals = [...text.matchAll(/\b\d+\s*\/\s*(\d+)\b/g)]
      .map(m => Number(m[1]))
      .filter(n => n !== 3 && n !== 4);

    const totals = ofMatch ? [Number(ofMatch[1])] : slashTotals;
    expect(totals.length, `no round counter in:\n${text.slice(0, 800)}`).toBeGreaterThan(0);

    // The round is sized to the assignment — never to the 12-word sample.
    for (const total of totals) {
      expect(total).toBe(ASSIGNED_WORDS.length);
      expect(total).not.toBe(12);
    }
  });
});
