import type { Page } from '@playwright/test';
import type { DraftValues } from '../../src/hooks/useAssignmentDraft';
import { test, expect } from '../fixtures/auth.fixture';
import {
  TEST_CLASS,
  TEST_ASSIGNMENT,
  TEST_SUPABASE_URL,
  FAKE_TEACHER_SESSION,
} from '../fixtures/test-data';
import { mockSupabase, presetLocalStorage } from '../fixtures/supabase-mock';
import {
  PRIVACY_POLICY_VERSION,
  STUDENT_VISIBILITY_VERSION,
} from '../../src/config/privacy-config';

async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ([privacy, visibility]) => {
      for (const key of [
        'vocaband_onboarding_done',
        'vocaband_student_onboarding_done',
        'vocaband_welcome_seen',
        'vocaband_privacy_reminder_dismissed',
      ])
        localStorage.setItem(key, '1');
      for (const guide of ['classroom', 'create-assignment', 'class-show', 'library-intro'])
        localStorage.setItem('vocaband_guide_seen_' + guide, '1');
      localStorage.setItem('vocaband_consent_version', privacy);
      localStorage.setItem('vocaband_student_visibility_version', visibility);
    },
    [PRIVACY_POLICY_VERSION, STUDENT_VISIBILITY_VERSION]
  );
}
function draftServer() {
  const rows = new Map<string, { revision: string; payload: DraftValues | null }>();
  async function connect(page: Page) {
    await page.route(TEST_SUPABASE_URL + '/rest/v1/assignment_drafts**', (r) => {
      const params = new URL(r.request().url()).searchParams;
      const row = rows.get(params.get('slot')?.replace(/^eq\./, '') ?? '');
      return r.fulfill({ json: row ? [row] : [] });
    });
    await page.route(TEST_SUPABASE_URL + '/rest/v1/rpc/save_assignment_draft', (r) => {
      const change = r.request().postDataJSON();
      const row = rows.get(change.p_slot);
      const accepted = (row?.revision ?? null) === change.p_base;
      if (accepted)
        rows.set(change.p_slot, { revision: change.p_revision, payload: change.p_payload });
      return r.fulfill({ json: accepted });
    });
  }
  return { rows, connect };
}
async function openFourWordDraft(page: Page, server: ReturnType<typeof draftServer>) {
  await prepare(page);
  await server.connect(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'New activity', exact: true }).first().click();
  await page.getByPlaceholder('apple, banana, orange, grape').fill('apple, banana, orange, grape');
  await page.getByRole('button', { name: 'Analyze & Add Words', exact: true }).click();
  await page.getByRole('button', { name: /Continue to Step 2/i }).click();
  await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
  await page.locator('#assignment-title').fill('Class 7 unit two');
  await page.locator('#assignment-instructions').fill('Read each word aloud once.');
  await expect
    .poll(() => server.rows.get('new')?.payload?.instructions)
    .toBe('Read each word aloud once.');
}
test('a four-word draft resumes at the same step after refresh and on another device', async ({
  teacherPage: page,
  browser,
  baseURL,
}) => {
  const server = draftServer();
  await openFourWordDraft(page, server);
  expect(server.rows.get('new')?.payload?.step).toBe(2);
  expect(server.rows.get('new')?.payload?.words).toHaveLength(4);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
  const other = await browser.newContext({ baseURL });
  try {
    const school = await other.newPage();
    await presetLocalStorage(school);
    await prepare(school);
    await school.addInitScript(
      (s) => localStorage.setItem('sb-test-project-auth-token', JSON.stringify(s)),
      FAKE_TEACHER_SESSION
    );
    await mockSupabase(school, 'teacher');
    await server.connect(school);
    await school.goto('/');
    await school.getByRole('button', { name: 'New activity', exact: true }).first().click();
    await expect(school.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
    await expect(school.locator('#assignment-title')).toHaveValue('Class 7 unit two');
    await expect(school.locator('#assignment-instructions')).toHaveValue(
      'Read each word aloud once.'
    );
    await school.getByRole('button', { name: /Back/ }).last().click();
    await expect(school.getByText('4 words selected', { exact: false }).first()).toBeVisible();
  } finally {
    await other.close();
  }
});
test('returning from Class Show keeps the original named draft and its step', async ({
  teacherPage: page,
}) => {
  const server = draftServer();
  await openFourWordDraft(page, server);
  await page.getByRole('button', { name: 'Class Show', exact: true }).click();
  await page.getByRole('button', { name: 'Assignment', exact: true, pressed: false }).click();
  await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
  await expect(page.locator('#assignment-title')).toHaveValue('Class 7 unit two');
  await expect(page.locator('#assignment-instructions')).toHaveValue('Read each word aloud once.');
  expect(new URL(page.url()).searchParams.get('draft')).toBeNull();
  await page.getByRole('button', { name: /Back/ }).last().click();
  await expect(page.getByText('4 words selected', { exact: false }).first()).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Discard draft' }).click();
  await expect.poll(() => server.rows.get('new')?.payload).toBeNull();
  expect([...server.rows.keys()]).toEqual(['new']);
});
test('accepting a draft deletion from another device empties the editor without recreating the draft', async ({
  teacherPage: page,
}) => {
  const server = draftServer();
  await openFourWordDraft(page, server);
  server.rows.set('new', { revision: 'remote-deletion', payload: null });
  await page.locator('#assignment-title').fill('Unsent local edit');
  await page.getByRole('button', { name: 'Open saved version' }).click();
  await expect(page.getByPlaceholder('apple, banana, orange, grape')).toHaveValue('');
  await expect(page.getByText('4 words selected', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Discard draft' })).toHaveCount(0);
  const checked = page.waitForResponse('**/rest/v1/assignment_drafts**');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await checked;
  await expect(page.getByRole('button', { name: 'Discard draft' })).toHaveCount(0);
  expect(server.rows.get('new')).toEqual({ revision: 'remote-deletion', payload: null });
});
test('teacher previews only eligible recipients for real in-app follow-ups', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  const members = [
    { id: 'p1', name: 'Alice', plays: 1, accuracy: 50, missed: [3] },
    { id: 'p2', name: 'Bob', plays: 0, accuracy: null, missed: [] },
    { id: 'p3', name: 'Charlie', plays: 0, accuracy: null, missed: [] },
  ];
  const posted: { kind: string; ids: string[] }[] = [];
  await page.route('**/rpc/teacher_assignment_report', (r) => {
    const params = r.request().postDataJSON();
    expect(params.p_class_id).toBe(TEST_CLASS.id);
    const row = {
      assignment_id: TEST_ASSIGNMENT.id,
      title: TEST_ASSIGNMENT.title,
      expected: 3,
      participated: 1,
      attempts: 1,
      students: null,
    };
    return r.fulfill({
      json: params.p_assignment_id
        ? [
            {
              ...row,
              students: members.map((m) => ({
                ...m,
                reminder_sent: posted.some((p) => p.kind === 'reminder' && p.ids.includes(m.id)),
                practice_sent: posted.some((p) => p.kind === 'practice' && p.ids.includes(m.id)),
              })),
            },
          ]
        : [
            row,
            {
              ...row,
              assignment_id: 'new-work',
              title: 'Untouched assignment',
              participated: 0,
              attempts: 0,
            },
          ],
    });
  });
  await page.route('**/rpc/send_assignment_followup', (r) => {
    const body = r.request().postDataJSON();
    posted.push({ kind: body.p_kind, ids: body.p_profile_ids });
    return r.fulfill({ json: body.p_profile_ids.length });
  });
  await page.goto('/');
  await page.locator('[data-tour="classroom"]').first().click();
  await page.getByRole('button', { name: 'Assignments', exact: true }).click();
  await expect(page.getByRole('button', { name: /Untouched assignment.*0 of 3/ })).toBeVisible();
  await page.getByRole('button', { name: /Week 1 Vocabulary.*1 of 3/ }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByText('1 of 3 participated')).toBeVisible();
  await drawer.getByRole('button', { name: 'Remind students' }).click();
  await expect(drawer.getByText('2 recipients in Test English Class')).toBeVisible();
  expect(posted).toHaveLength(0);
  await drawer.getByRole('button', { name: 'Send to students' }).click();
  await expect(drawer.getByRole('status')).toContainText('2 new');
  await drawer.getByRole('button', { name: 'Prepare practice' }).click();
  await drawer.getByRole('button', { name: 'Send to students' }).click();
  await expect(drawer.getByRole('status')).toContainText('1 new');
  expect(posted).toEqual([
    { kind: 'reminder', ids: ['p2', 'p3'] },
    { kind: 'practice', ids: ['p1'] },
  ]);
});
test('student completes just the two assigned practice words with a separate receipt', async ({
  studentPage: page,
}) => {
  await prepare(page);
  const receipts: unknown[] = [];
  let gradeWrites = 0;
  await page.route('**/rpc/complete_assignment_practice', (r) => {
    receipts.push(r.request().postDataJSON());
    return r.fulfill({ json: true });
  });
  await page.route('**/rpc/save_student_progress', (r) => {
    gradeWrites++;
    return r.fulfill({ json: 'progress' });
  });
  await page.route('**/rpc/my_assignment_followups', (r) =>
    r.fulfill({
      json: receipts.length
        ? []
        : [
            {
              assignment_id: TEST_ASSIGNMENT.id,
              kind: 'practice',
              profile_id: 'p1',
              word_ids: [3, 4],
            },
          ],
    })
  );
  await page.goto('/');
  const reward = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true });
  await reward.waitFor({ state: 'visible' });
  await reward.click();
  await page
    .getByRole('button', { name: /Practice from your teacher/ })
    .first()
    .click();
  await page
    .getByRole('dialog', { name: 'Assignments' })
    .getByRole('button', { name: /Practice these words/ })
    .click();
  await page.getByRole('button', { name: /^Flashcards -/i }).click();
  await expect(page.getByRole('status').filter({ hasText: /question 1 of 2/i })).toBeVisible();
  const gotIt = page.getByRole('button', { name: /Got It/i });
  await gotIt.click();
  await expect(page.getByRole('status').filter({ hasText: /question 2 of 2/i })).toBeVisible();
  await gotIt.click();
  await expect
    .poll(() => receipts)
    .toEqual([{ p_assignment_id: TEST_ASSIGNMENT.id, p_profile_id: 'p1' }]);
  expect(gradeWrites).toBe(0);
});

