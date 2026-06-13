/**
 * Student app shell — the Capacitor wrapper shipped to Google Play /
 * App Store is students-only.  These tests pin the two behaviours the
 * shell relies on:
 *   1. isStudentShell() detection (Capacitor bridge / ?shell= param /
 *      persisted marker), and
 *   2. resolveInitialView() never returning a teacher-facing view
 *      inside the shell.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isStudentShell } from '../utils/studentShell';
import { resolveInitialView } from '../utils/resolveInitialView';
import { PUBLIC_PAGE_VIEW } from '../utils/publicNavigation';
import { VIEW_PATH, pathForView, viewForPath } from '../utils/routes';
import { isPublicView } from '../utils/authViews';
import type { View } from '../core/views';

type CapacitorWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

function setUrl(path: string, search = '') {
  window.history.replaceState({}, '', `${path}${search}`);
}

beforeEach(() => {
  localStorage.clear();
  setUrl('/');
});

afterEach(() => {
  delete (window as CapacitorWindow).Capacitor;
  localStorage.clear();
  setUrl('/');
});

describe('isStudentShell', () => {
  it('is false for a plain browser visit', () => {
    expect(isStudentShell()).toBe(false);
  });

  it('detects the injected Capacitor bridge', () => {
    (window as CapacitorWindow).Capacitor = { isNativePlatform: () => true };
    expect(isStudentShell()).toBe(true);
  });

  it('ignores a Capacitor bridge reporting non-native (web preview)', () => {
    (window as CapacitorWindow).Capacitor = { isNativePlatform: () => false };
    expect(isStudentShell()).toBe(false);
  });

  it('detects ?shell=student and persists the marker for later reloads', () => {
    setUrl('/student', '?shell=student');
    expect(isStudentShell()).toBe(true);
    // Marker survives in-app pushState navigation that drops the query.
    setUrl('/');
    expect(isStudentShell()).toBe(true);
  });
});

describe('resolveInitialView inside the student shell', () => {
  beforeEach(() => {
    (window as CapacitorWindow).Capacitor = { isNativePlatform: () => true };
  });

  it('shell start URL lands on student login', () => {
    setUrl('/student', '?shell=student');
    expect(resolveInitialView()).toBe('student-account-login');
  });

  it('root path lands on student login, not the marketing landing', () => {
    expect(resolveInitialView()).toBe('student-account-login');
  });

  it('"/" resolves to student login via the persisted marker alone', () => {
    delete (window as CapacitorWindow).Capacitor;
    localStorage.setItem('vb_student_shell', '1');
    expect(resolveInitialView()).toBe('student-account-login');
  });

  it('"/teacher" resolves to student login, never teacher login', () => {
    setUrl('/teacher');
    expect(resolveInitialView()).toBe('student-account-login');
  });

  it('Quick Play QR links still win inside the shell', () => {
    setUrl('/', '?session=ABC123');
    expect(resolveInitialView()).toBe('quick-play-student');
  });
});

describe('resolveInitialView outside the shell (unchanged behaviour)', () => {
  it('"/" → public-landing', () => {
    expect(resolveInitialView()).toBe('public-landing');
  });

  it('"/teacher" → teacher-login', () => {
    setUrl('/teacher');
    expect(resolveInitialView()).toBe('teacher-login');
  });

  it('"/student" → student-account-login', () => {
    setUrl('/student');
    expect(resolveInitialView()).toBe('student-account-login');
  });

  // Public marketing pages now own real, refresh-stable paths (URL routing
  // slice 1). A hard GET / refresh on each must re-resolve to its view.
  it('"/security" → public-security', () => {
    setUrl('/security');
    expect(resolveInitialView()).toBe('public-security');
  });

  it('"/free-resources" → public-free-resources', () => {
    setUrl('/free-resources');
    expect(resolveInitialView()).toBe('public-free-resources');
  });

  it('"/status" → public-status', () => {
    setUrl('/status');
    expect(resolveInitialView()).toBe('public-status');
  });

  it('"/terms" → public-terms', () => {
    setUrl('/terms');
    expect(resolveInitialView()).toBe('public-terms');
  });

  it('"/privacy" → public-privacy', () => {
    setUrl('/privacy');
    expect(resolveInitialView()).toBe('public-privacy');
  });
});

// Slice 2: routes.ts is the single source of truth for view⇄path. The
// registry must round-trip, every public page the landing nav can reach
// must have a path there, and each path must resolve back through
// resolveInitialView — otherwise a refresh on that URL would silently
// bounce the visitor elsewhere.
describe('view ⇄ path registry (routes.ts)', () => {
  it('every VIEW_PATH entry round-trips through pathForView / viewForPath', () => {
    for (const [view, path] of Object.entries(VIEW_PATH) as [View, string][]) {
      expect(pathForView(view)).toBe(path);
      expect(viewForPath(path)).toBe(view);
    }
  });

  it('every public page reachable from the landing nav has a registry path', () => {
    for (const page of Object.keys(PUBLIC_PAGE_VIEW) as Array<keyof typeof PUBLIC_PAGE_VIEW>) {
      expect(pathForView(PUBLIC_PAGE_VIEW[page])).not.toBeNull();
    }
  });

  it('each registry path resolves back to its view via resolveInitialView', () => {
    for (const [view, path] of Object.entries(VIEW_PATH) as [View, string][]) {
      localStorage.clear();
      // Landable authenticated views (Slice 3) only resolve from the URL
      // when a session might restore — seed a fake Supabase token so
      // hasRestorableSession() is true. Public marketing pages need none.
      if (!isPublicView(view)) localStorage.setItem('sb-test-auth-token', '{}');
      setUrl(path);
      expect(resolveInitialView()).toBe(view);
    }
  });
});

// Slice 3: "landable" authenticated views (shop, leaderboard, library)
// resolve from the URL on a fresh load — but ONLY for a user whose session
// can restore. A logged-out deep link must fall through to the public
// landing, never render a dataless authed screen.
describe('landable authenticated views (routes.ts, Slice 3)', () => {
  const AUTHED = [
    ['shop', '/shop'],
    ['global-leaderboard', '/leaderboard'],
    ['privacy-settings', '/privacy-settings'],
    ['vocabulary-library', '/vocabulary-library'],
    ['vocabagrut', '/vocabagrut'],
    ['developer-dashboard', '/developer'],
    ['admin-security', '/admin-security'],
    ['manager-dashboard', '/manager'],
    ['class-show', '/class-show'],
    ['worksheet', '/worksheet'],
  ] as const;

  for (const [view, path] of AUTHED) {
    it(`"${path}" → ${view} when a session is restorable`, () => {
      localStorage.setItem('sb-test-auth-token', '{}'); // hasRestorableSession() → true
      setUrl(path);
      expect(resolveInitialView()).toBe(view);
    });

    it(`"${path}" falls through to public-landing when logged out`, () => {
      setUrl(path); // no session seeded
      expect(resolveInitialView()).toBe('public-landing');
    });
  }
});
