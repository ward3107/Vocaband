import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { mockSupabase, presetLocalStorage } from '../fixtures/supabase-mock';
import {
  PRIVACY_POLICY_VERSION,
  STUDENT_VISIBILITY_VERSION,
} from '../../src/config/privacy-config';
const windowId = '00000000-0000-4000-8000-000000000012';
const requestId = '00000000-0000-4000-8000-000000000013';
const studentId = '00000000-0000-4000-8000-000000000014';
async function prepare(page: Page) {
  await page.addInitScript(
    ([privacy, vis]) => {
      for (const k of [
        'onboarding_done',
        'student_onboarding_done',
        'welcome_seen',
        'privacy_reminder_dismissed',
        'guide_seen_classroom',
        'guide_seen_library-intro',
      ])
        localStorage.setItem('vocaband_' + k, '1');
      localStorage.setItem('vocaband_consent_version', privacy);
      localStorage.setItem('vocaband_student_visibility_version', vis);
    },
    [PRIVACY_POLICY_VERSION, STUDENT_VISIBILITY_VERSION]
  );
}
for (const kind of ['new', 'existing'] as const) {
  test(
    kind + ' student receives a PIN on their own phone through the shared classroom link',
    async ({ teacherPage, browser, baseURL }) => {
      await prepare(teacherPage);
      const phone = await browser.newPage({
        baseURL,
        viewport: teacherPage.viewportSize() ?? undefined,
      });
      try {
        await presetLocalStorage(phone);
        await mockSupabase(phone, 'public');
        await prepare(phone);
        let waiting = false,
          approved = false,
          consumed = false,
          device = '',
          opened = false;
        const name = kind === 'new' ? 'Mint Fox' : 'Blue Owl';
        const row = { id: requestId, display_name: name, is_new: kind === 'new' };
        const profile = {
          id: studentId,
          display_name: name,
          email: 'fixture@school.example',
          avatar: '🦊',
        };
        for (const client of [teacherPage, phone]) {
          await client.route('**/rest/v1/rpc/*', async (route) => {
            const fn = route.request().url().split('/').pop();
            const args = route.request().postDataJSON() ?? {};
            switch (fn) {
              case 'teacher_open_pin_window':
                opened = true;
                return route.fulfill({
                  json: { id: windowId, ends_at: new Date(Date.now() + 1200000).toISOString() },
                });
              case 'class_pin_availability':
                return route.fulfill({ json: opened ? { id: windowId, can_add: true } : null });
              case 'class_roster_for_login':
                return route.fulfill({ json: kind === 'new' ? [] : [profile] });
              case 'teacher_pending_pin_requests':
                return route.fulfill({ json: waiting && !approved ? [row] : [] });
              case 'start_class_pin_request':
                expect(client).toBe(phone);
                expect(args.p_class).toBe('TEST01');
                expect(args.p_window).toBe(windowId);
                expect(args.p_student).toBe(kind === 'new' ? null : studentId);
                expect(args.p_alias).toBe(kind === 'new' ? name : null);
                device = args.p_device;
                waiting = true;
                return route.fulfill({
                  json: {
                    id: requestId,
                    state: 'waiting',
                    pin: kind === 'new' ? 'ABCD23' : null,
                    challenge: kind === 'new' ? null : '304528',
                  },
                });
              case 'teacher_decide_pin_request':
                expect(client).toBe(teacherPage);
                expect(args).toMatchObject({
                  p_id: requestId,
                  p_approve: true,
                  p_challenge: kind === 'new' ? null : '304528',
                });
                approved = true;
                return route.fulfill({ status: 204 });
              case 'read_class_pin_request':
                expect(client).toBe(phone);
                expect(args.p_device).toBe(device);
                if (!approved) return route.fulfill({ json: { state: 'waiting' } });
                if (args.p_ack) {
                  consumed = true;
                  return route.fulfill({ json: { state: 'done' } });
                }
                return route.fulfill({
                  json: {
                    state: 'ready',
                    id: studentId,
                    displayName: name,
                    email: profile.email,
                    avatar: '🦊',
                    pin: 'ABCD23',
                  },
                });
              default:
                return route.fallback();
            }
          });
        }
        await teacherPage.goto('/');
        await teacherPage.getByRole('button', { name: 'Add students', exact: true }).click();
        const dialog = teacherPage.getByRole('dialog');
        await expect(dialog.getByText(/Keep this window open/).first()).toBeVisible();
        const message = new URL(
          (await dialog.getByRole('link', { name: /WhatsApp/ }).getAttribute('href'))!
        ).searchParams.get('text')!;
        const shared = new URL(message.split('\n')[1]);
        expect(shared.searchParams.get('class')).toBe('TEST01');
        expect(message).not.toContain('ABCD23');
        await phone.goto(shared.pathname + shared.search);
        if (kind === 'new') {
          await phone.getByRole('button', { name: 'I’m new to this class · Get a PIN' }).click();
          await phone.getByRole('textbox', { name: 'My class nickname' }).fill(name);
          await phone.getByRole('button', { name: 'Get my PIN', exact: true }).click();
          await expect(phone.getByText('ABCD23', { exact: true })).toBeVisible();
          await expect(dialog.getByRole('button', { name: 'Add to class' })).toBeVisible({
            timeout: 15000,
          });
          await dialog.getByRole('button', { name: 'Add to class' }).click();
        } else {
          await phone.getByRole('button', { name: new RegExp(name) }).click();
          await phone.getByRole('button', { name: 'Show my PIN on this phone' }).click();
          await expect(phone.getByText('304528')).toBeVisible();
          await expect(phone.getByText('ABCD23')).toHaveCount(0);
          const verify = dialog.getByRole('textbox', {
            name: /Verify the student’s identity/,
          });
          await expect(verify).toBeVisible({ timeout: 15000 });
          await expect(dialog.getByRole('button', { name: 'Approve and send PIN' })).toBeDisabled();
          await expect(dialog.getByText('304528')).toHaveCount(0);
          await verify.fill('304528');
          await dialog.getByRole('button', { name: 'Approve and send PIN' }).click();
        }
        await expect(phone.locator('#student-pin-input')).toHaveValue('ABCD23', { timeout: 15000 });
        await expect(phone.locator('#student-pin-input')).toHaveAttribute('readonly', '');
        await expect.poll(() => consumed).toBe(true);
        expect(phone.url()).not.toContain('ABCD23');
        expect(phone.url()).not.toContain(device);
        await expect(dialog.getByText('ABCD23')).toHaveCount(0);
      } finally {
        await phone.context().close();
      }
    }
  );
}
