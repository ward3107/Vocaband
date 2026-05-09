import { Page } from '@playwright/test';
import {
  TEST_SUPABASE_URL,
  TEST_CLASS,
  TEST_STUDENTS,
  TEST_STUDENT_USER,
  TEST_TEACHER,
  TEST_ASSIGNMENT,
  TEST_PROGRESS,
  FAKE_AUTH_SESSION,
  FAKE_TEACHER_SESSION,
} from './test-data';

type MockScenario = 'public' | 'student' | 'teacher';

/**
 * Sets up Supabase API mocking via Playwright route interception.
 * Intercepts all requests to the test Supabase URL and returns appropriate mock data.
 */
export async function mockSupabase(page: Page, scenario: MockScenario = 'public') {
  const BASE = TEST_SUPABASE_URL;

  // --- Auth endpoints ---

  // GET /auth/v1/session (getSession)
  await page.route(`${BASE}/auth/v1/session`, (route) => {
    if (scenario === 'student') {
      route.fulfill({ json: { data: { session: FAKE_AUTH_SESSION } } });
    } else if (scenario === 'teacher') {
      route.fulfill({ json: { data: { session: FAKE_TEACHER_SESSION } } });
    } else {
      route.fulfill({ json: { data: { session: null } } });
    }
  });

  // POST /auth/v1/token (refresh token, sign in)
  await page.route(`${BASE}/auth/v1/token**`, (route) => {
    const session = scenario === 'teacher' ? FAKE_TEACHER_SESSION : FAKE_AUTH_SESSION;
    route.fulfill({ json: session });
  });

  // POST /auth/v1/signup (anonymous sign-in)
  await page.route(`${BASE}/auth/v1/signup`, (route) => {
    route.fulfill({ json: FAKE_AUTH_SESSION });
  });

  // GET /auth/v1/user
  await page.route(`${BASE}/auth/v1/user`, (route) => {
    const session = scenario === 'teacher' ? FAKE_TEACHER_SESSION : FAKE_AUTH_SESSION;
    route.fulfill({ json: session.user });
  });

  // --- RPC endpoints ---

  // POST /rest/v1/rpc/* (all RPCs)
  await page.route(`${BASE}/rest/v1/rpc/**`, (route) => {
    const url = route.request().url();
    const rpcName = url.split('/rpc/')[1]?.split('?')[0];

    switch (rpcName) {
      case 'is_teacher':
        route.fulfill({ json: scenario === 'teacher' });
        break;
      case 'is_admin':
        route.fulfill({ json: false });
        break;
      case 'is_teacher_allowed':
        route.fulfill({ json: scenario === 'teacher' });
        break;
      case 'list_students_in_class':
        route.fulfill({ json: TEST_STUDENTS });
        break;
      case 'get_or_create_student_profile':
      case 'get_or_create_student_profile_oauth':
        route.fulfill({
          json: {
            id: TEST_STUDENT_USER.uid,
            display_name: TEST_STUDENT_USER.display_name,
            class_code: TEST_STUDENT_USER.class_code,
            status: 'approved',
            avatar: TEST_STUDENT_USER.avatar,
            xp: TEST_STUDENT_USER.xp,
          },
        });
        break;
      case 'get_student_profile_for_login':
        route.fulfill({
          json: {
            uid: TEST_STUDENT_USER.uid,
            display_name: TEST_STUDENT_USER.display_name,
            class_code: TEST_STUDENT_USER.class_code,
            status: 'approved',
          },
        });
        break;
      case 'end_quick_play_session':
        route.fulfill({ json: null });
        break;
      default:
        route.fulfill({ json: null });
    }
  });

  // --- REST table queries ---

  // GET /rest/v1/users
  await page.route(`${BASE}/rest/v1/users**`, (route) => {
    if (route.request().method() === 'GET') {
      const userData = scenario === 'teacher' ? TEST_TEACHER : TEST_STUDENT_USER;
      route.fulfill({ json: userData });
    } else {
      // POST/PATCH/PUT for upsert/update
      route.fulfill({ status: 200, json: {} });
    }
  });

  // GET /rest/v1/classes
  await page.route(`${BASE}/rest/v1/classes**`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ json: [TEST_CLASS] });
    } else {
      route.fulfill({ status: 200, json: {} });
    }
  });

  // GET /rest/v1/assignments
  await page.route(`${BASE}/rest/v1/assignments**`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ json: [TEST_ASSIGNMENT] });
    } else {
      route.fulfill({ status: 200, json: {} });
    }
  });

  // GET /rest/v1/progress
  await page.route(`${BASE}/rest/v1/progress**`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ json: TEST_PROGRESS });
    } else {
      // POST for saving progress
      route.fulfill({ status: 201, json: {} });
    }
  });

  // GET /rest/v1/student_profiles
  await page.route(`${BASE}/rest/v1/student_profiles**`, (route) => {
    route.fulfill({ json: [] });
  });

  // GET /rest/v1/consent_log
  await page.route(`${BASE}/rest/v1/consent_log**`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ json: [{ policy_version: '1.0' }] });
    } else {
      route.fulfill({ status: 201, json: {} });
    }
  });

  // GET /rest/v1/teacher_allowlist
  await page.route(`${BASE}/rest/v1/teacher_allowlist**`, (route) => {
    route.fulfill({ json: scenario === 'teacher' ? [{ email: 'teacher@test.com' }] : [] });
  });

  // Realtime WebSocket — just let it fail silently
  await page.route(`${BASE}/realtime/**`, (route) => {
    route.abort();
  });

  // Storage — return empty for audio
  await page.route(`${BASE}/storage/**`, (route) => {
    route.abort();
  });
}

/**
 * Pre-set localStorage values to skip cookie banner and set consent.
 */
export async function presetLocalStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('vocaband_cookie_consent', JSON.stringify({ essential: true, analytics: true, functional: true }));
    localStorage.setItem('vocaband_consent_version', '1.0');
  });
}

/**
 * Disable CSS animations/transitions for more reliable tests.
 *
 * page.addInitScript runs at the earliest possible moment (before
 * any DOM exists), so `document.head` is null at that time.  Defer
 * the actual <style> injection until the DOM is parsed -- otherwise
 * the script throws "Cannot read properties of null (reading
 * 'appendChild')" and the page-error listener in smoke.spec.ts
 * marks the boot as failed.
 */
export async function disableAnimations(page: Page) {
  await page.addInitScript(() => {
    const inject = () => {
      const style = document.createElement('style');
      style.textContent = '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; animation-delay: 0s !important; transition-delay: 0s !important; }';
      // document.head exists by DOMContentLoaded.  Belt-and-braces
      // null check covers the (vanishingly rare) case of injection
      // before <head> closes.
      (document.head ?? document.documentElement).appendChild(style);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
      inject();
    }
  });
}