test('copy publishes only to the chosen class and retains the draft after a failed save', async ({
  teacherPage: page,
}) => {
  const destination = {
    ...TEST_CLASS,
    id: 'class-002',
    code: 'SECOND',
    name: 'Second English Class',
  };
  await prepare(page);
  await page.route('**/rest/v1/classes**', (r) => r.fulfill({ json: [TEST_CLASS, destination] }));
  let canPublish = false;
  const writes: { class_id: string; word_ids: number[]; deadline: string | null }[] = [];
  let originalEdits = 0;
  await page.route('**/rest/v1/assignments**', (r) => {
    const method = r.request().method();
    if (method === 'GET') return r.fulfill({ json: [TEST_ASSIGNMENT] });
    if (method !== 'POST') {
      originalEdits++;
      return r.fulfill({ json: {} });
    }
    writes.push(r.request().postDataJSON());
    return canPublish
      ? r.fulfill({ status: 201, json: { id: 'copied-assignment' } })
      : r.fulfill({ status: 400, json: { code: 'TEST', message: 'Simulated save failure' } });
  });
  const drafts: { p_class_id: string; p_payload: { step: number } | null }[] = [];
  await page.route('**/rpc/save_assignment_draft', (r) => {
    drafts.push(r.request().postDataJSON());
    return r.fulfill({ json: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '1', exact: true, expanded: false }).first().click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose the destination class' })
    .getByRole('button', { name: destination.name })
    .click();
  await page.getByRole('button', { name: /Continue to Step 2/i }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect.poll(() => drafts.at(-1)?.p_payload?.step).toBe(3);
  const publish = page.getByRole('button', { name: 'Assign to Class', exact: true });
  await publish.click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByRole('alert')).toContainText('Could not publish the assignment');
  expect(drafts.at(-1)?.p_payload?.step).toBe(3);
  canPublish = true;
  await publish.click();
  await expect.poll(() => drafts.at(-1)?.p_payload).toBeNull();
  expect(drafts.every((d) => d.p_class_id === destination.id)).toBe(true);
  expect(originalEdits).toBe(0);
  expect(writes).toHaveLength(2);
  expect(writes[1]).toMatchObject({
    class_id: destination.id,
    deadline: null,
    title: TEST_ASSIGNMENT.title + ' (copy)',
  });
  expect([...writes[1].word_ids].sort((a, b) => a - b)).toEqual(TEST_ASSIGNMENT.word_ids);
});

test('a template from another device restores the teacher’s text in the chosen class', async ({
  teacherPage: page,
}) => {
  await prepare(page);
  const destination = {
    ...TEST_CLASS,
    id: 'class-002',
    code: 'SECOND',
    name: 'Second English Class',
  };
  const template = {
    id: 'unit-two',
    title: 'Unit two revision',
    mode: 'assignment',
    wordIds: [3, 4],
    modes: ['flashcards'],
    instructions: 'Read aloud, then check the meaning.',
    timesUsed: 0,
    pinned: false,
    createdAt: 1,
    lastUsedAt: null,
  };
  await page.route('**/rest/v1/classes**', (r) => r.fulfill({ json: [TEST_CLASS, destination] }));
  await page.route('**/rpc/sync_activity_templates', (r) => r.fulfill({ json: [template] }));
  const drafts = draftServer();
  drafts.rows.set('template-' + template.id, { revision: 'previously-discarded', payload: null });
  await drafts.connect(page);
  await page.goto('/');
  await expect(page.getByText(template.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose the destination class' })
    .getByRole('button', { name: destination.name })
    .click();
  await expect(page.getByText('2 words selected', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: /Continue to Step 2/ }).click();
  await expect(page.locator('#assignment-title')).toHaveValue(template.title);
  await expect(page.locator('#assignment-instructions')).toHaveValue(template.instructions);
  expect(new URL(page.url()).searchParams.get('classId')).toBe(destination.id);
});
