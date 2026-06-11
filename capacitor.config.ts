/**
 * Capacitor config for the students-only store app (Google Play + App
 * Store).  The shell loads the LIVE site at vocaband.com/student rather
 * than bundling web assets — so every web deploy reaches the app
 * instantly, with no store re-submission.  Store releases are only
 * needed for shell-level changes (icon, splash, native plugins).
 *
 * `?shell=student` marks the session as the students-only shell — see
 * src/utils/studentShell.ts: it boots straight into student login and
 * blocks the marketing landing + teacher login.
 *
 * `webDir` is a minimal offline fallback page (native/shell-www); it is
 * NOT the app — Capacitor just requires a local web dir to exist.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vocaband.student',
  appName: 'Vocaband',
  webDir: 'native/shell-www',
  server: {
    url: 'https://www.vocaband.com/student?shell=student',
    // Domains the in-app webview may navigate to directly.  Anything
    // else (external links) opens in the system browser instead.
    allowNavigation: ['www.vocaband.com', 'vocaband.com', 'auth.vocaband.com'],
  },
  android: {
    // Students' school devices can be old — allow Android system
    // webview to render the modern bundle (Vite targets es2020+).
    allowMixedContent: false,
  },
  ios: {
    // Match the PWA theme color behind the status bar / home indicator.
    backgroundColor: '#4f46e5',
  },
};

export default config;
