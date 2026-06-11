/**
 * Student app shell detection — true when the page is running inside the
 * native Capacitor wrapper shipped to Google Play / the App Store (see
 * capacitor.config.ts at the repo root).  The store app is students-only:
 * when this returns true the app boots straight into student login and
 * never shows the marketing landing or teacher login (see
 * resolveInitialView + the snap-back effect in useAppController).
 *
 * Three detection layers, in order of reliability:
 *   1. Capacitor injects its bridge (`window.Capacitor`) into the remote
 *      site when loaded inside the native shell — the canonical signal.
 *   2. The shell's start URL carries `?shell=student`, persisted to
 *      localStorage so in-app reloads after pushState navigation (which
 *      drops the query string) keep the marker.
 *   3. The persisted marker itself.
 * Layers 2–3 also let us test shell behaviour in a plain browser tab.
 */
const SHELL_MARKER_KEY = 'vb_student_shell';

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function isStudentShell(): boolean {
  try {
    const cap = (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (new URLSearchParams(window.location.search).get('shell') === 'student') {
      localStorage.setItem(SHELL_MARKER_KEY, '1');
      return true;
    }
    return localStorage.getItem(SHELL_MARKER_KEY) === '1';
  } catch {
    return false;
  }
}
